'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiFetch, errorMessage } from '@/lib/api/client';

interface AssessmentInfo {
  id: string;
  title: string;
  kind: 'midterm' | 'final' | 'practice';
  instructions: string | null;
  attemptsAllowed: number;
  attemptsUsed: number;
  inProgressAttemptId: string | null;
  timeLimitMinutes: number | null;
  opensAt: string | null;
  closesAt: string | null;
  questionCount: number;
}

interface Question {
  id: string;
  type: 'true_false' | 'multiple_choice';
  prompt: string;
  options: Array<{ id: string; label: string }>;
  position: number;
}

interface AssessmentRunnerProps {
  slug: string;
  programTitle: string;
  moduleTitle: string | null;
  assessment: AssessmentInfo;
  questions: Question[];
}

const KIND_LABEL: Record<string, string> = {
  midterm: 'Examen parcial',
  final: 'Examen final',
  practice: 'Práctica de repaso',
};

function formatDeadline(value: string | null): string {
  if (!value) return 'Sin fecha límite configurada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'long', timeStyle: 'short' }).format(date);
}

export const AssessmentRunner: React.FC<AssessmentRunnerProps> = ({
  slug,
  programTitle,
  moduleTitle,
  assessment,
  questions,
}) => {
  const [phase, setPhase] = useState<'instructions' | 'taking' | 'submitting' | 'result'>('instructions');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    percentage: number | null;
    correctCount: number | null;
    totalQuestions: number | null;
    attemptNumber: number;
    submittedAt: string | null;
  } | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const idempotencyRef = useRef<string | null>(null);

  const answeredCount = useMemo(
    () => questions.filter((question) => Boolean(answers[question.id])).length,
    [answers, questions]
  );
  const unanswered = questions.length - answeredCount;

  const storageKey = attemptId ? `wa-exam-${assessment.id}-${attemptId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        if (parsed && typeof parsed === 'object') setAnswers(parsed);
      }
      const key = sessionStorage.getItem(`${storageKey}-idem`);
      if (key) idempotencyRef.current = key;
      else {
        const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        idempotencyRef.current = generated;
        sessionStorage.setItem(`${storageKey}-idem`, generated);
      }
    } catch {
      // El almacenamiento puede estar deshabilitado; el examen sigue funcionando.
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      // Ignorar cuota o almacenamiento deshabilitado.
    }
  }, [answers, storageKey]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!startedAt || !assessment.timeLimitMinutes || phase !== 'taking') {
      setRemainingSeconds(null);
      return;
    }
    const deadline = new Date(startedAt).getTime() + assessment.timeLimitMinutes * 60_000;
    const tick = () => {
      const seconds = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setRemainingSeconds(seconds);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startedAt, assessment.timeLimitMinutes, phase]);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch<{
        ok: boolean;
        intento: { attemptId: string; attemptNumber: number; startedAt: string };
      }>(`/api/courses/${slug}/assessments/${assessment.id}/start`, { method: 'POST' });
      setAttemptId(response.intento.attemptId);
      setStartedAt(response.intento.startedAt);
      setPhase('taking');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  }, [assessment.id, slug]);

  const submit = useCallback(async () => {
    if (!attemptId) return;
    if (unanswered > 0) {
      const confirmed = window.confirm(
        `Tienes ${unanswered} pregunta(s) sin responder. ¿Deseas enviar el examen de todas formas?`
      );
      if (!confirmed) return;
    }
    setBusy(true);
    setError(null);
    setPhase('submitting');
    try {
      const response = await apiFetch<{
        ok: boolean;
        resultado: {
          percentage: number | null;
          correctCount: number | null;
          totalQuestions: number | null;
          attemptNumber: number;
          submittedAt: string | null;
        };
      }>(`/api/courses/${slug}/assessments/${assessment.id}/submit`, {
        method: 'POST',
        body: {
          attemptId,
          idempotencyKey: idempotencyRef.current,
          answers: Object.entries(answers).map(([questionId, optionId]) => ({ questionId, optionId })),
        },
      });
      setResult(response.resultado);
      setPhase('result');
      try {
        if (storageKey) {
          sessionStorage.removeItem(storageKey);
        }
      } catch {
        // Ignorar.
      }
    } catch (caught) {
      setError(errorMessage(caught));
      setPhase('taking');
    } finally {
      setBusy(false);
    }
  }, [answers, assessment.id, attemptId, slug, storageKey, unanswered]);

  const exhausted = assessment.attemptsUsed >= assessment.attemptsAllowed && !assessment.inProgressAttemptId;

  if (phase === 'result' && result) {
    return (
      <div className="wa-cw-card" style={{ textAlign: 'center' }}>
        <span className="wa-cw-eyebrow">Resultado registrado</span>
        <h2 style={{ margin: '0.4rem 0 0.25rem' }}>{assessment.title}</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
          Intento {result.attemptNumber} · {programTitle}
          {moduleTitle ? ` · ${moduleTitle}` : ''}
        </p>
        <div className="wa-cw-result-score">{result.percentage === null ? '—' : `${result.percentage.toFixed(2)}%`}</div>
        <p style={{ color: 'var(--text-secondary)' }}>
          {result.correctCount === null
            ? 'Calificación registrada en el servidor.'
            : `${result.correctCount} de ${result.totalQuestions} respuestas correctas.`}
        </p>
        <div className="wa-cw-notice" style={{ textAlign: 'left' }}>
          La calificación fue calculada en el servidor. Por seguridad académica no se muestran
          respuestas correctas, claves, explicaciones ni indicadores por pregunta. La revisión
          detallada está reservada al personal académico autorizado.
        </div>
        <div className="wa-cw-actions" style={{ justifyContent: 'center' }}>
          <a
            className="wa-cw-button primary"
            href={`/api/courses/${slug}/attempts/${attemptId}/report?download=1`}
          >
            Descargar informe
          </a>
          <Link className="wa-cw-button secondary" href={`/cursos/${slug}`}>
            Volver al programa
          </Link>
        </div>
      </div>
    );
  }

  if (phase === 'instructions') {
    return (
      <div className="wa-cw-card">
        <div className="wa-cw-meta" style={{ marginBottom: '0.5rem' }}>
          <span className="wa-cw-chip is-live">{KIND_LABEL[assessment.kind] || assessment.kind}</span>
          <span className="wa-cw-chip">{assessment.questionCount} preguntas</span>
          <span className="wa-cw-chip">{assessment.attemptsAllowed} intento(s)</span>
          {assessment.timeLimitMinutes ? (
            <span className="wa-cw-chip">{assessment.timeLimitMinutes} minutos</span>
          ) : (
            <span className="wa-cw-chip">Sin cronómetro obligatorio</span>
          )}
        </div>
        <h1 style={{ fontFamily: 'var(--wa-font-display)', margin: '0.25rem 0 0.35rem' }}>{assessment.title}</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {programTitle}
          {moduleTitle ? ` · ${moduleTitle}` : ''}
        </p>
        {assessment.instructions && (
          <div className="wa-cw-notice" style={{ whiteSpace: 'pre-wrap' }}>{assessment.instructions}</div>
        )}
        <div className="wa-cw-notice" style={{ marginTop: '0.75rem' }}>
          <strong>Condiciones del intento</strong>
          <ul style={{ margin: '0.4rem 0 0', paddingLeft: '1.1rem' }}>
            <li>Una sola respuesta por pregunta.</li>
            <li>El envío definitivo no puede deshacerse.</li>
            <li>La calificación se calcula en el servidor al enviar el examen.</li>
            <li>
              Ventana configurada: {formatDeadline(assessment.opensAt)} — {formatDeadline(assessment.closesAt)}
            </li>
            <li>Intentos utilizados: {assessment.attemptsUsed} de {assessment.attemptsAllowed}.</li>
          </ul>
        </div>
        {exhausted ? (
          <div className="wa-cw-notice danger" style={{ marginTop: '0.75rem' }}>
            Ya utilizaste todos los intentos permitidos para esta evaluación.
          </div>
        ) : (
          <div className="wa-cw-actions">
            <button type="button" className="wa-cw-button primary" onClick={start} disabled={busy}>
              {busy ? 'Preparando…' : assessment.inProgressAttemptId ? 'Continuar intento' : 'Comenzar intento'}
            </button>
            <Link className="wa-cw-button ghost" href={`/cursos/${slug}`}>
              Volver sin comenzar
            </Link>
          </div>
        )}
        {error && <div className="wa-cw-notice danger" style={{ marginTop: '0.75rem' }}>{error}</div>}
      </div>
    );
  }

  return (
    <div>
      <div className="wa-cw-card" style={{ position: 'sticky', top: '76px', zIndex: 10, marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <strong style={{ display: 'block', fontSize: '0.95rem' }}>{assessment.title}</strong>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Respondidas {answeredCount} de {questions.length} · En blanco {unanswered}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {remainingSeconds !== null && (
              <span className={`wa-cw-pill ${remainingSeconds === 0 ? 'review' : 'published'}`}>
                {remainingSeconds === 0
                  ? 'Tiempo cumplido'
                  : `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`}
              </span>
            )}
            <button type="button" className="wa-cw-button primary" onClick={submit} disabled={busy}>
              {phase === 'submitting' || busy ? 'Enviando…' : 'Enviar examen'}
            </button>
          </div>
        </div>
        <div className="wa-cw-progress" style={{ marginTop: '0.6rem' }}>
          <span style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} />
        </div>
      </div>

      {remainingSeconds === 0 && (
        <div className="wa-cw-notice danger" style={{ marginBottom: '1rem' }}>
          Se cumplió el tiempo configurado. Envía el examen para registrar tu intento; el servidor
          valida la ventana oficial de la evaluación.
        </div>
      )}
      {error && <div className="wa-cw-notice danger" style={{ marginBottom: '1rem' }}>{error}</div>}

      {questions.map((question, index) => (
        <fieldset key={question.id} className="wa-cw-question">
          <legend>
            {index + 1}. {question.prompt}
          </legend>
          {question.options.map((option) => (
            <label key={option.id} className="wa-cw-option">
              <input
                type="radio"
                name={`q-${question.id}`}
                value={option.id}
                checked={answers[question.id] === option.id}
                onChange={() =>
                  setAnswers((current) => ({ ...current, [question.id]: option.id }))
                }
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      ))}

      <div className="wa-cw-actions" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          Tus respuestas se guardan como borrador en este dispositivo hasta el envío.
        </span>
        <button type="button" className="wa-cw-button primary" onClick={submit} disabled={busy}>
          {phase === 'submitting' || busy ? 'Enviando…' : 'Enviar examen'}
        </button>
      </div>
    </div>
  );
};
