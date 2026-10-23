'use client';

import React, { useRef } from 'react';

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  icono?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activaId: string;
  onCambiarTab: (id: string) => void;
  className?: string;
  ariaLabel?: string;
  idPrefix?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activaId,
  onCambiarTab,
  className = '',
  ariaLabel = 'Secciones',
  idPrefix,
}) => {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const moveTo = (index: number) => {
    const next = tabs[index];
    if (!next) return;
    onCambiarTab(next.id);
    buttonsRef.current[index]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveTo((index + 1) % tabs.length);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveTo((index - 1 + tabs.length) % tabs.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveTo(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveTo(tabs.length - 1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`wa-tabs-container ${className}`}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        width: '100%',
      }}
    >
      {tabs.map((tab, index) => {
        const esActiva = tab.id === activaId;
        return (
          <button
            key={tab.id}
            ref={(element) => {
              buttonsRef.current[index] = element;
            }}
            id={idPrefix ? `${idPrefix}-tab-${tab.id}` : undefined}
            role="tab"
            type="button"
            aria-selected={esActiva}
            aria-controls={idPrefix && esActiva ? `${idPrefix}-panel-${tab.id}` : undefined}
            tabIndex={esActiva ? 0 : -1}
            onClick={() => onCambiarTab(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icono && (
              <span style={{ display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
                {tab.icono}
              </span>
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="wa-tab-badge">{tab.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
};
