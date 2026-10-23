import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { updateWeeklyReview } from '@/server/domain/coursePrograms';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; reviewId: string }> }
) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { reviewId } = await context.params;
    const body = await readJsonBody<{
      title?: string;
      contentMd?: string;
      status?: 'draft' | 'published' | 'archived';
      sourceRefs?: unknown;
    }>(request);
    const review = updateWeeklyReview(reviewId, body, user);
    return NextResponse.json({ ok: true, repaso: review });
  } catch (error) {
    return handleRouteError(error);
  }
}
