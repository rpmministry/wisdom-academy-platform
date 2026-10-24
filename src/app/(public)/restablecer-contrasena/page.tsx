'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Button } from '@/components/ui/Button';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

function ResetInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setError(null);
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setSending(true);
    try {
      await apiFetch('/api/auth/password/reset', {
        body: { token, password, passwordConfirm: confirm },
      });
      setSuccess(true);
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="wa-checkout-page">
      <PublicHeader minimal showLogin={false} />
      <section className="wa-checkout-main">
        <div className="wa-checkout-card wa-checkout-success">
          <div className="wa-checkout-card-head">
            <div>
              <span className="wa-eyebrow">Nueva contraseña</span>
              <h1>{success ? 'Contraseña actualizada' : 'Crea una contraseña nueva'}</h1>
              <p>
                {success
                  ? 'Ya puedes iniciar sesión con tu correo y la contraseña nueva.'
                  : 'El enlace es válido una sola vez y caduca en 60 minutos.'}
              </p>
            </div>
            <WisdomIcon name="shield" size={28} />
          </div>

          {!token ? (
            <div className="wa-checkout-error" role="alert">
              <WisdomIcon name="shield" size={16} />
              <span>El enlace no contiene un token válido.</span>
            </div>
          ) : success ? (
            <Link href="/login">
              <Button variant="primary-gold" size="sm">Iniciar sesión</Button>
            </Link>
          ) : (
            <form onSubmit={submit} className="wa-checkout-auth">
              <div className="wa-checkout-auth-fields">
                <label className="wa-checkout-field">
                  Contraseña nueva
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={200}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                </label>
                <label className="wa-checkout-field">
                  Confirmar contraseña
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={12}
                    maxLength={200}
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    required
                  />
                </label>
              </div>
              {error && (
                <div className="wa-checkout-error" role="alert">
                  <WisdomIcon name="shield" size={16} />
                  <span>{error}</span>
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Button
                  type="submit"
                  variant="primary-gold"
                  size="sm"
                  disabled={sending}
                  cargando={sending}
                >
                  {sending ? 'Guardando…' : 'Guardar contraseña'}
                </Button>
                <Link href="/recuperar-acceso">
                  <Button variant="secondary" size="sm">Solicitar otro enlace</Button>
                </Link>
              </div>
            </form>
          )}
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
            Si el enlace venció, solicita uno nuevo desde{' '}
            <Link href="/recuperar-acceso">recuperar contraseña</Link>.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="wa-checkout-page">
          <section className="wa-checkout-main">
            <p className="wa-checkout-notice">Cargando…</p>
          </section>
        </main>
      }
    >
      <ResetInner />
    </Suspense>
  );
}
