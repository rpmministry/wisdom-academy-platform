'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PAZ_CLASSES, type PazClass } from '@/lib/paz-en-la-mesa/content';
import { pazPublicConfig } from '@/lib/paz-en-la-mesa/config';

export interface PazClassesShowcaseProps {
  className?: string;
}

export function PazClassesShowcase({ className = '' }: PazClassesShowcaseProps) {
  const [selectedClassNum, setSelectedClassNum] = useState<number>(1);
  const selectedClass = PAZ_CLASSES.find((c) => c.number === selectedClassNum) || PAZ_CLASSES[0];

  const classVideoStatus = (num: number) => {
    if (num === 1) {
      return { label: 'Video disponible en el aula', available: true, ready: true };
    }
    return { label: 'Próximamente disponible', available: false, ready: false };
  };

  return (
    <div className={`paz-classes-showcase ${className}`.trim()}>
      {/* Selector de pestañas de las 4 clases */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.75rem',
        }}
        role="tablist"
        aria-label="Clases del taller"
      >
        {PAZ_CLASSES.map((item) => {
          const isSelected = item.number === selectedClassNum;
          const status = classVideoStatus(item.number);
          return (
            <button
              key={item.key}
              role="tab"
              aria-selected={isSelected}
              type="button"
              onClick={() => setSelectedClassNum(item.number)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                padding: '0.9rem 1.1rem',
                borderRadius: '16px',
                border: isSelected
                  ? `2px solid ${item.accent}`
                  : '1px solid rgba(228,218,203,0.85)',
                background: isSelected ? item.soft : '#faf8f5',
                color: '#2b2927',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 160ms ease',
                boxShadow: isSelected ? '0 8px 24px rgba(43,41,39,0.08)' : 'none',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: item.accent,
                  color: '#faf8f5',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  fontFamily: 'var(--paz-serif)',
                  flexShrink: 0,
                }}
              >
                0{item.number}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <strong
                  style={{
                    display: 'block',
                    fontSize: '0.92rem',
                    lineHeight: 1.25,
                    color: '#2b2927',
                  }}
                >
                  {item.title}
                </strong>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.72rem',
                    color: status.ready ? '#8f4e38' : '#7a7256',
                    fontWeight: 600,
                    marginTop: '0.2rem',
                  }}
                >
                  {status.ready && <WisdomIcon name="sparkles" size={11} />}
                  {status.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detalle de la clase seleccionada */}
      <article
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: `1px solid ${selectedClass.accent}33`,
          padding: 'clamp(1.5rem, 3.5vw, 2.5rem)',
          boxShadow: '0 16px 48px rgba(43,41,39,0.06)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            borderBottom: '1px solid #e4dacb',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: selectedClass.accent,
                marginBottom: '0.35rem',
              }}
            >
              <WisdomIcon name="book" size={13} /> Clase 0{selectedClass.number}
            </span>
            <h3
              style={{
                fontFamily: 'var(--paz-serif)',
                fontSize: 'clamp(1.35rem, 3vw, 1.85rem)',
                margin: 0,
                color: '#2b2927',
                lineHeight: 1.25,
              }}
            >
              {selectedClass.title}: <em>{selectedClass.headline}</em>
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                background: selectedClass.soft,
                color: '#2b2927',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              <WisdomIcon name="clock" size={14} /> {selectedClass.durationLabel}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                background: '#f2ede4',
                color: '#2b2927',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              <WisdomIcon name="user" size={14} /> {selectedClass.leader}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                borderRadius: '999px',
                background: '#f2ede4',
                color: '#2b2927',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              <WisdomIcon name="file-text" size={14} /> {selectedClass.pages}
            </span>
          </div>
        </div>

        <p
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.6,
            color: '#4a463a',
            margin: '0 0 1.5rem 0',
          }}
        >
          {selectedClass.summary}
        </p>

        {/* Módulo de video y recursos de la clase */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            marginBottom: '2rem',
          }}
        >
          {/* Tarjeta de video */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '16px',
              background: '#fcfbfa',
              border: '1px solid #e4dacb',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.6rem',
              }}
            >
              <strong style={{ fontSize: '0.9rem', color: '#2b2927' }}>
                <WisdomIcon name="video" size={15} /> Video de la clase
              </strong>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '999px',
                  fontWeight: 700,
                  background:
                    selectedClass.number === 1
                      ? 'rgba(179,106,80,0.15)'
                      : 'rgba(92,88,71,0.12)',
                  color:
                    selectedClass.number === 1 ? '#8f4e38' : '#5c5847',
                }}
              >
                {selectedClass.number === 1
                  ? 'Video disponible en el aula'
                  : 'Próximamente'}
              </span>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#66615b', margin: '0 0 0.85rem 0' }}>
              {selectedClass.number === 1
                ? 'La primera clase se encuentra completamente editada y lista para reproducir en tu aula exclusiva de estudiante tras la inscripción.'
                : 'Clase grabada con Samuel y Gabby Palacio. Se liberará oficialmente con el estreno del taller.'}
            </p>
            {selectedClass.number === 1 ? (
              <Link
                href="/cursos/paz-en-la-mesa"
                className="paz-btn paz-btn--primary paz-btn--small"
                style={{ width: '100%', marginBottom: '0.65rem' }}
              >
                <WisdomIcon name="graduation-cap" size={14} /> Entrar al aula del taller
              </Link>
            ) : null}
            <div
              style={{
                fontSize: '0.8rem',
                color: '#7a7256',
                fontStyle: 'italic',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                background: '#f2ede4',
              }}
            >
              {selectedClass.leaderDetail}
            </div>
          </div>

          {/* Tarjeta de recursos descargables */}
          <div
            style={{
              padding: '1.25rem',
              borderRadius: '16px',
              background: '#fcfbfa',
              border: '1px solid #e4dacb',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.6rem',
              }}
            >
              <strong style={{ fontSize: '0.9rem', color: '#2b2927' }}>
                <WisdomIcon name="file-text" size={15} /> Recurso descargable
              </strong>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '999px',
                  fontWeight: 700,
                  background: 'rgba(197,160,89,0.2)',
                  color: '#8f6820',
                }}
              >
                Cuaderno PDF (24 págs)
              </span>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#66615b', margin: '0 0 0.85rem 0' }}>
              <strong>Herramienta:</strong> {selectedClass.tool} ({selectedClass.toolPages}).
              Interactivo e imprimible para trabajar en pareja o familia.
            </p>
            <a
              href="#inscripcion"
              className="paz-btn paz-btn--ghost paz-btn--small"
              style={{ width: '100%' }}
            >
              <WisdomIcon name="award" size={14} /> Descargable al inscribirte
            </a>
          </div>
        </div>

        {/* Bloques de la clase */}
        <h4
          style={{
            fontSize: '0.95rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#2b2927',
            margin: '0 0 1rem 0',
          }}
        >
          Estructura de la clase en 4 bloques
        </h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '0.9rem',
            marginBottom: '1.5rem',
          }}
        >
          {selectedClass.blocks.map((block) => (
            <div
              key={block.number}
              style={{
                padding: '1rem',
                borderRadius: '12px',
                background: '#faf8f5',
                border: '1px solid #e4dacb',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '0.35rem',
                }}
              >
                <strong style={{ fontSize: '0.86rem', color: '#2b2927' }}>
                  Bloque {block.number}: {block.title}
                </strong>
                <small style={{ color: '#7a7256', fontWeight: 600 }}>{block.timeRange}</small>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#66615b', margin: '0 0 0.5rem 0', lineHeight: 1.45 }}>
                {block.summary}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                {block.scriptures.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '6px',
                      background: '#ffffff',
                      border: '1px solid #e4dacb',
                      color: '#5c5847',
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Resultados esperados */}
        <div>
          <strong style={{ display: 'block', fontSize: '0.88rem', color: '#2b2927', marginBottom: '0.5rem' }}>
            Resultados que obtendrás en esta clase:
          </strong>
          <ul
            style={{
              margin: 0,
              paddingLeft: '1.2rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '0.4rem',
              color: '#4a463a',
              fontSize: '0.88rem',
            }}
          >
            {selectedClass.outcomes.map((outcome) => (
              <li key={outcome}>{outcome}</li>
            ))}
          </ul>
        </div>
      </article>
    </div>
  );
}

export default PazClassesShowcase;
