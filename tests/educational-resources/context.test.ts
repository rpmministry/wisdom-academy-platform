/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Pruebas del Contexto Curricular
 * ARCHIVO: tests/educational-resources/context.test.ts
 *
 * PROPÓSITO:
 * Comprueba que el panel reciba asignatura, unidad, edad, nivel, idioma y
 * objetivos reales de la malla de Wisdom Academy, sin inventar metadatos.
 * ==============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { curriculumContentEngine } from '@/services/curriculumContentEngine';

test('obtiene contexto real de Matemáticas para Gael (4° EGB)', () => {
  const contexto = curriculumContentEngine.obtenerContextoAprendizaje(
    'Matemáticas',
    true,
    'Fracciones: medios, cuartos y octavos',
    2
  );

  assert.equal(contexto.edad, 8);
  assert.equal(contexto.nivel, 'Básica Elemental');
  assert.match(contexto.curso, /4\.° de EGB/);
  assert.equal(contexto.asignatura, 'Matemáticas');
  assert.match(contexto.unidad, /Fracciones/i);
  assert.match(contexto.tema, /Fracciones/i);
  assert.ok(contexto.objetivos.length > 0);
  assert.ok(contexto.conceptos.length > 0);
  assert.equal(contexto.idioma, 'es');
  assert.equal(contexto.diapositiva, 2);
  assert.ok(contexto.fase);
  assert.ok((contexto.contenidoDiapositiva || '').length > 20);
});

test('detecta una clase de inglés y busca en ese idioma', () => {
  const contexto = curriculumContentEngine.obtenerContextoAprendizaje(
    'Academic English & Literature',
    false
  );

  assert.equal(contexto.edad, 12);
  assert.equal(contexto.nivel, 'Básica Superior');
  assert.match(contexto.curso, /8\.° de EGB/);
  assert.equal(contexto.idioma, 'en');
  assert.match(contexto.asignatura, /English/i);
});

test('usa la unidad seleccionada y no atribuye contenidos de otra unidad', () => {
  const contexto = curriculumContentEngine.obtenerContextoAprendizaje(
    'Matemáticas',
    true,
    'Fracciones: medios, cuartos y octavos',
    1
  );
  const contextoOtraUnidad = curriculumContentEngine.obtenerContextoAprendizaje(
    'Matemáticas',
    true,
    'Valor posicional hasta 9.999',
    1
  );

  assert.notEqual(contexto.unidad, contextoOtraUnidad.unidad);
  assert.match(contextoOtraUnidad.unidad, /Valor posicional/i);
});
