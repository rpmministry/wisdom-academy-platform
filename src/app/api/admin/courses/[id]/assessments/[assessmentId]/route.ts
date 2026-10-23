import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import {
  getAssessmentAdmin,
  updateAssessment,
  type AssessmentStatus,
  type QuestionInput,
} from '@/server/domain/courseAssessments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; assessmentId: string }> }
) {
  try {
    requireSession(request, { permission: 'resources.manage' });
    const { assessmentId } = await context.params;
    const data = getAssessmentAdmin(assessmentId);
    if (!data) throw new ApiError(404, 'ASSESSMENT_NOT_FOUND', 'La evaluación no existe.');
    return NextResponse.json(
      { ok: true, ...data },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; assessmentId: string }> }
) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { assessmentId } = await context.params;
    const body = await readJsonBody<{
      title?: string;
      kind?: 'midterm' | 'final' | 'practice';
      instructions?: string | null;
      status?: AssessmentStatus;
      attemptsAllowed?: number;
      timeLimitMinutes?: number | null;
      passPercentage?: number | null;
      opensAt?: string | null;
      closesAt?: string | null;
      sourceRefs?: unknown;
      questions?: QuestionInput[];
    }>(request, 2 * 1024 * 1024);
    const assessment = updateAssessment(assessmentId, body, user);
    return NextResponse.json({ ok: true, evaluacion: assessment });
  } catch (error) {
    return handleRouteError(error);
  }
}
