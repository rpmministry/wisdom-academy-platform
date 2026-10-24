'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';

interface AuthGuardProps {
  children: React.ReactNode;
  /** Exige el permiso administrativo verificado por el servidor. */
  requireAdmin?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireAdmin = false }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { usuario, sesionLista, tienePermiso } = useAuth();
  const autorizado = Boolean(usuario) && (!requireAdmin || tienePermiso('admin.access'));

  useEffect(() => {
    if (!sesionLista) return;
    if (!usuario) {
      const requested = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(requested)}`);
      return;
    }
    if (requireAdmin && !tienePermiso('admin.access')) {
      router.replace('/dashboard');
    }
  }, [pathname, requireAdmin, router, sesionLista, usuario, tienePermiso]);

  if (!sesionLista || !autorizado) {
    return (
      <div className="wa-auth-loading" role="status" aria-live="polite">
        <div className="wa-auth-loading-spinner" aria-hidden="true" />
        <span>Verificando credenciales…</span>
      </div>
    );
  }

  return <>{children}</>;
};
