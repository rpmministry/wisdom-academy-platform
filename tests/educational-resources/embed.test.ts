/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Pruebas del Reproductor Integrado
 * ARCHIVO: tests/educational-resources/embed.test.ts
 *
 * PROPÓSITO:
 * Verifica que la URL del reproductor conserve los parámetros oficiales, que
 * no se acepten hosts ajenos y que los errores de YouTube se traduzcan sin
 * exponer detalles técnicos al estudiante.
 * ==============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  construirUrlReproduccion,
  mensajeErrorYouTube,
} from '@/lib/educational-resources/embed';

test('prepara un iframe oficial con API, origen y reanudación controlada', () => {
  const url = new URL(
    construirUrlReproduccion(
      'https://www.youtube-nocookie.com/embed/TestVideo01?rel=0&hl=es&modestbranding=1',
      { origen: 'https://academy.example', inicioSegundos: 42.8 }
    ) || ''
  );

  assert.equal(url.hostname, 'www.youtube-nocookie.com');
  assert.equal(url.pathname, '/embed/TestVideo01');
  assert.equal(url.searchParams.get('enablejsapi'), '1');
  assert.equal(url.searchParams.get('playsinline'), '1');
  assert.equal(url.searchParams.get('controls'), '1');
  assert.equal(url.searchParams.get('autoplay'), null);
  assert.equal(url.searchParams.get('modestbranding'), null);
  assert.equal(url.searchParams.get('origin'), 'https://academy.example');
  assert.equal(url.searchParams.get('start'), '42');
});

test('no reanuda posiciones demasiado cercanas al inicio', () => {
  const url = new URL(
    construirUrlReproduccion(
      'https://www.youtube.com/embed/TestVideo01?start=12'
    ) || ''
  );
  assert.equal(url.searchParams.get('start'), null);
});

test('rechaza hosts y rutas ajenas al reproductor oficial', () => {
  assert.equal(
    construirUrlReproduccion('https://example.com/embed/TestVideo01'),
    null
  );
  assert.equal(
    construirUrlReproduccion('http://www.youtube.com/embed/TestVideo01'),
    null
  );
  assert.equal(
    construirUrlReproduccion('https://www.youtube.com/watch?v=TestVideo01'),
    null
  );
  assert.equal(
    construirUrlReproduccion('https://www.youtube.com/embed/corto'),
    null
  );
});

test('explica los errores de inserción sin bloquear la clase', () => {
  assert.match(mensajeErrorYouTube(101), /propietario/i);
  assert.match(mensajeErrorYouTube(150), /propietario/i);
  assert.match(mensajeErrorYouTube(100), /no está disponible/i);
  assert.match(mensajeErrorYouTube(2), /dirección/i);
  assert.match(mensajeErrorYouTube(5), /navegador/i);
  assert.match(mensajeErrorYouTube(153), /identificar el sitio/i);
  assert.match(mensajeErrorYouTube(999), /YouTube informó/i);
});
