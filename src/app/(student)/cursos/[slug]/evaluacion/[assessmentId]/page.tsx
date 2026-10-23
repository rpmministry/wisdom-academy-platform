import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePageUser } from '@/server/auth/pageAuth';
import { getProgramRowBySlug } from '@/server/domain/coursePrograms';
import { getPublishedAssessmentForStudent } from '@/server/domain/courseAssessments';
import { AssessmentRunner } from '@/components/courses/AssessmentRunner';
import { prepare } from '@/server/db';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export const dynamic = 'force-dynamic';

export default async function AssessmentPage({
  params,
}: {
  params: Promise<{ slug: string; assessmentId: string }>;
}) {
  const user = await requirePageUser();
  const { slug, assessmentId } = await params;
  const program = getProgramRowBySlug(slug);
  if (!program) notFound();

  let info: ReturnType<typeof getPublishedAssessmentForStudent>;
  try {
    info = getPublishedAssessmentForStudent(assessmentId, user);
  } catch {
    notFound();
  }
  if (info.assessment.program_id !== program.id) notFound();

  const moduleRow = info.assessment.module_id
    ? (prepare('SELECT title FROM course_modules WHERE id = ?').get(info.assessment.module_id) as
        | { title: string }
        | undefined)
    : undefined;

  return (
    <main className="wa-portal-page">
      <nav className="wa-breadcrumbs" aria-label="Migas de pan">
        <Link href="/dashboard">Mi portal</Link>
        <WisdomIcon name="chevron-right" size={11} color="current" />
        <Link href="/cursos">Cursos y talleres</Link>
        <WisdomIcon name="chevron-right" size={11} color="current" />
        <Link href={`/cursos/${slug}`}>{program.title}</Link>
        <WisdomIcon name="chevron-right" size={11} color="current" />
        <strong>Evaluación</strong>
      </nav>
      <div className="wa-cw-assessment-layout">
        <AssessmentRunner
          slug={slug}
          programTitle={program.title}
          moduleTitle={moduleRow?.title || null}
          assessment={{
            id: info.assessment.id,
            title: info.assessment.title,
            kind: info.assessment.kind,
            instructions: info.assessment.instructions,
            attemptsAllowed: Number(info.assessment.attempts_allowed),
            attemptsUsed: info.attemptsUsed,
            inProgressAttemptId: info.inProgressAttemptId,
            timeLimitMinutes: info.assessment.time_limit_minutes,
            opensAt: info.assessment.opens_at,
            closesAt: info.assessment.closes_at,
            questionCount: info.questions.length,
          }}
          questions={info.questions}
        />
      </div>
    </main>
  );
}
