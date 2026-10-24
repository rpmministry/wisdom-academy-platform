import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, requireSession } from '@/server/http/api';
import { buildFinanceReport } from '@/server/domain/finance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // El permiso financiero se verifica en el servidor; ocultar la pestaña en
    // el navegador no sustituye esta autorización.
    requireSession(request, { permission: 'orders.read' });
    const params = request.nextUrl.searchParams;
    const report = buildFinanceReport({
      from: params.get('from'),
      to: params.get('to'),
      status: params.get('status'),
      productId: params.get('productId'),
      q: params.get('q'),
      limit: params.get('limit') ? Number(params.get('limit')) : null,
    });
    return NextResponse.json(
      { ok: true, reporte: report },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
