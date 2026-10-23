import assert from 'node:assert/strict';
import test from 'node:test';
import {
  contentDisposition,
  isActiveContent,
  safeMimeType,
} from '../../src/server/http/contentDisposition';

test('Content-Disposition incluye respaldo ASCII y nombre UTF-8 seguro', () => {
  const header = contentDisposition('Guía de estudio · 4.° EGB.html', 'inline');
  assert.match(header, /^inline; filename="[^"]+"/);
  assert.match(header, /filename\*=UTF-8''/);
  assert.match(header, /Gu%C3%ADa/);
  assert.doesNotMatch(header, /[\r\n]/);
});

test('Content-Disposition neutraliza rutas y comillas', () => {
  const header = contentDisposition('../../etc/"secreto".txt', 'attachment');
  assert.match(header, /^attachment; filename="secreto.txt"/);
  assert.match(header, /filename\*=UTF-8''/);
});

test('Los documentos activos se identifican por MIME o extensión', () => {
  assert.equal(isActiveContent('text/html', 'archivo.bin'), true);
  assert.equal(isActiveContent('image/svg+xml', 'logo.png'), true);
  assert.equal(isActiveContent('application/octet-stream', 'tarea.HTML'), true);
  assert.equal(isActiveContent('application/pdf', 'guia.pdf'), false);
  assert.equal(isActiveContent('image/png', 'foto.png'), false);
});

test('Los MIME malformados se degradan a binario', () => {
  assert.equal(safeMimeType('text/html'), 'text/html');
  assert.equal(safeMimeType('text/html; charset=utf-8'), 'text/html');
  assert.equal(safeMimeType(''), 'application/octet-stream');
  assert.equal(safeMimeType('texto sin tipo'), 'application/octet-stream');
});
