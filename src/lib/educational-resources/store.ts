/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Almacén de Reportes y Auditoría
 * ARCHIVO: src/lib/educational-resources/store.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Persiste reportes, cuarentenas, sustituciones y eventos de auditoría sin
 * almacenar datos personales. El comentario libre del estudiante no se guarda:
 * sólo se registra que existió, para evitar retener información innecesaria.
 *
 * Estrategia de persistencia:
 * - Archivo JSON local en `.data/educational-resources/state.json`.
 * - Si el entorno no permite escribir (serverless de sólo lectura), el sistema
 *   continúa en memoria y lo informa como limitación conocida.
 * - La caché de recomendaciones se persiste junto con el estado para reutilizar
 *   recursos validados entre sesiones del mismo servidor.
 * ==============================================================================
 */

import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  CandidatoRevision,
  EstadoCandidatoRevision,
  ResultadoRecomendaciones,
  TipoIncidenciaVideo,
} from '@/types/educationalResources';
import type { EntradaCache } from './cache';
import {
  MAX_AUDITORIA_ALMACENADA,
  MAX_CANDIDATOS_REVISION,
  MAX_REPORTES_ALMACENADOS,
  RETENCION_REGISTROS_MS,
} from './constants';

export interface ReporteRegistrado {
  id: string;
  videoId: string;
  contextoClave: string;
  asignatura: string;
  unidad: string;
  tema: string;
  tipo: TipoIncidenciaVideo;
  fecha: string;
  reporteroHash: string;
  comentarioPresente: boolean;
}

export interface EventoAuditoria {
  id: string;
  fecha: string;
  evento:
    | 'RECOMENDACIONES_GENERADAS'
    | 'REPORTE_REGISTRADO'
    | 'REPORTE_DUPLICADO'
    | 'CUARENTENA_APLICADA'
    | 'EN_COMPROBACION'
    | 'SUSTITUCION_ENCONTRADA'
    | 'SUSTITUCION_NO_ENCONTRADA'
    | 'SUSTITUCION_BLOQUEADA'
    | 'ERROR_PROVEEDOR'
    | 'ENLACE_EXTERNO_VALIDADO'
    | 'REVISION_SOLICITADA'
    | 'APROBACION_CURADA'
    | 'RECHAZO_CURADO';
  videoId?: string;
  contextoClave?: string;
  detalle: string;
  versionCriterios: string;
}

export interface CuarentenaRegistrada {
  videoId: string;
  contextoClave?: string;
  hasta: string;
  motivo: string;
  tipo: TipoIncidenciaVideo;
}

/** Recurso reportado una vez: se degrada a pendiente sin declararlo roto. */
export interface ComprobacionRegistrada {
  videoId: string;
  contextoClave: string;
  hasta: string;
  motivo: string;
}

export interface SustitucionRegistrada {
  id: string;
  fecha: string;
  contextoClave: string;
  videoRetiradoId: string;
  reemplazoId?: string;
  resultado: 'encontrada' | 'no_encontrada' | 'bloqueada';
  motivo: string;
}

interface EstadoPersistido {
  reportes: ReporteRegistrado[];
  auditoria: EventoAuditoria[];
  cuarentenas: CuarentenaRegistrada[];
  comprobaciones: ComprobacionRegistrada[];
  sustituciones: SustitucionRegistrada[];
  candidatosRevision: CandidatoRevision[];
  cache: Record<string, EntradaCache<ResultadoRecomendaciones>>;
}

/** Detecta errores de permisos que impiden persistir de forma definitiva. */
function esErrorDePermisos(error: unknown): boolean {
  const codigo = (error as NodeJS.ErrnoException | undefined)?.code;
  return codigo === 'EACCES' || codigo === 'EROFS' || codigo === 'EPERM';
}

/** Estado vacío usado cuando no existe archivo o está corrupto. */
function estadoVacio(): EstadoPersistido {
  return {
    reportes: [],
    auditoria: [],
    cuarentenas: [],
    comprobaciones: [],
    sustituciones: [],
    candidatosRevision: [],
    cache: {},
  };
}

/**
 * Almacén con persistencia opcional. Todas las operaciones son asíncronas para
 * no bloquear el event loop de Next.js con escrituras de disco.
 */
export class AlmacenRecursosEducativos {
  private estado: EstadoPersistido = estadoVacio();
  private inicializacion: Promise<void> | null = null;
  private colaPersistencia: Promise<void> = Promise.resolve();
  private persistenciaHabilitada: boolean;
  private persistenciaDisponible = true;
  private readonly dataDir: string;
  private readonly ahora: () => number;
  private readonly maxReportes: number;
  private readonly maxAuditoria: number;

  constructor(opciones?: {
    dataDir?: string;
    persistir?: boolean;
    ahora?: () => number;
    maxReportes?: number;
    maxAuditoria?: number;
  }) {
    this.dataDir =
      opciones?.dataDir ||
      process.env.EDUCATIONAL_RESOURCES_DATA_DIR ||
      path.join(process.cwd(), '.data', 'educational-resources');
    this.persistenciaHabilitada =
      opciones?.persistir ?? process.env.EDUCATIONAL_RESOURCES_PERSIST !== 'false';
    this.ahora = opciones?.ahora ?? (() => Date.now());
    this.maxReportes = opciones?.maxReportes ?? MAX_REPORTES_ALMACENADOS;
    this.maxAuditoria = opciones?.maxAuditoria ?? MAX_AUDITORIA_ALMACENADA;
  }

  /** Carga el estado una sola vez; es seguro llamarla en cada petición. */
  public async inicializar(): Promise<void> {
    if (!this.inicializacion) {
      this.inicializacion = this.cargarEstado();
    }
    return this.inicializacion;
  }

  /** Indica si la persistencia en disco está operativa. */
  public persistenciaActiva(): boolean {
    return this.persistenciaHabilitada && this.persistenciaDisponible;
  }

  /** Registra un reporte y evita duplicados idénticos recientes. */
  public async registrarReporte(datos: {
    videoId: string;
    contextoClave: string;
    asignatura: string;
    unidad: string;
    tema: string;
    tipo: TipoIncidenciaVideo;
    reporteroHash: string;
    comentarioPresente: boolean;
    ventanaDedupeMs: number;
  }): Promise<{ registrado: boolean; duplicado: boolean; reporte?: ReporteRegistrado }> {
    await this.inicializar();
    const desde = this.ahora() - datos.ventanaDedupeMs;
    const duplicado = this.estado.reportes.some(
      (reporte) =>
        reporte.videoId === datos.videoId &&
        reporte.contextoClave === datos.contextoClave &&
        reporte.reporteroHash === datos.reporteroHash &&
        reporte.tipo === datos.tipo &&
        new Date(reporte.fecha).getTime() >= desde
    );

    if (duplicado) {
      return { registrado: false, duplicado: true };
    }

    const reporte: ReporteRegistrado = {
      id: randomUUID(),
      videoId: datos.videoId,
      contextoClave: datos.contextoClave,
      asignatura: datos.asignatura.slice(0, 120),
      unidad: datos.unidad.slice(0, 160),
      tema: datos.tema.slice(0, 160),
      tipo: datos.tipo,
      fecha: new Date(this.ahora()).toISOString(),
      reporteroHash: datos.reporteroHash,
      comentarioPresente: datos.comentarioPresente,
    };

    this.estado.reportes.push(reporte);
    this.limpiarAntiguos();
    await this.persistir();
    return { registrado: true, duplicado: false, reporte };
  }

  /** Cuenta reportantes anónimos distintos para un video y contexto. */
  public async contarReportantesDistintos(
    videoId: string,
    contextoClave: string,
    ventanaMs: number
  ): Promise<number> {
    await this.inicializar();
    const desde = this.ahora() - ventanaMs;
    const hashes = new Set(
      this.estado.reportes
        .filter(
          (reporte) =>
            reporte.videoId === videoId &&
            reporte.contextoClave === contextoClave &&
            new Date(reporte.fecha).getTime() >= desde
        )
        .map((reporte) => reporte.reporteroHash)
    );
    return hashes.size;
  }

  /** Devuelve los identificadores de video reportados en una ventana. */
  public async idsReportados(
    contextoClave: string,
    ventanaMs: number
  ): Promise<Set<string>> {
    await this.inicializar();
    const desde = this.ahora() - ventanaMs;
    return new Set(
      this.estado.reportes
        .filter(
          (reporte) =>
            reporte.contextoClave === contextoClave &&
            new Date(reporte.fecha).getTime() >= desde
        )
        .map((reporte) => reporte.videoId)
    );
  }

  /** Aplica una cuarentena global o específica de contexto. */
  public async agregarCuarentena(datos: {
    videoId: string;
    contextoClave?: string;
    duracionMs: number;
    motivo: string;
    tipo: TipoIncidenciaVideo;
  }): Promise<void> {
    await this.inicializar();
    const hasta = new Date(this.ahora() + datos.duracionMs).toISOString();
    const existente = this.estado.cuarentenas.find(
      (item) =>
        item.videoId === datos.videoId &&
        (item.contextoClave || '') === (datos.contextoClave || '')
    );
    if (existente) {
      existente.hasta = hasta;
      existente.motivo = datos.motivo;
      existente.tipo = datos.tipo;
    } else {
      this.estado.cuarentenas.push({
        videoId: datos.videoId,
        contextoClave: datos.contextoClave,
        hasta,
        motivo: datos.motivo,
        tipo: datos.tipo,
      });
    }
    await this.persistir();
  }

  /** Marca un recurso para comprobación sin retirarlo globalmente. */
  public async marcarEnComprobacion(datos: {
    videoId: string;
    contextoClave: string;
    duracionMs: number;
    motivo: string;
  }): Promise<void> {
    await this.inicializar();
    const hasta = new Date(this.ahora() + datos.duracionMs).toISOString();
    const existente = this.estado.comprobaciones.find(
      (item) =>
        item.videoId === datos.videoId && item.contextoClave === datos.contextoClave
    );
    if (existente) {
      existente.hasta = hasta;
      existente.motivo = datos.motivo;
    } else {
      this.estado.comprobaciones.push({
        videoId: datos.videoId,
        contextoClave: datos.contextoClave,
        hasta,
        motivo: datos.motivo,
      });
    }
    await this.persistir();
  }

  /** Conjunto de videos degradados a pendientes para un contexto. */
  public async idsEnComprobacion(contextoClave: string): Promise<Set<string>> {
    await this.inicializar();
    const instante = this.ahora();
    return new Set(
      this.estado.comprobaciones
        .filter(
          (item) =>
            item.contextoClave === contextoClave &&
            new Date(item.hasta).getTime() > instante
        )
        .map((item) => item.videoId)
    );
  }

  /** Indica si un video está temporalmente retirado para un contexto. */
  public async estaEnCuarentena(
    videoId: string,
    contextoClave: string
  ): Promise<boolean> {
    await this.inicializar();
    const instante = this.ahora();
    return this.estado.cuarentenas.some(
      (item) =>
        item.videoId === videoId &&
        (!item.contextoClave || item.contextoClave === contextoClave) &&
        new Date(item.hasta).getTime() > instante
    );
  }

  /** Conjunto de videos bloqueados para un contexto. */
  public async idsEnCuarentena(contextoClave: string): Promise<Set<string>> {
    await this.inicializar();
    const instante = this.ahora();
    return new Set(
      this.estado.cuarentenas
        .filter(
          (item) =>
            (!item.contextoClave || item.contextoClave === contextoClave) &&
            new Date(item.hasta).getTime() > instante
        )
        .map((item) => item.videoId)
    );
  }

  /** Registra el resultado de un intento de sustitución. */
  public async registrarSustitucion(datos: {
    contextoClave: string;
    videoRetiradoId: string;
    reemplazoId?: string;
    resultado: 'encontrada' | 'no_encontrada' | 'bloqueada';
    motivo: string;
  }): Promise<void> {
    await this.inicializar();
    this.estado.sustituciones.push({
      id: randomUUID(),
      fecha: new Date(this.ahora()).toISOString(),
      contextoClave: datos.contextoClave,
      videoRetiradoId: datos.videoRetiradoId,
      reemplazoId: datos.reemplazoId,
      resultado: datos.resultado,
      motivo: datos.motivo.slice(0, 400),
    });
    this.limpiarAntiguos();
    await this.persistir();
  }

  /** Cuenta sustituciones automáticas recientes por contexto. */
  public async contarSustituciones(
    contextoClave: string,
    ventanaMs: number
  ): Promise<number> {
    await this.inicializar();
    const desde = this.ahora() - ventanaMs;
    return this.estado.sustituciones.filter(
      (item) =>
        item.contextoClave === contextoClave &&
        item.resultado === 'encontrada' &&
        new Date(item.fecha).getTime() >= desde
    ).length;
  }

  /** Añade un evento de auditoría sin datos personales. */
  public async auditar(datos: Omit<EventoAuditoria, 'id' | 'fecha'>): Promise<void> {
    await this.inicializar();
    this.estado.auditoria.push({
      id: randomUUID(),
      fecha: new Date(this.ahora()).toISOString(),
      ...datos,
    });
    this.limpiarAntiguos();
    await this.persistir();
  }

  /** Guarda la caché completa de recomendaciones para el próximo arranque. */
  public async guardarCache(
    entradas: Record<string, EntradaCache<ResultadoRecomendaciones>>
  ): Promise<void> {
    await this.inicializar();
    this.estado.cache = entradas;
    await this.persistir();
  }

  /** Recupera la caché persistida, si existe. */
  public async cargarCache(): Promise<
    Record<string, EntradaCache<ResultadoRecomendaciones>> | null
  > {
    await this.inicializar();
    return this.estado.cache && Object.keys(this.estado.cache).length > 0
      ? this.estado.cache
      : null;
  }

  /**
   * Registra o actualiza un candidato para revisión docente. La cola conserva
   * el mejor recurso pendiente de cada contexto y no borra aprobaciones
   * anteriores si el video vuelve a aparecer en una búsqueda.
   */
  public async registrarCandidatoRevision(
    candidato: CandidatoRevision
  ): Promise<void> {
    await this.inicializar();
    const existente = this.estado.candidatosRevision.find(
      (item) => item.id === candidato.id
    );
    const ahoraISO = new Date(this.ahora()).toISOString();

    if (existente) {
      const mismoRecurso =
        JSON.stringify(existente.recurso) === JSON.stringify(candidato.recurso);
      const mismoContexto =
        JSON.stringify(existente.contexto) === JSON.stringify(candidato.contexto);
      if (mismoRecurso && mismoContexto) return;

      existente.recurso = candidato.recurso;
      existente.contexto = candidato.contexto;
      existente.fechaActualizacion = ahoraISO;
      await this.persistir();
      return;
    }

    this.estado.candidatosRevision.push({
      ...candidato,
      fechaCreacion: candidato.fechaCreacion || ahoraISO,
      fechaActualizacion: ahoraISO,
    });
    this.limpiarAntiguos();
    await this.persistir();
  }

  /** Marca una solicitud de revisión realizada por un usuario del aula. */
  public async solicitarRevisionCandidato(id: string): Promise<boolean> {
    await this.inicializar();
    const candidato = this.estado.candidatosRevision.find((item) => item.id === id);
    if (!candidato || candidato.estado === 'APROBADA' || candidato.estado === 'RECHAZADA') {
      return false;
    }
    candidato.estado = 'SOLICITADA';
    candidato.solicitudes += 1;
    candidato.fechaActualizacion = new Date(this.ahora()).toISOString();
    await this.persistir();
    return true;
  }

  /** Devuelve la cola de revisión ordenada por prioridad y fecha. */
  public async listarCandidatosRevision(): Promise<CandidatoRevision[]> {
    await this.inicializar();
    const prioridad: Record<EstadoCandidatoRevision, number> = {
      SOLICITADA: 0,
      PENDIENTE: 1,
      RECHAZADA: 2,
      APROBADA: 3,
    };
    return [...this.estado.candidatosRevision].sort((a, b) => {
      const porEstado = prioridad[a.estado] - prioridad[b.estado];
      if (porEstado !== 0) return porEstado;
      return b.fechaActualizacion.localeCompare(a.fechaActualizacion);
    });
  }

  /** Actualiza el estado de un candidato tras la revisión docente. */
  public async marcarCandidatoRevision(
    id: string,
    estado: EstadoCandidatoRevision,
    notaRevision?: string
  ): Promise<void> {
    await this.inicializar();
    const candidato = this.estado.candidatosRevision.find((item) => item.id === id);
    if (!candidato) return;
    candidato.estado = estado;
    candidato.notaRevision = notaRevision?.slice(0, 600);
    candidato.fechaActualizacion = new Date(this.ahora()).toISOString();
    await this.persistir();
  }

  /** Carga el archivo de estado o devuelve un estado vacío. */
  private async cargarEstado(): Promise<void> {
    if (!this.persistenciaHabilitada) return;
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      const contenido = await fs.readFile(this.rutaEstado(), 'utf8');
      const parseado = JSON.parse(contenido) as Partial<EstadoPersistido>;
      this.estado = {
        reportes: Array.isArray(parseado.reportes) ? parseado.reportes : [],
        auditoria: Array.isArray(parseado.auditoria) ? parseado.auditoria : [],
        cuarentenas: Array.isArray(parseado.cuarentenas) ? parseado.cuarentenas : [],
        comprobaciones: Array.isArray(parseado.comprobaciones)
          ? parseado.comprobaciones
          : [],
        sustituciones: Array.isArray(parseado.sustituciones) ? parseado.sustituciones : [],
        candidatosRevision: Array.isArray(parseado.candidatosRevision)
          ? parseado.candidatosRevision
          : [],
        cache:
          parseado.cache && typeof parseado.cache === 'object' ? parseado.cache : {},
      };
      this.limpiarAntiguos();
    } catch {
      this.estado = estadoVacio();
    }
  }

  /** Ruta del archivo único de estado. */
  private rutaEstado(): string {
    return path.join(this.dataDir, 'state.json');
  }

  /** Programa una escritura atómica en cola para evitar condiciones de carrera. */
  private async persistir(): Promise<void> {
    if (!this.persistenciaHabilitada || !this.persistenciaDisponible) return;
    this.colaPersistencia = this.colaPersistencia
      .then(async () => {
        if (!this.persistenciaDisponible) return;
        try {
          await fs.mkdir(this.dataDir, { recursive: true });
          const temporal = `${this.rutaEstado()}.tmp`;
          await fs.writeFile(temporal, JSON.stringify(this.estado), 'utf8');
          await fs.rename(temporal, this.rutaEstado());
        } catch (error) {
          // Un fallo transitorio no debe desactivar la persistencia para
          // siempre. Sólo los errores de permisos confirman un entorno de
          // sólo lectura; en ese caso se continúa en memoria.
          if (esErrorDePermisos(error)) this.persistenciaDisponible = false;
        }
      })
      .catch((error) => {
        if (esErrorDePermisos(error)) this.persistenciaDisponible = false;
      });
    await this.colaPersistencia;
  }

  /** Elimina cuarentenas vencidas y acota el crecimiento de los registros. */
  private limpiarAntiguos(): void {
    const instante = this.ahora();
    this.estado.cuarentenas = this.estado.cuarentenas.filter(
      (item) => new Date(item.hasta).getTime() > instante
    );
    this.estado.comprobaciones = this.estado.comprobaciones.filter(
      (item) => new Date(item.hasta).getTime() > instante
    );

    const desdeRetencion = instante - RETENCION_REGISTROS_MS;
    this.estado.candidatosRevision = this.estado.candidatosRevision.filter(
      (item) => new Date(item.fechaActualizacion).getTime() >= desdeRetencion
    );
    if (this.estado.candidatosRevision.length > MAX_CANDIDATOS_REVISION) {
      this.estado.candidatosRevision = this.estado.candidatosRevision.slice(
        -MAX_CANDIDATOS_REVISION
      );
    }
    this.estado.reportes = this.estado.reportes.filter(
      (reporte) => new Date(reporte.fecha).getTime() >= desdeRetencion
    );
    this.estado.auditoria = this.estado.auditoria.filter(
      (evento) => new Date(evento.fecha).getTime() >= desdeRetencion
    );
    this.estado.sustituciones = this.estado.sustituciones.filter(
      (item) => new Date(item.fecha).getTime() >= desdeRetencion
    );

    if (this.estado.reportes.length > this.maxReportes) {
      this.estado.reportes = this.estado.reportes.slice(-this.maxReportes);
    }
    if (this.estado.auditoria.length > this.maxAuditoria) {
      this.estado.auditoria = this.estado.auditoria.slice(-this.maxAuditoria);
    }
    if (this.estado.sustituciones.length > this.maxReportes) {
      this.estado.sustituciones = this.estado.sustituciones.slice(-this.maxReportes);
    }
  }
}
