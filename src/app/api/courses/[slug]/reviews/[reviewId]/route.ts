import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import {
  assertProgramAccess,
  getProgramRowById,
  getProgramRowBySlug,
  getPublishedReview,
} from '@/server/domain/coursePrograms';
import { renderReviewHtml } from '@/lib/courses/reports';
import { prepare } from '@/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; reviewId: string }> }
) {
  try {
    const { user } = requireSession(request);
    const { slug, reviewId } = await context.params;
    const program = getProgramRowBySlug(slug);
    if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
    assertProgramAccess(user, program);
    const review = getPublishedReview(reviewId);
    if (!review || review.program_id !== program.id) {
      throw new ApiError(404, 'REVIEW_NOT_FOUND', 'El repaso no está disponible.');
    }
    const moduleRow = review.module_id
      ? (prepare('SELECT title FROM course_modules WHERE id = ?').get(review.module_id) as
          | { title: string }
          | undefined)
      : undefined;

    const html = renderReviewHtml({
      review: {
        id: review.id,
        title: review.title,
        weekLabel: review.week_label,
        contentMd: review.content_md,
        sourceRefsJson: review.source_refs_json,
        isAiGenerated: Boolean(review.is_ai_generated),
        publishedAt: review.published_at,
      },
      program: {
        title: program.title,
        institution: program.institution,
        level: program.level,
      },
      moduleTitle: moduleRow?.title || null,
      downloadName: `repaso-${review.week_label.replace(/\s+/g, '-')}.html`,
      backHref: `/cursos/${slug}/repaso/${review.id}`,
    });

    const download = request.nextUrl.searchParams.get('download') === '1';
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="repaso-semanal.html"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
