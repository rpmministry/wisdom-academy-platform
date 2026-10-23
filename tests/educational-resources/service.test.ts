/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Pruebas del Servicio de Recursos
 * ARCHIVO: tests/educational-resources/service.test.ts
 *
 * PROPÓSITO:
 * Verifica caché con vencimiento, ranking, reportes, cuarentena, sustitución
 * automática, límites de abuso y validación de enlaces externos sin depender de
 * la red ni de credenciales reales.
 * ==============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  CandidatoVideo,
  ContextoAcademico,
  ModoProveedorRecursos,
} from '@/types/educationalResources';
import { CacheConVencimiento } from '@/lib/educational-resources/cache';
import { LimitadorPeticiones } from '@/lib/educational-resources/rateLimit';
import { AlmacenRecursosEducativos } from '@/lib/educational-resources/store';
import { EducationalResourcesService } from '@/lib/educational-resources/service';
import {
  ErrorProveedorVideo,
  type ProveedorVideos,
  type ResultadoBusquedaProveedor,
  type ResultadoExistenciaVideo,
} from '@/lib/educational-resources/youtubeProvider';
import { calcularClaveContexto } from '@/lib/educational-resources/text';
import { VERSION_CRITERIOS } from '@/lib/educational-resources/constants';

const contexto: ContextoAcademico = {
  edad: 8,
  nivel: 'Básica Elemental',
  curso: '4° de EGB',
  asignatura: 'Matemáticas',
  area: 'MATEMATICAS',
  unidad: 'Fracciones equivalentes y comparación',
  tema: 'Fracciones equivalentes',
  subtema: 'Comparar fracciones con distinto denominador',
  objetivos: ['Reconocer fracciones equivalentes', 'Comparar fracciones'],
  conceptos: ['fracción equivalente', 'denominador común'],
  idioma: 'es',
  diapositiva: 1,
};

function candidato(id: string, parcial: Partial<CandidatoVideo> = {}): CandidatoVideo {
  return {
    id,
    titulo: 'Fracciones equivalentes explicación paso a paso para primaria',
    canal: 'Escuela de Matemáticas',
    descripcion:
      'Aprende qué son las fracciones equivalentes con ejemplos y ejercicios para niños de primaria.',
    duracionSegundos: 12 * 60,
    idiomaDeclarado: 'es',
    origen: 'youtube_api',
    tecnico: {
      fuente: 'youtube_api',
      existe: true,
      privacidad: 'public',
      embedPermitido: true,
      regionPermitida: true,
      uploadStatus: 'processed',
      duracionVerificada: true,
      idiomaVerificado: true,
    },
    ...parcial,
  };
}

class ProveedorFalso implements ProveedorVideos {
  public llamadasBusqueda = 0;
  public fallar = false;
  public origen: ModoProveedorRecursos;
  public existencia: ResultadoExistenciaVideo | undefined;

  constructor(
    public candidatos: CandidatoVideo[],
    origen: ModoProveedorRecursos = 'youtube_api',
    existencia?: ResultadoExistenciaVideo
  ) {
    this.origen = origen;
    this.existencia = existencia;
  }

  public modo(): ModoProveedorRecursos {
    return this.origen === 'youtube_api' ? 'youtube_api' : 'catalogo_curado';
  }

  public async buscar(): Promise<ResultadoBusquedaProveedor> {
    this.llamadasBusqueda += 1;
    if (this.fallar) {
      throw new ErrorProveedorVideo('RED', 'YouTube no respondió.');
    }
    return { origen: this.origen, candidatos: this.candidatos };
  }

  public async obtenerDetalles(): Promise<CandidatoVideo[]> {
    return this.candidatos;
  }

  public async validarExistencia(id: string): Promise<ResultadoExistenciaVideo> {
    return (
      this.existencia || {
        datos: {
          fuente: 'oembed',
          existe: true,
          privacidad: 'unknown',
          embedPermitido: undefined,
          regionPermitida: undefined,
          duracionVerificada: false,
          idiomaVerificado: false,
        },
        titulo: this.candidatos.find((item) => item.id === id)?.titulo,
        canal: this.candidatos.find((item) => item.id === id)?.canal,
      }
    );
  }
}

interface Entorno {
  servicio: EducationalResourcesService;
  proveedor: ProveedorFalso;
  almacen: AlmacenRecursosEducativos;
  cache: CacheConVencimiento<any>;
  reloj: { ahora: number };
}

function crearEntorno(
  candidatos: CandidatoVideo[],
  opciones?: { origen?: ModoProveedorRecursos; existencia?: ResultadoExistenciaVideo }
): Entorno {
  const reloj = { ahora: Date.parse('2026-10-21T12:00:00.000Z') };
  const ahora = () => reloj.ahora;
  const proveedor = new ProveedorFalso(
    candidatos,
    opciones?.origen || 'youtube_api',
    opciones?.existencia
  );
  const almacen = new AlmacenRecursosEducativos({ persistir: false, ahora });
  const cache = new CacheConVencimiento<any>(100, ahora);
  const limitador = new LimitadorPeticiones(ahora);
  const servicio = new EducationalResourcesService({
    proveedor,
    almacen,
    cache,
    limitador,
    ahora,
    region: 'EC',
  });
  return { servicio, proveedor, almacen, cache, reloj };
}

test('ordena por validación y no selecciona automáticamente el primer resultado', async () => {
  const entorno = crearEntorno([
    candidato('TestVideo0C', {
      titulo: 'Minecraft gameplay épico',
      descripcion: 'Jugamos Minecraft durante una hora.',
    }),
    candidato('TestVideo0A'),
    candidato('TestVideo0B', { canal: 'Otra escuela' }),
  ]);

  const resultado = await entorno.servicio.obtenerRecomendaciones(contexto);
  assert.equal(resultado.ok, true);
  assert.equal(resultado.cache, 'miss');
  assert.equal(resultado.recursos.length, 2);
  assert.equal(resultado.recursos[0].id, 'TestVideo0A');
  assert.equal(resultado.recursos[1].id, 'TestVideo0B');
  assert.equal(resultado.pendientes.length, 0);
  assert.equal(resultado.recursos[0].estado, 'VALIDADO');
});

test('una aprobación docente ocupa la recomendación principal', async () => {
  const aprobado = candidato('TestVideo0B', {
    titulo: 'Video aprobado por el docente',
    descripcion: 'Recurso revisado y aprobado para esta unidad.',
    origen: 'catalogo_curado',
    curado: {
      id: 'TestVideo0B',
      titulo: 'Video aprobado por el docente',
      canal: 'Escuela de Matemáticas',
      idioma: 'es',
      temas: [contexto.tema, contexto.unidad],
      embedVerificado: true,
      regionPermitida: true,
      privacidadVerificada: 'public',
      revisionManual: {
        validador: 'Coordinación Académica',
        // Anterior al reloj fijo de la prueba (2026-10-21T12:00:00Z).
        fecha: '2026-10-20T12:00:00.000Z',
        versionCriterios: VERSION_CRITERIOS,
        evidencia: 'Revisión completa del video y de su reproducción.',
        alcance: 'ambos',
      },
    },
  });
  const entorno = crearEntorno([candidato('TestVideo0A'), aprobado]);
  const resultado = await entorno.servicio.obtenerRecomendaciones(contexto);
  assert.equal(resultado.recursos[0]?.id, 'TestVideo0B');
  assert.equal(
    resultado.recursos[0]?.validacion.academica.nivelEvidencia,
    'revision_manual'
  );
});

test('reutiliza la caché y evita búsquedas repetitivas por diapositiva', async () => {
  const entorno = crearEntorno([candidato('TestVideo0A')]);
  const primera = await entorno.servicio.obtenerRecomendaciones(contexto);
  assert.equal(primera.cache, 'miss');
  assert.equal(entorno.proveedor.llamadasBusqueda, 1);

  const segunda = await entorno.servicio.obtenerRecomendaciones({
    ...contexto,
    diapositiva: 3,
    contenidoDiapositiva: 'Otra fase de la misma clase',
  });
  assert.equal(segunda.cache, 'hit');
  assert.equal(entorno.proveedor.llamadasBusqueda, 1);
  assert.equal(segunda.claveContexto, primera.claveContexto);
});

test('vence la caché y consulta de nuevo después del TTL', async () => {
  const entorno = crearEntorno([candidato('TestVideo0A')]);
  await entorno.servicio.obtenerRecomendaciones(contexto);
  assert.equal(entorno.proveedor.llamadasBusqueda, 1);

  entorno.reloj.ahora += 7 * 60 * 60 * 1000;
  const actualizada = await entorno.servicio.obtenerRecomendaciones(contexto);
  assert.equal(actualizada.cache, 'miss');
  assert.equal(entorno.proveedor.llamadasBusqueda, 2);
});

test('usa la caché vencida como respaldo si YouTube falla', async () => {
  const entorno = crearEntorno([candidato('TestVideo0A')]);
  await entorno.servicio.obtenerRecomendaciones(contexto);

  entorno.reloj.ahora += 7 * 60 * 60 * 1000;
  entorno.proveedor.fallar = true;
  const resultado = await entorno.servicio.obtenerRecomendaciones(contexto);
  assert.equal(resultado.cache, 'stale');
  assert.equal(resultado.recursos.length, 1);
  assert.match(resultado.advertencia || '', /No se pudo actualizar/i);
});

test('ofrece búsqueda contextualizada cuando no hay proveedor configurado', async () => {
  const entorno = crearEntorno([], { origen: 'solo_enlaces' });
  const resultado = await entorno.servicio.obtenerRecomendaciones(contexto);
  assert.equal(resultado.recursos.length, 0);
  assert.equal(resultado.origen, 'solo_enlaces');
  const urlBusqueda = new URL(resultado.busquedaUrl);
  assert.match(urlBusqueda.searchParams.get('search_query') || '', /Fracciones equivalentes/);
});

test('un reporte ambiguo no declara fallo global y ofrece sustitución', async () => {
  const entorno = crearEntorno([
    candidato('TestVideo0A'),
    candidato('TestVideo0B', { canal: 'Otra escuela' }),
  ]);
  await entorno.servicio.obtenerRecomendaciones(contexto);

  const resultado = await entorno.servicio.reportarVideo(
    {
      videoId: 'TestVideo0A',
      tipo: 'NO_REPRODUCE',
      contexto,
    },
    { reporteroHash: 'reportero-uno' }
  );

  assert.equal(resultado.registrado, true);
  assert.equal(resultado.estadoRecurso, 'EN_COMPROBACION');
  assert.equal(resultado.recursoSustituto?.id, 'TestVideo0B');
  assert.equal(
    await entorno.almacen.estaEnCuarentena(
      'TestVideo0A',
      calcularClaveContexto(contexto)
    ),
    false
  );
  assert.match(resultado.mensaje, /comprobación/i);

  // En una consulta posterior, el video reportado ya no se presenta como
  // validado: se degrada a pendiente y se conserva sólo como alternativa.
  const posterior = await entorno.servicio.obtenerRecomendaciones(contexto);
  assert.equal(posterior.recursos.some((recurso) => recurso.id === 'TestVideo0A'), false);
  assert.equal(
    posterior.pendientes.some(
      (recurso) =>
        recurso.id === 'TestVideo0A' && recurso.estado === 'PENDIENTE_REVISION'
    ),
    true
  );
});

test('dos reportantes distintos retiran temporalmente el recurso', async () => {
  const entorno = crearEntorno([
    candidato('TestVideo0A'),
    candidato('TestVideo0B', { canal: 'Otra escuela' }),
  ]);
  await entorno.servicio.obtenerRecomendaciones(contexto);

  await entorno.servicio.reportarVideo(
    { videoId: 'TestVideo0A', tipo: 'NO_REPRODUCE', contexto },
    { reporteroHash: 'reportero-uno' }
  );
  const segundo = await entorno.servicio.reportarVideo(
    { videoId: 'TestVideo0A', tipo: 'ENLACE_ROTO', contexto },
    { reporteroHash: 'reportero-dos' }
  );

  assert.equal(segundo.estadoRecurso, 'RETIRADO_TEMPORAL');
  assert.equal(
    await entorno.almacen.estaEnCuarentena(
      'TestVideo0A',
      calcularClaveContexto(contexto)
    ),
    true
  );
  assert.equal(segundo.recursoSustituto?.id, 'TestVideo0B');
});

test('un reporte duplicado no genera sustituciones repetitivas', async () => {
  const entorno = crearEntorno([
    candidato('TestVideo0A'),
    candidato('TestVideo0B', { canal: 'Otra escuela' }),
  ]);
  await entorno.servicio.obtenerRecomendaciones(contexto);

  await entorno.servicio.reportarVideo(
    { videoId: 'TestVideo0A', tipo: 'NO_REPRODUCE', contexto },
    { reporteroHash: 'reportero-uno' }
  );
  const duplicado = await entorno.servicio.reportarVideo(
    { videoId: 'TestVideo0A', tipo: 'NO_REPRODUCE', contexto },
    { reporteroHash: 'reportero-uno' }
  );

  assert.equal(duplicado.duplicado, true);
  assert.equal(duplicado.registrado, false);
  assert.equal(duplicado.recursoSustituto, undefined);
});

test('bloquea sustituciones después de tres reemplazos del mismo contexto', async () => {
  const entorno = crearEntorno([
    candidato('TestVideo0A'),
    candidato('TestVideo0B', { canal: 'Escuela B' }),
    candidato('TestVideo0C', { canal: 'Escuela C' }),
    candidato('TestVideo0D', { canal: 'Escuela D' }),
    candidato('TestVideo0E', { canal: 'Escuela E' }),
  ]);
  await entorno.servicio.obtenerRecomendaciones(contexto);

  const primero = await entorno.servicio.reportarVideo(
    { videoId: 'TestVideo0A', tipo: 'NO_REPRODUCE', contexto },
    { reporteroHash: 'reportero-uno' }
  );
  assert.equal(primero.sustitucion?.encontrada, true);

  const segundo = await entorno.servicio.reportarVideo(
    { videoId: 'TestVideo0B', tipo: 'NO_REPRODUCE', contexto },
    { reporteroHash: 'reportero-uno' }
  );
  assert.equal(segundo.sustitucion?.encontrada, true);

  const tercero = await entorno.servicio.reportarVideo(
    { videoId: 'TestVideo0C', tipo: 'NO_REPRODUCE', contexto },
    { reporteroHash: 'reportero-uno' }
  );
  assert.equal(tercero.sustitucion?.encontrada, true);

  const cuarto = await entorno.servicio.reportarVideo(
    { videoId: 'TestVideo0D', tipo: 'NO_REPRODUCE', contexto },
    { reporteroHash: 'reportero-uno' }
  );
  assert.equal(cuarto.sustitucion?.encontrada, false);
  assert.match(cuarto.sustitucion?.motivo || '', /Límite de sustituciones/i);
});

test('si no hay alternativa validada, ofrece búsqueda sin sustituir', async () => {
  const entorno = crearEntorno([candidato('TestVideo0A')]);
  await entorno.servicio.obtenerRecomendaciones(contexto);

  const resultado = await entorno.servicio.reportarVideo(
    { videoId: 'TestVideo0A', tipo: 'NO_REPRODUCE', contexto },
    { reporteroHash: 'reportero-uno' }
  );

  assert.equal(resultado.registrado, true);
  assert.equal(resultado.recursoSustituto, undefined);
  assert.equal(resultado.sustitucion?.encontrada, false);
  assert.match(resultado.mensaje, /No encontramos una alternativa/i);
  assert.match(resultado.busquedaUrl, /search_query=/);
});

test('limita reportes abusivos por cliente anónimo', async () => {
  const entorno = crearEntorno([candidato('TestVideo0A')]);
  for (let indice = 0; indice < 6; indice += 1) {
    const id = `RateVideo0${indice}`;
    const resultado = await entorno.servicio.reportarVideo(
      { videoId: id, tipo: 'OTRO', contexto },
      { reporteroHash: 'reportero-abuso' }
    );
    assert.equal(resultado.ok, true);
  }

  const bloqueado = await entorno.servicio.reportarVideo(
    { videoId: 'RateVideo06', tipo: 'OTRO', contexto },
    { reporteroHash: 'reportero-abuso' }
  );
  assert.equal(bloqueado.ok, false);
  assert.ok((bloqueado.reintentarEnSegundos || 0) > 0);
});

test('no valida como definitivo un enlace externo verificado sólo con oEmbed', async () => {
  const entorno = crearEntorno([], {
    existencia: {
      datos: {
        fuente: 'oembed',
        existe: true,
        privacidad: 'unknown',
        embedPermitido: undefined,
        regionPermitida: undefined,
        duracionVerificada: false,
        idiomaVerificado: false,
      },
      titulo: 'Fracciones equivalentes explicación paso a paso para primaria',
      canal: 'Escuela de Matemáticas',
    },
  });

  const resultado = await entorno.servicio.validarEnlaceExterno(
    'TestVideo01',
    contexto,
    { reporteroHash: 'reportero-uno' }
  );
  assert.equal(resultado.ok, true);
  assert.equal(resultado.recurso?.estado, 'PENDIENTE_REVISION');
  assert.equal(resultado.recurso?.reproduceIntegrado, false);
  assert.match(resultado.mensaje, /pendiente de revisión/i);
});

test('valida un enlace externo cuando la API confirma todos los controles', async () => {
  const entorno = crearEntorno([], {
    existencia: {
      datos: {
        fuente: 'youtube_api',
        existe: true,
        privacidad: 'public',
        embedPermitido: true,
        regionPermitida: true,
        uploadStatus: 'processed',
        duracionVerificada: true,
        idiomaVerificado: true,
      },
      titulo: 'Fracciones equivalentes explicación paso a paso para primaria',
      canal: 'Escuela de Matemáticas',
      duracionSegundos: 720,
      idiomaDeclarado: 'es',
    },
  });

  const resultado = await entorno.servicio.validarEnlaceExterno(
    'TestVideo01',
    contexto,
    { reporteroHash: 'reportero-uno' }
  );
  assert.equal(resultado.ok, true);
  assert.equal(resultado.recurso?.estado, 'VALIDADO');
  assert.equal(resultado.recurso?.reproduceIntegrado, true);
});
