'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Button } from '@/components/ui/Button';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export default function RecoverRegistrationPage() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiFetch<{ mensaje: string }>(
        '/api/checkout/registration/recover',
        { body: { email } }
      );
      setMessage(response.mensaje);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="wa-checkout-page">
      <PublicHeader minimal />
      <section className="wa-checkout-main">
        <div className="wa-checkout-card wa-checkout-success">
          <div className="wa-checkout-card-head">
            <div>
              <span className="wa-eyebrow">Compra confirmada sin registro</span>
              <h1>Recupera tu enlace de registro</h1>
              <p>
                Escribe el correo que usaste en la compra. Si existe un pago confirmado pendiente
                de registro, enviaremos un enlace personal para completarlo.
              </p>
            </div>
            <WisdomIcon name="mail" size={28} />
          </div>

          <form onSubmit={submit} className="wa-checkout-auth">
            <label className="wa-checkout-field" htmlFor="recover-email">
              Correo de la compra
              <input
                id="recover-email"
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
                <Button variant="secondary" size="sm">Iniciar sesión</Button>
              </Link>
            </div>
          </form>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', lineHeight: 1.5 }}>
            Por seguridad, la respuesta es la misma exista o no una compra. Si no llega el
            mensaje, revisa spam o contacta a administración con la referencia de tu orden.
          </p>
        </div>
      </section>
    </main>
  );
}
