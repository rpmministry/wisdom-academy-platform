/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - API de Reportes de Videos
 * ARCHIVO: src/app/api/educational-resources/reports/route.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Registra incidencias sobre un recurso audiovisual sin solicitar datos
 * personales, aplica deduplicación y límites de frecuencia, y devuelve una
 * sustitución validada cuando existe. La respuesta permite actualizar el panel
 * sin recargar la clase.
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { educationalResourcesService } from '@/lib/educational-resources/service';
import { sanitizarReporteVideo } from '@/lib/educational-resources/requestValidation';
import { loadSessionFromRequest } from '@/server/auth/sessions';
import { userHasAnyEducationalAccess } from '@/server/domain/access';
import { sha256 } from '@/server/security/random';

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
  const session = loadSessionFromRequest(req);
  if (!session) {
    return NextResponse.json(
      { ok: false, mensaje: 'Debes iniciar sesión para reportar un recurso.' },
      { status: 401, headers: cabecerasSeguras() }
    );
  }
  if (!userHasAnyEducationalAccess(session.user)) {
    return NextResponse.json(
      { ok: false, mensaje: 'No tienes acceso vigente al aula.' },
      { status: 403, headers: cabecerasSeguras() }
    );
  }

  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        registrado: false,
        duplicado: false,
        estadoRecurso: 'REPORTADO',
        mensaje: 'El cuerpo del reporte no es JSON válido.',
        busquedaUrl: '',
      },
      { status: 400, headers: cabecerasSeguras() }
    );
  }

  const reporte = sanitizarReporteVideo(cuerpo);
  if (!reporte.ok) {
    return NextResponse.json(
      {
        ok: false,
        registrado: false,
        duplicado: false,
        estadoRecurso: 'REPORTADO',
        mensaje: reporte.errores.join(' '),
        busquedaUrl: '',
      },
      { status: 400, headers: cabecerasSeguras() }
    );
  }

  try {
    const reporteroHash = sha256(session.user.id);
    const resultado = await educationalResourcesService.reportarVideo(
      reporte.valor,
      { reporteroHash }
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
        registrado: false,
        duplicado: false,
        estadoRecurso: 'REPORTADO',
        mensaje:
          'No fue posible registrar el reporte en este momento. La clase continúa funcionando.',
        busquedaUrl: '',
      },
      { status: 500, headers: cabecerasSeguras() }
    );
  }
}
