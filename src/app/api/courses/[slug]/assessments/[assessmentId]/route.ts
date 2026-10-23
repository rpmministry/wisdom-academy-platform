import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import { getProgramRowBySlug } from '@/server/domain/coursePrograms';
import { getPublishedAssessmentForStudent } from '@/server/domain/courseAssessments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; assessmentId: string }> }
) {
  try {
    const { user } = requireSession(request);
    const { slug, assessmentId } = await context.params;
    const program = getProgramRowBySlug(slug);
    if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
    const info = getPublishedAssessmentForStudent(assessmentId, user);
    if (info.assessment.program_id !== program.id) {
      throw new ApiError(404, 'ASSESSMENT_NOT_FOUND', 'La evaluación no pertenece a este programa.');
    }
    return NextResponse.json(
      {
        ok: true,
        evaluacion: {
          id: info.assessment.id,
          title: info.assessment.title,
          kind: info.assessment.kind,
          instructions: info.assessment.instructions,
          attemptsAllowed: info.assessment.attempts_allowed,
          attemptsUsed: info.attemptsUsed,
          inProgressAttemptId: info.inProgressAttemptId,
          timeLimitMinutes: info.assessment.time_limit_minutes,
          opensAt: info.assessment.opens_at,
          closesAt: info.assessment.closes_at,
          questionCount: info.questions.length,
          questions: info.questions.map((question) => ({
            id: question.id,
            type: question.type,
            prompt: question.prompt,
            options: question.options,
            position: question.position,
          })),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
