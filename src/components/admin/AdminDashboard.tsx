'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Panel Administrativo Integral
 * ARCHIVO: src/components/admin/AdminDashboard.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Centro de mando administrativo, académico, legal y de IA de Wisdom Academy:
 * 1. Control de acceso RBAC: Acceso restringido para 'ADMIN' y 'TEACHER'.
 * 2. Gestión de Estudiantes y Credenciales (altas, bajas, reseteo de claves).
 * 3. Matriculación de Estudiantes (Enrolments estilo Moodle).
 * 4. Gestión de Cursos y Profesores IA (OpenMAIC + Moodle): bancos y tareas.
 * 5. Libro Maestro de Calificaciones (Gradebook oficial con auditoría).
 * 6. Boletines Trimestrales MINEDUC Ecuador (Régimen Sierra-Amazonía).
 * 7. Emisión de Certificados Verificables con Cripto-Hash SHA-256 y QR.
 * 8. Catálogo Curricular de los 14 años de educación y talleres libres.
 * ==============================================================================
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/authContext';
import { ESTUDIANTE_AVRIL_INICIAL, ESTUDIANTE_GAEL_INICIAL, EstudianteWisdom } from '@/types/wisdom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { TabItem } from '@/components/ui/Tabs';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { StudentCredentialsManager } from './StudentCredentialsManager';
import { MoodleEnrolmentsManager } from './MoodleEnrolmentsManager';
import { AIProfessorsAndCoursesManager } from './AIProfessorsAndCoursesManager';
import { MasterGradebookManager } from './MasterGradebookManager';
import { EcuadorPortfolioManager } from './EcuadorPortfolioManager';
import { EcuadorOfficialReportCardGenerator } from './EcuadorOfficialReportCardGenerator';
import { CertificateGenerator } from './CertificateGenerator';
import { WorkshopsAndGradesCatalog } from './WorkshopsAndGradesCatalog';
import { CoursesWorkshopsManager } from './CoursesWorkshopsManager';
import { AdminTabErrorBoundary } from './AdminTabErrorBoundary';
import { DailyGuideAdminPanel } from './DailyGuideAdminPanel';
import { EducationalResourcesAdminPanel } from './EducationalResourcesAdminPanel';
import { CrmDashboard } from '@/components/crm/CrmDashboard';
import { MeetingsAdminPanel } from './MeetingsAdminPanel';
import { AdminWorkspaceShell } from './AdminWorkspaceShell';

export const AdminDashboard: React.FC<{ initialTab?: string; allowInitialTab?: boolean }> = ({
  initialTab = 'crm',
  allowInitialTab = false,
}) => {
  const { usuario, tienePermiso, temaOscuro, alternarTema } = useAuth();
  const [tabActiva, setTabActiva] = useState<string>(initialTab);
  const [subTabBoletines, setSubTabBoletines] = useState<'oficial_a4' | 'portafolio'>('oficial_a4');
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<EstudianteWisdom>(ESTUDIANTE_AVRIL_INICIAL);

  // Definición de las pestañas del centro de control
  const tabs: TabItem[] = [
    { id: 'crm', label: 'CRM · Dirección', icono: <WisdomIcon name="layout" size={16} /> },
    { id: 'cursos', label: 'Cursos y talleres', icono: <WisdomIcon name="book" size={16} /> },
    { id: 'meetings', label: 'Videollamadas', icono: <WisdomIcon name="video" size={16} /> },
    { id: 'estudiantes', label: 'Estudiantes y claves', icono: <WisdomIcon name="user" size={16} /> },
    { id: 'matriculas', label: 'Matrícula', icono: <WisdomIcon name="graduation-cap" size={16} /> },
    { id: 'profesores', label: 'Profesores IA', icono: <WisdomIcon name="sparkles" size={16} /> },
    { id: 'guias-diarias', label: 'Guías diarias', icono: <WisdomIcon name="file-text" size={16} /> },
    { id: 'gradebook', label: 'Calificaciones', icono: <WisdomIcon name="award" size={16} /> },
    { id: 'boletines', label: 'Boletines', icono: <WisdomIcon name="file-text" size={16} /> },
    { id: 'certificados', label: 'Certificados', icono: <WisdomIcon name="shield" size={16} /> },
    { id: 'catalogo', label: 'Grados escolares', icono: <WisdomIcon name="layout" size={16} /> },
    { id: 'recursos', label: 'Recursos audiovisuales', icono: <WisdomIcon name="video" size={16} /> },
  ];

  const TAB_PERMISSIONS: Record<string, string | null> = {
    cursos: 'resources.manage',
    meetings: 'meetings.manage',
    estudiantes: 'users.read',
    matriculas: 'enrollments.manage',
    profesores: 'resources.manage',
    'guias-diarias': 'resources.manage',
    gradebook: 'grades.manage',
    boletines: 'reports.read',
    certificados: 'reports.read',
    crm: 'crm.access',
    catalogo: 'resources.read',
    recursos: 'resources.manage',
  };
  const visibleTabs = tabs.filter((tab) => {
    const required = TAB_PERMISSIONS[tab.id];
    return !required || tienePermiso(required);
  });
  const requestedTab = allowInitialTab ? tabs.find((tab) => tab.id === initialTab) : undefined;
  if (requestedTab && !visibleTabs.some((tab) => tab.id === requestedTab.id)) {
    visibleTabs.push(requestedTab);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('tab');
    if (requested && visibleTabs.some((tab) => tab.id === requested)) {
      setTabActiva(requested);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const selectTab = (id: string) => {
    setTabActiva(id);
    window.history.replaceState(null, '', `/admin?tab=${encodeURIComponent(id)}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === tabActiva)) {
      setTabActiva(visibleTabs[0]?.id || 'crm');
    }
  }, [tabActiva, visibleTabs]);

  // Control de Acceso: Si el usuario autenticado es un alumno, mostrar pantalla segura
  if (usuario && usuario.rol === 'STUDENT') {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-canvas)',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'var(--wa-font-sans)',
        }}
      >
        <Card variant="gold-border" padding="lg">
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '440px' }}>
            <div style={{ fontSize: '3rem' }}>??</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Acceso Restringido a la Rectoría
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              Hola, <strong>{usuario.nombreCompleto}</strong>. Tu cuenta tiene rol de <strong>Estudiante</strong>. El Panel Administrativo está reservado para directivos y docentes.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                <Button variant="primary-gold">
                  Ir a Mi Portal Escolar
                </Button>
              </Link>
              <Link href="/aula" style={{ textDecoration: 'none' }}>
                <Button variant="primary-navy">
                  Entrar al Aula OpenMAIC
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <AdminWorkspaceShell
      items={visibleTabs}
      activeId={tabActiva}
      onSelect={selectTab}
      userName={usuario?.nombreCompleto}
      roleLabel={usuario?.rol}
      themeDark={temaOscuro}
      onToggleTheme={alternarTema}
      onNewCourse={tienePermiso('resources.manage') ? () => selectTab('cursos') : undefined}
    >
        {/* TAB 2: GESTIÓN DE ESTUDIANTES Y CREDENCIALES                       */}
        {/* ------------------------------------------------------------------ */}
        {tabActiva === 'estudiantes' && <StudentCredentialsManager />}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: MATRICULACIÓN MOODLE (ENROLMENTS)                          */}
        {/* ------------------------------------------------------------------ */}
        {tabActiva === 'matriculas' && <MoodleEnrolmentsManager />}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: GESTIÓN DE CURSOS Y PROFESORES IA (OPENMAIC)                */}
        {/* ------------------------------------------------------------------ */}
        {tabActiva === 'profesores' && <AIProfessorsAndCoursesManager />}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: COMPILADOR Y AUDITORÍA DE GUÍAS DIARIAS (A4 PDF)            */}
        {/* ------------------------------------------------------------------ */}
        {tabActiva === 'guias-diarias' && <DailyGuideAdminPanel />}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 6: LIBRO MAESTRO DE CALIFICACIONES (GRADEBOOK)                */}
        {/* ------------------------------------------------------------------ */}
        {tabActiva === 'gradebook' && <MasterGradebookManager />}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 6: BOLETINES ECUADOR                                          */}
        {/* ------------------------------------------------------------------ */}
        {tabActiva === 'boletines' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                backgroundColor: 'var(--bg-surface)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--wa-radius-md)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSubTabBoletines('oficial_a4')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--wa-radius-sm)',
                    backgroundColor: subTabBoletines === 'oficial_a4' ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                    color: subTabBoletines === 'oficial_a4' ? 'var(--text-on-brand)' : 'var(--text-secondary)',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                  }}
                >
                  ?? Boletín Trimestral Oficial (MINEDUC A4)
                </button>
                <button
                  onClick={() => setSubTabBoletines('portafolio')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--wa-radius-sm)',
                    backgroundColor: subTabBoletines === 'portafolio' ? 'var(--brand-gold)' : 'var(--bg-subtle)',
                    color: subTabBoletines === 'portafolio' ? 'var(--text-on-gold)' : 'var(--text-secondary)',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                  }}
                >
                  ?? Portafolio de Evidencias Homeschool (Acuerdo 00057-A)
                </button>
              </div>
            </div>

            {subTabBoletines === 'oficial_a4' ? (
              <EcuadorOfficialReportCardGenerator />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Seleccionar Alumno para Portafolio:</span>
                  <button
                    onClick={() => setEstudianteSeleccionado(ESTUDIANTE_GAEL_INICIAL)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: 'var(--wa-radius-sm)',
                      backgroundColor: estudianteSeleccionado.edad <= 10 ? 'var(--brand-gold)' : 'var(--bg-subtle)',
                      color: estudianteSeleccionado.edad <= 10 ? 'var(--text-on-gold)' : 'var(--text-secondary)',
                      border: '1px solid var(--border-default)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                    }}
                  >
                    Gael (4° EGB)
                  </button>
                  <button
                    onClick={() => setEstudianteSeleccionado(ESTUDIANTE_AVRIL_INICIAL)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: 'var(--wa-radius-sm)',
                      backgroundColor: estudianteSeleccionado.edad > 10 ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                      color: estudianteSeleccionado.edad > 10 ? 'var(--text-on-brand)' : 'var(--text-secondary)',
                      border: '1px solid var(--border-default)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                    }}
                  >
                    Avril (8° EGB)
                  </button>
                </div>
                <EcuadorPortfolioManager estudiante={estudianteSeleccionado} />
              </div>
            )}
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 7: CERTIFICADOS                                               */}
        {/* ------------------------------------------------------------------ */}
        {tabActiva === 'certificados' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <CertificateGenerator />
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 8: CATÁLOGO Y TALLERES                                        */}
        {/* ------------------------------------------------------------------ */}
        {tabActiva === 'catalogo' && <WorkshopsAndGradesCatalog />}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 9: CURSOS Y TALLERES (DRIVE, REPASOS Y EVALUACIONES)           */}
        {/* ------------------------------------------------------------------ */}
        {tabActiva === 'cursos' && (
          <AdminTabErrorBoundary>
            <CoursesWorkshopsManager />
          </AdminTabErrorBoundary>
        )}

        {/* TAB 10: REVISIÓN DE RECURSOS AUDIOVISUALES */}
        {tabActiva === 'recursos' && <EducationalResourcesAdminPanel />}
        {tabActiva === 'meetings' && <MeetingsAdminPanel />}
        {tabActiva === 'crm' && <CrmDashboard
              embedded
              onOpenAdminTab={selectTab}
              availableAdminTabs={visibleTabs.map((tab) => tab.id)}
            />}
      </AdminWorkspaceShell>
  );
};


