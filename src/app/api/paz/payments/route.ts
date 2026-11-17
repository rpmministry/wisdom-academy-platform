import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
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
    const { user } = requireSession(request, { mutation: true });
    const limit = checkRateLimit('paz-payments', user.id, 20, 3600);
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
      buyerPhone?: unknown;
      transferReference?: unknown;
      transferDate?: unknown;
      note?: unknown;
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
        buyerPhone: typeof body.buyerPhone === 'string' ? body.buyerPhone : null,
        transferReference:
          typeof body.transferReference === 'string' ? body.transferReference : null,
        transferDate: typeof body.transferDate === 'string' ? body.transferDate : null,
        note: typeof body.note === 'string' ? body.note : null,
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
