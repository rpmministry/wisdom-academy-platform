/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Sincronización Diaria del Currículo
 * ARCHIVO: src/app/api/curriculum/sync-daily/route.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Sincroniza materiales de Google Drive, genera horarios y despacha la primera
 * lección hacia OpenMAIC. Es una operación de escritura: solo se admite por
 * POST, con sesión, permiso y token CSRF. GET no debe producir efectos.
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { curriculumSynchronizer } from '@/services/googleDriveCurriculumSync';
import { ESTUDIANTE_GAEL_INICIAL, ESTUDIANTE_AVRIL_INICIAL } from '@/types/wisdom';
import { obtenerPerfilCurricular } from '@/data/curriculum';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      exito: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'La sincronización diaria modifica datos. Envíala por POST.',
    },
    { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: NextRequest) {
  try {
    requireSession(request, { mutation: true, permission: 'resources.manage' });
    const resultadosSincronizacion = [];
    const estudiantes = [ESTUDIANTE_GAEL_INICIAL, ESTUDIANTE_AVRIL_INICIAL];

    for (const est of estudiantes) {
      const materiales = await curriculumSynchronizer.leerMaterialesDelAnioEnDrive(
        est.codigoCarpetaAnioDrive
      );
      const horario = await curriculumSynchronizer.generarHorarioAutomaticoPorAlumno(
        est,
        materiales
      );
      const perfil = obtenerPerfilCurricular(est.codigoCarpetaAnioDrive);
      const primeraAsignatura = perfil.asignaturas[0];
      const primerMaterial = materiales[0] || {
        nombreArchivo: 'Clase_Inaugural.pdf',
        materia: primeraAsignatura.nombre,
        versiculoBiblico: primeraAsignatura.lema.texto,
      };

      const aulaOpenMaic =
        await curriculumSynchronizer.despacharMaterialDriveHaciaAgenteOpenMaic(
          est,
          primerMaterial
        );

      resultadosSincronizacion.push({
        estudiante: est.nombreCompleto,
        grado: est.gradoEcuador,
        totalBloquesHorario: horario.bloques.length,
        duracionBloqueMinutos: 45,
        recreoMinutos: 30,
        primeraMateria: primerMaterial.materia,
        urlAulaInteractiva: aulaOpenMaic.urlAulaInteractiva,
        escenasListas: aulaOpenMaic.escenas,
      });
    }

    return NextResponse.json(
      {
        exito: true,
        timestamp: new Date().toISOString(),
        mensaje: 'Sincronización diaria con Google Drive y OpenMAIC ejecutada con éxito.',
        estudiantesSincronizados: resultadosSincronizacion,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    if (error instanceof ApiError) return handleRouteError(error);
    return NextResponse.json(
      {
        exito: false,
        error: 'Error en la sincronización diaria',
      },
      { status: 500 }
    );
  }
}
