'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { Button } from '@/components/ui/Button';
import { CartWidget } from '@/components/cart/CartWidget';
import { AccountMenu } from '@/components/layout/AccountMenu';

interface PublicHeaderProps {
  home?: boolean;
  minimal?: boolean;
  showLogin?: boolean;
}

const HOME_LINKS = [
  { href: '#academia', label: 'Academia' },
  { href: '#metodo', label: 'Método' },
  { href: '#programas', label: 'Programas' },
  { href: '#preguntas', label: 'Preguntas' },
] as const;

/**
 * Encabezado público único para portada, catálogo, login y checkout.
 * En móvil reduce las acciones visibles a carrito, cuenta y menú; los enlaces
 * secundarios viven en un panel que se cierra al navegar o con Escape.
 */
export const PublicHeader: React.FC<PublicHeaderProps> = ({
  home = false,
  minimal = false,
  showLogin = true,
}) => {
  const pathname = usePathname();
  const { usuario, temaOscuro, alternarTema } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [menuOpen]);

  const navLinks = home && !minimal ? HOME_LINKS : [];
  const catalogActive = pathname.startsWith('/catalogo');

  return (
    <header
      ref={headerRef}
      className={`wa-catalog-header wa-public-header${minimal ? ' is-minimal' : ''}`}
    >
      <Link href="/" className="wa-catalog-brand" aria-label="Wisdom Academy — Inicio">
        <Image
          src="/brand/svg/wisdom-logo-horizontal-black.svg"
          alt="Wisdom Academy"
          width={168}
          height={32}
          priority
          className="wa-logo-for-light"
        />
        <Image
          src="/brand/svg/wisdom-logo-horizontal-white.svg"
          alt=""
          width={168}
          height={32}
          priority
          className="wa-logo-for-dark"
        />
      </Link>

      <nav className="wa-public-nav" aria-label="Navegación pública">
        {navLinks.map((link) => (
          <a key={link.href} href={link.href} className="wa-landing-anchor">
            {link.label}
          </a>
        ))}
        <Link
          href="/catalogo#programas"
          className={`wa-landing-anchor${catalogActive ? ' is-active' : ''}`}
          aria-current={catalogActive ? 'page' : undefined}
        >
          Catálogo
        </Link>
        {home && (
          <Link href="/guia-bienvenida-homeschool" className="wa-landing-anchor">
            Guía gratuita
          </Link>
        )}
      </nav>

      <div className="wa-public-actions">
        <button
          type="button"
          className="wa-theme-toggle wa-public-theme"
          onClick={alternarTema}
          aria-label={temaOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
          title={temaOscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
        >
          <WisdomIcon name={temaOscuro ? 'sun' : 'moon'} size={16} color="current" />
        </button>

        {!minimal && <CartWidget className="wa-public-cart" />}

        {usuario ? (
          <AccountMenu className="wa-public-account" />
        ) : (
          showLogin && (
            <>
              <Link href="/login" className="wa-public-login">
                <Button variant="primary-gold" size="sm">
                  Iniciar sesión
                </Button>
              </Link>
              <Link
                href="/login"
                className="wa-public-login-compact"
                aria-label="Iniciar sesión"
                title="Iniciar sesión"
              >
                <WisdomIcon name="user" size={18} color="current" />
              </Link>
            </>
          )
        )}

        <button
          type="button"
          className="wa-public-menu-toggle"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={menuOpen}
          aria-controls="wa-public-mobile-panel"
        >
          <WisdomIcon name={menuOpen ? 'close' : 'menu'} size={19} color="current" />
        </button>
      </div>

      {menuOpen && (
        <div className="wa-public-mobile-panel" id="wa-public-mobile-panel">
          <nav aria-label="Navegación pública móvil">
            {home && !minimal && (
              <>
                {HOME_LINKS.map((link) => (
                  <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                    {link.label}
                  </a>
                ))}
              </>
            )}
            <Link href="/" onClick={() => setMenuOpen(false)}>
              Inicio
            </Link>
            <Link href="/catalogo#programas" onClick={() => setMenuOpen(false)}>
              Catálogo
            </Link>
            <Link href="/guia-bienvenida-homeschool" onClick={() => setMenuOpen(false)}>
              Guía gratuita
            </Link>
          </nav>
          <div className="wa-public-mobile-foot">
            <button type="button" className="wa-public-theme-row" onClick={alternarTema}>
              <WisdomIcon name={temaOscuro ? 'sun' : 'moon'} size={17} color="current" />
              {temaOscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            </button>
            {!usuario && showLogin && (
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                <Button variant="primary-gold" size="sm">Iniciar sesión</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicHeader;
