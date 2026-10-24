import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { quoteCheckout } from '@/server/domain/checkout';
import { checkRateLimit } from '@/server/http/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request);
    const limit = checkRateLimit('checkout-quote', user.id, 120, 3600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiadas cotizaciones. Espera un momento e inténtalo de nuevo.',
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
    return jsonOk({
      cotizacion: quoteCheckout({ user, productIds, discountCode }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
