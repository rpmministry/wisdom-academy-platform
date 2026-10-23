/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Motor de Orquestación de IA Gratuita
 * ARCHIVO: src/lib/ai/orchestrator.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Motor de alta disponibilidad resiliente de costo cero ($0 USD) para los
 * Profesores IA de OpenMAIC (Prof. Mateo y Dra. Sofía de Valenzuela):
 *
 * 1. POOL DE PROVEEDORES GRATUITOS (ROTACIÓN Y FALLBACK AUTOMÁTICO):
 *    - Google Gemini Free Tier (gemini-3.8-flash, gemini-2.5-flash, gemini-2.0-flash)
 *    - Groq Cloud Free Tier (llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b)
 *    - OpenRouter Free Tier (modelos con sufijo :free)
 *    - Cerebras Cloud Free Tier (llama3.1-70b, llama3.1-8b con ultra baja latencia)
 *    - Mistral AI Free Tier (mistral-small-latest, open-mistral-7b)
 *    - Motor Curricular Autónomo Determinista de Wisdom Academy (100% offline)
 *
 * 2. CIRCUIT BREAKER & ROTACIÓN INTELIGENTE (Inspirado en orquestadorahorro y agentic-dev-setup):
 *    - Detección inmediata de 429 Too Many Requests y errores 500/503.
 *    - Aislamiento temporal del proveedor degradado (cooldown de 60 segundos).
 *    - Conmutación en milisegundos hacia la siguiente clave o proveedor en cola.
 *    - Timeouts estrictos de 5000 ms por solicitud para evitar bloqueos en el aula.
 *
 * 3. CACHÉ DE CLASES Y CONCEPTOS (Zero-Token Accelerator):
 *    - Caché semántica en memoria con normalización de consultas y TTL de 24 horas.
 *    - Precarga de conceptos fundamentales del currículo ecuatoriano y criterios de rigor académico.
 *    - Respuestas instantáneas (< 1 ms) para preguntas frecuentes durante la clase en vivo.
 * ==============================================================================
 */

import { curriculumContentEngine, DiapositivaLeccion } from '@/services/curriculumContentEngine';

/**
 * Identifica el espacio confesional para no forzar lenguaje bíblico en las
 * asignaturas académicas.
 */
function esMateriaTeologia(materia: string): boolean {
  return /relaci[oó]n con dios|teolog[ií]a|cosmovisi[oó]n/i.test(materia);
}

export type ProveedorIAId =
  | 'gemini-free'
  | 'groq-free'
  | 'openrouter-free'
  | 'cerebras-free'
  | 'mistral-free'
  | 'cache-clases-openmaic'
  | 'motor-curricular-autonomo';

export type EstadoCircuito = 'HEALTHY' | 'DEGRADED' | 'TRIPPED';

export interface SolicitudIAOrquestada {
  estudiante: string;
  edad: number;
  grado: string;
  materia: string;
  temaActual: string;
  preguntaEstudiante?: string;
  diapositivaNumero?: number;
  tipoInteraccion?: 'CHAT_PREGUNTA' | 'EXPLICACION_DIAPOSITIVA' | 'RETO_SOCRATICO';
}

export interface RespuestaIAOrquestada {
  textoRespuesta: string;
  proveedorUtilizado: ProveedorIAId;
  modeloUtilizado: string;
  nombreProfesor: 'Prof. Mateo' | 'Dra. Sofía de Valenzuela';
  tiempoRespuestaMs: number;
  enCache: boolean;
  versiculoAsociado?: {
    referencia: string;
    texto: string;
  };
  intentosFallidos?: number;
}

export interface MetricasProveedor {
  id: ProveedorIAId;
  nombre: string;
  estado: EstadoCircuito;
  peticionesTotales: number;
  peticionesExitosas: number;
  peticionesFallidas: number;
  latenciaPromedioMs: number;
  tiempoUltimoFallo?: number;
  tiempoReactivacion?: number;
}

interface EntradaCache {
  respuesta: string;
  timestamp: number;
  versiculo?: { referencia: string; texto: string };
  proveedorOriginal: string;
}

export class WisdomAIOrchestrator {
  private static instancia: WisdomAIOrchestrator;

  // Registro de estado de salud por proveedor (Circuit Breaker)
  private estadosCircuitos: Map<ProveedorIAId, MetricasProveedor> = new Map();

  // Caché en memoria para clases y conceptos frecuentes
  private cacheRespuestas: Map<string, EntradaCache> = new Map();

  // Tiempo de Cooldown para Circuit Breaker (60 segundos tras error 429)
  private readonly COOLDOWN_CIRCUITO_MS = 60000;

  // Timeout de red por proveedor (5 segundos)
  private readonly TIMEOUT_PETICION_MS = 5000;

  // TTL de la caché (24 horas)
  private readonly TTL_CACHE_MS = 24 * 60 * 60 * 1000;

  private constructor() {
    this.inicializarProveedores();
    this.precargarCacheConceptosClave();
  }

  public static obtenerInstancia(): WisdomAIOrchestrator {
    if (!WisdomAIOrchestrator.instancia) {
      WisdomAIOrchestrator.instancia = new WisdomAIOrchestrator();
    }
    return WisdomAIOrchestrator.instancia;
  }

  /**
   * Inicializa las métricas y estado inicial del pool de proveedores.
   */
  private inicializarProveedores() {
    const proveedores: { id: ProveedorIAId; nombre: string }[] = [
      { id: 'gemini-free', nombre: 'Google Gemini 3.8 / 2.5 Flash (Free Tier)' },
      { id: 'groq-free', nombre: 'Groq Cloud (Llama 3.3 70B / Mixtral Free)' },
      { id: 'openrouter-free', nombre: 'OpenRouter Free Tier (:free Models)' },
      { id: 'cerebras-free', nombre: 'Cerebras Cloud (Llama 3.1 70B Ultra Fast)' },
      { id: 'mistral-free', nombre: 'Mistral AI (Mistral Small / Open Mistral Free)' },
      { id: 'motor-curricular-autonomo', nombre: 'Motor Curricular Autónomo de Contingencia' },
    ];

    for (const p of proveedores) {
      this.estadosCircuitos.set(p.id, {
        id: p.id,
        nombre: p.nombre,
        estado: 'HEALTHY',
        peticionesTotales: 0,
        peticionesExitosas: 0,
        peticionesFallidas: 0,
        latenciaPromedioMs: 0,
      });
    }
  }

  /**
   * Normaliza una clave de caché eliminando signos de interrogación y acentos superficiales.
   */
  private generarClaveCache(params: SolicitudIAOrquestada): string {
    const preguntaNorm = (params.preguntaEstudiante || '')
      .toLowerCase()
      .replace(/[¿?¡!.,]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    const materiaNorm = params.materia.toLowerCase().trim().replace(/\s+/g, '_');
    const temaNorm = (params.temaActual || 'leccion').toLowerCase().trim().replace(/\s+/g, '_');
    const diapo = params.diapositivaNumero || 1;
    const esGael = params.edad <= 10 ? 'gael' : 'avril';

    return `openmaic_${materiaNorm}_${temaNorm}_d${diapo}_${esGael}_${preguntaNorm}`;
  }

  /**
   * Precarga respuestas socráticas de alta calidad para preguntas frecuentes en el currículo.
   */
  private precargarCacheConceptosClave() {
    const conceptos: { clave: string; respuesta: string; versiculo: { referencia: string; texto: string } }[] = [
      {
        clave: 'openmaic_matematicas_fracciones_d1_gael_',
        respuesta:
          '¡Hola, Gael! Te habla tu Prof. Mateo. Las fracciones representan partes iguales de un todo. El número de abajo (denominador) indica en cuántas partes dividimos y el de arriba (numerador) cuántas tomamos. Si divides una pizza en cuatro partes iguales y tomas dos, has tomado 2/4, que equivale a la mitad.',
        versiculo: {
          referencia: 'Principio matemático',
          texto: 'Una fracción representa una o varias partes iguales de un todo.',
        },
      },
      {
        clave: 'openmaic_ciencias_naturales_ecosistemas_d1_gael_',
        respuesta:
          '¡Hola, Gael! El oso de anteojos y las orquídeas de nuestros páramos andinos forman parte de un ecosistema. Cada ser vivo cumple una función en las cadenas alimenticias y en el reciclaje de nutrientes, y esa interdependencia mantiene el equilibrio de la naturaleza.',
        versiculo: {
          referencia: 'Principio ecológico',
          texto: 'Los organismos de un ecosistema interactúan y dependen unos de otros.',
        },
      },
      {
        clave: 'openmaic_ciencias_celula_d1_avril_',
        respuesta:
          'Estimada Avril, la célula es la unidad estructural y funcional de la vida. El ADN almacena información genética en una secuencia de bases nitrogenadas; esa información se transcribe y se traduce en proteínas que regulan el metabolismo, la división y la respuesta al ambiente.',
        versiculo: {
          referencia: 'Principio biológico',
          texto: 'La información genética se transmite y se expresa mediante procesos moleculares.',
        },
      },
      {
        clave: 'openmaic_teologia_cosmovision_d1_avril_',
        respuesta:
          'Avril, la cosmovisión bíblica no es una opinión personal, sino el fundamento de toda la realidad. La fe cristiana proporciona el único marco epistemológico sólido donde la razón humana, la ciencia empírica y la moral objetiva encuentran coherencia absoluta.',
        versiculo: {
          referencia: 'Colosenses 2:3',
          texto: 'En quien están escondidos todos los tesoros de la sabiduría y del conocimiento.',
        },
      },
    ];

    for (const c of conceptos) {
      this.cacheRespuestas.set(c.clave, {
        respuesta: c.respuesta,
        timestamp: Date.now(),
        versiculo: c.versiculo,
        proveedorOriginal: 'cache-precargada-wisdom',
      });
    }
  }

  /**
   * Construye el prompt pedagógico adaptado a la edad del estudiante y la lección.
   */
  private construirPrompt(
    params: SolicitudIAOrquestada,
    nombreProfesor: string,
    diapo: DiapositivaLeccion | null
  ): string {
    const esGael = params.edad <= 10;
    const teologia = esMateriaTeologia(params.materia);
    const pregunta = (params.preguntaEstudiante || '').trim() ||
      'Explícame el concepto principal de esta lección con un ejemplo claro de la vida cotidiana.';

    return `Eres el ${nombreProfesor}, profesor de OpenMAIC en Wisdom Academy.
Tu objetivo es impartir una enseñanza socrática, cercana y de alta excelencia académica.

DATOS DE LA LECCIÓN Y DEL ESTUDIANTE:
- Alumno: ${params.estudiante} (${params.edad} años, grado escolar: ${params.grado}).
- Materia: ${params.materia}.
- Tema de la diapositiva: ${params.temaActual || diapo?.titulo || 'Contenido Central'}.
- Subtítulo: ${diapo?.subtitulo || ''}.
- Contenido clave: ${diapo?.contenidoExplicativo || ''}.
${diapo?.ejemploPasoAPaso?.length ? `- Ejemplo guiado: ${diapo.ejemploPasoAPaso.join(' -> ')}` : ''}
- ${teologia ? 'Fundamento bíblico' : 'Principio académico orientador'}: ${diapo?.versiculoBiblico?.referencia || (teologia ? 'Proverbios 2:6' : 'Rigor académico')} ("${diapo?.versiculoBiblico?.texto || (teologia ? 'Porque Jehová da la sabiduría.' : 'Toda afirmación debe sostenerse en evidencia verificable.')}").

PAUTAS PEDAGÓGICAS ESTRICTAS:
1. No uses lenguaje burocrático ni menciones requerimientos ministeriales o normas legales.
2. ${
      esGael
        ? 'Para Gael (8 años, Primaria): Tono alegre, tierno, lúdico y entusiasta del Prof. Mateo. Utiliza analogías con la naturaleza, juegos o la familia.'
        : 'Para Avril (12 años, Secundaria): Tono socrático, reflexivo, científico y estimulante de la Dra. Sofía. Fomenta el pensamiento crítico y el porqué de las cosas.'
    }
3. ${
      teologia
        ? 'Esta es la asignatura confesional Relación con Dios: puedes usar lenguaje bíblico, doctrinal y pastoral con fidelidad al texto.'
        : 'Esta es una asignatura académica: mantén el contenido neutral, basado en evidencia y en el método de la disciplina. No introduzcas versículos, exhortaciones religiosas ni referencias confesionales.'
    }
4. Responde de forma clara a: "${pregunta}".
5. Máximo 2 a 3 párrafos concisos y concluye con una frase motivadora y edificante.`;
  }

  /**
   * Verifica si un proveedor está disponible según el Circuit Breaker.
   */
  private esProveedorDisponible(id: ProveedorIAId): boolean {
    const metricas = this.estadosCircuitos.get(id);
    if (!metricas) return false;

    if (metricas.estado === 'HEALTHY') return true;

    if (metricas.estado === 'TRIPPED') {
      const ahora = Date.now();
      if (metricas.tiempoReactivacion && ahora >= metricas.tiempoReactivacion) {
        // Pasar a estado DEGRADED (half-open) para prueba de sondeo
        metricas.estado = 'DEGRADED';
        return true;
      }
      return false;
    }

    // Si está DEGRADED, permitimos el intento
    return true;
  }

  /**
   * Registra éxito en un proveedor y restablece su salud.
   */
  private registrarExito(id: ProveedorIAId, latenciaMs: number) {
    const metricas = this.estadosCircuitos.get(id);
    if (!metricas) return;

    metricas.peticionesTotales++;
    metricas.peticionesExitosas++;
    metricas.estado = 'HEALTHY';
    metricas.tiempoUltimoFallo = undefined;
    metricas.tiempoReactivacion = undefined;

    // Media móvil simple de latencia
    metricas.latenciaPromedioMs = metricas.latenciaPromedioMs === 0
      ? latenciaMs
      : Math.round((metricas.latenciaPromedioMs * 0.8) + (latenciaMs * 0.2));
  }

  /**
   * Registra fallo en un proveedor y evalúa si abrir el circuito (TRIPPED).
   */
  private registrarFallo(id: ProveedorIAId, esRateLimit429: boolean) {
    const metricas = this.estadosCircuitos.get(id);
    if (!metricas) return;

    metricas.peticionesTotales++;
    metricas.peticionesFallidas++;
    metricas.tiempoUltimoFallo = Date.now();

    if (esRateLimit429 || metricas.peticionesFallidas >= 2) {
      metricas.estado = 'TRIPPED';
      metricas.tiempoReactivacion = Date.now() + this.COOLDOWN_CIRCUITO_MS;
    } else {
      metricas.estado = 'DEGRADED';
    }
  }

  /**
   * [PROVEEDOR 1] Google Gemini Free Tier
   */
  private async intentarGemini(prompt: string): Promise<{ texto: string; modelo: string } | null> {
    const keysRaw =
      process.env.GOOGLE_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY;

    if (!keysRaw || keysRaw.includes('TuClaveGratuita')) return null;

    const keys = keysRaw.split(',').map((k) => k.trim()).filter((k) => k.length > 10);
    const modelos = ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

    for (const apiKey of keys) {
      for (const modelo of modelos) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_PETICION_MS);

        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: controller.signal,
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 600,
                },
              }),
            }
          );
          clearTimeout(timeout);

          if (res.status === 429) {
            this.registrarFallo('gemini-free', true);
            break; // Salta a la siguiente API key
          }

          if (!res.ok) {
            this.registrarFallo('gemini-free', false);
            continue;
          }

          const datos = await res.json();
          const texto = datos?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (texto && texto.trim().length > 10) {
            return { texto: texto.trim(), modelo };
          }
        } catch {
          clearTimeout(timeout);
          this.registrarFallo('gemini-free', false);
        }
      }
    }
    return null;
  }

  /**
   * [PROVEEDOR 2] Groq Cloud Free Tier (Llama 3.3 70B / Mixtral)
   */
  private async intentarGroq(prompt: string): Promise<{ texto: string; modelo: string } | null> {
    const keysRaw = process.env.GROQ_API_KEY || process.env.GROQ_API_KEYS;
    if (!keysRaw || keysRaw.includes('tu-clave')) return null;

    const keys = keysRaw.split(',').map((k) => k.trim()).filter((k) => k.length > 10);
    const modelos = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];

    for (const apiKey of keys) {
      for (const modelo of modelos) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_PETICION_MS);

        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: modelo,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 600,
            }),
          });
          clearTimeout(timeout);

          if (res.status === 429) {
            this.registrarFallo('groq-free', true);
            break;
          }

          if (!res.ok) {
            this.registrarFallo('groq-free', false);
            continue;
          }

          const datos = await res.json();
          const texto = datos?.choices?.[0]?.message?.content;
          if (texto && texto.trim().length > 10) {
            return { texto: texto.trim(), modelo };
          }
        } catch {
          clearTimeout(timeout);
          this.registrarFallo('groq-free', false);
        }
      }
    }
    return null;
  }

  /**
   * [PROVEEDOR 3] OpenRouter Free Tier (:free models)
   */
  private async intentarOpenRouter(prompt: string): Promise<{ texto: string; modelo: string } | null> {
    const keysRaw = process.env.OPENROUTER_FREE_API_KEY || process.env.OPENROUTER_API_KEY;
    if (!keysRaw || keysRaw.includes('tu-clave-gratuita')) return null;

    const keys = keysRaw.split(',').map((k) => k.trim()).filter((k) => k.length > 10);
    const modelos = [
      'google/gemini-2.0-flash-exp:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
      'deepseek/deepseek-r1:free',
    ];

    for (const apiKey of keys) {
      for (const modelo of modelos) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_PETICION_MS);

        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://wisdomacademy.edu.ec',
              'X-Title': 'Wisdom Academy OpenMAIC Orchestrator',
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: modelo,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.7,
              max_tokens: 600,
            }),
          });
          clearTimeout(timeout);

          if (res.status === 429) {
            this.registrarFallo('openrouter-free', true);
            break;
          }

          if (!res.ok) {
            this.registrarFallo('openrouter-free', false);
            continue;
          }

          const datos = await res.json();
          const texto = datos?.choices?.[0]?.message?.content;
          if (texto && texto.trim().length > 10) {
            return { texto: texto.trim(), modelo };
          }
        } catch {
          clearTimeout(timeout);
          this.registrarFallo('openrouter-free', false);
        }
      }
    }
    return null;
  }

  /**
   * [PROVEEDOR 4] Cerebras Cloud Free Tier
   */
  private async intentarCerebras(prompt: string): Promise<{ texto: string; modelo: string } | null> {
    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey || apiKey.includes('tu-clave')) return null;

    const modelos = ['llama3.1-70b', 'llama3.1-8b'];

    for (const modelo of modelos) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_PETICION_MS);

      try {
        const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: modelo,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 600,
          }),
        });
        clearTimeout(timeout);

        if (res.status === 429) {
          this.registrarFallo('cerebras-free', true);
          return null;
        }

        if (!res.ok) {
          this.registrarFallo('cerebras-free', false);
          continue;
        }

        const datos = await res.json();
        const texto = datos?.choices?.[0]?.message?.content;
        if (texto && texto.trim().length > 10) {
          return { texto: texto.trim(), modelo };
        }
      } catch {
        clearTimeout(timeout);
        this.registrarFallo('cerebras-free', false);
      }
    }
    return null;
  }

  /**
   * [PROVEEDOR 5] Mistral AI Free Tier
   */
  private async intentarMistral(prompt: string): Promise<{ texto: string; modelo: string } | null> {
    const apiKey = process.env.MISTRAL_API_KEY || process.env.MISTRAL_FREE_API_KEY;
    if (!apiKey || apiKey.includes('tu-clave')) return null;

    const modelos = ['mistral-small-latest', 'open-mistral-7b'];

    for (const modelo of modelos) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_PETICION_MS);

      try {
        const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: modelo,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 600,
          }),
        });
        clearTimeout(timeout);

        if (res.status === 429) {
          this.registrarFallo('mistral-free', true);
          return null;
        }

        if (!res.ok) {
          this.registrarFallo('mistral-free', false);
          continue;
        }

        const datos = await res.json();
        const texto = datos?.choices?.[0]?.message?.content;
        if (texto && texto.trim().length > 10) {
          return { texto: texto.trim(), modelo };
        }
      } catch {
        clearTimeout(timeout);
        this.registrarFallo('mistral-free', false);
      }
    }
    return null;
  }

  /**
   * [PROVEEDOR 6 - CONTINGENCIA AUTÓNOMA DETERMINISTA]
   * Respaldo curricular de Wisdom Academy garantizado sin conexión ni claves.
   */
  private generarRespaldoCurricular(
    params: SolicitudIAOrquestada,
    diapo: DiapositivaLeccion | null,
    esGael: boolean,
    nombreProfesor: string
  ): string {
    const tema = diapo?.titulo || params.temaActual || 'el tema central';
    const concepto = diapo?.contenidoExplicativo || '';
    const ejemplo = diapo?.ejemploPasoAPaso?.[0] || 'Observemos este principio paso a paso.';
    const teologia = esMateriaTeologia(params.materia);
    const principioRef =
      diapo?.versiculoBiblico?.referencia || (teologia ? 'Proverbios 1:7' : 'Principio académico');
    const principioTxt =
      diapo?.versiculoBiblico?.texto ||
      (teologia
        ? 'El principio de la sabiduría es el temor de Jehová.'
        : 'Toda afirmación debe sostenerse en evidencia verificable y razonamiento transparente.');

    if (esGael) {
      return `¡Hola, Gael! Te habla tu ${nombreProfesor}. Qué buena pregunta sobre ${tema}.

${concepto} Imagina que estamos construyendo un puente o repartiendo una merienda con amigos: ${ejemplo}.

${teologia ? 'Recuerda lo que enseña' : 'Ten presente este principio'} ${principioRef}: "${principioTxt}". ¡Sigue adelante con curiosidad y esfuerzo!`;
    }

    return `Estimada Avril, con gusto profundizamos en este aspecto de ${tema}.

${concepto} En la práctica: ${ejemplo}. Desarrollar este pensamiento analítico te permitirá comprender sistemas más complejos con claridad y rigor.

${teologia ? 'Tal como proclama' : 'Como síntesis del método'} ${principioRef}: "${principioTxt}". Mantén siempre el espíritu reflexivo y la excelencia en cada investigación.`;
  }

  /**
   * Método Maestro de Orquestación: Ejecuta el pipeline completo de Caché -> Rotación -> Fallback.
   */
  public async responderConsulta(params: SolicitudIAOrquestada): Promise<RespuestaIAOrquestada> {
    const inicio = Date.now();
    const esGael = params.edad <= 10;
    const nombreProfesor = esGael ? 'Prof. Mateo' : 'Dra. Sofía de Valenzuela';

    // 1. Obtener contexto curricular de la lección
    const leccionBase = curriculumContentEngine.obtenerLeccion(params.materia, esGael);
    const diapoIndex =
      typeof params.diapositivaNumero === 'number' && params.diapositivaNumero >= 1
        ? params.diapositivaNumero - 1
        : 0;
    const diapo = leccionBase.diapositivas[diapoIndex] || leccionBase.diapositivas[0] || null;

    // 2. Comprobar Caché Inteligente de Clases y Conceptos
    const claveCache = this.generarClaveCache(params);
    const hitCache = this.cacheRespuestas.get(claveCache);
    if (hitCache && Date.now() - hitCache.timestamp < this.TTL_CACHE_MS) {
      return {
        textoRespuesta: hitCache.respuesta,
        proveedorUtilizado: 'cache-clases-openmaic',
        modeloUtilizado: 'wisdom-cache-semantic-v1',
        nombreProfesor,
        tiempoRespuestaMs: Date.now() - inicio,
        enCache: true,
        versiculoAsociado: hitCache.versiculo || diapo?.versiculoBiblico,
        intentosFallidos: 0,
      };
    }

    const prompt = this.construirPrompt(params, nombreProfesor, diapo);
    let intentosFallidos = 0;

    // 3. Nivel 1: Google Gemini Free Tier
    if (this.esProveedorDisponible('gemini-free')) {
      const resultado = await this.intentarGemini(prompt);
      if (resultado) {
        const latencia = Date.now() - inicio;
        this.registrarExito('gemini-free', latencia);
        this.guardarEnCache(claveCache, resultado.texto, diapo?.versiculoBiblico, 'gemini-free');

        return {
          textoRespuesta: resultado.texto,
          proveedorUtilizado: 'gemini-free',
          modeloUtilizado: resultado.modelo,
          nombreProfesor,
          tiempoRespuestaMs: latencia,
          enCache: false,
          versiculoAsociado: diapo?.versiculoBiblico,
          intentosFallidos,
        };
      }
      intentosFallidos++;
    }

    // 4. Nivel 2: Groq Cloud Free Tier
    if (this.esProveedorDisponible('groq-free')) {
      const resultado = await this.intentarGroq(prompt);
      if (resultado) {
        const latencia = Date.now() - inicio;
        this.registrarExito('groq-free', latencia);
        this.guardarEnCache(claveCache, resultado.texto, diapo?.versiculoBiblico, 'groq-free');

        return {
          textoRespuesta: resultado.texto,
          proveedorUtilizado: 'groq-free',
          modeloUtilizado: resultado.modelo,
          nombreProfesor,
          tiempoRespuestaMs: latencia,
          enCache: false,
          versiculoAsociado: diapo?.versiculoBiblico,
          intentosFallidos,
        };
      }
      intentosFallidos++;
    }

    // 5. Nivel 3: OpenRouter Free Tier
    if (this.esProveedorDisponible('openrouter-free')) {
      const resultado = await this.intentarOpenRouter(prompt);
      if (resultado) {
        const latencia = Date.now() - inicio;
        this.registrarExito('openrouter-free', latencia);
        this.guardarEnCache(claveCache, resultado.texto, diapo?.versiculoBiblico, 'openrouter-free');

        return {
          textoRespuesta: resultado.texto,
          proveedorUtilizado: 'openrouter-free',
          modeloUtilizado: resultado.modelo,
          nombreProfesor,
          tiempoRespuestaMs: latencia,
          enCache: false,
          versiculoAsociado: diapo?.versiculoBiblico,
          intentosFallidos,
        };
      }
      intentosFallidos++;
    }

    // 6. Nivel 4: Cerebras Cloud Free Tier
    if (this.esProveedorDisponible('cerebras-free')) {
      const resultado = await this.intentarCerebras(prompt);
      if (resultado) {
        const latencia = Date.now() - inicio;
        this.registrarExito('cerebras-free', latencia);
        this.guardarEnCache(claveCache, resultado.texto, diapo?.versiculoBiblico, 'cerebras-free');

        return {
          textoRespuesta: resultado.texto,
          proveedorUtilizado: 'cerebras-free',
          modeloUtilizado: resultado.modelo,
          nombreProfesor,
          tiempoRespuestaMs: latencia,
          enCache: false,
          versiculoAsociado: diapo?.versiculoBiblico,
          intentosFallidos,
        };
      }
      intentosFallidos++;
    }

    // 7. Nivel 5: Mistral AI Free Tier
    if (this.esProveedorDisponible('mistral-free')) {
      const resultado = await this.intentarMistral(prompt);
      if (resultado) {
        const latencia = Date.now() - inicio;
        this.registrarExito('mistral-free', latencia);
        this.guardarEnCache(claveCache, resultado.texto, diapo?.versiculoBiblico, 'mistral-free');

        return {
          textoRespuesta: resultado.texto,
          proveedorUtilizado: 'mistral-free',
          modeloUtilizado: resultado.modelo,
          nombreProfesor,
          tiempoRespuestaMs: latencia,
          enCache: false,
          versiculoAsociado: diapo?.versiculoBiblico,
          intentosFallidos,
        };
      }
      intentosFallidos++;
    }

    // 8. Nivel 6: Motor Curricular Autónomo Determinista (Garantía 100% de Respuesta)
    const respuestaAutonoma = this.generarRespaldoCurricular(params, diapo, esGael, nombreProfesor);
    const latencia = Date.now() - inicio;
    this.registrarExito('motor-curricular-autonomo', latencia);
    this.guardarEnCache(claveCache, respuestaAutonoma, diapo?.versiculoBiblico, 'motor-curricular-autonomo');

    return {
      textoRespuesta: respuestaAutonoma,
      proveedorUtilizado: 'motor-curricular-autonomo',
      modeloUtilizado: 'wisdom-socratic-engine-v1',
      nombreProfesor,
      tiempoRespuestaMs: latencia,
      enCache: false,
      versiculoAsociado: diapo?.versiculoBiblico,
      intentosFallidos,
    };
  }

  /**
   * Guarda una respuesta en caché para ahorrar tokens en futuras consultas.
   */
  private guardarEnCache(
    clave: string,
    respuesta: string,
    versiculo?: { referencia: string; texto: string },
    proveedorOriginal: string = 'ia'
  ) {
    if (this.cacheRespuestas.size > 1000) {
      // Evictar primera entrada (FIFO)
      const primeraClave = this.cacheRespuestas.keys().next().value;
      if (primeraClave) {
        this.cacheRespuestas.delete(primeraClave);
      }
    }

    this.cacheRespuestas.set(clave, {
      respuesta,
      timestamp: Date.now(),
      versiculo,
      proveedorOriginal,
    });
  }

  /**
   * Obtiene el estado y métricas actuales de los proveedores de IA para el Dashboard Administrativo.
   */
  public obtenerEstadoProveedores(): MetricasProveedor[] {
    return Array.from(this.estadosCircuitos.values());
  }
}

export const wisdomAIOrchestrator = WisdomAIOrchestrator.obtenerInstancia();

