import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import {
  assertProgramAccess,
  canManageCourses,
  getModuleCompletion,
  getProgramRowBySlug,
} from '@/server/domain/coursePrograms';
import { escapeHtml, renderPrintableHtml } from '@/lib/courses/markdown';
import { prepare } from '@/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; moduleId: string }> }
) {
  try {
    const { user } = requireSession(request);
    const { slug, moduleId } = await context.params;
    const program = getProgramRowBySlug(slug);
    if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
    assertProgramAccess(user, program);

    const moduleRow = prepare(
      'SELECT id, title FROM course_modules WHERE id = ? AND program_id = ?'
    ).get(moduleId, program.id) as { id: string; title: string } | undefined;
    if (!moduleRow) throw new ApiError(404, 'MODULE_NOT_FOUND', 'El semestre no existe.');

    const completion = getModuleCompletion(program.id, moduleId, user.id);
    if (!completion.completed && !canManageCourses(user)) {
      throw new ApiError(
        409,
        'SEMESTER_NOT_COMPLETED',
        'El certificado se emite cuando el semestre está completado y aprobado.'
      );
    }

    const userRow = prepare('SELECT display_name, email FROM users WHERE id = ?').get(user.id) as
      | { display_name: string | null; email: string }
      | undefined;
    const studentName = userRow?.display_name || userRow?.email || 'Estudiante';
    const dateLabel = new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'long',
      timeZone: 'America/Guayaquil',
    }).format(new Date());

    const body = `
      <div style="text-align:center; padding: 0.5rem 0 1.5rem;">
        <img src="/brand/n2n/n2ncu-logo-2021.svg" alt="Universidad Cristiana N2N" style="width: 230px; max-width: 70%; height: auto; margin-bottom: 1rem;" />
        <p style="letter-spacing: 0.18em; text-transform: uppercase; font-size: 0.72rem; color: #6B7280; margin: 0;">Educación para el ministerio</p>
        <h1 style="font-size: clamp(1.8rem, 5vw, 2.8rem); margin: 0.6rem 0 0.2rem;">Certificado Ministerial de Estudios</h1>
        <p style="color: #475569; margin-top: 0;">Wisdom Academy · Programa de Teología | Universidad Cristiana N2N</p>
      </div>
      <div style="border: 2px solid #700000; border-radius: 18px; padding: clamp(1.5rem, 4vw, 2.5rem); text-align:center;">
        <p style="font-size: 0.85rem; color: #6B7280; margin: 0;">Se certifica que</p>
        <p style="font-family: var(--wa-font-display); font-size: clamp(1.5rem, 4vw, 2.2rem); font-weight: 800; margin: 0.4rem 0;">${escapeHtml(studentName)}</p>
        <p style="font-size: 0.95rem; line-height: 1.7; color: #0F172A; max-width: 62ch; margin: 0.5rem auto;">
          completó y aprobó las clases y evaluaciones correspondientes al
          <strong>${escapeHtml(moduleRow.title)}</strong> del Programa de Teología de la Universidad Cristiana N2N,
          con un avance registrado de ${completion.completedLessons} de ${completion.totalLessons} clases
          y ${completion.assessmentsPassed} de ${completion.requiredAssessments} evaluaciones aprobadas.
        </p>
        <p style="font-size: 0.85rem; color: #475569;">Emitido el ${dateLabel}</p>
      </div>
      <div class="note" style="text-align:left;">
        <strong>Naturaleza del certificado.</strong> Este documento acredita formación para el ministerio.
        No es un título académico, no constituye un grado académico y no cuenta con aval académico.
        Es un certificado ministerial emitido por Wisdom Academy con base en el currículo N2N.
      </div>
    `;

    const html = renderPrintableHtml({
      title: 'Certificado Ministerial de Estudios',
      subtitle: `${program.title} · ${moduleRow.title}`,
      bodyHtml: body,
      footerNote:
        'Certificado de formación ministerial. No es un título académico ni tiene aval académico. La emisión está sujeta a la verificación interna de Wisdom Academy.',
      downloadName: `certificado-${moduleRow.title.replace(/\s+/g, '-').toLowerCase()}.html`,
      backHref: `/cursos/${slug}`,
    });

    const download = request.nextUrl.searchParams.get('download') === '1';
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="certificado-ministerial.html"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
