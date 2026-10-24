import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  assertSameOrigin,
  getClientIp,
  handleRouteError,
  readJsonBody,
  requireJsonString,
} from '@/server/http/api';
import { verifyEmailToken } from '@/server/domain/authTokens';
import { checkRateLimit } from '@/server/http/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request, { requireOriginInProduction: true });
    const limit = checkRateLimit('email-verify', getClientIp(request), 30, 3600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiados intentos. Espera unos minutos.',
        limit.retryAfterSeconds
      );
    }
    const body = await readJsonBody<{ token?: unknown }>(request);
    const token = requireJsonString(body.token, 'token', 300);
    verifyEmailToken(token);
    return NextResponse.json(
      { ok: true, mensaje: 'Correo verificado correctamente.' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
