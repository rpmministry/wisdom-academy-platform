import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { createWeeklyReview } from '@/server/domain/coursePrograms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { id } = await context.params;
    const body = await readJsonBody<{
      title?: string;
      weekLabel?: string;
      contentMd?: string;
      moduleId?: string;
      sourceRefs?: Array<Record<string, unknown>>;
      isAiGenerated?: boolean;
      status?: 'draft' | 'published';
      position?: number;
    }>(request);
    const review = createWeeklyReview(
      id,
      {
        title: body.title || '',
        weekLabel: body.weekLabel || '',
        contentMd: body.contentMd || '',
        moduleId: body.moduleId,
        sourceRefs: body.sourceRefs,
        isAiGenerated: body.isAiGenerated,
        status: body.status,
        position: body.position,
      },
      user
    );
    return NextResponse.json({ ok: true, repaso: review });
  } catch (error) {
    return handleRouteError(error);
  }
}
