# Exámenes, calificación y seguridad — N2N

## 1. Modelo de examen

**Semestre 1 cargado:** cinco exámenes oficiales N2N con 85 preguntas y sus claves privadas. Se conservó la estructura oficial de cada examen (15, 20, 10, 20 y 20 preguntas). La nota mínima es **60%**, según la Guía del Facilitador N2N. Se permiten dos intentos en la plataforma; la política oficial de promedio de intentos debe aplicarla el facilitador.

Cuando no exista un examen oficial utilizable, el sistema crea un examen **generado** con:

- 15 preguntas: 5 de verdadero/falso y 10 de selección múltiple.
- Una sola respuesta correcta por pregunta.
- Preguntas basadas solo en clases, texto y recursos del periodo evaluado.
- Cada pregunta con `sourceRef` (archivo, página o clase) que sustenta la clave.
- Estado de revisión por pregunta.

Si existe un examen oficial, se conserva su estructura y número de preguntas; el modelo de 15 solo aplica a exámenes nuevos generados.

## 2. Auditoría antes de publicar

La auditoría (`auditAssessment`) comprueba:

- Número y tipos de preguntas.
- Enunciados duplicados.
- Que cada selección múltiple tenga una sola clave válida.
- Que cada clave tenga evidencia documentada.
- Que no haya preguntas marcadas para revisión.
- Que un examen generado cumpla 15 = 5 V/F + 10 selección múltiple.
- Que la ventana de apertura/cierre sea coherente.

Si falla, el examen pasa a estado `review` y **no puede publicarse**. La UI muestra las incidencias.

## 3. Clave privada

- `assessment_questions.correct_key` nunca se serializa en rutas de estudiante.
- Las rutas administrativas que devuelven claves exigen `resources.manage`.
- El cliente envía únicamente `questionId` y `optionId`.
- La calificación se calcula en el servidor.
- No se muestran respuestas correctas, explicaciones, feedback por ítem ni indicadores correcto/incorrecto, ni siquiera después del envío.
- No se registran claves en logs ordinarios.

## 4. Intentos y calificación

- Intentos configurables (1 a 10). Valor inicial conservador: 1.
- Cronómetro opcional. Si no hay norma documentada, se deja sin cronómetro obligatorio.
- Apertura/cierre opcionales; el servidor rechaza intentos fuera de ventana.
- Un intento en progreso se reutiliza para evitar duplicados por doble clic.
- El envío es idempotente: reenviar el mismo intento devuelve el resultado ya calculado.
- Fórmula: `aciertos / total × 100`, con dos decimales. Se guardan aciertos y total como datos primarios.
- No se declara aprobado/reprobado sin una regla oficial; la referencia de porcentaje es configurable y se muestra como referencia, no como aprobación.

## 5. Informes

Cada intento calificado genera un registro en `course_grade_reports` y un informe imprimible con:

- Programa, institución y semestre/módulo.
- Evaluación, tipo, intento y fechas.
- Calificación porcentual, aciertos y escala.
- Estado del registro.

No incluye claves, respuestas correctas, explicaciones ni detalle por pregunta.

El estudiante lo descarga desde la ficha del programa. El personal académico autorizado puede consultar agregados y sincronizar copias a Drive.

## 6. Copia en Google Drive

- Requiere `GOOGLE_DRIVE_STUDENT_REPORTS_FOLDER_ID`.
- Ruta: `Estudiantes/<id-interno>/Wisdom Academy/<id-programa>/<semestre>/Resultados de evaluaciones/`.
- No se usan nombres personales en la ruta.
- Si falla, la calificación permanece en la base de datos y el estado queda `failed`; se puede reintentar sin duplicar el informe.
- No se inventan URLs de Drive.

## 7. Documentos oficiales con respuestas

1. Si existe examen oficial con preguntas y respuestas, se conserva intacto.
2. Se importa como documento con la opción **«Documento oficial de examen: privado»**, que lo registra como material `staff` y no lo muestra a estudiantes.
3. Si `GOOGLE_DRIVE_PRIVATE_ADMIN_FOLDER_ID` está configurado, el original se sube a `Examenes oficiales/<program-id>/`, fuera del árbol del curso.
4. Si no se puede garantizar la privacidad de la carpeta, no se mueve ni duplica el archivo: se informa el bloqueo.
5. La versión de estudiante se crea por separado, sin la clave.

## 8. Pruebas de seguridad implementadas

- `tests/courses/assessments.test.ts` verifica que el payload del estudiante no contiene `correct_key`/`correctKey`/`sourceRef`.
- Verifica calificación 15/15, porcentaje 100, persistencia e idempotencia del envío.
- Verifica que no se duplican intentos ni informes.
- Verifica que un estudiante no puede consultar ni enviar el intento de otro.
- Verifica que un examen sin evidencia no se publica.
- Verifica que un examen oficial con otra estructura se conserva.

## 9. Limitaciones

- No hay OCR integrado; un PDF escaneado debe procesarse externamente.
- El cronómetro se muestra al estudiante y la ventana se valida en servidor; no se bloquea el navegador ni se añade proctoring.
- La revisión detallada de respuestas requiere una ruta administrativa protegida; no se expone al estudiante.
- La copia a Drive depende de permisos y cuota de la cuenta de servicio.
