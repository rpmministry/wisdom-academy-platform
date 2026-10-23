/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - API de Descarga de Guías Oficiales PDF / HTML
 * ARCHIVO: src/app/api/curriculum/guide-pdf/route.ts
 *
 * PROPÓSITO:
 * Endpoint REST para servir guías de estudio imprimibles en formato A4 / PDF,
 * con contenido pedagógico oficial, referencias de libros MINEDUC y firmas legales.
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { curriculumContentEngine } from '@/services/curriculumContentEngine';
import { printableGuideGenerator } from '@/services/printableGuideGenerator';
import { ESTUDIANTE_GAEL_INICIAL, ESTUDIANTE_AVRIL_INICIAL } from '@/types/wisdom';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import { contentDisposition } from '@/server/http/contentDisposition';
import {
  assertLegacyContentAccess,
  assertStudentScope,
} from '@/server/domain/contentAccess';

export async function GET(req: NextRequest) {
  try {
    const { user } = requireSession(req);
    const { searchParams } = new URL(req.url);
    const materia = searchParams.get('materia') || 'Lengua y Literatura';
    const estudianteNombre = searchParams.get('estudiante') || 'Gael Mateo';

    const esGael = estudianteNombre.toLowerCase().includes('gael');
    const estudiante = esGael ? ESTUDIANTE_GAEL_INICIAL : ESTUDIANTE_AVRIL_INICIAL;
    assertLegacyContentAccess(user, estudiante.gradoEcuador, materia, estudiante.edad);
    assertStudentScope(user, {
      studentName: estudianteNombre,
      grade: estudiante.gradoEcuador,
    });

    const leccion = curriculumContentEngine.obtenerLeccion(materia, esGael);
    const bloque = {
      id: 'bloque_guia_oficial',
      numeroBloque: 1,
      horaInicio: '08:00',
      horaFin: '08:45',
      nombreMateria: materia,
      modalidad: 'AGENTE_IA_OPENMAIC' as const,
      archivoDriveTema: leccion.libroTextoPrincipal,
      versiculoBloque: leccion.diapositivas[0]?.versiculoBiblico.texto || 'El principio de la sabiduría es el temor de Jehová.',
    };

    const htmlContent = printableGuideGenerator.generarHtmlGuia(estudiante, bloque, leccion);

    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': contentDisposition(
          `Guia_${materia.replace(/\s+/g, '_')}.html`,
          'inline'
        ),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    if (error instanceof ApiError) return handleRouteError(error);
    return NextResponse.json(
      { error: 'Error al generar la guía oficial' },
      { status: 500 }
    );
  }
}

