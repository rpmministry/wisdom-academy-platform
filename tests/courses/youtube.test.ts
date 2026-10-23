import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildYouTubeEmbedUrl,
  buildYouTubeWatchUrl,
  extractYouTubeVideoId,
  normalizeYouTubeVideoIds,
} from '../../src/lib/courses/youtube';

test('reconoce los formatos habituales de YouTube', () => {
  const id = 'dQw4w9WgXcQ';
  const urls = [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=30s`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
    id,
  ];
  for (const url of urls) {
    assert.equal(extractYouTubeVideoId(url), id, url);
  }
});

test('rechaza dominios, HTML e IDs inválidos', () => {
  assert.equal(extractYouTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(extractYouTubeVideoId('<iframe src="https://youtube.com/embed/dQw4w9WgXcQ"></iframe>'), null);
  assert.equal(extractYouTubeVideoId('javascript:alert(1)'), null);
  assert.equal(extractYouTubeVideoId('https://youtu.be/corto'), null);
});

test('normaliza listas y conserva duplicados e inválidos', () => {
  const result = normalizeYouTubeVideoIds([
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://example.com/video',
    'https://youtu.be/aaaaaaaaaaa',
  ]);
  assert.deepEqual(result.ids, ['dQw4w9WgXcQ', 'aaaaaaaaaaa']);
  assert.deepEqual(result.duplicates, ['dQw4w9WgXcQ']);
  assert.deepEqual(result.invalid, ['https://example.com/video']);
});

test('construye URL de embed sin HTML y con privacidad mejorada', () => {
  const url = buildYouTubeEmbedUrl('dQw4w9WgXcQ', { startSeconds: 42 });
  assert.match(url, /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
  assert.match(url, /start=42/);
  assert.equal(buildYouTubeWatchUrl('dQw4w9WgXcQ'), 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.throws(() => buildYouTubeEmbedUrl('<script>'), /no es válido/);
});
