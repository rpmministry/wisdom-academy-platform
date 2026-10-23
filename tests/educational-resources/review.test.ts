/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Pruebas de Revisión y Aprobación
 * ARCHIVO: tests/educational-resources/review.test.ts
 *
 * PROPÓSITO:
 * Verifica la cola de revisión, las solicitudes desde el aula, la escritura del
 * catálogo curado, la aprobación docente y la protección por token.
 * ==============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type {
  CandidatoRevision,
  CandidatoVideo,
  ContextoAcademico,
  RecursoCurado,
  RecursoVideo,
} from '@/types/educationalResources';
import { VERSION_CRITERIOS } from '@/lib/educational-resources/constants';
import { AlmacenRecursosEducativos } from '@/lib/educational-resources/store';
import { EducationalResourcesService } from '@/lib/educational-resources/service';
import {
  cargarCatalogoCurado,
  filtrarCatalogoParaContexto,
  guardarRecursoCurado,
} from '@/lib/educational-resources/catalog';
import {
  adminRecursosConfigurado,
  tokenAdminValido,
} from '@/lib/educational-resources/adminAuth';
import type {
  ProveedorVideos,
  ResultadoBusquedaProveedor,
  ResultadoExistenciaVideo,
} from '@/lib/educational-resources/youtubeProvider';

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

class ProveedorRevision implements ProveedorVideos {
  public modo() {
    return 'catalogo_curado' as const;
  }
  public async buscar(): Promise<ResultadoBusquedaProveedor> {
    return { origen: 'catalogo_curado', candidatos: [] };
  }
  public async obtenerDetalles(): Promise<CandidatoVideo[]> {
    return [];
  }
  public async validarExistencia(id: string): Promise<ResultadoExistenciaVideo> {
    return {
      datos: {
        fuente: 'oembed',
        existe: true,
        privacidad: 'unknown',
        embedPermitido: undefined,
        regionPermitida: undefined,
        duracionVerificada: false,
        idiomaVerificado: false,
      },
      titulo: 'Fracciones equivalentes explicación paso a paso',
      canal: 'Canal educativo',
      duracionSegundos: 720,
    };
  }
}

function crearRecurso(): RecursoVideo {
  const fecha = new Date().toISOString();
  return {
    id: 'TestVideo01',
    titulo: 'Video de apoyo para la clase',
    canal: 'Canal educativo',
    url: 'https://www.youtube.com/watch?v=TestVideo01',
    embedUrl: 'https://www.youtube-nocookie.com/embed/TestVideo01?rel=0&hl=es',
    miniaturaUrl: 'https://i.ytimg.com/vi/TestVideo01/hqdefault.jpg',
    estado: 'PENDIENTE_REVISION',
    validacion: {
      versionCriterios: VERSION_CRITERIOS,
      fechaValidacion: fecha,
      tecnica: {
        superada: false,
        existe: true,
        fuente: 'oembed',
        comprobaciones: [],
      },
      academica: {
        superada: false,
        puntuacion: 50,
        coberturaTitulo: 0,
        coberturaTema: 0.2,
        nivelEvidencia: 'metadatos',
        idiomaEvidencia: 'desconocido',
        senales: [],
        motivos: ['Pendiente de revisión.'],
        rechazoDuro: false,
        versionCriterios: VERSION_CRITERIOS,
        fechaValidacion: fecha,
      },
    },
    puntuacion: 50,
    motivos: ['Pendiente de revisión.'],
    origen: 'youtube_api',
    reproduceIntegrado: false,
    busqueda: 'fracciones equivalentes',
  };
}

function crearCurado(): RecursoCurado {
  return {
    id: 'TestVideo01',
    titulo: 'Video de apoyo para la clase',
    canal: 'Canal educativo',
    descripcion: 'Recurso revisado para fracciones equivalentes.',
    duracionSegundos: 720,
    idioma: 'es',
    temas: ['Fracciones equivalentes', 'Fracciones equivalentes y comparación'],
    asignaturas: ['Matemáticas'],
    niveles: ['Básica Elemental', '4° de EGB'],
    embedVerificado: true,
    regionPermitida: true,
    privacidadVerificada: 'public',
    revisionManual: {
      validador: 'Coordinación Académica',
      fecha: new Date().toISOString(),
      versionCriterios: VERSION_CRITERIOS,
      evidencia: 'Video revisado completo y aprobado para la unidad.',
      alcance: 'ambos',
    },
  };
}

test('la cola de revisión registra solicitudes y aprobaciones', async () => {
  const almacen = new AlmacenRecursosEducativos({ persistir: false });
  const candidato: CandidatoRevision = {
    id: 'ctx:TestVideo01',
    contextoClave: 'ctx',
    contexto,
    recurso: crearRecurso(),
    estado: 'PENDIENTE',
    solicitudes: 0,
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toISOString(),
  };

  await almacen.registrarCandidatoRevision(candidato);
  assert.equal((await almacen.listarCandidatosRevision()).length, 1);
  assert.equal(await almacen.solicitarRevisionCandidato(candidato.id), true);
  const solicitada = (await almacen.listarCandidatosRevision())[0];
  assert.equal(solicitada.estado, 'SOLICITADA');
  assert.equal(solicitada.solicitudes, 1);

  await almacen.marcarCandidatoRevision(candidato.id, 'APROBADA', 'Aprobado');
  const aprobada = (await almacen.listarCandidatosRevision())[0];
  assert.equal(aprobada.estado, 'APROBADA');
  assert.equal(aprobada.notaRevision, 'Aprobado');
});

test('el catálogo curado se escribe, se lee y coincide con el contexto', async () => {
  const directorio = await fs.mkdtemp(path.join(os.tmpdir(), 'wa-recursos-'));
  const ruta = path.join(directorio, 'curated.json');
  const anterior = process.env.EDUCATIONAL_VIDEO_CATALOG_PATH;
  process.env.EDUCATIONAL_VIDEO_CATALOG_PATH = ruta;
  try {
    const guardado = await guardarRecursoCurado(crearCurado());
    assert.equal(guardado.id, 'TestVideo01');
    const catalogo = await cargarCatalogoCurado();
    const coincidencias = filtrarCatalogoParaContexto(catalogo, contexto);
    assert.equal(coincidencias.some((item) => item.id === 'TestVideo01'), true);
  } finally {
    if (anterior === undefined) delete process.env.EDUCATIONAL_VIDEO_CATALOG_PATH;
    else process.env.EDUCATIONAL_VIDEO_CATALOG_PATH = anterior;
    await fs.rm(directorio, { recursive: true, force: true });
  }
});

test('el token administrativo protege las rutas de revisión', () => {
  const anterior = process.env.EDUCATIONAL_RESOURCES_ADMIN_TOKEN;
  process.env.EDUCATIONAL_RESOURCES_ADMIN_TOKEN = 'token-prueba-123';
  try {
    assert.equal(adminRecursosConfigurado(), true);
    assert.equal(
      tokenAdminValido(new Headers({ 'x-educational-admin-token': 'token-prueba-123' })),
      true
    );
    assert.equal(
      tokenAdminValido(new Headers({ 'x-educational-admin-token': 'incorrecto' })),
      false
    );
    assert.equal(tokenAdminValido(new Headers()), false);
  } finally {
    if (anterior === undefined) delete process.env.EDUCATIONAL_RESOURCES_ADMIN_TOKEN;
    else process.env.EDUCATIONAL_RESOURCES_ADMIN_TOKEN = anterior;
  }
});

test('una solicitud del aula entra en la cola como SOLICITADA', async () => {
  const almacen = new AlmacenRecursosEducativos({ persistir: false });
  const servicio = new EducationalResourcesService({
    proveedor: new ProveedorRevision(),
    almacen,
  });

  const resultado = await servicio.solicitarRevision('TestVideo01', contexto, {
    reporteroHash: 'solicitante-prueba',
  });
  assert.equal(resultado.ok, true);
  assert.equal(resultado.estado, 'SOLICITADA');

  const cola = await almacen.listarCandidatosRevision();
  assert.equal(cola.length, 1);
  assert.equal(cola[0].recurso.id, 'TestVideo01');
  assert.equal(cola[0].estado, 'SOLICITADA');
});

test('la aprobación docente publica el recurso en el catálogo', async () => {
  const directorio = await fs.mkdtemp(path.join(os.tmpdir(), 'wa-aprobacion-'));
  const ruta = path.join(directorio, 'curated.json');
  const anterior = process.env.EDUCATIONAL_VIDEO_CATALOG_PATH;
  process.env.EDUCATIONAL_VIDEO_CATALOG_PATH = ruta;
  try {
    const almacen = new AlmacenRecursosEducativos({ persistir: false });
    const servicio = new EducationalResourcesService({
      proveedor: new ProveedorRevision(),
      almacen,
    });
    const resultado = await servicio.aprobarRecurso({
      videoId: 'TestVideo01',
      contexto,
      revisor: 'Coordinación Académica',
      evidencia: 'Video revisado completo; explica el tema y se reproduce bien.',
      confirmaciones: {
        pertinencia: true,
        idioma: true,
        nivel: true,
        seguridad: true,
        insercion: true,
        region: true,
      },
    });

    assert.equal(resultado.ok, true);
    assert.equal(resultado.recursoCurado?.id, 'TestVideo01');
    const contenido = JSON.parse(await fs.readFile(ruta, 'utf8')) as RecursoCurado[];
    assert.equal(contenido.some((item) => item.id === 'TestVideo01'), true);
    assert.equal(contenido[0].revisionManual?.validador, 'Coordinación Académica');
    assert.equal(contenido[0].embedVerificado, true);
  } finally {
    if (anterior === undefined) delete process.env.EDUCATIONAL_VIDEO_CATALOG_PATH;
    else process.env.EDUCATIONAL_VIDEO_CATALOG_PATH = anterior;
    await fs.rm(directorio, { recursive: true, force: true });
  }
});
