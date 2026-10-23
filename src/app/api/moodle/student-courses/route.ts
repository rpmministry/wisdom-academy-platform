/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Endpoint de Cursos por Estudiante
 * ARCHIVO: src/app/api/moodle/student-courses/route.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Consulta y devuelve la lista tipada de cursos matriculados para un estudiante
 * específico (e.g. Gael = 104, Avril = 108) desde la API REST de Moodle.
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { moodleBridge } from '@/services/moodleBridge';
import { ESTUDIANTE_GAEL_INICIAL } from '@/types/wisdom';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import { assertMoodleStudentAccess } from '@/server/domain/studentAccess';

export async function GET(request: NextRequest) {
  try {
    const { user } = requireSession(request);
    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get('studentId');
    const studentId = studentIdParam ? parseInt(studentIdParam, 10) : ESTUDIANTE_GAEL_INICIAL.idMoodle;
    if (!Number.isInteger(studentId) || studentId <= 0) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'El identificador de estudiante no es válido.');
    }
    assertMoodleStudentAccess(user, studentId);

    const cursos = await moodleBridge.obtenerCursosPorEstudiante(studentId);

    return NextResponse.json({
      exito: true,
      estudianteId: studentId,
      totalCursos: cursos.length,
      cursos,
    });
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
        error: 'Error al obtener asignaturas del estudiante',
      },
      { status: 500 }
    );
  }
}

