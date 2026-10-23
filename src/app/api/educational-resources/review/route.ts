/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - API de Revisión de Recursos
 * ARCHIVO: src/app/api/educational-resources/review/route.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * - GET: cola de candidatos pendientes para revisión docente (requiere token
 *   administrativo del servidor).
 * - POST: solicitud de revisión realizada desde el aula por un estudiante o
 *   docente. No aprueba el video; lo prioriza en la cola.
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { educationalResourcesService } from '@/lib/educational-resources/service';
import {
  adminRecursosConfigurado,
  tokenAdminValido,
} from '@/lib/educational-resources/adminAuth';
import {
  identificarSolicitante,
  sanitizarEnlaceYContexto,
} from '@/lib/educational-resources/requestValidation';
import { VERSION_CRITERIOS } from '@/lib/educational-resources/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function cabecerasSeguras(): HeadersInit {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'Referrer-Policy': 'no-referrer',
  };
}

/** Lista la cola de revisión; sólo con el token administrativo. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!adminRecursosConfigurado()) {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          'El panel de revisión no está configurado. Define EDUCATIONAL_RESOURCES_ADMIN_TOKEN en el servidor.',
        candidatos: [],
      },
      { status: 503, headers: cabecerasSeguras() }
    );
  }
  if (!tokenAdminValido(req.headers)) {
    return NextResponse.json(
      { ok: false, mensaje: 'Token administrativo inválido.', candidatos: [] },
      { status: 401, headers: cabecerasSeguras() }
    );
  }

  try {
    const candidatos = await educationalResourcesService.listarCandidatosRevision();
    return NextResponse.json(
      { ok: true, candidatos, versionCriterios: VERSION_CRITERIOS },
      { headers: cabecerasSeguras() }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        mensaje: 'No fue posible cargar la cola de revisión.',
        candidatos: [],
      },
      { status: 500, headers: cabecerasSeguras() }
    );
  }
}

/** Solicita revisión de un video pendiente desde el aula. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, mensaje: 'El cuerpo de la solicitud no es JSON válido.' },
      { status: 400, headers: cabecerasSeguras() }
    );
  }

  const solicitud = sanitizarEnlaceYContexto(cuerpo);
  if (!solicitud.ok) {
    return NextResponse.json(
      { ok: false, mensaje: solicitud.errores.join(' ') },
      { status: 400, headers: cabecerasSeguras() }
    );
  }

  try {
    const solicitante = identificarSolicitante(req.headers);
    const resultado = await educationalResourcesService.solicitarRevision(
      solicitud.valor.videoId,
      solicitud.valor.contexto,
      { reporteroHash: solicitante }
    );
    const status = !resultado.ok && resultado.reintentarEnSegundos ? 429 : 200;
    return NextResponse.json(resultado, {
      status,
      headers: cabecerasSeguras(),
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          'No fue posible registrar la solicitud de revisión. Intenta nuevamente más tarde.',
      },
      { status: 500, headers: cabecerasSeguras() }
    );
  }
}
