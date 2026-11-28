'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export interface PazAdminNavigationProps {
  variant: 'admin' | 'floating';
  current?: 'landing' | 'workshop' | 'workspace';
}

/**
 * Accesos rápidos exclusivos para administradores del taller.
 * - `admin`: banners dentro del panel administrativo hacia el aula y la landing.
 * - `floating`: barra fija en el aula/landing para volver al panel sin perder la sesión.
 *
 * Incluye retroalimentación inmediata (`pendingHref`) al hacer clic para evitar
 * múltiples pulsaciones mientras responde el servidor.
 */
export function PazAdminNavigation({
  variant,
  current = 'workshop',
}: PazAdminNavigationProps) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(() => setPendingHref(null), 8000);
    return () => window.clearTimeout(timer);
  }, [pendingHref]);

  const handleNavClick = (href: string, event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (pathname === href) {
      event.preventDefault();
      return;
    }
    if (pendingHref === href) {
      event.preventDefault();
      return;
    }
    setPendingHref(href);
  };

  if (variant === 'admin') {
    const workshopLoading = pendingHref === '/cursos/paz-en-la-mesa';
    const landingLoading = pendingHref === '/paz-en-la-mesa';

    return (
      <nav className="paz-admin-banner-grid" aria-label="Accesos rápidos del taller">
        <Link
          href="/cursos/paz-en-la-mesa"
          prefetch
          onClick={(e) => handleNavClick('/cursos/paz-en-la-mesa', e)}
          aria-busy={workshopLoading || undefined}
          className={`paz-admin-banner paz-admin-banner--primary${workshopLoading ? ' is-loading' : ''}`}
        >
          <span className="paz-admin-banner-icon" aria-hidden="true">
            <WisdomIcon name="play" size={20} />
          </span>
          <span className="paz-admin-banner-copy">
            <strong>Ver el taller completo</strong>
            <small>Entra al aula virtual y prueba la plataforma como lo hace un participante.</small>
          </span>
          <span className="paz-admin-banner-cta">
            {workshopLoading ? (
              <>
                <span className="paz-nav-spinner" aria-hidden="true" /> Abriendo…
              </>
            ) : (
              <>
                Abrir taller <WisdomIcon name="arrow-right" size={14} />
              </>
            )}
          </span>
        </Link>

        <Link
          href="/paz-en-la-mesa"
          prefetch
          onClick={(e) => handleNavClick('/paz-en-la-mesa', e)}
          aria-busy={landingLoading || undefined}
          className={`paz-admin-banner${landingLoading ? ' is-loading' : ''}`}
        >
          <span className="paz-admin-banner-icon paz-admin-banner-icon--soft" aria-hidden="true">
            <WisdomIcon name="layout" size={20} />
          </span>
          <span className="paz-admin-banner-copy">
            <strong>Ver la landing pública</strong>
            <small>Revisa la página de venta del taller tal como la ve el público.</small>
          </span>
          <span className="paz-admin-banner-cta">
            {landingLoading ? (
              <>
                <span className="paz-nav-spinner" aria-hidden="true" /> Abriendo…
              </>
            ) : (
              <>
                Ver landing <WisdomIcon name="arrow-right" size={14} />
              </>
            )}
          </span>
        </Link>
      </nav>
    );
  }

  const isWorkshop = current === 'workshop' || current === 'workspace';
  const isLanding = current === 'landing';
  const workshopHref = '/cursos/paz-en-la-mesa';
  const landingHref = '/paz-en-la-mesa';
  const adminHref = '/admin/paz-en-la-mesa';

  return (
    <nav className="paz-admin-floating-nav" aria-label="Navegación de administrador">
      <span className="paz-admin-floating-text">
        <WisdomIcon name="shield" size={14} /> Modo administrador
      </span>
      <span className="paz-admin-floating-actions">
        {!isWorkshop && (
          <Link
            href={workshopHref}
            prefetch
            onClick={(e) => handleNavClick(workshopHref, e)}
            aria-busy={pendingHref === workshopHref || undefined}
            className={`paz-admin-floating-link${pendingHref === workshopHref ? ' is-loading' : ''}`}
          >
            {pendingHref === workshopHref ? (
              <>
                <span className="paz-nav-spinner" aria-hidden="true" /> Abriendo…
              </>
            ) : (
              'Aula del taller'
            )}
          </Link>
        )}
        {!isLanding && (
          <Link
            href={landingHref}
            prefetch
            onClick={(e) => handleNavClick(landingHref, e)}
            aria-busy={pendingHref === landingHref || undefined}
            className={`paz-admin-floating-link${pendingHref === landingHref ? ' is-loading' : ''}`}
          >
            {pendingHref === landingHref ? (
              <>
                <span className="paz-nav-spinner" aria-hidden="true" /> Abriendo…
              </>
            ) : (
              'Landing'
            )}
          </Link>
        )}
        <Link
          href={adminHref}
          prefetch
          onClick={(e) => handleNavClick(adminHref, e)}
          aria-busy={pendingHref === adminHref || undefined}
          className={`paz-admin-floating-link paz-admin-floating-link--primary${pendingHref === adminHref ? ' is-loading' : ''}`}
        >
          {pendingHref === adminHref ? (
            <>
              <span className="paz-nav-spinner" aria-hidden="true" /> Abriendo…
            </>
          ) : (
            'Panel del taller'
          )}
        </Link>
      </span>
    </nav>
  );
}

export default PazAdminNavigation;
