'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { providerShortLabel } from '@/lib/meetings/providers';
import type { WeeklyMeetingView } from '@/server/domain/weeklyMeetings';
import { WeeklyMeetingEditor } from '@/components/courses/WeeklyMeetingEditor';

interface AdminMeeting extends WeeklyMeetingView {
  programTitle: string;
  programSlug: string;
}

function formatDate(value: string | null, timezone: string): string {
  if (!value) return 'Sin horario';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin horario';
  try {
    return new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timezone || 'America/Guayaquil',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  }
}

export const MeetingsAdminPanel: React.FC = () => {
  const [meetings, setMeetings] = useState<AdminMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminMeeting | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<{ ok: boolean; reuniones: AdminMeeting[] }>('/api/admin/meetings');
      setMeetings(response.reuniones);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = meetings.filter((meeting) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      meeting.programTitle.toLowerCase().includes(term) ||
      meeting.title.toLowerCase().includes(term) ||
      meeting.hostName?.toLowerCase().includes(term) ||
      String(meeting.weekNumber).includes(term)
    );
  });

  const totals = {
    total: meetings.length,
    live: meetings.filter((meeting) => meeting.isLive).length,
    published: meetings.filter((meeting) => meeting.status === 'published').length,
    cancelled: meetings.filter((meeting) => meeting.status === 'cancelled').length,
  };

  return (
    <div className="wa-mt-admin">
      <div className="wa-mt-admin-kpis">
        <div><span>Total de salas</span><strong>{totals.total}</strong></div>
        <div><span>En vivo ahora</span><strong>{totals.live}</strong></div>
        <div><span>Publicadas</span><strong>{totals.published}</strong></div>
        <div><span>Canceladas</span><strong>{totals.cancelled}</strong></div>
      </div>

      <div className="wa-mt-admin-toolbar">
        <div>
          <span className="wa-mt-kicker">Gobierno de salas</span>
          <h2>Videollamadas y repasos en vivo</h2>
          <p>Cambia enlaces, horarios y estados sin desplegar código. Los estudiantes solo ven las salas publicadas.</p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar programa, semana o profesor"
          aria-label="Buscar salas"
        />
      </div>

      {error && <div className="wa-mt-form-error" role="alert">{error}</div>}
      {loading ? (
        <div className="wa-mt-admin-loading">Cargando salas de repaso…</div>
      ) : (
        <div className="wa-mt-admin-table-wrap">
          <table className="wa-mt-admin-table">
            <thead>
              <tr>
                <th>Programa</th>
                <th>Semana</th>
                <th>Proveedor</th>
                <th>Inicio</th>
                <th>Estado</th>
                <th>Profesor</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((meeting) => (
                <tr key={meeting.id}>
                  <td>
                    <Link href={`/cursos/${meeting.programSlug}?from=crm`}>
                      {meeting.programTitle}
                    </Link>
                  </td>
                  <td>Semana {String(meeting.weekNumber).padStart(2, '0')}</td>
                  <td><span className="wa-mt-admin-provider">{providerShortLabel(meeting.provider)}</span></td>
                  <td>{formatDate(meeting.startsAt, meeting.timezone)}</td>
                  <td>
                    <span className={`wa-mt-status ${meeting.isLive ? 'is-live' : meeting.status === 'cancelled' ? 'is-cancelled' : meeting.status === 'completed' ? 'is-completed' : meeting.canJoin ? 'is-available' : 'is-upcoming'}`}>
                      {meeting.isLive ? 'En vivo' : meeting.status}
                    </span>
                  </td>
                  <td>{meeting.hostName || '—'}</td>
                  <td>
                    <div className="wa-mt-admin-actions">
                      <button type="button" className="wa-mt-btn wa-mt-btn-secondary wa-mt-btn-small" onClick={() => setEditing(meeting)}>
                        Editar
                      </button>
                      <a href={meeting.joinUrl} target="_blank" rel="noopener noreferrer" className="wa-mt-admin-link">
                        Abrir
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="wa-mt-admin-empty">
                    No hay salas que coincidan con la búsqueda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <WeeklyMeetingEditor
          programId={editing.programId}
          moduleId={editing.moduleId}
          weekNumber={editing.weekNumber}
          meeting={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
};

