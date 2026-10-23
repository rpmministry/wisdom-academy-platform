/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Registro de Progreso OpenMAIC en Moodle
 * ARCHIVO: src/app/api/openmaic/progress/route.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Endpoint que recibe el estado de avance del estudiante en el aula interactiva
 * de OpenMAIC (diapositivas vistas, fases completadas, quizzes resueltos)
 * y lo asienta de forma persistente en Moodle LMS REST API.
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { openmaicEngine } from '@/lib/openmaic/openmaicEngine';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import { assertLegacyContentAccess } from '@/server/domain/contentAccess';
import {
  assertMoodleStudentAccess,
  getOwnMoodleId,
  gradeKeyForLegacyCourse,
} from '@/server/domain/studentAccess';

export async function POST(req: NextRequest) {
  try {
    const { user } = requireSession(req, { mutation: true });
    const body = await req.json();
    const {
      estudianteId,
      idMoodle,
      cursoId,
      materia,
      diapositivaActual,
      totalDiapositivas,
      pasoActivo,
      porcentajeCompletado,
      quizCalificacion,
    } = body;

    const ownMoodleId = getOwnMoodleId(user);
    const requestedMoodleId = Number(idMoodle) || ownMoodleId;
    if (requestedMoodleId) assertMoodleStudentAccess(user, requestedMoodleId);
    const numericCourse = Number(cursoId) || 801;
    assertLegacyContentAccess(
      user,
      gradeKeyForLegacyCourse(numericCourse),
      materia || 'General'
    );

    const resultado = await openmaicEngine.guardarProgresoMoodle({
      estudianteId: estudianteId || 'est_01',
      idMoodle: Number(idMoodle) || 801,
      cursoId: Number(cursoId) || 801,
      materia: materia || 'General',
      diapositivaActual: Number(diapositivaActual) || 1,
      totalDiapositivas: Number(totalDiapositivas) || 4,
      pasoActivo: Number(pasoActivo) || 0,
      porcentajeCompletado: Number(porcentajeCompletado) || 0,
      quizCalificacion: typeof quizCalificacion === 'number' ? quizCalificacion : undefined,
      fechaUltimaActividad: new Date().toISOString(),
    });

    return NextResponse.json({
      exito: resultado.exito,
      mensaje: resultado.mensaje,
      fechaSincronizacion: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error instanceof ApiError) return handleRouteError(error);
    return NextResponse.json(
      {
        exito: false,
        error: 'Error registrando el progreso de OpenMAIC en Moodle',
      },
      { status: 500 }
    );
  }
}

