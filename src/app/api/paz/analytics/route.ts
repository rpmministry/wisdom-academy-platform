import { NextRequest } from 'next/server';
import {
  handleRouteError,
  jsonOk,
  requireSession,
} from '@/server/http/api';
import { getPazGeneralKpis } from '@/server/domain/pazAnalytics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'orders.read' });
    const includeTest = request.nextUrl.searchParams.get('includeTest') === '1';
    const kpis = getPazGeneralKpis({ includeTest });
    return jsonOk({ kpis });
  } catch (error) {
    return handleRouteError(error);
  }
}
