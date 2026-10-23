import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { prepare } from '@/server/db';
import { updateDiscountStatus } from '@/server/domain/discounts';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'discounts.manage' });
    const discount = prepare('SELECT id, status FROM discounts WHERE id = ?').get(
      (await context.params).id
    ) as { id: string; status: string } | undefined;
    if (!discount) throw new ApiError(404, 'DISCOUNT_NOT_FOUND', 'La promoción no existe.');
    const body = await readJsonBody<{ action?: 'pause' | 'activate' | 'draft' }>(request);
    if (!body.action || !['pause', 'activate', 'draft'].includes(body.action)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'La acción debe ser pause, activate o draft.');
    }
    const status = body.action === 'pause' ? 'paused' : body.action === 'draft' ? 'draft' : 'active';
    updateDiscountStatus((await context.params).id, status);
    writeAudit({
      actor: user,
      action: `discount.${body.action}`,
      entityType: 'discount',
      entityId: (await context.params).id,
      before: { status: discount.status },
      after: { status },
    });
    return jsonOk({ mensaje: 'Estado de la promoción actualizado.' });
  } catch (error) {
    return handleRouteError(error);
  }
}
