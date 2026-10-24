import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  assertSameOrigin,
  getClientIp,
  handleRouteError,
  readJsonBody,
} from '@/server/http/api';
import { normalizeBuyerEmail } from '@/server/domain/guestCheckout';
import {
  pendingRegistrationsForEmail,
  sendRegistrationInvite,
} from '@/server/domain/checkoutRegistration';
import { checkRateLimit } from '@/server/http/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request, { requireOriginInProduction: true });
    const ip = getClientIp(request);
    const limit = checkRateLimit('registration-recover', ip, 10, 3600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiadas solicitudes. Espera unos minutos.',
        limit.retryAfterSeconds
      );
    }
    const body = await readJsonBody<{ email?: unknown }>(request);
    const email = normalizeBuyerEmail(body.email);
    const emailLimit = checkRateLimit('registration-recover-email', email, 5, 3600);
    if (emailLimit.allowed) {
      const pending = pendingRegistrationsForEmail(email);
      for (const registration of pending) {
        try {
          await sendRegistrationInvite(registration.orderId, { force: true });
        } catch {
          // La respuesta sigue siendo genérica para no revelar compras.
        }
      }
    }
    return NextResponse.json(
      {
        ok: true,
        mensaje:
          'Si existe una compra pendiente de registro para ese correo, enviaremos el enlace de continuación.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
