# Pruebas de PayPal · Wisdom Academy

**Fecha:** 23 de octubre de 2026  
**Regla:** solo se marca como aprobado lo que se ejecutó y produjo evidencia. Los cobros reales Sandbox/Live no se ejecutaron porque no hay credenciales en este entorno.

## 1. Pruebas automatizadas ejecutadas

```powershell
npm run typecheck
npm run test:payments
npm run test:platform
npm run test:courses
npm test
npm run build
npm run check:secrets
```

### Resultados de la sesión

| Comando | Resultado real |
|---|---|
| `npm run typecheck` | Correcto, sin errores |
| `npm run test:payments` | **27 aprobadas, 0 fallos** (9 existentes + 18 nuevas) |
| `npm run test:platform` | **65 aprobadas, 0 fallos** |
| `npm test` | **168 aprobadas, 0 fallos** (54 recursos + 65 plataforma + 49 cursos) |
| `npx playwright test tests/e2e/catalog-homeschool.spec.ts` | **4 aprobadas, 0 fallos** con base temporal aislada |
| `npm run build` | Compilación correcta, 18 páginas generadas |
| `npm run check:secrets` | Correcto con el Client Secret real definido; 39 archivos de `.next/static` revisados y sin coincidencias del secreto |
| `npm run check:deploy` | 0 bloqueos críticos, 3 advertencias: modo Sandbox, Google no configurado, 1 producto publicado con precio pendiente |
| `npm audit --omit=dev` | 4 vulnerabilidades moderadas preexistentes en `uuid` vía `googleapis`; no afectan PayPal |

> Los resultados corresponden a la ejecución del 23 de octubre de 2026. No sustituyas un resultado por una suposición.

### Prueba Sandbox real ejecutada

El 23 de octubre de 2026 se ejecutó un pago Sandbox real con el comprador de prueba, no un mock:

| Evidencia | Valor |
|---|---|
| Orden local | `ord_jUlSwv54-pD6Pk2km5trQtWE` |
| Orden PayPal | `3TY92249470992444` |
| Estado PayPal | `COMPLETED` |
| Captura PayPal | `9S879207H39589335` (`COMPLETED`) |
| Importe | `10.00 USD` |
| Transacción local | 1 captura `completed` |
| Derecho activo | `res_taller-python-ia-jovenes`, origen `purchase`, `active` |
| Matrícula | 1, estado `active` |
| Webhook | `WH-0DB82195UK2472110-1XT79067KM1872805`, `PAYMENT.CAPTURE.COMPLETED`, `processed` |
| Reintento de captura | `alreadyPaid: true` |
| Conteos tras reintento | 1 transacción, 1 entitlement, 1 enrollment, 1 webhook procesado (sin cambios) |

La URL pública del webhook fue un túnel temporal de `localhost.run`. La prueba demuestra el flujo Sandbox; **no** es una URL de producción.

## 2. Cobertura de las pruebas nuevas

Archivo: `tests/platform/payments-extended.test.ts`. Usa un servidor HTTP local que simula OAuth, Orders v2, captura, consulta de orden, reembolso y verificación de webhook. No usa internet ni credenciales reales.

| # | Caso | Prueba |
|---|---|---|
| 1 | Creación de una orden válida | Varias pruebas crean órdenes y verifican `totalCents`/`approvalUrl` |
| 2 | Producto inexistente | `rechaza producto inexistente...` |
| 3 | Precio no definido | Mismo test, producto auto-creado con `price_status='pending'` |
| 4 | Producto no publicado | Mismo test, curso en borrador |
| 5 | Importe manipulado desde el navegador | `un precio manipulado...` y ruta de checkout con `totalCents`/`amount` falsos |
| 6 | Moneda incorrecta | Mismo test de validaciones, producto en EUR |
| 7 | Usuario sin permiso | Ruta de checkout sin sesión (401) y captura de orden ajena (404) |
| 8 | Captura exitosa | Prueba de ruta de captura y pruebas existentes |
| 9 | Fallo de captura | `la captura fallida deja la orden pendiente...` |
| 10 | Reintento de captura sin doble procesamiento | `si PayPal ya capturó la orden se reconcilia...` y repetición de captura en pruebas existentes |
| 11 | Orden asociada a otro usuario | `una orden no puede capturarse por otro usuario` |
| 12 | Webhook con firma inválida | `payments.test.ts` |
| 13 | Webhook duplicado | `payments.test.ts` |
| 14 | Captura/evento repetido | Idempotencia de captura, webhook duplicado y clave de checkout |
| 15 | Actualización correcta del estado | Webhooks de captura y reembolso |
| 16 | Activación única del acceso | Conteo de entitlements antes/después de duplicados |
| 17 | Reembolso y reversión | Reembolso parcial, reembolso pendiente y webhook de reversión |
| 18 | Rutas a través del entrypoint real | `la ruta de checkout...` y `el webhook público...` (Route Handlers de Next.js, no `api-entry.js`) |
| 19 | Adaptador de base del entorno | `las migraciones de SQLite incluyen...` (SQLite local; Turso no implementado) |
| 20 | Ausencia de secretos en archivos públicos | `la configuración pública no expone...` + `npm run check:secrets` |

## 3. Pruebas existentes relevantes

`tests/platform/payments.test.ts` cubre:

- Captura exacta e idempotencia.
- Importe capturado distinto.
- Webhook verificado, idempotente y sin duplicar derechos.
- Firma inválida.
- Webhook con importe incorrecto.
- Descuento total y producto gratuito.
- Reembolso que conserva derechos de regalo.
- Listado administrativo.

## 4. Cómo ejecutar sin credenciales

```powershell
npm run test:payments
```

El archivo de prueba levanta un servidor HTTP efímero y define `PAYPAL_API_BASE_URL` solo para ese proceso. No requiere red externa. La base se crea en una ruta temporal y se elimina al terminar.

Las pruebas E2E usan su propia base temporal (`WISDOM_DB_PATH`) y no reutilizan un servidor ya abierto, para no mezclar fixtures con la base local. Detén `npm run dev` antes de ejecutar:

```powershell
npx playwright test tests/e2e/catalog-homeschool.spec.ts
```

## 5. Qué no se puede probar con mocks

Los mocks **no** demuestran:

- Que una app Sandbox real acepte las credenciales.
- Que el comprador Sandbox pueda aprobar la orden.
- Que PayPal envíe un webhook firmado a una URL pública.
- Que el Webhook ID coincida con el entorno.
- Que una cuenta ecuatoriana pueda recibir o retirar fondos.
- Que una transacción Live funcione.

Estas pruebas requieren credenciales y una URL HTTPS real. El 23 de octubre de 2026 se completaron para **Sandbox** con el comprador de prueba y un túnel HTTPS temporal; siguen pendientes para **Live**, para la disponibilidad de la cuenta ecuatoriana y para un reenvío real de webhook. La deduplicación de webhooks se cubre con mocks y con la entrega única observada.

## 6. Procedimiento de prueba Sandbox real

Requisitos: app Sandbox, comprador Sandbox, webhook Sandbox y una URL HTTPS pública (dominio de staging o túnel).

1. Configura `.env.local` o el entorno de staging con las credenciales Sandbox.
2. Reinicia el servidor.
3. Verifica `/api/auth/config`: `paypalConfigured: true`, `paypalMode: "sandbox"`.
4. Inicia sesión como un usuario de prueba con rol de cliente.
5. Abre `/catalogo`, elige un producto con precio definido y pulsa **Comprar**.
6. Verifica que el total mostrado coincide con `products.price_cents`.
7. Pulsa **Pagar con PayPal**.
8. En PayPal, inicia sesión con el comprador Sandbox (no con la cuenta comercial).
9. Aprueba el pago.
10. PayPal redirige a `/checkout/return?wa_order=...&token=...`.
11. La página llama a `/api/checkout/capture`. Confirma que responde 200.
12. En la base de datos:

```sql
SELECT id, status, total_cents, currency, paypal_order_id, paypal_capture_id
FROM orders WHERE id = 'ord_...';

SELECT provider, kind, provider_txn_id, amount_cents, status
FROM transactions WHERE order_id = 'ord_...';

SELECT event_id, event_type, status, processed_at
FROM webhook_events WHERE provider = 'paypal' ORDER BY created_at DESC;
```

13. Confirma que la orden está `paid`, existe una captura `completed` y los entitlements están activos.
14. Reenvía la misma solicitud de captura (o vuelve a cargar el retorno). Debe devolver `alreadyPaid: true` y no crear otra captura.
15. Espera o fuerza el webhook de Sandbox y comprueba que el evento queda `processed` una sola vez.
16. Envía el mismo evento dos veces si puedes; el segundo debe ser duplicado y no duplicar entitlements.
17. Prueba cancelación: vuelve desde PayPal sin aprobar. La orden debe quedar `cancelled` y sin derechos.
18. Prueba un rechazo con Negative Testing de Sandbox (por ejemplo `INSTRUMENT_DECLINED`). La orden debe quedar `pending` o `failed` y no conceder acceso.
19. Si el producto no tiene precio definido o no está publicado, el botón no debe permitir la compra y la API debe rechazarla.
20. Documenta IDs de orden/captura, estados y marcas de tiempo como evidencia, **sin** incluir secretos.

### Evidencia mínima aceptable

- Captura de pantalla del checkout (sin datos sensibles).
- Respuesta HTTP de `/api/checkout` y `/api/checkout/capture` (sin cookies).
- Consulta SQL de la orden, transacción y entitlement.
- Registro del evento de webhook con `event_id` y estado.
- Confirmación de que un segundo envío no duplicó la captura ni el acceso.

## 7. Webhooks: verificación real

La ruta verifica la firma con el endpoint oficial de PayPal (`/v1/notifications/verify-webhook-signature`). Este método de **postback** no admite los eventos simulados del Webhook Simulator. Para probar de verdad:

- Usa un webhook registrado en la app Sandbox.
- Genera una transacción Sandbox real con el comprador de prueba.
- Expón la URL HTTPS pública (staging o túnel).
- Comprueba la cabecera `PAYPAL-WEBHOOK-ID` del entorno correcto.

Si la verificación falla, el endpoint responde 400 y no modifica la orden. Si el procesamiento falla por un importe incorrecto, responde 409 y PayPal reintenta según su política.

## 8. Pruebas de reembolso

- Un reembolso total completado debe dejar la orden `refunded` y revocar solo los derechos de esa compra.
- Un reembolso `PENDING` no debe revocar acceso hasta el webhook completado.
- Un reembolso parcial no debe revocar todo el acceso.
- Una reversión completada debe dejar la orden `reversed` y revocar los derechos.
- Un regalo o una matrícula independiente no deben revocarse por el reembolso de una compra.

Estos comportamientos están cubiertos con mocks. La prueba con PayPal Sandbox real sigue pendiente.

## 9. Pruebas de regresión

Antes de publicar:

```powershell
npm run typecheck
npm test
npm run build
npm run check:secrets
npm run check:deploy
```

`npm run check:deploy` debe ejecutarse en el entorno final con la base y variables reales. No debe imprimir secretos.

## 10. Pendientes explícitos

- Cobro Sandbox real: **HECHO** el 23/10/2026 (ver sección 1).
- Webhook Sandbox real: **HECHO**; evento procesado una sola vez.
- Reenvío real del mismo webhook para probar duplicados: **PENDIENTE** (la lógica está cubierta con mocks).
- Cobro Live: **no autorizado y no ejecutado**.
- Prueba de carga/concurrencia contra PayPal.
- Reembolso y reversión reales en Sandbox.
- Migración y pruebas contra Turso/PostgreSQL.
- Despliegue en Vercel Production (bloqueado por SQLite).
- URL de webhook estable para producción (el túnel de la prueba es temporal).
