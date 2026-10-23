'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/authContext';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';

interface Entitlement {
  id: string;
  resourceSlug: string;
  resourceTitle: string;
  resourceType: string;
  origin: string;
  effectiveStatus: string;
  startsAt: string;
  endsAt: string | null;
}

interface GlobalGrant {
  id: string;
  kind: string;
  effectiveStatus: string;
  startsAt: string;
  endsAt: string | null;
  origin: string;
}

interface AccessResponse {
  accesoContenidoGlobal: boolean;
  derechos: Entitlement[];
  accesosGlobales: GlobalGrant[];
  recursos: Array<{ id: string; slug: string; type: string; title: string; description: string | null }>;
}

interface Order {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
  createdAt: string;
  paidAt: string | null;
  reference: string;
  items: Array<{ title: string; priceCents: number }>;
}

const ESTADO_LABEL: Record<string, string> = {
  active: 'Activo',
  pending: 'Pendiente',
  paused: 'Pausado',
  expired: 'Expirado',
  revoked: 'Revocado',
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente de pago',
  paid: 'Pagada',
  failed: 'Fallida',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
  reversed: 'Revertida',
  free: 'Acceso gratuito',
};

const ORIGEN_LABEL: Record<string, string> = {
  purchase: 'Compra',
  gift: 'Regalo',
  promo_full: 'Promoción 100%',
  scholarship: 'Beca',
  founder_invitation: 'Invitación de fundador',
  investor_invitation: 'Invitación de inversor',
  manual_owner: 'Concesión del creador',
  enrollment: 'Matrícula',
  bundle: 'Paquete',
  migration: 'Migración',
};

function fecha(iso: string | null): string {
  if (!iso) return 'Sin vencimiento';
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso)
  );
}

function dinero(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(cents / 100);
}

export default function MyAccessPage() {
  const router = useRouter();
  const { usuario, sesionLista, tienePermiso, accesoContenidoGlobal } = useAuth();
  const [data, setData] = useState<AccessResponse | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const esAdmin = usuario?.rol === 'ADMIN' || tienePermiso('admin.access');

  useEffect(() => {
    if (sesionLista && esAdmin) {
      router.replace('/admin?tab=crm&crm=usuarios');
    }
  }, [sesionLista, esAdmin, router]);

  const cargar = useCallback(async () => {
    if (!usuario) return;
    setCargando(true);
    setError(null);
    try {
      const [access, ordersResponse] = await Promise.all([
        apiFetch<AccessResponse>('/api/me/access'),
        apiFetch<{ ordenes: Order[] }>('/api/me/orders'),
      ]);
      setData(access);
      setOrders(ordersResponse.ordenes);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setCargando(false);
    }
  }, [usuario]);

  useEffect(() => {
    if (sesionLista && !esAdmin) void cargar();
  }, [sesionLista, esAdmin, cargar]);

  if (esAdmin) {
    return (
      <main className="wa-portal-page">
        <p role="status">Redirigiendo al CRM…</p>
      </main>
    );
  }

  return (
    <main className="wa-portal-page">
      <PageHeader
        breadcrumbs={[
          { label: 'Mi portal', href: '/dashboard' },
          { label: 'Mi acceso' },
        ]}
        eyebrow="Derechos vigentes"
        title="Mi acceso"
        description="Cada derecho conserva su origen y su propio ciclo de vida. Revocar un regalo no retira una compra independiente. El servidor comprueba estas fechas en cada petición."
        actions={
          <>
            <Link href="/catalogo#programas">
              <Button variant="secondary" size="sm">Catálogo</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Mi portal</Button>
            </Link>
          </>
        }
      />

        {!sesionLista || cargando ? (
          <p role="status">Cargando tus accesos…</p>
        ) : !usuario ? (
          <Card variant="surface" padding="lg">
            <p>Inicia sesión para consultar tus derechos de acceso.</p>
            <Link href="/login"><Button variant="primary-gold" size="sm">Iniciar sesión</Button></Link>
          </Card>
        ) : error ? (
          <div role="alert" style={{ margin: '1rem 0', padding: '0.75rem 1rem', borderRadius: 'var(--wa-radius-md)', border: '1px solid var(--status-danger)', color: 'var(--status-danger)' }}>
            {error}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
            <Card variant={accesoContenidoGlobal ? 'gold-border' : 'surface'} padding="md">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.0625rem' }}>Acceso global a contenidos</h2>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {accesoContenidoGlobal
                      ? 'Habilitado para todos los espacios formativos publicados. No concede acceso administrativo.'
                      : 'No habilitado. Solo verás los recursos con derechos individuales.'}
                  </p>
                </div>
                <Badge variant={accesoContenidoGlobal ? 'emerald' : 'navy'}>
                  {accesoContenidoGlobal ? 'Global activo' : 'Acceso individual'}
                </Badge>
              </div>
              {data?.accesosGlobales?.length ? (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.75rem' }}>
                  {data.accesosGlobales.map((grant) => (
                    <span key={grant.id}>
                      {grant.kind === 'founder' ? 'Fundador' : grant.kind === 'investor' ? 'Inversor' : 'Manual'} · {ESTADO_LABEL[grant.effectiveStatus] || grant.effectiveStatus} · {fecha(grant.endsAt)}
                    </span>
                  ))}
                </div>
              ) : null}
              {accesoContenidoGlobal && (
                <div style={{ marginTop: '0.75rem' }}>
                  <Link href="/contenidos"><Button variant="primary-gold" size="sm">Explorar contenidos habilitados</Button></Link>
                </div>
              )}
            </Card>

            <Card variant="surface" padding="md">
              <h2 style={{ marginTop: 0, fontSize: '1.0625rem' }}>Derechos por recurso</h2>
              {data?.derechos?.length ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '0.5rem' }}>Recurso</th>
                        <th style={{ padding: '0.5rem' }}>Origen</th>
                        <th style={{ padding: '0.5rem' }}>Estado</th>
                        <th style={{ padding: '0.5rem' }}>Inicio</th>
                        <th style={{ padding: '0.5rem' }}>Fin</th>
                        <th style={{ padding: '0.5rem' }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.derechos.map((right) => (
                        <tr key={right.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.5rem' }}><strong>{right.resourceTitle}</strong></td>
                          <td style={{ padding: '0.5rem' }}>{ORIGEN_LABEL[right.origin] || right.origin}</td>
                          <td style={{ padding: '0.5rem' }}>
                            <Badge variant={right.effectiveStatus === 'active' ? 'emerald' : right.effectiveStatus === 'paused' ? 'gold' : 'navy'} size="sm">
                              {ESTADO_LABEL[right.effectiveStatus] || right.effectiveStatus}
                            </Badge>
                          </td>
                          <td style={{ padding: '0.5rem' }}>{fecha(right.startsAt)}</td>
                          <td style={{ padding: '0.5rem' }}>{fecha(right.endsAt)}</td>
                          <td style={{ padding: '0.5rem' }}>
                            {right.effectiveStatus === 'active' && (
                              <Link href={`/recurso/${right.resourceSlug}`}>Abrir</Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Todavía no tienes derechos individuales. Explora el catálogo o canjea un código.
                </p>
              )}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                <Link href="/catalogo#programas"><Button variant="secondary" size="sm">Explorar catálogo</Button></Link>
                <Link href="/canjear"><Button variant="secondary" size="sm">Canjear código</Button></Link>
                {tienePermiso('admin.access') && (
                  <Link href="/admin"><Button variant="primary-navy" size="sm">Panel administrativo</Button></Link>
                )}
              </div>
            </Card>

            <Card variant="surface" padding="md">
              <h2 style={{ marginTop: 0, fontSize: '1.0625rem' }}>Mis órdenes</h2>
              {orders.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {orders.map((order) => (
                    <div key={order.id} style={{ padding: '0.75rem', borderRadius: 'var(--wa-radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <strong>{order.items.map((item) => item.title).join(' · ')}</strong>
                        <span>{dinero(order.totalCents, order.currency)}</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        {ORDER_STATUS_LABEL[order.status] || order.status} · {fecha(order.paidAt || order.createdAt)}
                      </div>
                      <div style={{ color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Referencia: <code>{order.reference}</code>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>No hay órdenes registradas en tu cuenta.</p>
              )}
            </Card>
          </div>
        )}
    </main>
  );
}

