import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, requireSession } from '@/server/http/api';
import { buildStudentPortalData } from '@/server/domain/studentPortal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { user } = await requireSession(request);
    return NextResponse.json(
      { ok: true, ...buildStudentPortalData(user.id) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
