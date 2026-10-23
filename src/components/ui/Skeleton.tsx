'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Componente UI: Skeleton
 * ARCHIVO: src/components/ui/Skeleton.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Indicador de carga progresivo sin salto de layout (CLS = 0) conforme a NameThatUI:
 * - Animación de pulsación sutil en GPU (opacity 0.6 a 1).
 * - Utiliza neutros tintados de la paleta Modern Athenaeum (--bg-subtle).
 * ==============================================================================
 */

import React from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = 'var(--wa-radius-sm)',
  className = '',
  style,
}) => {
  return (
    <div
      aria-hidden="true"
      className={`wa-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--bg-subtle)',
        border: '1px solid var(--border-subtle)',
        animation: 'waSkeletonPulse 1.6s ease-in-out infinite',
        ...style,
      }}
    />
  );
};

