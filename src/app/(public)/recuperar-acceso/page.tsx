'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Button } from '@/components/ui/Button';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

function ForgotInner() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initial = searchParams.get('email');
    if (initial) setEmail(initial.slice(0, 254));
  }, [searchParams]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiFetch<{ mensaje: string }>('/api/auth/password/forgot', {
        body: { email },
      });
      setMessage(response.mensaje);
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
              <span className="wa-eyebrow">Acceso seguro</span>
              <h1>Recupera tu contraseña</h1>
              <p>
                Escribe el correo de tu cuenta. Si está activo, recibirás un enlace de un solo
                uso válido durante 60 minutos.
              </p>
            </div>
            <WisdomIcon name="shield" size={28} />
          </div>
          <form onSubmit={submit} className="wa-checkout-auth">
            <label className="wa-checkout-field" htmlFor="forgot-email">
              Correo de la cuenta
              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            {message && (
              <p className="wa-checkout-notice" role="status">
                {message}
              </p>
            )}
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
                {sending ? 'Enviando…' : 'Enviar enlace'}
              </Button>
              <Link href="/login">
                <Button variant="secondary" size="sm">Volver al acceso</Button>
              </Link>
            </div>
          </form>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', lineHeight: 1.5 }}>
            Por seguridad no confirmamos si un correo existe. Si no llega el mensaje, revisa la
            carpeta de spam o contacta a administración.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function ForgotPasswordPage() {
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
      <ForgotInner />
    </Suspense>
  );
}
