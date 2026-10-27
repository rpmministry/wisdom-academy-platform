import test from 'node:test';
import assert from 'node:assert/strict';
import { TeacherSpeechManager, teacherSpeechManager } from '../../src/utils/speechSynthesis.js';

test('prepararTextoParaLocucion expande fracciones y signos matemáticos en español', () => {
  const manager = new TeacherSpeechManager();
  const raw = 'Calcula 1/4 + 2/4 en ℤ con +5 y -3 a 25°C';
  const out = manager.prepararTextoParaLocucion(raw, 'es');

  assert.match(out, /un cuarto/);
  assert.match(out, /dos cuartos/);
  assert.match(out, /los números enteros/);
  assert.match(out, /positivo 5/);
  assert.match(out, /menos 3/);
  assert.match(out, /25 grados centígrados/);
});

test('segmentarEnOraciones subdivide párrafos largos en fragmentos que evitan el límite de 15 segundos', () => {
  const manager = new TeacherSpeechManager();
  const oracionLarga =
    'Hoy vamos a comprender la suma y resta de números enteros explorando la recta numérica, donde cada salto hacia la derecha representa una ganancia o número positivo, mientras que cada salto hacia la izquierda nos muestra una deuda o número negativo.';

  const segmentos = manager.segmentarEnOraciones(oracionLarga);
  assert.ok(segmentos.length >= 3, `Esperaba al menos 3 segmentos y se obtuvieron ${segmentos.length}`);

  // Verificar que ningún segmento exceda las 14 palabras
  for (const seg of segmentos) {
    const palabras = seg.trim().split(/\s+/).filter(Boolean);
    assert.ok(
      palabras.length <= 14,
      `El segmento "${seg}" tiene ${palabras.length} palabras (máx 14 permitido para evitar cortes de voz)`
    );
  }
});

test('segmentarEnOraciones conserva oraciones breves íntegras', () => {
  const manager = new TeacherSpeechManager();
  const texto = '¡Hola Gael! Bienvenido a tu clase de ciencias. ¿Estás listo?';
  const segmentos = manager.segmentarEnOraciones(texto);

  assert.equal(segmentos.length, 3);
  assert.equal(segmentos[0], '¡Hola Gael!');
  assert.equal(segmentos[1], 'Bienvenido a tu clase de ciencias.');
  assert.equal(segmentos[2], '¿Estás listo?');
});

test('teacherSpeechManager exporta singleton operativo', () => {
  assert.ok(teacherSpeechManager);
  assert.equal(typeof teacherSpeechManager.hablar, 'function');
  assert.equal(typeof teacherSpeechManager.detener, 'function');
});
