import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  assertSameOrigin,
  getClientIp,
  handleRouteError,
  readJsonBody,
  requestMeta,
  requireJsonString,
} from '@/server/http/api';
import { authenticateWithPassword } from '@/server/domain/users';
import { createSession, setSessionCookie } from '@/server/auth/sessions';
import { loadAuthUser } from '@/server/auth/authorization';
import { serializeCurrentUser } from '@/server/auth/serialize';
import { checkRateLimit, resetRateLimit } from '@/server/http/rateLimit';
import { e2eMode } from '@/server/config';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request, { requireOriginInProduction: true });
    const ip = getClientIp(request);
    const body = await readJsonBody<{ identificador?: string; contrasenia?: string }>(request);
    const identifier = requireJsonString(body.identificador, 'identificador', 200);
    // Las contraseñas no se recortan: un espacio inicial o final forma parte
    // del secreto y debe compararse exactamente como lo escribió la persona.
    const password = requireJsonString(body.contrasenia, 'contrasenia', 300, { trim: false });

    const testMode = e2eMode();
    const ipLimit = checkRateLimit('login-ip', ip, testMode ? 1000 : 30, 600);
    if (!ipLimit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiados intentos de acceso. Espera unos minutos.',
        ipLimit.retryAfterSeconds
      );
    }
    const identityLimit = checkRateLimit(
      'login-id',
      `${ip}:${identifier.toLowerCase()}`,
      testMode ? 1000 : 8,
      600
    );
    if (!identityLimit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiados intentos para esta cuenta. Espera unos minutos.',
        identityLimit.retryAfterSeconds
      );
    }

    let login;
    try {
      login = await authenticateWithPassword(identifier, password);
    } catch (error) {
      writeAudit({
        action: 'auth.login.failed',
        entityType: 'session',
        after: { identifier: identifier.slice(0, 120) },
        meta: requestMeta(request),
      });
      throw error;
    }

    resetRateLimit('login-id', `${ip}:${identifier.toLowerCase()}`, 600);
    const user = loadAuthUser(login.userId);
    if (!user) {
      throw new ApiError(403, 'ACCOUNT_UNAVAILABLE', 'La cuenta no está disponible.');
    }
    const session = createSession(user.id, requestMeta(request));
    const response = NextResponse.json(
      {
        ok: true,
        usuario: serializeCurrentUser(user),
        csrfToken: session.csrfToken,
        debeCambiarContrasena: login.mustChangePassword,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
    setSessionCookie(response, session.token);
    writeAudit({
      actor: user,
      action: 'auth.login',
      entityType: 'session',
      meta: requestMeta(request),
    });
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
