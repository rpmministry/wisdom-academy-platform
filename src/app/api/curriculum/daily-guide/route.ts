/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - API de Guía de Ruta Diaria Unificada (A4 PDF)
 * ARCHIVO: src/app/api/curriculum/daily-guide/route.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Endpoint REST de alto rendimiento y compatible con Vercel Serverless que
 * compila y entrega el documento unificado oficial de la jornada escolar:
 * - Unifica todas las materias del día lectivo (08:00 a 12:00) en un solo archivo.
 * - Soporta previsualización, impresión directa en PDF y descarga offline.
 * - Marca la respuesta como privada para no filtrar datos del estudiante.
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { dailyGuideCompiler } from '@/lib/pdf/daily-guide-compiler';
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
    const estudianteQuery = searchParams.get('estudiante') || 'Gael Mateo';
    const diaLectivo = parseInt(searchParams.get('dia') || '1', 10);
    const autoPrint = searchParams.get('autoPrint') === 'true';
    const forzarDescarga = searchParams.get('download') === 'true';

    const esGael = estudianteQuery.toLowerCase().includes('gael') || estudianteQuery.toLowerCase().includes('4');
    const estudiante = esGael ? ESTUDIANTE_GAEL_INICIAL : ESTUDIANTE_AVRIL_INICIAL;
    assertLegacyContentAccess(user, estudiante.gradoEcuador, 'General', estudiante.edad);
    assertStudentScope(user, {
      studentName: estudianteQuery,
      grade: estudiante.gradoEcuador,
    });

    // Compilación unificada de la jornada
    const htmlContenido = dailyGuideCompiler.compilarGuiaDiariaHtml(
      estudiante,
      isNaN(diaLectivo) || diaLectivo < 1 || diaLectivo > 200 ? 1 : diaLectivo,
      autoPrint
    );

    const nombreArchivo = `Guia_Ruta_Diaria_Dia_${diaLectivo}_${esGael ? 'Gael' : 'Avril'}.html`;

    return new NextResponse(htmlContenido, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': contentDisposition(
          nombreArchivo,
          forzarDescarga ? 'attachment' : 'inline'
        ),
        // La guía contiene el nombre y la jornada de un estudiante concreto:
        // nunca debe almacenarse en cachés compartidas ni en el historial HTTP.
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    if (error instanceof ApiError) return handleRouteError(error);
    return NextResponse.json(
      {
        exito: false,
        error: 'Error al compilar la guía unificada de la jornada',
      },
      { status: 500 }
    );
  }
}

