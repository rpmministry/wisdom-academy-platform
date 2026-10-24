'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch, ApiClientError, errorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

type FinanceStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'reversed'
  | 'free';

interface FinanceOrder {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: FinanceStatus;
  checkoutMode?: 'account' | 'guest';
  registrationStatus?: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  discountCodeHint: string | null;
  createdAt: string;
  paidAt: string | null;
  updatedAt: string;
  items: Array<{
    productId: string;
    title: string;
    unitPriceCents: number;
    quantity: number;
  }>;
  transactions: Array<{
    kind: string;
    amountCents: number;
    currency: string;
    status: string;
    providerTxnId: string | null;
    createdAt: string;
  }>;
  statusHistory: Array<{
    fromStatus: string | null;
    toStatus: string;
    reason: string;
    createdAt: string;
  }>;
}

interface FinanceReport {
  currency: string;
  generatedAt: string;
  summary: {
    capturedCents: number;
    refundedCents: number;
    netCents: number;
    capturedOrders: number;
    paidOrders: number;
    freeOrders: number;
    pendingOrders: number;
    failedOrders: number;
    refundedOrders: number;
    cancelledOrders: number;
  };
  series: Array<{
    date: string;
    grossCents: number;
    refundCents: number;
    netCents: number;
    orders: number;
  }>;
  products: Array<{
    productId: string;
    title: string;
    grossCents: number;
    orders: number;
  }>;
  promotions: Array<{
    discountName: string;
    codeHint: string;
    redemptions: number;
    discountCents: number;
  }>;
  orders: FinanceOrder[];
}

interface FinancePanelProps {
  products: Array<{ id: string; name: string }>;
  canRefund: boolean;
}

const STATUS_LABEL: Record<FinanceStatus, string> = {
  pending: 'Pendiente',
  paid: 'Pagada',
  failed: 'Fallida',
  cancelled: 'Cancelada',
  refunded: 'Reembolsada',
  reversed: 'Revertida',
  free: 'Gratuita',
};

const STATUS_CLASS: Record<FinanceStatus, string> = {
  pending: 'is-pending',
  paid: 'is-paid',
  failed: 'is-failed',
  cancelled: 'is-failed',
  refunded: 'is-refunded',
  reversed: 'is-reversed',
  free: 'is-paid',
};

const TXN_LABEL: Record<string, string> = {
  capture: 'Captura',
  refund: 'Reembolso',
  reversal: 'Reversión',
  free: 'Acceso gratuito',
};

function money(cents: number, currency: string): string {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency }).format(cents / 100);
}

function fecha(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function dayLabel(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(date);
}

function monthLabel(value: string): string {
  const date = new Date(`${value}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(date);
}

function weekStart(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - offset);
  return date.toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export const FinancePanel: React.FC<FinancePanelProps> = ({ products, canRefund }) => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [productId, setProductId] = useState('');
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [busyRefund, setBusyRefund] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (status) params.set('status', status);
      if (productId) params.set('productId', productId);
      if (search.trim()) params.set('q', search.trim());
      params.set('limit', '300');
      const response = await apiFetch<{ reporte: FinanceReport }>(
        `/api/admin/finance?${params.toString()}`,
        { signal: controller.signal }
      );
      setReport(response.reporte);
    } catch (err) {
      if (err instanceof ApiClientError && err.code === 'ABORTED') return;
      setError(errorMessage(err));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [from, productId, search, status, to]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const selectedOrder = useMemo(
    () => report?.orders.find((order) => order.id === selectedOrderId) || null,
    [report, selectedOrderId]
  );

  const chartSeries = useMemo(() => {
    if (!report) return [];
    if (groupBy === 'day') {
      return report.series.map((row) => ({ ...row, label: dayLabel(row.date) }));
    }
    const buckets = new Map<
      string,
      { date: string; label: string; grossCents: number; refundCents: number; netCents: number; orders: number }
    >();
    for (const row of report.series) {
      const key = groupBy === 'week' ? weekStart(row.date) : row.date.slice(0, 7);
      const current =
        buckets.get(key) ||
        {
          date: key,
          label: groupBy === 'week' ? dayLabel(key) : monthLabel(key),
          grossCents: 0,
          refundCents: 0,
          netCents: 0,
          orders: 0,
        };
      current.grossCents += row.grossCents;
      current.refundCents += row.refundCents;
      current.netCents += row.netCents;
      current.orders += row.orders;
      buckets.set(key, current);
    }
    return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [groupBy, report]);

  const chartMax = Math.max(
    ...chartSeries.map((row) => Math.max(row.grossCents, row.refundCents)),
    1
  );

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setStatus('');
    setProductId('');
    setSearch('');
  };

  const exportCsv = () => {
    if (!report) return;
    const headers = [
      'Orden',
      'Fecha',
      'Comprador',
      'Correo',
      'Estado',
      'Productos',
      'Subtotal',
      'Descuento',
      'Total',
      'Moneda',
      'PayPal order',
      'PayPal capture',
    ];
    const rows = report.orders.map((order) => [
      order.id,
      order.paidAt || order.createdAt,
      order.userName,
      order.userEmail,
      STATUS_LABEL[order.status] || order.status,
      order.items.map((item) => `${item.title} x${item.quantity}`).join(' | '),
      (order.subtotalCents / 100).toFixed(2),
      (order.discountCents / 100).toFixed(2),
      (order.totalCents / 100).toFixed(2),
      order.currency,
      order.paypalOrderId || '',
      order.paypalCaptureId || '',
    ]);
    const csv = `\uFEFF${[headers, ...rows]
      .map((row) => row.map((cell) => csvCell(cell)).join(','))
      .join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wisdom-pagos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const refund = async (order: FinanceOrder) => {
    if (!canRefund || busyRefund) return;
    if (
      !window.confirm(
        '¿Procesar el reembolso completo? Esta acción revoca únicamente los derechos originados por esta compra.'
      )
    ) {
      return;
    }
    setBusyRefund(true);
    setError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/admin/orders/${encodeURIComponent(order.id)}/refund`, {
        method: 'POST',
      });
      setNotice('Reembolso procesado y derechos de la compra actualizados.');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyRefund(false);
    }
  };

  const summary = report?.summary;

  return (
    <div className="wa-fin">
      <div className="wa-fin-kpis" aria-busy={loading || undefined}>
        <div className="wa-fin-kpi is-success">
          <span>Cobros confirmados</span>
          <strong>{money(summary?.capturedCents || 0, report?.currency || 'USD')}</strong>
          <small>
            {summary?.capturedOrders || 0} órdenes capturadas · incluye reembolsadas antes de
            descontar
          </small>
        </div>
        <div className="wa-fin-kpi">
          <span>Neto después de reembolsos</span>
          <strong>{money(summary?.netCents || 0, report?.currency || 'USD')}</strong>
          <small>{money(summary?.refundedCents || 0, report?.currency || 'USD')} reembolsados</small>
        </div>
        <div className="wa-fin-kpi">
          <span>Órdenes pagadas</span>
          <strong>{summary?.paidOrders || 0}</strong>
          <small>{summary?.freeOrders || 0} gratuitas · {summary?.refundedOrders || 0} reembolsadas</small>
        </div>
        <div className="wa-fin-kpi">
          <span>Pendientes</span>
          <strong>{summary?.pendingOrders || 0}</strong>
          <small>No se contabilizan como ingreso</small>
        </div>
        <div className="wa-fin-kpi">
          <span>Fallidas</span>
          <strong>{summary?.failedOrders || 0}</strong>
          <small>{summary?.cancelledOrders || 0} canceladas</small>
        </div>
        <div className="wa-fin-kpi">
          <span>Reembolsos</span>
          <strong>{money(summary?.refundedCents || 0, report?.currency || 'USD')}</strong>
          <small>Solo transacciones completadas</small>
        </div>
      </div>

      <div className="wa-fin-filters">
        <label className="wa-checkout-field">
          Desde
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </label>
        <label className="wa-checkout-field">
          Hasta
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
        </label>
        <label className="wa-checkout-field">
          Estado
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Todos</option>
            <option value="paid">Pagadas</option>
            <option value="pending">Pendientes</option>
            <option value="failed">Fallidas</option>
            <option value="free">Gratuitas</option>
            <option value="refunded">Reembolsadas</option>
            <option value="reversed">Revertidas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </label>
        <label className="wa-checkout-field">
          Producto
          <select value={productId} onChange={(event) => setProductId(event.target.value)}>
            <option value="">Todos los productos</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
        <label className="wa-checkout-field">
          Buscar
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Orden, comprador o PayPal"
          />
        </label>
        <div className="wa-fin-filter-actions">
          <div className="wa-fin-presets" aria-label="Rangos rápidos">
            <button type="button" onClick={() => { setFrom(isoDaysAgo(7)); setTo(''); }}>
              7 días
            </button>
            <button type="button" onClick={() => { setFrom(isoDaysAgo(30)); setTo(''); }}>
              30 días
            </button>
            <button type="button" onClick={() => { setFrom(isoDaysAgo(90)); setTo(''); }}>
              90 días
            </button>
            <button type="button" onClick={clearFilters}>
              Todo
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="wa-checkout-error" role="alert">
          <WisdomIcon name="shield" size={16} />
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      )}
      {notice && (
        <div className="wa-checkout-notice" role="status">
          {notice}
        </div>
      )}

      <div className="wa-fin-grid">
        <section className="wa-fin-card" aria-labelledby="finance-series-heading">
          <div className="wa-fin-card-head">
            <div>
              <h3 id="finance-series-heading">Evolución de cobros</h3>
              <span>
                {loading ? 'Actualizando…' : `${chartSeries.length} período(s) con movimientos`}
              </span>
            </div>
            <div className="wa-fin-presets" aria-label="Agrupar evolución">
              {(['day', 'week', 'month'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  data-active={groupBy === option}
                  onClick={() => setGroupBy(option)}
                >
                  {option === 'day' ? 'Día' : option === 'week' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          </div>
          {chartSeries.length > 0 ? (
            <>
              <div className="wa-fin-chart" role="img" aria-label="Gráfico de cobros y reembolsos por período">
                {chartSeries.map((row) => (
                  <div
                    className="wa-fin-bar"
                    key={row.date}
                    title={`${row.label}: cobrado ${money(row.grossCents, report?.currency || 'USD')}, reembolsado ${money(row.refundCents, report?.currency || 'USD')}`}
                  >
                    <div className="wa-fin-bar-bars">
                      <i style={{ height: `${Math.max(2, (row.grossCents / chartMax) * 100)}%` }} />
                      {row.refundCents > 0 && (
                        <i
                          className="is-refund"
                          style={{ height: `${Math.max(2, (row.refundCents / chartMax) * 100)}%` }}
                        />
                      )}
                    </div>
                    <span>{row.label}</span>
                  </div>
                ))}
              </div>
              <div className="wa-fin-legend">
                <span><i /> Cobros confirmados</span>
                <span><i className="is-refund" /> Reembolsos</span>
              </div>
            </>
          ) : (
            <p className="wa-fin-empty">No hay cobros en el período seleccionado.</p>
          )}
        </section>

        <div style={{ display: 'grid', gap: '0.85rem' }}>
          <section className="wa-fin-card" aria-labelledby="finance-products-heading">
            <div className="wa-fin-card-head">
              <div>
                <h3 id="finance-products-heading">Ventas por producto</h3>
                <span>Importe bruto de productos capturados</span>
              </div>
            </div>
            {report?.products.length ? (
              <ol className="wa-fin-ranking">
                {report.products.map((product) => (
                  <li key={product.productId}>
                    <strong>{product.title}</strong>
                    <small>{product.orders} orden(es)</small>
                    <span>{money(product.grossCents, report.currency)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="wa-fin-empty">Sin ventas por producto en el período.</p>
            )}
          </section>

          <section className="wa-fin-card" aria-labelledby="finance-promotions-heading">
            <div className="wa-fin-card-head">
              <div>
                <h3 id="finance-promotions-heading">Códigos promocionales</h3>
                <span>Canjes consumidos; no se calcula conversión sin eventos de visitas</span>
              </div>
            </div>
            {report?.promotions.length ? (
              <ol className="wa-fin-ranking">
                {report.promotions.map((promo) => (
                  <li key={`${promo.codeHint}-${promo.discountName}`}>
                    <strong>{promo.discountName}</strong>
                    <small>{promo.codeHint} · {promo.redemptions} canje(s)</small>
                    <span>- {money(promo.discountCents, report.currency)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="wa-fin-empty">Sin canjes de códigos en el período.</p>
            )}
          </section>
        </div>
      </div>

      <section className="wa-fin-card" aria-labelledby="finance-orders-heading">
        <div className="wa-fin-card-head">
          <div>
            <h3 id="finance-orders-heading">Órdenes ({report?.orders.length || 0})</h3>
            <span>Hasta 300 órdenes más recientes según los filtros aplicados</span>
          </div>
          <div className="wa-fin-toolbar-actions">
            <Button variant="secondary" size="sm" onClick={() => void load()}>
              Actualizar
            </Button>
            <Button variant="secondary" size="sm" onClick={exportCsv} disabled={!report || report.orders.length === 0}>
              <WisdomIcon name="download" size={14} />
              Exportar CSV
            </Button>
          </div>
        </div>

        {!report && loading ? (
          <p className="wa-fin-empty" role="status">Cargando pagos…</p>
        ) : report && report.orders.length > 0 ? (
          <>
            <div className="wa-fin-table-wrap">
              <table className="wa-fin-table">
                <thead>
                  <tr>
                    <th>Fecha / orden</th>
                    <th>Comprador</th>
                    <th>Productos</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>PayPal</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {report.orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{fecha(order.paidAt || order.createdAt)}</strong>
                        <small>{order.id.slice(0, 18)}…</small>
                      </td>
                      <td>
                        <strong>{order.userName}</strong>
                        <small>{order.userEmail}</small>
                      </td>
                      <td>
                        {order.items.map((item) => item.title).join(' · ')}
                        {order.discountCodeHint && <small>Código {order.discountCodeHint}</small>}
                      </td>
                      <td>
                        <strong>{money(order.totalCents, order.currency)}</strong>
                        {order.discountCents > 0 && (
                          <small>- {money(order.discountCents, order.currency)} descuento</small>
                        )}
                      </td>
                      <td>
                        <span className={`wa-fin-status ${STATUS_CLASS[order.status]}`}>
                          {STATUS_LABEL[order.status] || order.status}
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: '0.65rem' }}>
                          {order.paypalCaptureId || order.paypalOrderId || '—'}
                        </strong>
                        <small>captura / orden</small>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(order.id)}
                          >
                            Ver detalle
                          </button>
                          {canRefund && ['paid', 'free'].includes(order.status) && (
                            <button
                              type="button"
                              className="wa-fin-refund"
                              disabled={busyRefund}
                              onClick={() => void refund(order)}
                            >
                              Reembolsar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="wa-fin-cards">
              {report.orders.map((order) => (
                <article key={order.id} className="wa-fin-order-card">
                  <div>
                    <strong>{money(order.totalCents, order.currency)}</strong>
                    <span className={`wa-fin-status ${STATUS_CLASS[order.status]}`}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>
                  <div>
                    <strong>{order.userName}</strong>
                    <small>{fecha(order.paidAt || order.createdAt)}</small>
                  </div>
                  <small>{order.items.map((item) => item.title).join(' · ')}</small>
                  <small>Orden {order.id.slice(0, 18)}…</small>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Button variant="secondary" size="sm" onClick={() => setSelectedOrderId(order.id)}>
                      Ver detalle
                    </Button>
                    {canRefund && ['paid', 'free'].includes(order.status) && (
                      <Button variant="secondary" size="sm" disabled={busyRefund} onClick={() => void refund(order)}>
                        Reembolsar
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="wa-fin-empty">No hay órdenes que coincidan con los filtros.</p>
        )}

        {selectedOrder && (
          <div className="wa-fin-detail" style={{ marginTop: '0.85rem' }} aria-live="polite">
            <div className="wa-fin-detail-head">
              <div>
                <h3>Detalle de la orden</h3>
                <p>{selectedOrder.id} · {fecha(selectedOrder.paidAt || selectedOrder.createdAt)}</p>
              </div>
              <button
                type="button"
                className="wa-portal-icon-button"
                onClick={() => setSelectedOrderId(null)}
                aria-label="Cerrar detalle de la orden"
              >
                <WisdomIcon name="close" size={16} />
              </button>
            </div>
            <div className="wa-fin-detail-grid">
              <div>
                <h4>Comprador y estado</h4>
                <ul className="wa-fin-detail-list">
                  <li><span>Nombre</span><strong>{selectedOrder.userName}</strong></li>
                  <li><span>Correo</span><strong>{selectedOrder.userEmail}</strong></li>
                  <li><span>Estado interno</span><strong>{STATUS_LABEL[selectedOrder.status]}</strong></li>
                  <li><span>Compra</span><strong>{selectedOrder.checkoutMode === 'guest' ? 'Invitado' : 'Cuenta'}</strong></li>
                  <li>
                    <span>Registro posterior</span>
                    <strong>
                      {selectedOrder.registrationStatus === 'pending'
                        ? 'Pendiente'
                        : selectedOrder.registrationStatus === 'completed'
                          ? 'Completado'
                          : selectedOrder.registrationStatus === 'not_required'
                            ? 'No requerido'
                            : selectedOrder.registrationStatus || '—'}
                    </strong>
                  </li>
                  <li><span>PayPal order</span><strong>{selectedOrder.paypalOrderId || '—'}</strong></li>
                  <li><span>PayPal capture</span><strong>{selectedOrder.paypalCaptureId || '—'}</strong></li>
                  {selectedOrder.discountCodeHint && (
                    <li><span>Código</span><strong>{selectedOrder.discountCodeHint}</strong></li>
                  )}
                </ul>
              </div>
              <div>
                <h4>Líneas e importes</h4>
                <ul className="wa-fin-detail-list">
                  {selectedOrder.items.map((item) => (
                    <li key={item.productId}>
                      <span>{item.title} × {item.quantity}</span>
                      <strong>{money(item.unitPriceCents * item.quantity, selectedOrder.currency)}</strong>
                    </li>
                  ))}
                  <li><span>Subtotal</span><strong>{money(selectedOrder.subtotalCents, selectedOrder.currency)}</strong></li>
                  <li><span>Descuento</span><strong>- {money(selectedOrder.discountCents, selectedOrder.currency)}</strong></li>
                  <li><span>Total</span><strong>{money(selectedOrder.totalCents, selectedOrder.currency)}</strong></li>
                </ul>
              </div>
              <div>
                <h4>Trazabilidad de pagos</h4>
                <ul className="wa-fin-detail-list">
                  {selectedOrder.transactions.length > 0 ? (
                    selectedOrder.transactions.map((txn, index) => (
                      <li key={`${txn.kind}-${txn.providerTxnId || index}`}>
                        <span>
                          {TXN_LABEL[txn.kind] || txn.kind} · {txn.status}
                          <br />
                          <small>{fecha(txn.createdAt)}</small>
                        </span>
                        <strong>{money(txn.amountCents, txn.currency)}</strong>
                      </li>
                    ))
                  ) : (
                    <li><span>Sin transacciones registradas</span></li>
                  )}
                </ul>
                <h4 style={{ marginTop: '0.7rem' }}>Historial de estados</h4>
                <ul className="wa-fin-detail-list">
                  {(selectedOrder.statusHistory || []).length > 0 ? (
                    selectedOrder.statusHistory.map((entry, index) => (
                      <li key={`${entry.toStatus}-${entry.createdAt}-${index}`}>
                        <span>
                          {entry.fromStatus ? `${entry.fromStatus} → ` : ''}
                          <strong>{entry.toStatus}</strong>
                          <br />
                          <small>{fecha(entry.createdAt)}</small>
                        </span>
                      </li>
                    ))
                  ) : (
                    <li><span>Sin historial registrado</span></li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="wa-fin-toolbar" style={{ marginTop: '0.65rem' }}>
          <p>
            Los cobros y reembolsos provienen de transacciones persistidas. Las órdenes
            pendientes o fallidas no son ingresos. La conversión promocional no se calcula
            porque no hay eventos de visitas registrados.
          </p>
          <Badge variant="navy" size="sm">{report?.currency || 'USD'}</Badge>
        </div>
      </section>
    </div>
  );
};

export default FinancePanel;
