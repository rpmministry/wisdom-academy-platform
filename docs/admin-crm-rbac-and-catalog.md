# Administración unificada, RBAC y visibilidad del catálogo

## 1. Visibilidad de cursos en el catálogo

**Problema corregido:** un curso o taller recién creado generaba `resources` y `course_programs`, pero no un producto; el catálogo público solo lista productos publicados. Por eso nunca aparecía.

**Solución implementada:**

- Cada programa crea y mantiene un producto de catálogo (`catalog_product_id`).
- El estado del producto se sincroniza con el programa:
  - `draft` → producto `draft`
  - `published` → producto `published`
  - `archived` → producto `archived`
- La lectura del catálogo repara estados inconsistentes:
  - `backfillPublishedCourseProducts()` crea productos faltantes para cursos publicados.
  - `syncAllCourseProductStates()` corrige estados desincronizados.
- El catálogo solo muestra productos publicados con al menos un recurso publicado.
- La portada del producto toma la portada del programa (`cover_image_url`).
- El producto inicial es gratuito (`price_cents = 0`) hasta que se defina un precio desde CRM → Catálogo. Esto evita inventar un precio.
- Los cursos bajo el portal **Cursos y Talleres** ahora se muestran por defecto en `/catalogo`; el home conserva el Portal Escolar como entrada principal.

**Pruebas:** `tests/courses/catalogVisibility.test.ts` cubre creación, publicación, archivado, republicación y reparación de productos faltantes.

## 2. Workspace administrativo unificado

La administración y el CRM ahora comparten un único shell:

- Barra lateral con grupos: General, Academia, Comercial y accesos, Contenido.
- Topbar con ruta, búsqueda de secciones, acceso al catálogo, botón **Nuevo curso**, tema y perfil.
- El CRM se renderiza dentro del mismo workspace (`CRM & Accesos`) con sus pestañas internas; ya no tiene una barra lateral paralela.
- `/admin/crm` sigue funcionando y muestra el workspace con CRM activo.
- Los enlaces antiguos del CRM se conservan sin duplicar la navegación.
- Se adoptaron patrones de la referencia Vessa (panel operativo con rail, tarjetas, métricas, tabla y acciones claras), adaptados a la identidad verde/oro de Wisdom Academy.

Archivos:

- `src/components/admin/AdminWorkspaceShell.tsx`
- `src/styles/admin-workspace.css`
- `src/components/admin/AdminDashboard.tsx`
- `src/components/crm/CrmDashboard.tsx` (modo `embedded`)

## 3. RBAC estricto

### Servidor

- `(admin)/layout.tsx` exige `admin.access`.
- `/admin/crm` exige además `crm.access`.
- Las APIs administrativas siguen exigiendo permisos específicos (`resources.manage`, `products.manage`, `users.read`, `grades.manage`, etc.).
- El propietario de plataforma (`platform_owner`) conserva acceso total por diseño.

### Interfaz

- Las secciones del panel se filtran por permiso:
  - Cursos y Talleres: `resources.manage`
  - Estudiantes: `users.read`
  - Matrículas: `enrollments.manage`
  - Calificaciones: `grades.manage`
  - Boletines/certificados: `reports.read`
  - CRM: `crm.access`
  - Catálogo: `resources.read`
  - Recursos audiovisuales: `resources.manage`
- Un usuario sin permisos solo ve las secciones que le corresponden.
- El enlace **Panel** del catálogo, el botón **Panel administrativo** del portal del estudiante y **Mi acceso** solo aparecen con `admin.access`.
- Se eliminaron los accesos directos separados a **CRM** del catálogo, del portal del estudiante y de Mi acceso.
- Los visitantes anónimos son enviados al login; los estudiantes autenticados que intentan `/admin` o `/admin/crm` son enviados a `/dashboard`.

**Pruebas:** `tests/e2e/rbac-navigation.spec.ts` valida visitante anónimo, estudiante, catálogo sin enlaces administrativos y administrador autorizado con CRM unificado.

## 4. Tema claro y oscuro

- El shell administrativo usa los tokens semánticos de la plataforma (`--bg-canvas`, `--bg-surface`, `--bg-subtle`, `--text-*`, `--border-subtle`).
- El sidebar conserva la identidad original del CRM: azul noche, acentos ámbar y texto claro, tanto en modo claro como oscuro.
- Las tarjetas, KPI, gráficos, tablas y el contenido embebido del CRM conservan sus colores originales y cambian de superficie con el tema.
- Los tabs internos del CRM usan los tokens de advertencia/acento existentes, sin introducir una paleta nueva.
- La ficha del curso también responde al tema oscuro: portada y miniaturas se mantienen, mientras las superficies pasan a `--bg-surface` y los textos a `--text-primary`/`--text-secondary`.

## 5. Operación

- Para publicar un curso en catálogo: crear el curso → cargar contenido → **Publicar**. El producto se publica automáticamente.
- Para definir precio: **Administración → CRM & Accesos → Catálogo → Editar producto**.
- Para dar acceso a un estudiante: CRM → Usuarios y accesos → Derechos por recurso.
- Si un producto se elimina o queda inconsistente, basta abrir `/catalogo` para que el sistema repare el vínculo del curso publicado.
