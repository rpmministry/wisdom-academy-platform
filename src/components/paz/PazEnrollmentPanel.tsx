'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import {
  PAZ_PRICING,
  type PazPhase,
} from '@/lib/paz-en-la-mesa/content';
import { formatPazUsd } from '@/lib/paz-en-la-mesa/config';

export interface PazBankDetailsView {
  beneficiary: string;
  ruc: string;
  bankName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
  email: string;
  referenceHint: string;
  configured: boolean;
}

export interface PazEnrollmentPanelProps {
  userEmail: string;
  userName: string;
  phase: PazPhase;
  initialPlan: 'presale' | 'official' | 'scholarship';
  initialMethod: 'bank_transfer' | 'payphone';
  bank: PazBankDetailsView;
  payphoneUrl: string;
  whatsappUrl: string;
}

interface IntentResponse {
  pago: {
    id: string;
    reference: string;
    plan: 'presale' | 'official' | 'scholarship';
    method: 'bank_transfer' | 'payphone';
    amountCents: number;
    status: string;
    paymentUrl: string | null;
  };
  instrucciones: {
    banco?: PazBankDetailsView;
    payphoneUrl?: string | null;
    mensaje?: string;
  };
}

function planLabel(plan: string): string {
  if (plan === 'scholarship') return PAZ_PRICING.scholarshipLabel;
  if (plan === 'official') return PAZ_PRICING.officialLabel;
  return PAZ_PRICING.presaleLabel;
}

export function PazEnrollmentPanel({
  userEmail,
  userName,
  phase,
  initialPlan,
  initialMethod,
  bank,
  payphoneUrl,
  whatsappUrl,
}: PazEnrollmentPanelProps) {
  const [plan, setPlan] = useState(initialPlan);
  const [method, setMethod] = useState(initialMethod);
  const [buyerName, setBuyerName] = useState(userName);
  const [buyerPhone, setBuyerPhone] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [transferDate, setTransferDate] = useState('');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<IntentResponse | null>(null);

  const amount = useMemo(() => {
    if (plan === 'scholarship') return PAZ_PRICING.scholarshipCents;
    if (plan === 'official') return PAZ_PRICING.officialCents;
    return PAZ_PRICING.presaleCents;
  }, [plan]);

  const presaleOpen = phase === 'presale';
  const officialOpen = phase === 'official';
  const closed = phase === 'closed';
  const canPurchase =
    plan === 'scholarship'
      ? !closed
      : plan === 'presale'
        ? phase === 'presale'
        : phase === 'official';

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canPurchase) return;
    setStatus('sending');
    setMessage('');
    try {
      const response = await apiFetch<IntentResponse>('/api/paz/payments', {
        method: 'POST',
        body: {
          plan,
          method,
          buyerName,
          buyerPhone: buyerPhone || undefined,
          transferReference: method === 'bank_transfer' ? transferReference : undefined,
          transferDate: method === 'bank_transfer' ? transferDate : undefined,
          note,
        },
      });
      setResult(response);
      setStatus('done');
    } catch (error) {
      setStatus('error');
      setMessage(errorMessage(error));
    }
  };

  if (closed) {
    return (
      <div className="paz-alert paz-alert--error">
        Las inscripciones y aportes solidarios cerraron el 20 de diciembre de 2026. Si ya eres
        alumno, entra a tu portal para ver las clases y el Reto de 7 días.
      </div>
    );
  }

  if (status === 'done' && result) {
    const instructions = result.instrucciones;
    return (
      <div className="paz-form">
        <div className="paz-alert paz-alert--success" role="status">
          <strong>Registro creado: {result.pago.reference}</strong>
          <br />
          {result.pago.method === 'bank_transfer'
            ? 'Ahora realiza la transferencia y envía tu comprobante. Validaremos el pago y activaremos tu acceso.'
            : 'Continúa el pago en PayPhone. Si el enlace no se abrió, usa el botón de abajo.'}
        </div>

        <div className="paz-payment">
          <h3>{planLabel(result.pago.plan)} · {formatPazUsd(result.pago.amountCents)}</h3>
          {result.pago.method === 'bank_transfer' ? (
            <>
              <p>{instructions.banco?.referenceHint}</p>
              <dl>
                <div>
                  <dt>Beneficiario</dt>
                  <dd>{instructions.banco?.beneficiary || bank.beneficiary}</dd>
                </div>
                <div>
                  <dt>RUC</dt>
                  <dd>{instructions.banco?.ruc || bank.ruc}</dd>
                </div>
                <div>
                  <dt>Banco</dt>
                  <dd>{instructions.banco?.bankName || bank.bankName}</dd>
                </div>
                <div>
                  <dt>Cuenta</dt>
                  <dd>{instructions.banco?.accountNumber || bank.accountNumber}</dd>
                </div>
                <div>
                  <dt>Referencia</dt>
                  <dd>{result.pago.reference}</dd>
                </div>
              </dl>
              <div className="paz-payment-warning">
                Envía el comprobante a {instructions.banco?.email || bank.email} indicando el
                código {result.pago.reference}. La validación puede tomar hasta 24 horas hábiles.
              </div>
            </>
          ) : (
            <>
              <p>
                {instructions.mensaje ||
                  'Completa el pago con tarjeta en el enlace oficial de PayPhone.'}
              </p>
              {(result.pago.paymentUrl || payphoneUrl) && (
                <a
                  href={result.pago.paymentUrl || payphoneUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="paz-btn paz-btn--primary paz-btn--small"
                  style={{ marginTop: '0.75rem' }}
                >
                  Abrir PayPhone
                </a>
              )}
              <div className="paz-payment-warning">
                Código de inscripción: {result.pago.reference}. Guarda este código para
                cualquier consulta.
              </div>
            </>
          )}
        </div>

        <div className="paz-actions">
          {whatsappUrl && (
            <a href={whatsappUrl} target="_blank" rel="noreferrer" className="paz-btn paz-btn--olive">
              <WisdomIcon name="users" size={16} /> Avisar por WhatsApp
            </a>
          )}
          <Link href="/mi-acceso" className="paz-btn paz-btn--ghost">
            <WisdomIcon name="user" size={16} /> Ver mi acceso
          </Link>
          <button
            type="button"
            className="paz-btn paz-btn--ghost"
            onClick={() => {
              setStatus('idle');
              setResult(null);
            }}
          >
            Registrar otro pago
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="paz-form" onSubmit={submit}>
      <div className="paz-alert paz-alert--info">
        Estás comprando como <strong>{userEmail}</strong>. El acceso es por hogar y se activa
        después de validar el pago.
      </div>

      <fieldset className="paz-field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="paz-legend">Elige tu plan</legend>
        <div className="paz-pricing" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
          <div className="paz-price-card" style={{ cursor: 'pointer' }}>
            <span className="paz-price-flag">Del 3 al 8 de diciembre</span>
            <h3>{PAZ_PRICING.presaleLabel}</h3>
            <div className="paz-price-amount">
              <strong>{formatPazUsd(PAZ_PRICING.presaleCents)}</strong>
              <span>por hogar</span>
            </div>
            <label className="paz-check">
              <input
                type="radio"
                name="plan"
                value="presale"
                checked={plan === 'presale'}
                onChange={() => setPlan('presale')}
                disabled={!presaleOpen}
              />
              Elegir preventa
            </label>
            {!presaleOpen && (
              <small>
                {phase === 'anticipation'
                  ? 'Abre el jueves 3 de diciembre a las 20:00.'
                  : 'La preventa ya cerró.'}
              </small>
            )}
          </div>

          <div className="paz-price-card" style={{ cursor: 'pointer' }}>
            <span className="paz-price-flag">Del 9 al 20 de diciembre</span>
            <h3>{PAZ_PRICING.officialLabel}</h3>
            <div className="paz-price-amount">
              <strong>{formatPazUsd(PAZ_PRICING.officialCents)}</strong>
              <span>por hogar</span>
            </div>
            <label className="paz-check">
              <input
                type="radio"
                name="plan"
                value="official"
                checked={plan === 'official'}
                onChange={() => setPlan('official')}
                disabled={!officialOpen}
              />
              Elegir precio oficial
            </label>
            {!officialOpen && <small>Disponible desde el 9 de diciembre.</small>}
          </div>

          <div className="paz-price-card paz-price-card--solidarity" style={{ cursor: 'pointer' }}>
            <span className="paz-price-flag">Aporte solidario</span>
            <h3>{PAZ_PRICING.scholarshipLabel}</h3>
            <div className="paz-price-amount">
              <strong>{formatPazUsd(PAZ_PRICING.scholarshipCents)}</strong>
              <span>por matrimonio</span>
            </div>
            <label className="paz-check">
              <input
                type="radio"
                name="plan"
                value="scholarship"
                checked={plan === 'scholarship'}
                onChange={() => setPlan('scholarship')}
              />
              Beca un Hogar
            </label>
          </div>
        </div>
      </fieldset>

      {phase === 'anticipation' && plan !== 'scholarship' && (
        <div className="paz-alert paz-alert--info">
          La preventa abre el jueves 3 de diciembre a las 20:00. Mientras tanto, puedes
          <Link href="/paz-en-la-mesa#comunidad" style={{ marginLeft: '0.25rem', fontWeight: 700 }}>
            dejar tus datos aquí
          </Link>
          .
        </div>
      )}

      <fieldset className="paz-field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="paz-legend">Método de pago</legend>
        <div className="paz-payments">
          <div className="paz-payment" style={{ cursor: 'pointer' }}>
            <h3>Transferencia o depósito</h3>
            <p>0% comisión · Validación con comprobante</p>
            <label className="paz-check">
              <input
                type="radio"
                name="method"
                value="bank_transfer"
                checked={method === 'bank_transfer'}
                onChange={() => setMethod('bank_transfer')}
              />
              Pagar por transferencia
            </label>
          </div>
          <div className="paz-payment" style={{ cursor: 'pointer' }}>
            <h3>Tarjeta con PayPhone</h3>
            <p>5% + IVA · Enlace seguro</p>
            <label className="paz-check">
              <input
                type="radio"
                name="method"
                value="payphone"
                checked={method === 'payphone'}
                onChange={() => setMethod('payphone')}
              />
              Pagar con tarjeta
            </label>
          </div>
        </div>
      </fieldset>

      <div className="paz-form-row">
        <div className="paz-field">
          <label htmlFor="paz-buyer-name">Nombre del comprador</label>
          <input
            id="paz-buyer-name"
            value={buyerName}
            onChange={(event) => setBuyerName(event.target.value)}
            required
            maxLength={160}
            autoComplete="name"
          />
        </div>
        <div className="paz-field">
          <label htmlFor="paz-buyer-phone">WhatsApp de contacto</label>
          <input
            id="paz-buyer-phone"
            value={buyerPhone}
            onChange={(event) => setBuyerPhone(event.target.value)}
            maxLength={40}
            autoComplete="tel"
            placeholder="+593 9..."
          />
        </div>
      </div>

      {method === 'bank_transfer' && (
        <>
          <div className="paz-form-row">
            <div className="paz-field">
              <label htmlFor="paz-transfer-reference">Número de comprobante o referencia</label>
              <input
                id="paz-transfer-reference"
                value={transferReference}
                onChange={(event) => setTransferReference(event.target.value)}
                maxLength={120}
                placeholder="Ej. 00123456"
              />
            </div>
            <div className="paz-field">
              <label htmlFor="paz-transfer-date">Fecha de la transferencia</label>
              <input
                id="paz-transfer-date"
                type="date"
                value={transferDate}
                onChange={(event) => setTransferDate(event.target.value)}
              />
            </div>
          </div>
          <div className="paz-payment">
            <h3>Datos para transferir</h3>
            <dl>
              <div>
                <dt>Beneficiario</dt>
                <dd>{bank.beneficiary}</dd>
              </div>
              <div>
                <dt>RUC</dt>
                <dd>{bank.ruc}</dd>
              </div>
              <div>
                <dt>Banco</dt>
                <dd>{bank.bankName}</dd>
              </div>
              <div>
                <dt>Cuenta</dt>
                <dd>{bank.accountNumber}</dd>
              </div>
            </dl>
            <div className="paz-payment-warning">
              {bank.configured
                ? bank.referenceHint
                : 'La cuenta definitiva se comparte al abrir la preventa. Tu registro queda guardado con el código que generaremos.'}
            </div>
          </div>
        </>
      )}

      <div className="paz-field">
        <label htmlFor="paz-note">Nota para el equipo (opcional)</label>
        <textarea
          id="paz-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={1000}
          placeholder="Cuéntanos si compras para tu hogar, si es un regalo o si necesitas factura."
        />
      </div>

      {status === 'error' && (
        <div className="paz-alert paz-alert--error" role="alert">
          {message}
        </div>
      )}

      <button
        type="submit"
        className="paz-btn paz-btn--primary"
        disabled={status === 'sending' || !canPurchase}
      >
        <WisdomIcon name={status === 'sending' ? 'refresh' : 'credit-card'} size={16} />
        {status === 'sending'
          ? 'Registrando…'
          : `Registrar pago de ${formatPazUsd(amount)}`}
      </button>
      <small className="paz-form-note">
        Al continuar aceptas que validemos el pago antes de activar el acceso. No se activa
        contenido antes del 8 de diciembre de 2026.
      </small>
    </form>
  );
}

export default PazEnrollmentPanel;
