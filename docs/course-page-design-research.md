# Investigación de diseño — Aula de Teología (LMS/CRM)

**Objetivo:** transformar la ficha del programa en una experiencia de aprendizaje de nivel profesional, reutilizable en todos los semestres y programas de Wisdom Academy.

## 1. Referencias analizadas

| Plataforma | Patrón observado | Aplicación en Wisdom Academy |
| --- | --- | --- |
| **Canvas LMS** (Instructure) | Navegación de curso persistente, módulos semanales, tareas y progreso visibles; jerarquía clara entre curso, módulo y actividad. | Barra de pestañas sticky, ruta semanal, tarjetas de clase, estado del semestre y progreso por semana. |
| **Moodle LMS** | Bloques personalizables, seguimiento de finalización, actividades y recursos con estados; fuerte orientación a accesibilidad. | Sidebar con «Continuar», estado del semestre, mapa de la carrera, recursos descargables y estados `Bloqueado / En curso / Aprobado`. |
| **Coursera** | Ruta de aprendizaje con progreso, próximos pasos, tarjetas de programa, credenciales y navegación simple. | Hero editorial, anillo de progreso, CTA «Continuar», chips de credencial y tarjetas de materias. |
| **Linear** | Densidad informativa alta pero ordenada, listas agrupadas, etiquetas, estados, navegación por teclado y microinteracciones discretas. | Filas de clase compactas, tags de materia/sesión, filtros, chips de estado, tablas limpias y foco visible. |
| **Notion / CRMs modernos** | Jerarquía tipográfica, mucho aire, tarjetas modulares y secciones plegables. | Semanas plegables, tarjetas de recursos, panel lateral de resumen y consistencia visual entre pestañas. |

## 2. Decisiones de arquitectura de información

1. **Hero de programa:** identidad, institución, nivel, credencial, progreso y siguiente acción.
2. **Navegación por pestañas:** Ruta semanal · Materias · Recursos · Evaluaciones · Mi progreso.
3. **Ruta semanal:** 12 semanas del horario oficial, con el número exacto de clases por semana. Cada semana muestra materias, progreso, portada visual y clases.
4. **Materias:** tarjetas por materia con profesor, sesiones y progreso; tabla de la malla completa por semestre.
5. **Recursos:** textos, calendario y documentos con descarga controlada.
6. **Evaluaciones:** parciales, finales, reglas, historial e informes.
7. **Progreso:** mapa semanal, estadísticas, estado del semestre y certificado ministerial.
8. **Mapa de la carrera:** los 10 semestres con estado y materias planificadas; el formato se aplica igual a todos.
9. **Sidebar:** continuar, estado del semestre, mapa de semestres y materias.
10. **Semestres futuros:** conservan la misma interfaz; muestran materias oficiales y el estado «Contenido pendiente» cuando aún no hay clases cargadas.

## 3. Enriquecimiento visual

- **Portadas por clase:** miniatura real del video de YouTube (`i.ytimg.com/vi/<id>/hqdefault.jpg`), con fallback de portada diseñada por materia y color.
- **Portadas por semana:** mosaico de hasta tres miniaturas de las clases de la semana, con degradado y etiqueta de semana/materias.
- **Iconografía propia:** SVGs de 1.7 px de trazo para calendario, video, libro, archivo, candado, certificado, progreso y navegación.
- **Paleta:** verde Wisdom para acciones y progreso; marfil y grafito para superficies; acentos marrón/azul/ámbar por materia. El rojo institucional N2N se usa en la marca y en estados de bloqueo.
- **Tipografía:** Bricolage Grotesque para títulos y Schibsted Grotesk para interfaz, con IBM Plex Mono reservado para datos técnicos.
- **Tablas dinámicas:** malla curricular y resultados, con scroll horizontal accesible en móvil.
- **Microinteracciones:** elevación suave de tarjetas, apertura/cierre de semanas, filtros y transiciones; respeto a `prefers-reduced-motion`.

## 4. Usabilidad y accesibilidad

- Tema claro y oscuro: el workspace usa los tokens semánticos de la plataforma; la portada y las miniaturas conservan su color, mientras las superficies y el texto cambian con el tema.
- Navegación por teclado en pestañas, semanas, filtros y tarjetas.
- `aria-selected` en pestañas, `aria-expanded` en semanas, `aria-label` en acciones icónicas.
- Contraste alto en el hero (texto blanco sobre degradado verde profundo).
- Diseño mobile-first: una columna, rail de semanas oculto, filas de clase compactas y tabs desplazables.
- Estados vacíos honestos: «Contenido pendiente de carga», «Semestre bloqueado», «Certificado pendiente».
- Fechas no inventadas: se muestra «Fecha por confirmar» mientras el horario oficial no tenga fechas.

## 5. Escalabilidad

El componente `CourseProgramWorkspace` recibe la misma estructura `ProgramDetail` para cualquier curso o taller:

- Cursos con semanas: se agrupan por `lesson.metadata.week`.
- Cursos sin semanas: se agrupa todo el contenido en una sección.
- Talleres: usan los mismos módulos, clases, recursos y evaluaciones; el lenguaje se adapta desde los datos.
- Semestres futuros: muestran `module.subjects` y su estado hasta que se cargue el contenido.
- Nuevas materias: solo requieren `subjectCode`, `subject`, `week` y `sessionNumber` en los metadatos de la clase.

## 6. Archivos de implementación

- `src/components/courses/CourseProgramWorkspace.tsx` — interfaz interactiva.
- `src/styles/course-lms.css` — sistema visual del aula.
- `src/app/(student)/cursos/[slug]/page.tsx` — carga de datos y control de acceso.
- `src/server/domain/coursePrograms.ts` — semana, materia, sujetos planificados y progreso.
- `src/lib/courses/n2nSemester1.ts` — plan oficial de materias por semestre.
- `src/lib/courses/n2nReviews.ts` — repasos.

## 7. Resultado

La página deja de ser una lista larga y se convierte en un **workspace de aprendizaje**: el estudiante entiende dónde está, qué sigue, cuánto avanzó, qué materia está viendo y qué necesita para desbloquear el siguiente semestre. La misma anatomía se aplica a los diez semestres y a futuros cursos y talleres.
