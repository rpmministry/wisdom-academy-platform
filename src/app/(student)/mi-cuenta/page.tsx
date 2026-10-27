'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/authContext';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

interface UserOrder {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  reference: string;
  items: Array<{ title: string; priceCents: number }>;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  failed: 'Fallida',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
  reversed: 'Revertida',
  free: 'Gratuita',
};

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(cents / 100);
}

function fecha(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium' }).format(date);
}

export default function MiCuentaPage() {
  const { usuario, refrescarSesion } = useAuth();
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch<{ ordenes: UserOrder[] }>('/api/me/orders')
      .then((response) => {
        if (!cancelled) setOrders(response.ordenes);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const resendVerification = async () => {
    if (verifyBusy) return;
    setVerifyBusy(true);
    setVerifyMessage(null);
    try {
      const response = await apiFetch<{ mensaje: string }>(
        '/api/auth/verify-email/resend',
        { method: 'POST' }
      );
      setVerifyMessage(response.mensaje);
      await refrescarSesion();
    } catch (err) {
      setVerifyMessage(errorMessage(err));
    } finally {
      setVerifyBusy(false);
    }
  };

  if (!usuario) return null;

  const rol =
    usuario.roles?.includes('platform_owner')
      ? 'Creador de Wisdom School'
      : usuario.rol === 'STUDENT'
      ? 'Estudiante'
      : usuario.rol === 'ADMIN'
        ? 'Administración'
        : usuario.rol === 'TEACHER'
          ? 'Docencia'
          : 'Cuenta Wisdom';

  return (
    <main className="wa-account-page">
      <header className="wa-account-page-head">
        <span className="wa-eyebrow">Cuenta institucional</span>
        <h1>Mi cuenta</h1>
        <p>
          Consulta tu identidad, tus accesos y las compras registradas. La información
          académica se administra desde el CRM institucional.
        </p>
      </header>

      <div className="wa-account-page-grid">
        <section className="wa-checkout-card" aria-labelledby="account-data-heading">
          <div className="wa-checkout-card-head">
            <div>
              <h2 id="account-data-heading">Datos de la cuenta</h2>
              <p>Identidad usada para accesos y compras.</p>
            </div>
            <WisdomIcon name="user" size={22} />
          </div>
          <ul className="wa-fin-detail-list">
            <li><span>Nombre</span><strong>{usuario.nombreCompleto}</strong></li>
            <li><span>Usuario</span><strong>{usuario.usuario}</strong></li>
            <li><span>Correo</span><strong>{usuario.correo}</strong></li>
            <li><span>Rol</span><strong>{rol}</strong></li>
            <li><span>Estado</span><strong>{usuario.activo ? 'Activo' : 'Inactivo'}</strong></li>
            <li>
              <span>Correo</span>
              <strong>{usuario.correoVerificado ? 'Verificado' : 'Pendiente de verificación'}</strong>
            </li>
          </ul>
          {!usuario.correoVerificado && (
            <div style={{ marginTop: '0.6rem' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void resendVerification()}
                disabled={verifyBusy}
              >
                {verifyBusy ? 'Enviando…' : 'Reenviar verificación'}
              </Button>
              {verifyMessage && (
                <p className="wa-checkout-notice" role="status" style={{ fontSize: '0.7rem' }}>
                  {verifyMessage}
                </p>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.85rem' }}>
            <Link href="/cambiar-contrasena?next=%2Fmi-cuenta">
              <Button variant="secondary" size="sm">Cambiar contraseña</Button>
            </Link>
            <Link href="/mi-acceso">
              <Button variant="secondary" size="sm">Ver mis accesos</Button>
            </Link>
            <Link href="/catalogo#programas">
              <Button variant="primary-gold" size="sm">Explorar catálogo</Button>
            </Link>
          </div>
          <p style={{ margin: '0.7rem 0 0', color: 'var(--text-muted)', fontSize: '0.68rem', lineHeight: 1.5 }}>
            Si necesitas corregir tu nombre, correo o datos académicos, solicita el cambio a
            administración. La plataforma no modifica esos datos desde esta vista.
          </p>
        </section>

        <section className="wa-checkout-card" aria-labelledby="account-orders-heading">
          <div className="wa-checkout-card-head">
            <div>
              <h2 id="account-orders-heading">Mis compras</h2>
              <p>Órdenes vinculadas a tu cuenta; las pendientes no conceden acceso.</p>
            </div>
            <WisdomIcon name="receipt" size={22} />
          </div>
          {loading ? (
            <p role="status" className="wa-fin-empty">Cargando compras…</p>
          ) : error ? (
            <div className="wa-checkout-error" role="alert">
              <WisdomIcon name="shield" size={16} />
              <span>{error}</span>
            </div>
          ) : orders.length === 0 ? (
            <p className="wa-fin-empty">Todavía no tienes compras registradas.</p>
          ) : (
            <ul className="wa-account-order-list">
              {orders.map((order) => (
                <li key={order.id} className="wa-account-order">
                  <div>
                    <strong>{order.items.map((item) => item.title).join(' · ')}</strong>
                    <small>
                      {fecha(order.paidAt || order.createdAt)} · ref. {order.reference}
                    </small>
                  </div>
                  <div className="wa-account-order-side">
                    <strong>{money(order.totalCents, order.currency)}</strong>
                    <Badge
                      variant={
                        order.status === 'paid'
                          ? 'emerald'
                          : order.status === 'pending'
                            ? 'gold'
                            : 'navy'
                      }
                      size="sm"
                    >
                      {STATUS_LABEL[order.status] || order.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
