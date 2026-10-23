import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import { getProgramRowBySlug, getProgramRowById } from '@/server/domain/coursePrograms';
import { getAttemptResult } from '@/server/domain/courseAssessments';
import { renderGradeReportHtml } from '@/lib/courses/reports';
import { prepare } from '@/server/db';

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
    const row = prepare(`
      SELECT asm.module_id, m.title AS module_title, u.display_name, u.email
      FROM assessment_attempts a
      JOIN assessments asm ON asm.id = a.assessment_id
      LEFT JOIN course_modules m ON m.id = asm.module_id
      JOIN users u ON u.id = a.user_id
      WHERE a.id = ?
    `).get(attemptId) as
      | { module_id: string | null; module_title: string | null; display_name: string | null; email: string }
      | undefined;

    const html = renderGradeReportHtml({
      programTitle: result.programTitle,
      institution: program.institution,
      assessmentTitle: result.assessmentTitle,
      assessmentKind: result.assessmentKind,
      semesterLabel: row?.module_title || null,
      studentName: row?.display_name || row?.email || 'Estudiante',
      attemptNumber: result.attemptNumber,
      assessmentVersion: result.assessmentVersion,
      percentage: result.percentage,
      correctCount: result.correctCount,
      totalQuestions: result.totalQuestions,
      submittedAt: result.submittedAt,
      recordedAt: result.gradedAt || result.submittedAt || new Date().toISOString(),
      passPercentage: result.passPercentage,
      backHref: `/cursos/${slug}`,
      downloadName: `informe-${result.assessmentKind}-${result.attemptNumber}.html`,
    });

    const download = request.nextUrl.searchParams.get('download') === '1';
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="informe-calificacion.html"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
