# Checkout, carrito y CRM financiero

Fecha de actualización: 2026-10-24.
Alcance: compra de uno o varios productos, autenticación dentro del checkout,
PayPal Sandbox/Live, persistencia de órdenes y módulo financiero del CRM.

## 1. Flujo de compra

```mermaid
flowchart TD
    A[Catálogo: Agregar al carrito] --> B[localStorage wa_cart_v1]
    C[Catálogo: Comprar ahora] --> B
    B --> D[/checkout]
    D --> E{¿Sesión activa?}
    E -- No --> F[Login integrado en /checkout]
    F --> D
    E -- Sí --> G[Cotización /api/checkout/quote]
    G --> H[Crear orden /api/checkout]
    H --> I[Redirección a PayPal]
    I --> J[Retorno del navegador /checkout/return]
    I --> K[Webhook firmado /api/paypal/webhook]
    J --> L[Captura en servidor /api/checkout/capture]
    K --> M[Conciliación idempotente]
    L --> M
    M --> N[Orden pagada + derechos de acceso]
    N --> O[/mi-acceso y /mi-cuenta]
```

### Carrito

- Archivo: `src/lib/cart/cartContext.tsx`.
- Persistencia: `localStorage` con la clave `wa_cart_v1`, máximo 20 productos,
  sin duplicados y con saneamiento de tipos al leer.
- Los precios del carrito son **solo referencia visual**. La cotización y la
  orden se calculan en el servidor con el catálogo vigente.
- El carrito no se borra al iniciar sesión, cancelar PayPal o recibir un error.
  Solo se vacía cuando una orden queda pagada, gratuita o verificada en el
  retorno.
- La sincronización entre pestañas evita ciclos de escritura comparando el
  contenido actual antes de guardar.

### Checkout

- Ruta pública: `/checkout` (`src/app/(public)/checkout/page.tsx`).
- El usuario puede iniciar sesión dentro del mismo paso. La ruta se conserva y
  el carrito permanece intacto.
- El código de descuento se aplica mediante cotización del servidor; nunca se
  confía en el descuento calculado en el navegador.
- «Comprar ahora» agrega el producto y abre el checkout. «Agregar al carrito»
  permite seguir explorando.
- El botón de pago se deshabilita si PayPal no está configurado, si el producto
  ya no es válido o si la cotización falla.
- La clave de idempotencia se reutiliza ante reintentos de red. Solo se
  regenera cuando el servidor confirma que la orden anterior falló o fue
  cancelada, o cuando cambia el contenido del carrito.

### Retorno y cancelación

- `/checkout/return` captura en el servidor. Nunca marca la orden como pagada
  por un parámetro de URL. Si la sesión expiró, redirige a `/login?next=...`
  conservando la consulta.
- `/checkout/cancel` cancela la orden pendiente, conserva el carrito y ofrece
  volver al checkout.
- El webhook puede llegar antes o después del retorno; la conciliación es
  idempotente y no duplica capturas, derechos ni ingresos.

## 2. API implicada

| Endpoint | Método | Autorización | Función |
|---|---|---|---|
| `/api/catalog` | GET | Pública | Catálogo y disponibilidad |
| `/api/checkout/quote` | POST | Sesión | Cotización sin efectos secundarios |
| `/api/checkout` | POST | Sesión + CSRF | Crea o reutiliza la orden |
| `/api/checkout/capture` | POST | Sesión + CSRF | Captura y verifica el pago |
| `/api/checkout/cancel` | POST | Sesión + CSRF | Cancela una orden pendiente |
| `/api/paypal/webhook` | POST | Firma PayPal | Conciliación de eventos |
| `/api/me/orders` | GET | Sesión y propiedad | Historial del comprador |
| `/api/admin/finance` | GET | `orders.read` | Reporte financiero del CRM |
| `/api/admin/orders/[id]/refund` | POST | `orders.refund` | Reembolso con trazabilidad |

Los precios, moneda, descuentos, líneas y total siempre se cargan desde
`products`, `discount_codes` y las reglas del servidor. Los datos económicos
enviados por el navegador se ignoran.

## 3. Estados y acceso

| Estado interno | Significado | ¿Suma como cobro? | ¿Concede acceso? |
|---|---|---|---|
| `pending` | Orden creada, sin captura confirmada | No | No |
| `paid` | Captura verificada | Sí | Sí, productos de la orden |
| `free` | Precio cero o descuento total | No (importe 0) | Sí, productos de la orden |
| `failed` | Creación o captura fallida | No | No |
| `cancelled` | Cancelada por el comprador | No | No |
| `refunded` | Reembolso completado | Sí, bruto; se resta el reembolso | No para esa compra |
| `reversed` | Reversión completada | Sí, bruto; se resta la reversión | No para esa compra |

La concesión de acceso se realiza por los derechos (`entitlements`) vinculados
a la orden pagada. Un reembolso revoca únicamente los derechos de esa compra;
no retira regalos, becas ni compras independientes.

## 4. CRM financiero

El módulo vive en la pestaña **Pagos** del CRM existente. No crea un panel
separado ni duplica la navegación.

### Permisos

- Ver la pestaña y consultar `/api/admin/finance`: `orders.read`.
- Reembolsar: `orders.refund`.
- Sin `orders.read`, la pestaña no se muestra y la API responde `403`.
- El filtro se aplica también en el servidor, no solo en la interfaz.

### Indicadores

| Indicador | Cálculo |
|---|---|
| Cobros confirmados | Suma de órdenes con captura completada (`paid`, `refunded`, `reversed`) |
| Neto después de reembolsos | Cobros confirmados menos transacciones `refund`/`reversal` completadas |
| Órdenes pagadas | Órdenes en estado `paid` |
| Gratuitas | Órdenes `free` (importe 0) |
| Pendientes | Órdenes `pending`; nunca se cuentan como ingreso |
| Fallidas | Órdenes `failed` |
| Reembolsos | Importe de transacciones de reembolso completadas |
| Reembolsadas / revertidas | Órdenes en esos estados |

### Series, productos y códigos

- La evolución agrupa por día, semana o mes los cobros y reembolsos persistidos.
- El ranking de productos usa el importe bruto de las líneas capturadas.
- Los códigos promocionales muestran canjes consumidos e importe descontado.
- **No se calcula conversión promocional** porque la plataforma no registra
  visitas ni eventos de intención que sirvan de denominador.

### Filtros y tabla

- Período (`from`, `to`), estado, producto y búsqueda por orden, comprador,
  correo, PayPal order o captura.
- Tabla de hasta 300 órdenes con detalle de líneas, descuentos, transacciones,
  referencias PayPal y trazabilidad.
- En móvil la tabla se convierte en tarjetas; no se fuerza scroll horizontal
  de toda la página.
- Exportación CSV con escape correcto y BOM para Excel; solo está disponible
  para quien puede consultar la API financiera.

## 5. Variables de entorno

Nombres reales según `src/server/config.ts` y `.env.example`:

| Variable | Uso |
|---|---|
| `APP_URL` | URL pública de retorno y webhook |
| `PAYPAL_MODE` | `sandbox` o `live` |
| `PAYPAL_CLIENT_ID` | Client ID de la app REST del entorno |
| `PAYPAL_CLIENT_SECRET` | Secreto solo de servidor; nunca `NEXT_PUBLIC_` |
| `PAYPAL_WEBHOOK_ID` | ID del webhook del mismo entorno |
| `PAYPAL_CURRENCY` | Moneda; por defecto `USD` |
| `PAYPAL_API_BASE_URL` | Solo pruebas; prohibido en producción |
| `WISDOM_DB_PATH` | Base SQLite persistente |
| `CODE_HASH_PEPPER` | Hash de códigos de descuento/regalo |

Los secretos se configuran en `.env.local` o en el gestor del hosting. No se
versionan. El frontend solo recibe `paypalConfigured`/`paypalMode`, nunca el
Client Secret.

## 6. Pruebas

```bash
npm run typecheck
npm run test:platform
npx playwright test tests/e2e/checkout-navigation.spec.ts
npx playwright test tests/e2e/rbac-navigation.spec.ts
npm run build
```

Cobertura automatizada relevante:

- Cotización multi-producto sin crear órdenes.
- Precio manipulado, producto inexistente, no publicado, precio pendiente y
  moneda incorrecta.
- Captura fallida, captura de otro usuario, idempotencia y conciliación.
- Webhook firmado, firma inválida, importe incorrecto y evento repetido.
- Reembolsos completos, parciales, pendientes y reversiones.
- Métricas financieras, filtros, permisos y exportación deshabilitada sin datos.
- Carrito persistente, login dentro del checkout, retorno de sesión y menú de
  cuenta en móvil/escritorio.

### Pagos reales

Si no hay credenciales Sandbox/Live configuradas, las pruebas automatizadas
usan el servidor PayPal simulado. Eso **no equivale** a un pago real. La
validación Sandbox real requiere credenciales de una app Sandbox, comprador de
prueba y webhook accesible; ver `docs/PAYPAL_TESTING.md`. La activación Live
requiere autorización del titular y nunca debe hacerse desde una sesión de
desarrollo.

## 7. Despliegue

- No desplegar con SQLite en el sistema de archivos efímero de Vercel
  Functions. Las órdenes y los webhooks deben persistir.
- Host compatible: Node con volumen persistente (Northflank, VPS u Oracle Free)
  o una base administrada si se migra el adaptador.
- El webhook debe ser accesible públicamente por HTTPS y coincidir con
  `APP_URL`.
- Un build correcto no demuestra un pago real. La aceptación requiere Sandbox
  con captura y webhook verificados, más la configuración Live explícita.

## 8. Navegación y perfil relacionados

- Encabezado público compartido: `src/components/layout/PublicHeader.tsx`.
- Menú de cuenta compartido: `src/components/layout/AccountMenu.tsx`.
- Perfil de autoservicio: `/mi-cuenta`.
- Middleware de retorno: `src/middleware.ts` conserva `next` en rutas privadas.
- Matriz responsive verificada: 320×740, 360×800, 375×812, 390×844, 430×932,
  768×1024, 1024×768, 844×390, 1280×800 y 1440×900.
