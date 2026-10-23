import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { deleteLesson, updateLesson } from '@/server/domain/coursePrograms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { lessonId } = await context.params;
    const body = await readJsonBody<{
      title?: string;
      description?: string | null;
      position?: number;
      videoIds?: unknown;
      pagesLabel?: string | null;
      durationLabel?: string | null;
      moduleId?: string;
    }>(request);
    const lesson = updateLesson(lessonId, body, user);
    return NextResponse.json({ ok: true, clase: lesson });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; lessonId: string }> }
) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { lessonId } = await context.params;
    deleteLesson(lessonId, user);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
