/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Servicio de Recursos Educativos
 * ARCHIVO: src/lib/educational-resources/service.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Orquesta el flujo completo de recursos audiovisuales complementarios:
 * 1. Construcción de la consulta contextual y de la clave de caché.
 * 2. Búsqueda mediante YouTube API o catálogo curado.
 * 3. Validación técnica y académica con clasificación explícita.
 * 4. Ranking de alternativas y respuesta resiliente ante fallos.
 * 5. Reporte de incidencias, cuarentena y sustitución automática controlada.
 * 6. Validación de enlaces externos elegidos por el estudiante.
 *
 * El servicio nunca lanza errores de red hacia la ruta: siempre devuelve un
 * resultado seguro para que el visor OpenMAIC siga funcionando.
 * ==============================================================================
 */

import type {
  AprobarRecursoPayload,
  CandidatoRevision,
  CandidatoVideo,
  ContextoAcademico,
  RecursoCurado,
  RecursoVideo,
  ReporteVideoPayload,
  ResultadoAprobacion,
  ResultadoRecomendaciones,
  ResultadoReporte,
  ResultadoSolicitudRevision,
  ResultadoValidacionEnlace,
  ValidacionAcademica,
  ValidacionTecnica,
} from '@/types/educationalResources';
import {
  DURACION_CUARENTENA_MS,
  DURACION_EN_COMPROBACION_MS,
  LIMITE_RECOMENDACIONES,
  LIMITE_REPORTES_CORTO,
  LIMITE_REPORTES_DIARIO,
  LIMITE_VALIDACIONES_ENLACE,
  MAX_ANTIGUEDAD_RESPALDO_MS,
  MAX_RECURSOS_PENDIENTES,
  MAX_RECURSOS_VALIDADOS,
  MAX_SUSTITUCIONES_POR_CONTEXTO,
  TTL_RECOMENDACIONES_MS,
  TTL_SIN_RESULTADOS_MS,
  VENTANA_DEDUPE_REPORTE_MS,
  VENTANA_RECOMENDACIONES_MS,
  VENTANA_REPORTANTES_MS,
  VENTANA_REPORTES_CORTA_MS,
  VENTANA_REPORTES_DIARIA_MS,
  VENTANA_SUSTITUCIONES_MS,
  VENTANA_VALIDACIONES_MS,
  VERSION_CRITERIOS,
  VERSION_MOTOR_SEMANTICO,
} from './constants';
import { CacheConVencimiento } from './cache';
import { guardarRecursoCurado } from './catalog';
import { LimitadorPeticiones } from './rateLimit';
import { AlmacenRecursosEducativos } from './store';
import { ErrorProveedorVideo, youtubeProvider, type ProveedorVideos } from './youtubeProvider';
import { evaluarPertinenciaAcademica } from './academicValidator';
import { construirConsultasBusquedaSemantica } from './semanticSearch';
import { evaluarTecnica } from './technicalValidator';
import {
  calcularClaveContexto,
  construirConsultaContextual,
  construirMiniaturaYouTube,
  construirUrlBusquedaYouTube,
  construirUrlEmbedYouTube,
  construirUrlVideoYouTube,
  deduplicarRecursos,
  esIdYouTubeValido,
  formatearDuracion,
} from './text';

export interface OpcionesRecomendaciones {
  forzar?: boolean;
  excluir?: string[];
}

export interface MetaPeticionRecursos {
  reporteroHash: string;
}

interface DependenciasServicio {
  proveedor?: ProveedorVideos;
  almacen?: AlmacenRecursosEducativos;
  cache?: CacheConVencimiento<ResultadoRecomendaciones>;
  limitador?: LimitadorPeticiones;
  ahora?: () => number;
  region?: string;
}

/** Resumen no personal del contexto para la respuesta pública. */
function resumirContexto(contexto: ContextoAcademico) {
  return {
    asignatura: contexto.asignatura,
    unidad: contexto.unidad,
    tema: contexto.tema,
    curso: contexto.curso,
    nivel: contexto.nivel,
    idioma: contexto.idioma,
    diapositiva: contexto.diapositiva,
  };
}

/** Fecha ISO determinista a partir del reloj inyectado. */
function iso(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Consulta principal para la búsqueda externa y para la respuesta del panel.
 * Usa el perfil semántico de la lección y deja la consulta contextual como
 * respaldo si el material no permite construir una consulta específica.
 */
function consultaPrincipal(contexto: ContextoAcademico): string {
  return (
    construirConsultasBusquedaSemantica(contexto)[0]?.consulta ||
    construirConsultaContextual(contexto)
  );
}

/**
 * Servicio singleton de recursos. Las dependencias son inyectables para poder
 * ejecutar pruebas sin red ni escritura en disco.
 */
export class EducationalResourcesService {
  private readonly proveedor: ProveedorVideos;
  private readonly almacen: AlmacenRecursosEducativos;
  private readonly cache: CacheConVencimiento<ResultadoRecomendaciones>;
  private readonly limitador: LimitadorPeticiones;
  private readonly ahora: () => number;
  private readonly region: string;
  private inicializacion: Promise<void> | null = null;

  constructor(dependencias?: DependenciasServicio) {
    this.proveedor = dependencias?.proveedor || youtubeProvider;
    this.almacen = dependencias?.almacen || new AlmacenRecursosEducativos();
    this.cache =
      dependencias?.cache || new CacheConVencimiento<ResultadoRecomendaciones>(200);
    this.limitador = dependencias?.limitador || new LimitadorPeticiones();
    this.ahora = dependencias?.ahora || (() => Date.now());
    this.region =
      dependencias?.region || process.env.YOUTUBE_REGION_CODE || 'EC';
  }

  /** Inicializa el almacén y recupera la caché persistida una sola vez. */
  private async asegurarInicializado(): Promise<void> {
    if (!this.inicializacion) {
      this.inicializacion = (async () => {
        await this.almacen.inicializar();
        const persistida = await this.almacen.cargarCache();
        if (persistida) this.cache.importar(persistida);
      })();
    }
    return this.inicializacion;
  }

  /** Limita las peticiones de recomendaciones por usuario anónimo. */
  public permitirRecomendaciones(reporteroHash: string) {
    return this.limitador.consumir(
      `recomendaciones:${reporteroHash}`,
      LIMITE_RECOMENDACIONES,
      VENTANA_RECOMENDACIONES_MS
    );
  }

  /**
   * Obtiene recomendaciones para el contexto. Nunca bloquea la clase y nunca
   * presenta como validado un video que no superó ambos controles.
   */
  public async obtenerRecomendaciones(
    contexto: ContextoAcademico,
    opciones: OpcionesRecomendaciones = {}
  ): Promise<ResultadoRecomendaciones> {
    await this.asegurarInicializado();
    const claveContexto = calcularClaveContexto(contexto);
    const modo = this.proveedor.modo();
    const claveCache = `${claveContexto}:${VERSION_CRITERIOS}:${VERSION_MOTOR_SEMANTICO}:${this.region}:${modo}`;
    const consulta = consultaPrincipal(contexto);
    const busquedaUrl = construirUrlBusquedaYouTube(consulta);
    const excluir = new Set((opciones.excluir || []).filter(esIdYouTubeValido));
    const cuarentena = await this.almacen.idsEnCuarentena(claveContexto);
    const enComprobacion = await this.almacen.idsEnComprobacion(claveContexto);

    if (!opciones.forzar) {
      const entrada = this.cache.leer(claveCache);
      if (entrada) {
        const filtrada = this.filtrarRespuesta(
          entrada.valor,
          excluir,
          cuarentena,
          enComprobacion,
          contexto
        );
        const tieneContenido =
          filtrada.recursos.length > 0 || filtrada.pendientes.length > 0;
        if (tieneContenido || entrada.valor.origen === 'solo_enlaces') {
          if (filtrada.recursos.length === 0 && filtrada.pendientes.length > 0) {
            await this.registrarPendientePrincipal(
              contexto,
              claveContexto,
              filtrada.pendientes[0]
            );
          }
          return {
            ...filtrada,
            cache: 'hit',
            generadoEn: iso(entrada.creadoEn),
            expiraEn: iso(entrada.expiraEn),
          };
        }
      }
    }

    const entradaExpirada = this.cache.leer(claveCache, { permitirExpirado: true });

    let busqueda;
    try {
      busqueda = await this.proveedor.buscar(contexto, consulta);
    } catch (error) {
      const esErrorProveedor = error instanceof ErrorProveedorVideo;
      const mensaje = esErrorProveedor
        ? error.codigo === 'CUOTA'
          ? 'La cuota de búsqueda de YouTube se agotó temporalmente.'
          : 'No fue posible consultar YouTube en este momento.'
        : 'Ocurrió un problema al buscar recursos audiovisuales.';

      await this.almacen.auditar({
        evento: 'ERROR_PROVEEDOR',
        contextoClave: claveContexto,
        detalle: mensaje,
        versionCriterios: VERSION_CRITERIOS,
      });

      if (
        entradaExpirada &&
        this.ahora() - entradaExpirada.creadoEn <= MAX_ANTIGUEDAD_RESPALDO_MS
      ) {
        const filtrada = this.filtrarRespuesta(
          entradaExpirada.valor,
          excluir,
          cuarentena,
          enComprobacion,
          contexto
        );
        if (filtrada.recursos.length === 0 && filtrada.pendientes.length > 0) {
          await this.registrarPendientePrincipal(
            contexto,
            claveContexto,
            filtrada.pendientes[0]
          );
        }
        return {
          ...filtrada,
          cache: 'stale',
          generadoEn: iso(entradaExpirada.creadoEn),
          expiraEn: iso(entradaExpirada.expiraEn),
          advertencia:
            'No se pudo actualizar la búsqueda. Se muestran recursos verificados anteriormente.',
        };
      }

      return this.respuestaVacia({
        contexto,
        claveContexto,
        consulta,
        busquedaUrl,
        origen: modo,
        mensaje,
        advertencia: 'La clase y el visor OpenMAIC continúan funcionando normalmente.',
        cache: 'miss',
      });
    }

    if (busqueda.origen === 'solo_enlaces' || busqueda.candidatos.length === 0) {
      const resultado = this.respuestaVacia({
        contexto,
        claveContexto,
        consulta,
        busquedaUrl,
        origen: busqueda.origen,
        mensaje:
          busqueda.advertencia ||
          'No encontramos videos que superen los controles para este tema en este momento. Puedes buscar alternativas contextualizadas en YouTube.',
        advertencia:
          busqueda.origen === 'solo_enlaces' ? undefined : busqueda.advertencia,
        cache: 'miss',
      });
      this.cache.guardar(claveCache, resultado, TTL_SIN_RESULTADOS_MS);
      await this.almacen.guardarCache(this.cache.exportar());
      return resultado;
    }

    const candidatos = new Map<string, CandidatoVideo>();
    for (const candidato of busqueda.candidatos) {
      if (!esIdYouTubeValido(candidato.id)) continue;
      const previo = candidatos.get(candidato.id);
      if (!previo || candidato.origen === 'catalogo_curado') {
        candidatos.set(candidato.id, candidato);
      }
    }

    const validados: RecursoVideo[] = [];
    const pendientes: RecursoVideo[] = [];
    const fechaBase = new Date(this.ahora());

    for (const candidato of candidatos.values()) {
      if (excluir.has(candidato.id) || cuarentena.has(candidato.id)) continue;

      const tecnica = evaluarTecnica(candidato, this.region);
      const academica = evaluarPertinenciaAcademica(candidato, contexto, fechaBase);
      let estado = this.clasificar(tecnica, academica);
      if (estado === 'RECHAZADO') continue;

      const estabaEnComprobacion =
        estado === 'VALIDADO' && enComprobacion.has(candidato.id);
      if (estabaEnComprobacion) {
        estado = 'PENDIENTE_REVISION';
      }

      const recurso = this.construirRecurso(
        candidato,
        tecnica,
        academica,
        estado,
        consulta,
        contexto
      );

      if (estabaEnComprobacion) {
        recurso.motivos.unshift(
          'Reportado por un estudiante; el recurso está en comprobación y no se presenta como validado.'
        );
      }

      if (estado === 'VALIDADO') validados.push(recurso);
      else pendientes.push(recurso);
    }

    validados.sort((a, b) => {
      // Una aprobación docente es la decisión académica autoritativa para esa
      // clase y debe ocupar la recomendación principal frente a resultados
      // automáticos de la API.
      if (a.origen === 'catalogo_curado' && b.origen !== 'catalogo_curado') return -1;
      if (b.origen === 'catalogo_curado' && a.origen !== 'catalogo_curado') return 1;
      return b.puntuacion - a.puntuacion;
    });
    pendientes.sort((a, b) => b.puntuacion - a.puntuacion);

    const recursos = deduplicarRecursos(validados).slice(0, MAX_RECURSOS_VALIDADOS);
    const pendientesFinales = deduplicarRecursos(pendientes)
      .filter((recurso) => !recursos.some((validado) => validado.id === recurso.id))
      .slice(0, MAX_RECURSOS_PENDIENTES);

    if (recursos.length === 0 && pendientesFinales.length > 0) {
      await this.registrarPendientePrincipal(
        contexto,
        claveContexto,
        pendientesFinales[0]
      );
    }

    let mensaje: string | undefined;
    if (recursos.length === 0 && pendientesFinales.length > 0) {
      mensaje =
        'No encontramos videos que superen todos los controles académicos. Las alternativas siguientes están pendientes de revisión y se identifican como tales.';
    } else if (recursos.length === 0) {
      mensaje =
        'Ningún resultado superó los criterios de validación. Te ofrecemos una búsqueda contextualizada para elegir otra explicación.';
    } else if (pendientesFinales.length > 0) {
      mensaje =
        'La recomendación principal está validada. Las alternativas pendientes se muestran separadas y no se presentan como verificadas.';
    }

    const ttl = recursos.length > 0 ? TTL_RECOMENDACIONES_MS : TTL_SIN_RESULTADOS_MS;
    const generadoEn = this.ahora();
    const resultado: ResultadoRecomendaciones = {
      ok: true,
      origen: busqueda.origen,
      contexto: resumirContexto(contexto),
      claveContexto,
      consulta,
      busquedaUrl,
      generadoEn: iso(generadoEn),
      expiraEn: iso(generadoEn + ttl),
      cache: 'miss',
      recursos,
      pendientes: pendientesFinales,
      mensaje,
      advertencia: busqueda.advertencia,
    };

    this.cache.guardar(claveCache, resultado, ttl);
    await this.almacen.guardarCache(this.cache.exportar());
    await this.almacen.auditar({
      evento: 'RECOMENDACIONES_GENERADAS',
      contextoClave: claveContexto,
      detalle: `Origen: ${busqueda.origen}. Validados: ${recursos.length}. Pendientes: ${pendientesFinales.length}.`,
      versionCriterios: VERSION_CRITERIOS,
    });

    return resultado;
  }

  /**
   * Registra un reporte y busca una sustitución validada. Las reglas de
   * cuarentena distinguen una incidencia aislada de un fallo corroborado.
   */
  public async reportarVideo(
    payload: ReporteVideoPayload,
    meta: MetaPeticionRecursos
  ): Promise<ResultadoReporte> {
    await this.asegurarInicializado();
    const contexto = payload.contexto;
    const claveContexto = calcularClaveContexto(contexto);
    const consulta = consultaPrincipal(contexto);
    const busquedaUrl = construirUrlBusquedaYouTube(consulta);

    if (!esIdYouTubeValido(payload.videoId)) {
      return {
        ok: false,
        registrado: false,
        duplicado: false,
        estadoRecurso: 'REPORTADO',
        mensaje: 'El identificador del video no es válido.',
        busquedaUrl,
        reintentarEnSegundos: 60,
      };
    }

    const limiteCorto = this.limitador.consumir(
      `reporte-corto:${meta.reporteroHash}`,
      LIMITE_REPORTES_CORTO,
      VENTANA_REPORTES_CORTA_MS
    );
    if (!limiteCorto.permitido) {
      return {
        ok: false,
        registrado: false,
        duplicado: false,
        estadoRecurso: 'REPORTADO',
        mensaje:
          'Has enviado varios reportes en poco tiempo. Espera unos minutos antes de intentar de nuevo.',
        busquedaUrl,
        reintentarEnSegundos: limiteCorto.reintentarEnSegundos,
      };
    }

    const limiteDiario = this.limitador.consumir(
      `reporte-diario:${meta.reporteroHash}`,
      LIMITE_REPORTES_DIARIO,
      VENTANA_REPORTES_DIARIA_MS
    );
    if (!limiteDiario.permitido) {
      return {
        ok: false,
        registrado: false,
        duplicado: false,
        estadoRecurso: 'REPORTADO',
        mensaje: 'Se alcanzó el límite diario de reportes. Intenta nuevamente mañana.',
        busquedaUrl,
        reintentarEnSegundos: limiteDiario.reintentarEnSegundos,
      };
    }

    const registro = await this.almacen.registrarReporte({
      videoId: payload.videoId,
      contextoClave: claveContexto,
      asignatura: contexto.asignatura,
      unidad: contexto.unidad,
      tema: contexto.tema,
      tipo: payload.tipo,
      reporteroHash: meta.reporteroHash,
      comentarioPresente: Boolean(payload.comentario && payload.comentario.trim()),
      ventanaDedupeMs: VENTANA_DEDUPE_REPORTE_MS,
    });

    if (registro.duplicado) {
      await this.almacen.auditar({
        evento: 'REPORTE_DUPLICADO',
        videoId: payload.videoId,
        contextoClave: claveContexto,
        detalle: `Tipo: ${payload.tipo}.`,
        versionCriterios: VERSION_CRITERIOS,
      });
      return {
        ok: true,
        registrado: false,
        duplicado: true,
        estadoRecurso: 'EN_COMPROBACION',
        mensaje:
          'Ya registramos un reporte reciente para este video. Estamos revisando el recurso y sus alternativas.',
        busquedaUrl,
      };
    }

    await this.almacen.auditar({
      evento: 'REPORTE_REGISTRADO',
      videoId: payload.videoId,
      contextoClave: claveContexto,
      detalle: `Tipo: ${payload.tipo}. Comentario presente: ${
        Boolean(payload.comentario && payload.comentario.trim()) ? 'sí' : 'no'
      }.`,
      versionCriterios: VERSION_CRITERIOS,
    });

    const reportantesDistintos = await this.almacen.contarReportantesDistintos(
      payload.videoId,
      claveContexto,
      VENTANA_REPORTANTES_MS
    );

    const esContenidoInapropiado = payload.tipo === 'CONTENIDO_INAPROPIADO';
    const esIncidenciaTecnica =
      payload.tipo === 'NO_REPRODUCE' ||
      payload.tipo === 'ENLACE_ROTO' ||
      payload.tipo === 'ELIMINADO_O_PRIVADO';

    let estadoRecurso: ResultadoReporte['estadoRecurso'] = 'EN_COMPROBACION';
    if (esContenidoInapropiado || reportantesDistintos >= 2) {
      await this.almacen.agregarCuarentena({
        videoId: payload.videoId,
        contextoClave: esIncidenciaTecnica || esContenidoInapropiado ? undefined : claveContexto,
        duracionMs: DURACION_CUARENTENA_MS,
        motivo: esContenidoInapropiado
          ? 'Contenido reportado como inapropiado para el nivel educativo.'
          : 'Reportes coincidentes de distintos usuarios.',
        tipo: payload.tipo,
      });
      await this.almacen.auditar({
        evento: 'CUARENTENA_APLICADA',
        videoId: payload.videoId,
        contextoClave: claveContexto,
        detalle: `Tipo: ${payload.tipo}. Reportantes distintos: ${reportantesDistintos}.`,
        versionCriterios: VERSION_CRITERIOS,
      });
      estadoRecurso = 'RETIRADO_TEMPORAL';
    } else {
      // Una incidencia aislada no se declara fallo global: se degrada el
      // recurso a "pendiente de revisión" durante una ventana breve.
      await this.almacen.marcarEnComprobacion({
        videoId: payload.videoId,
        contextoClave: claveContexto,
        duracionMs: DURACION_EN_COMPROBACION_MS,
        motivo: `Incidencia reportada por un estudiante: ${payload.tipo}.`,
      });
      await this.almacen.auditar({
        evento: 'EN_COMPROBACION',
        videoId: payload.videoId,
        contextoClave: claveContexto,
        detalle: `Incidencia aislada (${payload.tipo}); no se declara fallo definitivo.`,
        versionCriterios: VERSION_CRITERIOS,
      });
    }

    const sustitucionesRecientes = await this.almacen.contarSustituciones(
      claveContexto,
      VENTANA_SUSTITUCIONES_MS
    );
    if (sustitucionesRecientes >= MAX_SUSTITUCIONES_POR_CONTEXTO) {
      await this.almacen.registrarSustitucion({
        contextoClave: claveContexto,
        videoRetiradoId: payload.videoId,
        resultado: 'bloqueada',
        motivo: 'Se alcanzó el máximo de sustituciones automáticas por contexto.',
      });
      await this.almacen.auditar({
        evento: 'SUSTITUCION_BLOQUEADA',
        videoId: payload.videoId,
        contextoClave: claveContexto,
        detalle: 'Límite de sustituciones por contexto alcanzado.',
        versionCriterios: VERSION_CRITERIOS,
      });
      return {
        ok: true,
        registrado: true,
        duplicado: false,
        estadoRecurso,
        mensaje:
          'Reporte registrado. Para evitar reemplazos repetitivos, no realizaremos más sustituciones automáticas por ahora; usa la búsqueda contextualizada.',
        busquedaUrl,
        sustitucion: {
          encontrada: false,
          intentos: 0,
          motivo: 'Límite de sustituciones automáticas alcanzado.',
        },
      };
    }

    const reportados = await this.almacen.idsReportados(
      claveContexto,
      VENTANA_REPORTANTES_MS
    );
    const excluir = new Set<string>([payload.videoId, ...Array.from(reportados)]);
    let intentos = 0;
    let reemplazo: RecursoVideo | undefined;

    intentos += 1;
    let recomendaciones = await this.obtenerRecomendaciones(contexto, {
      excluir: Array.from(excluir),
    });
    reemplazo = recomendaciones.recursos.find(
      (recurso) => recurso.estado === 'VALIDADO' && !excluir.has(recurso.id)
    );

    // Sólo se fuerza una nueva búsqueda si la primera respuesta vino de caché
    // y no contenía alternativas. Evita duplicar llamadas y consumo de cuota.
    if (!reemplazo && recomendaciones.cache === 'hit') {
      intentos += 1;
      recomendaciones = await this.obtenerRecomendaciones(contexto, {
        forzar: true,
        excluir: Array.from(excluir),
      });
      reemplazo = recomendaciones.recursos.find(
        (recurso) => recurso.estado === 'VALIDADO' && !excluir.has(recurso.id)
      );
    }

    if (reemplazo) {
      await this.almacen.registrarSustitucion({
        contextoClave: claveContexto,
        videoRetiradoId: payload.videoId,
        reemplazoId: reemplazo.id,
        resultado: 'encontrada',
        motivo: 'Alternativa que superó validación técnica y académica.',
      });
      await this.almacen.auditar({
        evento: 'SUSTITUCION_ENCONTRADA',
        videoId: payload.videoId,
        contextoClave: claveContexto,
        detalle: `Reemplazo: ${reemplazo.id}.`,
        versionCriterios: VERSION_CRITERIOS,
      });
      return {
        ok: true,
        registrado: true,
        duplicado: false,
        estadoRecurso,
        mensaje:
          estadoRecurso === 'RETIRADO_TEMPORAL'
            ? 'Reporte registrado. El recurso fue retirado temporalmente y reemplazado por una alternativa validada.'
            : 'Reporte registrado para comprobación. Mientras se revisa, te mostramos una alternativa validada.',
        recursoSustituto: reemplazo,
        busquedaUrl,
        sustitucion: {
          encontrada: true,
          intentos,
          motivo: 'Se seleccionó una alternativa validada y no reportada.',
        },
      };
    }

    await this.almacen.registrarSustitucion({
      contextoClave: claveContexto,
      videoRetiradoId: payload.videoId,
      resultado: 'no_encontrada',
      motivo: 'Ninguna alternativa superó los controles de validación.',
    });
    await this.almacen.auditar({
      evento: 'SUSTITUCION_NO_ENCONTRADA',
      videoId: payload.videoId,
      contextoClave: claveContexto,
      detalle: 'Sin alternativa validada disponible.',
      versionCriterios: VERSION_CRITERIOS,
    });

    return {
      ok: true,
      registrado: true,
      duplicado: false,
      estadoRecurso,
      mensaje:
        estadoRecurso === 'RETIRADO_TEMPORAL'
          ? 'Reporte registrado. El recurso fue retirado temporalmente, pero no encontramos una alternativa que cumpla todos los criterios; usa la búsqueda contextualizada para elegir otro video.'
          : 'Reporte registrado para comprobación. No encontramos una alternativa que cumpla todos los criterios; usa la búsqueda contextualizada para elegir otro video.',
      busquedaUrl,
      sustitucion: {
        encontrada: false,
        intentos,
        motivo: 'No hay alternativas validadas disponibles para este contexto.',
      },
    };
  }

  /**
   * Valida un enlace que el estudiante eligió en la búsqueda externa. Sin API
   * oficial, oEmbed confirma existencia pero no inserción: el recurso queda
   * como pendiente y nunca se presenta como validado.
   */
  public async validarEnlaceExterno(
    videoId: string,
    contexto: ContextoAcademico,
    meta: MetaPeticionRecursos
  ): Promise<ResultadoValidacionEnlace> {
    await this.asegurarInicializado();

    if (!esIdYouTubeValido(videoId)) {
      return {
        ok: false,
        mensaje: 'El enlace no contiene un identificador de YouTube válido.',
      };
    }

    const limite = this.limitador.consumir(
      `validacion-enlace:${meta.reporteroHash}`,
      LIMITE_VALIDACIONES_ENLACE,
      VENTANA_VALIDACIONES_MS
    );
    if (!limite.permitido) {
      return {
        ok: false,
        mensaje: 'Has validado varios enlaces en poco tiempo. Espera unos minutos.',
        reintentarEnSegundos: limite.reintentarEnSegundos,
      };
    }

    const existencia = await this.proveedor.validarExistencia(videoId);
    const candidato: CandidatoVideo = {
      id: videoId,
      titulo: existencia.titulo || 'Video de YouTube',
      canal: existencia.canal || 'Canal de YouTube',
      descripcion: existencia.descripcion || '',
      duracionSegundos: existencia.duracionSegundos,
      idiomaDeclarado: existencia.idiomaDeclarado,
      publicadoEn: existencia.publicadoEn,
      miniaturaUrl: existencia.miniaturaUrl || construirMiniaturaYouTube(videoId),
      origen: 'enlace_manual',
      tecnico: existencia.datos,
    };

    const tecnica = evaluarTecnica(candidato, this.region);
    const academica = evaluarPertinenciaAcademica(candidato, contexto, new Date(this.ahora()));
    const estado = this.clasificar(tecnica, academica);

    await this.almacen.auditar({
      evento: 'ENLACE_EXTERNO_VALIDADO',
      videoId,
      contextoClave: calcularClaveContexto(contexto),
      detalle: `Clasificación: ${estado}. Fuente técnica: ${tecnica.fuente}.`,
      versionCriterios: VERSION_CRITERIOS,
    });

    if (estado === 'RECHAZADO') {
      return {
        ok: true,
        mensaje:
          'El video no supera los controles disponibles: puede ser irrelevante, estar en otro idioma o no ser accesible.',
      };
    }

    const recurso = this.construirRecurso(
      candidato,
      tecnica,
      academica,
      estado,
      consultaPrincipal(contexto),
      contexto
    );

    return {
      ok: true,
      recurso,
      mensaje:
        estado === 'VALIDADO'
          ? 'El video superó los controles técnicos y académicos disponibles.'
          : 'El video existe y parece pertinente, pero no fue posible verificar todos los requisitos. Se muestra como pendiente de revisión.',
    };
  }

  /**
   * Registra una solicitud de revisión para un video pendiente. No aprueba el
   * recurso: sólo lo coloca en la cola docente con prioridad.
   */
  public async solicitarRevision(
    videoId: string,
    contexto: ContextoAcademico,
    meta: MetaPeticionRecursos
  ): Promise<ResultadoSolicitudRevision> {
    await this.asegurarInicializado();
    const validacion = await this.validarEnlaceExterno(videoId, contexto, meta);
    if (!validacion.ok) {
      return {
        ok: false,
        mensaje: validacion.mensaje,
        reintentarEnSegundos: validacion.reintentarEnSegundos,
      };
    }
    if (!validacion.recurso) {
      return {
        ok: false,
        mensaje:
          'El video no supera los controles mínimos para entrar en revisión.',
      };
    }
    if (validacion.recurso.estado === 'VALIDADO') {
      return {
        ok: true,
        mensaje:
          'El video ya supera los controles disponibles. Actualiza las recomendaciones del panel.',
      };
    }

    const claveContexto = calcularClaveContexto(contexto);
    const id = `${claveContexto}:${videoId}`;
    const ahoraISO = iso(this.ahora());
    const existentes = await this.almacen.listarCandidatosRevision();
    const existente = existentes.find((item) => item.id === id);
    if (existente?.estado === 'APROBADA') {
      return {
        ok: true,
        mensaje: 'Este video ya fue aprobado por el equipo académico.',
        estado: 'APROBADA',
      };
    }

    await this.almacen.registrarCandidatoRevision({
      id,
      contextoClave: claveContexto,
      contexto,
      recurso: validacion.recurso,
      estado: 'PENDIENTE',
      solicitudes: existente?.solicitudes || 0,
      fechaCreacion: existente?.fechaCreacion || ahoraISO,
      fechaActualizacion: ahoraISO,
    });
    const marcado = await this.almacen.solicitarRevisionCandidato(id);

    await this.almacen.auditar({
      evento: 'REVISION_SOLICITADA',
      videoId,
      contextoClave: claveContexto,
      detalle: `Estado del recurso: ${validacion.recurso.estado}. Solicitudes: ${
        (existente?.solicitudes || 0) + 1
      }.`,
      versionCriterios: VERSION_CRITERIOS,
    });

    return {
      ok: true,
      mensaje: marcado
        ? 'Solicitud registrada. El equipo docente puede revisar y aprobar este video.'
        : 'El video ya se encuentra en la cola de revisión docente.',
      estado: 'SOLICITADA',
    };
  }

  /** Devuelve la cola de revisión para el panel administrativo. */
  public async listarCandidatosRevision(): Promise<CandidatoRevision[]> {
    await this.asegurarInicializado();
    return this.almacen.listarCandidatosRevision();
  }

  /**
   * Publica una aprobación docente en el catálogo curado. A partir de la
   * siguiente consulta, el proveedor mezcla este recurso con los resultados de
   * YouTube y la validación manual prevalece como evidencia académica.
   */
  public async aprobarRecurso(
    payload: AprobarRecursoPayload
  ): Promise<ResultadoAprobacion> {
    await this.asegurarInicializado();
    const confirmaciones = payload.confirmaciones;
    const todasConfirmadas = Object.values(confirmaciones).every(Boolean);
    if (!todasConfirmadas) {
      return {
        ok: false,
        mensaje:
          'Debes confirmar pertinencia, idioma, nivel, seguridad, inserción y región antes de aprobar.',
      };
    }
    if (payload.revisor.trim().length < 2) {
      return { ok: false, mensaje: 'Indica el nombre del revisor.' };
    }
    if (payload.evidencia.trim().length < 10) {
      return {
        ok: false,
        mensaje: 'Describe la evidencia de revisión (mínimo 10 caracteres).',
      };
    }

    const existencia = await this.proveedor.validarExistencia(payload.videoId);
    if (!existencia.datos.existe) {
      return {
        ok: false,
        mensaje:
          existencia.datos.error ||
          'No se pudo verificar el video en YouTube. Revisa el enlace e intenta de nuevo.',
      };
    }

    const contexto = payload.contexto;
    const temas = Array.from(
      new Set(
        [
          contexto.tema,
          contexto.unidad,
          contexto.subtema || '',
          ...(contexto.conceptos || []),
        ]
          .map((tema) => tema.trim())
          .filter(Boolean)
      )
    ).slice(0, 12);
    const niveles = Array.from(
      new Set([contexto.nivel, contexto.curso].filter(Boolean))
    );
    const ahoraISO = new Date(this.ahora()).toISOString();

    const curado: RecursoCurado = {
      id: payload.videoId,
      titulo:
        existencia.titulo || `Video de apoyo para ${contexto.tema}`,
      canal: existencia.canal || 'Canal de YouTube',
      descripcion:
        existencia.descripcion ||
        `Recurso revisado para ${contexto.unidad}.`,
      duracionSegundos: existencia.duracionSegundos,
      idioma: contexto.idioma,
      temas,
      asignaturas: [contexto.asignatura],
      niveles,
      embedVerificado: confirmaciones.insercion,
      regionPermitida: confirmaciones.region,
      privacidadVerificada: 'public',
      revisionManual: {
        validador: payload.revisor.trim().slice(0, 120),
        fecha: ahoraISO,
        versionCriterios: VERSION_CRITERIOS,
        evidencia: payload.evidencia.trim().slice(0, 600),
        alcance: 'ambos',
      },
    };

    const guardado = await guardarRecursoCurado(curado);
    const claveContexto = calcularClaveContexto(contexto);
    const id = `${claveContexto}:${payload.videoId}`;
    await this.almacen.marcarCandidatoRevision(
      id,
      'APROBADA',
      payload.evidencia.trim()
    );
    await this.almacen.auditar({
      evento: 'APROBACION_CURADA',
      videoId: payload.videoId,
      contextoClave: claveContexto,
      detalle: `Revisor: ${payload.revisor.trim()}. Recurso publicado en el catálogo curado.`,
      versionCriterios: VERSION_CRITERIOS,
    });

    // La próxima consulta del contexto debe reconstruirse para incluir el
    // recurso aprobado, incluso si existía una caché con 0 validados.
    const exportada = this.cache.exportar();
    for (const clave of Object.keys(exportada)) {
      if (clave.startsWith(`${claveContexto}:`)) this.cache.eliminar(clave);
    }
    await this.almacen.guardarCache(this.cache.exportar());

    return {
      ok: true,
      mensaje:
        'Recurso aprobado y publicado. Actualiza las recomendaciones del aula para verlo como validado.',
      recursoCurado: guardado,
    };
  }

  /** Registra el mejor pendiente de un contexto en la cola docente. */
  private async registrarPendientePrincipal(
    contexto: ContextoAcademico,
    claveContexto: string,
    recurso: RecursoVideo | undefined
  ): Promise<void> {
    if (!recurso) return;
    const ahoraISO = iso(this.ahora());
    await this.almacen.registrarCandidatoRevision({
      id: `${claveContexto}:${recurso.id}`,
      contextoClave: claveContexto,
      contexto,
      recurso,
      estado: 'PENDIENTE',
      solicitudes: 0,
      fechaCreacion: ahoraISO,
      fechaActualizacion: ahoraISO,
    });
  }

  /** Clasifica según fallos críticos, evidencia académica y reproducibilidad. */
  private clasificar(
    tecnica: ValidacionTecnica,
    academica: ValidacionAcademica
  ): RecursoVideo['estado'] {
    const fallos = new Set(
      tecnica.comprobaciones
        .filter((comprobacion) => comprobacion.resultado === 'falla')
        .map((comprobacion) => comprobacion.id)
    );

    if (
      fallos.has('ID_FORMATO') ||
      fallos.has('EXISTENCIA') ||
      fallos.has('PRIVACIDAD') ||
      fallos.has('PROCESAMIENTO') ||
      fallos.has('REGION')
    ) {
      return 'RECHAZADO';
    }

    if (academica.rechazoDuro) return 'RECHAZADO';
    if (tecnica.superada && academica.superada) return 'VALIDADO';
    if (academica.puntuacion >= 45) return 'PENDIENTE_REVISION';
    return 'RECHAZADO';
  }

  /** Construye el recurso visible con toda su evidencia de validación. */
  private construirRecurso(
    candidato: CandidatoVideo,
    tecnica: ValidacionTecnica,
    academica: ValidacionAcademica,
    estado: RecursoVideo['estado'],
    consulta: string,
    contexto: ContextoAcademico
  ): RecursoVideo {
    const idioma =
      candidato.idiomaDeclarado ||
      candidato.curado?.idioma ||
      (academica.idiomaEvidencia === 'declarado' ||
      academica.idiomaEvidencia === 'manual'
        ? contexto.idioma
        : undefined);

    return {
      id: candidato.id,
      titulo: candidato.titulo,
      canal: candidato.canal,
      url: construirUrlVideoYouTube(candidato.id),
      embedUrl: construirUrlEmbedYouTube(candidato.id, contexto.idioma),
      miniaturaUrl: candidato.miniaturaUrl || construirMiniaturaYouTube(candidato.id),
      descripcion: candidato.descripcion?.slice(0, 600),
      duracionSegundos: candidato.duracionSegundos,
      duracionTexto: formatearDuracion(candidato.duracionSegundos),
      idioma,
      publicadoEn: candidato.publicadoEn,
      estado,
      validacion: {
        versionCriterios: VERSION_CRITERIOS,
        fechaValidacion: academica.fechaValidacion,
        tecnica,
        academica,
      },
      puntuacion: academica.puntuacion,
      motivos: academica.motivos,
      origen: candidato.origen,
      reproduceIntegrado:
        tecnica.embedPermitido === true &&
        tecnica.regionPermitida !== false &&
        tecnica.privacidad !== 'private',
      busqueda: consulta,
    };
  }

  /** Aplica exclusiones y cuarentena a una respuesta cacheada. */
  private filtrarRespuesta(
    respuesta: ResultadoRecomendaciones,
    excluir: Set<string>,
    cuarentena: Set<string>,
    enComprobacion: Set<string>,
    contexto: ContextoAcademico
  ): ResultadoRecomendaciones {
    const filtrar = (recurso: RecursoVideo) =>
      !excluir.has(recurso.id) && !cuarentena.has(recurso.id);

    // Un recurso reportado una sola vez se mueve de "validado" a "pendiente".
    // Se conserva accesible, pero nunca se presenta como verificado.
    const todos = [...respuesta.recursos, ...respuesta.pendientes]
      .filter(filtrar)
      .map((recurso) => {
        if (!enComprobacion.has(recurso.id) || recurso.estado !== 'VALIDADO') {
          return recurso;
        }
        return {
          ...recurso,
          estado: 'PENDIENTE_REVISION' as const,
          motivos: [
            'Reportado por un estudiante; el recurso está en comprobación y no se presenta como validado.',
            ...recurso.motivos,
          ],
        };
      });

    const recursos = todos
      .filter((recurso) => recurso.estado === 'VALIDADO')
      .slice(0, MAX_RECURSOS_VALIDADOS);
    const pendientes = todos
      .filter((recurso) => recurso.estado === 'PENDIENTE_REVISION')
      .slice(0, MAX_RECURSOS_PENDIENTES);
    let mensaje = respuesta.mensaje;
    if (recursos.length === 0) {
      mensaje =
        pendientes.length > 0
          ? 'No hay recomendaciones validadas disponibles para este tema. Las alternativas pendientes no se presentan como verificadas.'
          : 'No hay recursos disponibles para este tema en este momento. Usa la búsqueda contextualizada para elegir otra explicación.';
    }
    return {
      ...respuesta,
      contexto: resumirContexto(contexto),
      recursos,
      pendientes,
      mensaje,
    };
  }

  /** Construye una respuesta vacía segura y coherente para la interfaz. */
  private respuestaVacia(datos: {
    contexto: ContextoAcademico;
    claveContexto: string;
    consulta: string;
    busquedaUrl: string;
    origen: ResultadoRecomendaciones['origen'];
    mensaje: string;
    advertencia?: string;
    cache: ResultadoRecomendaciones['cache'];
  }): ResultadoRecomendaciones {
    const generadoEn = this.ahora();
    return {
      ok: true,
      origen: datos.origen,
      contexto: resumirContexto(datos.contexto),
      claveContexto: datos.claveContexto,
      consulta: datos.consulta,
      busquedaUrl: datos.busquedaUrl,
      generadoEn: iso(generadoEn),
      expiraEn: iso(generadoEn + TTL_SIN_RESULTADOS_MS),
      cache: datos.cache,
      recursos: [],
      pendientes: [],
      mensaje: datos.mensaje,
      advertencia: datos.advertencia,
    };
  }
}

/**
 * Instancia compartida por las rutas API. En Next.js cada proceso mantiene su
 * propia caché; la persistencia en disco permite reutilizarla al reiniciar.
 */
export const educationalResourcesService = new EducationalResourcesService();
