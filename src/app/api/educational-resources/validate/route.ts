/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - API de Validación de Enlaces Externos
 * ARCHIVO: src/app/api/educational-resources/validate/route.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Permite que un estudiante pegue el enlace de un video encontrado en la
 * búsqueda contextualizada. El servidor extrae el ID, consulta YouTube y aplica
 * los controles disponibles antes de incorporarlo al panel. Un video pendiente
 * se identifica como tal; nunca se etiqueta como validado sin evidencia.
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { educationalResourcesService } from '@/lib/educational-resources/service';
import {
  identificarSolicitante,
  sanitizarEnlaceYContexto,
} from '@/lib/educational-resources/requestValidation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Cabeceras de seguridad comunes. */
function cabecerasSeguras(): HeadersInit {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'Referrer-Policy': 'no-referrer',
  };
}

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
    const resultado = await educationalResourcesService.validarEnlaceExterno(
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
          'No fue posible validar el enlace en este momento. Intenta nuevamente más tarde.',
      },
      { status: 500, headers: cabecerasSeguras() }
    );
  }
}
