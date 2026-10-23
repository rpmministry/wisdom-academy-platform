'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  LessonView,
  MaterialView,
  ModuleView,
  ProgramDetail,
} from '@/server/domain/coursePrograms';
import type { AttemptResult } from '@/server/domain/courseAssessments';
import type { WeeklyMeetingView } from '@/server/domain/weeklyMeetings';
import { WeeklyMeetingCard } from './WeeklyMeetingCard';
import { FacultyPanel } from './FacultyPanel';

type CourseAttemptResult = AttemptResult & { assessmentTitle: string; assessmentKind: string };

interface CourseProgramWorkspaceProps {
  slug: string;
  detail: ProgramDetail;
  results: CourseAttemptResult[];
  isStaff: boolean;
  meetings: WeeklyMeetingView[];
  canManageMeetings: boolean;
}

type TabId = 'ruta' | 'materias' | 'faculty' | 'recursos' | 'evaluaciones' | 'progreso';

const TABS: Array<{ id: TabId; label: string; icon: LmsIconName }> = [
  { id: 'ruta', label: 'Ruta semanal', icon: 'calendar' },
  { id: 'materias', label: 'Materias', icon: 'book' },
  { id: 'faculty', label: 'Cuerpo docente', icon: 'users' },
  { id: 'recursos', label: 'Recursos', icon: 'folder' },
  { id: 'evaluaciones', label: 'Evaluaciones', icon: 'award' },
  { id: 'progreso', label: 'Mi progreso', icon: 'target' },
];

const SUBJECT_PALETTE: Record<string, { ink: string; soft: string; label: string }> = {
  '01': { ink: '#7A1F1F', soft: '#F6E9E7', label: 'Matrimonio y Familia' },
  '02': { ink: '#A16207', soft: '#FBF1DA', label: 'Sufrimiento y Pérdida' },
  '12': { ink: '#14532D', soft: '#E6F3EA', label: 'Libre por Decreto' },
  '38': { ink: '#1E3A8A', soft: '#E8EEFA', label: 'Alcanzando Su Destino' },
  '39': { ink: '#7C2D12', soft: '#FBEDE6', label: 'Vida Victoriosa' },
};

const FALLBACK_PALETTE = { ink: '#3F4A43', soft: '#EEF1EE', label: 'Materia' };

function subjectPalette(code: string | null | undefined) {
  return (code && SUBJECT_PALETTE[code]) || FALLBACK_PALETTE;
}

function parseWeek(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /(\d+)/.exec(value);
  return match ? Number(match[1]) : null;
}

function assessmentWeek(kind: string): number | null {
  if (kind === 'midterm') return 6;
  if (kind === 'final') return 12;
  return null;
}

function completionLabel(module: ModuleView): string {
  if (module.locked) return 'Bloqueado';
  if (module.completion?.completed) return 'Aprobado';
  if ((module.completion?.totalLessons || 0) > 0) return 'En curso';
  return 'Pendiente';
}

function progressTone(module: ModuleView): 'live' | 'locked' | 'done' | 'pending' {
  if (module.locked) return 'locked';
  if (module.completion?.completed) return 'done';
  if ((module.completion?.totalLessons || 0) > 0) return 'live';
  return 'pending';
}

function formatDateLabel(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeZone: 'America/Guayaquil' }).format(date);
}

export const CourseProgramWorkspace: React.FC<CourseProgramWorkspaceProps> = ({
  slug,
  detail,
  results,
  isStaff,
  meetings,
  canManageMeetings,
}) => {
  const { program, modules, reviews, assessments, materials, progress } = detail;
  const isN2n = /n2n/i.test(program.title) || /n2n/i.test(program.institution || '');
  const firstAvailable =
    modules.find((module) => !module.locked && module.lessons.length > 0) ||
    modules.find((module) => !module.locked) ||
    modules[0];
  const [activeModuleId, setActiveModuleId] = useState<string>(firstAvailable?.id || '');
  const [activeTab, setActiveTab] = useState<TabId>('ruta');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set());

  const activeModule = modules.find((module) => module.id === activeModuleId) || firstAvailable;
  const allLessons = useMemo(
    () => modules.flatMap((module) => module.lessons),
    [modules]
  );
  const nextLesson =
    allLessons.find((lesson) => lesson.id === progress.nextLessonId) ||
    allLessons.find((lesson) => lesson.progress?.status !== 'completed') ||
    null;

  const activeLessons = activeModule?.lessons || [];

  const subjects = useMemo(() => {
    const fromLessons = new Map<string, { code: string; name: string; lessons: LessonView[] }>();
    for (const lesson of activeLessons) {
      if (!lesson.subject) continue;
      const code = lesson.subjectCode || lesson.subject;
      if (!fromLessons.has(code)) {
        fromLessons.set(code, { code, name: lesson.subject, lessons: [] });
      }
      fromLessons.get(code)!.lessons.push(lesson);
    }
    const planned = activeModule?.subjects || [];
    if (planned.length > 0) {
      return planned.map((subject) => ({
        code: subject.code,
        name: subject.name,
        lessons: fromLessons.get(subject.code)?.lessons || [],
      }));
    }
    return [...fromLessons.values()];
  }, [activeLessons, activeModule]);

  const filteredLessons =
    subjectFilter === 'all'
      ? activeLessons
      : activeLessons.filter((lesson) => (lesson.subjectCode || lesson.subject) === subjectFilter);

  const weeks = useMemo(() => {
    const map = new Map<number, LessonView[]>();
    for (const lesson of filteredLessons) {
      const week = lesson.week ?? 0;
      if (!map.has(week)) map.set(week, []);
      map.get(week)!.push(lesson);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([week, lessons]) => ({
        week,
        lessons: lessons.sort((a, b) => a.position - b.position),
      }));
  }, [filteredLessons]);

  const currentWeek = useMemo(() => {
    const pending = weeks.find((group) =>
      group.lessons.some((lesson) => lesson.progress?.status !== 'completed')
    );
    return pending?.week ?? weeks[0]?.week ?? 1;
  }, [weeks]);

  useEffect(() => {
    setOpenWeeks(new Set([currentWeek]));
  }, [activeModuleId, currentWeek]);

  const moduleReviews = reviews.filter((review) => review.moduleId === activeModule?.id);
  const moduleAssessments = assessments.filter(
    (assessment) => assessment.moduleId === activeModule?.id || !assessment.moduleId
  );
  const completedSemesters = modules.filter((module) => module.completion?.completed).length;

  const toggleWeek = (week: number) => {
    setOpenWeeks((current) => {
      const next = new Set(current);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  };

  const selectModule = (module: ModuleView) => {
    setActiveModuleId(module.id);
    setSubjectFilter('all');
    setActiveTab('ruta');
  };

  const moduleProgress = activeModule?.completion;
  const modulePercent = moduleProgress?.totalLessons
    ? Math.round((moduleProgress.completedLessons / moduleProgress.totalLessons) * 100)
    : 0;
  const certificateAvailable = Boolean(moduleProgress?.completed && !isStaff);

  return (
    <main className="wa-lms">
      <div className="wa-lms-container">
        <nav className="wa-breadcrumbs" aria-label="Migas de pan">
          <Link href="/dashboard">Mi portal</Link>
          <LmsIcon name="arrow" size={11} />
          <Link href="/cursos">Cursos y talleres</Link>
          <LmsIcon name="arrow" size={11} />
          <strong>{program.title}</strong>
        </nav>
        <section className="wa-lms-hero">
          <div className="wa-lms-hero-media">
            {program.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={program.coverImageUrl} alt="" />
            ) : null}
            <div className="wa-lms-hero-shade" />
          </div>
          <div className="wa-lms-hero-content">
            <div className="wa-lms-hero-main">
              <div className="wa-lms-hero-brand">
                {program.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={program.logoUrl} alt={program.institution || 'Institución'} />
                )}
                <span className="wa-lms-hero-brand-copy">
                  <small>{isN2n ? 'Programa de Teología' : program.kind === 'workshop' ? 'Taller' : 'Curso'}</small>
                  <strong>{program.institution || 'Wisdom Academy'}</strong>
                </span>
              </div>
              <div className="wa-lms-eyebrow">
                <LmsIcon name="spark" size={14} /> {isN2n ? 'Formación bíblica y ministerial' : program.kind === 'workshop' ? 'Experiencia intensiva' : 'Ruta de aprendizaje'}
              </div>
              <h1>{program.title}</h1>
              {program.subtitle && <p className="wa-lms-hero-subtitle">{program.subtitle}</p>}
              <div className="wa-lms-hero-chips">
                <span><LmsIcon name="layers" size={14} /> {program.moduleCount} semestres</span>
                <span><LmsIcon name="play" size={14} /> {program.lessonCount} sesiones cargadas</span>
                <span><LmsIcon name="award" size={14} /> {program.credential || (isN2n ? 'Certificación ministerial' : 'Constancia del programa')}</span>
              </div>
              <div className="wa-lms-hero-actions">
                {nextLesson ? (
                  <Link className="wa-lms-btn wa-lms-btn-primary" href={`/cursos/${slug}/clase/${nextLesson.id}`}>
                    <LmsIcon name="play" size={16} />
                    {progress.completedLessons > 0 ? 'Continuar aprendizaje' : 'Comenzar ahora'}
                  </Link>
                ) : (
                  <Link className="wa-lms-btn wa-lms-btn-primary" href="#ruta">
                    <LmsIcon name="book" size={16} /> Ver ruta completa
                  </Link>
                )}
                <button
                  type="button"
                  className="wa-lms-btn wa-lms-btn-glass"
                  onClick={() => setActiveTab('materias')}
                >
                  <LmsIcon name="book" size={16} /> Explorar materias
                </button>
              </div>
            </div>
            <div className="wa-lms-hero-side">
              <div
                className="wa-lms-ring"
                style={{ ['--ring' as string]: `${Math.max(4, progress.percent)}%` }}
                role="img"
                aria-label={`${progress.percent}% del contenido cargado completado`}
              >
                <div className="wa-lms-ring-inner">
                  <strong>{progress.percent}%</strong>
                  <span>contenido</span>
                </div>
              </div>
              <div className="wa-lms-hero-stats">
                <div><strong>{progress.completedLessons}</strong><span>clases completadas</span></div>
                <div><strong>{completedSemesters}</strong><span>semestres aprobados</span></div>
                <div><strong>{results.length}</strong><span>evaluaciones rendidas</span></div>
              </div>
              <div className="wa-lms-hero-next">
                <span className="wa-lms-hero-next-label">Siguiente</span>
                <strong>{nextLesson?.title || 'Ruta completada'}</strong>
                {nextLesson?.week ? <span>Semana {String(nextLesson.week).padStart(2, '0')}</span> : null}
              </div>
            </div>
          </div>
        </section>

        {program.disclaimer && (
          <div className="wa-lms-disclaimer">
            <LmsIcon name="shield" size={18} />
            <p>{program.disclaimer}</p>
          </div>
        )}

        {isStaff && program.status !== 'published' && (
          <div className="wa-lms-staff-note">
            <LmsIcon name="eye" size={16} /> Vista previa administrativa · estado {program.status}
          </div>
        )}

        <div className="wa-lms-layout">
          <main className="wa-lms-main">
            <div className="wa-lms-tabs" role="tablist" aria-label="Secciones del programa">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`wa-lms-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <LmsIcon name={tab.icon} size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'ruta' && (
              <section className="wa-lms-panel" aria-label="Ruta semanal">
                <div className="wa-lms-section-head">
                  <div>
                    <span className="wa-lms-kicker">Ruta de aprendizaje</span>
                    <h2>{activeModule?.title || 'Semestre'}</h2>
                    <p>
                      {activeLessons.length > 0
                        ? `${activeLessons.length} sesiones organizadas en ${weeks.length} semanas, según el horario oficial.`
                        : 'La estructura está lista. Las clases se incorporarán desde los materiales oficiales.'}
                    </p>
                  </div>
                  <div className="wa-lms-semester-badge">
                    <span className={`wa-lms-status ${progressTone(activeModule!)}`}>
                      {activeModule ? completionLabel(activeModule) : 'Pendiente'}
                    </span>
                    {activeModule?.completion && (
                      <small>{modulePercent}% del semestre</small>
                    )}
                  </div>
                </div>

                {activeLessons.length > 0 && (
                  <div className="wa-lms-filterbar">
                    <span className="wa-lms-filter-label"><LmsIcon name="filter" size={14} /> Materia</span>
                    <button
                      type="button"
                      className={`wa-lms-filter ${subjectFilter === 'all' ? 'is-active' : ''}`}
                      onClick={() => setSubjectFilter('all')}
                    >
                      Todas
                    </button>
                    {subjects.map((subject) => (
                      <button
                        key={subject.code}
                        type="button"
                        className={`wa-lms-filter ${subjectFilter === subject.code ? 'is-active' : ''}`}
                        onClick={() => setSubjectFilter(subject.code)}
                        style={{ ['--subject' as string]: subjectPalette(subject.code).ink }}
                      >
                        <span className="wa-lms-filter-dot" /> {subject.name}
                      </button>
                    ))}
                  </div>
                )}

                {activeModule?.locked ? (
                  <div className="wa-lms-empty">
                    <div className="wa-lms-empty-icon"><LmsIcon name="lock" size={28} /></div>
                    <h3>Semestre bloqueado</h3>
                    <p>
                      Se habilita al completar y aprobar {modules[modules.findIndex((m) => m.id === activeModule.id) - 1]?.title || 'el semestre anterior'}.
                    </p>
                    {activeModule.subjects.length > 0 && <SubjectPlan subjects={activeModule.subjects} />}
                  </div>
                ) : activeLessons.length === 0 ? (
                  <div className="wa-lms-empty">
                    <div className="wa-lms-empty-icon"><LmsIcon name="layers" size={28} /></div>
                    <h3>Contenido pendiente de carga</h3>
                    <p>La malla curricular y la carpeta de Drive ya están preparadas para este semestre.</p>
                    {activeModule?.subjects.length ? <SubjectPlan subjects={activeModule.subjects} /> : null}
                  </div>
                ) : (
                  <div className="wa-lms-timeline">
                    {weeks.map((group) => {
                      const weekReviews = moduleReviews.filter((review) => parseWeek(review.weekLabel) === group.week);
                      const weekAssessments = moduleAssessments.filter(
                        (assessment) => isN2n && assessmentWeek(assessment.kind) === group.week
                      );
                      const weekCompleted = group.lessons.filter(
                        (lesson) => lesson.progress?.status === 'completed'
                      ).length;
                      const isOpen = openWeeks.has(group.week);
                      const weekMeeting = meetings.find((meeting) => meeting.weekNumber === group.week) || null;
                      const weekSubjects = [...new Set(group.lessons.map((lesson) => lesson.subject).filter(Boolean))];
                      return (
                        <article
                        key={group.week}
                        className={`wa-lms-week ${isOpen ? 'is-open' : ''}`}
                        style={{ ['--week-accent' as string]: subjectPalette(group.lessons[0]?.subjectCode).ink }}
                      >
                        <div className="wa-lms-week-card">
                          <button
                            type="button"
                            className="wa-lms-week-head"
                            onClick={() => toggleWeek(group.week)}
                            aria-expanded={isOpen}
                          >
                            <span className="wa-lms-week-index" aria-hidden="true">
                              <small>Semana</small>
                              <strong>{String(group.week).padStart(2, '0')}</strong>
                            </span>
                            <span className="wa-lms-week-main">
                              <span className="wa-lms-week-kicker">{group.lessons.length} sesiones · {weekSubjects.filter(Boolean).length} materias</span>
                              <span className="wa-lms-week-title">{weekTitle(group.week, weekSubjects, isN2n)}</span>
                              <span className="wa-lms-week-subjects">
                                {weekSubjects.filter(Boolean).slice(0, 3).map((subject) => (
                                  <span key={subject} className="wa-lms-week-subject">
                                    <i /> {subject}
                                  </span>
                                ))}
                              </span>
                              <span className="wa-lms-week-meta">
                                {weekReviews.length > 0 && <span><LmsIcon name="book" size={12} /> repaso</span>}
                                {weekAssessments.length > 0 && <span><LmsIcon name="award" size={12} /> evaluación</span>}
                                <span className="wa-lms-week-date">Fecha por confirmar</span>
                              </span>
                            </span>
                            <span className="wa-lms-week-progress">
                              <span>{weekCompleted}/{group.lessons.length}</span>
                              <span className="wa-lms-bar"><i style={{ width: `${group.lessons.length ? (weekCompleted / group.lessons.length) * 100 : 0}%` }} /></span>
                              <LmsIcon name="chevron" size={17} />
                            </span>
                          </button>

                          {isOpen && (
                            <div className="wa-lms-week-body">
                              <div className="wa-lms-week-banner">
                                <div className="wa-lms-week-banner-copy">
                                  <span className="wa-lms-week-banner-kicker">
                                    Semana {String(group.week).padStart(2, '0')} · {group.lessons.length} sesiones
                                  </span>
                                  <strong>{weekTitle(group.week, weekSubjects, isN2n)}</strong>
                                  <div className="wa-lms-week-banner-chips">
                                    {weekSubjects.filter(Boolean).slice(0, 3).map((subject) => (
                                      <span key={subject}><i /> {subject}</span>
                                    ))}
                                  </div>
                                </div>
                                <div className="wa-lms-week-banner-media">
                                  <WeekImage week={group.week} />
                                  <div className="wa-lms-week-banner-texture" />
                                  <span className="wa-lms-week-banner-watermark" aria-hidden="true">{String(group.week).padStart(2, '0')}</span>
                                  <div className="wa-lms-week-banner-shade" />
                                </div>
                              </div>
                              <WeeklyMeetingCard
                                meeting={weekMeeting}
                                programId={program.id}
                                moduleId={activeModule?.id || null}
                                weekNumber={group.week}
                                canManage={canManageMeetings}
                              />
                              <div className="wa-lms-week-note">
                                <span><LmsIcon name="calendar" size={14} /> Semana {String(group.week).padStart(2, '0')} · {group.lessons.length} clases</span>
                                <span>{weekCompleted === group.lessons.length ? 'Semana completada' : `${weekCompleted} completadas`}</span>
                              </div>
                              <div className="wa-lms-class-list">
                                  {group.lessons.map((lesson) => (
                                    <LessonRow key={lesson.id} slug={slug} lesson={lesson} />
                                  ))}
                                </div>

                                {weekReviews.map((review) => (
                                  <div key={review.id} className="wa-lms-agenda-card is-review">
                                    <div className="wa-lms-agenda-icon"><LmsIcon name="book" size={18} /></div>
                                    <div>
                                      <span className="wa-lms-agenda-kicker">Repaso de preparación</span>
                                      <strong>{review.title}</strong>
                                      <small>{review.weekLabel} · material de apoyo con trazabilidad</small>
                                    </div>
                                    <div className="wa-lms-agenda-actions">
                                      <Link href={`/cursos/${slug}/repaso/${review.id}`} className="wa-lms-btn wa-lms-btn-small">
                                        Estudiar <LmsIcon name="arrow" size={14} />
                                      </Link>
                                      <a
                                        href={`/api/courses/${slug}/reviews/${review.id}?download=1`}
                                        className="wa-lms-icon-btn"
                                        aria-label={`Descargar ${review.title}`}
                                      >
                                        <LmsIcon name="download" size={16} />
                                      </a>
                                    </div>
                                  </div>
                                ))}

                                {weekAssessments.map((assessment) => (
                                  <div key={assessment.id} className="wa-lms-agenda-card is-exam">
                                    <div className="wa-lms-agenda-icon"><LmsIcon name="award" size={18} /></div>
                                    <div>
                                      <span className="wa-lms-agenda-kicker">
                                        {assessment.kind === 'midterm' ? 'Examen parcial' : assessment.kind === 'final' ? 'Examen final' : 'Práctica'}
                                      </span>
                                      <strong>{assessment.title}</strong>
                                      <small>
                                        {assessment.questionCount} preguntas · {assessment.attemptsAllowed} intento(s) · mínimo {program.passPercentage || 60}%
                                      </small>
                                    </div>
                                    <div className="wa-lms-agenda-actions">
                                      <Link href={`/cursos/${slug}/evaluacion/${assessment.id}`} className="wa-lms-btn wa-lms-btn-small">
                                        Abrir <LmsIcon name="arrow" size={14} />
                                      </Link>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                <CareerMap
                  modules={modules}
                  activeModuleId={activeModule?.id || ''}
                  onSelect={selectModule}
                />
              </section>
            )}

            {activeTab === 'materias' && (
              <SubjectsPanel
                modules={modules}
                activeModule={activeModule}
                subjects={subjects}
                onSelectModule={selectModule}
                onOpenSubject={(code) => {
                  setSubjectFilter(code);
                  setActiveTab('ruta');
                }}
              />
            )}

            {activeTab === 'faculty' && (
              <FacultyPanel
                semester={activeModule?.position || 1}
                semesterTitle={activeModule?.title || 'Semestre'}
              />
            )}

            {activeTab === 'recursos' && (
              <ResourcesPanel slug={slug} materials={materials} reviews={reviews} />
            )}

            {activeTab === 'evaluaciones' && (
              <AssessmentsPanel
                slug={slug}
                assessments={assessments}
                results={results}
                passPercentage={program.passPercentage || 60}
              />
            )}

            {activeTab === 'progreso' && (
              <ProgressPanel
                slug={slug}
                modules={modules}
                activeModule={activeModule}
                weeks={weeks}
                results={results}
                isStaff={isStaff}
                isTheology={isN2n}
                certificateAvailable={certificateAvailable}
                modulePercent={modulePercent}
                completedSemesters={completedSemesters}
                totalCompleted={progress.completedLessons}
                totalLessons={progress.totalLessons}
              />
            )}
          </main>

          <aside className="wa-lms-aside" aria-label="Resumen del programa">
            <div className="wa-lms-aside-card wa-lms-continue">
              <div className="wa-lms-aside-head">
                <span className="wa-lms-kicker">Continuar</span>
                <LmsIcon name="spark" size={16} />
              </div>
              {nextLesson ? (
                <>
                  <div className="wa-lms-continue-badge" style={{ ['--subject-ink' as string]: subjectPalette(nextLesson.subjectCode).ink, ['--subject-soft' as string]: subjectPalette(nextLesson.subjectCode).soft }}>
                    <span><LmsIcon name="play" size={24} /></span>
                    <small>{nextLesson.week ? `Semana ${String(nextLesson.week).padStart(2, '0')}` : 'Siguiente sesión'}</small>
                  </div>
                  <span className="wa-lms-subject-label">
                    {nextLesson.subject || 'Siguiente sesión'}
                  </span>
                  <strong className="wa-lms-continue-title">{nextLesson.title}</strong>
                  <span className="wa-lms-continue-meta">
                    {nextLesson.week ? `Semana ${String(nextLesson.week).padStart(2, '0')}` : 'Ruta'} · {nextLesson.pagesLabel ? `páginas ${nextLesson.pagesLabel}` : 'sesión'}
                  </span>
                  <Link className="wa-lms-btn wa-lms-btn-primary wa-lms-btn-block" href={`/cursos/${slug}/clase/${nextLesson.id}`}>
                    Abrir sesión <LmsIcon name="arrow" size={15} />
                  </Link>
                </>
              ) : (
                <p className="wa-lms-muted">No hay una sesión pendiente.</p>
              )}
            </div>

            <div className="wa-lms-aside-card">
              <div className="wa-lms-aside-head">
                <span className="wa-lms-kicker">Estado del semestre</span>
                <span className={`wa-lms-status ${progressTone(activeModule!)}`}>
                  {activeModule ? completionLabel(activeModule) : 'Pendiente'}
                </span>
              </div>
              <div className="wa-lms-mini-stat">
                <div><strong>{moduleProgress?.completedLessons || 0}</strong><span>de {moduleProgress?.totalLessons || 0} clases</span></div>
                <div><strong>{moduleProgress?.assessmentsPassed || 0}</strong><span>de {moduleProgress?.requiredAssessments || 0} exámenes</span></div>
              </div>
              <div className="wa-lms-bar wa-lms-bar-tall"><i style={{ width: `${modulePercent}%` }} /></div>
              {certificateAvailable ? (
                <a
                  className="wa-lms-btn wa-lms-btn-secondary wa-lms-btn-block"
                  href={`/api/courses/${slug}/semesters/${activeModule?.id}/certificate?download=1`}
                >
                  <LmsIcon name="award" size={16} /> Descargar certificado
                </a>
              ) : (
                <p className="wa-lms-hint">
                  <LmsIcon name="lock" size={13} /> El certificado se habilita al aprobar el semestre.
                </p>
              )}
            </div>

            <div className="wa-lms-aside-card">
              <div className="wa-lms-aside-head">
                <span className="wa-lms-kicker">Mapa de la carrera</span>
                <span className="wa-lms-count">{completedSemesters}/{modules.length}</span>
              </div>
              <div className="wa-lms-semester-list">
                {modules.map((module) => (
                  <button
                    key={module.id}
                    type="button"
                    className={`wa-lms-semester-item ${module.id === activeModule?.id ? 'is-active' : ''}`}
                    onClick={() => selectModule(module)}
                  >
                    <span className={`wa-lms-semester-dot ${progressTone(module)}`}>
                      {module.locked ? <LmsIcon name="lock" size={12} /> : module.completion?.completed ? <LmsIcon name="check" size={12} /> : String(module.position).padStart(2, '0')}
                    </span>
                    <span>
                      <strong>{module.title}</strong>
                      <small>{module.lessons.length ? `${module.lessons.length} clases` : module.subjects.length ? `${module.subjects.length} materias` : 'Contenido pendiente'}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="wa-lms-aside-card">
              <div className="wa-lms-aside-head">
                <span className="wa-lms-kicker">Materias</span>
                <span className="wa-lms-count">{subjects.length}</span>
              </div>
              <div className="wa-lms-mini-subjects">
                {subjects.map((subject) => {
                  const completed = subject.lessons.filter((lesson) => lesson.progress?.status === 'completed').length;
                  const palette = subjectPalette(subject.code);
                  return (
                    <button
                      key={subject.code}
                      type="button"
                      className="wa-lms-mini-subject"
                      onClick={() => {
                        setSubjectFilter(subject.code);
                        setActiveTab('ruta');
                      }}
                    >
                      <span className="wa-lms-mini-subject-dot" style={{ background: palette.ink }} />
                      <span>{subject.name}</span>
                      <small>{completed}/{subject.lessons.length}</small>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        <footer className="wa-lms-footer">
          <div className="wa-lms-footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/svg/wisdom-icon-color.svg" alt="" />
            <div>
              <strong>Wisdom Academy</strong>
              <span>{isN2n ? 'Educación para el ministerio' : 'Formación complementaria'}</span>
            </div>
          </div>
          <p>
            {isN2n
              ? 'Este programa no otorga título académico ni cuenta con aval académico. Los certificados son constancias ministeriales de estudio emitidas por Wisdom Academy.'
              : 'Las constancias de Wisdom Academy acreditan la finalización del programa y no sustituyen los documentos oficiales de la institución.'}
          </p>
        </footer>
      </div>
    </main>
  );
};

/* -------------------------------------------------------------------------- */
/* Subcomponents                                                              */
/* -------------------------------------------------------------------------- */

const LessonRow: React.FC<{ slug: string; lesson: LessonView }> = ({ slug, lesson }) => {
  const completed = lesson.progress?.status === 'completed';
  const inProgress = lesson.progress?.status === 'in_progress';
  const palette = subjectPalette(lesson.subjectCode);
  return (
    <Link href={`/cursos/${slug}/clase/${lesson.id}`} className={`wa-lms-class ${completed ? 'is-complete' : ''}`}>
      <div className="wa-lms-class-main">
        <div className="wa-lms-class-tags">
          <span className="wa-lms-subject-tag" style={{ ['--subject-ink' as string]: palette.ink }}>
            {lesson.subjectCode ? `${lesson.subjectCode} · ` : ''}{lesson.subject || 'Sesión'}
          </span>
          {completed && <span className="wa-lms-done-tag"><LmsIcon name="check" size={12} /> Completada</span>}
        </div>
        <strong>{lesson.title}</strong>
        <div className="wa-lms-class-meta">
          {lesson.pagesLabel && <span><LmsIcon name="book" size={13} /> Páginas {lesson.pagesLabel}</span>}
          {lesson.durationLabel && <span><LmsIcon name="clock" size={13} /> {lesson.durationLabel}</span>}
          <span><LmsIcon name="video" size={13} /> {lesson.videoIds.length} video{lesson.videoIds.length === 1 ? '' : 's'}</span>
          {lesson.materials.length > 0 && <span><LmsIcon name="file" size={13} /> {lesson.materials.length} material{lesson.materials.length === 1 ? '' : 'es'}</span>}
        </div>
      </div>
      <div className="wa-lms-class-action">
        <span>{completed ? 'Repasar' : inProgress ? 'Continuar' : 'Abrir'}</span>
        <LmsIcon name="arrow" size={16} />
      </div>
    </Link>
  );
};

const WEEK_IMAGES = Array.from({ length: 12 }, (_, index) => `/images/course-weeks/week-${String(index + 1).padStart(2, '0')}.jpg`);

const WeekImage: React.FC<{ week: number }> = ({ week }) => {
  const [failed, setFailed] = useState(false);
  const src = WEEK_IMAGES[(Math.max(1, week) - 1) % WEEK_IMAGES.length];
  if (failed) {
    return (
      <div className="wa-lms-week-banner-fallback">
        <span>{String(week).padStart(2, '0')}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="wa-lms-week-banner-img"
      loading="eager"
      onError={() => setFailed(true)}
    />
  );
};

const SubjectPlan: React.FC<{ subjects: ModuleView['subjects'] }> = ({ subjects }) => (
  <div className="wa-lms-plan-grid">
    {subjects.map((subject) => (
      <div key={subject.code} className="wa-lms-plan-card">
        <span className="wa-lms-plan-code">{subject.code}</span>
        <strong>{subject.name}</strong>
        <small>
          {subject.professor || 'Profesor por confirmar'}
          {subject.sessions ? ` · ${subject.sessions} sesiones` : ''}
        </small>
      </div>
    ))}
  </div>
);

const SubjectsPanel: React.FC<{
  modules: ModuleView[];
  activeModule: ModuleView | undefined;
  subjects: Array<{ code: string; name: string; lessons: LessonView[] }>;
  onSelectModule: (module: ModuleView) => void;
  onOpenSubject: (code: string) => void;
}> = ({ modules, activeModule, subjects, onSelectModule, onOpenSubject }) => {
  return (
    <section className="wa-lms-panel">
      <div className="wa-lms-section-head">
        <div>
          <span className="wa-lms-kicker">Malla curricular</span>
          <h2>Materias y profesores</h2>
          <p>Vista académica del semestre activo y de los siguientes semestres del programa.</p>
        </div>
      </div>

      <div className="wa-lms-subject-grid">
        {subjects.map((subject) => {
          const palette = subjectPalette(subject.code);
          const completed = subject.lessons.filter((lesson) => lesson.progress?.status === 'completed').length;
          const percent = subject.lessons.length ? Math.round((completed / subject.lessons.length) * 100) : 0;
          const planned = activeModule?.subjects.find((item) => item.code === subject.code);
          return (
            <article key={subject.code} className="wa-lms-subject-card" style={{ ['--subject' as string]: palette.ink, ['--subject-soft' as string]: palette.soft }}>
              <div className="wa-lms-subject-card-top">
                <span className="wa-lms-subject-code">{subject.code}</span>
                <span className="wa-lms-subject-percent">{subject.lessons.length ? `${percent}%` : 'Planificado'}</span>
              </div>
              <h3>{subject.name}</h3>
              <p>{planned?.professor || 'Profesor por confirmar'}</p>
              <div className="wa-lms-bar"><i style={{ width: `${percent}%` }} /></div>
              <div className="wa-lms-subject-card-foot">
                <span>{subject.lessons.length ? `${completed}/${subject.lessons.length} sesiones` : `${planned?.sessions || 0} sesiones planificadas`}</span>
                {subject.lessons.length ? (
                  <button type="button" className="wa-lms-table-link" onClick={() => onOpenSubject(subject.code)}>
                    Ver en la ruta <LmsIcon name="arrow" size={13} />
                  </button>
                ) : (
                  <span className="wa-lms-muted">Planificado</span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="wa-lms-card wa-lms-table-card">
        <div className="wa-lms-card-head">
          <div>
            <span className="wa-lms-kicker">Plan de estudios</span>
            <h3>Semestres y materias oficiales</h3>
          </div>
        </div>
        <div className="wa-lms-table-wrap">
          <table className="wa-lms-table">
            <thead>
              <tr>
                <th>Semestre</th>
                <th>Materias</th>
                <th>Sesiones</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => (
                <tr key={module.id} className={module.id === activeModule?.id ? 'is-active' : ''}>
                  <td><strong>{module.title}</strong></td>
                  <td>
                    {module.subjects.length
                      ? module.subjects.map((subject) => `${subject.code} · ${subject.name}`).join(' · ')
                      : 'Contenido pendiente de carga'}
                  </td>
                  <td>{module.lessons.length || '—'}</td>
                  <td><span className={`wa-lms-status ${progressTone(module)}`}>{completionLabel(module)}</span></td>
                  <td>
                    <button type="button" className="wa-lms-table-link" onClick={() => onSelectModule(module)}>
                      Abrir <LmsIcon name="arrow" size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

const ResourcesPanel: React.FC<{
  slug: string;
  materials: MaterialView[];
  reviews: ProgramDetail['reviews'];
}> = ({ slug, materials, reviews }) => {
  const iconFor = (kind: string): LmsIconName =>
    kind === 'drive_file' ? 'file' : kind === 'external_link' ? 'external' : kind === 'full_text' ? 'book' : 'file';
  return (
    <section className="wa-lms-panel">
      <div className="wa-lms-section-head">
        <div>
          <span className="wa-lms-kicker">Biblioteca del programa</span>
          <h2>Recursos y descargas</h2>
          <p>Textos, calendario y recursos oficiales. El acceso se verifica con tu sesión y tu derecho al programa.</p>
        </div>
      </div>

      <div className="wa-lms-resource-grid">
        {materials.map((material) => {
          const href = material.driveFileId
            ? `/api/courses/${slug}/materials/${material.id}/file?download=1`
            : material.url || (material.kind === 'text' ? `/api/courses/${slug}/materials/${material.id}?download=1` : null);
          return (
            <article key={material.id} className="wa-lms-resource-card">
              <div className="wa-lms-resource-icon"><LmsIcon name={iconFor(material.kind)} size={22} /></div>
              <div>
                <span className="wa-lms-resource-kind">
                  {material.kind === 'full_text' ? 'Texto completo' : material.kind === 'drive_file' ? 'Documento' : material.kind === 'external_link' ? 'Enlace externo' : 'Recurso'}
                </span>
                <h3>{material.title}</h3>
                <small>{material.visibility === 'staff' ? 'Acceso del personal académico' : 'Disponible para el estudiante'}</small>
              </div>
              {href ? (
                <a className="wa-lms-icon-btn" href={href} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${material.title}`}>
                  <LmsIcon name="download" size={17} />
                </a>
              ) : (
                <span className="wa-lms-icon-btn is-disabled"><LmsIcon name="lock" size={16} /></span>
              )}
            </article>
          );
        })}
      </div>

      {reviews.length > 0 && (
        <div className="wa-lms-card">
          <div className="wa-lms-card-head">
            <div>
              <span className="wa-lms-kicker">Preparación</span>
              <h3>Repasos del semestre</h3>
            </div>
          </div>
          <div className="wa-lms-agenda-list">
            {reviews.map((review) => (
              <div key={review.id} className="wa-lms-agenda-card is-review">
                <div className="wa-lms-agenda-icon"><LmsIcon name="book" size={18} /></div>
                <div>
                  <span className="wa-lms-agenda-kicker">{review.weekLabel}</span>
                  <strong>{review.title}</strong>
                  <small>{review.isAiGenerated ? 'Material de apoyo con IA y trazabilidad de fuentes' : 'Material de repaso'}</small>
                </div>
                <div className="wa-lms-agenda-actions">
                  <Link href={`/cursos/${slug}/repaso/${review.id}`} className="wa-lms-btn wa-lms-btn-small">
                    Estudiar <LmsIcon name="arrow" size={14} />
                  </Link>
                  <a className="wa-lms-icon-btn" href={`/api/courses/${slug}/reviews/${review.id}?download=1`} aria-label={`Descargar ${review.title}`}>
                    <LmsIcon name="download" size={16} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

const AssessmentsPanel: React.FC<{
  slug: string;
  assessments: ProgramDetail['assessments'];
  results: CourseAttemptResult[];
  passPercentage: number;
}> = ({ slug, assessments, results, passPercentage }) => (
  <section className="wa-lms-panel">
    <div className="wa-lms-section-head">
      <div>
        <span className="wa-lms-kicker">Evaluación</span>
        <h2>Evaluaciones del programa</h2>
        <p>Las claves y la revisión detallada son privadas del personal académico. La calificación se calcula en el servidor.</p>
      </div>
    </div>

    <div className="wa-lms-exam-grid">
      {assessments.map((assessment) => (
        <article key={assessment.id} className="wa-lms-exam-card">
          <div className="wa-lms-exam-top">
            <span className="wa-lms-exam-icon"><LmsIcon name="award" size={20} /></span>
            <span className={`wa-lms-status ${assessment.status === 'published' ? 'live' : 'pending'}`}>
              {assessment.status === 'published' ? 'Disponible' : assessment.status}
            </span>
          </div>
          <span className="wa-lms-kicker">
            {assessment.kind === 'midterm' ? 'Examen parcial' : assessment.kind === 'final' ? 'Examen final' : 'Práctica'}
          </span>
          <h3>{assessment.title}</h3>
          <div className="wa-lms-exam-meta">
            <span><LmsIcon name="file" size={13} /> {assessment.questionCount} preguntas</span>
            <span><LmsIcon name="target" size={13} /> mínimo {passPercentage}%</span>
            <span><LmsIcon name="layers" size={13} /> {assessment.attemptsAllowed} intento(s)</span>
          </div>
          {assessment.status === 'published' ? (
            <Link className="wa-lms-btn wa-lms-btn-primary wa-lms-btn-block" href={`/cursos/${slug}/evaluacion/${assessment.id}`}>
              Ver instrucciones <LmsIcon name="arrow" size={15} />
            </Link>
          ) : (
            <span className="wa-lms-muted">Aún no publicada</span>
          )}
        </article>
      ))}
    </div>

    {results.length > 0 && (
      <div className="wa-lms-card wa-lms-table-card">
        <div className="wa-lms-card-head">
          <div>
            <span className="wa-lms-kicker">Mi historial</span>
            <h3>Resultados registrados</h3>
          </div>
        </div>
        <div className="wa-lms-table-wrap">
          <table className="wa-lms-table">
            <thead>
              <tr>
                <th>Evaluación</th>
                <th>Intento</th>
                <th>Calificación</th>
                <th>Aciertos</th>
                <th>Fecha</th>
                <th>Informe</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.attemptId}>
                  <td>{result.assessmentTitle}</td>
                  <td>{result.attemptNumber}</td>
                  <td><strong>{result.percentage === null ? '—' : `${result.percentage.toFixed(2)} %`}</strong></td>
                  <td>{result.correctCount === null ? '—' : `${result.correctCount}/${result.totalQuestions}`}</td>
                  <td>{result.submittedAt ? formatDateLabel(result.submittedAt) : '—'}</td>
                  <td>
                    <a className="wa-lms-table-link" href={`/api/courses/${slug}/attempts/${result.attemptId}/report?download=1`}>
                      Descargar
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}
  </section>
);

const ProgressPanel: React.FC<{
  slug: string;
  modules: ModuleView[];
  activeModule: ModuleView | undefined;
  weeks: Array<{ week: number; lessons: LessonView[] }>;
  results: CourseAttemptResult[];
  isStaff: boolean;
  isTheology: boolean;
  certificateAvailable: boolean;
  modulePercent: number;
  completedSemesters: number;
  totalCompleted: number;
  totalLessons: number;
}> = ({
  slug,
  modules,
  activeModule,
  weeks,
  results,
  isStaff,
  isTheology,
  certificateAvailable,
  modulePercent,
  completedSemesters,
  totalCompleted,
  totalLessons,
}) => (
  <section className="wa-lms-panel">
    <div className="wa-lms-section-head">
      <div>
        <span className="wa-lms-kicker">Mi progreso</span>
        <h2>Tu avance, en contexto</h2>
        <p>Progreso del contenido cargado y estado de aprobación del semestre activo.</p>
      </div>
    </div>

    <div className="wa-lms-stats">
      <div className="wa-lms-stat"><span><LmsIcon name="play" size={17} /></span><strong>{totalCompleted}</strong><small>clases completadas de {totalLessons}</small></div>
      <div className="wa-lms-stat"><span><LmsIcon name="award" size={17} /></span><strong>{results.length}</strong><small>evaluaciones rendidas</small></div>
      <div className="wa-lms-stat"><span><LmsIcon name="check" size={17} /></span><strong>{completedSemesters}</strong><small>semestres aprobados de {modules.length}</small></div>
      <div className="wa-lms-stat"><span><LmsIcon name="target" size={17} /></span><strong>{modulePercent}%</strong><small>{activeModule?.title || 'Semestre activo'}</small></div>
    </div>

    <div className="wa-lms-card">
      <div className="wa-lms-card-head">
        <div>
          <span className="wa-lms-kicker">Mapa semanal</span>
          <h3>{activeModule?.title || 'Semestre'} · cumplimiento por semana</h3>
        </div>
        <span className="wa-lms-status live">{weeks.length} semanas</span>
      </div>
      <div className="wa-lms-week-grid">
        {weeks.map((group) => {
          const completed = group.lessons.filter((lesson) => lesson.progress?.status === 'completed').length;
          const percent = group.lessons.length ? Math.round((completed / group.lessons.length) * 100) : 0;
          return (
            <div key={group.week} className={`wa-lms-week-cell ${percent === 100 ? 'is-done' : percent > 0 ? 'is-progress' : ''}`}>
              <span>Semana {String(group.week).padStart(2, '0')}</span>
              <strong>{completed}/{group.lessons.length}</strong>
              <div className="wa-lms-bar"><i style={{ width: `${percent}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>

    <div className={`wa-lms-certificate ${certificateAvailable ? 'is-available' : ''}`}>
      <div className="wa-lms-certificate-icon"><LmsIcon name="award" size={30} /></div>
      <div>
        <span className="wa-lms-kicker">{isTheology ? 'Certificación ministerial' : 'Constancia del programa'}</span>
        <h3>{certificateAvailable ? 'Tu certificado del semestre está disponible' : 'Certificado del semestre'}</h3>
        <p>
          {certificateAvailable
            ? `Descarga tu constancia ${isTheology ? 'ministerial de estudios' : 'de finalización'} del semestre aprobado.`
            : `Completa las sesiones y aprueba las evaluaciones del semestre para habilitar tu constancia ${isTheology ? 'ministerial' : 'de finalización'}.`}
        </p>
      </div>
      {certificateAvailable && activeModule && !isStaff ? (
        <a className="wa-lms-btn wa-lms-btn-primary" href={`/api/courses/${slug}/semesters/${activeModule.id}/certificate?download=1`}>
          <LmsIcon name="download" size={16} /> Descargar certificado
        </a>
      ) : (
        <span className="wa-lms-status pending"><LmsIcon name="lock" size={12} /> Pendiente</span>
      )}
    </div>

    <div className="wa-lms-note">
      <LmsIcon name="shield" size={16} />
      <p>
        {isTheology
          ? 'Este certificado acredita formación para el ministerio. No es un título académico, no confiere grado académico y no cuenta con aval académico.'
          : 'Esta constancia acredita la finalización del semestre dentro de Wisdom Academy y no sustituye los documentos oficiales de la institución.'}
      </p>
    </div>
  </section>
);

const CareerMap: React.FC<{
  modules: ModuleView[];
  activeModuleId: string;
  onSelect: (module: ModuleView) => void;
}> = ({ modules, activeModuleId, onSelect }) => (
  <div className="wa-lms-career">
    <div className="wa-lms-section-head">
      <div>
        <span className="wa-lms-kicker">Visión completa</span>
        <h2>Mapa de la carrera</h2>
        <p>La ruta avanza semestre a semestre. Los semestres futuros se habilitan al aprobar el anterior.</p>
      </div>
    </div>
    <div className="wa-lms-career-grid">
      {modules.map((module) => (
        <button
          key={module.id}
          type="button"
          className={`wa-lms-career-card ${module.id === activeModuleId ? 'is-active' : ''} ${module.locked ? 'is-locked' : ''}`}
          onClick={() => onSelect(module)}
        >
          <div className="wa-lms-career-top">
            <span className={`wa-lms-semester-dot ${progressTone(module)}`}>
              {module.locked ? <LmsIcon name="lock" size={12} /> : module.completion?.completed ? <LmsIcon name="check" size={12} /> : String(module.position).padStart(2, '0')}
            </span>
            <span className={`wa-lms-status ${progressTone(module)}`}>{completionLabel(module)}</span>
          </div>
          <strong>{module.title}</strong>
          <small>
            {module.lessons.length
              ? `${module.lessons.length} clases cargadas`
              : module.subjects.length
                ? `${module.subjects.length} materias planificadas`
                : 'Contenido pendiente'}
          </small>
          <div className="wa-lms-career-subjects">
            {module.subjects.slice(0, 3).map((subject) => (
              <span key={subject.code} style={{ ['--subject' as string]: subjectPalette(subject.code).ink }}>
                <i /> {subject.name}
              </span>
            ))}
          </div>
          <LmsIcon name="arrow" size={16} />
        </button>
      ))}
    </div>
  </div>
);

function weekTitle(week: number, subjects: Array<string | null>, isN2n: boolean): string {
  const unique = [...new Set(subjects.filter((subject): subject is string => Boolean(subject)))];
  if (isN2n) {
    if (week === 5) return 'Cierre de la primera etapa y repaso';
    if (week === 6) return 'Examen parcial';
    if (week === 11) return 'Consolidación y repaso final';
    if (week === 12) return 'Examen final';
  }
  if (unique.length === 1) return unique[0];
  if (unique.length > 1) return unique.slice(0, 2).join(' + ');
  return `Semana ${String(week).padStart(2, '0')}`;
}

/* -------------------------------------------------------------------------- */
/* Iconography                                                                */
/* -------------------------------------------------------------------------- */

type LmsIconName =
  | 'calendar' | 'book' | 'folder' | 'award' | 'target' | 'play' | 'clock'
  | 'lock' | 'check' | 'download' | 'arrow' | 'layers' | 'file' | 'video'
  | 'users' | 'spark' | 'chevron' | 'external' | 'filter' | 'shield' | 'eye';

const ICON_PATHS: Record<LmsIconName, React.ReactNode> = {
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
  book: <><path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v18H7.5A2.5 2.5 0 0 0 5 22V4.5Z" /><path d="M5 17.5A2.5 2.5 0 0 1 7.5 15H20" /></>,
  folder: <path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />,
  award: <><circle cx="12" cy="9" r="5" /><path d="m8.5 13.5-1 8 4.5-2.5 4.5 2.5-1-8" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /></>,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  clock: <><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 19h16" /></>,
  arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
  file: <><path d="M6 2h8l4 4v16H6V2Z" /><path d="M14 2v5h5M9 13h6M9 17h6" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" /><path d="M16 5a3 3 0 0 1 0 6M18 15c2 .6 3 2.2 3 5" /></>,
  spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  external: <><path d="M14 4h6v6" /><path d="M20 4 11 13" /><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" /></>,
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
  shield: <><path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
};

const LmsIcon: React.FC<{ name: LmsIconName; size?: number }> = ({ name, size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {ICON_PATHS[name]}
  </svg>
);
