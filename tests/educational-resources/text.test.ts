/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Pruebas de Utilidades de Recursos
 * ARCHIVO: tests/educational-resources/text.test.ts
 *
 * PROPÓSITO:
 * Verifica consultas contextualizadas, extracción segura de IDs de YouTube,
 * duración ISO 8601 y claves de caché estables.
 * ==============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import type { ContextoAcademico } from '@/types/educationalResources';
import {
  calcularClaveContexto,
  construirConsultaContextual,
  construirUrlBusquedaYouTube,
  construirUrlEmbedYouTube,
  esIdYouTubeValido,
  extraerIdYouTube,
  formatearDuracion,
  parsearDuracionISO8601,
} from '@/lib/educational-resources/text';

const contexto: ContextoAcademico = {
  edad: 8,
  nivel: 'Básica Elemental',
  curso: '4° de EGB',
  asignatura: 'Matemáticas',
  area: 'MATEMATICAS',
  unidad: 'Fracciones equivalentes y comparación',
  tema: 'Fracciones equivalentes',
  subtema: 'Comparar fracciones con distinto denominador',
  objetivos: ['Reconocer fracciones equivalentes', 'Comparar fracciones'],
  conceptos: ['fracción equivalente', 'denominador común'],
  idioma: 'es',
  diapositiva: 1,
  fase: 'Fundamento Académico',
};

test('construye una consulta específica en español, no genérica', () => {
  const consulta = construirConsultaContextual(contexto);
  assert.match(consulta, /fracciones equivalentes/i);
  assert.match(consulta, /explicación paso a paso/i);
  assert.match(consulta, /primaria/i);
  assert.match(consulta, /español/i);
  assert.match(consulta, /4° de EGB/i);
});

test('no incluye un concepto largo con puntuación en la consulta', () => {
  const consulta = construirConsultaContextual({
    ...contexto,
    tema: 'Números enteros y recta numérica',
    unidad: 'Números enteros y recta numérica',
    subtema:
      'Los enteros representan cantidades con dirección y se ordenan en la recta numérica.',
  });
  assert.match(consulta, /Números enteros y recta numérica/);
  assert.equal(consulta.includes('representan cantidades'), false);
  assert.ok(consulta.length <= 200);
  assert.match(consulta, /explicación paso a paso/i);
  assert.match(consulta, /español/i);
});

test('construye la URL oficial de búsqueda con codificación correcta', () => {
  const consulta = construirConsultaContextual(contexto);
  const url = new URL(construirUrlBusquedaYouTube(consulta));
  assert.equal(url.hostname, 'www.youtube.com');
  assert.equal(url.pathname, '/results');
  assert.equal(url.searchParams.get('search_query'), consulta);
});

test('construye una URL de inserción con dominio de privacidad', () => {
  const url = new URL(construirUrlEmbedYouTube('TestVideo01', 'es'));
  assert.equal(url.hostname, 'www.youtube-nocookie.com');
  assert.equal(url.pathname, '/embed/TestVideo01');
  assert.equal(url.searchParams.get('hl'), 'es');
});

test('extrae IDs sólo de hosts oficiales de YouTube', () => {
  assert.equal(extraerIdYouTube('TestVideo01'), 'TestVideo01');
  assert.equal(extraerIdYouTube('https://www.youtube.com/watch?v=TestVideo01'), 'TestVideo01');
  assert.equal(extraerIdYouTube('https://youtu.be/TestVideo01?si=abc'), 'TestVideo01');
  assert.equal(extraerIdYouTube('https://www.youtube.com/embed/TestVideo01'), 'TestVideo01');
  assert.equal(extraerIdYouTube('https://www.youtube.com/shorts/TestVideo01'), 'TestVideo01');
  assert.equal(extraerIdYouTube('https://example.com/watch?v=TestVideo01'), null);
  assert.equal(extraerIdYouTube('javascript:alert(1)'), null);
  assert.equal(extraerIdYouTube('https://youtube.com.evil.example/watch?v=TestVideo01'), null);
  assert.equal(extraerIdYouTube('esto no es un id'), null);
  assert.equal(esIdYouTubeValido('TestVideo01'), true);
  assert.equal(esIdYouTubeValido('corto'), false);
});

test('parsea y formatea duraciones ISO 8601', () => {
  assert.equal(parsearDuracionISO8601('PT1H2M3S'), 3723);
  assert.equal(parsearDuracionISO8601('PT12M30S'), 750);
  assert.equal(parsearDuracionISO8601('PT45S'), 45);
  assert.equal(parsearDuracionISO8601('12:30'), undefined);
  assert.equal(formatearDuracion(750), '12:30');
  assert.equal(formatearDuracion(3723), '1:02:03');
  assert.equal(formatearDuracion(undefined), undefined);
});

test('la clave de caché es estable y no depende de la diapositiva', () => {
  const clave1 = calcularClaveContexto(contexto);
  const clave2 = calcularClaveContexto({ ...contexto, diapositiva: 4, contenidoDiapositiva: 'otra' });
  const clave3 = calcularClaveContexto({ ...contexto, tema: 'Mínimo común múltiplo' });
  const clave4 = calcularClaveContexto({ ...contexto, idioma: 'en' });

  assert.equal(clave1, clave2);
  assert.notEqual(clave1, clave3);
  assert.notEqual(clave1, clave4);
  assert.match(clave1, /^wa-rec-[0-9a-f]{8}$/);
});

test('genera consulta en inglés para una clase de lengua extranjera', () => {
  const consulta = construirConsultaContextual({
    ...contexto,
    asignatura: 'Academic English & Literature',
    tema: 'Equivalent fractions',
    unidad: 'Fractions',
    subtema: 'Comparing fractions',
    idioma: 'en',
  });
  assert.match(consulta, /explained step by step/i);
  assert.match(consulta, /elementary school/i);
  assert.match(consulta, /English/i);
});
