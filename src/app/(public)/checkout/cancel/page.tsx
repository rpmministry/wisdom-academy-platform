'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { apiFetch } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function CheckoutCancelPageInner() {
  const searchParams = useSearchParams();
  const { usuario, sesionLista } = useAuth();
  const [mensaje, setMensaje] = useState('La compra fue cancelada.');
  const ejecutado = useRef(false);

  useEffect(() => {
    if (!sesionLista || !usuario || ejecutado.current) return;
    const orderId = searchParams.get('wa_order');
    if (!orderId) return;
    ejecutado.current = true;
    apiFetch('/api/checkout/cancel', { body: { orderId } })
      .then(() => setMensaje('La compra fue cancelada y la orden quedó cerrada.'))
      .catch(() => setMensaje('La compra no se completó. Puedes intentarlo nuevamente.'));
  }, [sesionLista, usuario, searchParams]);

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '2rem', background: 'var(--bg-canvas)', color: 'var(--text-primary)', fontFamily: 'var(--wa-font-sans)' }}>
      <Card variant="surface" padding="lg" style={{ width: 'min(520px, 100%)' }}>
        <h1 style={{ marginTop: 0, fontSize: '1.25rem' }}>Compra cancelada</h1>
        <p style={{ color: 'var(--text-secondary)' }}>{mensaje}</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/catalogo"><Button variant="primary-gold" size="sm">Volver al catálogo</Button></Link>
          <Link href="/dashboard"><Button variant="secondary" size="sm">Ir a mi portal</Button></Link>
        </div>
      </Card>
    </main>
  );
}


export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>Cargando…</main>}>
      <CheckoutCancelPageInner />
    </Suspense>
  );
}
