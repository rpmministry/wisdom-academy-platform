import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  assertSameOrigin,
  getClientIp,
  handleRouteError,
  readJsonBody,
  requireJsonString,
} from '@/server/http/api';
import { resetPasswordWithToken } from '@/server/domain/authTokens';
import { checkRateLimit } from '@/server/http/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request, { requireOriginInProduction: true });
    const limit = checkRateLimit('password-reset', getClientIp(request), 20, 3600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiados intentos. Espera unos minutos.',
        limit.retryAfterSeconds
      );
    }
    const body = await readJsonBody<{
      token?: unknown;
      password?: unknown;
      passwordConfirm?: unknown;
    }>(request);
    const token = requireJsonString(body.token, 'token', 300);
    const password = requireJsonString(body.password, 'password', 200, { trim: false });
    const confirm = requireJsonString(body.passwordConfirm, 'passwordConfirm', 200, {
      trim: false,
    });
    if (password !== confirm) {
      throw new ApiError(400, 'PASSWORD_MISMATCH', 'Las contraseñas no coinciden.');
    }
    await resetPasswordWithToken(token, password);
    return NextResponse.json(
      { ok: true, mensaje: 'Contraseña actualizada. Ya puedes iniciar sesión.' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
