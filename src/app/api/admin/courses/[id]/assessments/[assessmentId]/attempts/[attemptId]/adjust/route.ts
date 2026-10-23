import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { adjustAttemptGrade } from '@/server/domain/courseAssessments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; assessmentId: string; attemptId: string }> }
) {
  try {
    const { user } = requireSession(request, { permission: 'grades.manage', mutation: true });
    const { attemptId } = await context.params;
    const body = await readJsonBody<{ correctCount?: number; reason?: string }>(request);
    const result = adjustAttemptGrade(
      attemptId,
      {
        correctCount: Number(body.correctCount),
        reason: body.reason || '',
      },
      user
    );
    return NextResponse.json({ ok: true, resultado: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
