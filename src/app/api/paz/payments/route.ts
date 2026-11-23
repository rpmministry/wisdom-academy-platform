import { NextRequest } from 'next/server';
import {
  ApiError,
  getClientIp,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import type { AuthUser } from '@/server/auth/authorization';
import { checkRateLimit } from '@/server/http/rateLimit';
import {
  createPazPaymentIntent,
  listPazPaymentIntents,
  type PazPaymentMethod,
  type PazPlan,
} from '@/server/domain/paz';
import { pazBankDetails, pazPayphoneUrl } from '@/lib/paz-en-la-mesa/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'orders.read' });
    const statusParam = request.nextUrl.searchParams.get('status');
    const status =
      statusParam === 'pending' ||
      statusParam === 'approved' ||
      statusParam === 'rejected' ||
      statusParam === 'cancelled'
        ? statusParam
        : undefined;
    return jsonOk({ pagos: listPazPaymentIntents(status) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    let user: AuthUser | null = null;
    try {
      const session = requireSession(request, { mutation: true });
      user = session.user;
    } catch {
      // Permitimos checkout e inscripción como visitante sin cuenta previa
    }
    const rateKey = user ? user.id : getClientIp(request);
    const limit = checkRateLimit('paz-payments', rateKey, 30, 3600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Demasiadas solicitudes de pago. Espera unos minutos.',
        limit.retryAfterSeconds
      );
    }
    const body = await readJsonBody<{
      plan?: unknown;
      method?: unknown;
      buyerName?: unknown;
      buyerEmail?: unknown;
      buyerPhone?: unknown;
      city?: unknown;
      transferReference?: unknown;
      transferDate?: unknown;
      note?: unknown;
      consent?: unknown;
    }>(request, 24 * 1024);
    const plan = body.plan as PazPlan;
    const method = body.method as PazPaymentMethod;
    if (!['presale', 'official', 'scholarship'].includes(plan)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Selecciona un plan válido.');
    }
    if (!['bank_transfer', 'payphone'].includes(method)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Selecciona un método de pago válido.');
    }
    const result = createPazPaymentIntent(
      user,
      {
        plan,
        method,
        buyerName: typeof body.buyerName === 'string' ? body.buyerName : null,
        buyerEmail: typeof body.buyerEmail === 'string' ? body.buyerEmail : null,
        buyerPhone: typeof body.buyerPhone === 'string' ? body.buyerPhone : null,
        city: typeof body.city === 'string' ? body.city : null,
        transferReference:
          typeof body.transferReference === 'string' ? body.transferReference : null,
        transferDate: typeof body.transferDate === 'string' ? body.transferDate : null,
        note: typeof body.note === 'string' ? body.note : null,
        consent: body.consent !== false,
      },
      { paymentUrl: pazPayphoneUrl() }
    );
    return jsonOk(
      {
        pago: result.intent,
        creado: result.created,
        instrucciones:
          result.intent.method === 'bank_transfer'
            ? { banco: pazBankDetails() }
            : {
                payphoneUrl: pazPayphoneUrl() || null,
                payphoneToken:
                  (process.env.PAYPHONE_TOKEN ||
                    process.env.NEXT_PUBLIC_PAYPHONE_TOKEN ||
                    '').trim() || null,
                payphoneStoreId:
                  (process.env.PAYPHONE_STORE_ID ||
                    process.env.NEXT_PUBLIC_PAYPHONE_STORE_ID ||
                    '').trim() || null,
                mensaje:
                  'Si el enlace aún no está configurado, el equipo te enviará el enlace oficial de PayPhone con tu código de inscripción.',
              },
      },
      { status: result.created ? 201 : 200 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
