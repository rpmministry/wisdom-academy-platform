import { NextRequest } from 'next/server';
import {
  handleRouteError,
  jsonOk,
  requireSession,
} from '@/server/http/api';
import {
  generatePazWorkbookReplica,
  getPazSyncStatus,
  processPazSyncQueue,
} from '@/server/domain/pazGoogleSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'orders.read' });
    const format = request.nextUrl.searchParams.get('format');
    if (format === 'workbook') {
      const replica = generatePazWorkbookReplica();
      return jsonOk({ replica });
    }
    const status = getPazSyncStatus();
    return jsonOk({ syncStatus: status });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSession(request, { mutation: true, permission: 'orders.manage' });
    const result = await processPazSyncQueue(100);
    const status = getPazSyncStatus();
    return jsonOk({ result, syncStatus: status });
  } catch (error) {
    return handleRouteError(error);
  }
}
