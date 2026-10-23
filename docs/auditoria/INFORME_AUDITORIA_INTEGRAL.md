# Informe integral de auditoría — Wisdom Academy

**Fecha:** 22 de octubre de 2026  
**Alcance:** repositorio completo, autenticación, autorización, catálogo, pagos, portales, recursos, integraciones, interfaz, temas, rendimiento y preparación de despliegue.  
**Naturaleza:** auditoría técnica, funcional, de seguridad y de preparación para producción con correcciones aplicadas y evidencia de ejecución.

## 1. Resumen ejecutivo

La plataforma es una aplicación Next.js 15 con backend integrado en rutas API, TypeScript estricto y SQLite local mediante `node:sqlite`. El estado inicial compilaba y sus pruebas automatizadas pasaban, pero presentaba cuatro riesgos relevantes para producción:

1. La credencial del creador entregada en el archivo inicial ya no era válida. El acceso se recuperó mediante el mecanismo seguro existente, se cambió la contraseña por una nueva y se verificó el inicio de sesión, la sesión, el panel administrativo y el cierre de sesión.
2. SQLite no es compatible con el sistema de archivos efímero de Vercel Production. Se añadió un bloqueo explícito y una guía de despliegue; **Vercel Production queda bloqueado hasta migrar la base o usar un host con volumen persistente**.
3. Varias respuestas con datos personalizados se marcaban como cacheables públicamente y existían integraciones Moodle que simulaban éxito con datos ficticios. Ambas situaciones se corrigieron.
4. El inicio de sesión y la primera pintura del panel esperaban la carga completa de la lista administrativa. Se desacopló esa carga, se añadieron tiempos de espera y estados de error, y se redujo la demora percibida.

El resultado global es **APTO PARA VALIDACIÓN EN STAGING** en un host con persistencia. **No es apto para producción en Vercel** mientras se mantenga SQLite local. Quedan pendientes acciones externas: migración o alojamiento persistente, retiro de fixtures de prueba, CSP estricta, recuperación de contraseña, revisión legal y servicios de monitoreo.

## 2. Arquitectura detectada

| Componente | Implementación real |
|---|---|
| Framework | Next.js 15.5.28, App Router, React 19 |
| Lenguaje | TypeScript estricto |
| Runtime | Node.js 24 (obligatorio por `node:sqlite`) |
| Persistencia | SQLite local en `.data/wisdom.db` (configurable con `WISDOM_DB_PATH`) |
| Migraciones | 7 migraciones versionadas en `src/server/db/sqlite.ts` |
| Autenticación | Contraseña con scrypt + Google ID token; sesiones opacas con cookie HttpOnly |
| Autorización | RBAC en tablas `roles`, `permissions`, `user_roles`, `role_permissions` y comprobación en servidor |
| Pagos | PayPal Sandbox/Live, captura server-side, webhook firmado e idempotencia |
| Correo | No se detectó un proveedor transaccional conectado |
| Archivos | Google Drive para materiales; SQLite para metadatos |
| IA | Orquestador con proveedores configurables por variables de entorno |
| Pruebas | `node:test` para plataforma/recursos/cursos y Playwright para E2E |
| Despliegue | Sin `vercel.json`; se añadió `next.config.ts` con cabeceras de seguridad |

## 3. Matriz de hallazgos

| ID | Módulo | Hallazgo | Severidad | Evidencia | Causa raíz | Solución aplicada | Validación | Estado |
|---|---|---|---|---|---|---|---|---|
| AUTH-01 | Cuenta del creador | La contraseña del archivo inicial no autenticaba | Crítica | `POST /api/auth/login` devolvía 401 con la credencial entregada | Credencial inicial obsoleta; la contraseña vigente no coincidía con el archivo | Rotación con `provision:owner --rotate`, cambio de contraseña por API y entrega en archivo protegido | Login 200, rol `ADMIN`, 31 permisos, `/admin` 200, `/api/admin/summary` 200 | Corregido |
| AUTH-02 | Inicio de sesión | El login esperaba la carga completa de usuarios administrativos | Alta | `iniciarSesionConRespuesta` hacía `await cargarUsuariosAdmin` antes de navegar | Acoplamiento entre autenticación y listado administrativo | Carga en segundo plano; la sesión queda lista sin esperar el listado | Login en caliente 300–373 ms; panel abre sin bloqueo del listado | Corregido |
| AUTH-03 | Cliente API | Solicitudes sin tiempo límite podían dejar indicadores infinitos | Alta | `apiFetch` no usaba `AbortController` | Falta de timeout y distinción de errores de red | Timeout de 20 s, errores `TIMEOUT`/`NETWORK_ERROR` y reintento en catálogo | Pruebas E2E de login y UI; revisión de código | Corregido |
| AUTH-04 | Formulario de acceso | Envíos antes de la hidratación y dobles envíos | Media | Clic perdido al cargar y ausencia de guarda de duplicados | El botón estaba activo antes de que React hidratara | Botón deshabilitado hasta `sesionLista`, guarda `cargando`, texto de preparación | E2E: error de credenciales y botón recuperado | Corregido |
| AUTH-05 | Redirección | El destino dependía de un estado de React todavía no actualizado | Media | Riesgo de enviar al creador a `/dashboard` tras el login | `tienePermiso` usaba el estado previo | Redirección basada en el rol devuelto por el servidor | Login real y E2E RBAC | Corregido |
| AUTH-06 | Contraseñas | Los campos se recortaban y el parser de hashes no acotaba parámetros | Media | `requireJsonString` aplicaba `trim` a secretos | Validación genérica reutilizada para secretos | Secretos sin `trim`; límites de N, r, p, salt y hash | Pruebas de plataforma de contraseñas | Corregido |
| AUTH-07 | Sesiones | Tabla de sesiones crecía sin limpieza | Baja | 74 sesiones activas/antiguas en la base local | Sin poda periódica | Poda de caducadas/revocadas y migración 7 con índice | `check:deploy` reporta 7 migraciones | Corregido |
| AUTH-08 | Logout | La sesión revocada seguía devolviendo 200 en `/api/auth/session` | Informativo | El endpoint devuelve `usuario:null` con 200 | Contrato del endpoint para el cliente | Se verificó que rutas y APIs protegidas rechazan la cookie revocada | `/admin` 307 a `/login`; `/api/admin/summary` 401 | Verificado, sin cambio |
| SEC-01 | Guías personalizadas | `Cache-Control: public, s-maxage=86400` en datos de un estudiante | Crítica | Cabecera en `/api/curriculum/daily-guide` | Copia de política de caché pública a contenido autenticado | `private, no-store` y `nosniff` | Revisión de código y pruebas de compilación | Corregido |
| SEC-02 | Materiales | HTML/SVG podían servirse inline desde el origen de la app | Alta | `Content-Type` proveniente de Drive sin forzar descarga | Falta de clasificación de contenido activo | Descarga forzada para contenido activo, MIME saneado y `nosniff` | Pruebas unitarias de `contentDisposition`/MIME | Corregido |
| SEC-03 | Moodle | El puente simulaba cursos, notas, eventos y paquetes offline | Crítica | Mensajes `[MOCK OK]` y objetos con `exito:true` | Fallback automático a datos ficticios | Errores explícitos, sin simulación; paquete offline 404 si no existe | Pruebas de plataforma y revisión de rutas | Corregido |
| SEC-04 | Moodle | `sync-structure` mutaba por GET; `grades` no exigía CSRF | Alta | GET ejecutaba creación de categorías; POST de notas sin `mutation:true` | Endpoints heredados sin controles de escritura | GET 405; POST con CSRF y permisos; validación de notas | Revisión de código y pruebas de compilación | Corregido |
| SEC-04b | API administrativa | 24 rutas mutables no exigían token CSRF | Alta | Auditoría de handlers POST/PATCH/DELETE | Uso de `requireSession` sin `mutation:true` | Se añadió `mutation:true` a las rutas administrativas; los POST de solo lectura se mantuvieron sin CSRF | E2E: mutación administrativa sin token devuelve 403 | Corregido |
| SEC-04c | Sincronización diaria | GET ejecutaba sincronización con Drive/Moodle/OpenMAIC | Alta | `GET /api/curriculum/sync-daily` mutaba y POST delegaba en GET | Handler heredado sin separación de lectura/escritura | GET 405; POST con CSRF y permiso | Revisión de código; build y typecheck | Corregido |
| SEC-05 | Videollamadas | URLs ficticias de Meet/Zoom/Teams y secreto público BBB | Media | Enlaces de demostración y secreto de prueba en el servicio | Valores de ejemplo usados como fallback | Plataformas no disponibles si no hay configuración real; sin secretos por defecto | Revisión de código; UI muestra “Sala no configurada” | Corregido |
| SEC-06 | Cabeceras HTTP | No había cabeceras de seguridad globales | Media | Ausencia de `next.config` | Configuración no creada | HSTS, `nosniff`, `X-Frame-Options`, Referrer, COOP y Permissions Policy | Build de producción | Corregido |
| SEC-07 | CSP | No se aplicó CSP estricta | Media | Scripts y estilos inline existentes | Requiere nonces y migración de estilos | Se documenta como riesgo residual; no se aplicó una política que rompiera el aula | Revisión manual | Pendiente |
| DATA-01 | Persistencia | SQLite local no persiste en Vercel Production | Crítica | `.data/wisdom.db` en filesystem serverless | Arquitectura local incompatible con Vercel | Bloqueo en `getDb`, `check:deploy` y guía de despliegue | `check:deploy` y documentación | Mitigado; despliegue Vercel bloqueado |
| DATA-02 | Fixtures | La base local contiene cuentas E2E | Alta si se publica | 2 cuentas `@wisdomacademy.test` | Pruebas ejecutadas contra `.data` en el pasado | El verificador falla en producción; se documenta el retiro | `check:deploy` las detecta | Pendiente de limpieza |
| DATA-03 | Descargas | Nombres con acentos podían romper `Content-Disposition` | Media | Cabeceras construidas con texto no ASCII | Falta de RFC 5987 | Helper con respaldo ASCII y `filename*` | 4 pruebas unitarias | Corregido |
| UI-01 | Portada | Estadísticas mostraban 0 y el collage quedaba vacío durante la carga | Media | Capturas en frío con `0` y tarjetas vacías | Estado inicial sin marcador de carga | Placeholders, `—`, reintento y `aria-busy` | Captura tras carga: 9 productos, 40 recursos, 3 tarjetas | Corregido |
| UI-02 | Tema | El cambio de tema usaba efectos secundarios dentro del actualizador de React | Media | Comportamiento inconsistente bajo StrictMode | Actualizador impuro | Cambio calculado fuera del actualizador | E2E de persistencia del tema | Corregido |
| UI-03 | Responsive | El panel administrativo y las pestañas móviles requerían verificación | Baja | Sidebar fuera de pantalla y tab bar con scroll | Diseño responsive existente | Se verificó el botón de menú y el cajón; sin desborde de página | E2E móvil 375 px y capturas 320–1440 px | Verificado |
| UI-04 | Textos | La portada y los metadatos prometían K-12 y tutores humanos por encima de la oferta visible | Alta | `K-12`, “tutores humanos”, “homeschool” como identidad única | Copia comercial desalineada con el catálogo real | Posicionamiento integral y límites reales de la oferta | Revisión de textos y metadatos | Corregido |
| CFG-01 | Entorno | Faltaban `APP_URL`, `PLATFORM_OWNER_EMAIL`, `WISDOM_BACKUP_DIR` y pepper estable | Alta | `check:deploy` fallaba | Configuración incompleta | Se completó `.env` conservando el pepper existente y se respaldó el archivo | `check:deploy` sin fallos críticos | Corregido |
| CFG-02 | Seed | El primer arranque en frío puede tardar por compilación de Next en desarrollo | Baja | Primera petición de 10 s en dev; 300–373 ms en caliente | Compilación bajo demanda | Build de producción y timeout/reintento en cliente | Medición antes/después | Mitigado en desarrollo |

## 4. Causa raíz del problema de acceso del creador

La cuenta configurada como `platform_owner` existía, estaba activa, tenía contraseña scrypt y no requería cambio. El archivo `owner-initial-credential.txt` contenía una contraseña anterior que ya no coincidía con el hash vigente. Por eso el formulario mostraba un error de credenciales y los reintentos añadían demora y riesgo de límite de frecuencia.

La recuperación se realizó sin conceder privilegios a terceros, sin desactivar la autenticación y sin crear una contraseña maestra:

1. Se creó un respaldo verificado de la base con `npm run db:backup`.
2. Se rotó la credencial con `npm run provision:owner -- --rotate`.
3. Se inició sesión con la credencial rotada, se cambió la contraseña por una nueva generada aleatoriamente y se guardó en `%USERPROFILE%\.wisdom-academy\owner-recovery-credential.txt` con permisos restringidos.
4. Se verificó el acceso al panel, la sesión, los permisos y el cierre de sesión.

La contraseña no se imprimió en la consola ni se incluyó en este informe.

## 5. Cambios principales

- Autenticación: timeout de red, carga administrativa en segundo plano, guardas de envío, redirección por rol, secretos sin recorte, parámetros de hash acotados, poda de sesiones.
- Seguridad: cabeceras HTTP, caché privada, descarga forzada de contenido activo, endurecimiento de Moodle, eliminación de URLs y secretos de demostración.
- Rendimiento y UX: esqueletos de catálogo, reintento, estados de error, tema sin efectos impuros, textos y metadatos alineados con la oferta real.
- Configuración: `check:deploy`, guard de persistencia, `.env` completado, `engines.node`, `next.config.ts`.
- Documentación: README corregido, informes de auditoría, seguridad, pruebas y despliegue.

## 6. Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| `npm run typecheck` | Correcto tras la compilación final |
| `npm run build` | Correcto; 18 páginas generadas |
| `npm run test:platform` | 47 pruebas aprobadas |
| `npm test` | 141 pruebas aprobadas (50 recursos + 47 plataforma + 44 cursos) |
| Playwright E2E | 25 pruebas aprobadas contra build de producción |
| Login real del creador | 200; rol ADMIN; panel 200; resumen 200 |
| Logout y cookie revocada | `/admin` 307 a `/login`; API administrativa 401 |
| Credenciales incorrectas | 401 sin revelar si la cuenta existe |
| Payload malformado | 400 |
| `npm run check:deploy` | Sin fallos críticos; 2 advertencias (PayPal sandbox y Google no configurado) |
| `npm run db:backup` | Respaldo e integridad correctos |

## 7. Limitaciones y bloqueos

1. **Vercel Production:** bloqueado por SQLite no persistente. Requiere host con volumen persistente o migración a base administrada.
2. **Servicios externos:** Google Sign-In, PayPal Live, correo transaccional, monitoreo y almacenamiento definitivo requieren credenciales y decisión del propietario.
3. **Datos de prueba:** la base local contiene 2 cuentas de fixtures; deben retirarse antes de publicar.
4. **CSP estricta:** pendiente por scripts/estilos inline.
5. **Recuperación de contraseña:** no hay flujo automático de “olvidé mi contraseña”; el restablecimiento es administrativo.
6. **Legal:** políticas de privacidad, términos, consentimiento de menores y retención requieren revisión profesional en Ecuador y en los territorios de operación.
7. **Validación visual:** se hicieron capturas en 320, 375, 768, 1024 y 1440 px, en claro y oscuro, sobre portada, login, catálogo, panel administrativo, dashboard y cursos. No sustituyen una certificación WCAG ni pruebas con lectores de pantalla reales.

## 8. Conclusión

Wisdom Academy conserva sus funcionalidades y ha mejorado en autenticación, privacidad, integridad de integraciones, rendimiento percibido y claridad comercial. El acceso del creador quedó recuperado y verificado. La publicación en Vercel no debe realizarse con la arquitectura actual; la ruta segura es un host persistente o una migración de base de datos. La documentación de despliegue y la lista de verificación contienen los pasos restantes.
