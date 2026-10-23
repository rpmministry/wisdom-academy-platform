# Operación de Cursos y Talleres

## 1. Acceso

- Panel: **Administración → Cursos y Talleres** (`/admin`, pestaña «Cursos y Talleres»).
- Permiso requerido: `resources.manage` para administrar; `grades.manage` para informes y ajustes de nota.
- Los estudiantes acceden desde `/cursos` o desde **Mi Portal → Cursos y talleres**.

## 2. Crear un curso

1. En **Crear curso o taller**, elige **Curso**.
2. Escribe el título exacto respaldado por los materiales.
3. Completa institución, descripción, nivel, duración, objetivos y requisitos solo con datos verificados.
4. Indica semestres iniciales (0 a 20) o marca la **plantilla N2N de 10 semestres**.
5. Pulsa **Crear programa**.
6. Selecciona el programa en la lista.
7. Configura la portada y guarda la ficha.

La plantilla N2N crea diez módulos llamados «Semestre 01» a «Semestre 10», sin asignaturas ni contenidos inventados.

## 3. Crear un taller

1. Elige **Taller**.
2. Completa objetivo, duración, materiales, instrucciones y resultado esperado en la descripción/objetivos.
3. Crea módulos de tipo **Unidad / paso** para la secuencia práctica.
4. Añade las clases/actividades y sus materiales.
5. No se crean semestres automáticamente.

## 4. Estructura académica

- **Módulo:** semestre, módulo o unidad/paso.
- **Clase:** título, descripción, URLs de YouTube, páginas del texto, duración.
- **Material:** enlace externo, archivo de Drive, texto completo oficial o texto interno.
- **Repaso:** semana, título, módulo, contenido Markdown, fuentes y etiqueta IA.
- **Evaluación:** parcial, final o práctica; preguntas, ventana, intentos y auditoría.

Los botones **Editar** y **Eliminar** permiten corregir títulos, videos, páginas y duración. Eliminar un módulo elimina sus clases; eliminar una clase elimina su progreso.

## 5. Google Drive

- **Crear / verificar estructura:** crea o reutiliza la carpeta del programa y, si es N2N, los diez semestres con su estructura estándar. Es idempotente.
- **Vincular carpeta existente:** introduce el ID y la URL de una carpeta ya creada.
- La ficha guarda el ID y la URL; no se depende solo del nombre.
- No se conceden permisos públicos.

## 6. Publicar, despublicar y archivar

- **Publicar:** el recurso pasa a `published` y queda visible para estudiantes con derecho vigente.
- **Despublicar:** vuelve a `draft`; los estudiantes dejan de verlo.
- **Archivar:** queda fuera del catálogo y de la navegación.
- Para que un estudiante vea el programa debe tener un derecho de acceso vigente (`entitlements`) o acceso global.

## 7. Importar videos

Ver `docs/n2n-material-ingestion-guide.md`. Resumen:

1. Selecciona el manifiesto.
2. **Previsualizar** (no modifica nada).
3. Revisa errores y duplicados.
4. **Confirmar importación**.
5. Descarga el informe CSV desde **Importaciones recientes**.

## 8. Importar documentos

- Formatos: PDF, DOCX, TXT, MD (máximo 12 MB).
- El texto se extrae y se guarda como material.
- Si es un examen oficial con respuestas, marca **«Documento oficial de examen: privado»**.
- Si el PDF es escaneado, la plataforma avisa y no inventa texto.

## 9. Repasos

1. Crea el repaso con semana, título, módulo, contenido y fuentes.
2. Guárdalo como borrador o publícalo.
3. En la ficha del estudiante aparece con **Estudiar repaso** y **Descargar repaso**.
4. El HTML imprimible permite «Imprimir / Guardar PDF».

## 10. Evaluaciones

1. Crea la evaluación como borrador.
2. Pega las preguntas en JSON (ver plantilla en la propia pantalla) con `sourceRef`.
3. Revisa la auditoría mostrada en la lista.
4. Si la auditoría está aprobada, pulsa **Publicar**.
5. Si falta evidencia o el modelo generado está incompleto, la publicación se bloquea.
6. El estudiante responde en `/cursos/<slug>/evaluacion/<id>`; el servidor califica.
7. El resultado aparece en **Mi historial de resultados** y se descarga como informe.

## 11. Informes y Drive

- **Cargar informes:** muestra agregados y intentos.
- **Sincronizar informes pendientes a Drive:** copia los informes a la carpeta privada del estudiante, si `GOOGLE_DRIVE_STUDENT_REPORTS_FOLDER_ID` está configurado.
- Si falla, el estado queda `failed` y se puede reintentar sin duplicar.

## 13. Programa N2N cargado

- Programa: **Programa de Teología | Universidad Cristiana N2N**.
- Ruta: `/cursos/programa-de-teologia-n2n`.
- Semestre 1: 32 sesiones, 2 repasos y 5 exámenes oficiales (85 preguntas).
- Aprobación: todas las sesiones completadas y los 5 exámenes con 60% o más.
- El Semestre 2 se desbloquea automáticamente al aprobar el Semestre 1; los semestres 3-10 siguen bloqueados.
- Certificado ministerial del semestre disponible en la ficha cuando se cumple la condición.
- Recarga idempotente: `npm run import:n2n-semester-1` (no duplica clases ni evaluaciones).
- Documento de detalle: `docs/n2n-semester-1.md`.

**Importante:** el certificado es de formación ministerial. No es un título académico ni tiene aval académico. No debe presentarse como una titulación académica.

## 12. Verificación antes de comunicar disponibilidad

- [ ] Portada y ficha correctas.
- [ ] Semestres y clases en orden.
- [ ] Videos reproducen dentro de la plataforma.
- [ ] Materiales descargan solo con sesión y derecho.
- [ ] Repasos publicados en la semana correcta.
- [ ] Evaluaciones auditadas y publicadas.
- [ ] Prueba con una cuenta de estudiante real o de prueba.
- [ ] Prueba con una cuenta sin derecho: no debe ver el programa.
