# Wisdom Academy — Brand & Design Guidelines
## Identidad "Arctic Slate & Accents" · v5.0 · Octubre 2026

> Implementación técnica: [`../DESIGN.md`](../DESIGN.md) y
> `src/styles/tokens.css`. Los valores coinciden con el código.

---

## 1. Filosofía

Una interfaz académica clara, tecnológica y vibrante sobre una base **slate** de
alto contraste. Cuatro acentos con funciones inequívocas: azul para acción,
verde para selección, amarillo para atención y rojo para progreso/urgencia.
Se elimina el café/cobre. El contenido y la lectura mandan; el color señala.

Distribución: **70 % neutros slate · 20 % superficies · 10 % acentos**.

---

## 2. Paleta

### 2.1 Modo oscuro

| Token | HEX | Uso |
| :--- | :--- | :--- |
| `--bg-canvas` | `#111827` | Fondo y sidebars |
| `--bg-surface` | `#1F2937` | Tarjetas y lienzo |
| `--bg-elevated` | `#263244` | Modales/menús |
| `--bg-subtle` | `#172033` | Filas/campos |
| `--bg-muted` | `#334155` | Hover |
| `--text-primary` | `#F9FAFB` | Títulos |
| `--text-secondary` | `#9CA3AF` | Texto secundario |
| `--text-muted` | `#94A3B8` | Metadatos |
| `--border-subtle` | `#374151` | Divisores |
| `--border-default` | `#4B5563` | Controles |

### 2.2 Modo claro

| Token | HEX | Uso |
| :--- | :--- | :--- |
| `--bg-canvas` | `#F8FAFC` | Fondo y sidebars |
| `--bg-surface` | `#FFFFFF` | Tarjetas y lienzo |
| `--bg-elevated` | `#FFFFFF` | Modales/menús |
| `--bg-subtle` | `#F1F5F9` | Filas/campos |
| `--bg-muted` | `#E2E8F0` | Hover |
| `--text-primary` | `#0F172A` | Títulos |
| `--text-secondary` | `#475569` | Texto secundario |
| `--text-muted` | `#64748B` | Metadatos |
| `--border-subtle` | `#E2E8F0` | Divisores |
| `--border-default` | `#CBD5E1` | Controles |

### 2.3 Acentos

| Rol | Oscuro | Claro |
| :--- | :--- | :--- |
| Verde activo | `#34D399` | `#34D399` |
| Verde texto | `#4ADE80` | `#15803D` |
| Azul acción | `#3B82F6` | `#2563EB` |
| Azul hover | `#60A5FA` | `#1D4ED8` |
| Amarillo | `#FBBF24` | `#D97706` |
| Rojo | `#EF4444` | `#DC2626` |

- **Verde menta:** pestaña Ruta, Paso 1, lección activa, bordes activos, éxito.
  Relleno `#34D399` con texto `#052E22`; texto de apoyo `#15803D` / `#4ADE80`.
- **Azul:** Dashboard, Preguntar al Profesor IA, controles de diapositiva.
- **Amarillo:** Pendiente de revisión, etiquetas de atención, números.
- **Rojo:** progreso de lección/curso y urgencias.

El verde no se usa como fondo de página; el azul no se usa en todos los iconos;
el amarillo no es decorativo; el rojo no marca estados normales. Sin café/cobre.

---

## 3. Icono y logotipo

La W es la protagonista, **sin fondo ni contenedor de color**:

- W azul `#3B82F6` directamente sobre la barra; punto de luz amarillo `#FBBF24`.
- En fondos oscuros puede usarse W `#F9FAFB` + punto amarillo (versión on-dark).
- Favicon/PWA: W azul + punto amarillo, **fondo transparente**; SVG, ICO, PNG
  16/32/48/180/192/512 y maskable.
- Wordmark Poppins en trazos: `#0F172A` claro / `#F9FAFB` oscuro.
- Prohibido: tile, círculo, fondo dorado o verde, sombras, deformar la W o
  separar el punto.

El fondo nunca debe competir con el símbolo ni con el isotipo.

---

## 4. Tipografía

| Uso | Familia | Licencia |
| :--- | :--- | :--- |
| Display | Bricolage Grotesque | SIL OFL 1.1 |
| Cuerpo/UI | Schibsted Grotesk | SIL OFL 1.1 |
| Métricas/código | IBM Plex Mono | SIL OFL 1.1 |
| Logo | Poppins en trazos | SIL OFL |

Escala: 12 caption, 13 label, 14 body-sm, 16 body, 18 h4, 20–23 h3, 24–30 h2,
30–40 h1, 38–60 display. Interlineado 1.15/1.22/1.4/1.6/1.7; lectura 68ch.
Máximo dos familias visibles por pantalla. Fuentes autohospedadas en
`public/fonts/` con licencias en `public/fonts/licenses/`.

Procedencia: Platzi declara Roobert (comercial), Bricolage y Plus Jakarta.
Roobert se sustituye por Schibsted; Plus Jakarta se descarta por sobreutilizada.

---

## 5. Aplicación

### Portada
Base `#F8FAFC`; titular verde; CTA azul; panel slate; etiquetas azules/amarillas.
Icono W azul sin fondo.

### Acceso
Panel slate `#111827`; eyebrow amarillo; features verdes; CTA azul; formulario
blanco. La W azul/amarilla se integra sin tile.

### Dashboard
Banner slate; CTA azul; insignia de grado amarilla; "Clase activa" verde; "En
curso" y "Descanso" neutros; tarjetas blancas/slate.

### Aula
Base/paneles slate o slate-50; Ruta/Paso 1/lección activa verdes; Dashboard,
controles y "Preguntar" azules; pendientes y números amarillos; barra de progreso
roja; icono W azul/amarillo sin fondo.

### Administración
Pestañas activas verdes; acciones Principales azules; acciones administrativas
slate; alertas amarillas; errores rojos; progreso rojo.

### Documentos
Blanco, tinta slate, verde para énfasis y azul para estructura. Sin café/cobre.

---

## 6. Accesibilidad

- Texto normal ≥ 4.5:1; gráficos ≥ 3:1.
- Foco azul de 3 px con offset 2 px.
- Objetivos táctiles 44 × 44.
- Color nunca como único indicador.
- Sin scroll horizontal del body a 320 px.
- Movimiento reducido respetado.
- Etiquetas de formulario visibles.

Pares: `#F9FAFB`/`#111827` 16.9:1; `#9CA3AF`/`#111827` 6.99:1;
`#0F172A`/`#F8FAFC` 17.06:1; `#475569`/`#F8FAFC` 7.24:1;
blanco/`#2563EB` 5.17:1; `#052E22`/`#34D399` 7.69:1;
`#15803D`/`#F8FAFC` 5.02:1; `#FBBF24`/`#111827` 10.63:1;
`#DC2626`/blanco 4.83:1.

---

## 7. Referencias

- Platzi: <https://platzi.com/blog/sabes-cuales-son-los-colores-de-platzi/>
- Bear: <https://bear.app/>
- BrandColors: <https://brandcolors.net/>
- IBM Carbon 2x Grid: <https://www.carbondesignsystem.com/building-blocks/foundations/2x-grid/overview>
- Impeccable Style: <https://impeccable.style/>
- Sistema técnico: [`../DESIGN.md`](../DESIGN.md)
