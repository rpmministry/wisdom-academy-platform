# Identidad visual oficial · Paz en la mesa, Orden en el bolsillo y fuego en el corazón

**Taller de fin de año 2026 · MAIM Casa de Oración**
**Pastores Samuel y Gabby Palacio · Desarrollado por AlsizTech**

---

## 1. Concepto creativo

**«La Mesa Real»**: una mesa de casa, no un escenario. La identidad combina tres ideas en una sola composición:

1. **La mesa** — una línea horizontal estable, terrosa, que representa el lugar de la conversación, la cena y el acuerdo familiar.
2. **El hogar** — un arco de abrigo que envuelve la mesa como un techo protector; evoca la casa, la iglesia doméstica y el altar familiar.
3. **La llama** — un fuego dorado y sobrio que nace del centro de la mesa; representa la presencia de Dios, la primicia, el propósito y el fuego del altar.

La estética es **editorial, cálida y contemporánea**: papel de algodón, tipografía con autoridad, espacios generosos, fotografías naturales, cero artificios. Debe sentirse como un cuaderno de trabajo impreso que también vive en una plataforma digital.

### Principios de diseño

- **Calidez de hogar:** luz cálida, materiales naturales, madera, lino, cerámica, papel.
- **Sobriedad editorial:** jerarquía tipográfica clara, líneas finas, mucho aire.
- **Claridad financiera:** números legibles, tarjetas limpias, sin ruido visual.
- **Fervor espiritual:** el dorado y la llama aparecen como acentos, nunca como espectáculo.
- **Realismo pastoral:** familias reales, mesas reales, emociones contenidas. Nada de perfección fingida.

---

## 2. Paleta oficial

| Rol | Color | Hex | Uso |
|---|---|---|---|
| Primario · Terracota / Barro cálido | `--paz-terracotta` | `#B36A50` | Títulos de acento, botones primarios, líneas de mesa, enlaces activos |
| Primario profundo | `--paz-terracotta-deep` | `#8F4E38` | Hover, degradados, textos sobre fondos claros |
| Secundario · Oliva / Tierra profunda | `--paz-olive` | `#5C5847` | Estabilidad, orden, fondos de sección, texto de autoridad |
| Secundario suave | `--paz-olive-soft` | `#7A7256` | Metadatos, iconografía secundaria, bordes |
| Acento · Dorado / Trigo | `--paz-wheat` | `#C5A059` | Llama, primicia, cifras destacadas, detalles de lujo sobrio |
| Fondo · Crema editorial | `--paz-cream` | `#FAF8F5` | Fondo principal de la landing y del aula |
| Fondo · Papel algodón | `--paz-paper` | `#F2EDE4` | Tarjetas, bloques alternos, cuaderno |
| Texto principal | `--paz-charcoal` | `#2B2927` | Títulos y cuerpo principal |
| Texto secundario | `--paz-stone` | `#66615B` | Descripciones, metadatos, ayudas |
| Línea | `--paz-line` | `#E4DACB` | Bordes, separadores, retículas |

### Reglas de uso

- El **terracota** es acento, no fondo dominante. No usar como color de párrafos largos.
- El **dorado** se reserva para la llama, la primicia, la cifra de precio y los detalles de celebración. No usar en botones secundarios.
- El **oliva** sostiene las secciones de orden, finanzas y agenda.
- Los fondos crema y papel nunca se mezclan con blanco puro en la misma tarjeta.
- Contraste mínimo AA: texto carbón sobre crema (`#2B2927` sobre `#FAF8F5`) y texto blanco sobre terracota profundo (`#8F4E38`).

---

## 3. Tipografía

### Display / Títulos

**Lora** (preferida) o **Playfair Display** como alternativas editoriales.
Fallback local: `Georgia, 'Times New Roman', serif`.

- Títulos H1/H2, portadas de clase y cifras editoriales.
- Pesos: 500–700. Evitar 900.
- Tracking ligeramente negativo en titulares grandes (`-0.02em`).
- Interlineado 1.05–1.15 en titulares.

### Interfaz / Lectura

**Plus Jakarta Sans** (preferida) o **Inter**.
Fallback local: `'Schibsted Grotesk', 'Segoe UI', sans-serif`.

- Cuerpo, navegación, formularios, metadatos y tablas.
- Pesos: 400, 500, 600, 700.
- Interlineado 1.55–1.7 en párrafos.
- Tamaño mínimo de lectura: 16 px en móvil, 17–18 px en escritorio.

### Escala recomendada

| Token | Tamaño | Uso |
|---|---|---|
| `--paz-text-display` | `clamp(2.4rem, 5vw, 4.4rem)` | Hero |
| `--paz-text-h2` | `clamp(1.8rem, 3vw, 2.8rem)` | Secciones |
| `--paz-text-h3` | `clamp(1.25rem, 2vw, 1.6rem)` | Tarjetas y clases |
| `--paz-text-body` | `1.0625rem` | Párrafos |
| `--paz-text-small` | `0.8125rem` | Metadatos y etiquetas |

---

## 4. Logotipo

### Composición

El logotipo oficial se implementa como componente React/SVG escalable en:

`src/components/paz/PazEnLaMesaLogo.tsx`

**Isotipo (marca):**
- Arco de hogar de trazo terracota, abierto en la base.
- Línea de mesa horizontal en oliva.
- Llama dorada centrada, con una gota interior terracota.
- Retícula de 64 × 64, trazos de 2.25 px, terminaciones redondeadas.

**Logotipo horizontal:**
- Isotipo a la izquierda.
- Nombre oficial en tres líneas: *Paz en la mesa*, *Orden en el bolsillo* y *fuego en el corazón*.
- Bajada opcional: *MAIM Casa de Oración · Pastores Samuel y Gabby Palacio*.

### Variantes

| Variante | Uso |
|---|---|
| `full` | Portada, landing, cuaderno, presentaciones |
| `compact` | Encabezados, tarjetas, aula |
| `mark` | Favicon, avatar, sello, marca de agua |
| `monochrome` | Documentos impresos, sellos, una tinta |

### Área de protección y tamaño mínimo

- Área libre: altura de la llama a cada lado.
- Tamaño mínimo del logotipo horizontal: 180 px de ancho en digital, 45 mm en impresión.
- Tamaño mínimo del isotipo: 32 px.
- No deformar, no rotar, no aplicar sombras, no cambiar el orden de los elementos, no poner sobre fotografías sin velo.

---

## 5. Fotografía y dirección de arte

- **La Mesa Real:** mesa de madera, mantel de lino, vajilla sencilla, luz cálida lateral.
- **Los pastores:** plano medio conjunto, ropa en tonos tierra, mirada cálida, gesto de conversación. Evitar poses publicitarias.
- **Familias:** manos, mesa, cuaderno, Biblia abierta, tazas, luz de tarde. Rostros reales con consentimiento.
- **Cuaderno:** papel crema, tipografía editorial, espacios para escribir, textura de algodón.
- **Prohibido:** stock genérico de sonrisas perfectas, neón, degradados fríos, imágenes de dinero en efectivo como protagonista, menores sin autorización.

---

## 6. Copywriting oficial

**Título:** Paz en la mesa, Orden en el bolsillo y fuego en el corazón

**Subtítulo:** 4 clases para sanar tu mesa, ordenar tu economía, oír a Dios y encender tu hogar.

**Anfitriones:** Pastores Samuel y Gabby Palacio · MAIM Casa de Oración.

**Etiqueta de lanzamiento:** NUEVO TALLER DE FIN DE AÑO · ESTRENO 8 DE DICIEMBRE

**Promesa:** No es teoría lejana: son cuatro encuentros prácticos y bíblicos para llevar la paz de Dios a la mesa real de tu casa y entrar al 2027 con dirección.

**Llamados a la acción:**
- Únete a la comunidad oficial de WhatsApp
- Ver el temario completo
- Reservar mi lugar en preventa
- Beca un Hogar

### Tono de voz

- Pastoral, cercano, sin dramatismo.
- Claro con el dinero, sin tecnicismos.
- Bíblico, pero conversacional.
- Nunca culpabilizador; siempre esperanzador.
- Sin promesas de prosperidad automática ni presión artificial.

---

## 7. Componentes de interfaz

### Botones

- **Primario:** fondo terracota `#B36A50`, texto blanco, radio 12 px, altura mínima 44 px.
- **Secundario:** fondo transparente, borde oliva, texto oliva.
- **WhatsApp:** fondo oliva profundo `#5C5847` con icono; no usar el verde oficial de WhatsApp para no romper la paleta.
- **Beca un Hogar:** fondo dorado `#C5A059`, texto carbón.

### Tarjetas

- Fondo papel `#F2EDE4` sobre crema `#FAF8F5`.
- Borde 1 px `#E4DACB`.
- Radio 18 px.
- Sombra suave: `0 18px 40px rgba(43, 41, 39, 0.08)`.
- Sin sombras duras ni glassmorphism.

### Etiquetas

- Mayúsculas, `letter-spacing: 0.12em`, 11–12 px, peso 700.
- Fondo terracota suave o papel, texto terracota profundo u oliva.

### Contador regresivo

- Números en serif editorial, tamaño grande.
- Separadores en dorado.
- Fondo oliva profundo o papel, nunca negro puro.
- Texto accesible con `aria-live="polite"` y versión estática para lectores de pantalla.

---

## 8. Implementación en el código

- Tokens CSS: `src/styles/paz-en-la-mesa.css`, scope `.paz-world`.
- Logotipo: `src/components/paz/PazEnLaMesaLogo.tsx`.
- Contenido: `src/lib/paz-en-la-mesa/content.ts`.
- Fechas, precios y enlaces: `src/lib/paz-en-la-mesa/config.ts`.
- Datos bancarios y PayPhone: `src/lib/paz-en-la-mesa/server.ts`.
- Landing: `src/app/(public)/paz-en-la-mesa/page.tsx`.
- Banner y hero de portada: `src/components/paz/PazLaunchBanner.tsx` y `src/components/paz/PazHomeHero.tsx`.

### Variables CSS

```css
.paz-world {
  --paz-terracotta: #B36A50;
  --paz-terracotta-deep: #8F4E38;
  --paz-olive: #5C5847;
  --paz-olive-soft: #7A7256;
  --paz-wheat: #C5A059;
  --paz-cream: #FAF8F5;
  --paz-paper: #F2EDE4;
  --paz-charcoal: #2B2927;
  --paz-stone: #66615B;
  --paz-line: #E4DACB;
  --paz-serif: 'Lora', 'Playfair Display', Georgia, 'Times New Roman', serif;
  --paz-sans: 'Plus Jakarta Sans', 'Inter', 'Schibsted Grotesk', 'Segoe UI', sans-serif;
}
```

---

## 9. Accesibilidad

- Contraste AA en todo texto.
- Foco visible de 2 px terracota con offset de 2 px.
- El contador no es la única fuente de información: siempre acompañar con fecha en texto.
- Botones con texto, no solo iconos.
- Respetar `prefers-reduced-motion`.
- Formularios con etiquetas visibles y mensajes de error asociados.
- Imágenes decorativas con `alt=""`; retratos con descripción real.

---

## 10. Notas de producción y validaciones pendientes

Tomadas del Manual Integral actualizado al 16-11-2026. No deben publicarse como contenido definitivo hasta validación pastoral:

- Texto literal de la bendición sacerdotal completa (Sección 05).
- Preguntas reales de Q&A seleccionadas para cada clase.
- Desarrollo completo de «la regla de las 3 preguntas» para adolescentes.
- Ladrillos 1 al 6 de la balanza Espíritu y Verdad.
- Categorías 4 a 14 de los sueños y su interpretación.
- Método por edades y guía literal de la versión de 5 minutos del altar.
- Confirmación del enlace y nombre oficial de la comunidad de WhatsApp.
- Confirmación final de los datos de la cuenta bancaria de Fundación Casa Main.
- Enlace definitivo de PayPhone y su conciliación.

Estas notas viven en la plataforma como contenido de producción; la landing pública solo muestra los textos ya aprobados en los documentos entregados.
