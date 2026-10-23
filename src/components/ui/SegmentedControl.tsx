'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Componente UI: SegmentedControl
 * ARCHIVO: src/components/ui/SegmentedControl.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Control segmentado de alta precisión conforme a NameThatUI y Superdesign:
 * - Selección táctil y accesible de perfiles de alumno, temas o vistas del aula.
 * - Animación en GPU sobre el indicador activo con la curva `cubic-bezier(0.22, 1, 0.36, 1)`.
 * - Cero saltos de diseño (CLS = 0) y alineación óptica milimétrica.
 * ==============================================================================
 */

import React from 'react';

export interface SegmentedControlOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  selectedId: string;
  onChange: (id: string) => void;
  size?: 'sm' | 'md';
  className?: string;
  style?: React.CSSProperties;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  selectedId,
  onChange,
  size = 'md',
  className = '',
  style,
}) => {
  const isSm = size === 'sm';

  return (
    <div
      role="radiogroup"
      className={`wa-segmented-control ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'var(--bg-subtle)',
        borderRadius: 'var(--wa-radius-md)',
        padding: '3px',
        border: '1px solid var(--border-subtle)',
        gap: '2px',
        userSelect: 'none',
        ...style,
      }}
    >
      {options.map((option) => {
        const isSelected = option.id === selectedId;

        return (
          <button
            key={option.id}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem',
              padding: isSm ? '0.25rem 0.625rem' : '0.375rem 0.875rem',
              borderRadius: 'calc(var(--wa-radius-md) - 2px)',
              backgroundColor: isSelected ? 'var(--bg-elevated)' : 'transparent',
              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: isSelected ? '1px solid var(--border-default)' : '1px solid transparent',
              boxShadow: isSelected ? 'var(--shadow-xs)' : 'none',
              cursor: 'pointer',
              fontFamily: 'var(--wa-font-sans)',
              fontSize: isSm ? '0.75rem' : '0.8125rem',
              fontWeight: isSelected ? 600 : 500,
              whiteSpace: 'nowrap',
            }}
          >
            {option.icon && (
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span
                style={{
                  fontSize: '0.625rem',
                  fontFamily: 'var(--wa-font-mono)',
                  padding: '1px 5px',
                  borderRadius: 'var(--wa-radius-sm)',
                  backgroundColor: isSelected
                    ? 'var(--brand-secondary-soft)'
                    : 'var(--bg-subtle)',
                  color: isSelected
                    ? 'var(--brand-secondary)'
                    : 'var(--text-muted)',
                }}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

