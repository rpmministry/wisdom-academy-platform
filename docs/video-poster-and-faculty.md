# Reproductor de clase: portada dinámica y perfiles docentes

## Portada dinámica del video

El reproductor no carga YouTube de inmediato. Muestra una portada tipo *facade* con un frame generado por YouTube y un botón de reproducción. Al pulsar, se carga el iframe con `autoplay=1`.

### Selección del frame

Para cada video se intentan, en orden:

1. `hq2.jpg` — frame del contenido, frecuentemente con el profesor en cámara.
2. `hq3.jpg` — otro frame del contenido.
3. `maxresdefault.jpg` — portada de alta resolución generada por YouTube.
4. `hqdefault.jpg` — respaldo.
5. Portada local de la semana (`/images/course-weeks/week-XX.jpg`) o portada del programa.

Este enfoque usa frames generados por YouTube, no descargas ni re-alojamiento del video. Si la extracción directa de un frame específico con ffmpeg no es posible —porque el video no es descargable o no está permitido—, se usa la portada de la clase como respaldo, tal como se solicitó.

### Ventajas

- La página carga más rápido: el iframe solo se crea al pulsar reproducir.
- Se muestra una imagen del contenido con el profesor, no una carátula estática genérica.
- Si YouTube bloquea una imagen, se degrada a otra variante y luego a la portada local.
- El botón de reproducción mantiene el tamaño y el contraste del aula.

### Limitación

No se descargan videos de YouTube ni se extraen frames con herramientas externas. Hacerlo requeriría permisos de descarga y almacenamiento que no forman parte de la arquitectura actual. Los frames `hq2/hq3` son la alternativa soportada y estable.

## Perfiles docentes

- Nueva pestaña **Cuerpo docente** en la ficha del programa.
- Fotos extraídas de la primera página de los libros oficiales y guardadas en `public/images/faculty/`.
- Biografías basadas en las introducciones de los libros, con credenciales y fuente visibles.
- Cada tarjeta es un acordeón: resumen breve y “Ver trayectoria y credenciales”.
- Para semestres sin material oficial se muestran nombres y materias, sin inventar biografías.
- La investigación de UX está en `docs/faculty-profile-ux-research.md`.
