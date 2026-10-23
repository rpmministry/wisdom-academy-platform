# Investigación de experiencia de aprendizaje y reutilización de código abierto

**Fecha:** 22 de octubre de 2026  
**Decisión de fondo:** implementación nativa, ligera y segura sobre el stack real (Next.js 15 + React 18 + SQLite). No se instalaron plataformas ni dependencias pesadas.

## 1. Criterios de evaluación

- Compatibilidad con Next.js/React y despliegue actual sin servicios nuevos obligatorios.
- Licencia compatible y mantenimiento verificable.
- Control real de claves, intentos y exposición de respuestas.
- Accesibilidad, rendimiento y coste operativo.
- Posibilidad de exportar/importar preguntas en el futuro (QTI) sin cerrar el modelo de datos.

## 2. Referencias revisadas

| Referencia | Qué aporta | Decisión |
| --- | --- | --- |
| **H5P** (`h5p.org`, `h5p.org/documentation`) | Actividades interactivas, libros y video interactivo. Ecosistema maduro. | No se integra en esta fase. Requiere runtime, bibliotecas por tipo de contenido y verificación de licencias específicas. El modelo de examen N2N exige que la clave nunca llegue al cliente; H5P estándar está orientado a feedback interactivo. |
| **H5P Interactive Video** (`github.com/h5p/h5p-interactive-video`) | Preguntas dentro del video. | Se toma la idea de «ideas esenciales + comprobación» para el diseño de clases, sin incorporar el runtime. |
| **H5P Question Set** (`github.com/h5p/h5p-question-set`) | Referencia de bancos y práctica. | No adoptado para exámenes; sí como referencia de UX de práctica. |
| **Moodle Quiz** (`docs.moodle.org`) | Tipos de pregunta, calificación, reintentos, informes. | No se instala Moodle como dependencia obligatoria. Se reutilizan conceptos: banco estable, versión de examen, intento, calificación, informe. La integración Moodle existente del proyecto no se modifica. |
| **QTI 3.0** (1EdTech) | Interoperabilidad de preguntas, pruebas y resultados. | El esquema `assessment_questions` guarda tipo, enunciado, opciones, clave, fuente y posición; es convertible a QTI en el futuro. No se implementa el estándar completo. |
| **OpenAssess** (`github.com/collinsherriff/openassess`) | Exploración de procesamiento/intercambio de preguntas. | Solo exploratorio. No se auditó actividad, licencia ni seguridad como para aprobarlo; no se usa código. |
| **Claudemy** (`github.com/assafkip/claudemy`) | Patrones de lecciones breves, tarjetas de ideas, práctica y fuentes. | Se adoptan ideas de estructura pedagógica (ficha de clase, objetivo, material, comprobación), no código ni plataforma. |
| **Google Drive API** (guías oficiales de carpetas y uploads) | Creación de carpetas, padres, permisos y carga. | Implementado con `googleapis`, búsqueda idempotente, verificación posterior y registro de IDs. |
| **YouTube Embed** (ayuda oficial) | Inserción, privacidad mejorada y significado de «no listado». | Implementado con `youtube-nocookie.com`; se documenta que «no listado» no es privado. No se descargan ni re-alojan videos. |

## 3. Por qué no se integró un LMS completo

- Añadir Moodle/H5P como dependencia obligatoria incrementa coste operativo, superficie de ataque y complejidad de despliegue.
- Los requisitos N2N de clave privada, ausencia de feedback por ítem y calificación exclusiva en servidor se cumplen mejor con un flujo nativo y pruebas específicas de fuga.
- La plataforma ya cuenta con identidad, permisos, derechos de acceso y auditoría; duplicarlos en otro sistema crearía dos fuentes de verdad.

## 4. Patrones de experiencia adoptados

- **Curso:** portada, ficha verificada, ruta por semestres, progreso, siguiente clase, materiales, repasos y evaluaciones.
- **Taller:** ficha breve con objetivo, duración, materiales, pasos y resultado; sin forzar semestres.
- **Clase:** video embebido, páginas del texto, materiales, navegación anterior/siguiente y finalización voluntaria.
- **Repaso:** documento de estudio con índice, síntesis, conceptos, preguntas de autoestudio, lista de comprobación y trazabilidad a fuentes; etiqueta visible de material de apoyo con IA.
- **Evaluación:** instrucciones sin pistas, intento con guardado local del borrador, envío confirmado, resultado agregado sin respuestas correctas e informe privado.

## 5. Resultado

La solución es nativa, sin dependencias nuevas, y deja abierta la puerta a QTI o H5P como mejoras futuras. La prioridad fue el flujo fiable: repaso → examen → calificación en servidor → informe privado, con pruebas de no filtración de claves.
