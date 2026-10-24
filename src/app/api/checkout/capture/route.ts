import { NextRequest } from 'next/server';
import {
  ApiError,
  getClientIp,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { captureCheckout } from '@/server/domain/checkout';
import {
  registrationUrlForOrder,
  sendRegistrationInvite,
} from '@/server/domain/checkoutRegistration';
import { checkRateLimit } from '@/server/http/rateLimit';
import { loadSessionFromRequest } from '@/server/auth/sessions';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = loadSessionFromRequest(request);
    const user = session ? requireSession(request, { mutation: true }).user : null;
    const rateKey = user?.id || `guest:${getClientIp(request)}`;
    const limit = checkRateLimit('checkout-capture', rateKey, user ? 30 : 20, 3600);
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
      throw new ApiError(400, 'ORDER_REQUIRED', 'Falta la referencia de la orden.');
    }
    const result = await captureCheckout({ user, orderId, paypalOrderId });
    let registrationUrl: string | null = null;
    if (result.status === 'paid') {
      try {
        registrationUrl = registrationUrlForOrder(result.orderId);
        // Se envía una sola vez; si el comprador cierra el navegador antes de
        // registrarse, el correo conserva el enlace de continuación.
        void sendRegistrationInvite(result.orderId).catch(() => undefined);
      } catch {
        registrationUrl = null;
      }
    }
    if (!result.alreadyPaid) {
      writeAudit({
        actor: user,
        action: 'checkout.captured',
        entityType: 'order',
        entityId: result.orderId,
        after: { status: result.status, guest: !user },
      });
    }
    return jsonOk({ orden: { ...result, registrationUrl } });
  } catch (error) {
    return handleRouteError(error);
  }
}
