/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Constantes de Recursos Educativos
 * ARCHIVO: src/lib/educational-resources/constants.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Reúne los parámetros auditables del sistema de recursos audiovisuales:
 * versión de criterios, vencimientos de caché, límites de reportes, umbrales
 * de validación y listas de seguridad. Al centralizarlos, cualquier cambio de
 * política queda trazado por una única versión de criterios.
 * ==============================================================================
 */

/** Versión vigente de las reglas de validación técnica y académica. */
export const VERSION_CRITERIOS = 'WA-RECURSOS-2026.10.2';

/**
 * Versión del motor de búsqueda semántica. Se incluye en la clave de caché
 * para invalidar recomendaciones generadas con la búsqueda anterior sin
 * invalidar las aprobaciones manuales vigentes.
 */
export const VERSION_MOTOR_SEMANTICO = 'WA-SEMANTICA-2026.10.1';

/** Vigencia de una recomendación validada (6 horas). */
export const TTL_RECOMENDACIONES_MS = 6 * 60 * 60 * 1000;

/** Vigencia de una búsqueda sin resultados válidos (30 minutos). */
export const TTL_SIN_RESULTADOS_MS = 30 * 60 * 1000;

/** Antigüedad máxima de una caché usada como respaldo si YouTube falla. */
export const MAX_ANTIGUEDAD_RESPALDO_MS = 7 * 24 * 60 * 60 * 1000;

/** Máximo de contextos almacenados en la caché en memoria. */
export const MAX_ENTRADAS_CACHE = 200;

/** Máximo de videos validados devueltos al panel. */
export const MAX_RECURSOS_VALIDADOS = 4;

/** Máximo de videos pendientes devueltos como alternativas. */
export const MAX_RECURSOS_PENDIENTES = 3;

/** Resultados solicitados a YouTube por cada búsqueda contextual. */
export const MAX_RESULTADOS_BUSQUEDA = 10;

/** Consultas semánticas máximas por recomendación (controla la cuota). */
export const MAX_CONSULTAS_BUSQUEDA_API = 2;

/** Si la primera consulta devuelve menos, se intenta la consulta de refuerzo. */
export const MIN_RESULTADOS_ANTES_DE_AMPLIAR = 6;

/** Tiempo máximo de espera para la API de YouTube. */
export const TIMEOUT_API_YOUTUBE_MS = 8_000;

/** Tiempo máximo de espera para oEmbed. */
export const TIMEOUT_OEMBED_MS = 6_000;

/** Umbral mínimo de puntuación académica para considerar un video validado. */
export const UMBRAL_VALIDACION_ACADEMICA = 70;

/** Umbral mínimo para conservar un video como pendiente de revisión. */
export const UMBRAL_PENDIENTE_ACADEMICO = 45;

/** Límite de reportes por usuario anónimo en una ventana corta. */
export const LIMITE_REPORTES_CORTO = 6;
export const VENTANA_REPORTES_CORTA_MS = 10 * 60 * 1000;

/** Límite de reportes por usuario anónimo en un día. */
export const LIMITE_REPORTES_DIARIO = 20;
export const VENTANA_REPORTES_DIARIA_MS = 24 * 60 * 60 * 1000;

/** Límite de validaciones manuales de enlaces por ventana. */
export const LIMITE_VALIDACIONES_ENLACE = 20;
export const VENTANA_VALIDACIONES_MS = 10 * 60 * 1000;

/** Límite de peticiones de recomendaciones por IP. */
export const LIMITE_RECOMENDACIONES = 30;
export const VENTANA_RECOMENDACIONES_MS = 10 * 60 * 1000;

/** Ventana para deduplicar reportes idénticos del mismo usuario. */
export const VENTANA_DEDUPE_REPORTE_MS = 10 * 60 * 1000;

/** Ventana para contar reportantes distintos de un mismo video. */
export const VENTANA_REPORTANTES_MS = 24 * 60 * 60 * 1000;

/** Cuarentena aplicada cuando dos reportantes coinciden. */
export const DURACION_CUARENTENA_MS = 24 * 60 * 60 * 1000;

/** Tiempo durante el cual un recurso ambiguo queda en comprobación. */
export const DURACION_EN_COMPROBACION_MS = 6 * 60 * 60 * 1000;

/** Retención máxima de reportes, sustituciones y auditoría (180 días). */
export const RETENCION_REGISTROS_MS = 180 * 24 * 60 * 60 * 1000;

/** Máximo de sustituciones automáticas por contexto en una ventana. */
export const MAX_SUSTITUCIONES_POR_CONTEXTO = 3;
export const VENTANA_SUSTITUCIONES_MS = 6 * 60 * 60 * 1000;

/** Cantidad máxima de reportes y eventos conservados en memoria. */
export const MAX_REPORTES_ALMACENADOS = 2_000;
export const MAX_AUDITORIA_ALMACENADA = 1_000;

/** Cantidad máxima de candidatos en la cola de revisión docente. */
export const MAX_CANDIDATOS_REVISION = 500;

/** Región usada para comprobar restricciones de reproducción. */
export const REGION_POR_DEFECTO = 'EC';

/**
 * Términos que obligan a rechazar un video en un entorno escolar. La lista es
 * deliberadamente conservadora: un falso positivo es preferible a exponer a un
 * estudiante a contenido inadecuado.
 */
/**
 * Señales publicitarias en el título. Un video educativo puede mencionar su
 * curso, pero no debe recomendarse un anuncio con descuentos u ofertas.
 */
export const TERMINOS_COMERCIALES_TITULO = [
  'compra ahora',
  'descuento',
  'oferta',
  'promocion',
  'promoción',
  'patrocinado',
  'sponsored',
  'buy now',
  'sale',
  'precio especial',
  'curso pago',
];

export const TERMINOS_INSEGUROS = [
  'pornografia',
  'pornografía',
  'porno',
  'xxx',
  'onlyfans',
  'desnudo',
  'desnuda',
  'sexo explicito',
  'sexo explícito',
  'contenido adulto',
  'adult content',
  'nude',
  'porn',
  'explicit content',
  'casino',
  'apuestas deportivas',
  'betting',
  'suicidio',
  'suicide',
  'gore',
  ' violencia explicita',
  'violencia explícita',
  'snuff',
  'terrorismo',
  'asesinato',
];

/**
 * Señales de intención didáctica en título, descripción o canal. No prueban la
 * calidad del video por sí solas, pero evitan recomendar clips puramente
 * musicales o publicitarios que solo mencionan el tema.
 */
export const SENALES_DIDACTICAS = [
  'explic',
  'aprend',
  'clase',
  'tutorial',
  'educa',
  'paso a paso',
  'ejercicio',
  'curso',
  'leccion',
  'lección',
  'profesor',
  'profe',
  'enseñ',
  'ensen',
  'didactic',
  'didáctic',
  'primaria',
  'secundaria',
  'colegio',
  'escuela',
  'lesson',
  'learn',
  'explain',
  'tutorial',
  'course',
  'teacher',
  'school',
  'grade',
  'math',
  'matematic',
];

/**
 * Límites de duración por edad. Los videos demasiado cortos no alcanzan a
 * desarrollar un concepto; los excesivamente largos no son adecuados para una
 * pausa de estudio complementaria.
 */
export function limitesDuracionPorEdad(edad: number): {
  minimoSegundos: number;
  idealMaximoSegundos: number;
  maximoAbsolutoSegundos: number;
} {
  if (edad <= 10) {
    return {
      minimoSegundos: 45,
      idealMaximoSegundos: 20 * 60,
      maximoAbsolutoSegundos: 60 * 60,
    };
  }
  if (edad <= 15) {
    return {
      minimoSegundos: 60,
      idealMaximoSegundos: 35 * 60,
      maximoAbsolutoSegundos: 90 * 60,
    };
  }
  return {
    minimoSegundos: 60,
    idealMaximoSegundos: 60 * 60,
    maximoAbsolutoSegundos: 120 * 60,
  };
}
