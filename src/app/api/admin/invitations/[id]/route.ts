import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { updateInvitationStatus } from '@/server/domain/invitations';
import { prepare } from '@/server/db';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'founder_codes.manage' });
    if (!prepare('SELECT id FROM invitations WHERE id = ?').get((await context.params).id)) {
      throw new ApiError(404, 'INVITATION_NOT_FOUND', 'La invitación no existe.');
    }
    const body = await readJsonBody<{ action?: 'pause' | 'resume' | 'revoke' }>(request);
    if (!body.action || !['pause', 'resume', 'revoke'].includes(body.action)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'La acción debe ser pause, resume o revoke.');
    }
    updateInvitationStatus((await context.params).id, body.action);
    writeAudit({
      actor: user,
      action: `invitation.${body.action}`,
      entityType: 'invitation',
      entityId: (await context.params).id,
    });
    return jsonOk({ mensaje: 'Invitación actualizada.' });
  } catch (error) {
    return handleRouteError(error);
  }
}
