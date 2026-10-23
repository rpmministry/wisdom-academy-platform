'use client';

import React, { useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { MEETING_PROVIDERS, DEFAULT_MEETING_URL, type MeetingEmbedMode, type MeetingProviderId } from '@/lib/meetings/providers';
import type { MeetingStatus, WeeklyMeetingView } from '@/server/domain/weeklyMeetings';

interface WeeklyMeetingEditorProps {
  programId: string;
  weekNumber: number;
  moduleId?: string | null;
  meeting?: WeeklyMeetingView | null;
  onClose: () => void;
  onSaved: () => void;
}

function toLocalDateTime(value: string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function toIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export const WeeklyMeetingEditor: React.FC<WeeklyMeetingEditorProps> = ({
  programId,
  weekNumber,
  moduleId,
  meeting,
  onClose,
  onSaved,
}) => {
  const [form, setForm] = useState<{
    title: string;
    provider: MeetingProviderId;
    embedMode: MeetingEmbedMode | '';
    joinUrl: string;
    hostUrl: string;
    hostName: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
    status: MeetingStatus;
    studentNote: string;
    staffNote: string;
    recordingUrl: string;
  }>({
    title: meeting?.title || `Repaso en vivo — Semana ${String(weekNumber).padStart(2, '0')}`,
    provider: (meeting?.provider || 'google_meet') as MeetingProviderId,
    embedMode: (meeting?.embedMode || '') as MeetingEmbedMode | '',
    joinUrl: meeting?.joinUrl || DEFAULT_MEETING_URL,
    hostUrl: meeting?.hostUrl || '',
    hostName: meeting?.hostName || 'Profesor de la semana',
    startsAt: toLocalDateTime(meeting?.startsAt),
    endsAt: toLocalDateTime(meeting?.endsAt),
    timezone: meeting?.timezone || 'America/Guayaquil',
    status: (meeting?.status || 'published') as MeetingStatus,
    studentNote: meeting?.studentNote || 'Conéctate con tu profesor para repasar los temas de la semana.',
    staffNote: meeting?.staffNote || '',
    recordingUrl: meeting?.recordingUrl || '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/courses/${programId}/meetings`, {
        method: 'POST',
        body: {
          weekNumber,
          moduleId: moduleId || meeting?.moduleId || null,
          title: form.title,
          provider: form.provider,
          embedMode: form.embedMode || null,
          joinUrl: form.joinUrl,
          hostUrl: form.hostUrl || null,
          hostName: form.hostName,
          startsAt: toIso(form.startsAt),
          endsAt: toIso(form.endsAt),
          timezone: form.timezone,
          status: form.status,
          studentNote: form.studentNote || null,
          staffNote: form.staffNote || null,
          recordingUrl: form.recordingUrl || null,
        },
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!meeting?.id) return;
    if (!window.confirm('¿Eliminar la sala de repaso de esta semana?')) return;
    setDeleting(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/courses/${programId}/meetings/${meeting.id}`, {
        method: 'DELETE',
      });
      onSaved();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="wa-mt-modal-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="wa-mt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meeting-editor-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="wa-mt-modal-head">
          <div>
            <span className="wa-mt-kicker">Repaso semanal en vivo</span>
            <h2 id="meeting-editor-title">
              {meeting ? 'Editar sala' : 'Programar sala'} · Semana {String(weekNumber).padStart(2, '0')}
            </h2>
            <p>El enlace se actualiza de inmediato para los estudiantes con acceso al programa.</p>
          </div>
          <button type="button" className="wa-mt-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <form className="wa-mt-form" onSubmit={save}>
          <div className="wa-mt-form-grid">
            <label>
              Título visible
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
                maxLength={250}
              />
            </label>
            <label>
              Profesor o anfitrión
              <input
                value={form.hostName}
                onChange={(event) => setForm({ ...form, hostName: event.target.value })}
                maxLength={200}
              />
            </label>
            <label>
              Proveedor
              <select
                value={form.provider}
                onChange={(event) => setForm({ ...form, provider: event.target.value as MeetingProviderId, embedMode: '' })}
              >
                {MEETING_PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Modo de ingreso
              <select
                value={form.embedMode}
                onChange={(event) => setForm({ ...form, embedMode: event.target.value as MeetingEmbedMode | '' })}
              >
                <option value="">Automático según proveedor</option>
                <option value="iframe">Embebido en el aula</option>
                <option value="external">Abrir en pestaña</option>
                <option value="sdk">SDK del proveedor</option>
              </select>
            </label>
            <label className="wa-mt-span-2">
              Enlace para estudiantes
              <input
                type="url"
                value={form.joinUrl}
                onChange={(event) => setForm({ ...form, joinUrl: event.target.value })}
                placeholder="https://meet.google.com/xxx-xxxx-xxx"
                required
              />
              <small>Google Meet se abre en una pestaña segura. Jitsi o Daily permiten el visor embebido.</small>
            </label>
            <label className="wa-mt-span-2">
              Enlace de anfitrión (privado, solo staff)
              <input
                type="url"
                value={form.hostUrl}
                onChange={(event) => setForm({ ...form, hostUrl: event.target.value })}
                placeholder="Opcional"
              />
            </label>
            <label>
              Inicio
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => setForm({ ...form, startsAt: event.target.value })}
              />
            </label>
            <label>
              Fin
              <input
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => setForm({ ...form, endsAt: event.target.value })}
              />
            </label>
            <label>
              Estado
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as MeetingStatus })}
              >
                <option value="published">Publicada</option>
                <option value="live">En vivo</option>
                <option value="completed">Finalizada</option>
                <option value="cancelled">Cancelada</option>
                <option value="draft">Borrador</option>
              </select>
            </label>
            <label>
              Zona horaria
              <input
                value={form.timezone}
                onChange={(event) => setForm({ ...form, timezone: event.target.value })}
              />
            </label>
          </div>

          <label>
            Nota para estudiantes
            <textarea
              value={form.studentNote}
              onChange={(event) => setForm({ ...form, studentNote: event.target.value })}
              maxLength={2000}
            />
          </label>
          <label>
            Nota interna
            <textarea
              value={form.staffNote}
              onChange={(event) => setForm({ ...form, staffNote: event.target.value })}
              maxLength={2000}
            />
          </label>
          <label>
            Grabación (opcional)
            <input
              type="url"
              value={form.recordingUrl}
              onChange={(event) => setForm({ ...form, recordingUrl: event.target.value })}
              placeholder="https://..."
            />
          </label>

          {error && <div className="wa-mt-form-error" role="alert">{error}</div>}

          <div className="wa-mt-modal-actions">
            {meeting?.id && (
              <button type="button" className="wa-mt-btn wa-mt-btn-danger" onClick={remove} disabled={deleting || saving}>
                {deleting ? 'Eliminando…' : 'Eliminar sala'}
              </button>
            )}
            <button type="button" className="wa-mt-btn wa-mt-btn-secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="wa-mt-btn wa-mt-btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar sala'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
