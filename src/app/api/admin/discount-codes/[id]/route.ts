import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { updateDiscountCodeStatus } from '@/server/domain/discounts';
import { prepare } from '@/server/db';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'discounts.manage' });
    if (!prepare('SELECT id FROM discount_codes WHERE id = ?').get((await context.params).id)) {
      throw new ApiError(404, 'DISCOUNT_CODE_NOT_FOUND', 'El código no existe.');
    }
    const body = await readJsonBody<{ action?: 'pause' | 'activate' | 'revoke' }>(request);
    if (!body.action || !['pause', 'activate', 'revoke'].includes(body.action)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'La acción debe ser pause, activate o revoke.');
    }
    const status = body.action === 'pause' ? 'paused' : body.action === 'revoke' ? 'revoked' : 'active';
    updateDiscountCodeStatus((await context.params).id, status);
    writeAudit({
      actor: user,
      action: `discount.code.${body.action}`,
      entityType: 'discount_code',
      entityId: (await context.params).id,
      after: { status },
    });
    return jsonOk({ mensaje: 'Código de descuento actualizado.' });
  } catch (error) {
    return handleRouteError(error);
  }
}
