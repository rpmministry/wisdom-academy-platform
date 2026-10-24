import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  assertSameOrigin,
  getClientIp,
  handleRouteError,
  readJsonBody,
  requireJsonString,
} from '@/server/http/api';
import { requestPasswordReset } from '@/server/domain/authTokens';
import { checkRateLimit } from '@/server/http/rateLimit';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request, { requireOriginInProduction: true });
    const ip = getClientIp(request);
    const ipLimit = checkRateLimit('password-forgot-ip', ip, 10, 3600);
    if (!ipLimit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiadas solicitudes. Espera unos minutos.',
        ipLimit.retryAfterSeconds
      );
    }
    const body = await readJsonBody<{ email?: unknown }>(request);
    const email = requireJsonString(body.email, 'email', 254).toLowerCase();
    const emailLimit = checkRateLimit('password-forgot-email', email, 5, 3600);
    if (emailLimit.allowed) {
      await requestPasswordReset(email);
    }
    writeAudit({
      action: 'auth.password_reset.requested',
      entityType: 'user',
      after: { emailProvided: true },
    });
    // Respuesta idéntica exista o no la cuenta.
    return NextResponse.json(
      {
        ok: true,
        mensaje:
          'Si el correo corresponde a una cuenta activa, enviaremos un enlace para restablecer la contraseña.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
