import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import { renderImportReportCsv } from '@/server/domain/courseImport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    requireSession(request, { permission: 'resources.manage' });
    const { runId } = await context.params;
    const csv = renderImportReportCsv(runId);
    if (!csv) throw new ApiError(404, 'RUN_NOT_FOUND', 'El informe de importación no existe.');
    const download = request.nextUrl.searchParams.get('download') === '1';
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="importacion-${runId}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
