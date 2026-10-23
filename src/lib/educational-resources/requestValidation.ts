/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Validación de Entradas de Recursos
 * ARCHIVO: src/lib/educational-resources/requestValidation.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Sanitiza todo lo que llega a las rutas API antes de tocar el servicio:
 * contexto académico, reportes y enlaces de YouTube. También genera el hash
 * anónimo usado por los límites de frecuencia, sin almacenar direcciones IP.
 * ==============================================================================
 */

import { createHash } from 'crypto';
import type {
  AprobarRecursoPayload,
  ConfirmacionesAprobacion,
  ContextoAcademico,
  ReporteVideoPayload,
  TipoIncidenciaVideo,
} from '@/types/educationalResources';
import { esIdYouTubeValido, extraerIdYouTube, sanitizarTexto } from './text';

export type ResultadoSanitizacion<T> =
  | { ok: true; valor: T }
  | { ok: false; errores: string[] };

/** Tipos de incidencia admitidos; cualquier otro valor se rechaza. */
const TIPOS_INCIDENCIA: TipoIncidenciaVideo[] = [
  'NO_REPRODUCE',
  'ENLACE_ROTO',
  'ELIMINADO_O_PRIVADO',
  'NO_CORRESPONDE_TEMA',
  'IDIOMA_INCORRECTO',
  'CONTENIDO_INAPROPIADO',
  'OTRO',
];

/** Normaliza una lista de textos recortando cantidad y longitud. */
function sanitizarLista(
  valor: unknown,
  maximoElementos: number,
  maximoCaracteres: number
): string[] {
  if (!Array.isArray(valor)) return [];
  return valor
    .map((item) => sanitizarTexto(item, maximoCaracteres))
    .filter(Boolean)
    .slice(0, maximoElementos);
}

/**
 * Convierte una entrada no confiable en un contexto académico estricto.
 * Se descartan propiedades adicionales para no propagar datos personales.
 */
export function sanitizarContextoAcademico(
  entrada: unknown
): ResultadoSanitizacion<ContextoAcademico> {
  if (!entrada || typeof entrada !== 'object') {
    return { ok: false, errores: ['El contexto académico es obligatorio.'] };
  }

  const valor = entrada as Record<string, unknown>;
  const asignatura = sanitizarTexto(valor.asignatura, 120);
  const unidadOriginal = sanitizarTexto(valor.unidad, 160);
  const temaOriginal = sanitizarTexto(valor.tema, 160);
  const unidad = unidadOriginal || temaOriginal;
  const tema = temaOriginal || unidadOriginal;
  const curso = sanitizarTexto(valor.curso, 60);
  const nivel = sanitizarTexto(valor.nivel, 60);
  const edad = Number(valor.edad);
  const idioma = valor.idioma === 'en' ? 'en' : 'es';
  const errores: string[] = [];

  if (asignatura.length < 2) errores.push('La asignatura es obligatoria.');
  if (tema.length < 2 || unidad.length < 2) {
    errores.push('La unidad y el tema de la clase son obligatorios.');
  }
  if (!curso) errores.push('El curso o grado es obligatorio.');
  if (!nivel) errores.push('El nivel educativo es obligatorio.');
  if (!Number.isInteger(edad) || edad < 3 || edad > 25) {
    errores.push('La edad debe ser un número entero entre 3 y 25.');
  }

  if (errores.length > 0) return { ok: false, errores };

  const diapositivaNumero = Number(valor.diapositiva);
  const diapositiva =
    Number.isInteger(diapositivaNumero) && diapositivaNumero >= 1 && diapositivaNumero <= 200
      ? diapositivaNumero
      : undefined;

  return {
    ok: true,
    valor: {
      edad,
      nivel,
      curso,
      asignatura,
      area: sanitizarTexto(valor.area, 60) || undefined,
      unidad,
      tema,
      subtema: sanitizarTexto(valor.subtema, 180) || undefined,
      objetivos: sanitizarLista(valor.objetivos, 8, 240),
      conceptos: sanitizarLista(valor.conceptos, 8, 160),
      idioma,
      diapositiva,
      fase: sanitizarTexto(valor.fase, 80) || undefined,
      contenidoDiapositiva:
        sanitizarTexto(valor.contenidoDiapositiva, 800) || undefined,
    },
  };
}

/** Construye un contexto desde parámetros GET, útil para diagnóstico. */
export function contextoDesdeParametros(
  parametros: URLSearchParams
): ResultadoSanitizacion<ContextoAcademico> {
  return sanitizarContextoAcademico({
    edad: parametros.get('edad'),
    nivel: parametros.get('nivel'),
    curso: parametros.get('curso'),
    asignatura: parametros.get('materia') || parametros.get('asignatura'),
    unidad: parametros.get('unidad'),
    tema: parametros.get('tema'),
    subtema: parametros.get('subtema'),
    area: parametros.get('area'),
    objetivos: (parametros.get('objetivos') || '').split('|'),
    conceptos: (parametros.get('conceptos') || '').split('|'),
    idioma: parametros.get('idioma'),
    diapositiva: parametros.get('diapositiva'),
    fase: parametros.get('fase'),
    contenidoDiapositiva: parametros.get('contenido'),
  });
}

/** Sanitiza y valida un reporte de video. */
export function sanitizarReporteVideo(
  entrada: unknown
): ResultadoSanitizacion<ReporteVideoPayload> {
  if (!entrada || typeof entrada !== 'object') {
    return { ok: false, errores: ['El reporte es obligatorio.'] };
  }
  const valor = entrada as Record<string, unknown>;
  const id = extraerIdYouTube(valor.videoId);
  if (!id) {
    return { ok: false, errores: ['El identificador del video no es válido.'] };
  }

  const tipo = valor.tipo;
  if (typeof tipo !== 'string' || !TIPOS_INCIDENCIA.includes(tipo as TipoIncidenciaVideo)) {
    return { ok: false, errores: ['El tipo de incidencia no es válido.'] };
  }

  const contexto = sanitizarContextoAcademico(valor.contexto);
  if (!contexto.ok) return contexto;

  return {
    ok: true,
    valor: {
      videoId: id,
      tipo: tipo as TipoIncidenciaVideo,
      comentario: sanitizarTexto(valor.comentario, 240) || undefined,
      contexto: contexto.valor,
    },
  };
}

/** Sanitiza un cuerpo con un enlace o identificador y un contexto. */
export function sanitizarEnlaceYContexto(
  entrada: unknown
): ResultadoSanitizacion<{ videoId: string; contexto: ContextoAcademico }> {
  if (!entrada || typeof entrada !== 'object') {
    return { ok: false, errores: ['La solicitud es obligatoria.'] };
  }
  const valor = entrada as Record<string, unknown>;
  const id = extraerIdYouTube(valor.videoId || valor.url);
  if (!id || !esIdYouTubeValido(id)) {
    return { ok: false, errores: ['El enlace no corresponde a un video válido de YouTube.'] };
  }
  const contexto = sanitizarContextoAcademico(valor.contexto);
  if (!contexto.ok) return contexto;
  return { ok: true, valor: { videoId: id, contexto: contexto.valor } };
}

/**
 * Sanitiza el cuerpo de una aprobación docente. Las seis confirmaciones deben
 * venir explícitamente como `true`; no se aceptan valores por defecto.
 */
export function sanitizarAprobacionRecurso(
  entrada: unknown
): ResultadoSanitizacion<AprobarRecursoPayload> {
  if (!entrada || typeof entrada !== 'object') {
    return { ok: false, errores: ['La solicitud de aprobación es obligatoria.'] };
  }
  const valor = entrada as Record<string, unknown>;
  const id = extraerIdYouTube(valor.videoId || valor.url);
  if (!id || !esIdYouTubeValido(id)) {
    return { ok: false, errores: ['El identificador del video no es válido.'] };
  }

  const contexto = sanitizarContextoAcademico(valor.contexto);
  if (!contexto.ok) return contexto;

  const revisor = sanitizarTexto(valor.revisor, 120);
  const evidencia = sanitizarTexto(valor.evidencia, 600);
  if (revisor.length < 2) {
    return { ok: false, errores: ['Indica el nombre del revisor.'] };
  }
  if (evidencia.length < 10) {
    return {
      ok: false,
      errores: ['Describe la evidencia de revisión (mínimo 10 caracteres).'],
    };
  }

  const crudo = (valor.confirmaciones || {}) as Record<string, unknown>;
  const confirmaciones: ConfirmacionesAprobacion = {
    pertinencia: crudo.pertinencia === true,
    idioma: crudo.idioma === true,
    nivel: crudo.nivel === true,
    seguridad: crudo.seguridad === true,
    insercion: crudo.insercion === true,
    region: crudo.region === true,
  };
  if (!Object.values(confirmaciones).every(Boolean)) {
    return {
      ok: false,
      errores: [
        'Debes confirmar pertinencia, idioma, nivel, seguridad, inserción y región.',
      ],
    };
  }

  return {
    ok: true,
    valor: {
      videoId: id,
      contexto: contexto.valor,
      revisor,
      evidencia,
      confirmaciones,
    },
  };
}

/**
 * Genera un identificador anónimo y estable por cliente. No se guarda la IP ni
 * el user-agent; solo un hash truncado con sal de servidor.
 */
export function hashCliente(
  identificador: string,
  sal = process.env.EDUCATIONAL_RESOURCE_RATE_LIMIT_SALT ||
    'wisdom-academy-recursos'
): string {
  return createHash('sha256')
    .update(`${sal}:${identificador}`)
    .digest('hex')
    .slice(0, 20);
}

/** Extrae una IP de los encabezados de proxy sin confiar en el cliente. */
export function obtenerIdentificadorRed(cabeceras: Headers): string {
  const reenviada = cabeceras.get('x-forwarded-for');
  if (reenviada) return reenviada.split(',')[0].trim();
  return (
    cabeceras.get('x-real-ip') ||
    cabeceras.get('cf-connecting-ip') ||
    cabeceras.get('x-vercel-forwarded-for') ||
    'local'
  );
}

/** Devuelve un hash anónimo listo para limitadores y auditoría. */
export function identificarSolicitante(cabeceras: Headers): string {
  return hashCliente(obtenerIdentificadorRed(cabeceras));
}
