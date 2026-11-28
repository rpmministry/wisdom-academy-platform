import { NextRequest } from 'next/server';
import {
  handleRouteError,
  jsonOk,
  requireSession,
} from '@/server/http/api';
import { regeneratePazAccessCode } from '@/server/domain/pazAccessCodes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireSession(request, { mutation: true, permission: 'orders.manage' });
    const { id } = await context.params;
    const result = regeneratePazAccessCode(session.user, id);
    return jsonOk({ result });
  } catch (error) {
    return handleRouteError(error);
  }
}
