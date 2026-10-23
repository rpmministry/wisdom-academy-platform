'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { providerAccent, providerShortLabel } from '@/lib/meetings/providers';
import type { WeeklyMeetingView } from '@/server/domain/weeklyMeetings';
import { WeeklyMeetingEditor } from './WeeklyMeetingEditor';

interface WeeklyMeetingCardProps {
  meeting: WeeklyMeetingView | null;
  programId: string;
  moduleId?: string | null;
  weekNumber: number;
  canManage: boolean;
}

function formatMeetingDate(value: string | null, timezone: string): string {
  if (!value) return 'Horario por confirmar';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Horario por confirmar';
  try {
    return new Intl.DateTimeFormat('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone || 'America/Guayaquil',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('es-EC', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }
}

function statusLabel(meeting: WeeklyMeetingView): string {
  if (meeting.status === 'cancelled') return 'Cancelada';
  if (meeting.status === 'completed') return 'Finalizada';
  if (meeting.isLive) return 'En vivo';
  if (meeting.startsAt) {
    const start = Date.parse(meeting.startsAt);
    if (Number.isFinite(start) && start > Date.now()) return 'Próxima';
  }
  return meeting.canJoin ? 'Disponible' : 'Cerrada';
}

function statusTone(meeting: WeeklyMeetingView): string {
  if (meeting.status === 'cancelled') return 'is-cancelled';
  if (meeting.status === 'completed') return 'is-completed';
  if (meeting.isLive) return 'is-live';
  if (meeting.canJoin) return 'is-available';
  return 'is-upcoming';
}

export const WeeklyMeetingCard: React.FC<WeeklyMeetingCardProps> = ({
  meeting,
  programId,
  moduleId,
  weekNumber,
  canManage,
}) => {
  const router = useRouter();
  const [editorOpen, setEditorOpen] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);

  useEffect(() => {
    if (!stageOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStageOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [stageOpen]);

  if (!meeting) {
    if (!canManage) return null;
    return (
      <>
        <div className="wa-mt-card is-empty">
          <span className="wa-mt-icon"><WisdomIcon name="video" size={20} /></span>
          <div className="wa-mt-main">
            <span className="wa-mt-kicker">Repaso semanal en vivo</span>
            <strong>Sin sala programada</strong>
            <small>Programa el enlace de videollamada para esta semana.</small>
          </div>
          <button type="button" className="wa-mt-btn wa-mt-btn-primary wa-mt-btn-small" onClick={() => setEditorOpen(true)}>
            Programar sala
          </button>
        </div>
        {editorOpen && (
          <WeeklyMeetingEditor
            programId={programId}
            moduleId={moduleId}
            weekNumber={weekNumber}
            onClose={() => setEditorOpen(false)}
            onSaved={() => router.refresh()}
          />
        )}
      </>
    );
  }

  const canOpenExternal = meeting.canJoin && meeting.status !== 'cancelled';
  const canOpenEmbed = canOpenExternal && meeting.embedMode === 'iframe';
  const canOpenRecording = meeting.status === 'completed' && Boolean(meeting.recordingUrl);
  const accent = providerAccent(meeting.provider);

  return (
    <>
      <section
        className={`wa-mt-card ${statusTone(meeting)}`}
        style={{ ['--meeting-accent' as string]: accent }}
        aria-label={`Repaso en vivo de la semana ${weekNumber}`}
      >
        <span className="wa-mt-icon"><WisdomIcon name="video" size={20} /></span>
        <div className="wa-mt-main">
          <div className="wa-mt-topline">
            <span className="wa-mt-kicker">
              {meeting.isLive && <i className="wa-mt-live-dot" />}
              Repaso semanal en vivo
            </span>
            <span className={`wa-mt-status ${statusTone(meeting)}`}>{statusLabel(meeting)}</span>
          </div>
          <strong className="wa-mt-title">{meeting.title}</strong>
          <div className="wa-mt-meta">
            <span><WisdomIcon name="user" size={13} /> {meeting.hostName || 'Profesor de la semana'}</span>
            <span><WisdomIcon name="calendar" size={13} /> {formatMeetingDate(meeting.startsAt, meeting.timezone)}</span>
            <span className="wa-mt-provider"><i /> {providerShortLabel(meeting.provider)}</span>
          </div>
          {meeting.studentNote && <p className="wa-mt-note">{meeting.studentNote}</p>}
          {meeting.status === 'cancelled' && meeting.studentNote && (
            <div className="wa-mt-alert">La sesión fue cancelada. Revisa las indicaciones del profesor.</div>
          )}
        </div>
        <div className="wa-mt-actions">
          {canOpenEmbed && (
            <button type="button" className="wa-mt-btn wa-mt-btn-primary" onClick={() => setStageOpen(true)}>
              <WisdomIcon name="video" size={15} /> Entrar a la sala
            </button>
          )}
          {canOpenExternal && meeting.embedMode !== 'iframe' && (
            <a className="wa-mt-btn wa-mt-btn-primary" href={meeting.joinUrl} target="_blank" rel="noopener noreferrer">
              <WisdomIcon name="arrow-right" size={15} /> Unirme en {meeting.providerLabel}
            </a>
          )}
          {canOpenRecording && (
            <a className="wa-mt-btn wa-mt-btn-secondary" href={meeting.recordingUrl || '#'} target="_blank" rel="noopener noreferrer">
              <WisdomIcon name="play" size={15} /> Ver grabación
            </a>
          )}
          {!canOpenExternal && !canOpenRecording && meeting.status !== 'completed' && (
            <span className="wa-mt-unavailable">
              {meeting.startsAt ? 'La sala abre 15 minutos antes' : 'La sala se habilitará pronto'}
            </span>
          )}
          {canManage && (
            <button type="button" className="wa-mt-edit" onClick={() => setEditorOpen(true)} aria-label="Editar sala de repaso">
              <WisdomIcon name="settings" size={15} /> Editar
            </button>
          )}
        </div>
        {meeting.embedMode === 'external' && canOpenExternal && (
          <div className="wa-mt-external-note">
            <WisdomIcon name="shield" size={13} /> Se abre en una pestaña segura del proveedor.
          </div>
        )}
      </section>

      {stageOpen && (
        <div className="wa-mt-stage-overlay" role="presentation" onMouseDown={() => setStageOpen(false)}>
          <div className="wa-mt-stage" role="dialog" aria-modal="true" aria-label={meeting.title} onMouseDown={(e) => e.stopPropagation()}>
            <div className="wa-mt-stage-head">
              <div>
                <span className="wa-mt-kicker">Repaso en vivo · Semana {String(weekNumber).padStart(2, '0')}</span>
                <strong>{meeting.title}</strong>
              </div>
              <div className="wa-mt-stage-actions">
                <a href={meeting.joinUrl} target="_blank" rel="noopener noreferrer" className="wa-mt-btn wa-mt-btn-secondary wa-mt-btn-small">
                  Abrir en pestaña <WisdomIcon name="arrow-right" size={13} />
                </a>
                <button type="button" className="wa-mt-close" onClick={() => setStageOpen(false)} aria-label="Cerrar sala">
                  ×
                </button>
              </div>
            </div>
            <div className="wa-mt-frame">
              <iframe
                src={meeting.joinUrl}
                title={meeting.title}
                allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; encrypted-media"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            <p className="wa-mt-stage-note">
              Si el proveedor bloquea la vista integrada, usa <strong>Abrir en pestaña</strong>. La sala pertenece a{' '}
              {meeting.providerLabel}.
            </p>
          </div>
        </div>
      )}

      {editorOpen && (
        <WeeklyMeetingEditor
          programId={programId}
          moduleId={moduleId}
          weekNumber={weekNumber}
          meeting={meeting}
          onClose={() => setEditorOpen(false)}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  );
};
