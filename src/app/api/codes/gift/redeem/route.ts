import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireJsonString,
  requireSession,
} from '@/server/http/api';
import { redeemGiftCode } from '@/server/domain/gifts';
import { checkRateLimit } from '@/server/http/rateLimit';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { mutation: true });
    const limit = checkRateLimit('gift-redeem', user.id, 12, 600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiados intentos de canje. Espera unos minutos.',
        limit.retryAfterSeconds
      );
    }
    const body = await readJsonBody<{ codigo?: string }>(request);
    const code = requireJsonString(body.codigo, 'codigo', 100);
    const result = redeemGiftCode({
      code,
      userId: user.id,
      userEmail: user.email,
      emailVerified: user.emailVerified,
    });
    writeAudit({
      actor: user,
      action: result.alreadyRedeemed ? 'gift.redeem.idempotent' : 'gift.redeem',
      entityType: 'gift_code',
      entityId: result.giftCodeId,
      after: {
        redemptionId: result.redemptionId,
        resources: result.resources.map((resource) => resource.slug),
        accessEndsAt: result.accessEndsAt,
      },
    });
    return jsonOk({
      canje: result,
      mensaje: result.alreadyRedeemed
        ? 'Este código ya estaba canjeado en tu cuenta.'
        : 'Código canjeado correctamente.',
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
