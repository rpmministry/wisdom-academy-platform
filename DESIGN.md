# SISTEMA DE DISEÑO — WISDOM ACADEMY
## "Arctic Slate & Accents" v5.0 · Carbon 2x Grid · WCAG 2.2 AA

> Documento canónico. Los valores coinciden con `src/styles/tokens.css`,
> `src/styles/components.css` y los activos de `/public/brand`. Última revisión:
> 21 de octubre de 2026.

---

## 1. Objetivo

Rediseñar la interfaz con una paleta vibrante y equilibrada de **azul, verde,
rojo y amarillo** sobre fondos slate de alto contraste. Se elimina el café/cobre.
La base visual es una interfaz slate fría, con cuatro acentos funcionales:

- **Azul:** acciones principales, Dashboard, IA y controles de diapositiva.
- **Verde:** navegación/selección activa, paso activo y estado seleccionado.
- **Amarillo:** advertencias, revisiones pendientes e indicadores numéricos.
- **Rojo:** progreso de lección/curso y urgencias.

Sin cambios en lógica de negocio, rutas, APIs, permisos, contenido curricular ni
flujos académicos.

### Diagnóstico y decisiones

| Hallazgo | Corrección |
| :--- | :--- |
| Verde usado como superficie, etiqueta y acento universal | Base slate; verde reservado a selección/estado activo |
| Paleta cálida de papel/grafito con cobre | Sustituida por slate frío y los cuatro acentos indicados |
| Icono con tile de fondo | W pura y transparente sobre la barra + punto amarillo |
| Progreso verde | Rojo `#DC2626` / `#EF4444` |
| Dashboard y controles neutros | Azul `#2563EB` / `#3B82F6` |
| Pendientes sin distinción | Amarillo `#D97706` / `#FBBF24` |
| Foco poco visible | Anillo azul de 3 px |
| Pestañas admin cortadas | Varias filas + scroll fino en móvil |
| Diapositiva comprimida por paneles | Recursos cerrados < 1600 px; riel de 56 px |

---

## 2. Paleta

### 2.1 Modo oscuro — Deep Ocean & Slate

| Token | HEX | Uso |
| :--- | :--- | :--- |
| `--bg-canvas` | `#111827` | Fondo general y sidebars |
| `--bg-surface` | `#1F2937` | Tarjetas y lienzo |
| `--bg-elevated` | `#263244` | Menús/modales |
| `--bg-subtle` | `#172033` | Filas y campos |
| `--bg-muted` | `#334155` | Hover |
| `--text-primary` | `#F9FAFB` | Títulos |
| `--text-secondary` | `#9CA3AF` | Texto secundario |
| `--text-muted` | `#94A3B8` | Metadatos |
| `--border-subtle` | `#374151` | Divisores |
| `--border-default` | `#4B5563` | Controles |
| `--border-strong` | `#6B7280` | Énfasis |

### 2.2 Modo claro — Arctic Light

| Token | HEX | Uso |
| :--- | :--- | :--- |
| `--bg-canvas` | `#F8FAFC` | Fondo general y sidebars |
| `--bg-surface` | `#FFFFFF` | Tarjetas y lienzo |
| `--bg-elevated` | `#FFFFFF` | Menús/modales |
| `--bg-subtle` | `#F1F5F9` | Filas y campos |
| `--bg-muted` | `#E2E8F0` | Hover |
| `--text-primary` | `#0F172A` | Títulos |
| `--text-secondary` | `#475569` | Texto secundario |
| `--text-muted` | `#64748B` | Metadatos |
| `--border-subtle` | `#E2E8F0` | Divisores |
| `--border-default` | `#CBD5E1` | Controles |
| `--border-strong` | `#94A3B8` | Énfasis |

### 2.3 Acentos

| Rol | Oscuro | Claro | Uso |
| :--- | :--- | :--- | :--- |
| Verde activo | `#34D399` | `#34D399` | Pestaña Ruta, Paso 1, lección activa, bordes activos |
| Verde texto | `#4ADE80` | `#15803D` | Títulos/enlaces activos |
| Azul acción | `#3B82F6` | `#2563EB` | Dashboard, Preguntar IA, controles de diapositiva |
| Azul hover | `#60A5FA` | `#1D4ED8` | Hover de acciones |
| Amarillo | `#FBBF24` | `#D97706` | Pendiente, etiquetas de atención, números |
| Amarillo suave | rgba(251,191,36,.12) | `#FEF3C7` | Fondo de pendientes |
| Rojo progreso | `#EF4444` | `#DC2626` | Barra de progreso y urgencias |
| Rojo suave | rgba(239,68,68,.12) | `#FEF2F2` | Fondo de error |

### 2.4 Estado

| Estado | Oscuro | Claro |
| :--- | :--- | :--- |
| Éxito | `#4ADE80` | `#15803D` |
| Información | `#60A5FA` | `#2563EB` |
| Advertencia | `#FBBF24` | `#92400E` sobre `#FEF3C7` |
| Error | `#EF4444` | `#DC2626` |

### 2.5 Reglas de uso

- **70 % neutros slate**, **20 % superficies/paneles**, **10 % acentos**.
- El verde no se usa como fondo de páginas ni de bloques largos.
- El verde de selección se suavizó a **menta `#34D399`** con texto `#052E22`,
  en lugar de esmeraldas oscuras. Es la tendencia actual en productos como Wise,
  Spotify o Linear: un verde luminoso pero de bajo peso, con tipografía oscura.
- El azul es el color de acción principal; no todos los iconos son azules.
- El amarillo se reserva a pendientes, etiquetas de atención y números.
- El rojo se reserva a progreso y urgencia; no es decorativo.
- Se elimina por completo el café/cobre de la interfaz y de los activos.
- No se usan blanco/negro puros como fondo (se usa `#F8FAFC` y `#111827`).

---

## 3. Icono y logotipo

- **Logo de barra:** W original, **sin tile ni fondo de énfasis**, en azul
  `#3B82F6`; punto de luz amarillo `#FBBF24` en la parte superior.
- **Favicon/PWA:** W azul + punto amarillo, **fondo transparente** en SVG, ICO y
  PNG 16/32/48/180/192/512/maskable.
- **Wordmark:** Poppins convertido a trazos; tinta `#0F172A` en claro y
  `#F9FAFB` en oscuro.
- **Versiones:** color (azul/amarillo), on-dark (W blanca/amarillo), black y
  white monocromáticas.
- **Prohibido:** contenedores de color detrás del símbolo, deformar la W,
  separar el punto, sombras o brillos.

---

## 4. Tipografía

| Uso | Familia | Licencia |
| :--- | :--- | :--- |
| Display | **Bricolage Grotesque** | SIL OFL 1.1 |
| Cuerpo/UI | **Schibsted Grotesk** | SIL OFL 1.1 |
| Métricas/código | **IBM Plex Mono** | SIL OFL 1.1 |
| Logotipo | Poppins (trazos) | SIL OFL |

Escala: caption 12 px; label 13; body-sm 14; body 16; h4 18; h3 20–23;
h2 24–30; h1 30–40; display 38–60. Interlineado 1.15/1.22/1.4/1.6/1.7;
lectura 68ch. Máximo dos familias por pantalla. Archivos en `public/fonts/`,
licencias en `public/fonts/licenses/`.

**Procedencia:** la UI de Platzi declara Roobert (comercial), Bricolage
Grotesque y Plus Jakarta Sans. Roobert se sustituye por Schibsted Grotesk;
Plus Jakarta se descarta por sobreutilizada. Bricolage e IBM Plex Mono son OFL.

---

## 5. Cuadrícula y responsive

Escala 4/8 px. Contenedores: marketing 1200; app 1440; lectura 768; Carbon
1584. Breakpoints de prueba: 320, 390, 672, 768, 1024, 1056, 1280, 1312, 1440,
1584.

| Rango | Comportamiento |
| :--- | :--- |
| ≤ 480 | Una columna; CTAs completos; dock móvil |
| 672–900 | Dashboard apilado; currículo 2 columnas |
| 901–1055 | Paneles del aula superpuestos |
| 1056–1279 | Pestañas admin en varias filas |
| ≥ 1280 | Aula de tres zonas |
| ≥ 1600 | Recursos abiertos por defecto |

Gutters Carbon: 32/16/1 px. Sin scroll horizontal del body a 320 px.

---

## 6. Componentes

### Botones

| Variante | Claro | Oscuro | Uso |
| :--- | :--- | :--- | :--- |
| `primary-gold` | Azul `#2563EB` + blanco | Azul `#3B82F6` + `#0B1220` | Acción principal |
| `primary-navy` | Slate `#0F172A` + blanco | `#E2E8F0` + `#0F172A` | Acción administrativa neutra |
| `emerald` | Menta `#34D399` + `#052E22` | Menta `#34D399` + `#052E22` | Confirmación |
| `secondary` | Superficie + borde | Superficie + borde | Apoyo |
| `ghost` | Transparente | Transparente | Terciaria |

Altura mínima 44 px; radio 8; hover/active/focus; disabled 62 % sin sombra;
loading con opacidad completa y `aria-busy`.

### Badges

- Azul = información/acción.
- Verde = estado activo/éxito.
- Amarillo = pendiente/advertencia.
- Rojo = progreso/error/urgencia.
- Gris = neutral.

Tamaño mínimo 12 px. No usar rojo para estados "en curso".

### Pestañas, pasos y selección

Activo: relleno menta `#34D399` con texto `#052E22`; tarjetas activas con borde
verde y fondo verde suave
(`#ECFDF5` / rgba(16,185,129,.12)). En escritorio, filas; en móvil, scroll fino.

### Progreso

`ProgressBar` usa rojo `#DC2626` / `#EF4444` para el progreso de lección/curso.
El track es `--bg-subtle`; la etiqueta porcentual también es roja.

### Formularios, tablas, tarjetas

Altura 44; radio 8; borde 1 px; foco azul; tarjetas radio 12, borde 1 px,
sombra sutil; tablas con encabezado 12 px y hover. Sin tarjetas anidadas.

### Movimiento

Solo `transform`/`opacity`; 150/240/320 ms; `prefers-reduced-motion` desactiva
animaciones y scroll suave.

---

## 7. Accesibilidad

- Texto normal ≥ 4.5:1; gráficos ≥ 3:1.
- Foco visible de 3 px (azul) con offset de 2 px; `!important` para neutralizar
  `outline:none` históricos.
- Objetivos táctiles 44 × 44.
- Color nunca como único indicador.
- Formularios con `label`, `aria-invalid`, `role="alert"`.
- Modales con `role="dialog"`, `aria-modal`, Escape y foco inicial.
- Etiquetas de formulario visibles; sin texto necesario < 12 px.

Pares: `#F9FAFB`/`#111827` 16.9:1; `#9CA3AF`/`#111827` 6.99:1;
`#94A3B8`/`#111827` 6.5:1; `#0F172A`/`#F8FAFC` 17.06:1;
`#475569`/`#F8FAFC` 7.24:1; blanco/`#2563EB` 5.17:1;
`#0B1220`/`#3B82F6` 5.09:1; `#052E22`/`#34D399` 7.69:1;
`#15803D`/`#F8FAFC` 5.02:1; `#4ADE80`/`#111827` 10.18:1;
`#FBBF24`/`#111827` 10.63:1; `#DC2626`/`#FFFFFF` 4.83:1.

---

## 8. Archivos y verificación

- Tokens: `src/styles/tokens.css`.
- Componentes: `src/styles/components.css`.
- Portada/acceso: `src/styles/marketing.css`.
- Aula/recursos: `src/styles/educational-resources.css`, `responsive.css`.
- Icono: `public/brand/svg/*`, `public/favicon.svg`, `public/favicon/*`,
  `public/icon-*.png`, `public/apple-touch-icon.png`, `public/site.webmanifest`.
- Documentación: `DESIGN.md`, `wisdom-academy-brand/BRAND-GUIDE.md`,
  `public/brand/BRAND-GUIDE.md`, `PRODUCT.md`.

| Comprobación | Resultado |
| :--- | :--- |
| `npm run typecheck` | Aprobado |
| `npm run build` | Aprobado, 21 rutas |
| Impeccable (`src`) | 0 hallazgos |
| Design Gate 2 | 1 excepción intencional: `#FFFFFF` en tarjetas claras, exigido por la especificación v5.0 |
| Responsive 320–1440 | 30 comprobaciones sin overflow ni errores |
| Temas | Claro/oscuro verificado |
| Favicon/manifest | Rutas 200; SVG/ICO/PNG generados |

### Límites

- No se ejecutó lector de pantalla.
- PDFs no revisados página por página.
- Las portadas sociales históricas de Facebook/YouTube no se regeneraron; el OG
  principal sí usa la nueva identidad azul.
