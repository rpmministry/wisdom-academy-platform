import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireJsonString,
  requireSession,
} from '@/server/http/api';
import { changeOwnPassword } from '@/server/domain/users';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user, session } = requireSession(request, {
      mutation: true,
      allowPendingPasswordChange: true,
    });
    const body = await readJsonBody<{
      contraseniaActual?: string;
      contraseniaNueva?: string;
    }>(request);
    const currentPassword =
      typeof body.contraseniaActual === 'string' ? body.contraseniaActual : '';
    if (currentPassword.length > 300) {
      throw new ApiError(
        400,
        'VALIDATION_ERROR',
        'El campo contraseniaActual excede la longitud permitida.'
      );
    }
    const newPassword = requireJsonString(body.contraseniaNueva, 'contraseniaNueva', 200, {
      trim: false,
    });
    await changeOwnPassword({
      userId: user.id,
      currentPassword,
      newPassword,
      currentSessionHash: session.tokenHash,
    });
    writeAudit({
      actor: user,
      action: 'auth.password.changed',
      entityType: 'user',
      entityId: user.id,
    });
    return jsonOk({ mensaje: 'Contraseña actualizada correctamente.' });
  } catch (error) {
    return handleRouteError(error);
  }
}
