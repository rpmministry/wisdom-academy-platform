import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePageUser } from '@/server/auth/pageAuth';
import {
  canManageCourses,
  getLessonForStudent,
  getProgramDetail,
  getProgramRowBySlug,
  userCanViewProgram,
} from '@/server/domain/coursePrograms';
import { buildYouTubeEmbedUrl, buildYouTubeWatchUrl } from '@/lib/courses/youtube';
import { LessonPlayer } from '@/components/courses/LessonPlayer';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export const dynamic = 'force-dynamic';

const SUBJECT_ACCENTS: Record<string, { ink: string; soft: string }> = {
  '01': { ink: '#8a2b2b', soft: '#f7e8e6' },
  '02': { ink: '#a16207', soft: '#fbf1da' },
  '12': { ink: '#17603a', soft: '#e7f4ec' },
  '38': { ink: '#1e3a8a', soft: '#e8eefa' },
  '39': { ink: '#8a3b1f', soft: '#fbece4' },
};

function subjectAccent(code: string | null): { ink: string; soft: string } {
  return (code && SUBJECT_ACCENTS[code]) || { ink: 'var(--accent-study)', soft: 'var(--accent-study-soft)' };
}

function materialHref(
  material: { kind: string; url: string | null; driveFileId: string | null; id: string },
  slug: string
): string | null {
  if (material.driveFileId) return `/api/courses/${slug}/materials/${material.id}/file?download=1`;
  if (material.url) return material.url;
  if (material.kind === 'text') return `/api/courses/${slug}/materials/${material.id}?download=1`;
  return null;
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const user = await requirePageUser();
  const { slug, lessonId } = await params;
  const program = getProgramRowBySlug(slug);
  if (!program) notFound();
  if (!userCanViewProgram(user, program)) notFound();
  const data = getLessonForStudent(lessonId, user.id);
  if (!data || data.program.id !== program.id) notFound();

  const isStaff = canManageCourses(user);
  const detail = getProgramDetail(program, { userId: user.id, includeStaffMaterials: isStaff });
  const allLessons = detail.modules.flatMap((module) => module.lessons);
  const index = allLessons.findIndex((lesson) => lesson.id === lessonId);
  const lesson = data.lesson;
  const moduleDetail = detail.modules.find((module) => module.id === data.module.id) || data.module;
  const accent = subjectAccent(lesson.subjectCode);
  const subjectInfo = moduleDetail.subjects.find((subject) => subject.code === lesson.subjectCode);
  const total = allLessons.length;
  const completed = allLessons.filter((item) => item.progress?.status === 'completed').length;
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const nextLesson = allLessons[index + 1] || null;
  const prevLesson = allLessons[index - 1] || null;
  const lessonWeek = lesson.week || 1;
  const weekImage = `/images/course-weeks/week-${String(((lessonWeek - 1) % 12) + 1).padStart(2, '0')}.jpg`;
  const modulePercent = moduleDetail.completion?.totalLessons
    ? Math.round((moduleDetail.completion.completedLessons / moduleDetail.completion.totalLessons) * 100)
    : 0;

  const videos = lesson.videoIds
    .map((id) => {
      try {
        return { id, embedUrl: buildYouTubeEmbedUrl(id), watchUrl: buildYouTubeWatchUrl(id) };
      } catch {
        return null;
      }
    })
    .filter((video): video is { id: string; embedUrl: string; watchUrl: string } => Boolean(video));

  return (
    <main className="wa-lw">
      <div className="wa-lw-container">
        <div className="wa-lw-breadcrumb">
          <Link href="/dashboard">Mi portal</Link>
          <WisdomIcon name="chevron-right" size={12} color="current" />
          <Link href="/cursos">Cursos y talleres</Link>
          <WisdomIcon name="chevron-right" size={12} color="current" />
          <Link href={`/cursos/${slug}`}>{data.program.title}</Link>
          <WisdomIcon name="chevron-right" size={12} color="current" />
          <strong>Clase {String(index + 1).padStart(2, '0')}</strong>
        </div>

        <section className="wa-lw-head">
          <div className="wa-lw-head-main">
            <div className="wa-lw-eyebrow">
              <span
                className="wa-lw-subject"
                style={{ ['--subject-ink' as string]: accent.ink, ['--subject-soft' as string]: accent.soft }}
              >
                {lesson.subjectCode ? `${lesson.subjectCode} · ` : ''}{lesson.subject || 'Sesión'}
              </span>
              <span>Semana {String(lesson.week || 1).padStart(2, '0')}</span>
              <span>Clase {String(index + 1).padStart(2, '0')} de {String(total).padStart(2, '0')}</span>
            </div>
            <h1>{lesson.title}</h1>
            {lesson.description && <p className="wa-lw-description">{lesson.description}</p>}
            <div className="wa-lw-meta">
              {lesson.pagesLabel && <span><WisdomIcon name="book" size={14} /> Páginas {lesson.pagesLabel}</span>}
              {lesson.durationLabel && <span><WisdomIcon name="clock" size={14} /> {lesson.durationLabel}</span>}
              <span><WisdomIcon name="video" size={14} /> {videos.length} video{videos.length === 1 ? '' : 's'}</span>
              <span><WisdomIcon name="file-text" size={14} /> {lesson.materials.length} material{lesson.materials.length === 1 ? '' : 'es'}</span>
              {subjectInfo?.professor && <span><WisdomIcon name="user" size={14} /> {subjectInfo.professor}</span>}
            </div>
          </div>
          <div className="wa-lw-head-side">
            <div className="wa-lw-progress-card">
              <div>
                <span>Avance del programa</span>
                <strong>{percent}%</strong>
              </div>
              <div className="wa-lw-bar"><i style={{ width: `${percent}%` }} /></div>
              <small>{completed} de {total} clases completadas</small>
            </div>
            <Link href={`/cursos/${slug}`} className="wa-lw-btn wa-lw-btn-secondary">
              <WisdomIcon name="book" size={15} /> Volver al programa
            </Link>
          </div>
        </section>

        <div className="wa-lw-grid">
          <div className="wa-lw-main">
            <section className="wa-lw-video-card">
              <LessonPlayer
                slug={slug}
                lessonId={lessonId}
                title={lesson.title}
                fallbackImage={detail.program.coverImageUrl || weekImage}
                videos={videos}
                initialCompleted={lesson.progress?.status === 'completed'}
              />
            </section>

            <section className="wa-lw-panel">
              <div className="wa-lw-panel-head">
                <div>
                  <span className="wa-lw-kicker">Recursos de la sesión</span>
                  <h2>Materiales de clase</h2>
                </div>
                <span className="wa-lw-count">{lesson.materials.length}</span>
              </div>
              {lesson.materials.length > 0 ? (
                <div className="wa-lw-materials">
                  {lesson.materials.map((material) => {
                    const href = materialHref(material, slug);
                    return (
                      <article key={material.id} className="wa-lw-material">
                        <span className="wa-lw-material-icon">
                          <WisdomIcon
                            name={material.kind === 'drive_file' ? 'file-text' : material.kind === 'external_link' ? 'arrow-right' : 'book'}
                            size={19}
                          />
                        </span>
                        <div>
                          <span className="wa-lw-material-kind">
                            {material.kind === 'drive_file' ? 'Documento' : material.kind === 'external_link' ? 'Enlace externo' : 'Material'}
                          </span>
                          <strong>{material.title}</strong>
                        </div>
                        {href ? (
                          <a className="wa-lw-btn wa-lw-btn-small" href={href} target="_blank" rel="noopener noreferrer">
                            Abrir <WisdomIcon name="arrow-right" size={13} />
                          </a>
                        ) : (
                          <span className="wa-lw-muted">No disponible</span>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="wa-lw-empty">
                  <WisdomIcon name="file-text" size={20} />
                  <div>
                    <strong>Sin materiales asociados</strong>
                    <span>El docente puede añadir el texto o los recursos de esta sesión.</span>
                  </div>
                </div>
              )}
            </section>

            <nav className="wa-lw-pager" aria-label="Navegación entre clases">
              {prevLesson ? (
                <Link href={`/cursos/${slug}/clase/${prevLesson.id}`} className="wa-lw-pager-card">
                  <span><WisdomIcon name="arrow-right" size={14} /> Clase anterior</span>
                  <strong>{prevLesson.title}</strong>
                </Link>
              ) : (
                <span className="wa-lw-pager-card is-disabled">
                  <span>Inicio del programa</span>
                  <strong>Estás en la primera clase</strong>
                </span>
              )}
              {nextLesson ? (
                <Link href={`/cursos/${slug}/clase/${nextLesson.id}`} className="wa-lw-pager-card is-next">
                  <span>Clase siguiente <WisdomIcon name="arrow-right" size={14} /></span>
                  <strong>{nextLesson.title}</strong>
                </Link>
              ) : (
                <Link href={`/cursos/${slug}`} className="wa-lw-pager-card is-next">
                  <span>Programa completo <WisdomIcon name="arrow-right" size={14} /></span>
                  <strong>Volver a la ficha del programa</strong>
                </Link>
              )}
            </nav>
          </div>

          <aside className="wa-lw-aside" aria-label="Contenido del curso">
            <section className="wa-lw-side-card">
              <div className="wa-lw-side-head">
                <div>
                  <span className="wa-lw-kicker">Contenido</span>
                  <h2>{moduleDetail.title}</h2>
                </div>
                <span className="wa-lw-count">{moduleDetail.lessons.length}</span>
              </div>
              <div className="wa-lw-outline">
                {detail.modules.map(module => (
                  <details key={module.id} open={module.id === moduleDetail.id} className="wa-lw-outline-group">
                    <summary>
                      <span>{module.title}</span>
                      <small>
                        {module.locked
                          ? 'Bloqueado'
                          : module.completion?.completed
                            ? 'Aprobado'
                            : `${module.lessons.length} clase${module.lessons.length === 1 ? '' : 's'}`}
                      </small>
                    </summary>
                    {module.lessons.length > 0 ? (
                      module.lessons.map((item, itemIndex) => (
                        <Link
                          key={item.id}
                          href={`/cursos/${slug}/clase/${item.id}`}
                          className={item.id === lessonId ? 'is-current' : undefined}
                        >
                          <span className={`wa-lw-outline-dot ${item.progress?.status === 'completed' ? 'is-done' : ''}`}>
                            {item.progress?.status === 'completed' ? <WisdomIcon name="check" size={10} /> : String(itemIndex + 1).padStart(2, '0')}
                          </span>
                          <span>{item.title}</span>
                        </Link>
                      ))
                    ) : (
                      <p className="wa-lw-outline-empty">
                        {module.subjects.length
                          ? `${module.subjects.length} materias planificadas`
                          : 'Contenido pendiente de carga'}
                      </p>
                    )}
                  </details>
                ))}
              </div>
            </section>

            <section className="wa-lw-side-card">
              <div className="wa-lw-side-head">
                <div>
                  <span className="wa-lw-kicker">Tu avance</span>
                  <h2>Semestre en curso</h2>
                </div>
                <span className="wa-lw-status">{modulePercent}%</span>
              </div>
              <div className="wa-lw-bar"><i style={{ width: `${modulePercent}%` }} /></div>
              <div className="wa-lw-side-stats">
                <div><strong>{moduleDetail.completion?.completedLessons || 0}</strong><span>clases</span></div>
                <div><strong>{moduleDetail.completion?.assessmentsPassed || 0}/{moduleDetail.completion?.requiredAssessments || 0}</strong><span>evaluaciones</span></div>
              </div>
              <Link href={`/cursos/${slug}`} className="wa-lw-btn wa-lw-btn-secondary wa-lw-btn-block">
                Ver ruta completa <WisdomIcon name="arrow-right" size={14} />
              </Link>
            </section>

            <section className="wa-lw-course-card">
              {detail.program.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={detail.program.coverImageUrl} alt="" />
              )}
              <div>
                <span className="wa-lw-kicker">Programa</span>
                <strong>{detail.program.title}</strong>
                <small>{detail.program.institution || 'Wisdom Academy'}</small>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
