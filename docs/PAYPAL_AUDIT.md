# Auditoría técnica de PayPal · Wisdom Academy

**Fecha:** 23 de octubre de 2026  
**Rama original de trabajo:** `feature/paypal-checkout`  
**Repositorio migrado:** `rpmministry/wisdom-academy-platform` (`main`, privado)  
**Alcance:** estado real del repositorio local, no una arquitectura supuesta.

## 1. Resumen ejecutivo

El repositorio **no es una aplicación Express/React con `server.ts`, `api-entry.js` y Turso**. Es una aplicación **Next.js 15 (App Router)** con React, TypeScript estricto y un backend integrado en rutas API. La persistencia es **SQLite mediante `node:sqlite`** (Node 24), con migraciones idempotentes y una ruta local o de volumen persistente (`WISDOM_DB_PATH`).

La auditoría encontró una implementación de PayPal ya existente y funcional a nivel de código: catálogo, creación de órdenes con Orders v2, captura, webhook firmado, persistencia, activación de derechos, reembolsos y pruebas con un servidor PayPal simulado. El trabajo de esta sesión se concentró en cerrar brechas reales:

1. **Precio pendiente:** los cursos creados automáticamente nacían con precio 0 y podían comprarse como gratuitos. Se añadió `products.price_status` (`defined`/`pending`), migración 8 y bloqueo de checkout/catálogo.
2. **Moneda:** el checkout usaba `USD` fijo. Ahora usa `PAYPAL_CURRENCY`, valida la moneda del producto y rechaza discrepancias.
3. **Idempotencia del navegador:** la clave de idempotencia cambiaba en cada clic. Ahora es estable por apertura del modal.
4. **Conciliación de captura:** si PayPal ya capturó la orden pero la respuesta se perdió, el servidor consulta la orden y reconcilia sin un segundo cobro.
5. **Reembolsos:** se usa una clave de idempotencia estable, no se revoca acceso por un reembolso `PENDING`, y los reembolsos parciales no revocan todo el acceso hasta completar el importe.
6. **Webhooks:** se valida que la orden PayPal del evento coincida con la orden local; los eventos desconocidos se marcan como ignorados; se maneja la inserción concurrente del mismo evento.
7. **Consulta de compra propia:** nueva ruta `GET /api/me/orders/[id]` y referencia de captura visible en «Mi acceso».
8. **Pruebas:** 18 pruebas nuevas de PayPal, incluyendo precios pendientes, moneda, manipulación de importes, captura fallida, orden de otro usuario, conciliación, reembolsos parciales/pendientes, reversión, rutas Next.js y ausencia de secretos públicos.

## 2. Componentes reutilizables encontrados

| Componente | Ubicación | Uso |
|---|---|---|
| Cliente OAuth/Orders/Webhooks/Refunds | `src/server/payments/paypal.ts` | `fetch` del servidor, sin SDK adicional |
| Dominio de checkout | `src/server/domain/checkout.ts` | Órdenes, captura, webhook, derechos, reembolsos |
| Descuentos | `src/server/domain/discounts.ts` | Códigos y reservas idempotentes |
| Derechos y matrículas | `src/server/domain/access.ts` | Entitlements y enrollments |
| Catálogo | `src/app/api/catalog/route.ts` | Productos publicados y disponibilidad |
| Checkout API | `src/app/api/checkout/route.ts` | Crea orden local + PayPal |
| Captura API | `src/app/api/checkout/capture/route.ts` | Captura autenticada con CSRF |
| Cancelación API | `src/app/api/checkout/cancel/route.ts` | Cierra orden propia |
| Webhook | `src/app/api/paypal/webhook/route.ts` | Endpoint público, sin sesión de usuario |
| Historial propio | `src/app/api/me/orders/route.ts` | Lista de órdenes del usuario |
| Detalle propio | `src/app/api/me/orders/[id]/route.ts` | Nueva consulta por orden |
| Administración de órdenes | `src/app/api/admin/orders/route.ts` | Listado con RBAC |
| Reembolso administrativo | `src/app/api/admin/orders/[id]/refund/route.ts` | RBAC + CSRF |
| Administración de productos | `src/app/api/admin/products/route.ts` y `[id]` | Precios y publicación |
| UI de compra | `src/components/catalog/CatalogExperience.tsx` | Modal, precio, estados y redirección |
| Retorno/cancelación | `src/app/(public)/checkout/return/page.tsx` y `cancel` | Confirmación server-side |
| Historial visible | `src/app/(student)/mi-acceso/page.tsx` | Derechos, órdenes y referencia |

## 3. Rutas API reales

| Método | Ruta | Autenticación | Función |
|---|---|---|---|
| `GET` | `/api/catalog` | Opcional | Catálogo con `pricePending` |
| `POST` | `/api/checkout` | Sesión + CSRF | Crea orden local y PayPal |
| `POST` | `/api/checkout/capture` | Sesión + CSRF | Captura y activa acceso |
| `POST` | `/api/checkout/cancel` | Sesión + CSRF | Cancela orden propia |
| `POST` | `/api/paypal/webhook` | Firma PayPal | Webhook público |
| `GET` | `/api/me/orders` | Sesión | Historial del usuario |
| `GET` | `/api/me/orders/[id]` | Sesión | Detalle de una orden propia |
| `GET` | `/api/admin/orders` | `orders.read` | Listado administrativo |
| `POST` | `/api/admin/orders/[id]/refund` | `orders.refund` + CSRF | Reembolso |
| `GET/POST` | `/api/admin/products` | `products.read/manage` | Catálogo administrativo |
| `PATCH` | `/api/admin/products/[id]` | `products.manage` + CSRF | Precio, estado y recursos |

No existe `api-entry.js` ni `server.ts`; las rutas son Route Handlers de Next.js. El webhook **no** está detrás del middleware de sesión: se monta en una ruta pública y se autentica con la firma de PayPal.

## 4. Modelo de datos relevante

| Tabla | Función |
|---|---|
| `products` | Precio en centavos, moneda, estado, `price_status` y metadata de acceso |
| `product_resources` | Recursos habilitados por producto |
| `orders` | Orden local, usuario, totales, moneda, estado, IDs PayPal, idempotencia |
| `order_items` | Snapshot de producto, título y precio al comprar |
| `transactions` | Capturas, reembolsos, reversiones y transacciones gratuitas |
| `webhook_events` | Evento PayPal único por `(provider,event_id)` y estado de procesamiento |
| `entitlements` | Derechos por recurso, origen, vigencia y revocación |
| `enrollments` | Matrícula idempotente por usuario/producto/orden |
| `discount_redemptions` | Reserva/consumo/liberación de descuentos |
| `audit_log` | Trazabilidad administrativa |

### Migración 8

```sql
ALTER TABLE products
  ADD COLUMN price_status TEXT NOT NULL DEFAULT 'defined'
  CHECK (price_status IN ('defined','pending'));

UPDATE products
SET price_status = 'pending'
WHERE price_cents = 0 AND slug LIKE 'wa-programa-%';
```

Los productos creados automáticamente desde un curso/taller (`ensureProgramProduct`) nacen en `pending`. Al fijar un precio desde el CRM se marca `defined`, incluso si el precio es 0. Los productos seed con precio 0 explícito (guía de bienvenida) conservan `defined`.

## 5. Incompatibilidades y riesgos detectados

| Hallazgo | Impacto | Tratamiento |
|---|---|---|
| Vercel serverless + SQLite local | Pérdida de datos y órdenes inconsistentes | Bloqueo de arranque en Vercel Production y guía de host persistente. Migración a Turso/Postgres no implementada. |
| No existe adaptador Turso/libSQL | No se puede elegir la arquitectura B del prompt | Documentado como pendiente; no se finge compatibilidad. |
| No existe `server.ts`, `api-entry.js`, `vercel.json` | El prompt asumía otra arquitectura | Se trabajó sobre Next.js real. |
| Precio 0 en cursos auto-creados | Se podía adquirir gratis un producto sin precio | Corregido con `price_status` y validación doble (catálogo + servidor). |
| Moneda fija USD | Producto en otra moneda podía cobrarse en USD | Corregido con `PAYPAL_CURRENCY` y validación. |
| Clave de idempotencia del modal con `Date.now()` | Doble clic podía crear dos órdenes | Corregido con clave estable por apertura. |
| Reembolso `PENDING` marcado como completado | Revocación prematura | Corregido: se espera webhook verificado. |
| Reembolso parcial revocaba todo | Pérdida indebida de acceso | Corregido: se acumula el importe y solo se revoca al cubrir el total. |
| Webhook podía asociar `custom_id` y `order_id` de órdenes distintas | Integridad de la orden | Corregido con validación de coincidencia. |
| No se cargó el JavaScript SDK de PayPal | Desviación de la recomendación del prompt | Se mantiene el flujo oficial Orders v2 con redirección a la URL de aprobación; no se añade script de terceros ni se expone Client Secret. Documentado. |
| Credenciales PayPal | Al inicio no había credenciales locales | Se configuraron credenciales Sandbox y se ejecutó un cobro real de Sandbox el 23/10/2026. Live sigue pendiente de autorización. Evidencias en `docs/PAYPAL_TESTING.md`. |
| Sin monitoreo externo/backups externos | Riesgo operativo | Documentado como pendiente de producción. |

## 6. Plan ejecutado

1. Auditoría de esquema, rutas, UI, autenticación y configuración.
2. Migración de `price_status` y adaptación de catálogo, checkout y CRM.
3. Moneda configurable y validaciones de producto.
4. Endurecimiento de captura, webhook y reembolsos.
5. Ruta de detalle de orden y referencia visible.
6. 18 pruebas nuevas + pruebas existentes.
7. Guías de configuración, pruebas y despliegue.
8. Verificación de tipos, build y secretos.

## 7. Conclusión

El flujo de PayPal está implementado y probado con dobles controlados. El **23 de octubre de 2026 se ejecutó además un cobro Sandbox real** con comprador de prueba: orden `ord_jUlSwv54-pD6Pk2km5trQtWE`, PayPal `3TY92249470992444`, captura `9S879207H39589335`, `10.00 USD`, derecho y matrícula activos, webhook `WH-0DB82195UK2472110-1XT79067KM1872805` procesado y reintento de captura sin duplicados. **Live no está probado ni autorizado.** La publicación en Vercel con SQLite sigue bloqueada por diseño; la ruta segura actual es un host con volumen persistente o una migración de base no incluida.
