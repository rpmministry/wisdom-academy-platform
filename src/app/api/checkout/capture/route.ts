import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { captureCheckout } from '@/server/domain/checkout';
import { checkRateLimit } from '@/server/http/rateLimit';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { mutation: true });
    const limit = checkRateLimit('checkout-capture', user.id, 30, 3600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiados intentos de confirmación. Espera un momento.',
        limit.retryAfterSeconds
      );
    }
    const body = await readJsonBody<{
      orderId?: string;
      paypalOrderId?: string;
    }>(request);
    const orderId =
      typeof body.orderId === 'string' && body.orderId ? body.orderId.slice(0, 120) : null;
    const paypalOrderId =
      typeof body.paypalOrderId === 'string' && body.paypalOrderId
        ? body.paypalOrderId.slice(0, 120)
        : null;
    if (!orderId && !paypalOrderId) {
      throw new ApiError(
        400,
        'ORDER_REQUIRED',
        'Falta la referencia de la orden.'
      );
    }
    const result = await captureCheckout({ user, orderId, paypalOrderId });
    if (!result.alreadyPaid) {
      writeAudit({
        actor: user,
        action: 'checkout.captured',
        entityType: 'order',
        entityId: result.orderId,
        after: { status: result.status },
      });
    }
    return jsonOk({ orden: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
