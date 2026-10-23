# Auditoría técnica y diseño — Módulo de Cursos y Talleres

**Fecha:** 22 de octubre de 2026  
**Alcance:** Fase 1 del prompt maestro N2N sobre el repositorio real de Wisdom Academy.

## 1. Estado real del repositorio

| Elemento | Estado verificado |
| --- | --- |
| Framework | Next.js `15.5.28` con App Router (`src/app`). |
| Lenguaje | TypeScript estricto (`npm run typecheck`). |
| UI | React 18, componentes propios en `src/components/ui`, tokens CSS en `src/styles/tokens.css` (Evergreen & Graphite v4.0). Tipografías autohospedadas: Bricolage Grotesque, Schibsted Grotesk e IBM Plex Mono. |
| Base de datos | SQLite mediante `node:sqlite` (Node 24). Migraciones incrementales en `src/server/db/sqlite.ts`; la versión 3 añade el módulo completo de cursos, talleres, repasos y evaluaciones. |
| Autenticación | Sesiones HttpOnly con CSRF (`wa_session`), contraseña scrypt y Google ID token. Roles y permisos en `users`, `roles`, `permissions`, `user_roles`, `user_permissions`. |
| Autorización | `requireSession()` en APIs y `requirePageUser()` en páginas; permisos comprobados siempre en servidor. Permiso clave del módulo: `resources.manage`; informes: `grades.manage`. |
| Catálogo y accesos | Tablas `resources`, `products`, `entitlements`, `global_access_grants`, `enrollments`. Los cursos y talleres se vinculan a un registro de `resources`, por lo que reutilizan el modelo de derechos vigentes. |
| Google Drive | `googleapis` con cuenta de servicio. Raíz configurada en `GOOGLE_DRIVE_ROOT_FOLDER_ID`. La sincronización curricular existente usa alcance `drive.readonly`; el nuevo módulo usa `drive` para crear carpetas y subir originales. Credenciales verificadas: la cuenta de servicio puede leer y crear carpetas en la raíz. |
| Google Drive — carpetas | Estructura real creada y verificada (189 carpetas). Ver `docs/drive-structure-courses-workshops.md`. |
| Pestañas actuales | `AdminDashboard` incluye una pestaña «Catálogo K-12» con datos demostrativos en `WorkshopsAndGradesCatalog.tsx`. No existía administración real de cursos/talleres ni fichas persistentes. |
| Página de estudiante | `(student)/contenidos` lista recursos accesibles; no existía una ruta de curso con semestres, clases, reproductor y progreso. |
| Pruebas | `npm run test:resources` (46), `npm run test:platform` (43), `npm run test:courses` (44 nuevas), `npm run test:e2e` (Playwright/Edge), `npm run typecheck`, `npm run build`. |
| Despliegue | `docker-compose.yml` para Moodle/MariaDB; la plataforma corre con Next.js y SQLite. No se realizaron despliegues ni migraciones destructivas. |

## 2. Integración con Google Drive

- Autenticación: JWT de cuenta de servicio con alcance `https://www.googleapis.com/auth/drive`.
- Raíz: `GOOGLE_DRIVE_ROOT_FOLDER_ID` (carpeta `Wisdom_Academy_Curriculo_Global`, ID omitido en documentación).
- Creación idempotente: `src/lib/courses/googleDrive.ts` busca por `parent + name + mimeType` antes de crear, verifica cada carpeta creada con `files.get` y registra el ID en `drive_folders` (clave única por ruta).
- No se conceden permisos públicos. No se mueven ni comparten carpetas existentes.
- Carpetas privadas de examen: se recomienda definir `GOOGLE_DRIVE_PRIVATE_ADMIN_FOLDER_ID` para que los originales con respuestas se guarden fuera del árbol del curso.
- Informes individuales: `GOOGLE_DRIVE_STUDENT_REPORTS_FOLDER_ID` habilita la copia a `Estudiantes/<id-interno>/Wisdom Academy/<programa>/<semestre>/Resultados de evaluaciones/`.

## 3. Componentes y servicios reutilizados

- `resources` + `entitlements`: derecho de acceso por programa; no se creó un sistema paralelo de matrícula.
- `ApiError`, `requireSession`, `readJsonBody`, `handleRouteError`, auditoría (`writeAudit`).
- Componentes `Card`, `Badge`, `Button`, `Tabs`, `WisdomIcon` y tokens de diseño.
- Patrón de documento imprimible ya usado en `printableGuideGenerator` (HTML imprimible A4, guardado como PDF desde el navegador).
- Reproductor: iframe de YouTube con `youtube-nocookie.com` y allowlist de dominios.

## 4. Arquitectura propuesta e implementada

```text
resources (course/workshop) 1─1 course_programs
course_programs 1─N course_modules (semester|module|unit)
course_modules 1─N course_lessons
course_lessons 1─N course_materials
usuarios 1─N lesson_progress
course_programs 1─N weekly_reviews
course_programs 1─N assessments 1─N assessment_questions
assessments 1─N assessment_attempts 1─N assessment_answers
assessment_attempts 1─1 course_grade_reports
drive_folders (registro idempotente de IDs reales)
course_import_runs (trazabilidad de importaciones)
```

Capas:

- `src/lib/courses/*`: lógica pura y segura (estructura Drive, YouTube, manifiestos, documentos, Markdown, informes).
- `src/server/domain/coursePrograms.ts`: CRUD, estructura, progreso, repasos, acceso.
- `src/server/domain/courseAssessments.ts`: banco de preguntas, auditoría, publicación, intentos, calificación en servidor.
- `src/server/domain/courseImport.ts`: previsualización/confirmación de manifiestos e importación de documentos.
- `src/server/domain/gradeReportDrive.ts`: copia idempotente de informes a Drive.
- APIs `/api/admin/courses/**` y `/api/courses/**`.
- UI administrativa `CoursesWorkshopsManager` y UI de estudiante `/cursos/**`.

## 5. Riesgos y mitigaciones

| Riesgo | Mitigación implementada |
| --- | --- |
| Carpetas de examen con permisos heredados amplios | Se advierte en la UI y en la documentación; se admite carpeta privada de administración separada. No se concede acceso público automático. |
| Claves de examen filtradas al cliente | Las rutas de estudiante nunca serializan `correct_key`; la calificación se ejecuta en el servidor; pruebas verifican la ausencia de claves. |
| IDOR/BOLA en intentos e informes | `getAttemptResult` y `submitAttempt` comparan `user_id`; los informes exigen acceso al programa. |
| YouTube no listado no es privado | Se documenta la limitación real; no se promete DRM ni restricción absoluta. |
| PDF escaneado sin texto | La extracción marca confianza baja/ninguna y exige OCR; nunca inventa contenido. |
| Importación duplicada | Manifiestos se fusionan por semestre/clase; reimportar actualiza, no duplica; carpetas Drive usan IDs persistidos. |
| Renderizado de Markdown importado (XSS) | Renderer propio que escapa HTML y solo admite un subconjunto seguro. |
| Dependencias pesadas | No se añadieron librerías PDF/DOCX; extracción nativa con `node:zlib`. |
| Drive no autorizado | Se informa el bloqueo; la estructura local y la importación siguen funcionando. |

## 6. Archivos principales modificados o añadidos

- Migración `version: 3` en `src/server/db/sqlite.ts`.
- `src/lib/courses/`: `drive-structure.ts`, `googleDrive.ts`, `courseDrive.ts`, `youtube.ts`, `manifest.ts`, `documents.ts`, `markdown.ts`, `reports.ts`.
- `src/server/domain/`: `coursePrograms.ts`, `courseAssessments.ts`, `courseImport.ts`, `gradeReportDrive.ts`.
- APIs: `src/app/api/admin/courses/**`, `src/app/api/courses/**`.
- UI: `src/components/admin/CoursesWorkshopsManager.tsx`, `src/components/courses/*`, `src/app/(student)/cursos/**`, `src/styles/courses.css`.
- Script: `scripts/init-courses-workshops-drive.ts`.
- Pruebas: `tests/courses/*.test.ts`.
- Documentación: este archivo y los documentos del módulo.

## 7. Decisiones

1. **No crear una plataforma nueva ni un LMS paralelo.** Se extiende `resources`/`entitlements` y se añaden tablas especializadas.
2. **Evaluación nativa.** No se integra H5P ni Moodle Quiz para los exámenes N2N porque sus mecanismos de publicación y feedback no cumplen por sí solos el requisito de clave privada y ausencia total de pistas; se documenta la investigación.
3. **PDF por impresión del navegador.** El stack no incluye un generador PDF nativo; se entrega HTML imprimible A4 con acción «Imprimir / Guardar PDF» y descarga HTML. Se documenta como limitación, no se simula un PDF.
4. **Semestre 1 N2N cargado.** El programa se publicó con 32 sesiones, 2 repasos y 5 exámenes oficiales; el Semestre 2 queda bloqueado hasta aprobar el primero. Los semestres 2-10 conservan estructura y carpetas, pero su contenido no se inventó: permanece pendiente de los archivos oficiales. Ver `docs/n2n-semester-1.md`.
