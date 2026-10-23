'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Componente UI: BentoGrid & BentoCard
 * ARCHIVO: src/components/ui/BentoGrid.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Rejilla asimétrica moderna de diseño Bento (conforme a NameThatUI y Superdesign):
 * - Estructura visual para presentar las capacidades de OpenMAIC, Moodle y la
 *   malla curricular bilingüe de Ecuador.
 * - Micro-interacciones suaves aceleradas por GPU (`cubic-bezier(0.22, 1, 0.36, 1)`).
 * - Bordes con líneas clave de Carbon (`1px solid var(--border-subtle)`).
 * ==============================================================================
 */

import React from 'react';
import { Badge } from './Badge';

export interface BentoGridProps {
  children: React.ReactNode;
  columnas?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const BentoGrid: React.FC<BentoGridProps> = ({
  children,
  columnas = 3,
  className = '',
  style,
}) => {
  return (
    <div
      className={`wa-bento-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(min(280px, 100%), 1fr))`,
        gap: 'var(--carbon-space-3x)',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export interface BentoCardProps {
  titulo: string;
  descripcion: string;
  etiqueta?: string;
  etiquetaVariante?: 'gold' | 'navy' | 'emerald' | 'subtle';
  icono?: React.ReactNode;
  contenidoVisual?: React.ReactNode;
  colSpan?: 1 | 2 | 3;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  titulo,
  descripcion,
  etiqueta,
  etiquetaVariante = 'gold',
  icono,
  contenidoVisual,
  colSpan = 1,
  className = '',
  style,
  onClick,
}) => {
  return (
    <div
      className={`wa-bento-card wa-bento-span-${colSpan} ${className}`}
      onClick={onClick}
      style={{
        gridColumn: colSpan > 1 ? `span ${colSpan}` : undefined,
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--wa-radius-lg)',
        border: '1px solid var(--border-subtle)',
        padding: 'var(--wa-space-6)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        transition: 'transform var(--wa-duration-moderate) var(--wa-ease-smooth), box-shadow var(--wa-duration-moderate) ease, border-color var(--wa-duration-moderate) ease',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-elevated)';
        e.currentTarget.style.borderColor = 'var(--border-default)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
      }}
    >
      {/* Zona superior: Icono y Etiqueta */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          {icono && (
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--wa-radius-md)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-primary)',
              }}
            >
              {icono}
            </div>
          )}
          {etiqueta && (
            <Badge variant={etiquetaVariante} size="sm">
              {etiqueta}
            </Badge>
          )}
        </div>

        {/* Título y Descripción */}
        <h3
          style={{
            margin: '0 0 0.5rem 0',
            fontFamily: 'var(--wa-font-display)',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.015em',
            lineHeight: 1.25,
          }}
        >
          {titulo}
        </h3>
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--wa-font-sans)',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.55,
            maxWidth: '65ch',
          }}
        >
          {descripcion}
        </p>
      </div>

      {/* Contenido Visual Interactivo (si aplica) */}
      {contenidoVisual && (
        <div style={{ marginTop: '1.25rem', width: '100%' }}>
          {contenidoVisual}
        </div>
      )}
    </div>
  );
};

