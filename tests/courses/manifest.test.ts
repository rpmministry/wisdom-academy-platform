import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeManifestEntries, parseManifest } from '../../src/lib/courses/manifest';

const MARKDOWN = `Programa: Curso teológico — Universidad Cristiana N2N
Semestre: 1
Clase: 1
Título de la clase: Introducción al Antiguo Testamento
URL de YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ
URL de YouTube: https://youtu.be/aaaaaaaaaaa
Páginas del texto: 1-12
Duración: 45 min
Descripción: Clase introductoria.
Material complementario: https://example.com/lectura

Semestre: 1
Clase: 2
Título de la clase: Génesis y la creación
URL de YouTube: https://www.youtube.com/embed/bbbbbbbbbbb
Páginas del texto: 13-24
`;

test('parsea el manifiesto Markdown canónico con varios videos por clase', () => {
  const result = parseManifest('manifest.md', MARKDOWN);
  assert.equal(result.format, 'markdown');
  assert.equal(result.entries.length, 2);
  assert.equal(result.entries[0].semester, 1);
  assert.equal(result.entries[0].lessonNumber, 1);
  assert.equal(result.entries[0].title, 'Introducción al Antiguo Testamento');
  assert.deepEqual(result.entries[0].videoIds, ['dQw4w9WgXcQ', 'aaaaaaaaaaa']);
  assert.equal(result.entries[0].pages, '1-12');
  assert.equal(result.entries[0].material, 'https://example.com/lectura');
  assert.equal(result.entries[1].videoIds[0], 'bbbbbbbbbbb');
  assert.equal(result.stats.ready, 2);
  assert.equal(result.errors.length, 0);
});

test('detecta URLs inválidas, clases sin video y títulos ausentes', () => {
  const manifest = `Semestre: 1
Clase: 1
Título de la clase: Clase con enlace inválido
URL de YouTube: https://example.com/no-es-youtube

Semestre: 1
Clase: 2
Título de la clase: Clase sin video

Semestre: 1
Clase: 3
URL de YouTube: https://youtu.be/dQw4w9WgXcQ
`;
  const result = parseManifest('manifest.md', manifest);
  assert.ok(result.errors.some((error) => error.includes('inválidos')));
  assert.ok(result.errors.some((error) => error.includes('título exacto')));
  assert.ok(result.warnings.some((warning) => warning.includes('sin video')));
  assert.equal(result.stats.missingTitle, 1);
  assert.equal(result.stats.withoutVideo >= 2, true);
});

test('detecta clases y videos duplicados sin perder el resto', () => {
  const manifest = `Semestre: 1
Clase: 1
Título de la clase: Primera
URL de YouTube: https://youtu.be/dQw4w9WgXcQ

Semestre: 1
Clase: 1
Título de la clase: Duplicada
URL de YouTube: https://youtu.be/aaaaaaaaaaa

Semestre: 1
Clase: 2
Título de la clase: Segunda
URL de YouTube: https://youtu.be/dQw4w9WgXcQ
`;
  const result = parseManifest('manifest.md', manifest);
  assert.ok(result.errors.some((error) => error.includes('está repetida')));
  assert.ok(result.errors.some((error) => error.includes('ya está asociado')));
  assert.equal(result.stats.duplicateClasses, 1);
  assert.equal(result.stats.duplicateVideos, 1);
});

test('parsea CSV y JSON estructurados', () => {
  const csv = `semestre,clase,titulo,youtube,paginas
1,1,Clase CSV,https://youtu.be/dQw4w9WgXcQ,1-10
1,2,Clase CSV 2,https://www.youtube.com/watch?v=aaaaaaaaaaa,11-20
`;
  const csvResult = parseManifest('manifest.csv', csv);
  assert.equal(csvResult.format, 'csv');
  assert.equal(csvResult.entries.length, 2);
  assert.equal(csvResult.entries[1].title, 'Clase CSV 2');

  const json = JSON.stringify({
    program: 'Programa JSON',
    semesters: [
      {
        semestre: 1,
        clases: [
          {
            clase: 1,
            titulo: 'Clase JSON',
            youtube: ['https://youtu.be/dQw4w9WgXcQ'],
            paginas: '1-5',
          },
        ],
      },
    ],
  });
  const jsonResult = parseManifest('manifest.json', json);
  assert.equal(jsonResult.format, 'json');
  assert.equal(jsonResult.entries.length, 1);
  assert.equal(jsonResult.entries[0].program, 'Programa JSON');
  assert.equal(jsonResult.entries[0].semester, 1);
  assert.equal(jsonResult.entries[0].title, 'Clase JSON');
});

test('fusiona filas de la misma clase sin duplicar videos', () => {
  const result = parseManifest('manifest.md', MARKDOWN);
  const merged = mergeManifestEntries([
    ...result.entries,
    {
      ...result.entries[0],
      videoIds: ['ccccccccccc'],
      pages: null,
    },
  ]);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged[0].videoIds, ['dQw4w9WgXcQ', 'aaaaaaaaaaa', 'ccccccccccc']);
});

test('no interpreta HTML ni ejecuta contenido del manifiesto', () => {
  const manifest = `Semestre: 1
Clase: 1
Título de la clase: <script>alert(1)</script>
URL de YouTube: <iframe src="https://youtu.be/dQw4w9WgXcQ"></iframe>
`;
  const result = parseManifest('manifest.md', manifest);
  assert.equal(result.entries[0].videoIds.length, 0);
  assert.ok(result.entries[0].invalidVideoUrls.length >= 1);
  assert.equal(result.entries[0].title, '<script>alert(1)</script>');
});
