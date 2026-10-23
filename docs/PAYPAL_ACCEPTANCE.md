# Condiciones de aceptación · PayPal Wisdom Academy

**Fecha:** 23 de octubre de 2026  
**Regla:** `HECHO` exige evidencia ejecutada; `PENDIENTE` exige intervención humana o credenciales. No se marca como hecho lo que solo está implementado sin probar.

| # | Condición | Estado | Evidencia / pendiente |
|---|---|---|---|
| 1 | Botón de PayPal integrado en el flujo correcto | **HECHO** | Modal de compra en `CatalogExperience`; ruta `/api/checkout`; build y pruebas de ruta. |
| 2 | Precio calculado por el servidor | **HECHO** | `un precio manipulado...` verifica que `totalCents`/`amount` del navegador se ignoran. |
| 3 | Órdenes vinculadas al usuario y producto | **HECHO** | `captureCheckout` valida propietario; `findOrderForWebhook` valida `custom_id`/`paypal_order_id`; prueba de orden ajena y de webhook cruzado. |
| 4 | Captura validada por PayPal | **HECHO** | `validateCapture` valida estado, referencia, importe y moneda; pruebas de captura exitosa, fallida y conciliada. |
| 5 | Compras registradas en la base | **HECHO** | Pruebas consultan `orders`, `transactions`, `webhook_events`; migración 8 aplicada. |
| 6 | Accesos activados sin duplicaciones | **HECHO** | Pruebas de idempotencia de captura, webhook duplicado y conteo de entitlements. |
| 7 | Webhooks verificados e idempotentes | **HECHO Sandbox real; PENDIENTE Live** | Evento `WH-0DB82195UK2472110-1XT79067KM1872805` verificado y `processed` una sola vez; reenvío real pendiente; duplicados cubiertos con mocks. |
| 8 | Productos sin precio no cobrables | **HECHO** | `price_status='pending'`, bloqueo en catálogo y checkout; prueba de producto auto-creado. |
| 9 | Sin secretos expuestos | **HECHO con credenciales reales** | `npm run check:secrets` revisó 39 archivos de `.next/static` con el Client Secret real definido; sin coincidencias; `.env` no está rastreado. |
| 10 | Pruebas automatizadas y compilación aprobadas | **HECHO** | `npm test`: 168/168; `npm run build`: correcto; `npm run lint`: correcto; E2E catálogo: 4/4. |
| 11 | Arquitectura compatible con el entorno Vercel elegido | **PENDIENTE / BLOQUEADO** | SQLite no es persistente en Vercel Production. Se eligió host Node con volumen persistente. Migración a Turso/PostgreSQL no implementada. |
| 12 | Guía completa de credenciales y despliegue | **HECHO** | `docs/PAYPAL_SETUP.md`, `PAYPAL_TESTING.md`, `PAYPAL_DEPLOYMENT.md`, `.env.example`. |
| 13 | Pruebas reales de Sandbox documentadas con resultados | **HECHO** | Orden `ord_jUlSwv54-pD6Pk2km5trQtWE`, PayPal `3TY92249470992444`, captura `9S879207H39589335`, `10.00 USD`, derecho y matrícula activos, webhook procesado y captura repetida sin duplicados. |
| 14 | No fusionar en `main` del repositorio legado ni desplegar a producción | **HECHO** | La rama `feature/paypal-checkout` se conserva en el repositorio legado; la migración vive en el repositorio privado `rpmministry/wisdom-academy-platform` (`main`). No hay merge al `main` legado ni despliegue de producción. |
| 15 | No activar cobros Live | **HECHO** | `PAYPAL_MODE=sandbox`; Live no configurado ni autorizado. |

## Bloqueos que requieren al propietario

1. **PENDIENTE:** verificar la cuenta comercial PayPal y confirmar recepción, retiro y comisiones en Ecuador.
2. **HECHO:** app REST Sandbox y comprador de prueba creados y utilizados.
3. **HECHO:** credenciales Sandbox y Webhook ID configurados fuera de Git.
4. **HECHO para la prueba:** URL HTTPS temporal de `localhost.run`; **PENDIENTE** una URL estable para staging/producción.
5. **HECHO:** procedimiento Sandbox ejecutado y documentado en `docs/PAYPAL_TESTING.md`.
6. **PENDIENTE:** decidir si se migra la base a Turso/PostgreSQL para usar Vercel Production.
7. **PENDIENTE:** autorizar expresamente cualquier publicación Live.
8. **PENDIENTE:** asignar precio (o marcar como gratuito explícitamente) al producto `wa-programa-programa-de-teologia-n2n`.
9. **PENDIENTE:** probar reembolso y reversión reales en Sandbox y reenviar un webhook duplicado.

## Producto pendiente detectado en la base local

- Nombre: **Programa de Teología | Universidad Cristiana N2N**
- Slug: `wa-programa-programa-de-teologia-n2n`
- Estado: publicado, `price_status='pending'`, precio 0.
- Efecto: aparece como «Precio por definir» y no permite checkout hasta que administración fije un precio (o confirme 0 como gratuito desde el CRM).
