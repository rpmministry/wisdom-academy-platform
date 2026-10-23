import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePageUser } from '@/server/auth/pageAuth';
import {
  assertProgramAccess,
  getProgramRowBySlug,
  getPublishedReview,
  userCanViewProgram,
} from '@/server/domain/coursePrograms';
import { renderSafeMarkdown } from '@/lib/courses/markdown';
import { prepare } from '@/server/db';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export const dynamic = 'force-dynamic';

function parseRefs(value: string): Array<{ source: string; page: string; detail: string }> {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        source: String(item.source ?? item.archivo ?? item.file ?? '—'),
        page: String(item.page ?? item.pagina ?? item.lesson ?? item.clase ?? '—'),
        detail: String(item.detail ?? item.detalle ?? item.note ?? ''),
      }));
  } catch {
    return [];
  }
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string; reviewId: string }>;
}) {
  const user = await requirePageUser();
  const { slug, reviewId } = await params;
  const program = getProgramRowBySlug(slug);
  if (!program) notFound();
  if (!userCanViewProgram(user, program)) notFound();
  try {
    assertProgramAccess(user, program);
  } catch {
    notFound();
  }
  const review = getPublishedReview(reviewId);
  if (!review || review.program_id !== program.id) notFound();
  const moduleRow = review.module_id
    ? (prepare('SELECT title FROM course_modules WHERE id = ?').get(review.module_id) as
        | { title: string }
        | undefined)
    : undefined;
  const refs = parseRefs(review.source_refs_json);
  const contentHtml = renderSafeMarkdown(review.content_md);

  return (
    <main className="wa-portal-page" style={{ maxWidth: 980 }}>
      <PageHeader
        breadcrumbs={[
          { label: 'Mi portal', href: '/dashboard' },
          { label: 'Cursos y talleres', href: '/cursos' },
          { label: program.title, href: `/cursos/${slug}` },
          { label: 'Repaso' },
        ]}
        eyebrow={`${review.week_label}${moduleRow?.title ? ` · ${moduleRow.title}` : ''}`}
        title={review.title}
        actions={
          <>
            <a href={`/api/courses/${slug}/reviews/${review.id}?download=1`} style={{ textDecoration: 'none' }}>
              <Button variant="primary-gold" size="sm" icono={<WisdomIcon name="download" size={14} />}>
                Descargar repaso
              </Button>
            </a>
            <a
              href={`/api/courses/${slug}/reviews/${review.id}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <Button variant="secondary" size="sm">Abrir versión imprimible</Button>
            </a>
          </>
        }
      />

      {review.is_ai_generated ? (
        <div className="wa-cw-notice warning" style={{ marginBottom: '1rem' }}>
          Este repaso es material de apoyo elaborado con asistencia de IA a partir de las fuentes
          indicadas. No es texto oficial de la institución ni sustituye los documentos originales.
        </div>
      ) : null}

      <article
        className="wa-cw-card"
        style={{ lineHeight: 1.75 }}
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />

      {refs.length > 0 && (
        <section className="wa-cw-card" style={{ marginTop: '1rem' }}>
          <h2 style={{ fontSize: '1rem', marginTop: 0 }}>Trazabilidad de fuentes</h2>
          <div className="wa-table-scroll">
            <table className="wa-cw-table">
              <thead>
                <tr>
                  <th>Fuente</th>
                  <th>Página / clase</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {refs.map((ref, index) => (
                  <tr key={index}>
                    <td>{ref.source}</td>
                    <td>{ref.page}</td>
                    <td>{ref.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
