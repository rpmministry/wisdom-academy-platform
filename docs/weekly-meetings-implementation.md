# Videollamadas de repaso semanal — implementación

## Estado

Implementado en el aula de Teología y en el workspace administrativo.

- Enlace inicial: `https://meet.google.com/vts-kbvh-xij`
- Proveedor inicial: Google Meet.
- Semanas configuradas: 12 (Semestre 1).
- Permiso de gestión: `meetings.manage`.
- Ruta del CRM: `/admin?tab=meetings`.

## Experiencia del estudiante

Cada semana muestra una tarjeta **“Repaso semanal en vivo”** con:

- Profesor/anfitrión y horario.
- Estado: Disponible, Próxima, En vivo, Finalizada, Cancelada.
- Proveedor de videollamada.
- Nota para el estudiante.
- Botón **Unirme en Google Meet** para enlaces externos.
- Botón **Entrar a la sala** para proveedores embebidos (Jitsi/Daily).
- Grabación cuando está disponible.

Google Meet se abre en una pestaña segura porque **no permite iframe** (`X-Frame-Options`/CSP). Para una videollamada dentro de la plataforma, el administrador puede cambiar el proveedor a Jitsi o Daily y usar el modo embebido.

## Administración

### Edición rápida desde la semana

1. Entra a `/cursos/programa-de-teologia-n2n`.
2. En la tarjeta de repaso, pulsa **Editar**.
3. Cambia proveedor, enlace, profesor, horario, estado o notas.
4. Guarda. El cambio se refleja de inmediato.

### Gestión global desde el CRM

1. Entra a `/admin?tab=meetings`.
2. Filtra por programa, semana o profesor.
3. Pulsa **Editar** en cualquier sala.
4. Revisa métricas: total, en vivo, publicadas y canceladas.

### Permisos

- `platform_owner`: acceso total.
- `principal_admin`: incluye `meetings.manage` por defecto.
- `delegated_admin`: debe recibir `meetings.manage` explícitamente.
- Estudiantes: solo lectura, con derecho de acceso al programa.

## Proveedores soportados

| Proveedor | Modo | Nota |
| --- | --- | --- |
| Google Meet | Externo | Enlace institucional; no se puede incrustar. |
| Jitsi Meet | Embebido | Requiere sala privada/JaaS para sesiones sensibles. |
| Daily | Embebido | Configurar token del proveedor si aplica. |
| BigBlueButton | Embebido | Pensado para integración con Moodle. |
| Zoom | Externo | Apertura en pestaña. |
| Microsoft Teams | Externo | Apertura en pestaña. |
| Otro | Externo/iframe | URL HTTPS validada manualmente. |

## Seguridad

- Solo URLs HTTPS y dominios permitidos por proveedor.
- Código Google Meet con formato `xxx-xxxx-xxx`.
- Rechazo de credenciales embebidas o esquemas inseguros.
- `host_url` solo se devuelve al personal con `meetings.manage`.
- El enlace de estudiante nunca incluye `host_url` ni notas internas.
- Auditoría de creación, actualización y eliminación sin guardar la URL completa en los eventos.
- El catálogo de proveedores y la validación están en `src/lib/meetings/providers.ts`.

## Base de datos

Migración 6 añade `weekly_meetings` y el permiso `meetings.manage`. Campos principales:

- `program_id`, `module_id`, `week_number`
- `provider`, `embed_mode`
- `join_url`, `host_url`
- `starts_at`, `ends_at`, `timezone`
- `status`, `student_note`, `staff_note`, `recording_url`

La combinación `(program_id, week_number)` es única.

## APIs

- `GET/POST /api/admin/courses/[id]/meetings`
- `PATCH/DELETE /api/admin/courses/[id]/meetings/[meetingId]`
- `GET /api/admin/meetings`
- `GET /api/courses/[slug]/weeks/[week]/meeting`

## Cómo cambiar el enlace predeterminado

Desde la interfaz:

1. `/admin?tab=meetings`.
2. Edita la sala de la semana.
3. Pega el nuevo enlace y guarda.

También se puede reconfigurar el valor inicial en `DEFAULT_MEETING_URL` (`src/lib/meetings/providers.ts`) antes de volver a sembrar semanas nuevas. Las salas existentes no se sobrescriben.

## Limitaciones

- La asistencia automática no está implementada; requeriría webhooks del proveedor o su API.
- Google Meet no ofrece un iframe embebible.
- Las salas Jitsi públicas no deben usarse con nombres predecibles para sesiones privadas.
- La grabación solo se enlaza si el administrador la configura.
