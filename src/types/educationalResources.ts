/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Modelo de Recursos Educativos Audiovisuales
 * ARCHIVO: src/types/educationalResources.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Define el contrato compartido entre el aula OpenMAIC, el panel lateral de
 * recursos, los servicios de búsqueda/validación y las rutas API. El modelo
 * separa explícitamente:
 * 1. El contexto académico real de la clase (sin datos personales del alumno).
 * 2. Los metadatos verificables del video y su evidencia de validación.
 * 3. El resultado de reportes, cuarentenas y sustituciones automáticas.
 *
 * REGLA DE HONESTIDAD:
 * Un recurso solo puede declararse `VALIDADO` cuando superó los controles
 * técnicos y existe evidencia académica suficiente. La evidencia basada en
 * metadatos públicos nunca se presenta como análisis del video completo.
 * ==============================================================================
 */

/** Idioma en el que se imparte la clase y en el que se prioriza la búsqueda. */
export type IdiomaContenido = 'es' | 'en';

/** Clasificación interna exigida por el protocolo de validación. */
export type EstadoValidacionRecurso =
  | 'VALIDADO'
  | 'PENDIENTE_REVISION'
  | 'RECHAZADO'
  | 'RETIRADO_TEMPORAL';

/** Nivel de evidencia académica realmente disponible para una recomendación. */
export type NivelEvidenciaAcademica =
  | 'revision_manual'
  | 'metadatos'
  | 'transcripcion'
  | 'ninguna';

/** Origen verificable de un recurso audiovisual. */
export type OrigenRecurso =
  | 'youtube_api'
  | 'catalogo_curado'
  | 'enlace_manual';

/** Modo de funcionamiento del proveedor de búsqueda. */
export type ModoProveedorRecursos =
  | 'youtube_api'
  | 'catalogo_curado'
  | 'solo_enlaces';

/** Estado de una comprobación individual de validación técnica. */
export type ResultadoComprobacion = 'pasa' | 'falla' | 'no_verificable';

/**
 * Contexto académico mínimo necesario para buscar y validar recursos.
 * No incluye nombre, correo ni identificador del estudiante: la selección de
 * videos depende del currículo, no de datos personales.
 */
export interface ContextoAcademico {
  edad: number;
  nivel: string;
  curso: string;
  asignatura: string;
  area?: string;
  unidad: string;
  tema: string;
  subtema?: string;
  objetivos: string[];
  conceptos: string[];
  idioma: IdiomaContenido;
  diapositiva?: number;
  fase?: string;
  contenidoDiapositiva?: string;
}

/** Comprobación atómica del proceso de validación. */
export interface ComprobacionValidacion {
  id: string;
  etiqueta: string;
  resultado: ResultadoComprobacion;
  detalle: string;
  critica: boolean;
}

/** Evidencia técnica recopilada desde YouTube o desde revisión manual. */
export interface ValidacionTecnica {
  superada: boolean;
  comprobaciones: ComprobacionValidacion[];
  existe: boolean;
  privacidad?: 'public' | 'private' | 'unlisted' | 'unknown';
  embedPermitido?: boolean;
  regionPermitida?: boolean;
  duracionVerificada?: boolean;
  idiomaVerificado?: boolean;
  fuente: 'youtube_api' | 'oembed' | 'curado' | 'desconocida';
}

/** Evidencia académica obtenida de metadatos, curaduría o transcripción. */
export interface ValidacionAcademica {
  superada: boolean;
  puntuacion: number;
  coberturaTitulo: number;
  coberturaTema: number;
  nivelEvidencia: NivelEvidenciaAcademica;
  idiomaEvidencia: 'declarado' | 'heuristica' | 'manual' | 'desconocido';
  senales: string[];
  motivos: string[];
  rechazoDuro: boolean;
  versionCriterios: string;
  fechaValidacion: string;
}

/** Resultado completo y auditable de la validación de un recurso. */
export interface ValidacionRecurso {
  versionCriterios: string;
  fechaValidacion: string;
  tecnica: ValidacionTecnica;
  academica: ValidacionAcademica;
}

/** Recurso audiovisual listo para mostrarse en el aula. */
export interface RecursoVideo {
  id: string;
  titulo: string;
  canal: string;
  url: string;
  embedUrl: string;
  miniaturaUrl: string;
  descripcion?: string;
  duracionSegundos?: number;
  duracionTexto?: string;
  idioma?: string;
  publicadoEn?: string;
  estado: EstadoValidacionRecurso;
  validacion: ValidacionRecurso;
  puntuacion: number;
  motivos: string[];
  origen: OrigenRecurso;
  reproduceIntegrado: boolean;
  busqueda?: string;
}

/** Resumen no personal del contexto devuelto al cliente. */
export interface ResumenContextoAcademico {
  asignatura: string;
  unidad: string;
  tema: string;
  curso: string;
  nivel: string;
  idioma: IdiomaContenido;
  diapositiva?: number;
}

/** Respuesta de la ruta de recomendaciones. */
export interface ResultadoRecomendaciones {
  ok: boolean;
  origen: ModoProveedorRecursos;
  contexto: ResumenContextoAcademico;
  claveContexto: string;
  consulta: string;
  busquedaUrl: string;
  generadoEn: string;
  expiraEn: string;
  cache: 'hit' | 'miss' | 'stale';
  recursos: RecursoVideo[];
  pendientes: RecursoVideo[];
  mensaje?: string;
  advertencia?: string;
  reintentarEnSegundos?: number;
}

/** Tipos de incidencia admitidos por el reporte de video. */
export type TipoIncidenciaVideo =
  | 'NO_REPRODUCE'
  | 'ENLACE_ROTO'
  | 'ELIMINADO_O_PRIVADO'
  | 'NO_CORRESPONDE_TEMA'
  | 'IDIOMA_INCORRECTO'
  | 'CONTENIDO_INAPROPIADO'
  | 'OTRO';

/** Cuerpo enviado por el estudiante al reportar un video. */
export interface ReporteVideoPayload {
  videoId: string;
  tipo: TipoIncidenciaVideo;
  comentario?: string;
  contexto: ContextoAcademico;
}

/** Resultado de un reporte y de la sustitución automática asociada. */
export interface ResultadoReporte {
  ok: boolean;
  registrado: boolean;
  duplicado: boolean;
  estadoRecurso: 'EN_COMPROBACION' | 'RETIRADO_TEMPORAL' | 'REPORTADO';
  mensaje: string;
  recursoSustituto?: RecursoVideo;
  busquedaUrl: string;
  sustitucion?: {
    encontrada: boolean;
    intentos: number;
    motivo: string;
  };
  reintentarEnSegundos?: number;
}

/** Respuesta de la validación de un enlace elegido por el estudiante. */
export interface ResultadoValidacionEnlace {
  ok: boolean;
  recurso?: RecursoVideo;
  mensaje: string;
  reintentarEnSegundos?: number;
}

/** Estado de un candidato dentro de la cola de revisión docente. */
export type EstadoCandidatoRevision =
  | 'PENDIENTE'
  | 'SOLICITADA'
  | 'APROBADA'
  | 'RECHAZADA';

/**
 * Candidato que espera revisión humana. Conserva el contexto completo y el
 * recurso con su evidencia para que el revisor pueda decidir sin re-buscar.
 */
export interface CandidatoRevision {
  id: string;
  contextoClave: string;
  contexto: ContextoAcademico;
  recurso: RecursoVideo;
  estado: EstadoCandidatoRevision;
  solicitudes: number;
  fechaCreacion: string;
  fechaActualizacion: string;
  notaRevision?: string;
}

/** Respuesta de una solicitud de revisión realizada desde el aula. */
export interface ResultadoSolicitudRevision {
  ok: boolean;
  mensaje: string;
  estado?: EstadoCandidatoRevision;
  reintentarEnSegundos?: number;
}

/** Confirmaciones explícitas del revisor antes de publicar un recurso. */
export interface ConfirmacionesAprobacion {
  pertinencia: boolean;
  idioma: boolean;
  nivel: boolean;
  seguridad: boolean;
  insercion: boolean;
  region: boolean;
}

/** Cuerpo administrativo para aprobar un video y convertirlo en curado. */
export interface AprobarRecursoPayload {
  videoId: string;
  contexto: ContextoAcademico;
  revisor: string;
  evidencia: string;
  confirmaciones: ConfirmacionesAprobacion;
}

/** Resultado de publicar un recurso revisado en el catálogo institucional. */
export interface ResultadoAprobacion {
  ok: boolean;
  mensaje: string;
  recursoCurado?: RecursoCurado;
}

/** Entrada de catálogo curada manualmente por el equipo académico. */
export interface RecursoCurado {
  id: string;
  titulo: string;
  canal: string;
  descripcion?: string;
  duracionSegundos?: number;
  idioma: IdiomaContenido;
  temas: string[];
  asignaturas?: string[];
  niveles?: string[];
  embedVerificado: boolean;
  regionPermitida?: boolean;
  privacidadVerificada?: 'public' | 'unlisted';
  revisionManual?: {
    validador: string;
    fecha: string;
    versionCriterios: string;
    evidencia: string;
    alcance: 'academico' | 'tecnico' | 'ambos';
  };
}

/** Candidato interno antes de clasificarse como recurso visible. */
export interface CandidatoVideo {
  id: string;
  titulo: string;
  canal: string;
  descripcion: string;
  duracionSegundos?: number;
  idiomaDeclarado?: string;
  publicadoEn?: string;
  miniaturaUrl?: string;
  origen: OrigenRecurso;
  tecnico?: DatosTecnicosVideo;
  curado?: RecursoCurado;
}

/** Datos técnicos crudos obtenidos de la API oficial o de oEmbed. */
export interface DatosTecnicosVideo {
  fuente: 'youtube_api' | 'oembed' | 'curado' | 'desconocida';
  existe: boolean;
  privacidad?: 'public' | 'private' | 'unlisted' | 'unknown';
  embedPermitido?: boolean;
  regionPermitida?: boolean;
  uploadStatus?: string;
  duracionVerificada?: boolean;
  idiomaVerificado?: boolean;
  /** Permite distinguir un fallo comprobado de una caída de red/API. */
  errorTipo?: 'no_encontrado' | 'restringido' | 'red' | 'api';
  error?: string;
}
