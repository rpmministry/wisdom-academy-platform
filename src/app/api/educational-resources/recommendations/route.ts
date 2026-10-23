/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - API de Recomendaciones Audiovisuales
 * ARCHIVO: src/app/api/educational-resources/recommendations/route.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Expone las recomendaciones contextualizadas del aula OpenMAIC. La ruta:
 * 1. Sanitiza el contexto académico y descarta datos personales.
 * 2. Aplica un límite de frecuencia anónimo.
 * 3. Delega búsqueda, validación, caché y ranking al servicio.
 * 4. Responde siempre con JSON seguro y sin claves de API.
 *
 * El endpoint admite POST (recomendado para contextos extensos) y GET
 * (diagnóstico y pruebas).
 * ==============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { educationalResourcesService } from '@/lib/educational-resources/service';
import {
  contextoDesdeParametros,
  identificarSolicitante,
  sanitizarContextoAcademico,
} from '@/lib/educational-resources/requestValidation';
import {
  construirConsultaContextual,
  construirUrlBusquedaYouTube,
} from '@/lib/educational-resources/text';
import type { ContextoAcademico } from '@/types/educationalResources';
import { loadSessionFromRequest } from '@/server/auth/sessions';
import { assertLegacyContentAccess } from '@/server/domain/contentAccess';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Cabeceras comunes: nunca cachear una respuesta con datos contextuales. */
function cabecerasSeguras(): HeadersInit {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'Referrer-Policy': 'no-referrer',
  };
}

/** Respuesta de error segura sin detalles internos ni credenciales. */
function respuestaError(
  mensaje: string,
  status: number,
  contexto?: ContextoAcademico
): NextResponse {
  const consulta = contexto ? construirConsultaContextual(contexto) : '';
  return NextResponse.json(
    {
      ok: false,
      mensaje,
      reintentarEnSegundos: status === 429 ? 60 : undefined,
      busquedaUrl: consulta ? construirUrlBusquedaYouTube(consulta) : undefined,
      recursos: [],
      pendientes: [],
    },
    { status, headers: cabecerasSeguras() }
  );
}

function autorizarContexto(req: NextRequest, contexto: ContextoAcademico): NextResponse | null {
  const session = loadSessionFromRequest(req);
  if (!session) {
    return respuestaError('Debes iniciar sesión para consultar recursos del aula.', 401, contexto);
  }
  try {
    assertLegacyContentAccess(
      session.user,
      contexto.curso,
      contexto.asignatura,
      contexto.edad
    );
  } catch {
    return respuestaError(
      'No tienes un derecho vigente para los recursos de esta materia.',
      403,
      contexto
    );
  }
  return null;
}

/** Ejecuta la recomendación aplicando el límite de frecuencia. */
async function resolverRecomendaciones(
  contexto: ContextoAcademico,
  cabeceras: Headers,
  opciones: { forzar?: boolean; excluir?: string[] }
): Promise<NextResponse> {
  const solicitante = identificarSolicitante(cabeceras);
  const limite = educationalResourcesService.permitirRecomendaciones(solicitante);
  if (!limite.permitido) {
    const consulta = construirConsultaContextual(contexto);
    return NextResponse.json(
      {
        ok: false,
        mensaje:
          'Se realizaron demasiadas búsquedas en poco tiempo. Espera un momento y vuelve a intentar.',
        reintentarEnSegundos: limite.reintentarEnSegundos,
        busquedaUrl: construirUrlBusquedaYouTube(consulta),
        recursos: [],
        pendientes: [],
      },
      { status: 429, headers: cabecerasSeguras() }
    );
  }

  const resultado = await educationalResourcesService.obtenerRecomendaciones(
    contexto,
    opciones
  );
  return NextResponse.json(resultado, { headers: cabecerasSeguras() });
}

/** Recomendaciones por POST con contexto JSON. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return respuestaError('El cuerpo de la solicitud no es JSON válido.', 400);
  }

  const entrada = (cuerpo || {}) as Record<string, unknown>;
  const contexto = sanitizarContextoAcademico(entrada.contexto);
  if (!contexto.ok) {
    return respuestaError(contexto.errores.join(' '), 400);
  }

  const denegado = autorizarContexto(req, contexto.valor);
  if (denegado) return denegado;

  try {
    const excluir = Array.isArray(entrada.excluir)
      ? entrada.excluir
          .filter((item): item is string => typeof item === 'string')
          .slice(0, 12)
      : [];
    return await resolverRecomendaciones(contexto.valor, req.headers, {
      forzar: entrada.forzar === true,
      excluir,
    });
  } catch {
    return respuestaError(
      'No fue posible obtener recursos audiovisuales en este momento. La clase continúa disponible.',
      500,
      contexto.valor
    );
  }
}

/** Recomendaciones por GET, útiles para diagnóstico y pruebas manuales. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const parametros = req.nextUrl.searchParams;
  const contexto = contextoDesdeParametros(parametros);
  if (!contexto.ok) {
    return respuestaError(contexto.errores.join(' '), 400);
  }

  const denegado = autorizarContexto(req, contexto.valor);
  if (denegado) return denegado;

  try {
    return await resolverRecomendaciones(contexto.valor, req.headers, {
      forzar: parametros.get('forzar') === '1',
      excluir: (parametros.get('excluir') || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12),
    });
  } catch {
    return respuestaError(
      'No fue posible obtener recursos audiovisuales en este momento. La clase continúa disponible.',
      500,
      contexto.valor
    );
  }
}
