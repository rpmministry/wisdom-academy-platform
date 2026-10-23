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
import { verifyGoogleIdToken, loginWithVerifiedGoogleClaims } from '@/server/auth/google';
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
    assertSameOrigin(request);
    const ip = getClientIp(request);
    const limit = checkRateLimit('google-login', ip, e2eMode() ? 1000 : 20, 600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiados intentos de acceso. Espera unos minutos.',
        limit.retryAfterSeconds
      );
    }

    const body = await readJsonBody<{ credential?: string }>(request);
    const credential = requireJsonString(body.credential, 'credential', 8000);
    const claims = await verifyGoogleIdToken(credential);
    const login = loginWithVerifiedGoogleClaims(claims, requestMeta(request));
    const user = loadAuthUser(login.userId);
    if (!user) {
      throw new ApiError(403, 'ACCOUNT_UNAVAILABLE', 'La cuenta no está disponible.');
    }

    resetRateLimit('google-login', ip, 600);
    const session = createSession(user.id, requestMeta(request));
    const response = NextResponse.json(
      {
        ok: true,
        usuario: serializeCurrentUser(user),
        csrfToken: session.csrfToken,
        creada: login.created,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
    setSessionCookie(response, session.token);
    writeAudit({
      actor: user,
      action: login.created ? 'auth.google.account_created' : 'auth.google.login',
      entityType: 'session',
      meta: requestMeta(request),
    });
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
