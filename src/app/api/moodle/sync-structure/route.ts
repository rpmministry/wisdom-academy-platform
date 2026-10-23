/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Endpoint de Sincronización Estructural
 * ARCHIVO: src/app/api/moodle/sync-structure/route.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Expone la sincronización automatizada de las 14 categorías escolares y las
 * asignaturas iniciales para Gael (4° EGB) y Avril (8° EGB) en el LMS Moodle.
 * Es una operación de escritura: solo se admite por POST y con token CSRF.
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { moodleBridge } from '@/services/moodleBridge';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      exito: false,
      code: 'METHOD_NOT_ALLOWED',
      message: 'La sincronización estructural modifica Moodle. Envíala por POST.',
    },
    { status: 405, headers: { Allow: 'POST', 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: NextRequest) {
  try {
    requireSession(request, { mutation: true, permission: 'resources.manage' });
    const resultado = await moodleBridge.crearEstructuraAnualCategoriasYGrados();
    return NextResponse.json(
      {
        exito: true,
        mensaje: 'Estructura de categorías y grados creada en Moodle.',
        datos: resultado,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
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
        error: 'Error al sincronizar estructura de Moodle',
      },
      { status: 500 }
    );
  }
}
