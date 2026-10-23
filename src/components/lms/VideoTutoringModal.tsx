'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Componente LMS: Video Tutoring Modal
 * ARCHIVO: src/components/lms/VideoTutoringModal.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Modal y visor de tutorías sincrónicas con profesores humanos reales:
 * - Soporta las 5 plataformas: Jitsi Meet (in-app embebido), BigBlueButton,
 *   Google Meet, Zoom y Microsoft Teams.
 * - Conectado directamente a `src/services/videoTutoringHub.ts`.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { videoTutoringHub } from '@/services/videoTutoringHub';
import { PlataformaVideollamada } from '@/types/wisdom';

export interface VideoTutoringModalProps {
  abierto: boolean;
  onCerrar: () => void;
  estudianteNombre: string;
  materia: string;
  esGael: boolean;
}

export const VideoTutoringModal: React.FC<VideoTutoringModalProps> = ({
  abierto,
  onCerrar,
  estudianteNombre,
  materia,
  esGael,
}) => {
  const [plataforma, setPlataforma] = useState<PlataformaVideollamada>('jitsi');
  const [enLlamadaActiva, setEnLlamadaActiva] = useState<boolean>(false);

  const sesion = videoTutoringHub.generarSesionTutoria(plataforma, {
    nombreEstudiante: estudianteNombre,
    curso: materia,
    grado: esGael ? '4° de EGB' : '8° de EGB',
  });

  const iconos: Record<PlataformaVideollamada, string> = {
    jitsi: '🛡️',
    bigbluebutton: '🎓',
    google_meet: '📹',
    zoom: '💻',
    microsoft_teams: '👥',
  };
  const plataformasInfo = videoTutoringHub.obtenerPlataformasDisponibles().map((plataforma) => ({
    ...plataforma,
    icono: iconos[plataforma.id],
  }));

  return (
    <Modal
      abierto={abierto}
      onCerrar={() => {
        setEnLlamadaActiva(false);
        onCerrar();
      }}
      titulo="Hub de Tutoría con Profesores Reales"
      subtitulo={`Estudiante: ${estudianteNombre} • Materia: ${materia}`}
      anchoMaximo="860px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--carbon-space-2x)' }}>
        {/* Selector de plataforma */}
        {!enLlamadaActiva && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Selecciona tu plataforma de comunicación preferida para conectarte con el tutor docente:
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {plataformasInfo.map((p) => {
                const seleccionada = plataforma === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlataforma(p.id)}
                    disabled={!p.disponible}
                    title={p.disponible ? p.descripcion : 'Sala no configurada por la institución'}
                    aria-pressed={seleccionada}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.75rem',
                      borderRadius: 'var(--wa-radius-md)',
                      backgroundColor: seleccionada
                        ? 'var(--brand-primary-soft)'
                        : 'var(--bg-subtle)',
                      border: seleccionada
                        ? '2px solid var(--brand-primary)'
                        : '1px solid var(--border-default)',
                      color: seleccionada
                        ? 'var(--brand-primary)'
                        : 'var(--text-primary)',
                      cursor: p.disponible ? 'pointer' : 'not-allowed',
                      opacity: p.disponible ? 1 : 0.5,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      fontFamily: 'var(--wa-font-sans)',
                    }}
                  >
                    <span style={{ fontSize: '1.25rem' }}>{p.icono}</span>
                    <span>{p.nombre}</span>
                    {!p.disponible && <span style={{ fontSize: '0.625rem' }}>No configurada</span>}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                padding: 'var(--carbon-space-2x)',
                borderRadius: 'var(--wa-radius-md)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Sala Asignada: </span>
                <code style={{ fontSize: '0.8125rem', color: 'var(--brand-primary)' }}>
                  {sesion.nombreSala}
                </code>
              </div>
              <Badge variant={sesion.disponible ? 'emerald' : 'ruby'} size="sm">
                {sesion.disponible ? 'Sala Lista' : 'Sala no configurada'}
              </Badge>
            </div>

            {!sesion.disponible && (
              <div
                role="status"
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  border: '1px solid var(--status-warning)',
                  backgroundColor: 'var(--status-warning-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                }}
              >
                {sesion.motivoNoDisponible ||
                  'La institución todavía no configuró esta plataforma de videollamada.'}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              {sesion.disponible && sesion.permiteIncrustarIframe ? (
                <Button variant="primary-gold" onClick={() => setEnLlamadaActiva(true)}>
                  Iniciar Videollamada In-App
                </Button>
              ) : sesion.disponible ? (
                <a
                  href={sesion.urlReunion}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none' }}
                >
                  <Button variant="primary-navy">
                    Abrir en {plataformasInfo.find((p) => p.id === plataforma)?.nombre}
                  </Button>
                </a>
              ) : null}
            </div>
          </div>
        )}

        {/* Visor embebido Iframe para Jitsi o BBB */}
        {enLlamadaActiva && sesion.disponible && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Badge variant="emerald" size="md">
                Sesión Sincrónica en Curso ({plataforma.toUpperCase()})
              </Badge>
              <Button variant="secondary" size="sm" onClick={() => setEnLlamadaActiva(false)}>
                Finalizar o Cambiar de Sala
              </Button>
            </div>

            <div
              style={{
                width: '100%',
                height: '480px',
                borderRadius: 'var(--wa-radius-lg)',
                overflow: 'hidden',
                border: '1px solid var(--border-default)',
                backgroundColor: '#111625',
              }}
            >
              <iframe
                src={sesion.urlReunion}
                title="Videollamada con Profesor Real"
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

