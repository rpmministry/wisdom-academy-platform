import { NextRequest } from 'next/server';
import {
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireJsonString,
  requireSession,
} from '@/server/http/api';
import { cancelCheckout } from '@/server/domain/checkout';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { mutation: true });
    const body = await readJsonBody<{ orderId?: string }>(request);
    const orderId = requireJsonString(body.orderId, 'orderId', 120);
    const result = cancelCheckout(orderId, user.id);
    writeAudit({
      actor: user,
      action: 'checkout.cancelled',
      entityType: 'order',
      entityId: orderId,
    });
    return jsonOk({ estado: result.status });
  } catch (error) {
    return handleRouteError(error);
  }
}
