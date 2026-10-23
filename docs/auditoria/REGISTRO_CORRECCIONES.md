# Registro de correcciones

Cada entrada indica el cambio, los archivos afectados, la justificación y la evidencia de validación. No se incluyen secretos ni datos personales.

## 1. Acceso del creador

| Campo | Detalle |
|---|---|
| Problema | La credencial inicial no autenticaba a la cuenta `platform_owner`. |
| Cambio | Rotación con `npm run provision:owner -- --rotate`; cambio de contraseña por `/api/auth/password`; nueva credencial en archivo protegido fuera del repositorio. |
| Archivos | No se modificó código para esto; se usaron `scripts/provision-owner.ts` y la API existente. |
| Justificación | Recuperar el acceso legítimo sin privilegios improvisados ni contraseñas en código. |
| Validación | Login 200, rol `ADMIN`, 31 permisos, `/admin` 200, `/api/admin/summary` 200, logout y rechazo posterior. |

## 2. Rendimiento y resiliencia del inicio de sesión

| Campo | Detalle |
|---|---|
| Problema | El login esperaba la lista administrativa; el cliente no tenía timeout; el formulario podía enviarse antes de hidratar. |
| Cambio | `cargarUsuariosAdmin` en segundo plano; `apiFetch` con `AbortController` y timeout de 20 s; botón deshabilitado hasta `sesionLista`; guardas contra doble envío; redirección por rol del servidor. |
| Archivos | `src/lib/api/client.ts`, `src/lib/auth/authContext.tsx`, `src/app/(public)/login/page.tsx`, `src/app/(public)/cambiar-contrasena/page.tsx` |
| Validación | Login en caliente 300–373 ms; E2E de error de credenciales; build y typecheck. |

## 3. Privacidad de contenido personalizado

| Campo | Detalle |
|---|---|
| Problema | La guía diaria personalizada se marcaba como caché pública. |
| Cambio | `Cache-Control: private, no-store`; `X-Content-Type-Options: nosniff`; `Content-Disposition` seguro. |
| Archivos | `src/app/api/curriculum/daily-guide/route.ts`, `src/app/api/curriculum/guide-pdf/route.ts`, `src/app/api/me/plans/[id]/guide/route.ts`, `src/server/http/contentDisposition.ts` |
| Validación | Pruebas unitarias de cabeceras; revisión de rutas; build. |

## 4. Descargas y contenido activo

| Campo | Detalle |
|---|---|
| Problema | Nombres con acentos podían romper cabeceras y HTML/SVG podían ejecutarse inline. |
| Cambio | Helper RFC 5987; MIME saneado; descarga forzada para HTML, SVG, XML y JavaScript. |
| Archivos | `src/server/http/contentDisposition.ts`, `src/app/api/courses/[slug]/materials/[materialId]/file/route.ts`, `.../materials/[materialId]/route.ts` |
| Validación | `tests/platform/http-utils.test.ts` (4 pruebas). |

## 5. Integración Moodle sin simulaciones

| Campo | Detalle |
|---|---|
| Problema | El puente devolvía cursos, notas y eventos ficticios con `[MOCK OK]`; el paquete offline apuntaba a archivos inexistentes; escrituras sin CSRF. |
| Cambio | Errores explícitos `MoodleNotConfiguredError`/`MoodleUnavailableError`; sin token por defecto; GET de sincronización devuelve 405; POST exige CSRF y permisos; paquete offline devuelve 404 si no existe; validación de notas 0–100. |
| Archivos | `src/services/moodleBridge.ts`, `src/app/api/moodle/grades/route.ts`, `src/app/api/moodle/sync-structure/route.ts`, `src/app/api/moodle/student-courses/route.ts`, `src/app/api/moodle/offline-package/route.ts`, `src/types/wisdom.ts` |
| Validación | Typecheck, pruebas de plataforma y build. |

## 6. Videollamadas sin enlaces ficticios

| Campo | Detalle |
|---|---|
| Problema | Meet/Zoom/Teams usaban URLs de demostración y BBB un secreto público. |
| Cambio | `disponible` por plataforma; sin URL si no está configurada; sin secreto por defecto; UI muestra “Sala no configurada”. |
| Archivos | `src/services/videoTutoringHub.ts`, `src/components/lms/VideoTutoringModal.tsx`, `src/components/WisdomClassroomShell.tsx` |
| Validación | Typecheck y revisión de UI. |

## 6b. CSRF en la API administrativa

| Campo | Detalle |
|---|---|
| Problema | 24 rutas administrativas mutables usaban `requireSession` sin `mutation:true`. |
| Cambio | Se añadió `mutation:true` a POST/PATCH/DELETE de administración, usuarios, productos, descuentos, regalos, invitaciones, derechos, matrículas, notas y reembolsos. Los POST de solo lectura conservaron su comportamiento. |
| Archivos | `src/app/api/admin/**/route.ts`, `src/app/api/curriculum/sync-daily/route.ts`, `src/app/api/openmaic/progress/route.ts`, `src/app/api/auth/password/route.ts` |
| Validación | E2E: `POST /api/admin/products` sin token devuelve 403; build y typecheck correctos. |

## 6c. Sincronización diaria solo por POST

| Campo | Detalle |
|---|---|
| Problema | `GET /api/curriculum/sync-daily` ejecutaba una sincronización con Drive/Moodle/OpenMAIC; `POST` delegaba en `GET`. |
| Cambio | GET responde 405 con `Allow: POST`; POST exige sesión, permiso `resources.manage` y token CSRF. |
| Archivos | `src/app/api/curriculum/sync-daily/route.ts` |
| Validación | Build y typecheck; revisión de código. |

## 7. Cabeceras y configuración de seguridad

| Campo | Detalle |
|---|---|
| Problema | No había configuración global de cabeceras. |
| Cambio | `next.config.ts` con HSTS, `nosniff`, `X-Frame-Options`, Referrer-Policy, COOP y Permissions-Policy; `poweredByHeader: false`; `reactStrictMode: true`. |
| Validación | Build de producción. |

## 8. Sesiones y contraseñas

| Campo | Detalle |
|---|---|
| Problema | Crecimiento de sesiones; parser de hash sin límites; secretos recortados. |
| Cambio | Poda de sesiones y migración 7; límites de parámetros scrypt; `requireJsonString` con opción `trim:false` para secretos. |
| Archivos | `src/server/auth/sessions.ts`, `src/server/auth/passwords.ts`, `src/server/http/api.ts`, `src/server/db/sqlite.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/password/route.ts` |
| Validación | Pruebas de plataforma de contraseñas y cambio de contraseña; `check:deploy` reporta 7 migraciones. |

## 9. Portada, textos y tema

| Campo | Detalle |
|---|---|
| Problema | Estadísticas en 0 durante la carga; collage vacío; textos K-12/tutores por encima de la oferta; toggle con efectos dentro del actualizador. |
| Cambio | Esqueletos, `—`, reintento, `aria-busy`; textos de educación básica, homeschool, cursos y talleres; tema calculado fuera del actualizador; metadatos corregidos; `publicSiteUrl()` evita publicar `localhost` en Open Graph. |
| Archivos | `src/components/catalog/CatalogExperience.tsx`, `src/styles/platform-ui.css`, `src/lib/auth/authContext.tsx`, `src/app/layout.tsx`, `src/app/(public)/page.tsx`, `src/app/(public)/login/page.tsx` |
| Validación | Capturas 320–1440 px en claro/oscuro; E2E de persistencia; build. |

## 10. Preparación de despliegue

| Campo | Detalle |
|---|---|
| Problema | SQLite no persiste en Vercel; faltaban comprobaciones previas. |
| Cambio | Guard de persistencia en `getDb`; `scripts/check-deployment.ts`; `npm run check:deploy`; `.env` completado sin exponer valores; `.env.example` actualizado; README corregido. |
| Archivos | `src/server/db/sqlite.ts`, `scripts/check-deployment.ts`, `package.json`, `.env.example`, `README.md` |
| Validación | `check:deploy` sin fallos críticos; backup e integridad correctos. |

## 11. Pruebas nuevas

| Archivo | Cobertura |
|---|---|
| `tests/platform/http-utils.test.ts` | Content-Disposition, MIME y contenido activo |
| `tests/e2e/ui-regression.spec.ts` | Persistencia de tema, error de credenciales y menú administrativo móvil |
