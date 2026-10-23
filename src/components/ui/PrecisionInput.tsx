'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Componente UI: PrecisionInput
 * ARCHIVO: src/components/ui/PrecisionInput.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Campo de entrada de alta precisión inspirado en OriginKit y Superdesign:
 * - Alineación óptica milimétrica con soporte para icono prefijo/sufijo.
 * - Anillo de enfoque de alto contraste (--border-gold / --brand-primary).
 * - Cero saltos de layout (CLS = 0) con tipografía IBM Plex Sans e IBM Plex Mono.
 * ==============================================================================
 */

import React from 'react';

export interface PrecisionInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  iconoPrefijo?: React.ReactNode;
  iconoSufijo?: React.ReactNode;
}

export const PrecisionInput: React.FC<PrecisionInputProps> = ({
  label,
  helperText,
  error,
  iconoPrefijo,
  iconoSufijo,
  className = '',
  disabled,
  style,
  ...props
}) => {
  return (
    <div className={`wa-input-group ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', width: '100%' }}>
      {label && (
        <label
          style={{
            fontSize: '0.8125rem',
            fontWeight: 600,
            color: error ? 'var(--status-danger)' : 'var(--text-secondary)',
            fontFamily: 'var(--wa-font-sans)',
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </label>
      )}

      <div
        className="wa-input-shell"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: disabled ? 'var(--bg-subtle)' : 'var(--bg-surface)',
          borderRadius: 'var(--wa-radius-md)',
          border: error
            ? '1.5px solid var(--status-danger)'
            : '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-xs)',
          transition: 'border-color 150ms ease, box-shadow 150ms ease',
        }}
      >
        {iconoPrefijo && (
          <span
            style={{
              paddingLeft: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              color: 'var(--text-muted)',
            }}
          >
            {iconoPrefijo}
          </span>
        )}

        <input
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          style={{
            width: '100%',
            padding: iconoPrefijo
              ? '0.625rem 0.75rem 0.625rem 0.5rem'
              : '0.625rem 0.75rem',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontFamily: 'var(--wa-font-sans)',
            fontSize: '0.875rem',
            boxSizing: 'border-box',
            ...style,
          }}
          {...props}
        />

        {iconoSufijo && (
          <span
            style={{
              paddingRight: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              color: 'var(--text-muted)',
            }}
          >
            {iconoSufijo}
          </span>
        )}
      </div>

      {(error || helperText) && (
        <span
          style={{
            fontSize: 'var(--wa-font-size-caption)',
            color: error ? 'var(--status-danger)' : 'var(--text-muted)',
            fontFamily: 'var(--wa-font-sans)',
            marginTop: '0.125rem',
          }}
        >
          {error || helperText}
        </span>
      )}
    </div>
  );
};

