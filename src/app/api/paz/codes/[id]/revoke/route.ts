import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { revokePazAccessCode } from '@/server/domain/pazAccessCodes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = requireSession(request, { mutation: true, permission: 'orders.manage' });
    const { id } = await params;
    const body = await readJsonBody(request);
    const reason = typeof body.reason === 'string' ? body.reason.trim() : 'Revocado por administrador';

    const result = revokePazAccessCode(session.user, id, reason);
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
