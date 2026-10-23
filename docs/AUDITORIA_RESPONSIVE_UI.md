# Auditoría responsive de Wisdom Academy

**Alcance:** aula OpenMAIC, dashboard del estudiante, login y panel administrativo.  
**Objetivo:** eliminar el desbordamiento horizontal y garantizar que la clase siempre inicie en la parte superior visible, con especial atención a tablets y móviles.

---

## 1. Diagnóstico técnico

Los problemas observados tenían cuatro causas concretas:

1. **Altura mínima rígida en el visor.** `OpenMAICClassroomViewer` imponía `minHeight: 740px` y centraba verticalmente la tarjeta con `align-items: center`. En pantallas de 768 px de alto, el contenido superaba la ventana y el inicio de la clase quedaba por debajo del área visible.
2. **Panel lateral fijo.** `PlatziClassroomRightPanel` reservaba `380px` con `flex: 0 0 380px`. En tablets y móviles, el escenario quedaba comprimido o fuera de pantalla.
3. **Cabeceras sin wrap.** El header del aula, dashboard y administración usaba una fila rígida de 64 px. En 390–768 px los botones y migas de pan generaban desbordamiento horizontal.
4. **Rejillas y columnas con mínimos mayores al viewport.** Varios `minmax(320px, 1fr)` y columnas internas `flex: 1 1 320px` impedían encoger el contenido en pantallas de 320–420 px.

---

## 2. Buenas prácticas estudiadas y aplicadas

### 2.1. Diseño responsive por contenido

Se adoptaron breakpoints basados en el comportamiento real del contenido, no en nombres de dispositivos:

| Breakpoint | Comportamiento |
|---|---|
| `> 1100px` | Aula en dos columnas: escenario + panel de ruta. |
| `≤ 1100px` | Aula en una columna: primero la clase, después el panel. |
| `≤ 900px` | Header administrativo compacto y main con padding reducido. |
| `≤ 700px` | Cabeceras compactas, acciones secundarias con icono, subtítulos a ancho completo. |
| `≤ 420px` | Etiquetas de marca y acciones no esenciales ocultas; botones táctiles compactos. |

Referencias: guía de responsive design de web.dev y documentación de media queries de MDN.

### 2.2. Unidades de viewport dinámicas

Se sustituyó `100vh` por `100dvh` con fallback `100svh`, evitando el recorte provocado por las barras del navegador móvil. La referencia técnica es la unidad `dvh` de CSS.

### 2.3. Cero scroll horizontal

- `box-sizing: border-box` universal.
- `min-width: 0` en contenedores flex y grid.
- `flex-wrap: wrap` en cabeceras, barras de herramientas y barras de diálogo.
- `grid-template-columns` con `minmax(min(320px, 100%), 1fr)` en lugar de mínimos fijos.
- `overflow-x: hidden` global como última barrera, sin ocultar contenido funcional.

### 2.4. Contenido principal alineado al inicio

El escenario del aula ahora usa `align-items: flex-start` y la tarjeta tiene `margin-top: 0`. La clase comienza en la parte superior del área de scroll; nunca se recorta el inicio por centrado vertical.

### 2.5. Accesibilidad táctil

- Acciones principales con altura mínima de 36–44 px.
- Botones de icono con `aria-label` cuando la etiqueta se oculta visualmente.
- Foco visible con `:focus-visible` y contraste dorado.
- Respeto a `prefers-reduced-motion`.

Referencia: WCAG 2.2, criterio 2.5.8 Target Size (Minimum), 24 × 24 CSS px.

---

## 3. Cambios implementados

| Archivo | Cambio |
|---|---|
| `src/styles/responsive.css` | Nueva capa global responsive con breakpoints, dvh, min-width 0, foco y reduced motion. |
| `src/app/layout.tsx` | Importación de `responsive.css`. |
| `src/components/lms/PlatziCoursePlayerLayout.tsx` | Header con wrap, clases responsive, alturas flexibles, panel apilable y stage sin altura fija. |
| `src/components/openmaic/OpenMAICClassroomViewer.tsx` | Eliminación del `minHeight: 740px`, alineación superior del stage, topbar y media bar con wrap, subtítulos a ancho completo, eliminación del botón flotante que tapaba contenido. |
| `src/app/(student)/dashboard/page.tsx` | Header con wrap, grids con `min(…, 100%)`, contador dinámico de materias, padding móvil. |
| `src/components/admin/AdminDashboard.tsx` | Header administrativo responsive, grids flexibles, main con padding móvil. |
| `src/components/admin/WorkshopsAndGradesCatalog.tsx` | Grid de catálogo sin mínimo fijo. |

---

## 4. Verificación

Medición automatizada de `scrollWidth` contra `innerWidth` en el aula y el dashboard:

| Viewport | Aula | Dashboard |
|---|---|---|
| 320 × 568 | 320 / 320 | 320 / 320 |
| 390 × 844 | 390 / 390 | 390 / 390 |
| 768 × 1024 | 768 / 768 | 768 / 768 |
| 820 × 1180 | 820 / 820 | 820 / 820 |
| 1024 × 768 | 1024 / 1024 | 1024 / 1024 |
| 1180 × 820 | 1180 / 1180 | 1180 / 1180 |
| 1366 × 768 | 1366 / 1366 | 1366 / 1366 |
| 1440 × 900 | 1440 / 1440 | 1440 / 1440 |

En el panel administrativo se recorrieron las nueve pestañas a 390 px y 768 px: `body.scrollWidth` permaneció igual al ancho del viewport. Las únicas filas que exceden el ancho son las pestañas horizontales, que usan scroll interno intencional.

La tarjeta de clase se mantiene alineada al inicio: en 1366 × 768 comienza a 165 px (header + topbar + padding), sin centrado vertical ni recorte superior.

---

## 4.1. Visor de diapositivas con ajuste real

Se reemplazó el ajuste por `zoom` del contenedor por un **lienzo fijo escalado**, la técnica que usan los visores de presentaciones profesionales:

- **Escritorio/tablet horizontal:** lienzo de diseño `1040 × 520`.
- **Tablet vertical:** lienzo `840 × 1020`, con contenido apilado.
- **Móvil:** lienzo `420 × 920`, con escala por ancho y flujo vertical de página.
- La escala se calcula con `Math.min(anchoDisponible / anchoLienzo, altoDisponible / altoLienzo)` y se aplica con `transform: scale()` sobre un marco que reserva el espacio exacto.
- `ResizeObserver` recalcula al cambiar el tamaño del visor, colapsar el panel lateral o girar el dispositivo.
- El control de zoom permite `−`, `+` y **Ajustar**. El valor **100%** representa la diapositiva ajustada al visor; 110–150% amplía deliberadamente y habilita desplazamiento. A 100% no aparecen barras de scroll.
- El reparto horizontal usa `flex-grow: 4/6` con `flex-basis: 0` para que el `gap` no genere desbordamiento.
- En ventanas de poca altura (≤800 px), la barra de narración se compacta a dos líneas y se oculta el compañero, liberando espacio vertical para la diapositiva.

Referencias técnicas: el renderer oficial de OpenMAIC (`SlideCanvas` + `useViewportSize`) usa exactamente este patrón: un `viewportSize` fijo, un `fitScale` calculado por contenedor y un rectángulo centrado. Se replicó ese contrato con `ResizeObserver` y escalado CSS. Además se consultaron “Scaled/Proportional Content with CSS and JavaScript” (CSS-Tricks) y `aspect-ratio` (MDN).

La diapositiva completa —título, pasos, gráfico, explicación, pregunta y objetivos— queda dentro del visor sin recortes en escritorio y tablet. La explicación pasó a ser el bloque principal, con tipografía mayor y un botón **Leer completa** que abre el texto íntegro en un modal accesible.

## 5. Actualización visual y de activos

- **Tipografía:** se cargó Inter para la interfaz y se conectaron correctamente las variables de `next/font`. Antes, las familias declaradas podían caer a Georgia/system sans; ahora el aula, dashboard, login y admin usan una escala sans moderna con títulos `clamp()`.
- **Avatares:** se incorporaron las imágenes del escritorio del usuario:
  - Prof. Mateo → `public/brand/teachers/profesor-mateo.jpg`
  - Dra. Sofía → `public/brand/teachers/profesora-sofia.jpg`
  - Lucas → `public/brand/teachers/lucas-classmate.jpg`
  - Daniel → `public/brand/teachers/daniel-classmate.jpg`
  - Rectoría → `public/brand/teachers/profesor-mentor.jpg`
  - Avril → `public/brand/students/avril.jpg`
  - Gael → `public/brand/students/gael.jpg`
- **Perfiles reales:** el dashboard, el login y el directorio administrativo muestran las fotografías reales de Avril y Gael; los avatares de docentes se reflejan en el aula OpenMAIC y en la barra de diálogo.
- **Imágenes del visor:** la tarjeta se limitó a 880 px, el panel visual a 460 px y se añadió separación superior para que las etiquetas no queden debajo del badge. Los gráficos SVG conservan su proporción y se centran.
- **Zona del pulgar:** se añadió un dock inferior móvil con Clase, Ruta, Preguntar y Guía PDF, visible solo en pantallas ≤700 px.
- **Estados de interacción:** los botones incorporan `hover`, `active`, `disabled` y `cargando` con spinner y `aria-busy`; los campos tienen anillo de foco visible.
- **Tamaño táctil:** botones principales de 44 px y 48 px en punteros táctiles; controles de icono con área mínima.

## 6. Resultado

- Sin desbordamiento horizontal en aula, dashboard, login y admin.
- La clase inicia arriba y el contenido se desplaza dentro de su área.
- Tablets de 768, 820, 1024 y 1180 px reciben una composición de una o dos columnas según el espacio.
- Móviles de 320 y 390 px muestran la clase completa, con controles táctiles, dock inferior y sin superposiciones.
- Se conservaron rutas, estado, componentes y lógica funcional; los cambios son de presentación y disposición.
