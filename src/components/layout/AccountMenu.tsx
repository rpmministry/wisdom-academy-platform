'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

interface AccountMenuProps {
  showName?: boolean;
  className?: string;
  triggerClassName?: string;
  menuAlign?: 'left' | 'right';
  roleLabel?: string | null;
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

/**
 * Menú de cuenta compartido por el portal, el catálogo y el CRM.
 * Mantiene el perfil y la salida en un control visible y operable con teclado,
 * ratón y pantalla táctil en todos los tamaños.
 */
export const AccountMenu: React.FC<AccountMenuProps> = ({
  showName = true,
  className,
  triggerClassName,
  menuAlign = 'right',
  roleLabel,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { usuario, tienePermiso, cerrarSesion } = useAuth();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    setError(null);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>(
      'a[href], button:not([disabled])'
    );
    first?.focus();
  }, [open]);

  const onMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') || []
    );
    if (items.length === 0) return;
    event.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLElement);
    let next = 0;
    if (event.key === 'ArrowDown') next = index < 0 ? 0 : (index + 1) % items.length;
    if (event.key === 'ArrowUp') next = index <= 0 ? items.length - 1 : index - 1;
    if (event.key === 'End') next = items.length - 1;
    items[next]?.focus();
  };

  const salir = async () => {
    if (closing) return;
    setError(null);
    setClosing(true);
    const result = await cerrarSesion();
    setClosing(false);
    if (!result.exito) {
      setError(result.mensaje || 'No se pudo cerrar la sesión.');
      return;
    }
    close();
    router.push('/login');
    router.refresh();
  };

  if (!usuario) return null;

  return (
    <div className={`wa-account ${className || ''}`} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`wa-account-trigger${triggerClassName ? ` ${triggerClassName}` : ''}`}
        aria-label={`Cuenta de ${usuario.nombreCompleto || 'usuario'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="wa-account-avatar" aria-hidden="true">
          {initials(usuario.nombreCompleto)}
        </span>
        {showName && (
          <span className="wa-account-copy">
            <strong>{usuario.nombreCompleto}</strong>
            <small>{roleLabel || (usuario.rol === 'STUDENT' ? 'Estudiante' : 'Cuenta Wisdom')}</small>
          </span>
        )}
        <WisdomIcon name="chevron-down" size={14} color="current" />
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Opciones de cuenta"
          className={`wa-account-menu ${menuAlign === 'left' ? 'is-left' : 'is-right'}`}
          onKeyDown={onMenuKeyDown}
        >
          <div className="wa-account-menu-head">
            <span className="wa-account-avatar is-large" aria-hidden="true">
              {initials(usuario.nombreCompleto)}
            </span>
            <div>
              <strong>{usuario.nombreCompleto}</strong>
              <small>{usuario.correo || usuario.usuario || 'Cuenta Wisdom'}</small>
            </div>
          </div>

          <div className="wa-account-menu-links">
            <Link role="menuitem" href="/mi-cuenta" onClick={() => close()}>
              <WisdomIcon name="user" size={16} color="current" />
              Mi cuenta
            </Link>
            <Link role="menuitem" href="/dashboard" onClick={() => close()}>
              <WisdomIcon name="home" size={16} color="current" />
              Mi portal
            </Link>
            <Link role="menuitem" href="/mi-acceso" onClick={() => close()}>
              <WisdomIcon name="shield" size={16} color="current" />
              Mi acceso
            </Link>
            {tienePermiso('admin.access') && (
              <Link role="menuitem" href="/admin" onClick={() => close()}>
                <WisdomIcon name="layout" size={16} color="current" />
                Administración
              </Link>
            )}
            <Link role="menuitem" href="/cambiar-contrasena" onClick={() => close()}>
              <WisdomIcon name="settings" size={16} color="current" />
              Cambiar contraseña
            </Link>
            <Link role="menuitem" href="/canjear" onClick={() => close()}>
              <WisdomIcon name="sparkles" size={16} color="current" />
              Canjear código
            </Link>
          </div>

          {error && (
            <p role="alert" className="wa-account-menu-error">
              {error}
            </p>
          )}

          <button
            type="button"
            role="menuitem"
            className="wa-account-logout"
            onClick={() => void salir()}
            disabled={closing}
          >
            <WisdomIcon name="log-out" size={16} color="current" />
            {closing ? 'Cerrando sesión…' : 'Cerrar sesión'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
