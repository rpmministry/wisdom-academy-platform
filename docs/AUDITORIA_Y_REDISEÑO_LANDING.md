# INFORME DE AUDITORÍA, INVESTIGACIÓN Y REDISEÑO ESTRATÉGICO DE LA LANDING PAGE
## Wisdom Academy Platform

- **Fecha:** 27 de octubre de 2026
- **Rama de trabajo:** `feature/landing-strategic-redesign`
- **Ambiente de prueba y verificación:** Next.js 14.2 / TypeScript / Tailwind CSS + platform-ui.css / Playwright E2E
- **URL de referencia en producción:** [https://wisdom-academy-platform.vercel.app/](https://wisdom-academy-platform.vercel.app/)

---

## 1. Diagnóstico Inicial Detallado

### 1.1. Problemas identificados en la landing page original
1. **Ambigüedad y mensaje genérico en el Hero:**
   - El titular inicial *"Aprende. Crea. Lidera tu futuro"* y el subtítulo *"Plataforma integral con currículo estructurado y cursos especializados"* no transmitían de inmediato qué es la plataforma, a quién se dirige ni cuál es su oferta concreta.
   - Un visitante en los primeros 3 segundos no lograba discernir si se trataba de un software para colegios, una academia de programación o un blog de homeschooling.
2. **Invisibilidad de la Línea B (Cursos y Talleres) en primera carga:**
   - El estado inicial de la plataforma fijaba `portalActivo = 'school'`. Al cargar la página principal, el usuario únicamente visualizaba tarjetas de programas escolares y guías de homeschool.
   - Los talleres prácticos (`curso-python-ia-jovenes`, `taller-mayordomia-financiera`, `taller-liderazgo-cristiano`, `taller-musica-adoracion`, `taller-escuela-padres-homeschoolers`) se encontraban ocultos tras una pestaña secundaria sin prominencia comercial.
3. **Inversión de la jerarquía de información:**
   - La sección explicativa de las dos rutas de formación (`#academia`) estaba relegada a la línea 695 del código, situada por debajo del catálogo completo, la cotización de matrículas y el buscador. El visitante tenía que hacer scroll exhaustivo para entender qué opciones existían.
4. **Falla crítica de orden visual en dispositivos móviles (< 980px):**
   - En `src/styles/platform-ui.css`, la regla `@media (max-width: 980px)` asignaba `.wa-catalog-collage { order: -1; }`.
   - Esto provocaba que en pantallas de smartphones, una composición decorativa de imágenes de más de 300px de altura desplazara el titular principal y los botones de acción fuera de la primera pantalla (*above the fold*).
5. **Navegación superior desalineada de la propuesta de valor:**
   - El encabezado público (`PublicHeader.tsx`) dirigía a *"Programas"*, *"Metodología"*, *"Admisiones"* y *"Campus"*, omitiendo accesos directos explícitos a *Cursos y Talleres* y *Portal Escolar*.

### 1.2. Impacto en la comprensión y conversión
- **Tasa de rebote elevada:** Los usuarios interesados en formación continua y habilidades prácticas abandonaban el sitio asumiendo que era exclusivamente un portal escolar familiar.
- **Fricción cognitiva:** Familias buscando educación escolar formal no encontraban un itinerario claro de grados y acompañamiento, perdiéndose en un catálogo plano.

---

## 2. Investigación y Análisis Comparativo

### 2.1. Referentes internacionales analizados
- **Coursera ([https://www.coursera.org/](https://www.coursera.org/)):**
  - *Patrón adoptado:* Segmentación de intención dual en la cabecera del contenido. Diferencia nítidamente entre programas académicos conducentes a grado (*Degrees*) y certificados/cursos profesionales cortos (*Courses & Specializations*).
- **Platzi ([https://platzi.com/](https://platzi.com/)):**
  - *Patrón adoptado:* Agrupación temática por escuelas de conocimiento e itinerarios guiados. Transmite una oferta multidisciplinaria en constante evolución.
- **Crehana ([https://www.crehana.com/](https://www.crehana.com/)) y Domestika ([https://www.domestika.org/](https://www.domestika.org/)):**
  - *Patrón adoptado:* Vitrinas comerciales enriquecidas con metadatos clave en cada tarjeta: categoría, nivel, duración en semanas/horas, modalidad (online/asíncrono/mentoría en vivo) y llamado a la acción directo.
- **Udemy ([https://www.udemy.com/](https://www.udemy.com/)) y Hotmart ([https://hotmart.com/](https://hotmart.com/)):**
  - *Patrón adoptado:* Elementos de confianza inmediata, garantía de acceso y badges de estado ("Disponible", "Inscripciones Abiertas").

### 2.2. Estándares y principios aplicados
- **WCAG 2.2 AA ([https://www.w3.org/WAI/standards-guidelines/wcag/](https://www.w3.org/WAI/standards-guidelines/wcag/)):**
  - Contraste cromático >= 4.5:1 verificado en textos normales sobre fondos claros y oscuros.
  - Navegación por teclado completa (`:focus-visible`), atributos `aria-label`, estructura semántica estricta (`<header>`, `<main>`, `<section>`, `<h1>`-`<h3>`).
  - Áreas táctiles mínimas de 44x44px en controles móviles.
- **web.dev ([https://web.dev/](https://web.dev/)):**
  - Optimización de *Largest Contentful Paint* (LCP) al priorizar el texto y CTA del Hero sobre el collage decorativo en móviles.
- **Nielsen Norman Group ([https://www.nngroup.com/](https://www.nngroup.com/)):**
  - Regla de claridad en 3 segundos (*The 3-Second Rule*): comprensión inmediata del propósito del sitio.
  - Reducción del esfuerzo de decisión mediante arquitectura de elección guiada (*Choice Architecture*).

---

## 3. Decisiones de Diseño y Arquitectura de Información

### 3.1. Estructura secuencial de la Landing Page
1. **PublicHeader:** Barra de navegación con accesos rápidos: *Cursos y Talleres*, *Portal Escolar*, *Método*, *Preguntas* y botón de acceso al Campus.
2. **Hero Estratégico:**
   - Kicker: *"Plataforma Educativa Integral"*.
   - H1: *"Educación escolar organizada y cursos de alta especialización."*
   - Lead: Explicación transparente de las dos modalidades de formación.
   - Botones dobles de acción: *"Explorar Cursos y Talleres"* y *"Conocer Portal Escolar"*.
   - 4 Pilares de confianza: *Formación con Propósito*, *Acompañamiento Cercano*, *Flexibilidad Total* y *Tecnología Ética*.
3. **Gateway de Rutas Formativas (`#rutas-formativas`):**
   - Comparación lado a lado de **Portal Escolar** vs. **Cursos y Talleres**.
   - Identificación de destinatarios, beneficios estructurados y accesos directos.
4. **Vitrinas Destacadas de Cursos y Talleres (`#cursos-talleres`):**
   - Muestra comercial inmediata de talleres activos de programación/IA, finanzas, liderazgo y música.
   - Banner de expansión multidisciplinar: comunicación de apertura progresiva a nuevas áreas de conocimiento.
5. **Explorador Integral de Catálogo (`#portal-escolar` / `#programas`):**
   - Filtros por línea formativa, selector de grados EGB y programas escolares.
   - Mantiene intacta la compatibilidad con selectores de prueba existentes (`data-testid="catalog-card-..."`).
6. **Método Wisdom (`#metodo`):**
   - 4 fases pedagógicas: Fundamentación, Práctica Guiada, Aplicación Real y Evaluación Formativa.
7. **Cuerpo Docente y Mentoría:**
   - Presentación de profesores con experiencia académica y sinergia pedagógica.
8. **Métricas de Impacto y Confianza:**
   - Horas de formación, índice de satisfacción y proyectos completados.
9. **Preguntas Frecuentes Duales (`#preguntas`):**
   - 6 preguntas que resuelven dudas de familias escolares y de estudiantes de cursos libres.
10. **Llamado a la Acción Final y Pie de Página:**
    - Cierre de conversión y enlaces institucionales.

### 3.2. Criterios visuales y fidelidad de identidad
- Se respetó estrictamente la paleta existente:
  - Fondos de superficie: `--bg-surface`, `--bg-app`.
  - Colores de marca: `--wa-amber-600` (ámbar cálido para detalles y Cursos), `--wa-blue-600` / `--brand-primary` (azul institucional), `--brand-secondary` (esmeralda/menta para Portal Escolar).
  - Tipografías: `Bricolage Grotesque` (encabezados de exhibición), `Schibsted Grotesk` (cuerpo de lectura), `IBM Plex Mono` (metadatos e insignias).
- Sin dependencias externas adicionales; diseño 100% nativo CSS y componentes React modulares.

---

## 4. Textos y Mensajes Implementados

| Ubicación | Elemento | Texto Implementado | Propósito Estratégico |
| :--- | :--- | :--- | :--- |
| **Hero** | Kicker | `PLATAFORMA EDUCATIVA INTEGRAL` | Contextualiza inmediatamente que no es solo un blog o un software puntual. |
| **Hero** | Titular H1 | `Educación escolar organizada y cursos de alta especialización.` | Sintetiza en una sola frase las dos vertientes de formación de la plataforma. |
| **Hero** | Párrafo Lead | `Acompañamos a familias y estudiantes en su formación académica escolar, y ofrecemos talleres prácticos en tecnología, liderazgo, finanzas y artes para jóvenes y adultos.` | Define con total claridad los públicos, alcances y áreas temáticas sin generar expectativas irreales. |
| **Hero** | CTA 1 (Primario) | `Explorar Cursos y Talleres` | Dirige con scroll suave a la vitrina comercial destacada. |
| **Hero** | CTA 2 (Secundario)| `Conocer Portal Escolar` | Conduce al módulo de programas escolares y grados académicos. |
| **Hero** | Pilares | `Formación con Propósito` • `Acompañamiento Cercano` • `Flexibilidad Total` • `Tecnología Ética` | Refuerza los 4 valores institucionales verificados. |
| **Gateway** | Tarjeta Portal Escolar | `PORTAL ESCOLAR · FORMACIÓN ACADÉMICA CONTINUA` / `Educación escolar estructurada para cada etapa` | Comunica itinerario formal para familias y estudiantes de niveles escolares (EGB). |
| **Gateway** | Tarjeta Cursos y Talleres | `CURSOS Y TALLERES · APRENDIZAJE ABIERTO` / `Habilidades prácticas, creativas y profesionales` | Posiciona la formación continua para jóvenes y adultos en múltiples disciplinas. |
| **Vitrina Talleres**| Encabezado | `Cursos y Talleres para el Mundo Actual` | Resalta la relevancia práctica del catálogo abierto. |
| **Vitrina Talleres**| Banner Expansión | `Catálogo Multidisciplinario en Constante Expansión` / `Incorporamos periódicamente nuevas propuestas en diversas disciplinas.` | Proyecta el crecimiento continuo del catálogo más allá de los contenidos semilla iniciales. |

---

## 5. Relación de Archivos Modificados y Creados

1. `src/components/layout/PublicHeader.tsx`:
   - Enlaces de navegación actualizados a: `Cursos y Talleres` (`#cursos-talleres`), `Portal Escolar` (`#portal-escolar`), `Método` (`#metodo`), `Preguntas` (`#preguntas`).
2. `src/components/marketing/AcademySections.tsx`:
   - Creación de `PathwayGatewaySection`: sección comparativa de ambas rutas de formación.
   - Creación de `WorkshopsFeaturedSection`: vitrina comercial con metadatos y banner de expansión.
   - Refactorización de `AcademySections`: integración ordenada de método, docentes, métricas, FAQ y CTA.
3. `src/components/catalog/CatalogExperience.tsx`:
   - Rediseño completo del Hero con titular unificado, botones dobles de acción y pilares de confianza.
   - Integración secuencial de `PathwayGatewaySection` y `WorkshopsFeaturedSection` sobre el catálogo.
   - Anclaje de `#portal-escolar` y actualización de enlaces del footer.
   - Preservación íntegra de `data-testid` existentes (`catalog-card-programa-homeschool-4-egb`, etc.).
4. `src/styles/platform-ui.css`:
   - Eliminación de `order: -1;` en `.wa-catalog-collage` para corregir la visibilidad del Hero en smartphones.
   - Incorporación de reglas de diseño responsive para `.wa-hero-value-pillars`, `.wa-pathway-cards-grid`, `.wa-pathway-card`, `.wa-workshops-grid`, `.wa-workshop-card` y `.wa-workshops-expansion-banner` con soporte para modo oscuro.
5. `tests/e2e/landing-redesign.spec.ts`:
   - Suite completa de pruebas de extremo a extremo automatizadas en Playwright verificando las 7 resoluciones, navegación interactiva y modales.
6. `docs/evidencias/landing-*.png`:
   - 7 capturas de pantalla de alta fidelidad que acreditan el comportamiento visual en cada viewport.

---

## 6. Validación Responsive y Multidispositivo

Se realizaron pruebas visuales y de interacción automatizadas con Playwright en los 7 anchos de pantalla solicitados:

| Resolución | Dispositivo de Referencia | Comportamiento Verificado | Estado | Evidencia |
| :--- | :--- | :--- | :---: | :--- |
| **320px** | Móvil ultracompacto | Sin desbordamiento horizontal. Titular legible, botones apilados verticalmente con área táctil >= 44px. | **Aprobado** | `landing-320px-mobile-narrow.png` |
| **360px** | Android estándar | Hero visible sin scroll inicial. Tarjetas gateway y talleres en 1 columna limpia. | **Aprobado** | `landing-360px-mobile-standard.png` |
| **390px** | iPhone moderno | Espaciados fluidos, insignias legibles, menú hamburguesa accesible. | **Aprobado** | `landing-390px-mobile-iphone.png` |
| **768px** | iPad / Tablet vertical | Gateway en 2 columnas equilibradas. Vitrina de talleres en cuadrícula de 2 columnas. | **Aprobado** | `landing-768px-tablet-portrait.png` |
| **1024px** | Tablet horizontal / Portátil | Navegación de escritorio activa. Cuadrícula de 3 columnas para talleres. | **Aprobado** | `landing-1024px-tablet-landscape.png` |
| **1280px** | Escritorio estándar | Proporción áurea entre titular y collage decorativo. Márgenes laterales contenidos. | **Aprobado** | `landing-1280px-desktop-small.png` |
| **1440px** | Monitor grande / Widescreen | Ancho máximo controlado (`max-w-7xl`), sin distorsión de elementos ni tipografías desproporcionadas. | **Aprobado** | `landing-1440px-desktop-large.png` |

---

## 7. Pruebas Técnicas y Verificación

Todos los controles de calidad del proyecto fueron ejecutados en la rama `feature/landing-strategic-redesign`:

1. **Chequeo de tipos TypeScript (`npm run typecheck`):**
   - Resultado: `Exit code 0` (0 errores).
2. **Auditoría de linter y secretos (`npm run lint`):**
   - Resultado: `Exit code 0` (0 errores).
3. **Pruebas unitarias de cursos (`npm run test:courses`):**
   - Resultado: 49/49 pruebas aprobadas.
4. **Pruebas de recursos educativos (`npm run test:resources`):**
   - Resultado: 54/54 pruebas aprobadas.
5. **Pruebas de plataforma y componentes (`npm run test:platform`):**
   - Resultado: 87/87 pruebas aprobadas.
6. **Compilación de producción (`npm run build`):**
   - Resultado: Compilación exitosa de Next.js (`Generating static pages (26/26)`). Cero advertencias críticas.
7. **Pruebas E2E de Catálogo y Homeschool (`npx playwright test tests/e2e/catalog-homeschool.spec.ts`):**
   - Resultado: 4/4 pruebas aprobadas (100% retrocompatibilidad con flujos de compra y modales).
8. **Pruebas E2E de Rediseño de Landing (`npx playwright test tests/e2e/landing-redesign.spec.ts`):**
   - Resultado: 9/9 pruebas aprobadas en todos los viewports y flujos de navegación.

---

## 8. Incidencias Previas y Aspectos Fuera de Alcance

- **Discrepancia de Origin en pruebas preexistentes de autenticación:**
  - En la suite previa `tests/e2e/ui-regression.spec.ts` y `rbac-navigation.spec.ts`, existe una aserción estricta de Next.js contra peticiones POST al endpoint `/api/auth/login` cuando el cliente Playwright opera bajo `http://127.0.0.1:3000` en lugar de `http://localhost:3000`.
  - Esta condición de entorno de prueba pertenece a la configuración del servidor de desarrollo local y no afecta en absoluto a la landing page pública ni al despliegue en Vercel. Conforme a las instrucciones ("no ampliar el alcance a áreas no solicitadas"), se mantuvo intacta y aislada.

---

## 9. Entrega y Procedimiento de Despliegue

### 9.1. Rama de trabajo
- Todos los cambios se encuentran contenidos y versionados en:
  `feature/landing-strategic-redesign`

### 9.2. Pasos para fusionar y desplegar en Vercel
1. Revisar el estado y las diferencias del código:
   ```bash
   git status
   git diff main..feature/landing-strategic-redesign
   ```
2. Realizar el commit de la rama con los cambios verificados:
   ```bash
   git add src/ tests/ docs/
   git commit -m "feat(landing): strategic redesign with dual pathway gateway and workshops showcase"
   ```
3. Fusionar en la rama principal (`main`):
   ```bash
   git checkout main
   git merge feature/landing-strategic-redesign --no-ff -m "merge: strategic landing page redesign"
   ```
4. Publicar en GitHub para detonar el despliegue automático en Vercel:
   ```bash
   git push origin main
   ```
5. Comprobar el despliegue en el panel de Vercel y verificar que la URL de producción [https://wisdom-academy-platform.vercel.app/](https://wisdom-academy-platform.vercel.app/) muestre la nueva experiencia.

