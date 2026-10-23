# Guía de carga de materiales oficiales N2N

Esta guía está escrita para una persona administradora, sin necesidad de conocimientos técnicos. El objetivo es cargar el PDF completo, el calendario, los videos y los exámenes del programa teológico de la Universidad Cristiana N2N sin inventar contenido.

> **Estado actual:** el Semestre 1 está cargado y publicado: 32 sesiones, 2 repasos y 5 evaluaciones oficiales. La portada y el logotipo de N2N ya están configurados. Los semestres 2-10 tienen estructura y carpeta de Drive, pero su contenido está pendiente de entrega. El material del Semestre 1 se conserva en `00_GESTION_E_INDICE_DE_MATERIALES/01_DOCUMENTOS_ORIGINALES/`.

## 1. Antes de empezar

Ten a mano:

- El PDF completo del programa o texto oficial.
- El calendario de cada semestre.
- El manifiesto de enlaces de YouTube (puedes usar la plantilla `docs/templates/manifest-videos-n2n.md`).
- Los exámenes oficiales, solucionarios y claves, si existen.
- Logotipos e imágenes de N2N **solo si** cuentas con autorización de uso.

No envíes contraseñas, tokens ni claves por correo. La cuenta de servicio de Google Drive ya está configurada en el servidor.

## 2. Dónde va cada archivo en Google Drive

Abre la carpeta del programa desde el panel administrativo, pestaña **Cursos y Talleres → Google Drive → Crear / verificar estructura**. También puedes abrir directamente:

`Cursos/Curso teológico — Universidad Cristiana N2N`

| Archivo | Carpeta de destino |
| --- | --- |
| PDF completo del programa | `01_SEMESTRE_XX/01_TEXTO_COMPLETO_Y_LECTURAS/` |
| Programa y calendario del semestre | `01_SEMESTRE_XX/00_PROGRAMA_Y_CALENDARIO/` |
| Materiales de cada clase | `01_SEMESTRE_XX/02_MATERIALES_POR_CLASE/` |
| Lecturas y recursos complementarios | `01_SEMESTRE_XX/03_RECURSOS_COMPLEMENTARIOS/` |
| Actividades y evaluaciones de proceso | `01_SEMESTRE_XX/04_ACTIVIDADES_Y_EVALUACIONES/` |
| Repasos semanales | `01_SEMESTRE_XX/05_REPASOS_SEMANALES/` |
| Exámenes oficiales originales | `01_SEMESTRE_XX/06_PARCIALES_Y_FINALES/00_DOCUMENTOS_OFICIALES_ORIGINALES/` |
| Parcial: versión estudiante | `.../01_EXAMEN_PARCIAL/01_VERSION_ESTUDIANTE/` |
| Parcial: clave privada | `.../01_EXAMEN_PARCIAL/02_CLAVE_PRIVADA_DOCENTE/` |
| Parcial: versiones y auditoría | `.../01_EXAMEN_PARCIAL/03_VERSIONES_Y_AUDITORIA/` |
| Final: mismas tres subcarpetas | `.../02_EXAMEN_FINAL/…` |
| Estadísticas agregadas sin datos personales | `.../03_INFORMES_AGREGADOS_SIN_DATOS_IDENTIFICABLES/` |
| Manifiesto de videos | `00_GESTION_E_INDICE_DE_MATERIALES/03_INDICE_DE_ENLACES_YOUTUBE/` |
| Documentos originales generales | `00_GESTION_E_INDICE_DE_MATERIALES/01_DOCUMENTOS_ORIGINALES/` |
| Calendario y programa general | `00_GESTION_E_INDICE_DE_MATERIALES/02_CALENDARIO_Y_PROGRAMA/` |
| Informes de importación | `00_GESTION_E_INDICE_DE_MATERIALES/04_INFORMES_DE_IMPORTACION/` |

**Nunca** subas claves de respuestas a una carpeta que puedan ver los estudiantes. Si la carpeta del curso se comparte con estudiantes, guarda los originales con respuestas en una ubicación privada de administración y registra su enlace en la ficha del examen.

## 3. Cargar el manifiesto de videos

### Opción A: formulario de la plataforma (recomendado)

1. Entra a **Administración → Cursos y Talleres**.
2. Selecciona el programa N2N.
3. Baja a **Importar manifiesto de videos**.
4. Pulsa **Seleccionar archivo** y elige el `.md`, `.csv`, `.json` o `.txt`.
5. Pulsa **Previsualizar**.
6. Revisa la tabla: semestre, clase, título, acción (crear/actualizar/error), cantidad de videos y detalle.
7. Corrige el archivo si hay errores y vuelve a previsualizar.
8. Pulsa **Confirmar importación**.

La confirmación es explícita. Las filas con error se omiten y se informan; no se pierde el resto. Reimportar el mismo archivo actualiza las clases existentes en lugar de duplicarlas.

### Opción B: dejar el archivo en Drive

Guarda el manifiesto en `03_INDICE_DE_ENLACES_YOUTUBE/`. Después usa el formulario de importación seleccionando una copia local del mismo archivo. Guardar solo en Drive no importa las clases por sí mismo.

### Cómo saber si funcionó

- La previsualización debe mostrar `0` errores y las clases esperadas.
- Al confirmar verás: creadas, actualizadas y omitidas.
- En **Módulos y clases** aparecen las clases con su cantidad de videos.
- En **Importaciones recientes** puedes descargar el informe CSV.
- En la vista previa del estudiante, cada clase muestra su video y páginas.

## 4. Cargar un PDF, DOCX o TXT

1. En la ficha del programa, busca **Importar documento**.
2. Selecciona el archivo (máximo 12 MB).
3. Si es un **examen oficial con respuestas**, marca **«Documento oficial de examen: privado, no visible para estudiantes»**.
4. Pulsa **Procesar documento**.
5. Revisa el resultado: confianza de extracción, páginas, advertencias y si el original se subió a Drive.

La plataforma guarda el texto extraído como material. Si Drive está disponible, también sube el original. Si el PDF está escaneado y no se puede leer, se muestra un aviso: aplica OCR antes de importarlo y no se inventa texto.

## 5. Configurar la portada (carátula)

1. Entra a **Administración → Cursos y Talleres → ficha del programa**.
2. En **URL de portada** escribe la ruta o URL de la imagen.
3. Pulsa **Guardar ficha**.
4. Abre **Vista previa del estudiante** para comprobar el resultado.

Formatos recomendados: imagen horizontal 16:9 (por ejemplo 1600 × 900 px), con el título legible y sin textos pequeños.

Opciones admitidas:

- **Activo local del proyecto:** por ejemplo `/brand/social/og-image-blue-dark.png`. Es la portada configurada actualmente para el programa N2N: una imagen institucional de Wisdom Academy, no de N2N.
- **URL pública autorizada:** solo si tienes derechos de uso.
- **Imagen oficial de N2N:** úsala únicamente si vino en el paquete de materiales o cuentas con autorización. Súbela al servidor en `public/images/covers/` mediante el despliegue, o utiliza una URL estable autorizada. No se debe afirmar afiliación, acreditación ni concesión de títulos que los documentos no demuestren.

La portada se muestra en la ficha del programa con degradado de marca y el título superpuesto. Si no hay imagen, se usa el degradado institucional.

### Insumos de marca disponibles en el repositorio

| Recurso | Ruta |
| --- | --- |
| Logo horizontal a color | `public/brand/png/wisdom-logo-horizontal-color.png` |
| Logo vertical a color | `public/brand/png/wisdom-logo-vertical-color.png` |
| Isotipo | `public/brand/png/wisdom-icon-color-512.png` |
| Portada social oscura | `public/brand/social/og-image-blue-dark.png` |
| Portada social clara | `public/brand/social/og-image-blue-light.png` |
| Guía de marca | `public/brand/BRAND-GUIDE.md` y `wisdom-academy-brand/BRAND-GUIDE.md` |
| Tokens de color y tipografía | `src/styles/tokens.css` y `wisdom-academy-brand/tokens.css` |

No se extrajeron logotipos ni datos curriculares de N2N porque no forman parte de los archivos entregados en el repositorio. Los documentos del repositorio (`Plataforma Educativa Wisdom Academy.docx`, `PLAN MAESTRO COMPLETO WISDOM ACADEMY.md`, `DESIGN.md`, `PRODUCT.md`) describen la plataforma Wisdom Academy, no el currículo N2N, por lo que no se usaron para inventar semestres, materias ni calendarios.

## 6. Publicar el curso

1. Confirma que el material oficial ya está cargado y revisado.
2. En la ficha, cambia el estado a **Publicado** y pulsa **Guardar ficha** (o usa **Publicar**).
3. Verifica que los estudiantes tengan un derecho de acceso vigente al recurso del programa. Sin derecho, la página no se muestra aunque esté publicada.
4. Abre **Vista previa del estudiante** y revisa portada, semestres, clases, videos, repasos y evaluaciones.
5. Si algo falta, vuelve a **Borrador**; los estudiantes dejan de verlo de inmediato.

## 7. Orden recomendado de carga por semestre

1. Programa y calendario.
2. PDF completo / texto.
3. Manifiesto de videos y clases.
4. Materiales por clase.
5. Repasos semanales.
6. Exámenes oficiales (originales privados) y versiones de estudiante.
7. Publicación del semestre.

## 8. Qué no hacer

- No inventes títulos, fechas, profesores ni evaluaciones si no están en la fuente.
- No pongas claves de examen en materiales visibles para estudiantes.
- No compartas públicamente carpetas de Drive.
- No subas videos de YouTube descargados ni re-alojados.
- No cambies el calendario oficial para forzar el orden «repaso → parcial» si el documento indica otra cosa: registra la diferencia.
