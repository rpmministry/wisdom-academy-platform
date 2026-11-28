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
        className="paz-classes-tabs"
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
              className={`paz-class-tab${isSelected ? ' is-selected' : ''}`}
              style={
                {
                  '--tab-accent': item.accent,
                  '--tab-soft': item.soft,
                } as React.CSSProperties
              }
            >
              <span className="paz-class-tab-num">
                0{item.number}
              </span>
              <div className="paz-class-tab-body">
                <strong className="paz-class-tab-title">
                  {item.title}
                </strong>
                <span className="paz-class-tab-meta">
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
          background: 'var(--paz-card-bg, #ffffff)',
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
            borderBottom: '1px solid var(--paz-card-border, #e4dacb)',
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
                color: 'var(--paz-ink, #2b2927)',
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
                background: 'var(--paz-paper, #f2ede4)',
                color: 'var(--paz-ink, #2b2927)',
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
                background: 'var(--paz-paper, #f2ede4)',
                color: 'var(--paz-ink, #2b2927)',
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
            color: 'var(--paz-ink-soft, #4a463a)',
            margin: '0 0 1.5rem 0',
          }}
        >
          {selectedClass.summary}
        </p>

        {/* Enfoque pedagógico del anfitrión */}
        <div
          style={{
            fontSize: '0.88rem',
            color: 'var(--paz-ink-soft, #5c5847)',
            padding: '0.85rem 1.15rem',
            borderRadius: '12px',
            background: 'var(--paz-paper, #f2ede4)',
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
            color: 'var(--paz-ink, #2b2927)',
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
                background: 'var(--paz-card-alt, #faf8f5)',
                border: '1px solid var(--paz-card-border, #e4dacb)',
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
                <strong style={{ fontSize: '0.86rem', color: 'var(--paz-ink, #2b2927)' }}>
                  Bloque {block.number}: {block.title}
                </strong>
                <small style={{ color: 'var(--paz-muted, #7a7256)', fontWeight: 600 }}>{block.timeRange}</small>
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--paz-muted, #66615b)', margin: '0 0 0.5rem 0', lineHeight: 1.45 }}>
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
                      background: 'var(--paz-card-bg, #ffffff)',
                      border: '1px solid var(--paz-card-border, #e4dacb)',
                      color: 'var(--paz-ink-soft, #5c5847)',
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
          <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--paz-ink, #2b2927)', marginBottom: '0.5rem' }}>
            Resultados que obtendrás en esta clase:
          </strong>
          <ul
            style={{
              margin: 0,
              paddingLeft: '1.2rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '0.4rem',
              color: 'var(--paz-ink-soft, #4a463a)',
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
