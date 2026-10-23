# Informe de seguridad — Wisdom Academy

**Fecha:** 22 de octubre de 2026  
**Referencias:** OWASP Top 10 (2021), OWASP ASVS 4.0 como marco de evaluación, buenas prácticas de Next.js y Node.js.  
**Alcance:** autenticación, autorización, sesiones, API, datos personales, integraciones, pagos, secretos, dependencias y configuración de despliegue.

> Este informe no certifica cumplimiento total de OWASP ASVS ni de ninguna norma. Documenta controles verificados, vulnerabilidades corregidas y riesgos residuales.

## 1. Resumen

No se encontraron vulnerabilidades críticas o altas explotables sin autenticación después de las correcciones. Se corrigieron dos riesgos críticos de privacidad/funcionalidad (caché pública de datos personales y simulación de operaciones Moodle) y varios riesgos altos de autorización y contenido activo. El análisis de dependencias reporta **4 vulnerabilidades moderadas transitivas** en la cadena de `googleapis`; no hay altas ni críticas.

Riesgos residuales principales:

1. SQLite no es persistente en Vercel Production. El despliegue está bloqueado por diseño.
2. No hay CSP estricta por el uso actual de scripts y estilos inline.
3. La base local contiene fixtures E2E que deben retirarse antes de publicar.
4. No se verificó el cumplimiento legal de privacidad, consentimiento de menores ni retención.
5. No hay monitoreo de errores, alertas de seguridad ni backups externos automáticos.

## 2. Controles verificados

### 2.1 Autenticación

- Contraseñas con scrypt (`N=32768`, `r=8`, `p=1`), salt aleatorio y comparación en tiempo constante.
- Verificación acotada de parámetros para evitar DoS por hashes manipulados.
- Mensaje genérico ante credenciales incorrectas; no se revela si la cuenta existe.
- Límite de intentos por identificador e IP con respuesta `429` y `Retry-After`.
- Cambio de contraseña obligatorio para cuentas recién aprovisionadas (`428` en APIs administrativas).
- Google Sign-In verifica el ID token en el servidor; no se confía en el correo enviado por el cliente.
- El inicio de sesión en producción exige cabecera `Origin` cuando no hay token CSRF.
- La contraseña no se recorta ni se registra en logs.

### 2.2 Sesiones

- Token opaco de 32 bytes, almacenado únicamente como SHA-256.
- Cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción y `Path=/`.
- Token CSRF independiente para operaciones mutables.
- Revocación en logout; las rutas protegidas y APIs rechazan la cookie revocada.
- Poda de sesiones caducadas/revocadas y migración 7 con índice.
- Caducidad absoluta de 12 horas; no se amplía indefinidamente.

### 2.3 Autorización

- RBAC comprobado en el servidor para cada endpoint sensible.
- Permisos de creador, administración, docencia, estudiantes y accesos globales separados.
- Rutas administrativas protegidas por layout y API; ocultar un botón no es un control.
- Acceso a contenido validado por recurso, programa, matrícula y derechos temporales.
- Los expedientes de menores requieren permisos específicos.
- Las operaciones de escritura de Moodle exigen POST, CSRF y permiso.
- Las 24 rutas administrativas de escritura exigen token CSRF además de sesión y permiso. La prueba E2E sin token devuelve 403.

### 2.4 API y aplicación

- Validación de JSON, tipos, longitudes y rangos en el servidor.
- Límite de cuerpo por bytes reales, no por longitud UTF-16.
- Consultas SQL con parámetros preparados; no se detectaron concatenaciones de entrada de usuario.
- Respuestas de error sin trazas internas ni secretos.
- `Cache-Control: no-store` en autenticación y `private, no-store` en contenido personalizado.
- Descarga forzada de HTML, SVG, XML y JavaScript; MIME saneado y `nosniff`.
- Cabeceras HSTS, `X-Content-Type-Options`, `X-Frame-Options`, Referrer-Policy, COOP y Permissions-Policy.
- Redirecciones de pago limitadas a URLs construidas por el servidor.
- Webhooks de PayPal verificados por firma, con comprobación de importe, moneda y orden.
- Operaciones de captura y webhook idempotentes; pruebas específicas aprobadas.

### 2.5 Secretos

- `.env` no está rastreado por Git ni aparece en el historial revisado.
- No se encontraron patrones de claves de Google, OpenAI, GitHub, Slack o claves privadas en archivos rastreados.
- La clave privada de la cuenta de servicio de Google solo se lee desde variables de entorno.
- Las credenciales del creador se entregan fuera del repositorio con permisos restringidos.
- En este equipo se restringieron por ACL las carpetas `.data`, `.env`, el respaldo de `.env` y la credencial de recuperación al usuario actual.
- El informe y la consola no imprimen contraseñas, tokens ni cookies.

### 2.6 Dependencias

Resultado de `npm audit` y `npm audit --omit=dev`:

- 0 críticas.
- 0 altas.
- 4 moderadas: `uuid` transitivo en `gaxios` → `googleapis-common` → `googleapis`.
- La corrección automática requiere `googleapis@188` (cambio mayor). No se aplicó sin pruebas de regresión de Drive.

## 3. Hallazgos corregidos

| ID | Hallazgo | Severidad | Medida |
|---|---|---|---|
| S-01 | Guía personalizada con caché pública | Crítica | `private, no-store` |
| S-02 | Moodle simulaba éxito y datos ficticios | Crítica | Errores explícitos; sin mock en producción |
| S-03 | HTML/SVG inline desde el origen | Alta | Descarga forzada + MIME saneado |
| S-04 | `sync-structure` mutaba por GET; notas sin CSRF | Alta | POST + CSRF + permisos |
| S-04b | 24 rutas administrativas mutables sin CSRF | Alta | `mutation:true` + prueba E2E 403 |
| S-04c | `sync-daily` mutaba por GET | Alta | GET 405; POST con CSRF |
| S-05 | URLs y secreto de videollamadas de demostración | Media | Sin valores por defecto; estado no disponible |
| S-06 | Falta de cabeceras de seguridad | Media | `next.config.ts` |
| S-07 | Secretos recortados y parser de hash sin límites | Media | Secretos exactos; parámetros acotados |
| S-08 | Sesiones sin poda | Baja | Poda + índice |
| S-09 | Nombres no ASCII en descargas | Media | RFC 5987 + respaldo ASCII |
| S-10 | Catálogo mostraba 0 y sin reintento ante fallo | Media | Esqueletos, `—`, reintento |

## 4. Riesgos residuales y acciones pendientes

| Riesgo | Impacto | Mitigación actual | Acción necesaria |
|---|---|---|---|
| SQLite efímero en Vercel | Pérdida de datos | Guard en `getDb` y `check:deploy` | Host persistente o migración a base administrada |
| CSP ausente | XSS si se introduce HTML inseguro | Escapado, descarga forzada, `nosniff` | Migrar estilos/scripts inline y aplicar nonces |
| Fixtures E2E en base local | Acceso de prueba en producción | Verificador falla si `NODE_ENV=production` | Eliminar cuentas `@wisdomacademy.test` antes de publicar |
| Sin recuperación automática de contraseña | Bloqueo de usuarios | Restablecimiento administrativo | Implementar flujo con token de un solo uso y correo transaccional |
| Sin backups externos | Pérdida ante fallo del host | `db:backup` local | Copia cifrada fuera del host y prueba de restauración |
| Sin monitoreo | Incidentes no detectados | Logs de consola | Sentry/OpenTelemetry y alertas de disponibilidad |
| Dependencias moderadas | Riesgo bajo en Drive | Versiones actuales | Evaluar actualización mayor de `googleapis` con regresión |
| Datos de menores | Alto impacto legal | Permisos y minimización | Política de privacidad, consentimiento y retención revisadas por especialista |
| Correo no configurado | Sin verificación/recuperación | Mensajes claros | Proveedor transaccional y plantillas |
| Embedding en LMS | `X-Frame-Options: SAMEORIGIN` lo impide | Configuración deliberada | Ajustar solo si se requiere iframe institucional |
| POST de recursos educativos sin CSRF explícito | Bajo: reportes/validaciones | Cookie `SameSite=Lax`, sesión y permisos | Unificar con `requireSession({ mutation: true })` y actualizar el cliente |
| Consumo de IA por usuario autenticado | Coste/abuso | Orquestador con caché y proveedores gratuitos | Añadir cuota por usuario y alertas de gasto |

## 5. Pagos

- No se ejecutaron cobros reales ni se cambiaron credenciales de producción.
- El importe se calcula en el servidor desde el producto; no se acepta el precio del cliente.
- La captura verifica la orden, el importe y la moneda antes de conceder derechos.
- El webhook exige firma válida y es idempotente.
- Los reembolsos revocan solo los derechos de la compra correspondiente.
- PayPal permanece en modo sandbox en la configuración local.

## 6. Conclusiones

La aplicación aplica controles razonables para una plataforma educativa con pagos y datos de menores, y ha cerrado los riesgos críticos detectados. No debe declararse “lista para producción” hasta resolver la persistencia, retirar fixtures, configurar backups/monitoreo y completar la revisión legal. La publicación en Vercel con SQLite está explícitamente bloqueada.
