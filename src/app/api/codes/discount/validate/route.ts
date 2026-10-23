import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireJsonString,
  requireSession,
} from '@/server/http/api';
import { loadPublishedProducts } from '@/server/domain/checkout';
import { validateDiscountForUser } from '@/server/domain/discounts';
import { checkRateLimit } from '@/server/http/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request);
    const limit = checkRateLimit('discount-validate', user.id, 30, 600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiados intentos de validación. Espera unos minutos.',
        limit.retryAfterSeconds
      );
    }
    const body = await readJsonBody<{ codigo?: string; productIds?: unknown }>(request);
    const code = requireJsonString(body.codigo, 'codigo', 100);
    if (!Array.isArray(body.productIds) || body.productIds.length === 0) {
      throw new ApiError(400, 'PRODUCTS_REQUIRED', 'Selecciona productos para validar el código.');
    }
    const productIds = body.productIds.filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    );
    const { products } = loadPublishedProducts(productIds);
    const validation = validateDiscountForUser({ code, userId: user.id, products });
    return jsonOk({
      descuento: {
        nombre: validation.discountName,
        tipo: validation.kind,
        montoCentavos: validation.discountCents,
        subtotalElegibleCentavos: validation.eligibleSubtotalCents,
        productosElegibles: validation.eligibleProductIds,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
