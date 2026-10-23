/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Pruebas de Validación Académica y Técnica
 * ARCHIVO: tests/educational-resources/validators.test.ts
 *
 * PROPÓSITO:
 * Comprueba que la clasificación no se base en el primer resultado, que un
 * idioma incorrecto o contenido inseguro sea rechazado y que una validación
 * técnica incompleta nunca se presente como validada.
 * ==============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  CandidatoVideo,
  ContextoAcademico,
} from '@/types/educationalResources';
import { evaluarPertinenciaAcademica } from '@/lib/educational-resources/academicValidator';
import { evaluarTecnica } from '@/lib/educational-resources/technicalValidator';
import { VERSION_CRITERIOS } from '@/lib/educational-resources/constants';

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

test('valida un video pertinente, educativo y en español', () => {
  const resultado = evaluarPertinenciaAcademica(candidato(), contexto);
  assert.equal(resultado.superada, true);
  assert.equal(resultado.rechazoDuro, false);
  assert.ok(resultado.puntuacion >= 70);
  assert.equal(resultado.idiomaEvidencia, 'declarado');
  assert.equal(resultado.nivelEvidencia, 'metadatos');
  assert.equal(resultado.coberturaTitulo, 1);
});

test('rechaza un video irrelevante aunque técnicamente exista', () => {
  const resultado = evaluarPertinenciaAcademica(
    candidato({
      titulo: 'Minecraft gameplay épico',
      descripcion: 'Jugamos Minecraft durante una hora.',
      idiomaDeclarado: 'es',
    }),
    contexto
  );
  assert.equal(resultado.superada, false);
  assert.equal(resultado.rechazoDuro, true);
});

test('rechaza un video con idioma declarado distinto al de la clase', () => {
  const resultado = evaluarPertinenciaAcademica(
    candidato({
      titulo: 'Equivalent fractions explained step by step for elementary school',
      descripcion: 'Learn equivalent fractions with examples and exercises for kids.',
      idiomaDeclarado: 'en',
    }),
    contexto
  );
  assert.equal(resultado.superada, false);
  assert.equal(resultado.rechazoDuro, true);
  assert.match(resultado.motivos.join(' '), /idioma declarado/i);
});

test('no valida un video cuando el idioma no puede comprobarse', () => {
  const resultado = evaluarPertinenciaAcademica(
    candidato({
      titulo: 'Fracciones equivalentes',
      descripcion: 'Ejemplos visuales.',
      idiomaDeclarado: undefined,
    }),
    contexto
  );
  assert.equal(resultado.superada, false);
  assert.notEqual(resultado.idiomaEvidencia, 'declarado');
  assert.match(
    resultado.motivos.join(' '),
    /evidencia es débil|evidencia suficiente para verificar el idioma/i
  );
});

test('rechaza contenido con términos incompatibles con el entorno escolar', () => {
  const resultado = evaluarPertinenciaAcademica(
    candidato({
      titulo: 'Fracciones equivalentes para adultos xxx',
      descripcion: 'Contenido explícito.',
    }),
    contexto
  );
  assert.equal(resultado.superada, false);
  assert.equal(resultado.rechazoDuro, true);
  assert.match(resultado.motivos.join(' '), /términos incompatibles/i);
});

test('rechaza un título con señales publicitarias', () => {
  const resultado = evaluarPertinenciaAcademica(
    candidato({
      titulo: 'Fracciones equivalentes - descuento exclusivo',
    }),
    contexto
  );
  assert.equal(resultado.superada, false);
  assert.equal(resultado.rechazoDuro, true);
  assert.match(resultado.motivos.join(' '), /publicitarias/i);
});

test('acepta una revisión manual vigente como evidencia académica', () => {
  const resultado = evaluarPertinenciaAcademica(
    candidato({
      idiomaDeclarado: undefined,
      descripcion: 'Material visual.',
      curado: {
        id: 'TestVideo01',
        titulo: 'Fracciones equivalentes explicación paso a paso para primaria',
        canal: 'Escuela de Matemáticas',
        idioma: 'es',
        temas: ['fracciones equivalentes'],
        embedVerificado: true,
        revisionManual: {
          validador: 'Coordinación Académica',
          fecha: new Date().toISOString(),
          versionCriterios: VERSION_CRITERIOS,
          evidencia: 'Video revisado por el equipo curricular.',
          alcance: 'ambos',
        },
      },
    }),
    contexto
  );
  assert.equal(resultado.idiomaEvidencia, 'manual');
  assert.equal(resultado.nivelEvidencia, 'revision_manual');
});

test('una revisión manual válida prevalece sobre metadatos no coincidentes', () => {
  const resultado = evaluarPertinenciaAcademica(
    candidato({
      titulo: 'Video de apoyo para la clase',
      descripcion: 'Material revisado por el equipo académico.',
      idiomaDeclarado: undefined,
      curado: {
        id: 'TestVideo01',
        titulo: 'Video de apoyo para la clase',
        canal: 'Escuela de Matemáticas',
        idioma: 'es',
        temas: ['fracciones equivalentes'],
        embedVerificado: true,
        revisionManual: {
          validador: 'Coordinación Académica',
          fecha: new Date().toISOString(),
          versionCriterios: VERSION_CRITERIOS,
          evidencia: 'Video revisado y aprobado para la unidad.',
          alcance: 'ambos',
        },
      },
    }),
    contexto
  );

  assert.equal(resultado.superada, true);
  assert.equal(resultado.rechazoDuro, false);
  assert.equal(resultado.nivelEvidencia, 'revision_manual');
  assert.ok(resultado.puntuacion >= 85);
});

test('supera la validación técnica sólo con evidencia completa', () => {
  const tecnica = evaluarTecnica(candidato(), 'EC');
  assert.equal(tecnica.superada, true);
  assert.equal(tecnica.existe, true);
  assert.equal(tecnica.embedPermitido, true);
  assert.equal(tecnica.regionPermitida, true);
});

test('un video privado o restringido no supera la validación técnica', () => {
  const privado = evaluarTecnica(
    candidato({
      tecnico: {
        fuente: 'youtube_api',
        existe: true,
        privacidad: 'private',
        embedPermitido: true,
        regionPermitida: true,
        uploadStatus: 'processed',
      },
    }),
    'EC'
  );
  assert.equal(privado.superada, false);
  assert.equal(
    privado.comprobaciones.find((item) => item.id === 'PRIVACIDAD')?.resultado,
    'falla'
  );
});

test('un video sin inserción permitida no se marca como reproducible', () => {
  const sinInsercion = evaluarTecnica(
    candidato({
      tecnico: {
        fuente: 'youtube_api',
        existe: true,
        privacidad: 'public',
        embedPermitido: false,
        regionPermitida: true,
        uploadStatus: 'processed',
      },
    }),
    'EC'
  );
  assert.equal(sinInsercion.superada, false);
  assert.equal(sinInsercion.embedPermitido, false);
  assert.equal(
    sinInsercion.comprobaciones.find((item) => item.id === 'INSERCION')?.resultado,
    'falla'
  );
});

test('una restricción regional impide la reproducción en Ecuador', () => {
  const restringido = evaluarTecnica(
    candidato({
      tecnico: {
        fuente: 'youtube_api',
        existe: true,
        privacidad: 'public',
        embedPermitido: true,
        regionPermitida: false,
        uploadStatus: 'processed',
      },
    }),
    'EC'
  );
  assert.equal(restringido.superada, false);
  assert.equal(
    restringido.comprobaciones.find((item) => item.id === 'REGION')?.resultado,
    'falla'
  );
});

test('oEmbed confirma existencia pero no permite declarar inserción', () => {
  const oembed = evaluarTecnica(
    candidato({
      tecnico: {
        fuente: 'oembed',
        existe: true,
        privacidad: 'unknown',
        embedPermitido: undefined,
        regionPermitida: undefined,
        duracionVerificada: false,
        idiomaVerificado: false,
      },
    }),
    'EC'
  );
  assert.equal(oembed.superada, false);
  assert.equal(
    oembed.comprobaciones.find((item) => item.id === 'INSERCION')?.resultado,
    'no_verificable'
  );
});

test('un video eliminado o inexistente se rechaza técnicamente', () => {
  const eliminado = evaluarTecnica(
    candidato({
      tecnico: {
        fuente: 'youtube_api',
        existe: false,
        errorTipo: 'no_encontrado',
        error: 'El video no existe o fue eliminado.',
      },
    }),
    'EC'
  );
  assert.equal(eliminado.superada, false);
  assert.equal(eliminado.existe, false);
  assert.equal(
    eliminado.comprobaciones.find((item) => item.id === 'EXISTENCIA')?.resultado,
    'falla'
  );
});

test('una caída de red no se confunde con un video inexistente', () => {
  const red = evaluarTecnica(
    candidato({
      tecnico: {
        fuente: 'oembed',
        existe: false,
        errorTipo: 'red',
        error: 'No fue posible conectarse.',
      },
    }),
    'EC'
  );
  assert.equal(red.superada, false);
  assert.equal(
    red.comprobaciones.find((item) => item.id === 'EXISTENCIA')?.resultado,
    'no_verificable'
  );
});
