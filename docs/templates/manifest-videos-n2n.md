# Plantilla — Manifiesto de clases y videos N2N

Copia esta plantilla, guarda una copia por semestre y completa **solo** datos verificados en los materiales oficiales. No inventes títulos ni números de clase.

## Formato recomendado (Markdown)

```text
Programa: Curso teológico — Universidad Cristiana N2N
Semestre: 1
Clase: 1
Título de la clase: [título exacto según el material oficial]
URL de YouTube: https://www.youtube.com/watch?v=VIDEO_ID
Páginas del texto: 1-12
Duración: [opcional]
Descripción: [opcional]
Material complementario: [opcional]

Semestre: 1
Clase: 2
Título de la clase: [título exacto]
URL de YouTube: https://youtu.be/VIDEO_ID
URL de YouTube: https://www.youtube.com/watch?v=SEGUNDO_ID
Páginas del texto: 13-24

Semestre: 2
Clase: 1
Título de la clase: [título exacto]
URL de YouTube: https://www.youtube.com/embed/VIDEO_ID
Páginas del texto: 1-10
```

### Reglas

- Un bloque por clase.
- Se admiten varias líneas `URL de YouTube:` para una misma clase.
- Formatos válidos: `youtube.com/watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`, `/live/`.
- El ID debe tener 11 caracteres.
- No uses iframes ni HTML.
- Si no hay video, deja la clase sin URL: se importará como «clase sin video» y quedará pendiente.
- No repitas una clase ni un video en otra clase.

## Formato CSV (alternativo)

```csv
semestre,clase,titulo,youtube,paginas,duracion,descripcion,material
1,1,Título exacto de la clase,https://youtu.be/VIDEO_ID,1-12,45 min,,https://ejemplo/lectura
1,2,Título exacto de la clase 2,https://www.youtube.com/watch?v=OTRO_ID,13-24,,,
```

Para varios videos en una clase, sepáralos con `;` dentro de la celda `youtube`.

## Formato JSON (estructurado)

```json
{
  "program": "Curso teológico — Universidad Cristiana N2N",
  "semesters": [
    {
      "semestre": 1,
      "clases": [
        {
          "clase": 1,
          "titulo": "Título exacto de la clase",
          "youtube": ["https://youtu.be/VIDEO_ID"],
          "paginas": "1-12",
          "duracion": "45 min",
          "descripcion": "",
          "material": ""
        }
      ]
    }
  ]
}
```

## Lista de verificación antes de importar

- [ ] Todos los títulos provienen del material oficial.
- [ ] Cada clase tiene semestre y número.
- [ ] Las URLs fueron probadas y no están restringidas para inserción.
- [ ] No hay IDs duplicados entre clases.
- [ ] Las páginas corresponden al PDF oficial.
- [ ] El manifiesto se guardó en `03_INDICE_DE_ENLACES_YOUTUBE/`.
- [ ] La previsualización muestra 0 errores.
