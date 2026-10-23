/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Pruebas del Proveedor Mixto
 * ARCHIVO: tests/educational-resources/provider.test.ts
 *
 * PROPÓSITO:
 * Verifica que los recursos aprobados manualmente se mezclen con los resultados
 * de YouTube API cuando la clave está configurada. Así una aprobación docente
 * no queda ignorada por el modo API.
 * ==============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { ContextoAcademico, RecursoCurado } from '@/types/educationalResources';
import { VERSION_CRITERIOS } from '@/lib/educational-resources/constants';
import { guardarRecursoCurado } from '@/lib/educational-resources/catalog';
import { YouTubeProvider } from '@/lib/educational-resources/youtubeProvider';

const contexto: ContextoAcademico = {
  edad: 8,
  nivel: 'Básica Elemental',
  curso: '4° de EGB',
  asignatura: 'Matemáticas',
  area: 'MATEMATICAS',
  unidad: 'Fracciones equivalentes y comparación',
  tema: 'Fracciones equivalentes',
  subtema: 'Comparar fracciones con distinto denominador',
  objetivos: ['Reconocer fracciones equivalentes'],
  conceptos: ['fracción equivalente'],
  idioma: 'es',
};

function json(cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('mezcla recursos curados aprobados con resultados de la API', async () => {
  const directorio = await fs.mkdtemp(path.join(os.tmpdir(), 'wa-provider-'));
  const ruta = path.join(directorio, 'curated.json');
  const anterior = process.env.EDUCATIONAL_VIDEO_CATALOG_PATH;
  process.env.EDUCATIONAL_VIDEO_CATALOG_PATH = ruta;

  const curado: RecursoCurado = {
    id: 'Curated0001',
    titulo: 'Video curado de fracciones',
    canal: 'Canal curado',
    descripcion: 'Recurso revisado para fracciones equivalentes.',
    duracionSegundos: 600,
    idioma: 'es',
    temas: ['Fracciones equivalentes', 'Fracciones equivalentes y comparación'],
    asignaturas: ['Matemáticas'],
    niveles: ['Básica Elemental', '4° de EGB'],
    embedVerificado: true,
    regionPermitida: true,
    privacidadVerificada: 'public',
    revisionManual: {
      validador: 'Revisión docente',
      fecha: new Date().toISOString(),
      versionCriterios: VERSION_CRITERIOS,
      evidencia: 'Revisión completa del video y de su reproducción integrada.',
      alcance: 'ambos',
    },
  };

  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = new URL(typeof input === 'string' ? input : input.toString());
    if (url.hostname === 'www.youtube.com' && url.pathname === '/oembed') {
      return json({
        title: 'Video curado de fracciones',
        author_name: 'Canal curado',
        thumbnail_url: 'https://i.ytimg.com/vi/Curated0001/hqdefault.jpg',
      });
    }
    if (
      url.hostname === 'www.googleapis.com' &&
      url.pathname === '/youtube/v3/search'
    ) {
      return json({ items: [{ id: { videoId: 'ApiVideo001' } }] });
    }
    if (
      url.hostname === 'www.googleapis.com' &&
      url.pathname === '/youtube/v3/videos'
    ) {
      return json({
        items: [
          {
            id: 'ApiVideo001',
            snippet: {
              title: 'Fracciones equivalentes explicación paso a paso',
              channelTitle: 'Canal API',
              description: 'Aprende fracciones equivalentes con ejemplos y ejercicios.',
              publishedAt: '2026-01-01T00:00:00Z',
              thumbnails: {
                high: { url: 'https://i.ytimg.com/vi/ApiVideo001/hqdefault.jpg' },
              },
            },
            contentDetails: { duration: 'PT8M' },
            status: {
              privacyStatus: 'public',
              embeddable: true,
              uploadStatus: 'processed',
            },
          },
        ],
      });
    }
    return new Response('{}', { status: 404 });
  }) as typeof fetch;

  try {
    await guardarRecursoCurado(curado);
    const proveedor = new YouTubeProvider({
      apiKey: 'clave-de-prueba',
      region: 'EC',
      fetchImpl,
    });
    const resultado = await proveedor.buscar(
      contexto,
      'Fracciones equivalentes explicación paso a paso primaria español'
    );

    assert.equal(resultado.origen, 'youtube_api');
    const candidatoCurado = resultado.candidatos.find(
      (candidato) => candidato.id === 'Curated0001'
    );
    assert.ok(candidatoCurado);
    assert.equal(candidatoCurado.origen, 'catalogo_curado');
    assert.equal(candidatoCurado.tecnico?.existe, true);
    assert.equal(candidatoCurado.tecnico?.embedPermitido, true);
    assert.equal(candidatoCurado.tecnico?.regionPermitida, true);
    assert.equal(candidatoCurado.tecnico?.privacidad, 'public');
    assert.equal(
      candidatoCurado.curado?.revisionManual?.versionCriterios,
      VERSION_CRITERIOS
    );
    assert.equal(
      resultado.candidatos.some(
        (candidato) =>
          candidato.id === 'ApiVideo001' &&
          candidato.origen === 'youtube_api'
      ),
      true
    );
  } finally {
    if (anterior === undefined) delete process.env.EDUCATIONAL_VIDEO_CATALOG_PATH;
    else process.env.EDUCATIONAL_VIDEO_CATALOG_PATH = anterior;
    await fs.rm(directorio, { recursive: true, force: true });
  }
});
