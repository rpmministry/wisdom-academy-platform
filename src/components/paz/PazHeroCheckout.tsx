'use client';

import React, { useId, useMemo, useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PAZ_PRICING, type PazPhase } from '@/lib/paz-en-la-mesa/content';
import { formatPazUsd, pazPublicConfig } from '@/lib/paz-en-la-mesa/config';
import { PayPhoneBox } from '@/components/paz/PayPhoneBox';

export interface PazHeroCheckoutProps {
  phase: PazPhase;
  initialPlan?: 'presale' | 'official' | 'scholarship';
  onSwitchToTransfer?: () => void;
}

interface PayphoneIntentResponse {
  pago: {
    id: string;
    reference: string;
    plan: 'presale' | 'official' | 'scholarship';
    method: 'bank_transfer' | 'payphone';
    amountCents: number;
    status: string;
    buyerName: string;
    buyerEmail: string;
    paymentUrl: string | null;
  };
  instrucciones: {
    payphoneUrl?: string | null;
    payphoneToken?: string | null;
    payphoneStoreId?: string | null;
    mensaje?: string;
  };
}

export function PazHeroCheckout({
  phase,
  initialPlan,
  onSwitchToTransfer,
}: PazHeroCheckoutProps) {
  const uid = useId();
  const defaultPlan: 'presale' | 'official' | 'scholarship' =
    initialPlan || (phase === 'official' || phase === 'closed' ? 'official' : 'presale');

  const [plan, setPlan] = useState<'presale' | 'official' | 'scholarship'>(defaultPlan);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ready' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [intentData, setIntentData] = useState<PayphoneIntentResponse | null>(null);

  const amountCents = useMemo(() => {
    if (plan === 'scholarship') return PAZ_PRICING.scholarshipCents;
    if (plan === 'official') return PAZ_PRICING.officialCents;
    return PAZ_PRICING.presaleCents;
  }, [plan]);

  const planLabel = useMemo(() => {
    if (plan === 'scholarship') return PAZ_PRICING.scholarshipLabel;
    if (plan === 'official') return PAZ_PRICING.officialLabel;
    return PAZ_PRICING.presaleLabel;
  }, [plan]);

  const handleStartPayphone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      setStatus('error');
      setErrorMsg('Ingresa tu nombre y apellido completo.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus('error');
      setErrorMsg('Ingresa un correo electrónico válido para recibir tu acceso.');
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await apiFetch<PayphoneIntentResponse>('/api/paz/payments', {
        method: 'POST',
        body: {
          plan,
          method: 'payphone',
          buyerName: fullName.trim(),
          buyerEmail: email.trim().toLowerCase(),
          buyerPhone: phone.trim() || undefined,
          consent: true,
        },
      });
      setIntentData(res);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setErrorMsg(errorMessage(err));
    }
  };

  return (
    <aside
      aria-label="Inscripción y pago inmediato con PayPhone"
      style={{
        background: 'var(--paz-card-bg, #ffffff)',
        color: 'var(--paz-ink, #2b2927)',
        borderRadius: '24px',
        border: '1px solid rgba(197, 160, 89, 0.45)',
        boxShadow: '0 24px 60px rgba(43, 41, 39, 0.12)',
        padding: 'clamp(1.25rem, 2.5vw, 1.75rem)',
        position: 'relative',
      }}
    >
      {/* Cabecera */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          paddingBottom: '0.9rem',
          marginBottom: '1rem',
          borderBottom: '1px solid var(--paz-card-border, #e4dacb)',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'var(--paz-accent-text, #8f4e38)',
            }}
          >
            <WisdomIcon name="credit-card" size={13} /> Inscripción inmediata
          </span>
          <h2
            style={{
              margin: '0.2rem 0 0',
              fontFamily: 'var(--paz-serif)',
              fontSize: '1.28rem',
              color: 'var(--paz-ink, #2b2927)',
              lineHeight: 1.2,
            }}
          >
            Paga en línea con PayPhone
          </h2>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <strong
            style={{
              display: 'block',
              fontFamily: 'var(--paz-serif)',
              fontSize: '1.55rem',
              color: 'var(--paz-accent-text, #8f4e38)',
              lineHeight: 1,
            }}
          >
            {formatPazUsd(amountCents)}
          </strong>
          <small style={{ fontSize: '0.72rem', color: 'var(--paz-muted, #66615b)' }}>Acceso por hogar</small>
        </div>
      </div>

      {status === 'ready' && intentData ? (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              padding: '0.75rem 0.9rem',
              borderRadius: '12px',
              background: '#faf8f5',
              border: '1px solid #e4dacb',
              marginBottom: '0.75rem',
              fontSize: '0.84rem',
            }}
          >
            <div>
              <strong>{intentData.pago.buyerName}</strong>
              <div style={{ color: '#66615b', fontSize: '0.78rem' }}>
                Ref: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{intentData.pago.reference}</span> · {planLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setStatus('idle');
                setIntentData(null);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8f4e38',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Cambiar datos
            </button>
          </div>

          <PayPhoneBox
            token={intentData.instrucciones.payphoneToken}
            storeId={intentData.instrucciones.payphoneStoreId}
            amountCents={intentData.pago.amountCents}
            clientTransactionId={intentData.pago.reference}
            email={intentData.pago.buyerEmail}
            buyerName={intentData.pago.buyerName}
            phoneNumber={phone || undefined}
            fallbackPayphoneUrl={intentData.pago.paymentUrl || pazPublicConfig.payphoneUrl}
          />
        </div>
      ) : (
        <form onSubmit={handleStartPayphone} noValidate>
          {/* Selector compacto de modalidad */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '0.4rem',
              marginBottom: '0.9rem',
            }}
            role="radiogroup"
            aria-label="Modalidad de inscripción"
          >
            {[
              { id: 'presale' as const, label: 'Preventa', price: PAZ_PRICING.presaleCents },
              { id: 'official' as const, label: 'Oficial', price: PAZ_PRICING.officialCents },
              { id: 'scholarship' as const, label: 'Beca Hogar', price: PAZ_PRICING.scholarshipCents },
            ].map((opt) => {
              const active = plan === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPlan(opt.id)}
                  style={{
                    padding: '0.5rem 0.4rem',
                    borderRadius: '10px',
                    border: active ? '2px solid #b36a50' : '1px solid var(--paz-card-border, #e4dacb)',
                    background: active ? 'rgba(179, 106, 80, 0.14)' : 'var(--paz-card-alt, #faf8f5)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 140ms ease',
                  }}
                >
                  <span style={{ display: 'block', fontSize: '0.73rem', fontWeight: 700, color: 'var(--paz-ink, #2b2927)' }}>
                    {opt.label}
                  </span>
                  <strong style={{ fontSize: '0.88rem', color: active ? 'var(--paz-accent-text, #8f4e38)' : 'var(--paz-muted, #5c5847)' }}>
                    {formatPazUsd(opt.price)}
                  </strong>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'grid', gap: '0.7rem', marginBottom: '0.9rem' }}>
            <div>
              <label
                htmlFor={`${uid}-name`}
                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--paz-ink-soft, #4a463a)', marginBottom: '0.25rem' }}
              >
                Nombres y apellidos *
              </label>
              <input
                id={`${uid}-name`}
                type="text"
                required
                placeholder="Ej. María José Pérez"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.68rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--paz-input-border, #d9cebe)',
                  background: 'var(--paz-input-bg, #faf8f5)',
                  fontSize: '0.92rem',
                  color: 'var(--paz-ink, #2b2927)',
                }}
              />
            </div>

            <div>
              <label
                htmlFor={`${uid}-email`}
                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--paz-ink-soft, #4a463a)', marginBottom: '0.25rem' }}
              >
                Correo electrónico (para tu acceso) *
              </label>
              <input
                id={`${uid}-email`}
                type="email"
                required
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.68rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--paz-input-border, #d9cebe)',
                  background: 'var(--paz-input-bg, #faf8f5)',
                  fontSize: '0.92rem',
                  color: 'var(--paz-ink, #2b2927)',
                }}
              />
            </div>

            <div>
              <label
                htmlFor={`${uid}-phone`}
                style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--paz-ink-soft, #4a463a)', marginBottom: '0.25rem' }}
              >
                WhatsApp / Teléfono
              </label>
              <input
                id={`${uid}-phone`}
                type="tel"
                placeholder="+593 99 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.68rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--paz-input-border, #d9cebe)',
                  background: 'var(--paz-input-bg, #faf8f5)',
                  fontSize: '0.92rem',
                  color: 'var(--paz-ink, #2b2927)',
                }}
              />
            </div>
          </div>

          {status === 'error' && (
            <div className="paz-alert paz-alert--error" style={{ marginBottom: '0.75rem', fontSize: '0.84rem' }}>
              <WisdomIcon name="shield" size={15} /> {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="paz-btn paz-btn--primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.9rem 1rem',
              fontSize: '1rem',
              fontWeight: 800,
              boxShadow: '0 12px 28px rgba(179, 106, 80, 0.32)',
            }}
          >
            <WisdomIcon name={status === 'sending' ? 'refresh' : 'credit-card'} size={17} />
            {status === 'sending'
              ? 'Preparando PayPhone…'
              : `Pagar con PayPhone · ${formatPazUsd(amountCents)}`}
          </button>

          <p style={{ margin: '0.65rem 0 0', fontSize: '0.75rem', color: 'var(--paz-muted, #66615b)', textAlign: 'center', lineHeight: 1.4 }}>
            Visa, Mastercard, Diners, Discover o saldo PayPhone · Activación automática tras confirmar el pago.
          </p>
        </form>
      )}

      {/* Enlace rápido a transferencia bancaria */}
      <div
        style={{
          marginTop: '0.95rem',
          paddingTop: '0.85rem',
          borderTop: '1px dashed var(--paz-card-border, #e4dacb)',
          textAlign: 'center',
        }}
      >
        <a
          href="#transferencia-bancaria"
          onClick={(e) => {
            if (onSwitchToTransfer) {
              e.preventDefault();
              onSwitchToTransfer();
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.84rem',
            fontWeight: 700,
            color: 'var(--paz-ink-soft, #5c5847)',
            textDecoration: 'underline',
          }}
        >
          ¿Prefieres pagar mediante transferencia bancaria? →
        </a>
      </div>
    </aside>
  );
}
