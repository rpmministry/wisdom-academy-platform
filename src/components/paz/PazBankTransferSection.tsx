'use client';

import React, { useId, useMemo, useState } from 'react';
import { errorMessage } from '@/lib/api/client';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PAZ_PRICING, type PazPhase } from '@/lib/paz-en-la-mesa/content';
import { buildOfficialWhatsappChatUrl, formatPazUsd } from '@/lib/paz-en-la-mesa/config';
import type { PazBankInfo } from '@/components/paz/PazUnifiedEnrollment';

export interface PazBankTransferSectionProps {
  bank: PazBankInfo;
  phase: PazPhase;
  initialPlan?: 'presale' | 'official' | 'scholarship';
}

interface TransferResponse {
  pago: {
    id: string;
    reference: string;
    plan: 'presale' | 'official' | 'scholarship';
    amountCents: number;
    status: string;
    buyerName: string;
    buyerEmail: string;
    hasReceipt?: boolean;
  };
}

export function PazBankTransferSection({
  bank,
  phase,
  initialPlan,
}: PazBankTransferSectionProps) {
  const uid = useId();
  const defaultPlan: 'presale' | 'official' | 'scholarship' =
    initialPlan || (phase === 'official' || phase === 'closed' ? 'official' : 'presale');

  const [plan, setPlan] = useState<'presale' | 'official' | 'scholarship'>(defaultPlan);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<TransferResponse | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const amountCents = useMemo(() => {
    if (plan === 'scholarship') return PAZ_PRICING.scholarshipCents;
    if (plan === 'official') return PAZ_PRICING.officialCents;
    return PAZ_PRICING.presaleCents;
  }, [plan]);

  const copyAccountNumber = async () => {
    await navigator.clipboard.writeText(bank.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const copyAllBankDetails = async () => {
    const text = [
      `Banco: ${bank.bankName}`,
      `Tipo de cuenta: ${bank.accountType}`,
      `Número de cuenta: ${bank.accountNumber}`,
      `Titular: ${bank.accountHolder}`,
      `RUC: ${bank.ruc}`,
      `Correo electrónico: ${bank.email}`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      setStatus('error');
      setErrorMsg('Por favor ingresa tus nombres y apellidos.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus('error');
      setErrorMsg('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 7) {
      setStatus('error');
      setErrorMsg('Por favor ingresa tu número de teléfono o WhatsApp.');
      return;
    }
    if (!transferRef.trim() && !receiptFile) {
      setStatus('error');
      setErrorMsg('Ingresa el número de referencia de la transferencia o adjunta el comprobante.');
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('plan', plan);
      formData.append('method', 'bank_transfer');
      formData.append('buyerName', fullName.trim());
      formData.append('buyerEmail', email.trim().toLowerCase());
      formData.append('buyerPhone', phone.trim());
      if (transferRef.trim()) formData.append('transferReference', transferRef.trim());
      formData.append('consent', 'true');
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      const res = await fetch('/api/paz/payments', {
        method: 'POST',
        body: formData,
        credentials: 'same-origin',
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: { message?: string };
        pago?: TransferResponse['pago'];
      };

      if (!res.ok || !json.ok || !json.pago) {
        throw new Error(json.error?.message || 'No se pudo registrar la transferencia.');
      }

      setResult({ pago: json.pago });
      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMsg(errorMessage(err));
    }
  };

  return (
    <section
      className="paz-section paz-section--paper"
      id="transferencia-bancaria"
      aria-labelledby="paz-transfer-title"
    >
      <div className="paz-container">
        <div className="paz-section-head">
          <span className="paz-kicker">
            <WisdomIcon name="receipt" size={13} /> Segunda opción de pago · 0% comisión
          </span>
          <h2 className="paz-h2" id="paz-transfer-title">
            ¿Prefieres pagar mediante <em>transferencia bancaria?</em>
          </h2>
          <p className="paz-lead">
            Realiza tu transferencia a la cuenta oficial de <strong>{bank.accountHolder}</strong>, copia los datos con un clic y registra tu comprobante para activar tu acceso.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            alignItems: 'start',
          }}
        >
          {/* TARJETA DE DATOS BANCARIOS */}
          <article
            style={{
              background: 'var(--paz-card-bg, #ffffff)',
              color: 'var(--paz-ink, #2b2927)',
              borderRadius: '22px',
              border: '1px solid var(--paz-card-border, #e4dacb)',
              padding: 'clamp(1.25rem, 3vw, 1.85rem)',
              boxShadow: '0 14px 36px rgba(43, 41, 39, 0.06)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontFamily: 'var(--paz-serif)', fontSize: '1.25rem', color: 'var(--paz-ink, #2b2927)' }}>
                Datos bancarios oficiales
              </h3>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '999px',
                  background: '#eef6ee',
                  color: '#17603a',
                }}
              >
                0% comisión
              </span>
            </div>

            <dl style={{ display: 'grid', gap: '0.75rem', margin: '0 0 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', paddingBottom: '0.55rem', borderBottom: '1px solid var(--paz-card-border, #f2ede4)' }}>
                <dt style={{ color: 'var(--paz-muted, #66615b)', fontSize: '0.88rem' }}>Banco</dt>
                <dd style={{ margin: 0, fontWeight: 700, color: 'var(--paz-ink, #2b2927)', textAlign: 'right' }}>{bank.bankName}</dd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', paddingBottom: '0.55rem', borderBottom: '1px solid var(--paz-card-border, #f2ede4)' }}>
                <dt style={{ color: 'var(--paz-muted, #66615b)', fontSize: '0.88rem' }}>Tipo de cuenta</dt>
                <dd style={{ margin: 0, fontWeight: 700, color: 'var(--paz-ink, #2b2927)', textAlign: 'right' }}>{bank.accountType}</dd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.55rem', borderBottom: '1px solid var(--paz-card-border, #f2ede4)' }}>
                <dt style={{ color: 'var(--paz-muted, #66615b)', fontSize: '0.88rem' }}>Número de cuenta</dt>
                <dd style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <strong style={{ fontFamily: 'monospace', fontSize: '1.05rem', color: 'var(--paz-accent-text, #8f4e38)' }}>
                    {bank.accountNumber}
                  </strong>
                  <button
                    type="button"
                    onClick={copyAccountNumber}
                    className="paz-btn paz-btn--ghost paz-btn--small"
                    style={{ padding: '0.28rem 0.6rem', fontSize: '0.76rem' }}
                  >
                    {copiedAccount ? 'Copiado ✓' : 'Copiar'}
                  </button>
                </dd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', paddingBottom: '0.55rem', borderBottom: '1px solid var(--paz-card-border, #f2ede4)' }}>
                <dt style={{ color: 'var(--paz-muted, #66615b)', fontSize: '0.88rem' }}>Titular</dt>
                <dd style={{ margin: 0, fontWeight: 700, color: 'var(--paz-ink, #2b2927)', textAlign: 'right' }}>{bank.accountHolder}</dd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', paddingBottom: '0.55rem', borderBottom: '1px solid var(--paz-card-border, #f2ede4)' }}>
                <dt style={{ color: 'var(--paz-muted, #66615b)', fontSize: '0.88rem' }}>RUC</dt>
                <dd style={{ margin: 0, fontFamily: 'monospace', fontWeight: 700, color: 'var(--paz-ink, #2b2927)', textAlign: 'right' }}>{bank.ruc}</dd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                <dt style={{ color: 'var(--paz-muted, #66615b)', fontSize: '0.88rem' }}>Correo electrónico</dt>
                <dd style={{ margin: 0, fontWeight: 600, color: 'var(--paz-ink, #2b2927)', textAlign: 'right', wordBreak: 'break-all' }}>{bank.email}</dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={copyAllBankDetails}
              className="paz-btn paz-btn--olive"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <WisdomIcon name="file-text" size={16} />
              {copiedAll ? 'Todos los datos copiados ✓' : 'Copiar todos los datos bancarios'}
            </button>
          </article>

          {/* FORMULARIO BREVE DE TRANSFERENCIA */}
          <article
            style={{
              background: 'var(--paz-card-bg, #ffffff)',
              color: 'var(--paz-ink, #2b2927)',
              borderRadius: '22px',
              border: '1px solid var(--paz-card-border, #e4dacb)',
              padding: 'clamp(1.25rem, 3vw, 1.85rem)',
              boxShadow: '0 14px 36px rgba(43, 41, 39, 0.06)',
            }}
          >
            {status === 'success' && result ? (
              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <div
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: '#fff3e0',
                    color: '#b45309',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 0.9rem',
                  }}
                >
                  <WisdomIcon name="clock" size={26} />
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    background: '#fff3e0',
                    color: '#b45309',
                    fontSize: '0.76rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    marginBottom: '0.6rem',
                  }}
                >
                  Pendiente de verificación
                </span>
                <h3 style={{ margin: '0 0 0.5rem', fontFamily: 'var(--paz-serif)', fontSize: '1.35rem', color: 'var(--paz-ink, #2b2927)' }}>
                  Inscripción registrada correctamente
                </h3>
                <p style={{ margin: '0 0 1rem', fontSize: '0.92rem', color: 'var(--paz-ink-soft, #4a463a)', lineHeight: 1.55 }}>
                  Tu inscripción quedó registrada con la referencia{' '}
                  <strong style={{ fontFamily: 'monospace', color: 'var(--paz-accent-text, #8f4e38)' }}>{result.pago.reference}</strong> y tu pago está{' '}
                  <strong>pendiente de verificación</strong> por nuestro equipo administrativo. Una vez confirmado el ingreso, recibirás tu código de acceso único.
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', justifyContent: 'center' }}>
                  <a
                    href={buildOfficialWhatsappChatUrl(
                      `Hola Wisdom Academy, registré mi transferencia bancaria con referencia ${result.pago.reference} (${result.pago.buyerName} · ${formatPazUsd(result.pago.amountCents)}).`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="paz-btn paz-btn--olive paz-btn--small"
                  >
                    <WisdomIcon name="users" size={15} /> Avisar por WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setStatus('idle');
                      setResult(null);
                      setTransferRef('');
                      setReceiptFile(null);
                    }}
                    className="paz-btn paz-btn--ghost paz-btn--small"
                  >
                    Registrar otra transferencia
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <h3 style={{ margin: '0 0 0.25rem', fontFamily: 'var(--paz-serif)', fontSize: '1.25rem', color: 'var(--paz-ink, #2b2927)' }}>
                  Registra tu transferencia
                </h3>
                <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--paz-muted, #66615b)' }}>
                  Completa estos datos y adjunta tu comprobante para que nuestro equipo verifique tu pago.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.4rem', marginBottom: '0.9rem' }}>
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
                          padding: '0.45rem 0.35rem',
                          borderRadius: '10px',
                          border: active ? '2px solid #5c5847' : '1px solid var(--paz-card-border, #e4dacb)',
                          background: active ? 'rgba(197, 160, 89, 0.16)' : 'var(--paz-card-alt, #faf8f5)',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                      >
                        <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--paz-ink, #2b2927)' }}>
                          {opt.label}
                        </span>
                        <strong style={{ fontSize: '0.86rem', color: 'var(--paz-ink-soft, #5c5847)' }}>
                          {formatPazUsd(opt.price)}
                        </strong>
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label htmlFor={`${uid}-name`} style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--paz-ink-soft, #4a463a)', marginBottom: '0.25rem' }}>
                      Nombres y apellidos *
                    </label>
                    <input
                      id={`${uid}-name`}
                      type="text"
                      required
                      placeholder="Ej. Carlos Andrés Mena"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={{ width: '100%', padding: '0.68rem 0.85rem', borderRadius: '10px', border: '1px solid var(--paz-input-border, #d9cebe)', background: 'var(--paz-input-bg, #faf8f5)', color: 'var(--paz-ink, #2b2927)', fontSize: '0.92rem' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem' }}>
                    <div>
                      <label htmlFor={`${uid}-email`} style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--paz-ink-soft, #4a463a)', marginBottom: '0.25rem' }}>
                        Correo electrónico *
                      </label>
                      <input
                        id={`${uid}-email`}
                        type="email"
                        required
                        placeholder="tu@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: '100%', padding: '0.68rem 0.85rem', borderRadius: '10px', border: '1px solid var(--paz-input-border, #d9cebe)', background: 'var(--paz-input-bg, #faf8f5)', color: 'var(--paz-ink, #2b2927)', fontSize: '0.92rem' }}
                      />
                    </div>
                    <div>
                      <label htmlFor={`${uid}-phone`} style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--paz-ink-soft, #4a463a)', marginBottom: '0.25rem' }}>
                        Teléfono o WhatsApp *
                      </label>
                      <input
                        id={`${uid}-phone`}
                        type="tel"
                        required
                        placeholder="+593 99 000 0000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={{ width: '100%', padding: '0.68rem 0.85rem', borderRadius: '10px', border: '1px solid var(--paz-input-border, #d9cebe)', background: 'var(--paz-input-bg, #faf8f5)', color: 'var(--paz-ink, #2b2927)', fontSize: '0.92rem' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`${uid}-ref`} style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--paz-ink-soft, #4a463a)', marginBottom: '0.25rem' }}>
                      Número de comprobante o referencia *
                    </label>
                    <input
                      id={`${uid}-ref`}
                      type="text"
                      placeholder="Ej. 84739201 · Banco Pichincha"
                      value={transferRef}
                      onChange={(e) => setTransferRef(e.target.value)}
                      style={{ width: '100%', padding: '0.68rem 0.85rem', borderRadius: '10px', border: '1px solid var(--paz-input-border, #d9cebe)', background: 'var(--paz-input-bg, #faf8f5)', color: 'var(--paz-ink, #2b2927)', fontSize: '0.92rem' }}
                    />
                  </div>

                  <div>
                    <label htmlFor={`${uid}-file`} style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--paz-ink-soft, #4a463a)', marginBottom: '0.25rem' }}>
                      Adjuntar comprobante (JPG, PNG, WEBP o PDF · máx. 5 MB)
                    </label>
                    <input
                      id={`${uid}-file`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: '10px',
                        border: '1px dashed #c5a059',
                        background: 'var(--paz-input-bg, #faf8f5)',
                        color: 'var(--paz-ink, #2b2927)',
                        fontSize: '0.85rem',
                      }}
                    />
                  </div>
                </div>

                {status === 'error' && (
                  <div className="paz-alert paz-alert--error" style={{ marginBottom: '0.85rem', fontSize: '0.84rem' }}>
                    <WisdomIcon name="shield" size={15} /> {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="paz-btn paz-btn--primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.9rem 1rem', fontWeight: 800 }}
                >
                  <WisdomIcon name={status === 'sending' ? 'refresh' : 'check'} size={17} />
                  {status === 'sending'
                    ? 'Registrando transferencia…'
                    : `Registrar transferencia · ${formatPazUsd(amountCents)}`}
                </button>
              </form>
            )}
          </article>
        </div>
      </div>
    </section>
  );
}
