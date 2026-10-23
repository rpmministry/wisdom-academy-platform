/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Validador Académico de Videos
 * ARCHIVO: src/lib/educational-resources/academicValidator.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Contrasta los metadatos verificables de un video (título, descripción, canal,
 * idioma declarado y duración) con el contexto curricular real de la clase.
 * No afirma haber analizado el contenido completo: el nivel de evidencia se
 * declara explícitamente y la validación exige idioma comprobable, señales
 * didácticas y cobertura suficiente del tema.
 *
 * El resultado es determinista y auditable para que las pruebas y la caché
 * reproduzcan exactamente la misma clasificación.
 * ==============================================================================
 */

import type {
  CandidatoVideo,
  ContextoAcademico,
  NivelEvidenciaAcademica,
  ValidacionAcademica,
} from '@/types/educationalResources';
import {
  SENALES_DIDACTICAS,
  TERMINOS_COMERCIALES_TITULO,
  TERMINOS_INSEGUROS,
  UMBRAL_PENDIENTE_ACADEMICO,
  UMBRAL_VALIDACION_ACADEMICA,
  VERSION_CRITERIOS,
  limitesDuracionPorEdad,
} from './constants';
import {
  detectarIdiomaHeuristico,
  formatearDuracion,
  normalizarComparacion,
} from './text';
import {
  construirPerfilSemantico,
  evaluarCoincidenciaSemantica,
} from './semanticSearch';

/** Convierte una fecha en ISO seguro; si es inválida, usa el instante actual. */
function fechaISO(ahora: Date): string {
  return Number.isNaN(ahora.getTime()) ? new Date().toISOString() : ahora.toISOString();
}

/** Indica si el idioma declarado por YouTube corresponde al de la clase. */
function idiomaDeclaradoCompatible(
  declarado: string | undefined,
  esperado: 'es' | 'en'
): boolean | undefined {
  if (!declarado) return undefined;
  const normalizado = declarado.toLowerCase().trim();
  if (!normalizado) return undefined;
  return normalizado.startsWith(esperado);
}

/** Comprueba si el título o la descripción contienen términos inseguros. */
function contieneTerminosInseguros(texto: string): string[] {
  const normalizado = normalizarComparacion(texto);
  return TERMINOS_INSEGUROS.filter((termino) =>
    normalizado.includes(normalizarComparacion(termino).trim())
  );
}

/** Detecta señales de intención didáctica en los metadatos. */
function detectarSenalesDidacticas(texto: string): string[] {
  const normalizado = normalizarComparacion(texto);
  return SENALES_DIDACTICAS.filter((senal) => normalizado.includes(normalizarComparacion(senal)));
}

/**
 * Evalúa la pertinencia académica. Reglas duras:
 * - Un idioma declarado incompatible con la clase rechaza el video.
 * - Un término inseguro rechaza el video.
 * - La ausencia de evidencia de idioma impide declararlo validado.
 * - La falta de correspondencia con el tema impide presentarlo como recomendado.
 */
export function evaluarPertinenciaAcademica(
  candidato: CandidatoVideo,
  contexto: ContextoAcademico,
  ahora: Date = new Date()
): ValidacionAcademica {
  const titulo = candidato.titulo || '';
  const descripcion = candidato.descripcion || '';
  const canal = candidato.canal || '';
  const textoCompleto = `${titulo} ${descripcion} ${canal}`;
  const motivos: string[] = [];
  const senales: string[] = [];

  const perfilSemantico = construirPerfilSemantico(contexto);
  const coincidencia = evaluarCoincidenciaSemantica(candidato, perfilSemantico);

  const coberturaTitulo = coincidencia.coberturaTitulo;
  const coberturaTema = coincidencia.coberturaTema;
  const coberturaConcepto = coincidencia.coberturaConcepto;
  const coberturaObjetivos = coincidencia.coberturaContenido;

  if (perfilSemantico.tokensTema.size === 0) {
    return {
      superada: false,
      puntuacion: 0,
      coberturaTitulo: 0,
      coberturaTema: 0,
      nivelEvidencia: 'ninguna',
      idiomaEvidencia: 'desconocido',
      senales,
      motivos: ['El contexto curricular no contiene un tema verificable.'],
      rechazoDuro: true,
      versionCriterios: VERSION_CRITERIOS,
      fechaValidacion: fechaISO(ahora),
    };
  }

  // 1. Seguridad del contenido declarado en los metadatos.
  const terminosInseguros = contieneTerminosInseguros(textoCompleto);
  if (terminosInseguros.length > 0) {
    return {
      superada: false,
      puntuacion: 0,
      coberturaTitulo,
      coberturaTema,
      nivelEvidencia: 'metadatos',
      idiomaEvidencia: 'desconocido',
      senales,
      motivos: [
        'Los metadatos contienen términos incompatibles con un entorno escolar.',
      ],
      rechazoDuro: true,
      versionCriterios: VERSION_CRITERIOS,
      fechaValidacion: fechaISO(ahora),
    };
  }

  // 2. Idioma: se prioriza el idioma declarado; si no existe, heurística.
  const compatibilidadDeclarada = idiomaDeclaradoCompatible(
    candidato.idiomaDeclarado,
    contexto.idioma
  );
  const idiomaHeuristico = detectarIdiomaHeuristico(titulo, descripcion);
  let idiomaEvidencia: ValidacionAcademica['idiomaEvidencia'] = 'desconocido';
  let idiomaAceptado = false;
  let rechazoDuro = false;

  // 2b. Señales publicitarias en el título: no se recomiendan anuncios.
  const terminosComerciales = TERMINOS_COMERCIALES_TITULO.filter((termino) =>
    normalizarComparacion(titulo).includes(normalizarComparacion(termino))
  );
  if (terminosComerciales.length > 0) {
    senales.push('Título con señales publicitarias.');
    motivos.push(
      'El título contiene señales publicitarias incompatibles con una recomendación académica.'
    );
    rechazoDuro = true;
  }

  const revisionManual = candidato.curado?.revisionManual;
  const revisionVigente = revisionManual
    ? (() => {
        const fecha = new Date(revisionManual.fecha);
        if (Number.isNaN(fecha.getTime())) return false;
        const dias = (ahora.getTime() - fecha.getTime()) / (1000 * 60 * 60 * 24);
        // La revisión debe haberse realizado con la versión vigente de los
        // criterios; de lo contrario no se usa como evidencia actual.
        return (
          dias >= 0 &&
          dias <= 365 &&
          revisionManual.versionCriterios === VERSION_CRITERIOS
        );
      })()
    : false;

  if (compatibilidadDeclarada === true) {
    idiomaEvidencia = 'declarado';
    idiomaAceptado = true;
    motivos.push(`Idioma declarado compatible con la clase (${contexto.idioma}).`);
  } else if (compatibilidadDeclarada === false) {
    motivos.push(
      `El idioma declarado (${candidato.idiomaDeclarado}) no corresponde al idioma de la clase (${contexto.idioma}).`
    );
    rechazoDuro = true;
  } else if (
    revisionManual &&
    revisionVigente &&
    (revisionManual.alcance === 'academico' || revisionManual.alcance === 'ambos')
  ) {
    idiomaEvidencia = 'manual';
    idiomaAceptado = true;
    motivos.push('Idioma verificado durante la revisión manual del recurso.');
  } else if (idiomaHeuristico.idioma === contexto.idioma && idiomaHeuristico.confianza === 'alta') {
    idiomaEvidencia = 'heuristica';
    idiomaAceptado = true;
    motivos.push('Idioma compatible según análisis heurístico de los metadatos.');
  } else if (idiomaHeuristico.idioma !== 'desconocido' && idiomaHeuristico.confianza === 'alta') {
    motivos.push(
      `El idioma detectado (${idiomaHeuristico.idioma}) no corresponde al idioma de la clase (${contexto.idioma}).`
    );
    rechazoDuro = true;
  } else if (idiomaHeuristico.idioma === contexto.idioma) {
    motivos.push(
      'El idioma parece compatible, pero la evidencia es débil; el video queda pendiente de revisión.'
    );
  } else {
    motivos.push(
      'No hay evidencia suficiente para verificar el idioma hablado del video.'
    );
  }

  // 3. Señales didácticas y calidad de los metadatos.
  const senalesDidacticas = detectarSenalesDidacticas(textoCompleto);
  const tieneSenalDidactica = senalesDidacticas.length > 0;
  if (tieneSenalDidactica) {
    senales.push(`Señal didáctica: ${senalesDidacticas.slice(0, 3).join(', ')}.`);
    motivos.push('Los metadatos contienen señales de intención educativa.');
  } else {
    motivos.push('No se detectaron señales didácticas claras en los metadatos.');
  }

  const letras = titulo.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  const mayusculas = titulo.replace(/[^A-ZÁÉÍÓÚÜÑ]/g, '');
  const proporcionMayusculas = letras.length > 12 ? mayusculas.length / letras.length : 0;
  if (proporcionMayusculas > 0.7) {
    senales.push('Título con proporción alta de mayúsculas (posible sensacionalismo).');
  }

  // 4. Duración pedagógicamente adecuada.
  const limites = limitesDuracionPorEdad(contexto.edad);
  let duracionAdecuada = false;
  if (candidato.duracionSegundos) {
    const duracion = candidato.duracionSegundos;
    duracionAdecuada =
      duracion >= limites.minimoSegundos && duracion <= limites.idealMaximoSegundos;
    if (duracion < 30 || duracion > limites.maximoAbsolutoSegundos) {
      motivos.push(
        `La duración (${formatearDuracion(duracion) || `${duracion}s`}) no es compatible con una pausa de estudio del nivel.`
      );
      rechazoDuro = true;
    } else if (duracionAdecuada) {
      motivos.push(`Duración adecuada para el nivel: ${formatearDuracion(duracion)}.`);
    } else {
      motivos.push(
        `Duración extensa para el nivel (${formatearDuracion(duracion)}); puede usarse por secciones.`
      );
    }
  } else {
    motivos.push('La duración no pudo verificarse.');
  }

  // 5. Puntuación semántica ponderada. La materia y el nivel no suman: solo
  //    cuentan el tema puntual, sus conceptos, las frases del material y las
  //    señales didácticas verificables.
  const puntosTitulo = coberturaTitulo * 30;
  const puntosTema = coberturaTema * 25;
  const puntosConcepto = coberturaConcepto * 15;
  const puntosContenido = coberturaObjetivos * 5;
  const puntosFrases = coincidencia.coberturaFrases * 10;
  const puntosFraseExacta = coincidencia.fraseTemaExacta ? 10 : 0;
  // Un video cuyo título es genérico pero cuya descripción cubre todo el tema
  // sigue siendo pertinente. La evidencia se apoya en el texto completo, no
  // solo en el título.
  const puntosDescripcionCompleta =
    coberturaTitulo < 0.75 && coberturaTema >= 0.9 ? 15 : 0;
  const puntosSenal = tieneSenalDidactica ? 10 : 0;
  const puntosIdioma = idiomaAceptado ? 5 : 0;
  const puntosDuracion = duracionAdecuada ? 5 : 0;
  const penalizacionMayusculas = proporcionMayusculas > 0.7 ? 8 : 0;

  const puntuacionBase = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        puntosTitulo +
          puntosTema +
          puntosConcepto +
          puntosContenido +
          puntosFrases +
          puntosFraseExacta +
          puntosDescripcionCompleta +
          puntosSenal +
          puntosIdioma +
          puntosDuracion -
          penalizacionMayusculas
      )
    )
  );

  const revisionAcademica =
    Boolean(revisionManual) &&
    revisionVigente &&
    (revisionManual?.alcance === 'academico' || revisionManual?.alcance === 'ambos');

  // Una revisión manual vigente es la evidencia principal. No se inventa:
  // fue registrada por un responsable y queda auditada en el catálogo.
  const puntuacion = revisionAcademica ? Math.max(85, puntuacionBase) : puntuacionBase;

  motivos.push(
    `Coincidencia del tema en el título: ${Math.round(coberturaTitulo * 100)}%.`
  );
  motivos.push(
    `Cobertura del tema en título y descripción: ${Math.round(coberturaTema * 100)}%.`
  );
  motivos.push(
    `Correspondencia con el contenido de la lección: ${Math.round(
      (coberturaConcepto * 0.5 + coberturaObjetivos * 0.5) * 100
    )}%.`
  );

  if (coincidencia.frasesCoincidentes.length > 0) {
    motivos.push(
      `Frases del material encontradas: ${coincidencia.frasesCoincidentes
        .slice(0, 3)
        .join('; ')}.`
    );
  }

  if (coberturaTitulo === 0 && coberturaTema > 0) {
    motivos.push(
      'El tema no aparece literalmente en el título, pero sí en la descripción o en los temas curados del video.'
    );
  }

  if (!coincidencia.coincidenciaNucleo) {
    motivos.push(
      'Los metadatos no demuestran correspondencia con el tema puntual de la lección.'
    );
    if (!revisionAcademica) rechazoDuro = true;
  }

  // 6. Evidencia académica: la revisión manual prevalece sobre la heurística.
  let nivelEvidencia: NivelEvidenciaAcademica = 'metadatos';
  if (
    revisionManual &&
    revisionVigente &&
    (revisionManual.alcance === 'academico' || revisionManual.alcance === 'ambos')
  ) {
    nivelEvidencia = 'revision_manual';
    motivos.push(
      `Revisión manual registrada por ${revisionManual.validador} con evidencia declarada.`
    );
  }

  const cumpleIdioma =
    idiomaAceptado &&
    (idiomaEvidencia === 'declarado' ||
      idiomaEvidencia === 'manual' ||
      (idiomaEvidencia === 'heuristica' && idiomaHeuristico.confianza === 'alta'));

  if (revisionAcademica) {
    motivos.push(
      'La validación se apoya en la revisión manual vigente; la cobertura de metadatos queda como información complementaria.'
    );
  }

  const superada = revisionAcademica
    ? !rechazoDuro && cumpleIdioma
    : !rechazoDuro &&
      cumpleIdioma &&
      tieneSenalDidactica &&
      coincidencia.coincidenciaNucleo &&
      puntuacionBase >= UMBRAL_VALIDACION_ACADEMICA;

  if (!superada && !rechazoDuro) {
    if (puntuacionBase >= UMBRAL_PENDIENTE_ACADEMICO) {
      motivos.push('El recurso no alcanza la evidencia exigida; queda pendiente de revisión.');
    } else {
      motivos.push('El recurso no demuestra correspondencia suficiente con el tema.');
    }
  }

  return {
    superada,
    puntuacion,
    coberturaTitulo,
    coberturaTema,
    nivelEvidencia,
    idiomaEvidencia,
    senales,
    motivos,
    rechazoDuro: revisionAcademica
      ? rechazoDuro
      : rechazoDuro || puntuacionBase < UMBRAL_PENDIENTE_ACADEMICO,
    versionCriterios: VERSION_CRITERIOS,
    fechaValidacion: fechaISO(ahora),
  };
}
