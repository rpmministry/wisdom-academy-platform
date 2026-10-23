/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - API del Orquestador de IAs Gratuitas
 * ARCHIVO: src/app/api/ai/orchestrator/route.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Endpoint REST para consultar el motor `WisdomAIOrchestrator`, asegurando
 * alta disponibilidad a costo cero ($0 USD) con conmutación multi-proveedor
 * (Google Gemini, Groq, OpenRouter, Cerebras, Mistral y Motor Autónomo),
 * protección anti-429 (Circuit Breaker) y aceleración por Caché.
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { wisdomAIOrchestrator } from '@/lib/ai/orchestrator';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import {
  assertLegacyContentAccess,
  assertStudentScope,
} from '@/server/domain/contentAccess';

export async function POST(req: NextRequest) {
  try {
    const { user } = requireSession(req);
    const body = await req.json();
    const { estudiante, edad, grado, materia, temaActual, preguntaEstudiante, diapositivaNumero, tipoInteraccion } = body;

    assertLegacyContentAccess(user, grado || '', materia || '', Number(edad) || undefined);
    assertStudentScope(user, { studentName: estudiante, grade: grado });

    const respuesta = await wisdomAIOrchestrator.responderConsulta({
      estudiante: estudiante || 'Estudiante',
      edad: Number(edad) || 12,
      grado: grado || '8° EGB',
      materia: materia || 'Ciencias',
      temaActual: temaActual || 'Lección Principal',
      preguntaEstudiante,
      diapositivaNumero: Number(diapositivaNumero) || 1,
      tipoInteraccion: tipoInteraccion || 'CHAT_PREGUNTA',
    });

    return NextResponse.json({
      exito: true,
      respuesta: respuesta.textoRespuesta,
      proveedor: respuesta.proveedorUtilizado,
      modelo: respuesta.modeloUtilizado,
      profesor: respuesta.nombreProfesor,
      tiempoRespuestaMs: respuesta.tiempoRespuestaMs,
      enCache: respuesta.enCache,
      versiculo: respuesta.versiculoAsociado,
      intentosFallidos: respuesta.intentosFallidos || 0,
    });
  } catch (error: any) {
    if (error instanceof ApiError) return handleRouteError(error);
    return NextResponse.json(
      {
        exito: false,
        error: 'Error en el orquestador de IA',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const proveedores = wisdomAIOrchestrator.obtenerEstadoProveedores();
    return NextResponse.json({
      exito: true,
      orquestador: 'WisdomAIOrchestrator (Zero-Cost Resilient Engine)',
      proveedores,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        exito: false,
        error: error.message || 'Error obteniendo estado de los proveedores',
      },
      { status: 500 }
    );
  }
}
