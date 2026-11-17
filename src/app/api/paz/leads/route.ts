import { NextRequest } from 'next/server';
import {
  ApiError,
  assertSameOrigin,
  getClientIp,
  handleRouteError,
  jsonOk,
  readJsonBody,
} from '@/server/http/api';
import { checkRateLimit } from '@/server/http/rateLimit';
import { createPazLead } from '@/server/domain/paz';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request, { requireOriginInProduction: true });
    const limit = checkRateLimit('paz-leads', getClientIp(request), 12, 3600);
    if (!limit.allowed) {
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Recibimos varios registros desde tu conexión. Intenta de nuevo más tarde.',
        limit.retryAfterSeconds
      );
    }
    const body = await readJsonBody<{
      fullName?: unknown;
      email?: unknown;
      phone?: unknown;
      city?: unknown;
      church?: unknown;
      householdSize?: unknown;
      whatsappOptIn?: unknown;
      consent?: unknown;
      source?: unknown;
      campaign?: unknown;
    }>(request, 24 * 1024);
    const lead = createPazLead({
      fullName: typeof body.fullName === 'string' ? body.fullName : '',
      email: typeof body.email === 'string' ? body.email : null,
      phone: typeof body.phone === 'string' ? body.phone : null,
      city: typeof body.city === 'string' ? body.city : null,
      church: typeof body.church === 'string' ? body.church : null,
      householdSize:
        typeof body.householdSize === 'number'
          ? Math.trunc(body.householdSize)
          : typeof body.householdSize === 'string'
            ? Math.trunc(Number(body.householdSize))
            : null,
      whatsappOptIn: body.whatsappOptIn !== false,
      consent: body.consent !== false,
      source: typeof body.source === 'string' ? body.source : null,
      campaign: typeof body.campaign === 'string' ? body.campaign : null,
    });
    return jsonOk({ lead }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
