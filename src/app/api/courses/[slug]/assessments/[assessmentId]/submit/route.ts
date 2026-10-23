import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { getProgramRowBySlug } from '@/server/domain/coursePrograms';
import { submitAttempt } from '@/server/domain/courseAssessments';
import { prepare } from '@/server/db';

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
    const assessment = prepare('SELECT program_id FROM assessments WHERE id = ?').get(assessmentId) as
      | { program_id: string }
      | undefined;
    if (!assessment || assessment.program_id !== program.id) {
      throw new ApiError(404, 'ASSESSMENT_NOT_FOUND', 'La evaluación no pertenece a este programa.');
    }
    const body = await readJsonBody<{
      attemptId?: string;
      idempotencyKey?: string;
      answers?: Array<{ questionId?: unknown; optionId?: unknown }>;
    }>(request, 512 * 1024);
    if (!body.attemptId) throw new ApiError(400, 'VALIDATION_ERROR', 'Indica el intento.');
    const result = submitAttempt(body.attemptId, user, {
      answers: body.answers,
      idempotencyKey: body.idempotencyKey,
    });
    return NextResponse.json({ ok: true, resultado: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
