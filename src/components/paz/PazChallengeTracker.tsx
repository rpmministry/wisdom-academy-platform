'use client';

import React, { useMemo, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PAZ_SABBATH_REVIEW } from '@/lib/paz-en-la-mesa/content';
import type { PazChallengeDayView } from '@/server/domain/paz';

export interface PazChallengeTrackerProps {
  initialDays: PazChallengeDayView[];
  startsAt: string;
  endsAt: string;
  readOnly?: boolean;
}

export function PazChallengeTracker({
  initialDays,
  startsAt,
  endsAt,
  readOnly = false,
}: PazChallengeTrackerProps) {
  const [days, setDays] = useState(initialDays);
  const [savingDay, setSavingDay] = useState<number | null>(null);
  const [error, setError] = useState('');

  const completed = useMemo(() => days.filter((day) => day.completed).length, [days]);
  const percent = Math.round((completed / 7) * 100);
  const startLabel = formatDate(startsAt);
  const endLabel = formatDate(endsAt);

  const save = async (day: number, nextCompleted: boolean, note: string) => {
    if (readOnly) return;
    setSavingDay(day);
    setError('');
    const previous = days;
    setDays((current) =>
      current.map((item) => (item.day === day ? { ...item, completed: nextCompleted, note } : item))
    );
    try {
      const response = await apiFetch<{ dias: PazChallengeDayView[] }>('/api/paz/challenge', {
        method: 'POST',
        body: { day, completed: nextCompleted, note },
      });
      setDays(response.dias);
    } catch (caught) {
      setDays(previous);
      setError(errorMessage(caught));
    } finally {
      setSavingDay(null);
    }
  };

  return (
    <div className="paz-tracker">
      <div className="paz-tracker-progress">
        <div className="paz-tracker-ring" style={{ ['--progress' as string]: `${percent}%` }}>
          <div>{completed}/7</div>
        </div>
        <div>
          <strong>Reto de 7 días de Altar Familiar</strong>
          <span>
            {startLabel} al {endLabel} · 15 minutos diarios · Versión de emergencia de 5 minutos
          </span>
        </div>
      </div>

      {error && (
        <div className="paz-alert paz-alert--error" role="alert">
          {error}
        </div>
      )}

      <div className="paz-tracker-days">
        {days.map((day) => (
          <article className={`paz-tracker-day${day.completed ? ' is-done' : ''}`} key={day.day}>
            <div className="paz-tracker-day-number">
              {day.completed ? <WisdomIcon name="check" size={18} /> : day.day}
            </div>
            <div className="paz-tracker-day-main">
              <strong>
                Día {day.day} · {day.title}
              </strong>
              <small>{day.passage}</small>
              <p>{day.focus}</p>
              <p style={{ fontStyle: 'italic' }}>{day.practice}</p>
              <textarea
                defaultValue={day.note || ''}
                placeholder="Escribe un acuerdo, una gratitud o una impresión de este día…"
                maxLength={1200}
                readOnly={readOnly}
                onBlur={(event) => {
                  if (!readOnly && event.target.value !== (day.note || '')) {
                    void save(day.day, day.completed, event.target.value);
                  }
                }}
              />
              <p className="paz-prayer">{day.prayer}</p>
            </div>
            <label className="paz-check">
              <input
                type="checkbox"
                checked={day.completed}
                disabled={readOnly || savingDay === day.day}
                onChange={(event) => void save(day.day, event.target.checked, day.note || '')}
              />
              {day.completed ? 'Completado' : 'Marcar día'}
            </label>
          </article>
        ))}
      </div>

      <article className="paz-tracker-day paz-sabbath">
        <div className="paz-tracker-day-number paz-sabbath-number">
          <WisdomIcon name="award" size={18} />
        </div>
        <div className="paz-tracker-day-main">
          <strong>{PAZ_SABBATH_REVIEW.title}</strong>
          <small>{PAZ_SABBATH_REVIEW.passage}</small>
          <p>{PAZ_SABBATH_REVIEW.focus}</p>
          <p style={{ fontStyle: 'italic' }}>{PAZ_SABBATH_REVIEW.practice}</p>
          <p className="paz-prayer">{PAZ_SABBATH_REVIEW.prayer}</p>
        </div>
        <span className="paz-check paz-sabbath-label">Revisión</span>
      </article>

      <div className="paz-alert paz-alert--info">
        <strong>Versión de emergencia (5 minutos):</strong> si el día se complica, reúnanse,
        lean un versículo corto, agradezcan un motivo y oren la bendición. La consistencia
        vence a la intensidad.
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', {
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Guayaquil',
  }).format(date);
}

export default PazChallengeTracker;
