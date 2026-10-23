/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Orquestador de IAs Gratuitas (OrquestadorAhorro)
 * ARCHIVO: src/lib/ai-orchestrator/orquestadorAhorro.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Fachada y adaptador de compatibilidad hacia el motor unificado de alta
 * disponibilidad `WisdomAIOrchestrator` (`src/lib/ai/orchestrator.ts`).
 *
 * Provee:
 * - Rotación y fallback inteligente entre Google Gemini, Groq, OpenRouter,
 *   Cerebras, Mistral y Motor Autónomo Curricular.
 * - Circuit Breaker con conmutación en milisegundos ante error 429.
 * - Aceleración mediante Caché de conceptos pedagógicos frecuentes.
 * ==============================================================================
 */

import {
  wisdomAIOrchestrator,
  WisdomAIOrchestrator,
  SolicitudIAOrquestada as SolicitudOrquestadaBase,
  RespuestaIAOrquestada as RespuestaOrquestadaBase,
  ProveedorIAId,
  MetricasProveedor,
} from '@/lib/ai/orchestrator';

export type SolicitudIAOrquestada = SolicitudOrquestadaBase;

export interface RespuestaIAOrquestada {
  textoRespuesta: string;
  proveedorUtilizado: 'gemini-3.8-flash' | 'openrouter-free' | 'motor-curricular-autonomo' | string;
  nombreProfesor: 'Prof. Mateo' | 'Dra. Sofía de Valenzuela';
  tiempoRespuestaMs: number;
  versiculoAsociado?: {
    referencia: string;
    texto: string;
  };
  enCache?: boolean;
}

class OrquestadorAhorroEngine {
  private static instancia: OrquestadorAhorroEngine;

  private constructor() {}

  public static obtenerInstancia(): OrquestadorAhorroEngine {
    if (!OrquestadorAhorroEngine.instancia) {
      OrquestadorAhorroEngine.instancia = new OrquestadorAhorroEngine();
    }
    return OrquestadorAhorroEngine.instancia;
  }

  /**
   * Delega la consulta al motor unificado WisdomAIOrchestrator con fallback y circuit breaker.
   */
  public async responderConsulta(params: SolicitudIAOrquestada): Promise<RespuestaIAOrquestada> {
    const res: RespuestaOrquestadaBase = await wisdomAIOrchestrator.responderConsulta(params);

    // Mapeo amigable de nombre de proveedor para compatibilidad con interfaces existentes
    let proveedorAmigable: string = res.proveedorUtilizado;
    if (res.proveedorUtilizado === 'gemini-free') proveedorAmigable = 'gemini-3.8-flash';
    else if (res.proveedorUtilizado === 'groq-free') proveedorAmigable = 'groq-cloud-llama3';
    else if (res.proveedorUtilizado === 'openrouter-free') proveedorAmigable = 'openrouter-free';
    else if (res.proveedorUtilizado === 'cerebras-free') proveedorAmigable = 'cerebras-cloud';
    else if (res.proveedorUtilizado === 'mistral-free') proveedorAmigable = 'mistral-free';
    else if (res.proveedorUtilizado === 'cache-clases-openmaic') proveedorAmigable = 'cache-clases-openmaic';

    return {
      textoRespuesta: res.textoRespuesta,
      proveedorUtilizado: proveedorAmigable,
      nombreProfesor: res.nombreProfesor,
      tiempoRespuestaMs: res.tiempoRespuestaMs,
      versiculoAsociado: res.versiculoAsociado,
      enCache: res.enCache,
    };
  }

  /**
   * Obtiene métricas en vivo para inspección administrativa.
   */
  public obtenerMetricasProveedores(): MetricasProveedor[] {
    return wisdomAIOrchestrator.obtenerEstadoProveedores();
  }
}

export const orquestadorAhorro = OrquestadorAhorroEngine.obtenerInstancia();
export { wisdomAIOrchestrator, WisdomAIOrchestrator };
