'use client';

import React, { useEffect, useMemo, useState } from 'react';

export interface PazCountdownProps {
  targetIso: string;
  label?: string;
  compact?: boolean;
  dark?: boolean;
  className?: string;
}

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

const ZERO: Remaining = { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };

function remainingUntil(targetIso: string, now: number): Remaining {
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) return ZERO;
  const delta = target - now;
  if (delta <= 0) return ZERO;
  const totalSeconds = Math.floor(delta / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: false,
  };
}

function pad(value: number): string {
  return String(Math.max(0, value)).padStart(2, '0');
}

export function PazCountdown({
  targetIso,
  label,
  compact = false,
  dark = false,
  className = '',
}: PazCountdownProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remaining = useMemo(
    () => (now === null ? null : remainingUntil(targetIso, now)),
    [now, targetIso]
  );

  const readableTarget = useMemo(() => {
    const date = new Date(targetIso);
    if (Number.isNaN(date.getTime())) return targetIso;
    return new Intl.DateTimeFormat('es-EC', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'America/Guayaquil',
    }).format(date);
  }, [targetIso]);

  if (compact) {
    return (
      <span className={`paz-banner-clock ${className}`} aria-label={`Cuenta regresiva para ${label || readableTarget}`}>
        <strong>
          {remaining === null
            ? '--d --h --m'
            : remaining.done
              ? 'Comenzó'
              : `${remaining.days}d ${pad(remaining.hours)}h ${pad(remaining.minutes)}m`}
        </strong>
        {label && <span>{remaining?.done ? 'Disponible' : label}</span>}
      </span>
    );
  }

  const units = [
    { value: remaining?.days ?? 0, label: 'Días', display: remaining ? pad(remaining.days) : '--' },
    { value: remaining?.hours ?? 0, label: 'Horas', display: remaining ? pad(remaining.hours) : '--' },
    { value: remaining?.minutes ?? 0, label: 'Min', display: remaining ? pad(remaining.minutes) : '--' },
    { value: remaining?.seconds ?? 0, label: 'Seg', display: remaining ? pad(remaining.seconds) : '--' },
  ];

  return (
    <div className={className}>
      <div className={`paz-countdown${dark ? ' paz-countdown--dark' : ''}`} aria-hidden="true">
        {units.map((unit) => (
          <div className="paz-countdown-unit" key={unit.label}>
            <strong>{unit.display}</strong>
            <span>{unit.label}</span>
          </div>
        ))}
      </div>
      <p className="paz-countdown-label">
        {remaining?.done ? (
          <strong>El contenido ya está disponible.</strong>
        ) : (
          <>
            <strong>{label || 'Próximo hito'}:</strong> {readableTarget} · Hora de Ecuador
          </>
        )}
      </p>
      <span className="paz-visually-hidden" aria-live="polite">
        {remaining?.done
          ? 'La cuenta regresiva terminó.'
          : `Faltan ${remaining?.days ?? 0} días, ${remaining?.hours ?? 0} horas y ${remaining?.minutes ?? 0} minutos.`}
      </span>
    </div>
  );
}

export default PazCountdown;
