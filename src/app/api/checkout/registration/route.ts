import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  assertSameOrigin,
  getClientIp,
  handleRouteError,
  readJsonBody,
  requestMeta,
  requireJsonString,
  requireSession,
} from '@/server/http/api';
import { createSession, loadSessionFromRequest, setSessionCookie } from '@/server/auth/sessions';
import { serializeCurrentUser } from '@/server/auth/serialize';
import { loadAuthUser } from '@/server/auth/authorization';
import {
  completeRegistration,
  getRegistrationView,
  type RegistrationSubmission,
} from '@/server/domain/checkoutRegistration';

import { checkRateLimit } from '@/server/http/rateLimit';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || '';
    if (!token || token.length > 300) {
      throw new ApiError(400, 'TOKEN_REQUIRED', 'El enlace de registro no es válido.');
    }
    const limit = checkRateLimit('registration-view', getClientIp(request), 90, 3600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiadas consultas. Espera un momento.',
        limit.retryAfterSeconds
      );
    }
    const session = loadSessionFromRequest(request);
    const registro = getRegistrationView(token, session?.user || null);
    return NextResponse.json(
      { ok: true, registro },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = loadSessionFromRequest(request);
    if (session) {
      // Si ya hay una cuenta activa, la vinculación exige CSRF y coincidencia
      // de correo; la cookie por sí sola no autoriza a apropiarse de la orden.
      requireSession(request, { mutation: true });
    } else {
      assertSameOrigin(request, { requireOriginInProduction: true });
    }
    const ip = getClientIp(request);
    const limit = checkRateLimit('registration-complete', ip, 20, 3600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiados intentos de registro. Espera un momento.',
        limit.retryAfterSeconds
      );
    }
    const body = await readJsonBody<Record<string, unknown>>(request, 96 * 1024);
    const token = requireJsonString(body.token, 'token', 300);
    const result = await completeRegistration({
      token,
      sessionUser: session?.user || null,
      submission: body as unknown as RegistrationSubmission,
    });
    let csrfToken: string | null = null;
    let usuario = null;
    let sessionToken: string | null = null;
    if (result.isNewUser && !session) {
      const user = loadAuthUser(result.userId);
      if (user) {
        const created = createSession(user.id, requestMeta(request));
        csrfToken = created.csrfToken;
        sessionToken = created.token;
        usuario = serializeCurrentUser(user);
      }
    }
    writeAudit({
      actor: session?.user || null,
      action: 'checkout.registered',
      entityType: 'registration',
      entityId: result.registrationId,
      after: {
        orderId: result.orderId,
        newUser: result.isNewUser,
        products: result.productNames,
      },
      meta: requestMeta(request),
    });
    const response = NextResponse.json(
      {
        ok: true,
        registro: {
          registrationId: result.registrationId,
          orderId: result.orderId,
          redirectTo: result.redirectTo,
          loginUrl: result.loginUrl,
          productNames: result.productNames,
          emailSent: result.emailSent,
        },
        usuario,
        csrfToken,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
    if (sessionToken) setSessionCookie(response, sessionToken);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
