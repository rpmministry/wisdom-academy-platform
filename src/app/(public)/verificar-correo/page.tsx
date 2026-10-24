'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Button } from '@/components/ui/Button';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

function VerifyInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verificando tu correo…');
  const started = useRef(false);

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('El enlace no contiene un token válido.');
      return;
    }
    if (started.current) return;
    started.current = true;
    apiFetch<{ mensaje: string }>('/api/auth/verify-email', { body: { token } })
      .then((response) => {
        setState('success');
        setMessage(response.mensaje);
      })
      .catch((err) => {
        setState('error');
        setMessage(errorMessage(err));
      });
  }, [token]);

  return (
    <main className="wa-checkout-page">
      <PublicHeader minimal showLogin={false} />
      <section className="wa-checkout-main">
        <div className="wa-checkout-card wa-checkout-success">
          <div className="wa-checkout-card-head">
            <div>
              <span className="wa-eyebrow">Seguridad de la cuenta</span>
              <h1>
                {state === 'success'
                  ? 'Correo verificado'
                  : state === 'error'
                    ? 'No se pudo verificar'
                    : 'Verificando correo'}
              </h1>
              <p>{message}</p>
            </div>
            <WisdomIcon name={state === 'success' ? 'award' : 'shield'} size={28} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link href="/login">
              <Button variant="primary-gold" size="sm">Ir a iniciar sesión</Button>
            </Link>
            <Link href="/mi-cuenta">
              <Button variant="secondary" size="sm">Mi cuenta</Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="wa-checkout-page">
          <section className="wa-checkout-main">
            <p className="wa-checkout-notice">Verificando…</p>
          </section>
        </main>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
