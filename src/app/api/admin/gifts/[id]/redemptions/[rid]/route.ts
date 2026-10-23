import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { changeGiftRedemptionStatus } from '@/server/domain/gifts';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; rid: string }> }
) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'gifts.manage' });
    const body = await readJsonBody<{
      action?: 'pause' | 'resume' | 'revoke';
      reason?: string;
    }>(request);
    if (!body.action || !['pause', 'resume', 'revoke'].includes(body.action)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'La acción debe ser pause, resume o revoke.');
    }
    changeGiftRedemptionStatus(
      (await context.params).rid,
      body.action,
      user,
      body.reason || undefined
    );
    writeAudit({
      actor: user,
      action: `gift.redemption.${body.action}`,
      entityType: 'gift_redemption',
      entityId: (await context.params).rid,
      after: { giftCodeId: (await context.params).id },
    });
    return jsonOk({ mensaje: 'Derechos del beneficiario actualizados.' });
  } catch (error) {
    return handleRouteError(error);
  }
}
