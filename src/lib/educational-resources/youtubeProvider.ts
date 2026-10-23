/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Proveedor de Videos de YouTube
 * ARCHIVO: src/lib/educational-resources/youtubeProvider.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Encapsula toda comunicación con YouTube en el servidor. La clave de API vive
 * exclusivamente en `process.env.YOUTUBE_API_KEY`; nunca se envía al navegador.
 *
 * Modos de operación:
 * 1. YouTube Data API v3: búsqueda y metadatos verificables (modo preferido).
 * 2. Catálogo curado: videos revisados manualmente cuando no hay API.
 * 3. Solo enlaces: búsqueda contextual externa cuando no hay credenciales.
 *
 * Todas las solicitudes tienen tiempo límite y los errores se clasifican para
 * distinguir un video inexistente de una caída temporal de la API.
 * ==============================================================================
 */

import type {
  CandidatoVideo,
  ContextoAcademico,
  DatosTecnicosVideo,
  ModoProveedorRecursos,
  RecursoCurado,
} from '@/types/educationalResources';
import {
  MAX_CONSULTAS_BUSQUEDA_API,
  MAX_RESULTADOS_BUSQUEDA,
  MIN_RESULTADOS_ANTES_DE_AMPLIAR,
  REGION_POR_DEFECTO,
  TIMEOUT_API_YOUTUBE_MS,
  TIMEOUT_OEMBED_MS,
} from './constants';
import { cargarCatalogoCurado, filtrarCatalogoParaContexto } from './catalog';
import { construirConsultasBusquedaSemantica } from './semanticSearch';
import {
  construirMiniaturaYouTube,
  construirUrlVideoYouTube,
  esIdYouTubeValido,
  parsearDuracionISO8601,
} from './text';

/** Error de proveedor con un código estable para las capas superiores. */
export class ErrorProveedorVideo extends Error {
  public readonly codigo: 'RED' | 'API' | 'CUOTA' | 'CONFIG';

  constructor(codigo: 'RED' | 'API' | 'CUOTA' | 'CONFIG', mensaje: string) {
    super(mensaje);
    this.name = 'ErrorProveedorVideo';
    this.codigo = codigo;
  }
}

/** Resultado de una búsqueda en cualquiera de los modos disponibles. */
export interface ResultadoBusquedaProveedor {
  origen: ModoProveedorRecursos;
  candidatos: CandidatoVideo[];
  advertencia?: string;
}

/** Resultado de verificar la existencia y metadatos de un video puntual. */
export interface ResultadoExistenciaVideo {
  datos: DatosTecnicosVideo;
  titulo?: string;
  canal?: string;
  descripcion?: string;
  miniaturaUrl?: string;
  duracionSegundos?: number;
  idiomaDeclarado?: string;
  publicadoEn?: string;
}

/** Contrato que permite sustituir el proveedor por uno falso en pruebas. */
export interface ProveedorVideos {
  modo(): ModoProveedorRecursos;
  buscar(contexto: ContextoAcademico, consulta: string): Promise<ResultadoBusquedaProveedor>;
  obtenerDetalles(ids: string[]): Promise<CandidatoVideo[]>;
  validarExistencia(id: string): Promise<ResultadoExistenciaVideo>;
}

/** Respuesta parcial de la API de YouTube usada en el mapeo. */
interface RespuestaYouTube {
  items?: Array<Record<string, any>>;
  error?: {
    code?: number;
    message?: string;
    errors?: Array<{ reason?: string }>;
  };
}

/** Ejecuta un fetch con un tiempo límite explícito y sin caché. */
async function fetchConTiempoLimite(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      signal: controlador.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    const esAbortado = error instanceof Error && error.name === 'AbortError';
    throw new ErrorProveedorVideo(
      'RED',
      esAbortado
        ? 'YouTube tardó demasiado en responder.'
        : 'No fue posible conectarse con YouTube.'
    );
  } finally {
    clearTimeout(temporizador);
  }
}

/** Extrae un mensaje de error seguro, sin claves ni URLs internas. */
function mensajeErrorApi(respuesta: RespuestaYouTube, status: number): string {
  const razon = respuesta.error?.errors?.[0]?.reason || '';
  if (razon === 'quotaExceeded' || razon === 'dailyLimitExceeded') {
    return 'Se agotó temporalmente la cuota de búsqueda de YouTube.';
  }
  const mensaje = respuesta.error?.message || '';
  return mensaje
    ? `YouTube rechazó la consulta (${status}): ${mensaje.slice(0, 180)}`
    : `YouTube rechazó la consulta (${status}).`;
}

/** Convierte el estado de YouTube en el tipo interno de privacidad. */
function mapearPrivacidad(valor: unknown): 'public' | 'private' | 'unlisted' | 'unknown' {
  if (valor === 'public' || valor === 'private' || valor === 'unlisted') return valor;
  return 'unknown';
}

/** Determina si la restricción regional permite la región de la plataforma. */
function evaluarRegion(
  restriccion: any,
  region: string
): boolean | undefined {
  if (!restriccion || typeof restriccion !== 'object') return true;
  const bloqueados = Array.isArray(restriccion.blocked) ? restriccion.blocked : [];
  const permitidos = Array.isArray(restriccion.allowed) ? restriccion.allowed : [];
  if (bloqueados.length > 0) return !bloqueados.includes(region);
  if (permitidos.length > 0) return permitidos.includes(region);
  return true;
}

/** Mapea un elemento de `videos.list` al candidato interno. */
function mapearVideoApi(item: Record<string, any>, region: string): CandidatoVideo | null {
  const id = item?.id;
  if (!esIdYouTubeValido(id)) return null;

  const snippet = item.snippet || {};
  const contentDetails = item.contentDetails || {};
  const status = item.status || {};
  const duracion = parsearDuracionISO8601(contentDetails.duration);
  const idiomaDeclarado =
    typeof snippet.defaultAudioLanguage === 'string'
      ? snippet.defaultAudioLanguage
      : typeof snippet.defaultLanguage === 'string'
      ? snippet.defaultLanguage
      : undefined;

  const miniaturas = snippet.thumbnails || {};
  const miniaturaUrl =
    miniaturas.high?.url || miniaturas.medium?.url || miniaturas.default?.url ||
    construirMiniaturaYouTube(id);

  const tecnico: DatosTecnicosVideo = {
    fuente: 'youtube_api',
    existe: true,
    privacidad: mapearPrivacidad(status.privacyStatus),
    embedPermitido:
      typeof status.embeddable === 'boolean' ? status.embeddable : undefined,
    regionPermitida: evaluarRegion(contentDetails.regionRestriction, region),
    uploadStatus:
      typeof status.uploadStatus === 'string' ? status.uploadStatus : undefined,
    duracionVerificada: duracion !== undefined,
    idiomaVerificado: Boolean(idiomaDeclarado),
  };

  return {
    id,
    titulo: typeof snippet.title === 'string' ? snippet.title.slice(0, 200) : 'Video educativo',
    canal:
      typeof snippet.channelTitle === 'string'
        ? snippet.channelTitle.slice(0, 160)
        : 'Canal de YouTube',
    descripcion:
      typeof snippet.description === 'string' ? snippet.description.slice(0, 1200) : '',
    duracionSegundos: duracion,
    idiomaDeclarado,
    publicadoEn:
      typeof snippet.publishedAt === 'string' ? snippet.publishedAt : undefined,
    miniaturaUrl,
    origen: 'youtube_api',
    tecnico,
  };
}

/** Convierte un recurso curado en candidato, con evidencia manual declarada. */
function mapearCurado(
  curado: RecursoCurado,
  idiomaClase: 'es' | 'en'
): CandidatoVideo {
  return {
    id: curado.id,
    titulo: curado.titulo,
    canal: curado.canal,
    descripcion: curado.descripcion || '',
    duracionSegundos: curado.duracionSegundos,
    idiomaDeclarado: curado.idioma,
    miniaturaUrl: construirMiniaturaYouTube(curado.id),
    origen: 'catalogo_curado',
    curado,
    tecnico: {
      fuente: 'curado',
      existe: true,
      privacidad: curado.privacidadVerificada || 'unknown',
      embedPermitido: curado.embedVerificado ? true : undefined,
      regionPermitida: curado.regionPermitida,
      uploadStatus: 'processed',
      duracionVerificada: Boolean(curado.duracionSegundos),
      idiomaVerificado: curado.idioma === idiomaClase,
    },
  };
}

/**
 * Proveedor oficial de YouTube. Se instancia una vez por proceso del servidor.
 */
export class YouTubeProvider implements ProveedorVideos {
  private readonly apiKey: string | null;
  private readonly region: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opciones?: {
    apiKey?: string | null;
    region?: string;
    fetchImpl?: typeof fetch;
  }) {
    this.apiKey = opciones?.apiKey ?? process.env.YOUTUBE_API_KEY ?? null;
    this.region = opciones?.region ?? process.env.YOUTUBE_REGION_CODE ?? REGION_POR_DEFECTO;
    this.fetchImpl = opciones?.fetchImpl ?? fetch;
  }

  /** Indica el modo preferente según la presencia de credenciales. */
  public modo(): ModoProveedorRecursos {
    return this.apiKey ? 'youtube_api' : 'catalogo_curado';
  }

  /** Búsqueda contextual: API oficial, catálogo curado o enlaces externos. */
  public async buscar(
    contexto: ContextoAcademico,
    consulta: string
  ): Promise<ResultadoBusquedaProveedor> {
    let candidatosCurados: CandidatoVideo[] = [];
    let advertenciaCurados: string | undefined;

    // Los recursos aprobados por docentes se consultan siempre. Así un video
    // curado puede mejorar una búsqueda de la API o cubrir un tema donde la
    // API no devuelve resultados.
    try {
      const catalogo = await cargarCatalogoCurado();
      const curados = filtrarCatalogoParaContexto(catalogo, contexto);
      candidatosCurados = await this.prepararCandidatosCurados(curados, contexto);
    } catch {
      advertenciaCurados =
        'No se pudieron verificar los recursos revisados manualmente.';
    }

    if (this.apiKey) {
      try {
        const consultas = this.prepararConsultas(contexto, consulta);
        const candidatosApi = await this.buscarConApi(contexto, consultas);
        return {
          origen: 'youtube_api',
          candidatos: [...candidatosCurados, ...candidatosApi],
          advertencia:
            candidatosCurados.length > 0
              ? 'Se incluyen recursos del catálogo revisado por docentes.'
              : advertenciaCurados,
        };
      } catch (error) {
        if (candidatosCurados.length > 0) {
          return {
            origen: 'catalogo_curado',
            candidatos: candidatosCurados,
            advertencia:
              'YouTube no respondió; se muestran recursos revisados por docentes.',
          };
        }
        throw error;
      }
    }

    if (candidatosCurados.length > 0) {
      return {
        origen: 'catalogo_curado',
        candidatos: candidatosCurados,
        advertencia:
          'Las recomendaciones provienen del catálogo curado institucional. La evidencia de revisión manual se muestra en el panel.',
      };
    }

    if (advertenciaCurados) {
      throw new ErrorProveedorVideo(
        'RED',
        'No fue posible verificar los recursos del catálogo con YouTube.'
      );
    }

    return {
      origen: 'solo_enlaces',
      candidatos: [],
      advertencia:
        'La búsqueda automática de YouTube no está configurada o el catálogo curado está vacío. Se ofrece una búsqueda contextualizada.',
    };
  }

  /** Verifica la existencia de los recursos curados y adjunta evidencia. */
  private async prepararCandidatosCurados(
    curados: RecursoCurado[],
    contexto: ContextoAcademico
  ): Promise<CandidatoVideo[]> {
    if (curados.length === 0) return [];

    const candidatos: CandidatoVideo[] = [];
    let fallosDeRed = 0;
    const resultados = await Promise.allSettled(
      curados.map(async (curado) => {
        const existencia = await this.validarExistencia(curado.id);
        const candidato = mapearCurado(curado, contexto.idioma);
        if (existencia.datos.existe) {
          candidato.titulo = existencia.titulo || candidato.titulo;
          candidato.canal = existencia.canal || candidato.canal;
          candidato.miniaturaUrl = existencia.miniaturaUrl || candidato.miniaturaUrl;
          // Con API oficial, los hechos técnicos de YouTube prevalecen sobre
          // la confirmación manual. Si la API dice que no se puede insertar,
          // el recurso queda pendiente aunque el revisor lo haya marcado.
          candidato.tecnico =
            existencia.datos.fuente === 'youtube_api'
              ? {
                  ...candidato.tecnico,
                  ...existencia.datos,
                  existe: true,
                  errorTipo: undefined,
                  error: undefined,
                }
              : {
                  ...candidato.tecnico,
                  fuente: candidato.tecnico?.fuente || 'curado',
                  existe: true,
                  errorTipo: undefined,
                  error: undefined,
                };
        } else {
          candidato.tecnico = {
            ...candidato.tecnico,
            fuente: candidato.tecnico?.fuente || 'curado',
            existe: false,
            errorTipo: existencia.datos.errorTipo,
            error: existencia.datos.error,
          };
        }
        return candidato;
      })
    );

    for (const resultado of resultados) {
      if (resultado.status === 'fulfilled') {
        candidatos.push(resultado.value);
        if (
          !resultado.value.tecnico?.existe &&
          resultado.value.tecnico?.errorTipo === 'red'
        ) {
          fallosDeRed += 1;
        }
      } else {
        fallosDeRed += 1;
      }
    }

    // Si todas las verificaciones fallaron por red, se propaga el error para
    // que el servicio pueda responder con la caché verificada anteriormente.
    if (candidatos.length === 0 || fallosDeRed >= curados.length) {
      throw new ErrorProveedorVideo(
        'RED',
        'No fue posible verificar los recursos del catálogo con YouTube.'
      );
    }

    return candidatos;
  }

  /** Obtiene detalles oficiales de varios videos en una sola solicitud. */
  public async obtenerDetalles(ids: string[]): Promise<CandidatoVideo[]> {
    const idsValidos = Array.from(new Set(ids.filter(esIdYouTubeValido))).slice(0, 20);
    if (idsValidos.length === 0) return [];
    if (!this.apiKey) {
      const candidatos: CandidatoVideo[] = [];
      for (const id of idsValidos) {
        const existencia = await this.validarExistencia(id);
        if (existencia.datos.existe && existencia.titulo) {
          candidatos.push({
            id,
            titulo: existencia.titulo,
            canal: existencia.canal || 'Canal de YouTube',
            descripcion: existencia.descripcion || '',
            miniaturaUrl: existencia.miniaturaUrl || construirMiniaturaYouTube(id),
            origen: 'enlace_manual',
            tecnico: existencia.datos,
          });
        }
      }
      return candidatos;
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/videos');
    url.searchParams.set('part', 'snippet,contentDetails,status');
    url.searchParams.set('id', idsValidos.join(','));
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('maxResults', String(idsValidos.length));

    const respuesta = await fetchConTiempoLimite(
      this.fetchImpl,
      url.toString(),
      TIMEOUT_API_YOUTUBE_MS
    );
    const cuerpo = (await respuesta.json().catch(() => ({}))) as RespuestaYouTube;

    if (!respuesta.ok) {
      const razon = cuerpo.error?.errors?.[0]?.reason;
      throw new ErrorProveedorVideo(
        razon === 'quotaExceeded' || razon === 'dailyLimitExceeded' ? 'CUOTA' : 'API',
        mensajeErrorApi(cuerpo, respuesta.status)
      );
    }

    return (cuerpo.items || [])
      .map((item) => mapearVideoApi(item, this.region))
      .filter((item): item is CandidatoVideo => Boolean(item));
  }

  /**
   * Verifica un identificador puntual. Con API usa `videos.list`; sin API usa
   * oEmbed, que confirma existencia pero no permite afirmar inserción ni región.
   */
  public async validarExistencia(id: string): Promise<ResultadoExistenciaVideo> {
    if (!esIdYouTubeValido(id)) {
      return {
        datos: {
          fuente: 'desconocida',
          existe: false,
          errorTipo: 'no_encontrado',
          error: 'El identificador no es válido.',
        },
      };
    }

    if (this.apiKey) {
      try {
        const detalles = await this.obtenerDetalles([id]);
        const candidato = detalles[0];
        if (!candidato) {
          return {
            datos: {
              fuente: 'youtube_api',
              existe: false,
              errorTipo: 'no_encontrado',
              error: 'El video no existe o fue eliminado.',
            },
          };
        }
        return {
          datos: candidato.tecnico || { fuente: 'youtube_api', existe: true },
          titulo: candidato.titulo,
          canal: candidato.canal,
          descripcion: candidato.descripcion,
          miniaturaUrl: candidato.miniaturaUrl,
          duracionSegundos: candidato.duracionSegundos,
          idiomaDeclarado: candidato.idiomaDeclarado,
          publicadoEn: candidato.publicadoEn,
        };
      } catch (error) {
        const codigo = error instanceof ErrorProveedorVideo ? error.codigo : 'API';
        return {
          datos: {
            fuente: 'youtube_api',
            existe: false,
            errorTipo: codigo === 'RED' ? 'red' : 'api',
            error: 'No fue posible verificar el video en YouTube.',
          },
        };
      }
    }

    const url = new URL('https://www.youtube.com/oembed');
    url.searchParams.set('url', construirUrlVideoYouTube(id));
    url.searchParams.set('format', 'json');

    try {
      const respuesta = await fetchConTiempoLimite(
        this.fetchImpl,
        url.toString(),
        TIMEOUT_OEMBED_MS
      );

      if (respuesta.ok) {
        const cuerpo = (await respuesta.json().catch(() => ({}))) as {
          title?: string;
          author_name?: string;
          thumbnail_url?: string;
        };
        return {
          datos: {
            fuente: 'oembed',
            existe: true,
            privacidad: 'unknown',
            embedPermitido: undefined,
            regionPermitida: undefined,
            uploadStatus: undefined,
            duracionVerificada: false,
            idiomaVerificado: false,
          },
          titulo: typeof cuerpo.title === 'string' ? cuerpo.title.slice(0, 200) : undefined,
          canal:
            typeof cuerpo.author_name === 'string'
              ? cuerpo.author_name.slice(0, 160)
              : undefined,
          miniaturaUrl:
            typeof cuerpo.thumbnail_url === 'string'
              ? cuerpo.thumbnail_url
              : construirMiniaturaYouTube(id),
        };
      }

      if (respuesta.status === 401 || respuesta.status === 403) {
        return {
          datos: {
            fuente: 'oembed',
            existe: false,
            errorTipo: 'restringido',
            error: 'El video es privado o no permite acceso público.',
          },
        };
      }

      if (respuesta.status === 404) {
        return {
          datos: {
            fuente: 'oembed',
            existe: false,
            errorTipo: 'no_encontrado',
            error: 'El video no existe, fue eliminado o su enlace es incorrecto.',
          },
        };
      }

      return {
        datos: {
          fuente: 'oembed',
          existe: false,
          errorTipo: 'api',
          error: `YouTube respondió con estado ${respuesta.status}.`,
        },
      };
    } catch {
      return {
        datos: {
          fuente: 'oembed',
          existe: false,
          errorTipo: 'red',
          error: 'No fue posible conectarse con YouTube para verificar el video.',
        },
      };
    }
  }

  /**
   * Prepara la consulta principal y una consulta de refuerzo generada desde el
   * material real de la lección. La materia nunca va primero: el tema puntual
   * y sus frases clave tienen prioridad.
   */
  private prepararConsultas(
    contexto: ContextoAcademico,
    consultaPrincipal: string
  ): string[] {
    const semanticas = construirConsultasBusquedaSemantica(contexto).map(
      (item) => item.consulta
    );
    // La consulta semántica de lección va primero: incluye el tema puntual y
    // las frases del material. La consulta contextual queda como respaldo.
    const candidatas = [...semanticas, consultaPrincipal];
    const unicas: string[] = [];
    const vistos = new Set<string>();
    for (const candidata of candidatas) {
      const limpia = candidata.trim().slice(0, 200);
      if (!limpia) continue;
      const clave = limpia.toLowerCase();
      if (vistos.has(clave)) continue;
      vistos.add(clave);
      unicas.push(limpia);
      if (unicas.length >= MAX_CONSULTAS_BUSQUEDA_API) break;
    }
    return unicas;
  }

  /** Ejecuta una consulta de búsqueda y devuelve los IDs encontrados. */
  private async buscarIdsConApi(
    contexto: ContextoAcademico,
    consulta: string
  ): Promise<string[]> {
    if (!this.apiKey) return [];
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('q', consulta.slice(0, 200));
    url.searchParams.set('maxResults', String(MAX_RESULTADOS_BUSQUEDA));
    url.searchParams.set('order', 'relevance');
    url.searchParams.set('relevanceLanguage', contexto.idioma);
    url.searchParams.set('regionCode', this.region);
    url.searchParams.set('safeSearch', 'strict');
    url.searchParams.set('videoEmbeddable', 'true');
    url.searchParams.set('videoSyndicated', 'true');
    url.searchParams.set('key', this.apiKey);

    const respuesta = await fetchConTiempoLimite(
      this.fetchImpl,
      url.toString(),
      TIMEOUT_API_YOUTUBE_MS
    );
    const cuerpo = (await respuesta.json().catch(() => ({}))) as RespuestaYouTube;
    if (!respuesta.ok) {
      const razon = cuerpo.error?.errors?.[0]?.reason;
      throw new ErrorProveedorVideo(
        razon === 'quotaExceeded' || razon === 'dailyLimitExceeded' ? 'CUOTA' : 'API',
        mensajeErrorApi(cuerpo, respuesta.status)
      );
    }

    return (cuerpo.items || [])
      .map((item) => item?.id?.videoId)
      .filter(esIdYouTubeValido);
  }

  /**
   * Búsqueda oficial con filtros de inserción, sindicación y búsqueda segura.
   * Si la consulta principal devuelve pocos resultados, se usa una segunda
   * consulta semántica para cubrir el tema puntual sin disparar la cuota.
   */
  private async buscarConApi(
    contexto: ContextoAcademico,
    consultas: string[]
  ): Promise<CandidatoVideo[]> {
    if (!this.apiKey || consultas.length === 0) return [];
    const ids = new Set<string>();

    for (let indice = 0; indice < consultas.length; indice += 1) {
      try {
        const encontrados = await this.buscarIdsConApi(contexto, consultas[indice]);
        for (const id of encontrados) ids.add(id);
        if (ids.size >= MIN_RESULTADOS_ANTES_DE_AMPLIAR) break;
      } catch (error) {
        // Si ya hay resultados de la primera consulta, una falla de la
        // consulta de refuerzo no debe descartar lo encontrado.
        if (ids.size > 0) break;
        throw error;
      }
    }

    if (ids.size === 0) return [];
    return this.obtenerDetalles(Array.from(ids));
  }
}

/**
 * Instancia compartida por las rutas API. La clave se lee en el servidor al
 * cargar el módulo y no se serializa en ninguna respuesta.
 */
export const youtubeProvider = new YouTubeProvider();
