/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Pruebas del Motor Semántico
 * ARCHIVO: tests/educational-resources/semanticSearch.test.ts
 *
 * PROPÓSITO:
 * Comprueba que la búsqueda use el tema puntual y el contenido real de la
 * lección, no solo la asignatura, y que reconozca un video pertinente aunque
 * el tema aparezca en la descripción y no literalmente en el título.
 * ==============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import type { CandidatoVideo, ContextoAcademico } from '@/types/educationalResources';
import {
  construirConsultasBusquedaSemantica,
  construirPerfilSemantico,
  evaluarCoincidenciaSemantica,
} from '@/lib/educational-resources/semanticSearch';
import { evaluarPertinenciaAcademica } from '@/lib/educational-resources/academicValidator';

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
  diapositiva: 2,
  fase: 'Modelo y evidencia',
  contenidoDiapositiva:
    'Comparar fracciones con distinto denominador. Para comparar fracciones equivalentes se busca un denominador común y se transforman los numeradores.',
};

function candidato(parcial: Partial<CandidatoVideo> = {}): CandidatoVideo {
  return {
    id: 'TestVideo01',
    titulo: 'Fracciones equivalentes explicación paso a paso para primaria',
    canal: 'Escuela de Matemáticas',
    descripcion:
      'Aprende qué son las fracciones equivalentes con ejemplos y ejercicios para niños de primaria.',
    duracionSegundos: 12 * 60,
    idiomaDeclarado: 'es',
    origen: 'youtube_api',
    tecnico: {
      fuente: 'youtube_api',
      existe: true,
      privacidad: 'public',
      embedPermitido: true,
      regionPermitida: true,
      uploadStatus: 'processed',
      duracionVerificada: true,
      idiomaVerificado: true,
    },
    ...parcial,
  };
}

test('construye consultas con el tema puntual y frases del material', () => {
  const consultas = construirConsultasBusquedaSemantica(contexto);
  assert.ok(consultas.length > 0);
  const consultaLeccion = consultas[0]?.consulta || '';
  assert.match(consultaLeccion, /Fracciones equivalentes/i);
  assert.match(consultaLeccion, /Comparar fracciones|denominador/i);
  assert.match(consultaLeccion, /explicación paso a paso/i);
  assert.ok(!consultaLeccion.toLowerCase().startsWith('matemáticas'));
});

test('reconoce el tema aunque solo aparezca en la descripción', () => {
  const perfil = construirPerfilSemantico(contexto);
  const coincidencia = evaluarCoincidenciaSemantica(
    candidato({
      titulo: 'Explicación de matemáticas para cuarto grado',
      descripcion:
        'Aprende a comparar fracciones equivalentes con distinto denominador usando ejemplos visuales.',
    }),
    perfil
  );

  assert.equal(coincidencia.coincidenciaNucleo, true);
  assert.equal(coincidencia.coberturaTitulo, 0);
  assert.ok(coincidencia.coberturaTema > 0.9);
  assert.ok(coincidencia.puntuacion >= 45);
});

test('no considera pertinente un video que solo menciona la asignatura', () => {
  const perfil = construirPerfilSemantico(contexto);
  const coincidencia = evaluarCoincidenciaSemantica(
    candidato({
      titulo: 'Matemáticas para 4° de EGB',
      descripcion: 'Clase de matemáticas para primaria.',
    }),
    perfil
  );

  assert.equal(coincidencia.coincidenciaNucleo, false);
  assert.equal(coincidencia.soloCoincideAsignatura, true);
});

test('el validador acepta una coincidencia semántica aunque el título sea genérico', () => {
  const resultado = evaluarPertinenciaAcademica(
    candidato({
      titulo: 'Explicación de matemáticas para cuarto grado',
      descripcion:
        'Aprende a comparar fracciones equivalentes con distinto denominador usando ejemplos visuales.',
    }),
    contexto
  );

  assert.equal(resultado.superada, true);
  assert.equal(resultado.rechazoDuro, false);
  assert.ok(resultado.coberturaTema > 0.9);
  assert.ok(resultado.puntuacion >= 70);
});
