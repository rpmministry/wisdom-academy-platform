'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Componente UI: Badge
 * ARCHIVO: src/components/ui/Badge.tsx
 *
 * PROPOSITO ARQUITECTONICO:
 * Etiqueta de estado compacta y consistente. La semantica cromatica se define
 * en src/styles/components.css y hereda los tokens del tema claro/oscuro.
 * ==============================================================================
 */

import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'gold' | 'navy' | 'emerald' | 'subtle' | 'ruby';
  size?: 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'subtle',
  size = 'md',
  className = '',
  style,
}) => {
  return (
    <span
      className={`wa-badge wa-badge--${variant} wa-badge--${size} ${className}`}
      style={style}
    >
      {children}
    </span>
  );
};
