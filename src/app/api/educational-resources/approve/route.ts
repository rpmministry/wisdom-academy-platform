/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - API de Aprobación Docente
 * ARCHIVO: src/app/api/educational-resources/approve/route.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Publica un video revisado por un responsable académico en el catálogo curado.
 * La ruta exige el token administrativo del servidor y las seis confirmaciones
 * explícitas del revisor. Nunca acepta una aprobación anónima.
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { educationalResourcesService } from '@/lib/educational-resources/service';
import {
  adminRecursosConfigurado,
  tokenAdminValido,
} from '@/lib/educational-resources/adminAuth';
import { sanitizarAprobacionRecurso } from '@/lib/educational-resources/requestValidation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cabecerasSeguras(): HeadersInit {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'Referrer-Policy': 'no-referrer',
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!adminRecursosConfigurado()) {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          'La aprobación no está configurada. Define EDUCATIONAL_RESOURCES_ADMIN_TOKEN en el servidor.',
      },
      { status: 503, headers: cabecerasSeguras() }
    );
  }
  if (!tokenAdminValido(req.headers)) {
    return NextResponse.json(
      { ok: false, mensaje: 'Token administrativo inválido.' },
      { status: 401, headers: cabecerasSeguras() }
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, mensaje: 'El cuerpo de la aprobación no es JSON válido.' },
      { status: 400, headers: cabecerasSeguras() }
    );
  }

  const aprobacion = sanitizarAprobacionRecurso(cuerpo);
  if (!aprobacion.ok) {
    return NextResponse.json(
      { ok: false, mensaje: aprobacion.errores.join(' ') },
      { status: 400, headers: cabecerasSeguras() }
    );
  }

  try {
    const resultado = await educationalResourcesService.aprobarRecurso(
      aprobacion.valor
    );
    return NextResponse.json(resultado, {
      status: resultado.ok ? 200 : 400,
      headers: cabecerasSeguras(),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          'No fue posible publicar la aprobación. Revisa el servidor e intenta de nuevo.',
      },
      { status: 500, headers: cabecerasSeguras() }
    );
  }
}
