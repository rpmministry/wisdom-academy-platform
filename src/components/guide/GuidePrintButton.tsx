'use client';

import React from 'react';

/**
 * Acción de impresión del navegador. El CSS de la guía oculta la barra de
 * acciones y conserva el documento completo para impresión o guardado en PDF.
 */
export function GuidePrintButton() {
  return (
    <button
      type="button"
      className="wa-guide-action wa-guide-action--secondary"
      onClick={() => window.print()}
    >
      Imprimir guía
    </button>
  );
}
