import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/server/http/api';
import { handlePayPalWebhook } from '@/server/domain/checkout';
import {
  registrationUrlForOrder,
  sendRegistrationInvite,
} from '@/server/domain/checkoutRegistration';
import { checkRateLimit } from '@/server/http/rateLimit';
import { getClientIp } from '@/server/http/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit('paypal-webhook', getClientIp(request), 240, 60);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
    const raw = await request.text();
    if (raw.length > 256 * 1024) {
      return NextResponse.json({ ok: false, error: 'payload_too_large' }, { status: 413 });
    }
    const result = await handlePayPalWebhook(request.headers, raw);
    if (result.paidGuestOrderId) {
      try {
        // La fila de registro se crea aunque el navegador no regrese, para que
        // el comprador pueda recuperar el enlace desde /bienvenida/recuperar.
        registrationUrlForOrder(result.paidGuestOrderId);
        void sendRegistrationInvite(result.paidGuestOrderId).catch(() => undefined);
      } catch {
        // El webhook sigue siendo válido; el reintento de recuperación puede
        // recrear el registro más adelante.
      }
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      return handleRouteError(error);
    }
    return handleRouteError(error);
  }
}
