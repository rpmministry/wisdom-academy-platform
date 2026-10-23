'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Componente UI: Card
 * ARCHIVO: src/components/ui/Card.tsx
 *
 * PROPOSITO ARQUITECTONICO:
 * Superficie base para tarjetas y paneles. Unifica radios, bordes y elevacion
 * mediante tokens y clases compartidas; no anida decoracion innecesaria.
 * ==============================================================================
 */

import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'surface' | 'elevated' | 'subtle' | 'gold-border';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'surface',
  padding = 'md',
  className = '',
  style,
  onClick,
}) => {
  const paddingMap = {
    none: '0',
    sm: 'var(--wa-space-3)',
    md: 'var(--wa-space-5)',
    lg: 'var(--wa-space-6)',
  };

  return (
    <div
      className={`wa-card wa-card--${variant} ${onClick ? 'wa-card--interactive' : ''} ${className}`}
      onClick={onClick}
      style={{
        padding: paddingMap[padding],
        ...style,
      }}
    >
      {children}
    </div>
  );
};
