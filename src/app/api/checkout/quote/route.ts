import { NextRequest } from 'next/server';
import {
  ApiError,
  getClientIp,
  handleRouteError,
  jsonOk,
  readJsonBody,
} from '@/server/http/api';
import { quoteCheckout } from '@/server/domain/checkout';
import { checkRateLimit } from '@/server/http/rateLimit';
import { loadSessionFromRequest } from '@/server/auth/sessions';
import { normalizeBuyerEmail } from '@/server/domain/guestCheckout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = loadSessionFromRequest(request);
    const user = session?.user || null;
    const limit = checkRateLimit(
      'checkout-quote',
      user?.id || getClientIp(request),
      user ? 120 : 40,
      3600
    );
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
      buyerEmail?: unknown;
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
    const buyerEmail = normalizeBuyerEmail(body.buyerEmail || user?.email);
    const discountCode =
      typeof body.codigoDescuento === 'string' && body.codigoDescuento.trim()
        ? body.codigoDescuento.trim()
        : null;
    return jsonOk({
      cotizacion: quoteCheckout({ user, buyerEmail, productIds, discountCode }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
