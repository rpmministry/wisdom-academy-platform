import { NextRequest } from 'next/server';
import {
  handleRouteError,
  jsonOk,
  requireSession,
} from '@/server/http/api';
import { ensurePazTestAccounts } from '@/server/domain/pazSeedAccounts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    requireSession(request, { mutation: true, permission: 'orders.manage' });
    const accounts = ensurePazTestAccounts();
    return jsonOk({ accounts });
  } catch (error) {
    return handleRouteError(error);
  }
}
