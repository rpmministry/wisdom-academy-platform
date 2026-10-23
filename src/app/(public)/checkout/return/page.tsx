'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

function CheckoutReturnPageInner() {
  const searchParams = useSearchParams();
  const { usuario, sesionLista, refrescarSesion } = useAuth();
  const [estado, setEstado] = useState<'verificando' | 'exito' | 'error'>('verificando');
  const [mensaje, setMensaje] = useState('Verificando el pago con el servidor…');
  const ejecutado = useRef(false);

  useEffect(() => {
    if (!sesionLista || ejecutado.current) return;
    if (!usuario) {
      setEstado('error');
      setMensaje('Inicia sesión para confirmar el pago de tu orden.');
      return;
    }
    const token = searchParams.get('token');
    const orderId = searchParams.get('wa_order');
    if (!token && !orderId) {
      setEstado('error');
      setMensaje('No se recibió una referencia de pago válida.');
      return;
    }
    ejecutado.current = true;

    apiFetch<{ orden: { orderId: string; status: string; alreadyPaid: boolean } }>(
      '/api/checkout/capture',
      { body: { orderId, paypalOrderId: token } }
    )
      .then(async () => {
        await refrescarSesion();
        setEstado('exito');
        setMensaje('Pago verificado. El acceso a tus productos quedó habilitado.');
      })
      .catch((error) => {
        setEstado('error');
        setMensaje(errorMessage(error));
      });
  }, [sesionLista, usuario, searchParams, refrescarSesion]);

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
      <Card variant={estado === 'exito' ? 'gold-border' : 'surface'} padding="lg" style={{ width: 'min(560px, 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <WisdomIcon name={estado === 'exito' ? 'award' : estado === 'error' ? 'shield' : 'sparkles'} size={24} />
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>
            {estado === 'verificando' ? 'Confirmando pago' : estado === 'exito' ? 'Pago confirmado' : 'No se pudo confirmar'}
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{mensaje}</p>
        {estado !== 'verificando' && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link href="/mi-acceso"><Button variant="primary-gold" size="sm">Ver mis accesos</Button></Link>
            <Link href="/catalogo"><Button variant="secondary" size="sm">Volver al catálogo</Button></Link>
            <Link href="/dashboard"><Button variant="secondary" size="sm">Ir a mi portal</Button></Link>
          </div>
        )}
        {estado === 'error' && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
            Si PayPal ya cobró la operación, el webhook verificado puede completar el acceso aunque
            esta confirmación falle. Revisa «Mis accesos» o contacta a administración con tu orden.
          </p>
        )}
      </Card>
    </main>
  );
}


export default function CheckoutReturnPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>Verificando pago…</main>}>
      <CheckoutReturnPageInner />
    </Suspense>
  );
}
