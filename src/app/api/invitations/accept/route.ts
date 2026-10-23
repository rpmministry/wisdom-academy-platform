import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireJsonString,
  requireSession,
} from '@/server/http/api';
import { acceptInvitation } from '@/server/domain/invitations';
import { checkRateLimit } from '@/server/http/rateLimit';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { mutation: true });
    const limit = checkRateLimit('invitation-accept', user.id, 10, 600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiados intentos. Espera unos minutos.',
        limit.retryAfterSeconds
      );
    }
    const body = await readJsonBody<{ codigo?: string }>(request);
    const code = requireJsonString(body.codigo, 'codigo', 120);
    const result = acceptInvitation({ token: code, user });
    writeAudit({
      actor: user,
      action: result.alreadyAccepted ? 'invitation.accept.idempotent' : 'invitation.accept',
      entityType: 'invitation',
      entityId: result.invitationId,
      after: {
        kind: result.kind,
        grantId: result.grantId,
        accessEndsAt: result.accessEndsAt,
      },
    });
    return jsonOk({
      invitacion: result,
      mensaje: result.alreadyAccepted
        ? 'La invitación ya estaba aceptada en tu cuenta.'
        : 'Invitación aceptada. Tu acceso global está habilitado.',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
