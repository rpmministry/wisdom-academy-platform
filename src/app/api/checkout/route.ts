import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { appUrl } from '@/server/config';
import { createCheckout } from '@/server/domain/checkout';
import { checkRateLimit } from '@/server/http/rateLimit';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { mutation: true });
    const limit = checkRateLimit('checkout', user.id, 30, 3600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiados intentos de compra. Espera un momento.',
        limit.retryAfterSeconds
      );
    }

    const body = await readJsonBody<{
      productIds?: unknown;
      codigoDescuento?: unknown;
    }>(request);
    if (!Array.isArray(body.productIds) || body.productIds.length === 0) {
      throw new ApiError(400, 'PRODUCTS_REQUIRED', 'Selecciona al menos un producto.');
    }
    const productIds = body.productIds.filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    );
    if (productIds.length !== body.productIds.length) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Los identificadores de producto no son válidos.');
    }
    const discountCode =
      typeof body.codigoDescuento === 'string' && body.codigoDescuento.trim()
        ? body.codigoDescuento.trim()
        : null;
    const idempotencyKey = request.headers.get('idempotency-key');

    const result = await createCheckout({
      user,
      productIds,
      discountCode,
      idempotencyKey,
      appUrl: appUrl(request),
    });
    writeAudit({
      actor: user,
      action: 'checkout.created',
      entityType: 'order',
      entityId: result.orderId,
      after: {
        status: result.status,
        totalCents: result.totalCents,
        productIds,
        discountApplied: Boolean(discountCode),
      },
    });
    return jsonOk({ checkout: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
