import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, requireSession } from '@/server/http/api';
import { publishAssessment } from '@/server/domain/courseAssessments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; assessmentId: string }> }
) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { assessmentId } = await context.params;
    const assessment = publishAssessment(assessmentId, user);
    return NextResponse.json({ ok: true, evaluacion: assessment });
  } catch (error) {
    return handleRouteError(error);
  }
}
