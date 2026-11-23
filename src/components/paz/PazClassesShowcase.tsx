'use client';

import React, { useState } from 'react';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PAZ_CLASSES, type PazClass } from '@/lib/paz-en-la-mesa/content';

export interface PazClassesShowcaseProps {
  className?: string;
}

export function PazClassesShowcase({ className = '' }: PazClassesShowcaseProps) {
  const [selectedClassNum, setSelectedClassNum] = useState<number>(1);
  const selectedClass = PAZ_CLASSES.find((c) => c.number === selectedClassNum) || PAZ_CLASSES[0];

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
                    display: 'block',
                    fontSize: '0.74rem',
                    color: '#7a7256',
                    fontWeight: 500,
                    marginTop: '0.2rem',
                  }}
                >
                  {item.durationLabel} · {item.leader}
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

        {/* Enfoque pedagógico del anfitrión */}
        <div
          style={{
            fontSize: '0.88rem',
            color: '#5c5847',
            padding: '0.85rem 1.15rem',
            borderRadius: '12px',
            background: '#f2ede4',
            marginBottom: '1.75rem',
            lineHeight: 1.5,
            borderLeft: `4px solid ${selectedClass.accent}`,
          }}
        >
          <strong>Enfoque de la clase:</strong> {selectedClass.leaderDetail}
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
