/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Endpoint de Paquete Offline (Guía + HTML)
 * ARCHIVO: src/app/api/moodle/offline-package/route.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Entrega los enlaces y metadatos para descargar la guía imprimible (PDF)
 * y el aula interactiva autónoma (HTML de OpenMAIC v1.2.0) para estudio sin conexión.
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { moodleBridge } from '@/services/moodleBridge';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import { assertLegacyContentAccess } from '@/server/domain/contentAccess';
import { gradeKeyForLegacyCourse } from '@/server/domain/studentAccess';

export async function GET(request: NextRequest) {
  try {
    const { user } = requireSession(request);
    const { searchParams } = new URL(request.url);
    const idCurso = searchParams.get('idCurso') || '401';
    const idEscena = searchParams.get('idEscena') || 'scene_creacion_01';
    const versiculo = searchParams.get('versiculo') || 'Proverbios 2:6';
    const numericCourse = Number(idCurso) || 401;
    assertLegacyContentAccess(user, gradeKeyForLegacyCourse(numericCourse), 'General');

    const paquete = await moodleBridge.obtenerPaqueteEstudioOffline(idCurso, idEscena, versiculo);
    if (!paquete.disponibleOffline) {
      return NextResponse.json(
        { exito: false, code: 'PACKAGE_NOT_AVAILABLE', message: paquete.mensaje },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json({
      exito: true,
      paquete,
    });
  } catch (error: any) {
    if (error instanceof ApiError) return handleRouteError(error);
    if (error?.name === 'MoodleNotConfiguredError') {
      return NextResponse.json(
        { exito: false, code: 'MOODLE_NOT_CONFIGURED', message: error.message },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    return NextResponse.json(
      {
        exito: false,
        error: 'Error al generar paquete offline',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request);
    const body = await request.json();
    const { idCurso, idEscena, versiculo } = body;
    const numericCourse = Number(idCurso) || 401;
    assertLegacyContentAccess(user, gradeKeyForLegacyCourse(numericCourse), 'General');

    const paquete = await moodleBridge.obtenerPaqueteEstudioOffline(
      idCurso || 401,
      idEscena || 'scene_creacion_01',
      versiculo || 'Proverbios 2:6'
    );
    if (!paquete.disponibleOffline) {
      return NextResponse.json(
        { exito: false, code: 'PACKAGE_NOT_AVAILABLE', message: paquete.mensaje },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json({
      exito: true,
      paquete,
    });
  } catch (error: any) {
    if (error instanceof ApiError) return handleRouteError(error);
    if (error?.name === 'MoodleNotConfiguredError') {
      return NextResponse.json(
        { exito: false, code: 'MOODLE_NOT_CONFIGURED', message: error.message },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    return NextResponse.json(
      {
        exito: false,
        error: 'Error al generar paquete offline',
      },
      { status: 500 }
    );
  }
}

