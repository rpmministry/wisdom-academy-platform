import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import { getProgramRowBySlug } from '@/server/domain/coursePrograms';
import { getPublishedAssessmentForStudent, startAttempt } from '@/server/domain/courseAssessments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string; assessmentId: string }> }
) {
  try {
    const { user } = requireSession(request, { mutation: true });
    const { slug, assessmentId } = await context.params;
    const program = getProgramRowBySlug(slug);
    if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
    const info = getPublishedAssessmentForStudent(assessmentId, user);
    if (info.assessment.program_id !== program.id) {
      throw new ApiError(404, 'ASSESSMENT_NOT_FOUND', 'La evaluación no pertenece a este programa.');
    }
    const attempt = startAttempt(assessmentId, user);
    return NextResponse.json({ ok: true, intento: attempt });
  } catch (error) {
    return handleRouteError(error);
  }
}
