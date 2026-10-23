'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Componente Atómico: ProgressBar
 * ARCHIVO: src/components/ui/ProgressBar.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Barra de progreso de aprendizaje con renderizado acelerado en GPU:
 * - Emplea transform: scaleX() y transform-origin: left para animar el avance
 *   al 100% en la GPU sin recalcular el layout del navegador (Impeccable Style).
 * - Cromática: Esmeralda Botánico (--accent-study) o Zafiro/Oro.
 * ==============================================================================
 */

import React from 'react';

export interface ProgressBarProps {
  valor: number; // 0 a 100
  altura?: number; // en px (8px default = 1x Carbon)
  color?: 'progress' | 'emerald' | 'gold' | 'navy';
  mostrarEtiqueta?: boolean;
  etiqueta?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  valor,
  altura = 8,
  color = 'progress',
  mostrarEtiqueta = false,
  etiqueta,
  className = '',
}) => {
  const progresoNormalizado = Math.min(100, Math.max(0, valor));
  const escala = progresoNormalizado / 100;

  const getColorFondo = (): string => {
    switch (color) {
      case 'gold':
        return 'var(--brand-gold)';
      case 'navy':
        return 'var(--brand-primary)';
      case 'emerald':
        return 'var(--accent-study)';
      case 'progress':
      default:
        return 'var(--progress-color)';
    }
  };

  const getColorPista = (): string => {
    switch (color) {
      case 'gold':
        return 'var(--brand-gold-soft)';
      case 'emerald':
        return 'var(--accent-study-soft)';
      case 'navy':
        return 'var(--bg-subtle)';
      case 'progress':
      default:
        return 'var(--progress-bg)';
    }
  };

  return (
    <div
      className={`wa-progress-container ${className}`}
      style={{ width: '100%' }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progresoNormalizado)}
      aria-label={etiqueta || 'Progreso de la sesión'}
    >
      {mostrarEtiqueta && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 'var(--wa-space-2)',
            fontSize: 'var(--wa-font-size-caption)',
            fontFamily: 'var(--wa-font-mono)',
            color: 'var(--text-secondary)',
          }}
        >
          <span>{etiqueta || 'Progreso de la sesión'}</span>
          <span>{Math.round(progresoNormalizado)}%</span>
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: `${altura}px`,
          backgroundColor: getColorPista(),
          borderRadius: 'var(--wa-radius-pill)',
          overflow: 'hidden',
          position: 'relative',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: getColorFondo(),
            transform: `scaleX(${escala})`,
            transformOrigin: 'left',
            transition: 'transform 300ms var(--wa-ease-decelerate)',
            borderRadius: 'var(--wa-radius-sm)',
          }}
        />
      </div>
    </div>
  );
};

