import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { createDiscountCodes } from '@/server/domain/discounts';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'discounts.manage' });
    const body = await readJsonBody<{ count?: number; customCode?: string }>(request);
    const count = Math.min(Math.max(Number(body.count) || 1, 1), 100);
    const codes = createDiscountCodes({
      actor: user,
      discountId: (await context.params).id,
      count,
      customCode: body.customCode,
    });
    writeAudit({
      actor: user,
      action: 'discount.codes.generated',
      entityType: 'discount',
      entityId: (await context.params).id,
      after: { count: codes.length },
    });
    return jsonOk({ codigos: codes });
  } catch (error) {
    return handleRouteError(error);
  }
}
