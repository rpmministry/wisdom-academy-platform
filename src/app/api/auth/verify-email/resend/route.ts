import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  handleRouteError,
  requireSession,
} from '@/server/http/api';
import { createEmailVerificationLink } from '@/server/domain/authTokens';
import { checkRateLimit } from '@/server/http/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { mutation: true });
    const limit = checkRateLimit('email-verify-resend', user.id, 5, 3600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiados envíos. Espera unos minutos.',
        limit.retryAfterSeconds
      );
    }
    if (user.emailVerified) {
      return NextResponse.json(
        { ok: true, enviado: false, mensaje: 'Tu correo ya está verificado.' },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    const link = createEmailVerificationLink({
      userId: user.id,
      email: user.email,
      name: user.displayName,
    });
    const result = await link.emailResult;
    return NextResponse.json(
      {
        ok: true,
        enviado: result.sent,
        mensaje: result.sent
          ? 'Enviamos un enlace de verificación a tu correo.'
          : 'El servicio de correo no está configurado. Solicita la verificación a administración.',
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
