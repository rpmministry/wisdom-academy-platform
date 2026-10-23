'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Componente Atómico: Button
 * ARCHIVO: src/components/ui/Button.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Botón accesible fundamentado en el 2x Grid de IBM Carbon Design System.
 * Los colores, estados hover/active/disabled y el foco visible viven en
 * src/styles/components.css para mantener una única fuente de verdad.
 * ==============================================================================
 */

import React from 'react';
import Link from 'next/link';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary-gold' | 'primary-navy' | 'secondary' | 'ghost' | 'emerald';
  size?: 'sm' | 'md' | 'lg';
  icono?: React.ReactNode;
  children?: React.ReactNode;
  /** Estado de carga accesible: deshabilita el botón y muestra un indicador. */
  cargando?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary-gold',
  size = 'md',
  icono,
  children,
  className = '',
  disabled,
  cargando = false,
  style,
  ...props
}) => {
  const estaDeshabilitado = Boolean(disabled || cargando);

  const paddingMap = {
    sm: '0.4375rem 0.75rem',
    md: '0.625rem 1.125rem',
    lg: '0.75rem 1.5rem',
  };

  const fontSizeMap = {
    sm: '0.8125rem',
    md: '0.875rem',
    lg: '0.9375rem',
  };

  const estiloBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontFamily: 'var(--wa-font-sans)',
    fontWeight: 600,
    fontSize: fontSizeMap[size],
    padding: paddingMap[size],
    borderRadius: 'var(--wa-radius-md)',
    cursor: cargando ? 'progress' : estaDeshabilitado ? 'not-allowed' : 'pointer',
    opacity: !cargando && estaDeshabilitado ? 0.62 : 1,
    textDecoration: 'none',
    userSelect: 'none',
    ...style,
  };

  return (
    <button
      className={`wa-button wa-button--${variant} ${cargando ? 'wa-button-loading' : ''} ${className}`}
      style={estiloBase}
      disabled={estaDeshabilitado}
      aria-busy={cargando || undefined}
      onMouseDown={(e) => {
        if (!estaDeshabilitado) e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        if (!estaDeshabilitado) e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        if (!estaDeshabilitado) e.currentTarget.style.transform = 'scale(1)';
      }}
      {...props}
    >
      {cargando ? (
        <span className="wa-button-spinner" aria-hidden="true" />
      ) : (
        icono && <span className="wa-button-icon" style={{ display: 'inline-flex' }}>{icono}</span>
      )}
      {children && <span>{children}</span>}
    </button>
  );
};

export interface ButtonLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  icono?: React.ReactNode;
  children?: React.ReactNode;
}

export const ButtonLink: React.FC<ButtonLinkProps> = ({
  href,
  variant = 'primary-gold',
  size = 'md',
  icono,
  children,
  className = '',
  style,
  ...props
}) => {
  const paddingMap = {
    sm: '0.4375rem 0.75rem',
    md: '0.625rem 1.125rem',
    lg: '0.75rem 1.5rem',
  };

  const fontSizeMap = {
    sm: '0.8125rem',
    md: '0.875rem',
    lg: '0.9375rem',
  };

  return (
    <Link
      href={href}
      className={`wa-button wa-button--${variant} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        fontFamily: 'var(--wa-font-sans)',
        fontWeight: 600,
        fontSize: fontSizeMap[size],
        padding: paddingMap[size],
        borderRadius: 'var(--wa-radius-md)',
        textDecoration: 'none',
        userSelect: 'none',
        ...style,
      }}
      {...props}
    >
      {icono && <span className="wa-button-icon" style={{ display: 'inline-flex' }}>{icono}</span>}
      {children && <span>{children}</span>}
    </Link>
  );
};
