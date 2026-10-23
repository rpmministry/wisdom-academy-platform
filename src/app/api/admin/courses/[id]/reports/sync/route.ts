import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, requireSession } from '@/server/http/api';
import { syncGradeReports } from '@/server/domain/gradeReportDrive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { permission: 'grades.manage', mutation: true });
    const { id } = await context.params;
    const result = await syncGradeReports(id, user);
    return NextResponse.json({ ok: true, resultado: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
