'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { useCart } from '@/lib/cart/cartContext';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

interface OrderReceipt {
  id: string;
  status: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  paidAt: string | null;
  reference: string;
  items: Array<{ title: string; priceCents: number }>;
}

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(cents / 100);
}

function CheckoutReturnPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { usuario, sesionLista, refrescarSesion } = useAuth();
  const { clearCart } = useCart();
  const [estado, setEstado] = useState<'verificando' | 'exito' | 'error'>('verificando');
  const [mensaje, setMensaje] = useState('Verificando el pago con el servidor…');
  const [recibo, setRecibo] = useState<OrderReceipt | null>(null);
  const ejecutado = useRef(false);

  useEffect(() => {
    if (!sesionLista || ejecutado.current) return;
    const token = searchParams.get('token');
    const orderId = searchParams.get('wa_order');

    if (!usuario) {
      const requested = `/checkout/return?${searchParams.toString()}`;
      router.replace(`/login?next=${encodeURIComponent(requested)}`);
      return;
    }

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
      .then(async (response) => {
        await refrescarSesion();
        try {
          const detalle = await apiFetch<{ orden: OrderReceipt }>(
            `/api/me/orders/${encodeURIComponent(response.orden.orderId)}`
          );
          setRecibo(detalle.orden);
        } catch {
          setRecibo(null);
        }
        clearCart();
        setEstado('exito');
        setMensaje('Pago verificado. El acceso a tus productos quedó habilitado.');
      })
      .catch((error) => {
        setEstado('error');
        setMensaje(errorMessage(error));
      });
  }, [clearCart, router, searchParams, sesionLista, usuario, refrescarSesion]);

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
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{mensaje}</p>

        {estado === 'exito' && recibo && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                flexWrap: 'wrap',
                padding: '0.7rem',
                borderRadius: 'var(--wa-radius-md)',
                background: 'var(--bg-subtle)',
                margin: '0.5rem 0 0.8rem',
              }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.66rem', color: 'var(--text-muted)' }}>
                  Referencia
                </span>
                <strong style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.75rem' }}>
                  {recibo.reference}
                </strong>
              </div>
              <Badge variant={recibo.status === 'paid' ? 'emerald' : 'gold'} size="sm">
                {recibo.status === 'paid' ? 'Pagada' : recibo.status === 'free' ? 'Gratuita' : recibo.status}
              </Badge>
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.35rem' }}>
              {recibo.items.map((item, index) => (
                <li
                  key={`${item.title}-${index}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>{item.title}</span>
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--wa-font-mono)' }}>
                    {money(item.priceCents, recibo.currency)}
                  </strong>
                </li>
              ))}
              {recibo.discountCents > 0 && (
                <li
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    fontSize: '0.78rem',
                    color: 'var(--accent-study)',
                  }}
                >
                  <span>Descuento</span>
                  <strong>- {money(recibo.discountCents, recibo.currency)}</strong>
                </li>
              )}
              <li
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  paddingTop: '0.4rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontWeight: 700,
                }}
              >
                <span>Total</span>
                <strong style={{ fontFamily: 'var(--wa-font-mono)' }}>
                  {money(recibo.totalCents, recibo.currency)}
                </strong>
              </li>
            </ul>
          </>
        )}

        {estado !== 'verificando' && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link href="/mi-acceso">
              <Button variant="primary-gold" size="sm">
                Ver mis accesos
              </Button>
            </Link>
            <Link href="/cursos">
              <Button variant="secondary" size="sm">
                Ir a mis cursos
              </Button>
            </Link>
            <Link href="/catalogo">
              <Button variant="secondary" size="sm">
                Volver al catálogo
              </Button>
            </Link>
          </div>
        )}
        {estado === 'error' && (
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
            Si PayPal ya cobró la operación, el webhook verificado puede completar el acceso
            aunque esta confirmación falle. Revisa «Mis accesos» o contacta a administración con
            tu orden. El carrito se conserva para reintentar sin crear cargos duplicados.
          </p>
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
