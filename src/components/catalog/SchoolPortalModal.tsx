'use client';

import React from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { PERFILES_CURRICULARES } from '@/data/curriculum';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

const LEVELS = [
  {
    id: '4',
    key: '04_Cuarto_EGB_Gael',
    label: '4.° EGB',
    descriptor: 'Básica Elemental',
    accent: '#2563eb',
  },
  {
    id: '8',
    key: '08_Octavo_EGB_Avril',
    label: '8.° EGB',
    descriptor: 'Básica Superior',
    accent: '#b45309',
  },
];

const DAYS = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];

export function SchoolPortalModal({
  open,
  onOpenChange,
  isAuthenticated,
  onExplorePrograms,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated: boolean;
  onExplorePrograms: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="wa-school-overlay" />
        <Dialog.Content className="wa-school-content" aria-describedby="school-portal-description">
          <div className="wa-school-head">
            <div>
              <span className="wa-catalog-kicker">
                <WisdomIcon name="graduation-cap" size={13} /> Portal Escolar
              </span>
              <Dialog.Title className="wa-school-title">Una vista viva del itinerario académico</Dialog.Title>
              <Dialog.Description id="school-portal-description" className="wa-school-description">
                Recorre la trayectoria K-12 completa. La vista interactiva está disponible para
                4.° y 8.° EGB; los demás niveles se configuran a medida. Los expedientes completos
                se abren con la sesión del estudiante.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="wa-school-close" aria-label="Cerrar vista del portal escolar">
                ×
              </button>
            </Dialog.Close>
          </div>

          <div className="wa-school-level-map" aria-label="Niveles académicos del Portal Escolar">
            <span>Todos los niveles K-12</span>
            <div>
              {[
                '1.° EGB', '2.° EGB', '3.° EGB', '4.° EGB', '5.° EGB', '6.° EGB', '7.° EGB',
                '8.° EGB', '9.° EGB', '10.° EGB', '1.° BGU', '2.° BGU', '3.° BGU',
              ].map((level) => (
                <span
                  key={level}
                  data-available={level === '4.° EGB' || level === '8.° EGB'}
                  title={level === '4.° EGB' || level === '8.° EGB' ? 'Vista previa disponible' : 'Se configura por proyecto'}
                >
                  {level}
                </span>
              ))}
            </div>
            <small>Vista interactiva disponible para 4.° y 8.° EGB; los demás niveles se configuran a medida.</small>
          </div>

          <Tabs.Root defaultValue="4" className="wa-school-tabs">
            <Tabs.List className="wa-school-levels" aria-label="Niveles del portal escolar">
              {LEVELS.map((level) => (
                <Tabs.Trigger key={level.id} value={level.id} className="wa-school-level">
                  <strong>{level.label}</strong>
                  <span>{level.descriptor}</span>
                </Tabs.Trigger>
              ))}
            </Tabs.List>

            {LEVELS.map((level) => {
              const profile = PERFILES_CURRICULARES[level.key];
              if (!profile) return null;
              const subjects = profile.asignaturas;
              const units = subjects.reduce((total, subject) => total + subject.unidades.length, 0);
              return (
                <Tabs.Content key={level.id} value={level.id} className="wa-school-panel">
                  <div className="wa-school-summary">
                    <div>
                      <Badge variant="navy" size="sm">{profile.grado}</Badge>
                      <h3>{profile.estudiante}</h3>
                      <p>
                        {profile.edad} años · {subjects.length} materias · {units} unidades ·{' '}
                        {profile.asignaturas[0]?.profesorIA}
                      </p>
                    </div>
                    <div className="wa-school-summary-stat">
                      <strong>{subjects.length}</strong>
                      <span>materias activas</span>
                    </div>
                    <div className="wa-school-summary-stat">
                      <strong>{units}</strong>
                      <span>unidades</span>
                    </div>
                  </div>

                  <div className="wa-school-subjects">
                    {subjects.map((subject) => (
                      <span key={subject.codigo}>{subject.nombreCorto}</span>
                    ))}
                  </div>

                  <div className="wa-school-schedule-scroll">
                    <div className="wa-school-schedule">
                      {DAYS.map((day) => (
                        <div key={day} className="wa-school-day">
                          <h4>{day}</h4>
                          {(profile.horarioSemanal[day] || []).map((block) => (
                            <div key={`${level.id}-${day}-${block.bloque}`} className={`wa-school-block${block.modalidad === 'TUTORIA_PROFESOR_REAL' ? ' is-human' : ''}`}>
                              <span>{block.hora}</span>
                              <strong>{block.materia}</strong>
                              <small>{block.modalidad === 'TUTORIA_PROFESOR_REAL' ? 'Tutoría humana' : 'IA + práctica'}</small>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="wa-school-actions">
                    <Link href={isAuthenticated ? '/dashboard' : '/login'} onClick={() => onOpenChange(false)}>
                      <Button variant="primary-gold">
                        {isAuthenticated ? 'Abrir mi portal escolar' : 'Entrar al portal escolar'}
                      </Button>
                    </Link>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        onOpenChange(false);
                        onExplorePrograms();
                      }}
                    >
                      Ver programas de este nivel
                    </Button>
                    <span className="wa-school-privacy">
                      <WisdomIcon name="shield" size={13} color="current" />
                      Los expedientes y calificaciones requieren autenticación.
                    </span>
                  </div>
                </Tabs.Content>
              );
            })}
          </Tabs.Root>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
