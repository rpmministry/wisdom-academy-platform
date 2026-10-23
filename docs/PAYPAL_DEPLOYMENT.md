# Despliegue de PayPal y producción · Wisdom Academy

**Fecha:** 23 de octubre de 2026  
**Estado:** preparado para revisión. **No se desplegó nada, no se fusionó nada en `main` y no se ejecutó ningún cobro Live.** Se completó un cobro Sandbox real el 23/10/2026 con dinero ficticio.

## 1. Decisión de arquitectura

La aplicación real es **Next.js 15 App Router** con backend en Route Handlers y **SQLite local mediante `node:sqlite`**. No existe `server.ts`, `api-entry.js`, `vercel.json` ni un proxy `BACKEND_URL`. Tampoco existe un adaptador Turso/libSQL.

Por tanto, la arquitectura activa es:

> **Aplicación full-stack Next.js en un host Node.js con volumen persistente.**

No es la arquitectura A (frontend Vercel + backend separado) ni la B (funciones Vercel + Turso). No se combinaron estrategias.

### Por qué no Vercel Production con la base actual

Vercel no ofrece un volumen persistente para funciones serverless. Si se despliega allí con SQLite:

- Cada instancia puede ver un archivo distinto.
- Los datos desaparecen o se vuelven inconsistentes entre despliegues.
- Los usuarios, órdenes, capturas y derechos dejan de ser fiables.

El código bloquea el arranque cuando detecta `VERCEL=1` y `VERCEL_ENV=production`, salvo que se active explícitamente `WISDOM_ALLOW_EPHEMERAL_DB=1`. **No actives esa excepción en producción.**

### Ruta Vercel válida (pendiente de implementación)

Para usar Vercel Production de forma segura hay que migrar la capa de datos a una base administrada (PostgreSQL o libSQL/Turso) y convertir las operaciones síncronas a asíncronas. Esa migración no está incluida en esta entrega. Vercel Preview sin datos reales solo sirve para demostración visual con `WISDOM_ALLOW_EPHEMERAL_DB=1`; no es producción.

Además, el plan **Hobby** de Vercel está limitado a uso personal/no comercial; una academia que cobra necesita el plan Pro. Ver <https://vercel.com/docs/accounts/plans/hobby>.

### Alternativa gratuita temporal

Para publicar ahora sin reescribir la base se preparó `docs/DEPLOY_FREE_HOSTING.md`, con una ruta recomendada en **Northflank Sandbox** (volumen persistente, always-on, dominio propio) y alternativas como Oracle Cloud Always Free. Incluye `Dockerfile`, `.dockerignore` y el healthcheck `/api/health`.

## 2. Matriz de variables

| Variable | Development | Preview | Production (host persistente) |
|---|---|---|---|
| `NODE_ENV` | `development` | `production` | `production` |
| `APP_URL` | `http://localhost:3000` | URL del preview | `https://TU_DOMINIO` |
| `WISDOM_DB_PATH` | `.data/wisdom.db` | Ruta temporal solo demo | `/data/wisdom.db` |
| `WISDOM_BACKUP_DIR` | `.data/backups` | No usar datos reales | `/data/backups` |
| `WISDOM_ALLOW_EPHEMERAL_DB` | `0` | `1` solo demo | `0` |
| `PLATFORM_OWNER_EMAIL` | Correo del creador | Igual | Igual |
| `CODE_HASH_PEPPER` | Secreto local | Secreto de preview | Secreto estable de producción |
| `WISDOM_RATE_LIMIT_SALT` | Secreto local | Secreto de preview | Secreto estable de producción |
| `PAYPAL_MODE` | `sandbox` | `sandbox` | `live` solo con autorización |
| `PAYPAL_CLIENT_ID` | Sandbox | Sandbox | Live |
| `PAYPAL_CLIENT_SECRET` | Sandbox, solo servidor | Sandbox, solo servidor | Live, solo servidor |
| `PAYPAL_WEBHOOK_ID` | Sandbox | Sandbox | Live |
| `PAYPAL_CURRENCY` | `USD` | `USD` | `USD` |
| `PAYPAL_API_BASE_URL` | Vacío o mock en tests | Vacío | **Vacío** |
| `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Si se usa Google | Igual | Igual |

Nunca uses `NEXT_PUBLIC_PAYPAL_CLIENT_SECRET`. Nunca guardes secretos en el repositorio.

## 3. Webhook

URL pública:

```text
https://TU_DOMINIO/api/paypal/webhook
```

Debe ser accesible sin cookie de sesión. La autenticación es la firma de PayPal y el `PAYPAL_WEBHOOK_ID` del entorno. Eventos suscritos:

- `PAYMENT.CAPTURE.COMPLETED`
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REFUNDED`
- `PAYMENT.CAPTURE.REVERSED`

No montes el webhook detrás de autenticación de usuarios ni de un proxy que elimine las cabeceras `paypal-*`. Verifica que el proxy preserve el cuerpo crudo y las cabeceras.

## 4. Precondiciones antes de producción

- [ ] Rama revisada y cambios aprobados por el propietario.
- [ ] `npm run typecheck` correcto.
- [ ] `npm test` correcto.
- [ ] `npm run build` correcto.
- [ ] `npm run check:secrets` correcto.
- [ ] `npm run check:deploy` sin fallos críticos en el entorno final.
- [ ] Base respaldada con `npm run db:backup` y restauración probada.
- [ ] Host con Node 24 y volumen persistente.
- [ ] HTTPS y `APP_URL` correctos.
- [ ] Cuenta comercial PayPal verificada.
- [ ] Precios y moneda revisados por el propietario.
- [ ] App Sandbox probada de extremo a extremo.
- [ ] Webhook Sandbox real verificado.
- [ ] Credenciales Live independientes y autorizadas.
- [ ] Webhook Live creado.
- [ ] Monitorización y alertas configuradas.
- [ ] Copias de seguridad externas y retención definidas.
- [ ] Revisión legal/privacidad de datos de menores completada.
- [ ] Fixtures E2E eliminados de la base de producción.

## 5. Procedimiento de despliegue (host persistente)

1. Crear el volumen persistente y montarlo, por ejemplo en `/data`.
2. Configurar las variables en el panel del host, nunca en el repositorio.
3. Clonar la rama autorizada.
4. Ejecutar `npm ci`.
5. Ejecutar `npm run check:deploy`. Resolver fallos críticos.
6. Si se migra una base existente, ejecutar `npm run db:backup` antes del cambio.
7. Ejecutar `npm run build`.
8. Arrancar con `npm start` o el proceso administrado del host.
9. Configurar HTTPS y el dominio.
10. Ejecutar las comprobaciones de humo:

```text
GET /login                              -> 200
GET /api/auth/config                    -> paypalConfigured/mode correctos
GET /catalogo                           -> 200
POST /api/checkout (usuario de prueba)  -> approvalUrl de PayPal
GET /api/me/orders                      -> solo órdenes del usuario
POST /api/paypal/webhook (evento real)  -> 200 y evento procesado
```

11. Probar un pago Sandbox antes de cambiar a Live.
12. Cambiar a Live solo con autorización expresa y volver a desplegar.
13. Verificar que el webhook Live usa el dominio y Webhook ID Live.

## 6. Vercel: qué se puede y qué no

### No usar para producción

No configures Production con SQLite. La aplicación fallará al arrancar por diseño. No desactives el bloqueo.

### Preview de demostración

Solo si el propietario acepta que no hay persistencia:

- `WISDOM_ALLOW_EPHEMERAL_DB=1`
- `PAYPAL_MODE=sandbox`
- Sin datos reales
- Sin PayPal Live
- Sin dominio institucional
- Asumir que los datos desaparecen en cada despliegue

Un Preview con `PAYPAL_MODE=live` es un error operativo.

### Después de migrar la base

Si en el futuro se implementa Turso o PostgreSQL:

1. Elegir proveedor y crear la base.
2. Añadir el driver y una capa asíncrona.
3. Adaptar migraciones, semilla, transacciones y pruebas.
4. Configurar TLS y pooling.
5. Ejecutar todas las pruebas de pagos contra la nueva base.
6. Desplegar primero en Preview.
7. Verificar webhook y captura antes de Production.

## 7. Rollback

- Conserva el artefacto de build anterior y una copia de la base previa.
- Antes de migrar: `npm run db:backup`.
- Para restaurar: `npm run db:restore -- --from RUTA --confirm`.
- Verifica `PRAGMA integrity_check` y un login de prueba.
- No borres el volumen anterior hasta validar el nuevo despliegue.
- Si un cambio de PayPal falla, vuelve a la versión anterior del código y conserva las credenciales/Webhook IDs del entorno que funcionaba.
- No borres transacciones ni órdenes para “arreglar” un estado; registra una conciliación.

## 8. Conciliación y monitorización

Revisar periódicamente:

```sql
-- Órdenes pendientes antiguas
SELECT id, user_id, total_cents, created_at
FROM orders WHERE status = 'pending' ORDER BY created_at ASC;

-- Capturas sin derecho activo
SELECT o.id, o.status, t.provider_txn_id
FROM orders o LEFT JOIN transactions t
  ON t.order_id = o.id AND t.kind = 'capture'
WHERE o.status = 'paid' AND t.id IS NULL;

-- Webhooks con error
SELECT event_id, event_type, status, created_at
FROM webhook_events WHERE status = 'error' ORDER BY created_at DESC;

-- Reembolsos parciales
SELECT order_id, SUM(amount_cents) AS refunded
FROM transactions
WHERE provider = 'paypal' AND kind IN ('refund','reversal') AND status = 'completed'
GROUP BY order_id;
```

Alertas mínimas:

- Errores 5xx en `/api/checkout` y `/api/checkout/capture`.
- Webhooks con estado `error` o sin procesar durante más de 15 minutos.
- Órdenes `pending` con más de 24 horas.
- Diferencias entre capturas y derechos.
- Fallos de verificación de firma.
- Reinicios o errores de SQLite (`SQLITE_BUSY`, `disk I/O`).

## 9. Lista de seguridad

- [ ] Client Secret solo en variables de servidor.
- [ ] Sin secretos en Git, `.next/static`, capturas o logs.
- [ ] Cookies `HttpOnly`, `Secure`, `SameSite=Lax`.
- [ ] CSRF en checkout/captura/cancelación y administración.
- [ ] Webhook público con firma verificada y Webhook ID correcto.
- [ ] Importes calculados en el servidor.
- [ ] Orden ligada a usuario y producto.
- [ ] Captura verificada contra PayPal.
- [ ] Idempotencia de checkout, captura, webhook y reembolso.
- [ ] Reembolsos solo tras respuesta verificable.
- [ ] Reembolsos parciales/pendientes no revocan de más.
- [ ] Productos sin precio no comprables.
- [ ] Productos no publicados/archivados no comprables.
- [ ] Moneda coherente.
- [ ] Derechos activados una sola vez.
- [ ] Sin datos de otros usuarios en respuestas.
- [ ] Backups y restauración probados.
- [ ] Monitorización y alertas activas.

## 10. Autorización Live

La publicación Live requiere autorización expresa del propietario de Wisdom Academy. Esta guía no activa Production, no cambia variables y no ejecuta cobros. Hasta que exista esa autorización y las evidencias Sandbox, las condiciones de PayPal Live se consideran **PENDIENTES**.
