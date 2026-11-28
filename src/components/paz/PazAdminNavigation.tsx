import React from 'react';
import Link from 'next/link';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export interface PazAdminNavigationProps {
  variant: 'admin' | 'floating';
  current?: 'landing' | 'workshop' | 'workspace';
}

/**
 * Accesos rápidos exclusivos para administradores del taller.
 * - `admin`: banners dentro del panel administrativo hacia el aula y la landing.
 * - `floating`: barra fija en el aula/landing para volver al panel sin perder la sesión.
 */
export function PazAdminNavigation({
  variant,
  current = 'workshop',
}: PazAdminNavigationProps) {
  if (variant === 'admin') {
    return (
      <nav className="paz-admin-banner-grid" aria-label="Accesos rápidos del taller">
        <Link href="/cursos/paz-en-la-mesa" className="paz-admin-banner paz-admin-banner--primary">
          <span className="paz-admin-banner-icon" aria-hidden="true">
            <WisdomIcon name="play" size={20} />
          </span>
          <span className="paz-admin-banner-copy">
            <strong>Ver el taller completo</strong>
            <small>Entra al aula virtual y prueba la plataforma como lo hace un participante.</small>
          </span>
          <span className="paz-admin-banner-cta">
            Abrir taller <WisdomIcon name="arrow-right" size={14} />
          </span>
        </Link>

        <Link href="/paz-en-la-mesa" className="paz-admin-banner">
          <span className="paz-admin-banner-icon paz-admin-banner-icon--soft" aria-hidden="true">
            <WisdomIcon name="layout" size={20} />
          </span>
          <span className="paz-admin-banner-copy">
            <strong>Ver la landing pública</strong>
            <small>Revisa la página de venta del taller tal como la ve el público.</small>
          </span>
          <span className="paz-admin-banner-cta">
            Ver landing <WisdomIcon name="arrow-right" size={14} />
          </span>
        </Link>
      </nav>
    );
  }

  return (
    <nav className="paz-admin-floating-nav" aria-label="Navegación de administrador">
      <span className="paz-admin-floating-text">
        <WisdomIcon name="shield" size={14} /> Modo administrador
      </span>
      <span className="paz-admin-floating-actions">
        {current !== 'workshop' && (
          <Link href="/cursos/paz-en-la-mesa" className="paz-admin-floating-link">
            Aula del taller
          </Link>
        )}
        {current !== 'landing' && (
          <Link href="/paz-en-la-mesa" className="paz-admin-floating-link">
            Landing
          </Link>
        )}
        <Link
          href="/admin/paz-en-la-mesa"
          className="paz-admin-floating-link paz-admin-floating-link--primary"
        >
          Panel del taller
        </Link>
      </span>
    </nav>
  );
}

export default PazAdminNavigation;
