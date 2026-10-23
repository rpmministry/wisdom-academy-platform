/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Catálogo Curado de Videos
 * ARCHIVO: src/lib/educational-resources/catalog.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Permite que el equipo académico incorpore videos revisados manualmente cuando
 * no exista API de YouTube o cuando se prefiera una selección institucional.
 *
 * IMPORTANTE:
 * La lista semilla está vacía a propósito. No se inventan identificadores ni se
 * presentan videos como validados sin una revisión humana registrada. Para
 * publicar un recurso, el equipo debe verificar el ID, la reproducción
 * integrada, el idioma, la región y la pertinencia curricular, y registrar la
 * evidencia en `revisionManual`.
 *
 * Fuentes admitidas:
 * 1. `src/lib/educational-resources/catalog.ts` (semilla institucional).
 * 2. `EDUCATIONAL_VIDEO_CATALOG_PATH` (ruta JSON en servidor).
 * 3. `.data/educational-resources/curated.json` (persistencia local opcional).
 * ==============================================================================
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { ContextoAcademico, RecursoCurado } from '@/types/educationalResources';
import { esIdYouTubeValido, normalizarComparacion } from './text';
import {
  construirPerfilSemantico,
  evaluarCoincidenciaSemantica,
} from './semanticSearch';

/**
 * Semilla institucional. Mantener vacía hasta contar con videos verificados por
 * un responsable académico. Cada entrada debe incluir evidencia y fecha.
 */
export const RECURSOS_CURADOS_SEMILLA: RecursoCurado[] = [];

/** Ruta por defecto del catálogo persistido localmente. */
function rutaCatalogoPorDefecto(): string {
  return path.join(
    process.env.EDUCATIONAL_RESOURCES_DATA_DIR ||
      path.join(process.cwd(), '.data', 'educational-resources'),
    'curated.json'
  );
}

/** Ruta usada para publicar aprobaciones docentes. */
function rutaCatalogoEscritura(): string {
  return (
    process.env.EDUCATIONAL_VIDEO_CATALOG_PATH || rutaCatalogoPorDefecto()
  );
}

/** Valida la forma mínima de una entrada de catálogo. */
function normalizarEntradaCurada(valor: unknown): RecursoCurado | null {
  if (!valor || typeof valor !== 'object') return null;
  const entrada = valor as Partial<RecursoCurado>;
  if (!esIdYouTubeValido(entrada.id)) return null;
  if (typeof entrada.titulo !== 'string' || !entrada.titulo.trim()) return null;
  if (entrada.idioma !== 'es' && entrada.idioma !== 'en') return null;
  if (!Array.isArray(entrada.temas) || entrada.temas.length === 0) return null;
  if (typeof entrada.canal !== 'string' || !entrada.canal.trim()) return null;

  const temas = entrada.temas
    .filter((tema): tema is string => typeof tema === 'string' && Boolean(tema.trim()))
    .map((tema) => tema.trim().slice(0, 160))
    .slice(0, 12);
  if (temas.length === 0) return null;

  return {
    id: entrada.id,
    titulo: entrada.titulo.trim().slice(0, 200),
    canal: entrada.canal.trim().slice(0, 160),
    descripcion:
      typeof entrada.descripcion === 'string'
        ? entrada.descripcion.trim().slice(0, 600)
        : undefined,
    duracionSegundos:
      typeof entrada.duracionSegundos === 'number' &&
      Number.isFinite(entrada.duracionSegundos) &&
      entrada.duracionSegundos > 0
        ? Math.round(entrada.duracionSegundos)
        : undefined,
    idioma: entrada.idioma,
    temas,
    asignaturas: Array.isArray(entrada.asignaturas)
      ? entrada.asignaturas
          .filter((item): item is string => typeof item === 'string')
          .slice(0, 12)
      : undefined,
    niveles: Array.isArray(entrada.niveles)
      ? entrada.niveles
          .filter((item): item is string => typeof item === 'string')
          .slice(0, 8)
      : undefined,
    embedVerificado: entrada.embedVerificado === true,
    regionPermitida:
      typeof entrada.regionPermitida === 'boolean' ? entrada.regionPermitida : undefined,
    privacidadVerificada:
      entrada.privacidadVerificada === 'public' || entrada.privacidadVerificada === 'unlisted'
        ? entrada.privacidadVerificada
        : undefined,
    revisionManual:
      entrada.revisionManual &&
      typeof entrada.revisionManual.validador === 'string' &&
      typeof entrada.revisionManual.fecha === 'string' &&
      typeof entrada.revisionManual.versionCriterios === 'string'
        ? {
            validador: entrada.revisionManual.validador.slice(0, 120),
            fecha: entrada.revisionManual.fecha,
            versionCriterios: entrada.revisionManual.versionCriterios.slice(0, 60),
            evidencia: (entrada.revisionManual.evidencia || '').slice(0, 600),
            alcance:
              entrada.revisionManual.alcance === 'tecnico' ||
              entrada.revisionManual.alcance === 'academico' ||
              entrada.revisionManual.alcance === 'ambos'
                ? entrada.revisionManual.alcance
                : 'ambos',
          }
        : undefined,
  };
}

/**
 * Carga el catálogo semilla y, si existe, el archivo JSON configurado. Los
 * errores de lectura no interrumpen el aula: se devuelve sólo la semilla.
 */
export async function cargarCatalogoCurado(): Promise<RecursoCurado[]> {
  const rutaConfigurada = process.env.EDUCATIONAL_VIDEO_CATALOG_PATH;
  const rutas = [rutaConfigurada, rutaCatalogoPorDefecto()].filter(Boolean) as string[];
  const entradas: RecursoCurado[] = [...RECURSOS_CURADOS_SEMILLA];

  for (const ruta of rutas) {
    try {
      const contenido = await fs.readFile(ruta, 'utf8');
      const parseado = JSON.parse(contenido);
      if (!Array.isArray(parseado)) continue;
      for (const item of parseado.slice(0, 200)) {
        const normalizado = normalizarEntradaCurada(item);
        if (normalizado) entradas.push(normalizado);
      }
    } catch {
      // El catálogo es opcional. Si no existe o está mal formado, se ignora.
    }
  }

  const unicos = new Map<string, RecursoCurado>();
  for (const entrada of entradas) {
    if (!unicos.has(entrada.id)) unicos.set(entrada.id, entrada);
  }
  return Array.from(unicos.values());
}

/**
 * Publica una aprobación docente en el catálogo persistente. La escritura es
 * atómica y conserva las entradas existentes. Esta función sólo debe invocarse
 * desde una ruta administrativa autenticada en el servidor.
 */
export async function guardarRecursoCurado(
  entrada: RecursoCurado
): Promise<RecursoCurado> {
  const normalizada = normalizarEntradaCurada(entrada);
  if (!normalizada) {
    throw new Error('La entrada curada no tiene la forma mínima requerida.');
  }

  const ruta = rutaCatalogoEscritura();
  await fs.mkdir(path.dirname(ruta), { recursive: true });

  let existentes: RecursoCurado[] = [];
  try {
    const contenido = await fs.readFile(ruta, 'utf8');
    const parseado = JSON.parse(contenido);
    if (Array.isArray(parseado)) {
      existentes = parseado
        .map((item) => normalizarEntradaCurada(item))
        .filter((item): item is RecursoCurado => Boolean(item));
    }
  } catch {
    existentes = [];
  }

  const mapa = new Map(existentes.map((item) => [item.id, item]));
  mapa.set(normalizada.id, normalizada);
  const contenidoFinal = JSON.stringify(Array.from(mapa.values()), null, 2);
  const temporal = `${ruta}.tmp`;
  await fs.writeFile(temporal, contenidoFinal, 'utf8');
  await fs.rename(temporal, ruta);
  return normalizada;
}

/**
 * Selecciona recursos curados que cubren el contexto actual. Se exige
 * coincidencia de asignatura/nivel cuando el catálogo los declara y una
 * correspondencia semántica con el tema puntual, no solo con la materia.
 */
export function filtrarCatalogoParaContexto(
  catalogo: RecursoCurado[],
  contexto: ContextoAcademico
): RecursoCurado[] {
  const asignatura = normalizarComparacion(contexto.asignatura);
  const nivel = normalizarComparacion(`${contexto.nivel} ${contexto.curso}`);
  const perfil = construirPerfilSemantico(contexto);

  return catalogo
    .map((recurso) => ({
      recurso,
      coincidencia: evaluarCoincidenciaSemantica(
        {
          titulo: recurso.titulo,
          descripcion: recurso.descripcion,
          canal: recurso.canal,
          temas: recurso.temas,
        },
        perfil
      ),
    }))
    .filter(({ recurso, coincidencia }) => {
      if (
        recurso.asignaturas &&
        recurso.asignaturas.length > 0 &&
        !recurso.asignaturas.some((item) => {
          const normalizado = normalizarComparacion(item);
          return asignatura.includes(normalizado) || normalizado.includes(asignatura);
        })
      ) {
        return false;
      }

      if (
        recurso.niveles &&
        recurso.niveles.length > 0 &&
        !recurso.niveles.some((item) => {
          const normalizado = normalizarComparacion(item);
          const curso = normalizarComparacion(contexto.curso);
          return nivel.includes(normalizado) || normalizado.includes(curso);
        })
      ) {
        return false;
      }

      return coincidencia.coincidenciaNucleo && coincidencia.puntuacion >= 30;
    })
    .sort((a, b) => b.coincidencia.puntuacion - a.coincidencia.puntuacion)
    .slice(0, 6)
    .map(({ recurso }) => recurso);
}
