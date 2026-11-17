'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { formatPazUsd } from '@/lib/paz-en-la-mesa/config';
import type { PazPaymentIntentView, PazPaymentStatus } from '@/server/domain/paz';

interface ListResponse {
  pagos: PazPaymentIntentView[];
}

export function PazPaymentsAdmin({ initialPayments }: { initialPayments: PazPaymentIntentView[] }) {
  const [payments, setPayments] = useState(initialPayments);
  const [filter, setFilter] = useState<PazPaymentStatus | 'all'>('pending');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(async (status: PazPaymentStatus | 'all' = filter) => {
    setBusy('load');
    setMessage('');
    try {
      const query = status === 'all' ? '' : `?status=${status}`;
      const response = await apiFetch<ListResponse>(`/api/paz/payments${query}`);
      setPayments(response.pagos);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }, [filter]);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  const review = async (intent: PazPaymentIntentView, action: 'approve' | 'reject') => {
    setBusy(intent.id);
    setMessage('');
    try {
      await apiFetch(`/api/paz/payments/${intent.id}`, {
        method: 'POST',
        body: { action, note: notes[intent.id] || undefined },
      });
      setMessage(
        action === 'approve'
          ? `Pago ${intent.reference} aprobado y acceso activado.`
          : `Pago ${intent.reference} rechazado.`
      );
      await load(filter);
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="paz-admin">
      <div className="paz-admin-head">
        <div>
          <h1>Pagos · Paz en la mesa</h1>
          <p>
            Valida transferencias y pagos PayPhone. Al aprobar, se activa el acceso del hogar
            y se registra la orden pagada.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select
            className="paz-admin-input"
            value={filter}
            onChange={(event) => setFilter(event.target.value as PazPaymentStatus | 'all')}
            style={{ minWidth: 150, minHeight: 40 }}
            aria-label="Filtrar pagos"
          >
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobados</option>
            <option value="rejected">Rechazados</option>
            <option value="all">Todos</option>
          </select>
          <button
            type="button"
            className="paz-btn paz-btn--ghost paz-btn--small"
            onClick={() => void load(filter)}
            disabled={busy === 'load'}
          >
            <WisdomIcon name="refresh" size={15} /> Actualizar
          </button>
          <a href="/paz-en-la-mesa" className="paz-btn paz-btn--olive paz-btn--small">
            Ver landing
          </a>
        </div>
      </div>

      {message && (
        <div className={`paz-alert ${message.includes('aprobado') || message.includes('rechazado') ? 'paz-alert--success' : 'paz-alert--error'}`} role="status">
          {message}
        </div>
      )}

      <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
        <table className="paz-admin-table">
          <thead>
            <tr>
              <th>Referencia</th>
              <th>Comprador</th>
              <th>Plan</th>
              <th>Método</th>
              <th>Monto</th>
              <th>Comprobante</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={8} className="paz-admin-empty">
                  No hay pagos en este filtro.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <strong>{payment.reference}</strong>
                    <br />
                    <small>{new Date(payment.createdAt).toLocaleString('es-EC')}</small>
                  </td>
                  <td>
                    {payment.buyerName}
                    <br />
                    <small>{payment.buyerEmail}</small>
                    {payment.buyerPhone && (
                      <>
                        <br />
                        <small>{payment.buyerPhone}</small>
                      </>
                    )}
                  </td>
                  <td>
                    {payment.plan === 'scholarship'
                      ? 'Beca un Hogar'
                      : payment.plan === 'official'
                        ? 'Oficial'
                        : 'Preventa'}
                  </td>
                  <td>{payment.method === 'bank_transfer' ? 'Transferencia' : 'PayPhone'}</td>
                  <td>{formatPazUsd(payment.amountCents)}</td>
                  <td>
                    {payment.transferReference || '—'}
                    {payment.transferDate && (
                      <>
                        <br />
                        <small>{payment.transferDate}</small>
                      </>
                    )}
                    {payment.note && (
                      <>
                        <br />
                        <small>{payment.note}</small>
                      </>
                    )}
                  </td>
                  <td>
                    <span className={`paz-admin-status paz-admin-status--${payment.status}`}>
                      {payment.status}
                    </span>
                    {payment.orderId && (
                      <>
                        <br />
                        <small>{payment.orderId}</small>
                      </>
                    )}
                  </td>
                  <td>
                    {payment.status === 'pending' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: 180 }}>
                        <input
                          value={notes[payment.id] || ''}
                          onChange={(event) =>
                            setNotes((current) => ({ ...current, [payment.id]: event.target.value }))
                          }
                          placeholder="Nota de revisión"
                          className="paz-admin-input"
                        />
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="paz-btn paz-btn--olive paz-btn--small"
                            onClick={() => void review(payment, 'approve')}
                            disabled={busy === payment.id}
                          >
                            Aprobar
                          </button>
                          <button
                            type="button"
                            className="paz-btn paz-btn--ghost paz-btn--small"
                            onClick={() => void review(payment, 'reject')}
                            disabled={busy === payment.id}
                          >
                            Rechazar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <small>
                        {payment.reviewedAt
                          ? new Date(payment.reviewedAt).toLocaleString('es-EC')
                          : 'Revisado'}
                        {payment.reviewNote ? ` · ${payment.reviewNote}` : ''}
                      </small>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PazPaymentsAdmin;
