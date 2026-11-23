import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  getClientIp,
  handleRouteError,
  jsonOk,
  readJsonBody,
} from '@/server/http/api';
import { checkRateLimit } from '@/server/http/rateLimit';
import { redeemPazAccessCode } from '@/server/domain/pazAccessCodes';
import { createSession, setSessionCookie } from '@/server/auth/sessions';
import { sha256 } from '@/server/security/random';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const limit = checkRateLimit('paz-code-redeem', clientIp, 10, 900);
    if (!limit.allowed) {
      throw new ApiError(429, 'RATE_LIMITED', 'Demasiados intentos de canje. Espera 15 minutos.');
    }

    const body = await readJsonBody(request);
    const rawCode = typeof body.rawCode === 'string' ? body.rawCode.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : undefined;

    if (!rawCode || !email) {
      throw new ApiError(400, 'FIELDS_REQUIRED', 'El correo y el código de 25 caracteres son obligatorios.');
    }

    const userAgent = request.headers.get('user-agent') || 'Browser';
    const result = redeemPazAccessCode({
      rawCode,
      email,
      fullName,
      clientIp,
      userAgent,
    });

    // Iniciar sesión automáticamente del estudiante canjeado
    const response = jsonOk({
      success: true,
      user: result.user,
      program: result.program,
      redirectUrl: `/cursos/${result.program.slug}`,
    });

    const session = createSession(result.user.id, {
      ipHash: clientIp ? sha256(clientIp) : null,
      uaHash: userAgent ? sha256(userAgent) : null,
    });
    setSessionCookie(response, session.token);

    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
