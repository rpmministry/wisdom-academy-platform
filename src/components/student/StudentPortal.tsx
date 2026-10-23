'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import * as Tabs from '@radix-ui/react-tabs';
import * as Accordion from '@radix-ui/react-accordion';
import { useAuth } from '@/lib/auth/authContext';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

interface ScheduleBlock {
  bloque: number;
  hora: string;
  materia: string;
  modalidad: 'AGENTE_IA_OPENMAIC' | 'TUTORIA_PROFESOR_REAL';
  plataforma?: string;
}

interface SubjectView {
  codigo: string;
  nombre: string;
  nombreCorto: string;
  area: string;
  profesorIA: string;
  unidades: number;
  primeraUnidad: string | null;
  conceptos: string[];
  enfoque: string;
  colorIndex: number;
  calificaciones: Array<{ trimestre: number; nota: number }>;
}

interface PortalPlan {
  id: string;
  dia: number;
  fecha: string;
  semana: number;
  trimestre: number;
  titulo: string;
  materias: Array<{ subject: string; topic: string; objective: string | null }>;
  guiaUrl: string;
}

interface PortalData {
  perfil: {
    nombre: string;
    grado: string;
    subnivel: string;
    edad: number;
    docente: string;
    anoLectivo: string;
    codigoCarpeta: string;
    totalAsignaturas: number;
    totalUnidades: number;
    horario: Record<string, ScheduleBlock[]>;
  } | null;
  horario: Record<string, ScheduleBlock[]>;
  asignaturas: SubjectView[];
  calendario: {
    id: string;
    nombre: string;
    inicio: string;
    fin: string;
    diasLectivos: number;
  } | null;
  resumen: {
    planesGenerados: number;
    diasCompletados: number;
    progreso: number;
    asignaturas: number;
    unidades: number;
  } | null;
  planes: PortalPlan[];
  eventos: Array<{ event_date: string; title: string; kind: string; description: string | null }>;
}

const DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];

const SUBJECT_COLORS = [
  { bg: 'rgba(37, 99, 235, 0.12)', icon: '#2563eb' },
  { bg: 'rgba(5, 150, 105, 0.12)', icon: '#059669' },
  { bg: 'rgba(217, 119, 6, 0.14)', icon: '#b45309' },
  { bg: 'rgba(124, 58, 237, 0.12)', icon: '#7c3aed' },
  { bg: 'rgba(14, 116, 144, 0.12)', icon: '#0e7490' },
];

function formatDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-EC', { weekday: 'short', day: '2-digit', month: 'short' }).format(
    new Date(`${value}T12:00:00`)
  );
}

function formatLongDate(value: string | null): string {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${value}T12:00:00`)
  );
}

function todayKey(): string {
  const name = new Intl.DateTimeFormat('es-EC', { weekday: 'long' }).format(new Date());
  const normalized = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  return normalized === 'Miércoles' ? 'Miercoles' : normalized;
}

export function StudentPortal() {
  const { usuario, sesionLista, tienePermiso, accesoContenidoGlobal } = useAuth();
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    setError(null);
    try {
      const response = await apiFetch<PortalData>('/api/me/portal');
      setData(response);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  useEffect(() => {
    if (sesionLista) void cargar();
  }, [sesionLista, cargar]);

  const todayName = useMemo(todayKey, []);
  const todayBlocks = data?.horario?.[todayName] || [];
  const nextPlan = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return data?.planes.find((plan) => plan.fecha >= today) || data?.planes[0] || null;
  }, [data]);
  const perfil = data?.perfil;
  const subjects = data?.asignaturas || [];
  const schedule = data?.horario || {};

  if (!sesionLista || cargando) {
    return (
      <main className="wa-student-page">
        <div className="wa-student-loading" role="status">
          <span className="wa-student-loading-ring" aria-hidden="true" />
          Cargando tu espacio académico…
        </div>
      </main>
    );
  }

  if (!usuario) {
    return (
      <main className="wa-student-page">
        <div className="wa-student-loading">Inicia sesión para acceder a tu portal.</div>
      </main>
    );
  }

  return (
    <main className="wa-student-page">
      <div className="wa-student-shell">
        <nav className="wa-quicklinks" aria-label="Accesos rápidos del portal">
          <Link href="/cursos" className="wa-quicklink">
            <span className="wa-quicklink-icon"><WisdomIcon name="book" size={17} /></span>
            <span>
              <strong>Cursos y talleres</strong>
              <small>Tu ruta de aprendizaje</small>
            </span>
          </Link>
          <Link href="/aula" className="wa-quicklink">
            <span className="wa-quicklink-icon"><WisdomIcon name="chalkboard" size={17} /></span>
            <span>
              <strong>Aula virtual</strong>
              <small>Clases y acompañamiento</small>
            </span>
          </Link>
          <Link
            href={tienePermiso('admin.access') ? '/admin?tab=crm&crm=usuarios' : '/mi-acceso'}
            className="wa-quicklink"
          >
            <span className="wa-quicklink-icon"><WisdomIcon name="shield" size={17} /></span>
            <span>
              <strong>{tienePermiso('admin.access') ? 'Accesos CRM' : 'Mi acceso'}</strong>
              <small>{tienePermiso('admin.access') ? 'Usuarios y derechos' : 'Derechos y vigencia'}</small>
            </span>
          </Link>
          {accesoContenidoGlobal ? (
            <Link href="/contenidos" className="wa-quicklink">
              <span className="wa-quicklink-icon"><WisdomIcon name="layout" size={17} /></span>
              <span>
                <strong>Contenidos</strong>
                <small>Biblioteca formativa</small>
              </span>
            </Link>
          ) : (
            <Link href="/catalogo#programas" className="wa-quicklink">
              <span className="wa-quicklink-icon"><WisdomIcon name="graduation-cap" size={17} /></span>
              <span>
                <strong>Catálogo</strong>
                <small>Explora programas</small>
              </span>
            </Link>
          )}
          {tienePermiso('admin.access') && (
            <Link href="/admin" className="wa-quicklink">
              <span className="wa-quicklink-icon"><WisdomIcon name="settings" size={17} /></span>
              <span>
                <strong>Administración</strong>
                <small>Panel de gestión</small>
              </span>
            </Link>
          )}
        </nav>

        {error && (
          <div className="wa-student-alert" role="alert">
            {error}
            <Button variant="secondary" size="sm" onClick={() => void cargar()}>Reintentar</Button>
          </div>
        )}

        {!perfil ? (
          <section className="wa-student-general">
            <div className="wa-student-general-hero">
              <span className="wa-catalog-kicker">Portal de cuenta</span>
              <h1>Bienvenido, {usuario.nombreCompleto}</h1>
              <p>
                Esta cuenta no tiene un expediente escolar activo. Puedes gestionar tus accesos,
                explorar programas y continuar tu formación profesional.
              </p>
              <div className="wa-student-general-actions">
                <ButtonLink href="/catalogo#programas" variant="primary-gold">Explorar catálogo</ButtonLink>
                <ButtonLink href="/mi-acceso" variant="secondary">Ver mis accesos</ButtonLink>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="wa-student-hero">
              <div className="wa-student-identity">
                <div className="wa-student-avatar" aria-hidden="true">
                  {perfil.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="wa-catalog-kicker">{perfil.subnivel}</span>
                  <h1>{perfil.nombre}</h1>
                  <p>
                    {perfil.grado} · {perfil.edad} años · Docente titular: <strong>{perfil.docente}</strong>
                  </p>
                  <div className="wa-student-hero-badges">
                    <Badge variant="navy" size="sm">{perfil.anoLectivo}</Badge>
                    <Badge variant="emerald" size="sm">{perfil.totalAsignaturas} asignaturas</Badge>
                    <Badge variant="gold" size="sm">{data.resumen?.planesGenerados || 0} guías anuales</Badge>
                  </div>
                </div>
              </div>
              <div className="wa-student-hero-actions">
                <ButtonLink href="/aula" variant="primary-gold" size="lg">Entrar al aula OpenMAIC</ButtonLink>
                {nextPlan && (
                  <ButtonLink
                    href={nextPlan.guiaUrl}
                    target="_blank"
                    rel="noreferrer"
                    variant="secondary"
                    size="lg"
                  >
                    Abrir guía del día
                  </ButtonLink>
                )}
              </div>
            </section>

            <section className="wa-student-progress" aria-label="Progreso del ciclo">
              <div>
                <span>Progreso del ciclo</span>
                <strong>{data.resumen?.progreso || 0}%</strong>
                <div className="wa-crm-progress"><span style={{ width: `${data.resumen?.progreso || 0}%` }} /></div>
              </div>
              <div><strong>{data.resumen?.unidades || 0}</strong><span>unidades curriculares</span></div>
              <div><strong>{data.calendario?.diasLectivos || 0}</strong><span>días de referencia</span></div>
              <div><strong>{data.calendario?.fin || '—'}</strong><span>cierre del ciclo</span></div>
            </section>

            <Tabs.Root defaultValue="resumen" className="wa-student-tabs">
              <Tabs.List className="wa-student-tabs-list" aria-label="Secciones del portal del estudiante">
                <Tabs.Trigger value="resumen" className="wa-student-tab">
                  <WisdomIcon name="chart" size={15} color="current" /> Resumen
                </Tabs.Trigger>
                <Tabs.Trigger value="horario" className="wa-student-tab">
                  <WisdomIcon name="calendar" size={15} color="current" /> Horario
                </Tabs.Trigger>
                <Tabs.Trigger value="calendario" className="wa-student-tab">
                  <WisdomIcon name="calendar" size={15} color="current" /> Calendario
                </Tabs.Trigger>
                <Tabs.Trigger value="ruta" className="wa-student-tab">
                  <WisdomIcon name="book" size={15} color="current" /> Ruta diaria
                </Tabs.Trigger>
                <Tabs.Trigger value="materias" className="wa-student-tab">
                  <WisdomIcon name="graduation-cap" size={15} color="current" /> Materias
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="resumen" className="wa-student-tab-panel">
                <div className="wa-student-kpis">
                  <article><WisdomIcon name="book" size={18} color="#2563eb" /><strong>{perfil.totalAsignaturas}</strong><span>asignaturas activas</span></article>
                  <article><WisdomIcon name="graduation-cap" size={18} color="#059669" /><strong>{perfil.totalUnidades}</strong><span>unidades de aprendizaje</span></article>
                  <article><WisdomIcon name="calendar" size={18} color="#b45309" /><strong>{data.resumen?.diasCompletados || 0}</strong><span>días completados</span></article>
                  <article><WisdomIcon name="sparkles" size={18} color="#7c3aed" /><strong>{todayBlocks.length}</strong><span>bloques para hoy</span></article>
                </div>

                <div className="wa-student-two-col">
                  <article className="wa-student-card">
                    <div className="wa-student-card-head">
                      <div><span className="wa-student-eyebrow">Hoy · {todayName}</span><h2>Tu jornada</h2></div>
                      <Badge variant="emerald" size="sm">Horario personal</Badge>
                    </div>
                    {todayBlocks.length > 0 ? (
                      <div className="wa-student-today">
                        {todayBlocks.map((block) => (
                          <div key={`${block.bloque}-${block.materia}`} className="wa-student-today-block">
                            <span>{block.hora}</span>
                            <strong>{block.materia}</strong>
                            <Badge variant={block.modalidad === 'TUTORIA_PROFESOR_REAL' ? 'gold' : 'navy'} size="sm">
                              {block.modalidad === 'TUTORIA_PROFESOR_REAL' ? 'Tutoría humana' : 'IA + práctica'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="wa-student-muted">Hoy no hay bloques programados. Consulta el horario semanal.</p>
                    )}
                  </article>

                  <article className="wa-student-card">
                    <div className="wa-student-card-head">
                      <div><span className="wa-student-eyebrow">Siguiente hito</span><h2>Ruta de aprendizaje</h2></div>
                      {nextPlan && <Badge variant="gold" size="sm">Día {nextPlan.dia}</Badge>}
                    </div>
                    {nextPlan ? (
                      <>
                        <p className="wa-student-muted">{formatLongDate(nextPlan.fecha)}</p>
                        <div className="wa-student-route-preview">
                          {nextPlan.materias.slice(0, 4).map((materia) => (
                            <div key={`${nextPlan.id}-${materia.subject}`}>
                              <strong>{materia.subject}</strong>
                              <span>{materia.topic}</span>
                            </div>
                          ))}
                        </div>
                        <a href={nextPlan.guiaUrl} target="_blank" rel="noreferrer" className="wa-student-link">
                          Abrir guía completa →
                        </a>
                      </>
                    ) : (
                      <p className="wa-student-muted">La ruta diaria se generará cuando se active el calendario.</p>
                    )}
                  </article>
                </div>

                {data.eventos.length > 0 && (
                  <article className="wa-student-card">
                    <div className="wa-student-card-head"><div><span className="wa-student-eyebrow">Calendario</span><h2>Próximos eventos</h2></div></div>
                    <div className="wa-student-events">
                      {data.eventos.slice(0, 4).map((event) => (
                        <div key={`${event.event_date}-${event.title}`}>
                          <strong>{formatDate(event.event_date)}</strong>
                          <span>{event.title}</span>
                        </div>
                      ))}
                    </div>
                  </article>
                )}
              </Tabs.Content>

              <Tabs.Content value="horario" className="wa-student-tab-panel">
                <div className="wa-student-card">
                  <div className="wa-student-card-head">
                    <div>
                      <span className="wa-student-eyebrow">Semana personalizada</span>
                      <h2>Horario semanal de {perfil.nombre}</h2>
                    </div>
                    <Badge variant="navy" size="sm">{perfil.grado}</Badge>
                  </div>
                  <div className="wa-student-schedule-scroll">
                    <div className="wa-student-schedule">
                      {DAYS.map((day) => (
                        <div key={day} className={`wa-student-day${day === todayName ? ' is-today' : ''}`}>
                          <h3>{day}</h3>
                          {(schedule[day] || []).map((block) => (
                            <div key={`${day}-${block.bloque}`} className={`wa-student-block${block.modalidad === 'TUTORIA_PROFESOR_REAL' ? ' is-human' : ''}`}>
                              <span>{block.hora}</span>
                              <strong>{block.materia}</strong>
                              <small>{block.modalidad === 'TUTORIA_PROFESOR_REAL' ? 'Tutoría humana' : 'OpenMAIC IA'}</small>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="wa-student-note">
                    El horario se genera desde el perfil curricular individual. Puede ajustarse por la
                    coordinación académica sin alterar el avance de las demás asignaturas.
                  </p>
                </div>
              </Tabs.Content>

              <Tabs.Content value="calendario" className="wa-student-tab-panel">
                <div className="wa-student-two-col">
                  <article className="wa-student-card">
                    <div className="wa-student-card-head"><div><span className="wa-student-eyebrow">Ciclo flexible</span><h2>{data.calendario?.nombre || 'Calendario académico'}</h2></div></div>
                    <div className="wa-student-calendar-summary">
                      <div><span>Inicio</span><strong>{formatLongDate(data.calendario?.inicio || null)}</strong></div>
                      <div><span>Cierre</span><strong>{formatLongDate(data.calendario?.fin || null)}</strong></div>
                      <div><span>Días de referencia</span><strong>{data.calendario?.diasLectivos || 0}</strong></div>
                      <div><span>Progreso</span><strong>{data.resumen?.progreso || 0}%</strong></div>
                    </div>
                    <div className="wa-crm-progress"><span style={{ width: `${data.resumen?.progreso || 0}%` }} /></div>
                    <p className="wa-student-note">Calendario adaptable: la coordinación puede ajustar días, pausas y ritmo según el proyecto familiar.</p>
                  </article>
                  <article className="wa-student-card">
                    <div className="wa-student-card-head"><div><span className="wa-student-eyebrow">Eventos</span><h2>Fechas importantes</h2></div></div>
                    <div className="wa-student-events">
                      {data.eventos.map((event) => (
                        <div key={`${event.event_date}-${event.title}`}>
                          <strong>{formatDate(event.event_date)}</strong>
                          <span>{event.title}</span>
                        </div>
                      ))}
                      {data.eventos.length === 0 && <p className="wa-student-muted">Sin eventos próximos.</p>}
                    </div>
                  </article>
                </div>
                <div className="wa-student-card" style={{ marginTop: '1rem' }}>
                  <div className="wa-student-card-head"><div><span className="wa-student-eyebrow">Próximos días</span><h2>Agenda de estudio</h2></div></div>
                  <div className="wa-student-upcoming">
                    {data.planes.slice(0, 8).map((plan) => (
                      <a key={plan.id} href={plan.guiaUrl} target="_blank" rel="noreferrer" className="wa-student-upcoming-row">
                        <span>{formatDate(plan.fecha)}</span>
                        <strong>{plan.materias[0]?.topic || `Día ${plan.dia}`}</strong>
                        <small>{plan.materias.map((materia) => materia.subject).slice(0, 3).join(' · ')}</small>
                        <WisdomIcon name="arrow-right" size={14} color="current" />
                      </a>
                    ))}
                  </div>
                </div>
              </Tabs.Content>

              <Tabs.Content value="ruta" className="wa-student-tab-panel">
                <div className="wa-student-card">
                  <div className="wa-student-card-head">
                    <div><span className="wa-student-eyebrow">Ruta diaria autónoma</span><h2>Los próximos días, paso a paso</h2></div>
                    <Badge variant="emerald" size="sm">{data.planes.length} días disponibles</Badge>
                  </div>
                  <Accordion.Root type="single" collapsible className="wa-student-accordion">
                    {data.planes.map((plan) => (
                      <Accordion.Item key={plan.id} value={plan.id} className="wa-student-accordion-item">
                        <Accordion.Header>
                          <Accordion.Trigger className="wa-student-accordion-trigger">
                            <span>
                              <strong>Día {plan.dia} · Semana {plan.semana}</strong>
                              <small>{formatLongDate(plan.fecha)}</small>
                            </span>
                            <span className="wa-student-accordion-icon" aria-hidden="true">+</span>
                          </Accordion.Trigger>
                        </Accordion.Header>
                        <Accordion.Content className="wa-student-accordion-content">
                          <div className="wa-student-roadmap">
                            {plan.materias.map((materia) => (
                              <div key={`${plan.id}-${materia.subject}`}>
                                <Badge variant="navy" size="sm">{materia.subject}</Badge>
                                <strong>{materia.topic}</strong>
                                {materia.objective && <p>{materia.objective}</p>}
                              </div>
                            ))}
                          </div>
                          <a href={plan.guiaUrl} target="_blank" rel="noreferrer">
                            <Button variant="primary-gold" size="sm">Abrir guía del día</Button>
                          </a>
                        </Accordion.Content>
                      </Accordion.Item>
                    ))}
                  </Accordion.Root>
                </div>
              </Tabs.Content>

              <Tabs.Content value="materias" className="wa-student-tab-panel">
                <div className="wa-student-subjects">
                  {subjects.map((subject) => {
                    const color = SUBJECT_COLORS[subject.colorIndex] || SUBJECT_COLORS[0];
                    return (
                      <article key={subject.codigo} className="wa-student-subject">
                        <div className="wa-student-subject-icon" style={{ background: color.bg }}>
                          <WisdomIcon name="book" size={18} color={color.icon} />
                        </div>
                        <div>
                          <div className="wa-student-subject-head">
                            <h3>{subject.nombre}</h3>
                            <Badge variant="subtle" size="sm">{subject.unidades} unidades</Badge>
                          </div>
                          <p>{subject.primeraUnidad || subject.enfoque}</p>
                          <div className="wa-student-subject-meta">
                            <span>{subject.profesorIA}</span>
                            <span>{subject.area.replaceAll('_', ' ').toLowerCase()}</span>
                            {subject.calificaciones.length > 0 && (
                              <span>Promedio {(
                                subject.calificaciones.reduce((total, grade) => total + grade.nota, 0) /
                                subject.calificaciones.length
                              ).toFixed(1)}</span>
                            )}
                          </div>
                          <div className="wa-student-subject-tags">
                            {subject.conceptos.map((concept) => (
                              <span key={concept}>{concept}</span>
                            ))}
                          </div>
                          <Link href="/aula" className="wa-student-link">Abrir aula →</Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </>
        )}
      </div>
    </main>
  );
}

