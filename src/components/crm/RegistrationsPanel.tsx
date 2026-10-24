'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, ApiClientError, errorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

interface RegistrationItem {
  registrationId: string;
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  buyerType: string;
  buyerCountry: string | null;
  documentType: string | null;
  documentNumberMasked: string | null;
  products: string[];
  productKind: string;
  requiresGuardian: boolean;
  amountCents: number;
  currency: string;
  paymentStatus: string;
  registrationStatus: string;
  registeredAt: string | null;
  createdAt: string;
  accountEmail: string | null;
  emailVerified: boolean | null;
  studentName: string | null;
  studentBirthDate: string | null;
  studentGrade: string | null;
  guardianName: string | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  guardianRelationship: string | null;
  activeAccess: boolean;
}

const PAYMENT_LABEL: Record<string, string> = {
  paid: 'Pagada',
  free: 'Gratuita',
  pending: 'Pago pendiente',
  failed: 'Pago fallido',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
  reversed: 'Revertida',
};

const REGISTRATION_LABEL: Record<string, string> = {
  pending: 'Registro pendiente',
  completed: 'Registro completado',
  expired: 'Enlace vencido',
  revoked: 'Registro revocado',
};

const KIND_LABEL: Record<string, string> = {
  course: 'Curso',
  workshop: 'Taller',
  program: 'Programa académico',
  mixed: 'Varios productos',
  other: 'Otro',
};

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(cents / 100);
}

function fecha(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function statusClass(status: string): string {
  if (status === 'paid' || status === 'free' || status === 'completed') return 'is-paid';
  if (status === 'pending') return 'is-pending';
  return 'is-failed';
}

export const RegistrationsPanel: React.FC = () => {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<RegistrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RegistrationItem | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (status) params.set('status', status);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('limit', '200');
      const response = await apiFetch<{ registros: RegistrationItem[] }>(
        `/api/admin/registrations?${params.toString()}`,
        { signal: controller.signal, timeoutMs: 45_000 }
      );
      setRows(response.registros);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'ABORTED') return;
      setError(errorMessage(err));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [from, q, status, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const counters = useMemo(
    () => ({
      pending: rows.filter((row) => row.registrationStatus === 'pending').length,
      completed: rows.filter((row) => row.registrationStatus === 'completed').length,
      emailPending: rows.filter(
        (row) => row.registrationStatus === 'completed' && row.emailVerified === false
      ).length,
      active: rows.filter((row) => row.activeAccess).length,
    }),
    [rows]
  );

  const clear = () => {
    setQ('');
    setStatus('');
    setFrom('');
    setTo('');
  };

  return (
    <div className="wa-fin">
      <div className="wa-fin-kpis">
        <div className="wa-fin-kpi is-success">
          <span>Matrículas activas</span>
          <strong>{counters.active}</strong>
          <small>Con derechos vigentes para su compra</small>
        </div>
        <div className="wa-fin-kpi">
          <span>Registros completados</span>
          <strong>{counters.completed}</strong>
          <small>{counters.emailPending} con correo pendiente de verificación</small>
        </div>
        <div className="wa-fin-kpi">
          <span>Registros pendientes</span>
          <strong>{counters.pending}</strong>
          <small>Pago confirmado, acceso aún no activado</small>
        </div>
      </div>

      <div className="wa-fin-filters">
        <label className="wa-checkout-field">
          Buscar
          <input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Comprador, correo, estudiante u orden"
          />
        </label>
        <label className="wa-checkout-field">
          Estado del registro
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="completed">Completado</option>
            <option value="expired">Vencido</option>
            <option value="revoked">Revocado</option>
          </select>
        </label>
        <label className="wa-checkout-field">
          Desde
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="wa-checkout-field">
          Hasta
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <div className="wa-fin-filter-actions">
          <Button variant="secondary" size="sm" onClick={clear}>Limpiar</Button>
          <Button variant="secondary" size="sm" onClick={() => void load()}>Actualizar</Button>
        </div>
      </div>

      {error && (
        <div className="wa-checkout-error" role="alert">
          <WisdomIcon name="shield" size={16} />
          <span>{error}</span>
        </div>
      )}

      <section className="wa-fin-card" aria-labelledby="registrations-heading">
        <div className="wa-fin-card-head">
          <div>
            <h3 id="registrations-heading">Registros posteriores al pago ({rows.length})</h3>
            <span>
              Separa pago confirmado, registro completado, correo verificado y matrícula activa.
            </span>
          </div>
          <Badge variant="navy" size="sm">{loading ? 'Actualizando…' : 'CRM'}</Badge>
        </div>

        {rows.length > 0 ? (
          <>
            <div className="wa-fin-table-wrap">
              <table className="wa-fin-table">
                <thead>
                  <tr>
                    <th>Comprador</th>
                    <th>Producto</th>
                    <th>Pago</th>
                    <th>Registro</th>
                    <th>Cuenta</th>
                    <th>Acceso</th>
                    <th>Fecha</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.registrationId}>
                      <td>
                        <strong>{row.buyerName}</strong>
                        <small>{row.buyerEmail}</small>
                        <small>{row.buyerType === 'guardian' ? 'Representante' : 'Estudiante'}</small>
                      </td>
                      <td>
                        {row.products.join(' · ')}
                        <small>{KIND_LABEL[row.productKind] || row.productKind}</small>
                      </td>
                      <td>
                        <span className={`wa-fin-status ${statusClass(row.paymentStatus)}`}>
                          {PAYMENT_LABEL[row.paymentStatus] || row.paymentStatus}
                        </span>
                        <small>{money(row.amountCents, row.currency)}</small>
                      </td>
                      <td>
                        <span className={`wa-fin-status ${statusClass(row.registrationStatus)}`}>
                          {REGISTRATION_LABEL[row.registrationStatus] || row.registrationStatus}
                        </span>
                      </td>
                      <td>
                        <strong>{row.accountEmail || 'Sin cuenta'}</strong>
                        <small>
                          {row.emailVerified === null
                            ? '—'
                            : row.emailVerified
                              ? 'Correo verificado'
                              : 'Correo pendiente'}
                        </small>
                      </td>
                      <td>
                        <Badge variant={row.activeAccess ? 'emerald' : 'navy'} size="sm">
                          {row.activeAccess ? 'Activa' : 'Sin acceso'}
                        </Badge>
                      </td>
                      <td>
                        <strong>{fecha(row.registeredAt || row.createdAt)}</strong>
                        <small>{row.orderId.slice(0, 16)}…</small>
                      </td>
                      <td>
                        <button type="button" onClick={() => setSelected(row)}>Ver ficha</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="wa-fin-cards">
              {rows.map((row) => (
                <article key={row.registrationId} className="wa-fin-order-card">
                  <div>
                    <strong>{row.buyerName}</strong>
                    <span className={`wa-fin-status ${statusClass(row.registrationStatus)}`}>
                      {REGISTRATION_LABEL[row.registrationStatus] || row.registrationStatus}
                    </span>
                  </div>
                  <small>{row.buyerEmail}</small>
                  <small>{row.products.join(' · ')}</small>
                  <div>
                    <small>{money(row.amountCents, row.currency)} · {PAYMENT_LABEL[row.paymentStatus]}</small>
                    <Badge variant={row.activeAccess ? 'emerald' : 'navy'} size="sm">
                      {row.activeAccess ? 'Acceso activo' : 'Sin acceso'}
                    </Badge>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => setSelected(row)}>
                    Ver ficha
                  </Button>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="wa-fin-empty" role={loading ? 'status' : undefined}>
            {loading ? 'Cargando registros…' : 'No hay registros con esos filtros.'}
          </p>
        )}

        {selected && (
          <div className="wa-fin-detail" style={{ marginTop: '0.85rem' }}>
            <div className="wa-fin-detail-head">
              <div>
                <h3>Ficha de registro</h3>
                <p>{selected.orderId}</p>
              </div>
              <button
                type="button"
                className="wa-portal-icon-button"
                onClick={() => setSelected(null)}
                aria-label="Cerrar ficha"
              >
                <WisdomIcon name="close" size={16} />
              </button>
            </div>
            <div className="wa-fin-detail-grid">
              <div>
                <h4>Comprador</h4>
                <ul className="wa-fin-detail-list">
                  <li><span>Nombre</span><strong>{selected.buyerName}</strong></li>
                  <li><span>Correo</span><strong>{selected.buyerEmail}</strong></li>
                  <li><span>Teléfono</span><strong>{selected.buyerPhone || '—'}</strong></li>
                  <li><span>Tipo</span><strong>{selected.buyerType === 'guardian' ? 'Representante' : 'Estudiante'}</strong></li>
                  <li><span>País</span><strong>{selected.buyerCountry || '—'}</strong></li>
                  <li><span>Documento</span><strong>{selected.documentNumberMasked || '—'}</strong></li>
                  <li><span>Origen</span><strong>Checkout invitado</strong></li>
                </ul>
              </div>
              {selected.requiresGuardian && (
                <div>
                  <h4>Estudiante y representante</h4>
                  <ul className="wa-fin-detail-list">
                    <li><span>Estudiante</span><strong>{selected.studentName || '—'}</strong></li>
                    <li><span>Nacimiento</span><strong>{selected.studentBirthDate || '—'}</strong></li>
                    <li><span>Grado</span><strong>{selected.studentGrade || '—'}</strong></li>
                    <li><span>Representante</span><strong>{selected.guardianName || '—'}</strong></li>
                    <li><span>Correo</span><strong>{selected.guardianEmail || '—'}</strong></li>
                    <li><span>Teléfono</span><strong>{selected.guardianPhone || '—'}</strong></li>
                    <li><span>Relación</span><strong>{selected.guardianRelationship || '—'}</strong></li>
                  </ul>
                </div>
              )}
              <div>
                <h4>Pago, registro y acceso</h4>
                <ul className="wa-fin-detail-list">
                  <li><span>Producto</span><strong>{selected.products.join(' · ')}</strong></li>
                  <li><span>Importe</span><strong>{money(selected.amountCents, selected.currency)}</strong></li>
                  <li><span>Pago</span><strong>{PAYMENT_LABEL[selected.paymentStatus] || selected.paymentStatus}</strong></li>
                  <li><span>Registro</span><strong>{REGISTRATION_LABEL[selected.registrationStatus] || selected.registrationStatus}</strong></li>
                  <li><span>Cuenta</span><strong>{selected.accountEmail || 'Sin crear'}</strong></li>
                  <li><span>Correo</span><strong>{selected.emailVerified === null ? '—' : selected.emailVerified ? 'Verificado' : 'Pendiente'}</strong></li>
                  <li><span>Matrícula</span><strong>{selected.activeAccess ? 'Activa' : 'Sin acceso'}</strong></li>
                  <li><span>Registrado</span><strong>{fecha(selected.registeredAt)}</strong></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default RegistrationsPanel;
