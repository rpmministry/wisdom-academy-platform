import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { requirePageUser } from '@/server/auth/pageAuth';
import {
  canManageCourses,
  getProgramRowBySlug,
  userCanViewProgram,
} from '@/server/domain/coursePrograms';
import { getPazChallengeProgress } from '@/server/domain/paz';
import { PAZ_BRAND } from '@/lib/paz-en-la-mesa/content';
import { pazPublicConfig } from '@/lib/paz-en-la-mesa/config';
import { PazCountdown } from '@/components/paz/PazCountdown';
import { PazChallengeTracker } from '@/components/paz/PazChallengeTracker';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export const metadata: Metadata = {
  title: 'Reto de 7 días · Paz en la mesa | Wisdom Academy',
  description: 'Checklist interactivo del Reto de 7 días de Altar Familiar.',
};

export const dynamic = 'force-dynamic';

export default async function PazChallengePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await requirePageUser();
  const { slug } = await params;
  if (slug !== 'paz-en-la-mesa') notFound();
  const program = getProgramRowBySlug(slug);
  if (!program) notFound();
  if (!userCanViewProgram(user, program)) notFound();
  const isStaff = canManageCourses(user);
  const released = program.release_at
    ? new Date(program.release_at).getTime() <= Date.now()
    : true;

  return (
    <main className="paz-world wa-portal-page">
      <div className="paz-container" style={{ padding: '1.5rem 0 3rem' }}>
        <nav className="paz-breadcrumbs" aria-label="Migas de pan">
          <Link href="/dashboard">Mi portal</Link>
          <span>·</span>
          <Link href="/cursos">Cursos y talleres</Link>
          <span>·</span>
          <Link href={`/cursos/${slug}`}>{program.title}</Link>
          <span>·</span>
          <strong>Reto de 7 días</strong>
        </nav>

        <section className="paz-challenge-hero">
          <div>
            <span className="paz-eyebrow">
              <WisdomIcon name="award" size={13} /> Reto de 7 días de Altar Familiar
            </span>
            <h1 className="paz-h2" style={{ marginTop: '0.6rem' }}>
              15 minutos diarios. <em>Siete días de fuego.</em>
            </h1>
            <p className="paz-lead" style={{ marginLeft: 0 }}>
              Del 23 al 30 de diciembre de 2026. Marca cada día, escribe tus acuerdos y usa la
              versión de emergencia de 5 minutos cuando la rutina se complique.
            </p>
            <div className="paz-actions">
              <Link href={`/cursos/${slug}`} className="paz-btn paz-btn--ghost">
                <WisdomIcon name="book" size={16} /> Volver al taller
              </Link>
              <Link href={`/cursos/${slug}#ruta`} className="paz-btn paz-btn--olive">
                <WisdomIcon name="play" size={16} /> Ir a las clases
              </Link>
            </div>
          </div>
          <div
            style={{
              position: 'relative',
              borderRadius: 18,
              overflow: 'hidden',
              aspectRatio: '4 / 3',
              border: '1px solid rgba(179,106,80,.25)',
            }}
          >
            <Image
              src={PAZ_BRAND.coverImage}
              alt="Portada editorial del taller Paz en la mesa"
              fill
              sizes="(max-width: 820px) 90vw, 360px"
              unoptimized
              style={{ objectFit: 'cover' }}
            />
          </div>
        </section>

        <div style={{ marginTop: '1.5rem' }}>
          {!released && !isStaff ? (
            <div className="paz-lead-card" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
              <h3>El taller se libera el 8 de diciembre</h3>
              <p>
                Tu acceso ya está confirmado. Las clases y el checklist se desbloquean en el
                estreno; el Reto de 7 días comienza el 23 de diciembre. Mientras tanto, puedes
                reservar 15 minutos diarios en tu calendario familiar.
              </p>
              <PazCountdown
                targetIso={program.release_at || pazPublicConfig.launchAt}
                label="Liberación del taller"
              />
              {pazPublicConfig.whatsappUrl && (
                <a
                  href={pazPublicConfig.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="paz-btn paz-btn--olive"
                  style={{ marginTop: '0.75rem' }}
                >
                  <WisdomIcon name="users" size={16} /> Comunidad oficial
                </a>
              )}
            </div>
          ) : (
            <PazChallengeTracker
              initialDays={getPazChallengeProgress(user.id, program.id)}
              startsAt={pazPublicConfig.challengeStartsAt}
              endsAt={pazPublicConfig.challengeEndsAt}
              readOnly={!released && isStaff}
            />
          )}
        </div>
      </div>
    </main>
  );
}
