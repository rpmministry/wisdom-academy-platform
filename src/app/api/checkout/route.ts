import { NextRequest } from 'next/server';
import {
  ApiError,
  assertSameOrigin,
  getClientIp,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { appUrl } from '@/server/config';
import { createCheckout } from '@/server/domain/checkout';
import { normalizeBuyerEmail } from '@/server/domain/guestCheckout';
import { registrationUrlForOrder } from '@/server/domain/checkoutRegistration';
import { checkRateLimit } from '@/server/http/rateLimit';
import { loadSessionFromRequest } from '@/server/auth/sessions';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = loadSessionFromRequest(request);
    const user = session ? requireSession(request, { mutation: true }).user : null;
    if (!user) {
      // Sin cookie de sesión no hay CSRF que validar, pero sí se exige el
      // mismo origen para dificultar la creación de órdenes desde terceros.
      assertSameOrigin(request, { requireOriginInProduction: true });
    }
    const rateKey = user?.id || `guest:${getClientIp(request)}`;
    const limit = checkRateLimit('checkout', rateKey, user ? 30 : 20, 3600);
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
      buyerEmail?: unknown;
      buyerName?: unknown;
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
    const buyerEmail = user
      ? user.email
      : normalizeBuyerEmail(body.buyerEmail);
    if (user && body.buyerEmail) {
      const requested = normalizeBuyerEmail(body.buyerEmail);
      if (requested !== buyerEmail.toLowerCase()) {
        throw new ApiError(
          400,
          'EMAIL_SESSION_MISMATCH',
          'El correo de la compra debe coincidir con la cuenta que inició sesión.'
        );
      }
    }
    const buyerName =
      typeof body.buyerName === 'string' && body.buyerName.trim()
        ? body.buyerName.trim().slice(0, 160)
        : null;
    const discountCode =
      typeof body.codigoDescuento === 'string' && body.codigoDescuento.trim()
        ? body.codigoDescuento.trim()
        : null;
    const idempotencyKey = request.headers.get('idempotency-key');

    const result = await createCheckout({
      user,
      buyerEmail,
      buyerName,
      productIds,
      discountCode,
      idempotencyKey,
      appUrl: appUrl(request),
    });
    let registrationUrl: string | null = null;
    if (result.registrationRequired && (result.status === 'free' || result.status === 'paid')) {
      registrationUrl = registrationUrlForOrder(result.orderId);
    }
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
        guest: !user,
      },
      meta: undefined,
    });
    return jsonOk({ checkout: { ...result, registrationUrl } });
  } catch (error) {
    return handleRouteError(error);
  }
}
