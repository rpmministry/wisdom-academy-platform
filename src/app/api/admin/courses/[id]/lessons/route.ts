import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { addLesson } from '@/server/domain/coursePrograms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { id } = await context.params;
    const body = await readJsonBody<{
      moduleId?: string;
      title?: string;
      description?: string;
      position?: number;
      videoIds?: unknown;
      pagesLabel?: string;
      durationLabel?: string;
    }>(request);
    const lesson = addLesson(
      id,
      body.moduleId || '',
      {
        title: body.title || '',
        description: body.description,
        position: body.position,
        videoIds: body.videoIds,
        pagesLabel: body.pagesLabel,
        durationLabel: body.durationLabel,
      },
      user
    );
    return NextResponse.json({ ok: true, clase: lesson });
  } catch (error) {
    return handleRouteError(error);
  }
}
