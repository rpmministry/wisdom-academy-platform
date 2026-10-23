import React from 'react';
import Link from 'next/link';
import { requirePageResource } from '@/server/auth/pageAuth';
import { findResourceBySlug, listUserEntitlements } from '@/server/domain/access';
import {
  getProgramDetail,
  getProgramRowById,
  getProgramRowBySlug,
} from '@/server/domain/coursePrograms';
import { prepare } from '@/server/db';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  course: 'Curso',
  workshop: 'Taller',
  grade: 'Grado',
  homeschool_program: 'Programa Homeschool',
  material: 'Material digital',
  collection: 'Colección',
};

const ORIGIN_LABEL: Record<string, string> = {
  purchase: 'Compra',
  gift: 'Regalo',
  promo_full: 'Promoción 100%',
  scholarship: 'Beca',
  founder_invitation: 'Invitación de fundador',
  investor_invitation: 'Invitación de inversor',
  manual_owner: 'Concesión del creador',
  enrollment: 'Matrícula',
  bundle: 'Paquete',
  migration: 'Migración',
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  paused: 'Pausado',
  expired: 'Expirado',
  revoked: 'Revocado',
};

function formatDate(value: string | null): string {
  if (!value) return 'Sin vencimiento';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'long' }).format(date);
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requirePageResource(slug);
  const resource = findResourceBySlug(slug);
  if (!resource) return null;

  let metadata: Record<string, unknown> = {};
  try {
    metadata = JSON.parse(resource.metadata_json) as Record<string, unknown>;
  } catch {
    metadata = {};
  }

  const programRow = prepare('SELECT * FROM course_programs WHERE resource_id = ? LIMIT 1').get(
    resource.id
  ) as { id: string; resource_id: string } | undefined;
  const program =
    getProgramRowBySlug(slug) || (programRow ? getProgramRowById(programRow.id) : null);
  const detail = program ? getProgramDetail(program, { userId: user.id }) : null;
  const summary = detail?.program || null;

  const entitlement = listUserEntitlements(user.id).find(
    (item) => item.resourceSlug === slug
  );
  const accessLabel = entitlement
    ? STATUS_LABEL[entitlement.effectiveStatus] || entitlement.effectiveStatus
    : user.isOwner
      ? 'Acceso del creador'
      : 'Acceso verificado';
  const membershipLabel = entitlement
    ? ORIGIN_LABEL[entitlement.origin] || entitlement.origin
    : user.hasGlobalContentAccess
      ? 'Acceso global'
      : 'Acceso verificado';

  const isHomeschool = resource.type === 'homeschool_program';
  const isProgram = Boolean(summary);
  const guideHref =
    typeof metadata.guideUrl === 'string' &&
    metadata.guideUrl.startsWith('/') &&
    !metadata.guideUrl.startsWith('//')
      ? metadata.guideUrl
      : null;
  const contentCounts = programRow
    ? (prepare(`
        SELECT
          (SELECT COUNT(*) FROM course_lessons WHERE program_id = ?) AS lessons,
          (SELECT COUNT(*) FROM course_materials
           WHERE program_id = ? AND visibility = 'student') AS materials
      `).get(programRow.id, programRow.id) as { lessons: number; materials: number })
    : null;
  const hasProgramContent = Boolean(
    contentCounts && (Number(contentCounts.lessons) > 0 || Number(contentCounts.materials) > 0)
  );
  const isSchoolSubject =
    metadata.subject === true ||
    (resource.type === 'course' && typeof metadata.grade === 'string');
  const contentPending =
    !guideHref &&
    (programRow
      ? !hasProgramContent
      : (resource.type === 'course' || resource.type === 'workshop') &&
        !isSchoolSubject);
  const courseHref = isProgram
    ? `/cursos/${summary!.slug}`
    : guideHref || `/aula?recurso=${encodeURIComponent(resource.slug)}`;
  const coverImage =
    summary?.coverImageUrl ||
    (typeof metadata.coverImage === 'string' ? metadata.coverImage : null) ||
    '/brand/social/og-image-blue-dark.png';
  const logoUrl = summary?.logoUrl || '/brand/n2n/n2ncu-logo-2021.svg';
  const credential =
    summary?.credential ||
    (isHomeschool ? 'Constancia de estudios por período' : 'Constancia del programa');
  const progressPercent = detail?.progress.percent || 0;
  const nextLesson = detail?.progress.nextLessonId
    ? detail.modules.flatMap((module) => module.lessons).find((lesson) => lesson.id === detail.progress.nextLessonId)
    : null;

  return (
    <main className="wa-rd">
      <div className="wa-rd-container">
        <div className="wa-rd-breadcrumb">
          <Link href="/dashboard">Mi portal</Link>
          <WisdomIcon name="chevron-right" size={12} color="current" />
          <Link
            href={
              isProgram
                ? '/cursos'
                : isHomeschool
                  ? '/cursos#programas-escolares'
                  : '/contenidos'
            }
          >
            {isProgram ? 'Cursos y talleres' : isHomeschool ? 'Programas escolares' : 'Contenidos'}
          </Link>
          <WisdomIcon name="chevron-right" size={12} color="current" />
          <strong>{resource.title}</strong>
        </div>

        <section className={`wa-rd-hero ${isProgram ? 'is-theology' : ''}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImage} alt="" className="wa-rd-hero-image" />
          <div className="wa-rd-hero-overlay" />
          <div className="wa-rd-hero-content">
            <div className="wa-rd-hero-brand">
              {isProgram && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Universidad Cristiana N2N" />
              )}
              <span>{summary?.institution || (isProgram ? 'Universidad Cristiana N2N' : 'Wisdom Academy')}</span>
            </div>
            <span className="wa-rd-eyebrow">
              <WisdomIcon name={isProgram ? 'book' : 'sparkles'} size={14} />
              {isProgram ? 'Educación para el ministerio · Currículo N2N' : TYPE_LABEL[resource.type] || 'Recurso'}
            </span>
            <h1>{resource.title}</h1>
            <p className="wa-rd-subtitle">
              {summary?.subtitle ||
                (isProgram
                  ? 'Formación bíblica y ministerial con clases, textos, repasos y evaluaciones.'
                  : resource.description)}
            </p>
            <div className="wa-rd-chips">
              {summary ? (
                <>
                  <span><WisdomIcon name="calendar" size={13} /> {summary.moduleCount} semestres</span>
                  <span><WisdomIcon name="play" size={13} /> {summary.lessonCount} sesiones</span>
                  <span><WisdomIcon name="award" size={13} /> {credential}</span>
                </>
              ) : (
                <span><WisdomIcon name="shield" size={13} /> Acceso verificado</span>
              )}
            </div>
            <div className="wa-rd-actions">
              {contentPending ? (
                <span className="wa-rd-unavailable" role="status">
                  <WisdomIcon name="clock" size={16} />
                  PRÓXIMAMENTE DISPONIBLE
                </span>
              ) : (
                <Link href={courseHref} className="wa-rd-btn wa-rd-btn-primary">
                  <WisdomIcon name={guideHref ? 'book' : 'play'} size={16} />
                  {guideHref ? 'Abrir guía' : 'Entrar al aula'}
                  <WisdomIcon name="arrow-right" size={15} />
                </Link>
              )}
              <Link href="/mi-acceso" className="wa-rd-btn wa-rd-btn-secondary">
                <WisdomIcon name="shield" size={16} /> Ver vigencia del acceso
              </Link>
            </div>
          </div>
          {isProgram && (
            <div className="wa-rd-hero-progress">
              <div
                className="wa-rd-ring"
                style={{ ['--ring' as string]: `${Math.max(4, progressPercent)}%` }}
                role="img"
                aria-label={`${progressPercent}% del contenido cargado completado`}
              >
                <div className="wa-rd-ring-inner">
                  <strong>{progressPercent}%</strong>
                  <span>contenido</span>
                </div>
              </div>
              <div className="wa-rd-hero-next">
                <span>{nextLesson ? 'Continuar' : 'Ruta completa'}</span>
                <strong>{nextLesson?.title || 'Explora el programa'}</strong>
                <small>{nextLesson?.week ? `Semana ${String(nextLesson.week).padStart(2, '0')}` : `${detail?.progress.completedLessons || 0} de ${detail?.progress.totalLessons || 0} clases`}</small>
              </div>
            </div>
          )}
        </section>

        {contentPending && (
          <div className="wa-rd-disclaimer wa-rd-disclaimer--pending" role="status">
            <WisdomIcon name="clock" size={18} />
            <p>
              <strong>PRÓXIMAMENTE DISPONIBLE.</strong> Estamos preparando los
              materiales educativos de este programa. Pronto podrás consultar sus
              recursos desde Wisdom Academy. Tu acceso actual se conserva.
            </p>
          </div>
        )}

        {isProgram && (
          <div className="wa-rd-disclaimer">
            <WisdomIcon name="shield" size={18} />
            <p>
              Educación para el ministerio. Este programa no otorga título académico ni cuenta con
              aval académico. Wisdom Academy emite diplomas y certificados ministeriales de estudios
              semestre a semestre, sujetos al cumplimiento de las clases y evaluaciones.
            </p>
          </div>
        )}

        <div className="wa-rd-grid">
          <div className="wa-rd-main">
            {isProgram && summary ? (
              <>
                <section className="wa-rd-panel">
                  <div className="wa-rd-panel-head">
                    <div>
                      <span className="wa-rd-kicker">Tu ruta de aprendizaje</span>
                      <h2>De la primera clase al certificado ministerial</h2>
                    </div>
                    <span className={`wa-rd-status ${progressPercent > 0 ? 'is-live' : ''}`}>
                      {progressPercent > 0 ? 'En curso' : 'Listo para comenzar'}
                    </span>
                  </div>
                  <p className="wa-rd-lead">{summary.description}</p>
                  <div className="wa-rd-progress-row">
                    <div>
                      <strong>{detail?.progress.completedLessons || 0} de {detail?.progress.totalLessons || 0} clases completadas</strong>
                      <span>{summary.moduleCount} semestres · avance del contenido cargado</span>
                    </div>
                    <div className="wa-rd-bar"><i style={{ width: `${progressPercent}%` }} /></div>
                  </div>
                  <div className="wa-rd-actions wa-rd-actions-inline">
                    <Link href={courseHref} className="wa-rd-btn wa-rd-btn-primary">
                      <WisdomIcon name="play" size={15} /> {nextLesson ? 'Continuar en el aula' : 'Entrar al aula'}
                    </Link>
                    <Link href="/mi-acceso" className="wa-rd-btn wa-rd-btn-ghost">
                      Ver vigencia del acceso <WisdomIcon name="arrow-right" size={14} />
                    </Link>
                  </div>
                </section>

                <section className="wa-rd-panel">
                  <div className="wa-rd-panel-head">
                    <div>
                      <span className="wa-rd-kicker">Mapa de la carrera</span>
                      <h2>Semestres y materias</h2>
                    </div>
                    <Link href={courseHref} className="wa-rd-text-link">
                      Ver ruta completa <WisdomIcon name="arrow-right" size={13} />
                    </Link>
                  </div>
                  <div className="wa-rd-semesters">
                    {detail?.modules.slice(0, 5).map((module) => (
                      <div key={module.id} className={`wa-rd-semester ${module.locked ? 'is-locked' : ''}`}>
                        <div className="wa-rd-semester-top">
                          <span className="wa-rd-semester-number">{String(module.position).padStart(2, '0')}</span>
                          <span className={`wa-rd-status ${module.locked ? 'is-locked' : module.completion?.completed ? 'is-done' : 'is-live'}`}>
                            {module.locked ? 'Bloqueado' : module.completion?.completed ? 'Aprobado' : module.lessons.length ? 'En curso' : 'Pendiente'}
                          </span>
                        </div>
                        <strong>{module.title}</strong>
                        <div className="wa-rd-subjects">
                          {module.subjects.slice(0, 4).map((subject) => (
                            <span key={subject.code}>{subject.code} · {subject.name}</span>
                          ))}
                          {module.subjects.length === 0 && <span>Contenido pendiente de carga</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="wa-rd-panel">
                  <div className="wa-rd-panel-head">
                    <div>
                      <span className="wa-rd-kicker">Experiencia de aprendizaje</span>
                      <h2>Qué incluye el aula</h2>
                    </div>
                  </div>
                  <div className="wa-rd-features">
                    <div><span><WisdomIcon name="video" size={18} /></span><strong>Clases en video</strong><small>Sesiones organizadas por semana y materia.</small></div>
                    <div><span><WisdomIcon name="book" size={18} /></span><strong>Textos oficiales</strong><small>Lecturas y páginas de cada sesión.</small></div>
                    <div><span><WisdomIcon name="file-text" size={18} /></span><strong>Repasos</strong><small>Preparación con trazabilidad de fuentes.</small></div>
                    <div><span><WisdomIcon name="award" size={18} /></span><strong>Evaluaciones</strong><small>Parciales y finales con calificación en servidor.</small></div>
                    <div><span><WisdomIcon name="shield" size={18} /></span><strong>Progreso verificable</strong><small>El siguiente semestre se habilita al aprobar el anterior.</small></div>
                    <div><span><WisdomIcon name="chart" size={18} /></span><strong>Certificado ministerial</strong><small>Constancia por semestre, sin aval académico.</small></div>
                  </div>
                </section>
              </>
            ) : (
              <section className="wa-rd-panel">
                <span className="wa-rd-kicker">{TYPE_LABEL[resource.type] || 'Recurso'}</span>
                <h2>{resource.title}</h2>
                <p className="wa-rd-lead">{resource.description}</p>
                <div className="wa-rd-actions wa-rd-actions-inline">
                  {contentPending ? (
                    <span className="wa-rd-unavailable" role="status">
                      <WisdomIcon name="clock" size={15} />
                      PRÓXIMAMENTE DISPONIBLE
                    </span>
                  ) : (
                    <Link href={courseHref} className="wa-rd-btn wa-rd-btn-primary">
                      {guideHref ? 'Abrir guía' : 'Entrar al aula'}{' '}
                      <WisdomIcon name="arrow-right" size={15} />
                    </Link>
                  )}
                  <Link href="/mi-acceso" className="wa-rd-btn wa-rd-btn-secondary">
                    Ver vigencia del acceso
                  </Link>
                </div>
              </section>
            )}
          </div>

          <aside className="wa-rd-aside">
            <section className="wa-rd-side-card">
              <div className="wa-rd-side-head">
                <span className="wa-rd-kicker">Tu acceso</span>
                <span className="wa-rd-status is-live">{accessLabel}</span>
              </div>
              <strong>{membershipLabel}</strong>
              <p>
                {entitlement
                  ? `Vigente hasta ${formatDate(entitlement.endsAt)}.`
                  : user.isOwner
                    ? 'Acceso permanente del creador de la plataforma.'
                    : 'Acceso verificado para tu cuenta.'}
              </p>
              <Link href="/mi-acceso" className="wa-rd-btn wa-rd-btn-secondary wa-rd-btn-block">
                Ver vigencia del acceso
              </Link>
            </section>

            <section className="wa-rd-side-card is-credential">
              <span className="wa-rd-side-icon"><WisdomIcon name="award" size={22} /></span>
              <span className="wa-rd-kicker">Certificación</span>
              <strong>{credential}</strong>
              <p>
                {isHomeschool
                  ? 'Se habilita al completar las clases y las evaluaciones del período.'
                  : 'Se habilita al completar las clases y aprobar las evaluaciones del semestre.'}
              </p>
              <span className="wa-rd-note">
                {isHomeschool
                  ? 'No sustituye los documentos oficiales de la institución.'
                  : 'No es un título académico ni tiene aval académico.'}
              </span>
            </section>

            <section className="wa-rd-side-card is-help">
              <span className="wa-rd-side-icon"><WisdomIcon name="user" size={20} /></span>
              <span className="wa-rd-kicker">¿Necesitas ayuda?</span>
              <strong>Estamos para acompañarte</strong>
              <p>Consulta tus derechos, códigos o acceso al aula con el equipo de Wisdom Academy.</p>
              <Link href="/mi-acceso" className="wa-rd-text-link">Gestionar mi acceso <WisdomIcon name="arrow-right" size={13} /></Link>
            </section>
          </aside>
        </div>

        <footer className="wa-rd-footer">
          <div className="wa-rd-footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/svg/wisdom-icon-color.svg" alt="" width={30} height={30} />
            <span>
              <strong>Wisdom Academy</strong>
              <small>{isProgram ? 'Educación para el ministerio' : 'Formación con propósito'}</small>
            </span>
          </div>
          <p>
            {isProgram
              ? 'Programa de Teología | Universidad Cristiana N2N. Certificados ministeriales de estudio; no académicos.'
              : 'Wisdom Academy · Contenido académico con acceso verificado y trazabilidad.'}
          </p>
          <Link href="/catalogo">Explorar programas <WisdomIcon name="arrow-right" size={13} /></Link>
        </footer>
      </div>
    </main>
  );
}
