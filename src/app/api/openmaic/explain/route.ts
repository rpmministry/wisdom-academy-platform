/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - API de Explicación Pedagógica con OpenMAIC
 * ARCHIVO: src/app/api/openmaic/explain/route.ts
 *
 * PROPÓSITO:
 * Endpoint REST de OpenMAIC para consultas en vivo del aula híbrida.
 * Utiliza el nuevo motor `WisdomAIOrchestrator` conectando de forma resiliente
 * con Gemini Flash, Groq Cloud, OpenRouter Free Tier, Cerebras, Mistral y el
 * motor curricular autónomo con protección anti-429 (Circuit Breaker).
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { wisdomAIOrchestrator } from '@/lib/ai/orchestrator';
import { curriculumContentEngine } from '@/services/curriculumContentEngine';
import {
  ApiError,
  handleRouteError,
  requireSession,
} from '@/server/http/api';
import {
  assertLegacyContentAccess,
  assertStudentScope,
} from '@/server/domain/contentAccess';

interface ExplicacionRequest {
  estudiante: string;
  edad: number;
  grado: string;
  materia: string;
  temaActual: string;
  preguntaEstudiante?: string;
  diapositivaNumero?: number;
  tipoInteraccion?: 'CHAT_PREGUNTA' | 'EXPLICACION_DIAPOSITIVA' | 'RETO_SOCRATICO';
}

export async function POST(req: NextRequest) {
  try {
    const { user } = requireSession(req);
    const body = (await req.json()) as ExplicacionRequest;
    const { estudiante, edad, grado, materia, temaActual, preguntaEstudiante, diapositivaNumero, tipoInteraccion } = body;

    assertLegacyContentAccess(user, grado || '', materia || '', Number(edad) || undefined);
    assertStudentScope(user, { studentName: estudiante, grade: grado });

    const esGael = edad <= 10;
    const leccionBase = curriculumContentEngine.obtenerLeccion(materia, esGael);

    // Invocación a través del motor unificado WisdomAIOrchestrator
    const resultado = await wisdomAIOrchestrator.responderConsulta({
      estudiante,
      edad,
      grado,
      materia,
      temaActual,
      preguntaEstudiante,
      diapositivaNumero,
      tipoInteraccion: tipoInteraccion || 'CHAT_PREGUNTA',
    });

    return NextResponse.json({
      exito: true,
      proveedor: `Wisdom AI (${resultado.proveedorUtilizado})`,
      modelo: resultado.modeloUtilizado,
      materia,
      estudiante,
      profesor: resultado.nombreProfesor,
      explicacion: resultado.textoRespuesta,
      versiculoBiblico: resultado.versiculoAsociado,
      libroTexto: leccionBase.libroTextoPrincipal,
      tiempoRespuestaMs: resultado.tiempoRespuestaMs,
      enCache: resultado.enCache,
      intentosFallidos: resultado.intentosFallidos || 0,
    });
  } catch (error: any) {
    if (error instanceof ApiError) return handleRouteError(error);
    return NextResponse.json(
      {
        exito: false,
        error: 'Error procesando la solicitud en OpenMAIC',
      },
      { status: 500 }
    );
  }
}
