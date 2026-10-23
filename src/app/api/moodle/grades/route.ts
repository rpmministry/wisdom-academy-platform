/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Endpoint de Sincronización de Calificaciones
 * ARCHIVO: src/app/api/moodle/grades/route.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Recibe evaluaciones formativas de los agentes IA de OpenMAIC (quizzes, retos PBL)
 * y las asienta en el Libro de Calificaciones de Moodle mediante core_grades_update_grades.
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { moodleBridge } from '@/services/moodleBridge';
import {
  ApiError,
  handleRouteError,
  readJsonBody,
  requireInteger,
  requireSession,
} from '@/server/http/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    requireSession(request, { mutation: true, permission: 'grades.manage' });
    const body = await readJsonBody<{
      idCurso?: unknown;
      idUsuarioMoodle?: unknown;
      calificacion100?: unknown;
      retroalimentacionBilingue?: unknown;
    }>(request);

    const idCurso = requireInteger(body.idCurso, 'idCurso', 1, 10_000_000);
    const idUsuarioMoodle = requireInteger(body.idUsuarioMoodle, 'idUsuarioMoodle', 1, 10_000_000);
    const calificacion100 = Number(body.calificacion100);
    if (!Number.isFinite(calificacion100) || calificacion100 < 0 || calificacion100 > 100) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'La calificación debe ser un número entre 0 y 100.'
      );
    }
    const feedback =
      typeof body.retroalimentacionBilingue === 'string'
        ? body.retroalimentacionBilingue.slice(0, 2000)
        : 'Evaluación formativa completada con el Profesor IA de Wisdom Academy.';

    const resultado = await moodleBridge.sincronizarCalificacionAgenteIA(
      idCurso,
      idUsuarioMoodle,
      calificacion100,
      feedback
    );

    return NextResponse.json(resultado, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    if (error instanceof ApiError) return handleRouteError(error);
    if (error?.name === 'MoodleNotConfiguredError') {
      return NextResponse.json(
        { exito: false, code: 'MOODLE_NOT_CONFIGURED', message: error.message },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    if (error?.name === 'MoodleUnavailableError') {
      return NextResponse.json(
        { exito: false, code: 'MOODLE_UNAVAILABLE', message: error.message },
        { status: 502, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    return NextResponse.json(
      {
        exito: false,
        error: 'Error al asentar calificación en Moodle',
      },
      { status: 500 }
    );
  }
}
