import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { getProgramRowBySlug, markLessonProgress } from '@/server/domain/coursePrograms';
import { prepare } from '@/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const { user } = requireSession(request, { mutation: true });
    const { slug } = await context.params;
    const program = getProgramRowBySlug(slug);
    if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
    const body = await readJsonBody<{ lessonId?: string; completed?: boolean; playbackSeconds?: number }>(
      request
    );
    if (!body.lessonId) throw new ApiError(400, 'VALIDATION_ERROR', 'Indica la clase.');
    const lesson = prepare('SELECT program_id FROM course_lessons WHERE id = ?').get(
      body.lessonId
    ) as { program_id: string } | undefined;
    if (!lesson || lesson.program_id !== program.id) {
      throw new ApiError(404, 'LESSON_NOT_FOUND', 'La clase no pertenece a este programa.');
    }
    const progress = markLessonProgress(user, body.lessonId, {
      completed: body.completed === true,
      playbackSeconds: body.playbackSeconds,
    });
    return NextResponse.json({ ok: true, progreso: progress });
  } catch (error) {
    return handleRouteError(error);
  }
}
