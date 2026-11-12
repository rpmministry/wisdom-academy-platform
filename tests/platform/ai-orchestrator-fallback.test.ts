import test from 'node:test';
import assert from 'node:assert/strict';
import { WisdomAIOrchestrator, type SolicitudIAOrquestada } from '../../src/lib/ai/orchestrator';

const originalFetch = globalThis.fetch;
const originalEnv = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
};

function restaurarEntorno() {
  globalThis.fetch = originalFetch;
  for (const [clave, valor] of Object.entries(originalEnv)) {
    if (valor === undefined) delete process.env[clave];
    else process.env[clave] = valor;
  }
}

function limpiarClaves() {
  delete process.env.GEMINI_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.GROQ_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.CEREBRAS_API_KEY;
  delete process.env.MISTRAL_API_KEY;
}

function solicitud(pregunta: string): SolicitudIAOrquestada {
  return {
    estudiante: 'Gael',
    edad: 8,
    grado: 'Primaria',
    materia: 'Matemáticas',
    temaActual: 'Fracciones',
    preguntaEstudiante: pregunta,
    diapositivaNumero: 1,
    tipoInteraccion: 'CHAT_PREGUNTA',
  };
}

function respuestaJson(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('Gemini 429 hace fallback real a DeepSeek y registra el éxito', async () => {
  limpiarClaves();
    process.env.GEMINI_API_KEY = 'test-gemini-key-1234567890';
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key-1234567890';
    const llamadas: string[] = [];
    globalThis.fetch = (async (entrada: string | URL | Request) => {
      const url = String(entrada);
      llamadas.push(url);
      if (url.includes('generativelanguage')) {
        return respuestaJson({ error: { message: 'RESOURCE_EXHAUSTED' } }, 429);
      }
      if (url.includes('api.deepseek.com')) {
        return respuestaJson({
          choices: [{ message: { content: 'Esta es una respuesta pedagógica sobre fracciones con ejemplo cotidiano.' } }],
          usage: { total_tokens: 120 },
        });
      }
      throw new Error(`URL no esperada: ${url}`);
    }) as typeof fetch;

    const orquestador = WisdomAIOrchestrator.crearInstanciaParaPruebas();
    const respuesta = await orquestador.responderConsulta(solicitud('¿Qué es una fracción equivalente?'));

    assert.equal(respuesta.proveedorUtilizado, 'deepseek-free');
    assert.equal(respuesta.modeloUtilizado, process.env.DEEPSEEK_MODEL || 'deepseek-chat');
    assert.match(respuesta.textoRespuesta, /fracciones/);
    assert.ok(llamadas.some((url) => url.includes('api.deepseek.com')));
    assert.ok(llamadas.filter((url) => url.includes('generativelanguage')).length >= 2);
    const metricas = orquestador.obtenerEstadoProveedores();
    assert.ok((metricas.find((item) => item.id === 'deepseek-free')?.peticionesExitosas ?? 0) >= 1);
  restaurarEntorno();
});

test('un 404 de modelo no agota el proveedor y prueba el siguiente modelo', async () => {
  limpiarClaves();
  process.env.GEMINI_API_KEY = 'test-gemini-key-1234567890';
  globalThis.fetch = (async (entrada: string | URL | Request) => {
    const url = String(entrada);
    if (url.includes('gemini-3.8-flash')) {
      return respuestaJson({ error: { message: 'model not found' } }, 404);
    }
    if (url.includes('generativelanguage')) {
      return respuestaJson({
        candidates: [{ content: { parts: [{ text: 'Respuesta del segundo modelo Gemini con contenido suficiente.' }] } }],
      });
    }
    throw new Error(`URL no esperada: ${url}`);
  }) as typeof fetch;

  const orquestador = WisdomAIOrchestrator.crearInstanciaParaPruebas();
  const respuesta = await orquestador.responderConsulta(solicitud('¿Cómo se simplifica una fracción?'));

  assert.equal(respuesta.proveedorUtilizado, 'gemini-free');
  assert.notEqual(respuesta.modeloUtilizado, 'gemini-3.8-flash');
  assert.match(respuesta.textoRespuesta, /segundo modelo/);
  restaurarEntorno();
});

test('una respuesta envuelta en bloque markdown se normaliza', async () => {
  limpiarClaves();
  process.env.DEEPSEEK_API_KEY = 'test-deepseek-key-1234567890';
  globalThis.fetch = (async (entrada: string | URL | Request) => {
    const url = String(entrada);
    if (url.includes('api.deepseek.com')) {
      return respuestaJson({
        choices: [{ message: { content: '```text\nRespuesta limpia sin cercas markdown para el estudiante.\n```' } }],
      });
    }
    throw new Error(`URL no esperada: ${url}`);
  }) as typeof fetch;

  const orquestador = WisdomAIOrchestrator.crearInstanciaParaPruebas();
  const respuesta = await orquestador.responderConsulta(solicitud('¿Qué es el numerador?'));

  assert.equal(respuesta.proveedorUtilizado, 'deepseek-free');
  assert.equal(respuesta.textoRespuesta.includes('```'), false);
  assert.match(respuesta.textoRespuesta, /Respuesta limpia/);
  restaurarEntorno();
});

test('el fallo total cae al motor curricular autónomo con motivo explícito', async () => {
  limpiarClaves();
  process.env.GEMINI_API_KEY = 'test-gemini-key-1234567890';
  globalThis.fetch = (async (entrada: string | URL | Request) => {
    const url = String(entrada);
    if (url.includes('generativelanguage')) {
      return respuestaJson({ error: { message: 'service unavailable' } }, 503);
    }
    throw new Error(`URL no esperada: ${url}`);
  }) as typeof fetch;

  const orquestador = WisdomAIOrchestrator.crearInstanciaParaPruebas();
  const respuesta = await orquestador.responderConsulta(solicitud('¿Qué aprendemos hoy?'));

  assert.equal(respuesta.proveedorUtilizado, 'motor-curricular-autonomo');
  assert.equal(respuesta.motivoFalloTotal, 'TODOS_LOS_PROVEEDORES_FALLARON');
  assert.ok((respuesta.intentosFallidos ?? 0) >= 1);
  assert.ok((respuesta.textoRespuesta?.length ?? 0) > 20);
  restaurarEntorno();
});
