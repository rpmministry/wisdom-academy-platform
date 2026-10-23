'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Iconografía Canónica Runeicons (<WisdomIcon />)
 * ARCHIVO: src/components/ui/WisdomIcon.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Sistema de iconografía vectorial monocromática de alta precisión inspirado en
 * Runeicons (https://github.com/Runeicons/runeicons).
 * Hereda dinámicamente las variables de color del sistema Evergreen Scholar:
 * - 'gold': var(--brand-gold) (verde de acción; alias de compatibilidad)
 * - 'primary': var(--brand-primary) (verde institucional / marca)
 * - 'secondary': var(--brand-secondary) (océano / información y administración)
 * - 'emerald': var(--accent-study) (progreso formativo)
 * - 'current': currentColor (heredado del texto contenedor)
 *
 * Cuadrícula de diseño: 24x24 px, strokeLinecap="round", strokeLinejoin="round".
 * ==============================================================================
 */

import React from 'react';

export type IconName =
  | 'book'
  | 'graduation-cap'
  | 'chalkboard'
  | 'microphone'
  | 'play'
  | 'pause'
  | 'volume'
  | 'search'
  | 'settings'
  | 'sparkles'
  | 'chevron-right'
  | 'chevron-down'
  | 'check'
  | 'user'
  | 'calendar'
  | 'file-text'
  | 'shield'
  | 'video'
  | 'sun'
  | 'moon'
  | 'cross'
  | 'award'
  | 'chart'
  | 'download'
  | 'code'
  | 'terminal'
  | 'light'
  | 'home'
  | 'arrow-right'
  | 'clock'
  | 'menu'
  | 'close'
  | 'log-out'
  | 'layout'
  | 'refresh'
  | 'users'
  | 'receipt'
  | 'activity';

export interface WisdomIconProps {
  name: IconName;
  color?: 'gold' | 'primary' | 'secondary' | 'emerald' | 'current' | 'ruby' | string;
  size?: number | string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const WisdomIcon: React.FC<WisdomIconProps> = ({
  name,
  color = 'current',
  size = 20,
  strokeWidth = 2,
  className = '',
  style,
}) => {
  const getColorValue = (): string => {
    switch (color) {
      case 'gold':
        return 'var(--brand-gold)';
      case 'primary':
        return 'var(--brand-primary)';
      case 'emerald':
        return 'var(--accent-study)';
      case 'secondary':
        return 'var(--brand-secondary)';
      case 'ruby':
        return 'var(--wa-brand-ruby-alert)';
      case 'current':
        return 'currentColor';
      default:
        return color;
    }
  };

  const strokeColor = getColorValue();

  const renderPath = () => {
    switch (name) {
      case 'book':
        return (
          <>
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
            <path d="M6 6h10" />
            <path d="M6 10h10" />
          </>
        );
      case 'graduation-cap':
        return (
          <>
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </>
        );
      case 'chalkboard':
        return (
          <>
            <rect width="18" height="14" x="3" y="3" rx="2" />
            <path d="M7 21h10M12 17v4M8 12h8" />
          </>
        );
      case 'microphone':
        return (
          <>
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 22h8" />
          </>
        );
      case 'play':
        return <polygon points="6 3 20 12 6 21 6 3" fill={strokeColor} fillOpacity="0.2" />;
      case 'pause':
        return (
          <>
            <rect width="4" height="16" x="6" y="4" rx="1" fill={strokeColor} fillOpacity="0.2" />
            <rect width="4" height="16" x="14" y="4" rx="1" fill={strokeColor} fillOpacity="0.2" />
          </>
        );
      case 'volume':
        return (
          <>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14" />
          </>
        );
      case 'search':
        return (
          <>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </>
        );
      case 'settings':
        return (
          <>
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </>
        );
      case 'sparkles':
        return (
          <>
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
          </>
        );
      case 'chevron-right':
        return <path d="m9 18 6-6-6-6" />;
      case 'chevron-down':
        return <path d="m6 9 6 6 6-6" />;
      case 'check':
        return <path d="M20 6 9 17l-5-5" />;
      case 'user':
        return (
          <>
            <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </>
        );
      case 'calendar':
        return (
          <>
            <rect width="18" height="18" x="3" y="4" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </>
        );
      case 'file-text':
        return (
          <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </>
        );
      case 'shield':
        return <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
      case 'video':
        return (
          <>
            <polygon points="23 7 16 12 23 17 23 7" />
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
          </>
        );
      case 'sun':
        return (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </>
        );
      case 'moon':
        return <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />;
      case 'cross':
        return (
          <>
            <path d="M12 2v20M7 8h10" />
          </>
        );
      case 'award':
        return (
          <>
            <circle cx="12" cy="8" r="6" />
            <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.723.518L12 19.828l-4.269 2.106a.5.5 0 0 1-.723-.518l1.515-8.526" />
          </>
        );
      case 'chart':
        return (
          <>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </>
        );
      case 'download':
        return (
          <>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </>
        );
      case 'code':
        return (
          <>
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </>
        );
      case 'terminal':
        return (
          <>
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </>
        );
      case 'light':
        return (
          <>
            <circle cx="12" cy="12" r="3" fill={strokeColor} />
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 5l2 2" />
          </>
        );
      case 'home':
        return (
          <>
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </>
        );
      case 'arrow-right':
        return (
          <>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </>
        );
      case 'clock':
        return (
          <>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </>
        );
      case 'menu':
        return (
          <>
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </>
        );
      case 'close':
        return (
          <>
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </>
        );
      case 'log-out':
        return (
          <>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </>
        );
      case 'layout':
        return (
          <>
            <rect width="7" height="9" x="3" y="3" rx="1" />
            <rect width="7" height="5" x="14" y="3" rx="1" />
            <rect width="7" height="9" x="14" y="12" rx="1" />
            <rect width="7" height="5" x="3" y="16" rx="1" />
          </>
        );
      case 'refresh':
        return (
          <>
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </>
        );
      case 'users':
        return (
          <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </>
        );
      case 'receipt':
        return (
          <>
            <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
            <path d="M8 7h8" />
            <path d="M8 11h8" />
            <path d="M8 15h5" />
          </>
        );
      case 'activity':
        return <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />;
      default:
        return null;
    }
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`wa-icon wa-icon-${name} ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
    >
      {renderPath()}
    </svg>
  );
};

