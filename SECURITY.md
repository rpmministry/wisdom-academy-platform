# Seguridad · Wisdom Academy

## Reporte de vulnerabilidades

No publiques vulnerabilidades, credenciales, datos de estudiantes ni detalles de explotación en issues públicos.

Para reportar un problema de seguridad:

1. Usa el reporte privado de vulnerabilidades de GitHub si está disponible en el repositorio.
2. Si no está disponible, contacta directamente al propietario del repositorio por un canal privado.
3. Incluye una descripción, impacto, pasos de reproducción y versión afectada.
4. No incluyas secretos reales; usa valores de ejemplo.

El propietario confirmará la recepción y coordinará la corrección y la divulgación.

## Alcance

Se consideran especialmente críticos:

- Exposición del Client Secret de PayPal o de variables de servidor.
- Manipulación de precios, moneda, órdenes o capturas.
- Activación de accesos sin una captura verificada.
- Duplicación de cobros, matrículas o derechos.
- Acceso a datos de otros estudiantes o familias.
- Evasión de RBAC, CSRF, sesión o límites de frecuencia.
- Webhooks aceptados sin verificación de firma.
- Inyección SQL, XSS, SSRF o exposición de archivos.

## Controles existentes

- Sesiones `HttpOnly`, `Secure` en producción y `SameSite=Lax`.
- CSRF en mutaciones.
- RBAC y verificación de propiedad.
- Límites de frecuencia.
- Cálculo de precios y moneda en el servidor.
- Captura y webhooks verificados con PayPal.
- Idempotencia de pagos, webhooks y accesos.
- Escaneo de secretos con `npm run check:secrets`.
- Backups de SQLite y healthcheck.

## Buenas prácticas para contribuciones

- No incluir `.env`, tokens, cookies, capturas con datos reales ni claves en commits.
- No registrar `Authorization`, cuerpos de webhook completos ni datos personales.
- Usar datos ficticios en pruebas.
- Ejecutar `npm run lint`, `npm test` y `npm run build` antes de un pull request.
- Reportar cualquier secreto comprometido para rotarlo inmediatamente.

## Estado de pagos

PayPal Sandbox fue verificado con una transacción real de Sandbox. PayPal Live no está activado. No se deben realizar cobros reales sin autorización expresa, cuenta comercial verificada y credenciales Live independientes.
