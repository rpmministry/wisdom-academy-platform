import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { reviewPazPaymentIntent } from '@/server/domain/paz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ intentId: string }> }
) {
  try {
    const { user } = requireSession(request, {
      permission: 'orders.manage',
      mutation: true,
    });
    const { intentId } = await context.params;
    const body = await readJsonBody<{ action?: unknown; note?: unknown }>(request, 8 * 1024);
    const action = body.action === 'approve' || body.action === 'reject' ? body.action : null;
    if (!action) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Indica si el pago se aprueba o se rechaza.');
    }
    const pago = reviewPazPaymentIntent(
      user,
      intentId,
      action,
      typeof body.note === 'string' ? body.note : null
    );
    return jsonOk({ pago });
  } catch (error) {
    return handleRouteError(error);
  }
}
