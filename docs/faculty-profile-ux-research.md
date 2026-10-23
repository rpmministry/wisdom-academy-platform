# Presentación de profesores en plataformas educativas — investigación y decisiones

## 1. Qué funciona para generar confianza

La investigación de usabilidad y credibilidad en entornos educativos coincide en varios patrones:

1. **Rostro visible y consistente.** Una fotografía profesional del profesor reduce la sensación de anonimato y aumenta la percepción de presencia docente. Debe tener encuadre uniforme, fondo neutro y tamaño coherente entre perfiles.
2. **Credenciales concretas, no genéricas.** “Decano de Estudiantes por más de 25 años” comunica más que “experto en educación”. Las credenciales deben ser verificables y estar respaldadas por el material oficial.
3. **Biografía breve primero, detalle después.** El estudiante decide en segundos si le interesa el profesor. Un resumen de 2–3 líneas y un enlace/expansor “Ver trayectoria” evitan saturar la ficha.
4. **Relación explícita con las materias.** Mostrar qué materias imparte el profesor ayuda a construir el mapa mental del semestre y reduce la carga cognitiva.
5. **Consistencia visual.** Todas las tarjetas deben compartir tipografía, proporciones, radio, tratamiento de foto y jerarquía. La consistencia se percibe como rigor institucional.
6. **Transparencia sobre la fuente.** Indicar que la biografía y la foto provienen de la introducción del libro oficial refuerza la credibilidad y evita atribuciones inventadas.
7. **Divulgación progresiva.** El detalle de credenciales, formación y trayectoria debe estar disponible, pero no competir con la ruta de aprendizaje. Un `details`/acordeón es apropiado en escritorio y móvil.

Referencias de patrón:

- **Nielsen Norman Group — credibilidad y confianza:** la información de contacto, las personas reales y la evidencia concreta aumentan la confianza.
- **Coursera — instructor profile:** foto, nombre, cargo, biografía corta, cursos y credenciales en una ficha expandible.
- **edX — course staff:** tarjetas de profesores con afiliación y “leer más”.
- **Canvas LMS — course home:** tarjeta de instructor integrada en el curso, sin desplazar el contenido principal.

## 2. Decisión de diseño para Wisdom Academy

Se implementó un **Faculty Template dentro de una pestaña expandible** del aula:

- Nueva pestaña **Cuerpo docente** junto a Ruta semanal, Materias, Recursos, Evaluaciones y Mi progreso.
- Tarjetas con:
  - Fotografía extraída de la portada del libro oficial.
  - Nombre y cargo.
  - Biografía breve de 2–3 líneas.
  - Materias que imparte.
  - Acordeón “Ver trayectoria y credenciales” con biografía completa, credenciales, enfoque y fuente.
- En semestres sin material oficial se muestran nombres y materias, pero **no se inventan biografías**.
- La sección usa los mismos tokens, radios y tipografía del aula; no se siente como un bloque externo.

## 3. Por qué no un banner permanente

Un banner permanente de profesores en el lateral competiría con “Continuar”, el estado del semestre, el mapa de la carrera y las materias. La pestaña dedicada mantiene la ruta semanal limpia y permite que el estudiante profundice cuando lo necesita. En móvil, la pestaña evita un scroll lateral interminable.

## 4. Fotos y fuentes

Las imágenes se extrajeron de los PDF oficiales:

- `N2-MF-00.pdf` y `N5-SL-00.pdf` → Rev. Stacy Cline.
- `N4-FD-00.pdf` → Rev. Paul Johansson.
- `38-RYD-5 Sesiones.pdf` y `N3-VC-00.pdf` → Dr. S. Brick Cliff.

Se almacenaron en `public/images/faculty/`. Las biografías se basan en las introducciones de los libros y se citan en la ficha. No se añadieron títulos, instituciones ni experiencia no documentada.

## 5. Oportunidades futuras

- Añadir video de presentación de 30–60 segundos por profesor.
- Mostrar próximas sesiones en vivo del profesor dentro de su ficha.
- Incluir preguntas frecuentes o intereses de investigación.
- Permitir que el administrador edite la ficha docente desde el CRM.
- Añadir credenciales verificadas con enlace externo cuando la institución las entregue.
