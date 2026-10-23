'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { Button } from '@/components/ui/Button';

interface NavItem {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  requiresGlobalContent?: boolean;
  requiresAdmin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Mi portal',
    match: (pathname) => pathname === '/dashboard',
  },
  {
    href: '/cursos',
    label: 'Cursos y talleres',
    match: (pathname) => pathname.startsWith('/cursos') || pathname.startsWith('/recurso'),
  },
  {
    href: '/aula',
    label: 'Aula virtual',
    match: (pathname) => pathname === '/aula',
  },
  {
    href: '/contenidos',
    label: 'Contenidos',
    match: (pathname) => pathname === '/contenidos',
    requiresGlobalContent: true,
  },
  {
    href: '/mi-acceso',
    label: 'Mi acceso',
    match: (pathname) => pathname === '/mi-acceso',
  },
  {
    href: '/catalogo#programas',
    label: 'Catálogo',
    match: (pathname) => pathname === '/catalogo',
  },
];

function roleLabel(role?: string | null): string {
  if (role === 'ADMIN') return 'Administración';
  if (role === 'TEACHER') return 'Docencia';
  if (role === 'STUDENT') return 'Estudiante';
  return 'Cuenta Wisdom';
}

function initials(name?: string | null): string {
  if (!name) return 'WA';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export const PortalShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const {
    usuario,
    tienePermiso,
    accesoContenidoGlobal,
    temaOscuro,
    alternarTema,
    cerrarSesion,
  } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const items = useMemo(
    () =>
      NAV_ITEMS.filter(
        (item) =>
          (!item.requiresGlobalContent || accesoContenidoGlobal) &&
          (!item.requiresAdmin || tienePermiso('admin.access'))
      ),
    [accesoContenidoGlobal, tienePermiso]
  );

  const isAdmin = tienePermiso('admin.access');
  const hideFooter =
    pathname === '/aula' ||
    /^\/recurso\/[^/]+\/?$/.test(pathname) ||
    /^\/cursos\/[^/]+\/?$/.test(pathname);

  const logout = async () => {
    await cerrarSesion();
    router.push('/login');
  };

  const resolveHref = (item: NavItem) =>
    item.href === '/mi-acceso' && isAdmin
      ? '/admin?tab=crm&crm=usuarios'
      : item.href;

  const resolveLabel = (item: NavItem) =>
    item.href === '/mi-acceso' && isAdmin ? 'Accesos CRM' : item.label;

  return (
    <div className="wa-portal" data-hydrated={hydrated ? 'true' : 'false'}>
      <a href="#contenido-principal" className="wa-skip-link">
        Saltar al contenido
      </a>
      <header className="wa-portal-header">
        <div className="wa-portal-header-inner">
          <Link href="/" className="wa-portal-brand" aria-label="Wisdom Academy — Inicio">
            <Image
              src="/brand/svg/wisdom-logo-horizontal-black.svg"
              alt="Wisdom Academy"
              width={158}
              height={30}
              priority
              className="wa-logo-for-light"
            />
            <Image
              src="/brand/svg/wisdom-logo-horizontal-white.svg"
              alt=""
              width={158}
              height={30}
              priority
              className="wa-logo-for-dark"
            />
          </Link>

          <nav className="wa-portal-nav" aria-label="Navegación principal">
            {items.map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.href}
                  href={resolveHref(item)}
                  className={active ? 'is-active' : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  {resolveLabel(item)}
                </Link>
              );
            })}
            {isAdmin && (
              <Link href="/admin" className="is-admin">
                Administración
              </Link>
            )}
          </nav>

          <div className="wa-portal-actions">
            {isAdmin && (pathname.startsWith('/cursos/') || pathname.startsWith('/recurso/')) && (
              <Link href="/admin?tab=crm&crm=programas" className="wa-portal-admin-return">
                <WisdomIcon name="layout" size={14} />
                <span>Volver al CRM</span>
              </Link>
            )}
            <button
              type="button"
              className="wa-theme-toggle"
              onClick={alternarTema}
              aria-label={temaOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
              title={temaOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
            >
              <WisdomIcon name={temaOscuro ? 'sun' : 'moon'} size={16} color="current" />
            </button>
            {usuario && (
              <span className="wa-portal-account">
                <span className="wa-portal-avatar" aria-hidden="true">
                  {initials(usuario.nombreCompleto)}
                </span>
                <span className="wa-portal-account-copy">
                  <strong>{usuario.nombreCompleto}</strong>
                  <small>{roleLabel(usuario.rol)}</small>
                </span>
              </span>
            )}
            <button
              type="button"
              className="wa-portal-icon-button wa-portal-logout"
              onClick={() => void logout()}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <WisdomIcon name="log-out" size={16} color="current" />
            </button>
            <button
              type="button"
              className="wa-portal-icon-button wa-portal-mobile-toggle"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen}
              aria-controls="wa-portal-mobile-menu"
            >
              <WisdomIcon name={menuOpen ? 'close' : 'menu'} size={18} color="current" />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="wa-portal-mobile-panel" id="wa-portal-mobile-menu">
            <nav className="wa-portal-mobile-nav" aria-label="Navegación principal móvil">
              {items.map((item) => {
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    href={resolveHref(item)}
                    className={active ? 'is-active' : undefined}
                    aria-current={active ? 'page' : undefined}
                  >
                    {resolveLabel(item)}
                  </Link>
                );
              })}
              {isAdmin && <Link href="/admin">Administración</Link>}
            </nav>
            {usuario && (
              <div className="wa-portal-mobile-foot">
                <span className="wa-portal-mobile-user">
                  <strong>{usuario.nombreCompleto}</strong>
                  <small>{roleLabel(usuario.rol)}</small>
                </span>
                <Button variant="secondary" size="sm" onClick={() => void logout()}>
                  Cerrar sesión
                </Button>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="wa-portal-content" id="contenido-principal" tabIndex={-1}>
        {children}
      </div>

      {!hideFooter && (
        <footer className="wa-portal-footer">
          <div className="wa-portal-footer-inner">
            <div className="wa-portal-footer-brand">
              <Link href="/" aria-label="Wisdom Academy — Inicio">
                <Image
                  src="/brand/svg/wisdom-logo-horizontal-black.svg"
                  alt="Wisdom Academy"
                  width={150}
                  height={28}
                  className="wa-logo-for-light"
                />
                <Image
                  src="/brand/svg/wisdom-logo-horizontal-white.svg"
                  alt=""
                  width={150}
                  height={28}
                  className="wa-logo-for-dark"
                />
              </Link>
              <p>
                Plataforma educativa integral: educación básica, apoyo homeschool, cursos y
                talleres con acompañamiento académico y acceso verificado.
              </p>
            </div>
            <div>
              <h2>Plataforma</h2>
              <nav className="wa-portal-footer-links" aria-label="Enlaces de plataforma">
                <Link href="/dashboard">Mi portal</Link>
                <Link href="/cursos">Cursos y talleres</Link>
                <Link href="/aula">Aula virtual</Link>
                <Link href="/catalogo#programas">Catálogo</Link>
              </nav>
            </div>
            <div>
              <h2>Tu cuenta</h2>
              <nav className="wa-portal-footer-links" aria-label="Enlaces de cuenta">
                <Link href={isAdmin ? '/admin?tab=crm&crm=usuarios' : '/mi-acceso'}>Mi acceso</Link>
                {accesoContenidoGlobal && <Link href="/contenidos">Contenidos</Link>}
                {isAdmin && <Link href="/admin">Administración</Link>}
                <Link href="/canjear">Canjear código</Link>
                <Link href="/cambiar-contrasena">Cambiar contraseña</Link>
              </nav>
            </div>
          </div>
          <div className="wa-portal-footer-bottom">
            <div className="wa-portal-footer-bottom-inner">
              <span>Wisdom Academy · Ecuador · Acceso académico verificado</span>
              <span>Educación con propósito, continuidad y trazabilidad.</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
