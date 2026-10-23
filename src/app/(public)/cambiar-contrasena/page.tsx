'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { usuario, sesionLista, refrescarSesion, tienePermiso } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (sesionLista && !usuario) router.replace('/login');
  }, [sesionLista, usuario, router]);

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (enviando) return;
    setMensaje(null);
    if (nueva !== confirmacion) {
      setMensaje({ tipo: 'error', texto: 'La nueva contraseña y su confirmación no coinciden.' });
      return;
    }
    setEnviando(true);
    try {
      await apiFetch('/api/auth/password', {
        body: { contraseniaActual: actual, contraseniaNueva: nueva },
      });
      const usuarioActualizado = await refrescarSesion();
      const esAdmin =
        usuarioActualizado?.rol === 'ADMIN' ||
        usuarioActualizado?.permisos?.includes('admin.access') ||
        tienePermiso('admin.access');
      setMensaje({ tipo: 'exito', texto: 'Contraseña actualizada. Redirigiendo…' });
      setTimeout(() => {
        router.push(esAdmin ? '/admin?tab=crm' : '/dashboard');
      }, 800);
    } catch (error) {
      setMensaje({ tipo: 'error', texto: errorMessage(error) });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: '2rem',
        background: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--wa-font-sans)',
      }}
    >
      <Card variant="gold-border" padding="lg" className="wa-auth-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <WisdomIcon name="shield" size={24} />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem' }}>Cambio de contraseña</h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Tu cuenta requiere una contraseña personal antes de continuar.
            </p>
          </div>
        </div>

        {mensaje && (
          <div
            role="alert"
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              borderRadius: 'var(--wa-radius-md)',
              border: `1px solid ${mensaje.tipo === 'exito' ? 'var(--accent-study)' : 'var(--status-danger)'}`,
              color: mensaje.tipo === 'exito' ? 'var(--accent-study)' : 'var(--status-danger)',
              fontSize: '0.8125rem',
            }}
          >
            {mensaje.texto}
          </div>
        )}

        <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600 }}>
            Contraseña actual
            <input
              type="password"
              value={actual}
              onChange={(event) => setActual(event.target.value)}
              autoComplete="current-password"
              required
              style={{ minHeight: 44, padding: '0.625rem 0.75rem', borderRadius: 'var(--wa-radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600 }}>
            Nueva contraseña
            <input
              type="password"
              value={nueva}
              onChange={(event) => setNueva(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
              style={{ minHeight: 44, padding: '0.625rem 0.75rem', borderRadius: 'var(--wa-radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            />
            <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
              Al menos 12 caracteres, con mayúsculas, minúsculas y números.
            </span>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600 }}>
            Confirmar nueva contraseña
            <input
              type="password"
              value={confirmacion}
              onChange={(event) => setConfirmacion(event.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
              style={{ minHeight: 44, padding: '0.625rem 0.75rem', borderRadius: 'var(--wa-radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            />
          </label>
          <Button type="submit" variant="primary-gold" size="lg" disabled={enviando} cargando={enviando}>
            {enviando ? 'Actualizando…' : 'Guardar contraseña'}
          </Button>
        </form>
        <Link href="/dashboard" style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.8125rem' }}>
          Volver al portal
        </Link>
      </Card>
    </main>
  );
}

