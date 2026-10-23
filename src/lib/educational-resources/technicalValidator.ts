/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Validador Técnico de YouTube
 * ARCHIVO: src/lib/educational-resources/technicalValidator.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Evalúa la evidencia técnica disponible antes de presentar un video:
 * existencia, privacidad, estado de procesamiento, inserción permitida,
 * restricciones regionales y verificabilidad de duración/idioma.
 *
 * Diferencia explícitamente entre un fallo comprobado y una comprobación que
 * no puede realizarse. Esa distinción impide afirmar que un video funciona
 * solo porque su URL tiene un formato correcto o porque oEmbed respondió.
 * ==============================================================================
 */

import type {
  CandidatoVideo,
  ComprobacionValidacion,
  ValidacionTecnica,
} from '@/types/educationalResources';
import { esIdYouTubeValido } from './text';

/** Agrega una comprobación con su carácter crítico. */
function agregar(
  lista: ComprobacionValidacion[],
  id: string,
  etiqueta: string,
  resultado: ComprobacionValidacion['resultado'],
  detalle: string,
  critica = true
): void {
  lista.push({ id, etiqueta, resultado, detalle, critica });
}

/**
 * Evalúa las comprobaciones técnicas. La fuente puede ser la API oficial,
 * oEmbed o una revisión manual del catálogo. Si no hay evidencia de un
 * requisito crítico, el resultado es `no_verificable`, nunca `pasa`.
 */
export function evaluarTecnica(
  candidato: CandidatoVideo,
  region: string
): ValidacionTecnica {
  const comprobaciones: ComprobacionValidacion[] = [];
  const tecnico = candidato.tecnico;

  agregar(
    comprobaciones,
    'ID_FORMATO',
    'Identificador válido',
    esIdYouTubeValido(candidato.id) ? 'pasa' : 'falla',
    esIdYouTubeValido(candidato.id)
      ? 'El identificador cumple el formato oficial de 11 caracteres.'
      : 'El identificador no cumple el formato oficial de YouTube.'
  );

  if (!tecnico) {
    agregar(
      comprobaciones,
      'EXISTENCIA',
      'Existencia verificada',
      'no_verificable',
      'No se consultaron metadatos técnicos del video.'
    );
    return {
      superada: false,
      comprobaciones,
      existe: false,
      fuente: 'desconocida',
    };
  }

  const existenciaNoVerificable =
    !tecnico.existe && (tecnico.errorTipo === 'red' || tecnico.errorTipo === 'api');

  agregar(
    comprobaciones,
    'EXISTENCIA',
    'Existencia verificada',
    tecnico.existe ? 'pasa' : existenciaNoVerificable ? 'no_verificable' : 'falla',
    tecnico.existe
      ? 'El video existe y respondió a la verificación de metadatos.'
      : tecnico.error ||
          (existenciaNoVerificable
            ? 'No se pudo consultar YouTube en este momento.'
            : 'El video no existe, fue eliminado o no es accesible.')
  );

  if (!tecnico.existe) {
    return {
      superada: false,
      comprobaciones,
      existe: false,
      privacidad: tecnico.privacidad,
      embedPermitido: tecnico.embedPermitido,
      regionPermitida: tecnico.regionPermitida,
      fuente: tecnico.fuente,
    };
  }

  if (tecnico.privacidad) {
    if (tecnico.privacidad === 'private') {
      agregar(
        comprobaciones,
        'PRIVACIDAD',
        'Video público',
        'falla',
        'El video es privado y no puede usarse en el aula.'
      );
    } else if (tecnico.privacidad === 'unknown') {
      agregar(
        comprobaciones,
        'PRIVACIDAD',
        'Video público',
        'no_verificable',
        'No se pudo confirmar la privacidad del video.'
      );
    } else {
      agregar(
        comprobaciones,
        'PRIVACIDAD',
        'Video público',
        'pasa',
        `El video está disponible como ${tecnico.privacidad === 'public' ? 'público' : 'no listado'}.`
      );
    }
  } else {
    agregar(
      comprobaciones,
      'PRIVACIDAD',
      'Video público',
      'no_verificable',
      'La fuente consultada no informa el estado de privacidad.'
    );
  }

  if (tecnico.uploadStatus) {
    agregar(
      comprobaciones,
      'PROCESAMIENTO',
      'Video procesado',
      tecnico.uploadStatus === 'processed' ? 'pasa' : 'falla',
      tecnico.uploadStatus === 'processed'
        ? 'YouTube informa que el video terminó de procesarse.'
        : `Estado de procesamiento: ${tecnico.uploadStatus}.`
    );
  } else {
    agregar(
      comprobaciones,
      'PROCESAMIENTO',
      'Video procesado',
      'no_verificable',
      'La fuente consultada no informa el estado de procesamiento.'
    );
  }

  if (tecnico.embedPermitido === true) {
    agregar(
      comprobaciones,
      'INSERCION',
      'Reproducción integrada permitida',
      'pasa',
      'YouTube autoriza la reproducción mediante reproductor integrado.'
    );
  } else if (tecnico.embedPermitido === false) {
    agregar(
      comprobaciones,
      'INSERCION',
      'Reproducción integrada permitida',
      'falla',
      'El propietario deshabilitó la reproducción integrada. Se ofrecerá el enlace externo.'
    );
  } else {
    agregar(
      comprobaciones,
      'INSERCION',
      'Reproducción integrada permitida',
      'no_verificable',
      'No se pudo verificar si el video permite inserción.'
    );
  }

  if (tecnico.regionPermitida === true) {
    agregar(
      comprobaciones,
      'REGION',
      `Disponible en ${region}`,
      'pasa',
      `Sin restricciones regionales conocidas para ${region}.`
    );
  } else if (tecnico.regionPermitida === false) {
    agregar(
      comprobaciones,
      'REGION',
      `Disponible en ${region}`,
      'falla',
      `El video tiene restricciones regionales que impiden verlo en ${region}.`
    );
  } else {
    agregar(
      comprobaciones,
      'REGION',
      `Disponible en ${region}`,
      'no_verificable',
      `No se pudo verificar la disponibilidad regional en ${region}.`
    );
  }

  if (tecnico.duracionVerificada) {
    agregar(
      comprobaciones,
      'DURACION',
      'Duración verificada',
      'pasa',
      'La duración proviene de una fuente oficial.'
    );
  } else {
    agregar(
      comprobaciones,
      'DURACION',
      'Duración verificada',
      'no_verificable',
      'La duración no pudo verificarse.',
      false
    );
  }

  if (tecnico.idiomaVerificado) {
    agregar(
      comprobaciones,
      'IDIOMA',
      'Idioma verificado',
      'pasa',
      'El idioma proviene de una fuente oficial o de revisión manual.'
    );
  } else {
    agregar(
      comprobaciones,
      'IDIOMA',
      'Idioma verificado',
      'no_verificable',
      'El idioma se evaluará con metadatos y heurística.',
      false
    );
  }

  const fallaCritica = comprobaciones.some(
    (comprobacion) => comprobacion.critica && comprobacion.resultado === 'falla'
  );
  const pendienteCritica = comprobaciones.some(
    (comprobacion) => comprobacion.critica && comprobacion.resultado === 'no_verificable'
  );

  return {
    superada: !fallaCritica && !pendienteCritica,
    comprobaciones,
    existe: tecnico.existe,
    privacidad: tecnico.privacidad,
    embedPermitido: tecnico.embedPermitido,
    regionPermitida: tecnico.regionPermitida,
    duracionVerificada: tecnico.duracionVerificada,
    idiomaVerificado: tecnico.idiomaVerificado,
    fuente: tecnico.fuente,
  };
}
