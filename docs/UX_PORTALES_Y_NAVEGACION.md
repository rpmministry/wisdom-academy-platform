# UX de portales, navegación y accesibilidad

Fecha: 2026-10-22. Alcance: catálogo dual, vista previa del Portal Escolar y portal del estudiante.

## 1. Referentes analizados

- **Crehana / Coursera:** catálogo con hero, búsqueda, filtros por categoría y tarjetas con metadatos; separación entre rutas de aprendizaje y cursos puntuales.
- **Khan Academy:** progreso por materia, unidades y ruta diaria; el estudiante entiende qué sigue sin perderse en menús.
- **Duolingo:** camino corto y accionable; una decisión principal por pantalla.
- **Lark Suite / Notion:** workspace con barra lateral, métricas y paneles; densidad de información organizada por contexto.
- **WAI-ARIA Authoring Practices:** patrón de tabs, acordeón y diálogo modal con navegación por teclado.
- **Radix UI Primitives (MIT):** componentes headless accesibles para tabs, accordion y dialog. Se integraron `@radix-ui/react-tabs`, `@radix-ui/react-accordion` y `@radix-ui/react-dialog`.
- Referencias:
  - https://www.radix-ui.com/primitives/docs/components/tabs
  - https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
  - https://www.w3.org/WAI/ARIA/apg/patterns/accordion/
  - https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
  - https://www.nngroup.com/articles/tabs-used-right/
  - https://www.crehana.com/ec/cursos-online/?all=true
  - https://www.coursera.org/
  - https://www.khanacademy.org/
  - https://www.larksuite.com/

## 2. Decisiones de diseño

### Catálogo dual

- Dos portales visibles como tabs: **Portal Escolar** y **Cursos y Talleres**.
- La selección cambia el conjunto de tarjetas sin recargar ni perder la búsqueda ni el scroll.
- Cada portal tiene su propio copy y categorías.
- El Portal Escolar muestra un mapa de todos los niveles K-12; la vista interactiva está disponible para los niveles con currículo activo (4.° y 8.° EGB) y los demás se configuran a medida.
- Un modal de vista previa permite explorar materias, horarios y docentes sin abandonar el catálogo.

### Portal del estudiante

- Tabs primarios: Resumen, Horario, Calendario, Ruta diaria y Materias.
- El horario se genera desde `PerfilCurricular.horarioSemanal`, por lo que Avril (8.°) y Gael (4.°) reciben materias, bloques y docentes distintos.
- La ruta diaria usa `academic_plans` y `academic_plan_subjects`: 200 días por estudiante, temas y objetivos reales.
- Acordeón para los próximos 12 días; el estudiante abre solo el día que necesita.
- Tarjetas de materias con unidades, conceptos, docente y acceso al aula.
- En móvil, tabs con scroll horizontal, horario con scroll táctil y métricas en una columna.

### Accesibilidad

- `Tabs` con navegación por flechas, Home/End y `aria-label`.
- `Accordion` con `aria-expanded` y control por teclado mediante Radix.
- `Dialog` con foco atrapado, cierre con Escape y overlay.
- Contraste mediante tokens de tema; no se usan colores fijos para texto crítico.
- Estados vacíos explícitos y enlaces de acción.

## 3. Cambios técnicos

- `src/components/student/StudentPortal.tsx`: tabs, acordeón, horario, calendario, ruta y materias.
- `src/app/api/me/portal/route.ts`: perfil, horario único, materias, planes y eventos.
- `src/components/catalog/CatalogExperience.tsx`: tabs de portal, filtros y modal.
- `src/components/catalog/SchoolPortalModal.tsx`: vista previa con Radix Dialog y Tabs.
- `src/styles/platform-ui.css`: estilos responsive y tokens para claro/oscuro.

## 4. Validación

- Avril: 11 asignaturas, 136 unidades, 25 bloques semanales.
- Gael: 9 asignaturas, 112 unidades, 25 bloques semanales.
- Horarios distintos confirmados por comparación JSON.
- Catálogo: 4 productos escolares y 5 de cursos/talleres.
- Modal: 2 niveles, 9 y 11 materias respectivamente.
- Playwright sin errores de página en portal, catálogo, modal y modo oscuro.

## 5. Actualización 2026-10-24: encabezados, cuenta y checkout

### Encabezado compartido

- `PublicHeader` reemplaza las copias de encabezado del catálogo, login y
  checkout. En escritorio mantiene la navegación de marca; por debajo de
  1180 px agrupa los enlaces en un panel móvil.
- El carrito y la cuenta permanecen visibles en todos los tamaños. El botón de
  cuenta nunca se oculta ni se mueve fuera del viewport.
- El menú móvil se cierra con Escape, al navegar y al cambiar de ruta.
- La matriz 320×740, 360×800, 375×812, 390×844, 430×932, 768×1024, 1024×768,
  844×390, 1280×800 y 1440×900 se comprueba en Playwright sin desbordamiento
  global ni controles fuera de pantalla.

### Perfil y salida

- `AccountMenu` es un patrón único para portal y CRM administrativo:
  `aria-haspopup`, `aria-expanded`, foco visible, Escape, clic fuera, flechas,
  Home/End y cierre al navegar.
- Opciones existentes: **Mi cuenta**, **Mi portal**, **Mi acceso**,
  **Administración** (solo con permiso), **Cambiar contraseña**, **Canjear
  código** y **Cerrar sesión**.
- `/mi-cuenta` muestra identidad, rol, estado e historial de compras. No ofrece
  edición de datos institucionales que el backend no permita.
- La salida usa `/api/auth/logout`. Si el servidor no confirma la invalidación,
  se muestra un error y no se simula una salida exitosa.
- El middleware de rutas privadas conserva `next`, y el login regresa al punto
  solicitado sin bucles.

### Checkout

- El carrito vive en el navegador y sobrevive al login. El acceso se presenta
  dentro del checkout, no como una redirección genérica que pierda productos.
- El resumen del pedido distingue subtotal, descuento y total del servidor.
- El botón de pago se deshabilita si PayPal no está configurado o la
  cotización falla; el usuario recibe una explicación explícita.
- «Comprar ahora» y «Agregar al carrito» son acciones separadas y visibles.
- El resultado del pago se verifica en `/checkout/return`; el navegador no
  declara el pago.

Los detalles técnicos y de permisos están en
[`CHECKOUT_Y_CRM_FINANCIERO.md`](CHECKOUT_Y_CRM_FINANCIERO.md).
