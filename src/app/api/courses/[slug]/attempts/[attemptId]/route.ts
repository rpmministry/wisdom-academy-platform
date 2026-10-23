import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import { getProgramRowBySlug } from '@/server/domain/coursePrograms';
import { getAttemptResult } from '@/server/domain/courseAssessments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; attemptId: string }> }
) {
  try {
    const { user } = requireSession(request);
    const { slug, attemptId } = await context.params;
    const program = getProgramRowBySlug(slug);
    if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
    const result = getAttemptResult(attemptId, user);
    if (result.programSlug !== slug) {
      throw new ApiError(404, 'ATTEMPT_NOT_FOUND', 'El intento no pertenece a este programa.');
    }
    return NextResponse.json(
      {
        ok: true,
        resultado: {
          attemptId: result.attemptId,
          assessmentId: result.assessmentId,
          assessmentTitle: result.assessmentTitle,
          assessmentKind: result.assessmentKind,
          attemptNumber: result.attemptNumber,
          status: result.status,
          correctCount: result.correctCount,
          totalQuestions: result.totalQuestions,
          percentage: result.percentage,
          submittedAt: result.submittedAt,
          gradedAt: result.gradedAt,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
