import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  getClientIp,
  handleRouteError,
  readJsonBody,
  requireJsonString,
} from '@/server/http/api';
import {
  orderIdFromRegistrationToken,
  sendRegistrationInvite,
} from '@/server/domain/checkoutRegistration';
import { checkRateLimit } from '@/server/http/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit('registration-resend', getClientIp(request), 10, 3600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiados envíos. Espera unos minutos.',
        limit.retryAfterSeconds
      );
    }
    const body = await readJsonBody<{ token?: unknown }>(request);
    const token = requireJsonString(body.token, 'token', 300);
    const orderId = orderIdFromRegistrationToken(token);
    const result = await sendRegistrationInvite(orderId, { force: true });
    return NextResponse.json(
      {
        ok: true,
        enviado: result.sent,
        configurado: result.skipped !== 'not_configured',
        mensaje: result.sent
          ? 'Enviamos un nuevo enlace al correo de la compra.'
          : 'El servicio de correo no está configurado. Conserva este enlace para completar el registro.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
