'use client';

import React from 'react';

interface AdminTabErrorBoundaryProps {
  children: React.ReactNode;
}

interface AdminTabErrorBoundaryState {
  error: Error | null;
}

/**
 * Aísla un fallo de renderizado de una pestaña administrativa para que no
 * derribe todo el panel. Permite reintentar sin recargar la aplicación.
 */
export class AdminTabErrorBoundary extends React.Component<
  AdminTabErrorBoundaryProps,
  AdminTabErrorBoundaryState
> {
  state: AdminTabErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AdminTabErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error('[AdminTabErrorBoundary]', error);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="wa-cw-card" role="alert">
          <h3 style={{ marginTop: 0 }}>No se pudo cargar esta sección</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {this.state.error.message || 'Ocurrió un error inesperado en la interfaz.'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            El resto del panel sigue funcionando. Si el problema continúa, recarga la página o reinicia el
            servidor de desarrollo después de borrar la carpeta <code>.next</code>.
          </p>
          <button
            type="button"
            className="wa-cw-button primary"
            onClick={() => this.setState({ error: null })}
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
