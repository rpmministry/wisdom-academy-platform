'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { useCart } from '@/lib/cart/cartContext';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

interface CaptureResult {
  orderId: string;
  status: string;
  alreadyPaid: boolean;
  registrationUrl?: string | null;
}

function CheckoutReturnPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { sesionLista, refrescarSesion } = useAuth();
  const { clearCart } = useCart();
  const [estado, setEstado] = useState<'verificando' | 'exito' | 'error'>('verificando');
  const [mensaje, setMensaje] = useState('Verificando el pago con el servidor…');
  const [registroUrl, setRegistroUrl] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const ejecutado = useRef(false);

  useEffect(() => {
    if (!sesionLista || ejecutado.current) return;
    const token = searchParams.get('token');
    const internalOrderId = searchParams.get('wa_order');
    setOrderId(internalOrderId);

    if (!token && !internalOrderId) {
      setEstado('error');
      setMensaje('No se recibió una referencia de pago válida.');
      return;
    }
    ejecutado.current = true;

    apiFetch<{ orden: CaptureResult }>('/api/checkout/capture', {
      body: { orderId: internalOrderId, paypalOrderId: token },
    })
      .then(async (response) => {
        clearCart();
        await refrescarSesion();
        setOrderId(response.orden.orderId);
        if (response.orden.registrationUrl) {
          setRegistroUrl(response.orden.registrationUrl);
          setMensaje('Pago confirmado. Te llevamos a completar tu registro…');
          router.replace(response.orden.registrationUrl);
          return;
        }
        setEstado('exito');
        setMensaje('Pago verificado. Tu compra quedó registrada en la cuenta.');
      })
      .catch((error) => {
        setEstado('error');
        setMensaje(errorMessage(error));
      });
  }, [clearCart, refrescarSesion, router, searchParams, sesionLista]);

  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        padding: 'clamp(1rem, 4vw, 2rem)',
        background: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--wa-font-sans)',
      }}
    >
      <Card
        variant={estado === 'exito' ? 'gold-border' : 'surface'}
        padding="lg"
        style={{ width: 'min(620px, 100%)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <WisdomIcon
            name={estado === 'exito' ? 'award' : estado === 'error' ? 'shield' : 'sparkles'}
            size={24}
          />
          <h1 style={{ margin: 0, fontSize: '1.25rem' }}>
            {estado === 'verificando'
              ? 'Confirmando pago'
              : estado === 'exito'
                ? 'Pago confirmado'
                : 'No se pudo confirmar'}
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }} role="status">
          {mensaje}
        </p>

        {registroUrl && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Si la redirección no ocurre,{' '}
            <a href={registroUrl} style={{ color: 'var(--brand-gold-dark)' }}>
              continúa al registro
            </a>
            .
          </p>
        )}

        {orderId && (
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}>
            Referencia de la orden: <strong>{orderId}</strong>
          </p>
        )}

        {estado === 'exito' && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link href="/mi-acceso">
              <Button variant="primary-gold" size="sm">Ver mis accesos</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" size="sm">Ir a mi portal</Button>
            </Link>
            <Link href="/catalogo">
              <Button variant="secondary" size="sm">Volver al catálogo</Button>
            </Link>
          </div>
        )}

        {estado === 'error' && (
          <>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
              Si PayPal ya cobró la operación, el webhook verificado puede completar el acceso.
              También puedes recuperar el enlace de registro con el correo de la compra. El
              carrito se conserva para reintentar sin crear cargos duplicados.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              <Link href="/bienvenida/recuperar">
                <Button variant="primary-gold" size="sm">Recuperar mi registro</Button>
              </Link>
              <Link href="/checkout">
                <Button variant="secondary" size="sm">Volver al checkout</Button>
              </Link>
              <Link href="/mi-acceso">
                <Button variant="secondary" size="sm">Revisar mis accesos</Button>
              </Link>
            </div>
          </>
        )}
      </Card>
    </main>
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
          Verificando pago…
        </main>
      }
    >
      <CheckoutReturnPageInner />
    </Suspense>
  );
}
