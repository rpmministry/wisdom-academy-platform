'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Componente Atómico: Modal
 * ARCHIVO: src/components/ui/Modal.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Diálogo modal accesible con animación acelerada por GPU (transform y opacity):
 * - Curva de deceleración natural: cubic-bezier(0.2, 0, 0.38, 0.9) en 240ms.
 * - Backdrop con cristal translúcido (bg-glass).
 * - Cierre accesible con tecla Escape y clic en telón de fondo.
 * - Foco inicial dentro del diálogo, trampa de Tab y restauración del foco al
 *   cerrar, para que el aula siga siendo operable con teclado.
 * ==============================================================================
 */

import React, { useEffect, useRef } from 'react';

export interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo?: string;
  subtitulo?: string;
  anchoMaximo?: string;
  children: React.ReactNode;
}

/** Selector de elementos que pueden recibir foco dentro del diálogo. */
const SELECTOR_ENFOCABLES =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const Modal: React.FC<ModalProps> = ({
  abierto,
  onCerrar,
  titulo,
  subtitulo,
  anchoMaximo = '640px',
  children,
}) => {
  const dialogoRef = useRef<HTMLDivElement>(null);
  const focoAnteriorRef = useRef<HTMLElement | null>(null);
  const onCerrarRef = useRef(onCerrar);

  // Mantiene actualizada la referencia sin reiniciar el efecto en cada render.
  useEffect(() => {
    onCerrarRef.current = onCerrar;
  }, [onCerrar]);

  useEffect(() => {
    if (!abierto) return;

    focoAnteriorRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';

    const enfocarPrimero = () => {
      const dialogo = dialogoRef.current;
      if (!dialogo) return;
      const enfocables = Array.from(
        dialogo.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)
      ).filter((elemento) => elemento.offsetParent !== null);
      (enfocables[0] || dialogo).focus();
    };
    const temporizador = window.setTimeout(enfocarPrimero, 0);

    const handleKeyDown = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        evento.stopPropagation();
        onCerrarRef.current();
        return;
      }

      if (evento.key !== 'Tab') return;
      const dialogo = dialogoRef.current;
      if (!dialogo) return;

      const enfocables = Array.from(
        dialogo.querySelectorAll<HTMLElement>(SELECTOR_ENFOCABLES)
      ).filter((elemento) => elemento.offsetParent !== null);

      if (enfocables.length === 0) {
        evento.preventDefault();
        dialogo.focus();
        return;
      }

      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      const activo = document.activeElement;
      const activoDentro =
        activo instanceof HTMLElement && dialogo.contains(activo);

      if (!activoDentro) {
        evento.preventDefault();
        (evento.shiftKey ? ultimo : primero).focus();
        return;
      }

      if (evento.shiftKey && (activo === primero || activo === dialogo)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && activo === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(temporizador);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
      const anterior = focoAnteriorRef.current;
      if (anterior && document.contains(anterior)) {
        anterior.focus();
      }
    };
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo || 'Diálogo'}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--bg-overlay)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--carbon-space-2x)',
        zIndex: 9999,
        animation: 'waFadeIn 200ms var(--wa-ease-standard) forwards',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        ref={dialogoRef}
        tabIndex={-1}
        style={{
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          borderRadius: 'var(--wa-radius-xl)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-overlay)',
          width: '100%',
          maxWidth: anchoMaximo,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'waScaleIn 240ms var(--wa-ease-decelerate) forwards',
          outline: 'none',
        }}
      >
        {/* Cabecera del modal */}
        {(titulo || subtitulo) && (
          <div
            style={{
              padding: 'var(--carbon-space-3x)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-surface)',
            }}
          >
            <div>
              {titulo && (
                <h3
                  style={{
                    margin: 0,
                    fontFamily: 'var(--wa-font-display)',
                    fontSize: '1.25rem',
                    color: 'var(--text-primary)',
                  }}
                >
                  {titulo}
                </h3>
              )}
              {subtitulo && (
                <p
                  style={{
                    margin: '0.25rem 0 0 0',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--wa-font-sans)',
                  }}
                >
                  {subtitulo}
                </p>
              )}
            </div>
            <button
              onClick={onCerrar}
              aria-label="Cerrar modal"
              className="wa-modal-close"
              style={{
                background: 'transparent',
                border: '1px solid transparent',
                color: 'var(--text-secondary)',
                fontSize: '1.125rem',
                cursor: 'pointer',
                borderRadius: 'var(--wa-radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                flex: '0 0 auto',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Cuerpo del modal con scroll interno */}
        <div
          style={{
            padding: 'var(--carbon-space-3x)',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
