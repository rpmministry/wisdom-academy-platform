'use client';

import React, { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import {
  PAZ_BRAND,
  PAZ_PRICING,
  type PazPhase,
  type PazPlan,
} from '@/lib/paz-en-la-mesa/content';
import {
  buildOfficialWhatsappChatUrl,
  formatPazUsd,
  pazPublicConfig,
} from '@/lib/paz-en-la-mesa/config';
import { PayPhoneBox } from '@/components/paz/PayPhoneBox';

export interface PazBankInfo {
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

export interface PazUnifiedEnrollmentProps {
  initialPlan?: 'presale' | 'official' | 'scholarship';
  initialMethod?: 'bank_transfer' | 'payphone';
  phase?: PazPhase;
  bank?: PazBankInfo;
  userEmail?: string;
  userName?: string;
  id?: string;
  className?: string;
}

interface PaymentIntentResponse {
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
    banco?: PazBankInfo;
    payphoneUrl?: string | null;
    payphoneToken?: string | null;
    payphoneStoreId?: string | null;
    mensaje?: string;
  };
}

const DEFAULT_BANK: PazBankInfo = {
  beneficiary: 'Fundación Casa Main',
  ruc: '1793193764001',
  bankName: 'Banco Pichincha',
  accountType: 'Cuenta corriente',
  accountNumber: '2100264280',
  accountHolder: 'Fundación Casa Main',
  email: 'fundacioncasamain@gmail.com',
  referenceHint: 'Escribe tu nombre y el código de inscripción en el comprobante.',
  configured: true,
};

export function PazUnifiedEnrollment({
  initialPlan = 'presale',
  initialMethod = 'bank_transfer',
  phase = 'presale',
  bank = DEFAULT_BANK,
  userEmail = '',
  userName = '',
  id = 'inscripcion-proceso',
  className = '',
}: PazUnifiedEnrollmentProps) {
  const formUid = useId();
  const [plan, setPlan] = useState<'presale' | 'official' | 'scholarship'>(initialPlan);
  const [method, setMethod] = useState<'bank_transfer' | 'payphone'>(initialMethod);
  const [fullName, setFullName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [transferRef, setTransferRef] = useState('');
  const [consent, setConsent] = useState(true);

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [response, setResponse] = useState<PaymentIntentResponse | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const amountCents = useMemo(() => {
    if (plan === 'scholarship') return PAZ_PRICING.scholarshipCents;
    if (plan === 'official') return PAZ_PRICING.officialCents;
    return PAZ_PRICING.presaleCents;
  }, [plan]);

  const planTitle = useMemo(() => {
    if (plan === 'scholarship') return PAZ_PRICING.scholarshipLabel;
    if (plan === 'official') return PAZ_PRICING.officialLabel;
    return PAZ_PRICING.presaleLabel;
  }, [plan]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consent) {
      setStatus('error');
      setErrorMsg('Debes autorizar a Wisdom Academy para procesar tu registro y contactarte sobre el taller.');
      return;
    }
    if (!fullName.trim() || fullName.trim().length < 2) {
      setStatus('error');
      setErrorMsg('Por favor ingresa tu nombre y apellido completo.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setStatus('error');
      setErrorMsg('Por favor ingresa un correo electrónico válido.');
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await apiFetch<PaymentIntentResponse>('/api/paz/payments', {
        method: 'POST',
        body: {
          plan,
          method,
          buyerName: fullName.trim(),
          buyerEmail: email.trim().toLowerCase(),
          buyerPhone: phone.trim() || undefined,
          city: city.trim() || undefined,
          transferReference: method === 'bank_transfer' && transferRef.trim() ? transferRef.trim() : undefined,
          consent,
        },
      });
      setResponse(res);
      setStatus('success');
      setTimeout(() => {
        const el =
          document.getElementById('payphone-payment-box-container') ||
          document.getElementById('paz-enrollment-response-card') ||
          document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (err) {
      setStatus('error');
      setErrorMsg(errorMessage(err));
    }
  };

  const copyReference = () => {
    if (!response?.pago?.reference) return;
    navigator.clipboard.writeText(response.pago.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  // PANTALLA INTEGRADA DE ÉXITO Y CONFIRMACIÓN
  if (status === 'success' && response) {
    const { pago, instrucciones } = response;
    const isTransfer = pago.method === 'bank_transfer';
    const bankDetails = instrucciones.banco || bank;
    const payphoneLink = pago.paymentUrl || pazPublicConfig.payphoneUrl;

    const whatsappNotifyUrl = buildOfficialWhatsappChatUrl(
      `Hola Wisdom Academy, acabo de registrar mi inscripción al taller Paz en la mesa.\n- Nombre: ${pago.buyerName}\n- Código: ${pago.reference}\n- Modalidad: ${planTitle} (${formatPazUsd(pago.amountCents)})\n- Método: ${isTransfer ? 'Transferencia bancaria' : 'PayPhone'}`
    );

    const whatsappGroupUrl =
      pazPublicConfig.whatsappGroupUrl ||
      buildOfficialWhatsappChatUrl(
        `Hola Wisdom Academy, ya completé mi inscripción al taller Paz en la mesa con el código ${pago.reference}. Por favor envíenme el enlace para unirme al grupo oficial de WhatsApp.`
      );

    return (
      <div
        className={`paz-unified-success ${className}`.trim()}
        id={id}
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '2px solid #5c5847',
          padding: 'clamp(1.5rem, 4vw, 2.75rem)',
          boxShadow: '0 20px 60px rgba(43,41,39,0.12)',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 2rem auto' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#e9f2e8',
              color: '#3d6139',
              marginBottom: '1rem',
            }}
          >
            <WisdomIcon name="check" size={28} />
          </span>
          <h3
            style={{
              fontFamily: 'var(--paz-serif)',
              fontSize: 'clamp(1.5rem, 3.5vw, 2rem)',
              margin: '0 0 0.5rem 0',
              color: '#2b2927',
            }}
          >
            ¡Tu lugar ha sido reservado!
          </h3>
          <p style={{ fontSize: '1rem', color: '#5c5847', margin: 0, lineHeight: 1.5 }}>
            Bienvenido a <strong>Paz en la mesa, orden en el bolsillo y fuego en el corazón</strong>. Hemos registrado tus datos con éxito.
          </p>
        </div>

        {/* Tarjeta de Código de Referencia */}
        <div
          style={{
            background: '#faf8f5',
            border: '1px solid #e4dacb',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.75rem',
          }}
        >
          <div>
            <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a7256', fontWeight: 700 }}>
              Código Oficial de Inscripción
            </span>
            <div style={{ fontFamily: 'var(--paz-serif)', fontSize: '1.45rem', fontWeight: 700, color: '#8f4e38' }}>
              {pago.reference}
            </div>
            <small style={{ color: '#66615b' }}>Registrado a nombre de: {pago.buyerName} ({pago.buyerEmail})</small>
          </div>
          <button
            type="button"
            onClick={copyReference}
            className="paz-btn paz-btn--ghost paz-btn--small"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <WisdomIcon name={copiedRef ? 'check' : 'file-text'} size={15} />
            {copiedRef ? '¡Código copiado!' : 'Copiar código'}
          </button>
        </div>

        {/* Instrucciones según método */}
        {isTransfer ? (
          <div
            style={{
              background: '#fcfbfa',
              border: '1px solid #e4dacb',
              borderRadius: '16px',
              padding: '1.5rem',
              marginBottom: '1.75rem',
            }}
          >
            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '1.05rem', color: '#2b2927' }}>
              <WisdomIcon name="receipt" size={17} /> Datos para tu transferencia o depósito bancario
            </h4>
            <p style={{ fontSize: '0.9rem', color: '#5c5847', margin: '0 0 1rem 0' }}>
              Realiza la transferencia por <strong>{formatPazUsd(pago.amountCents)}</strong> a la cuenta oficial de la Fundación Casa Main:
            </p>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.75rem',
                margin: '0 0 1rem 0',
                fontSize: '0.88rem',
              }}
            >
              <div>
                <dt style={{ color: '#7a7256', fontWeight: 600 }}>Beneficiario:</dt>
                <dd style={{ margin: 0, fontWeight: 700, color: '#2b2927' }}>{bankDetails.beneficiary}</dd>
              </div>
              <div>
                <dt style={{ color: '#7a7256', fontWeight: 600 }}>RUC:</dt>
                <dd style={{ margin: 0, fontWeight: 700, color: '#2b2927' }}>{bankDetails.ruc}</dd>
              </div>
              <div>
                <dt style={{ color: '#7a7256', fontWeight: 600 }}>Banco:</dt>
                <dd style={{ margin: 0, fontWeight: 700, color: '#2b2927' }}>{bankDetails.bankName}</dd>
              </div>
              <div>
                <dt style={{ color: '#7a7256', fontWeight: 600 }}>Tipo de cuenta:</dt>
                <dd style={{ margin: 0, fontWeight: 700, color: '#2b2927' }}>{bankDetails.accountType}</dd>
              </div>
              <div>
                <dt style={{ color: '#7a7256', fontWeight: 600 }}>Número de cuenta:</dt>
                <dd style={{ margin: 0, fontWeight: 700, color: '#2b2927' }}>{bankDetails.accountNumber}</dd>
              </div>
              <div>
                <dt style={{ color: '#7a7256', fontWeight: 600 }}>Concepto / Referencia:</dt>
                <dd style={{ margin: 0, fontWeight: 700, color: '#8f4e38' }}>{pago.reference}</dd>
              </div>
            </dl>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
              <a
                href={whatsappNotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="paz-btn paz-btn--olive"
                style={{ flex: 1, minWidth: '240px' }}
              >
                <WisdomIcon name="users" size={16} /> Enviar comprobante por WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <PayPhoneBox
            token={instrucciones?.payphoneToken}
            storeId={instrucciones?.payphoneStoreId}
            amountCents={pago.amountCents}
            clientTransactionId={pago.reference}
            email={pago.buyerEmail || email}
            buyerName={pago.buyerName || fullName}
            phoneNumber={phone}
            referenceText={`Inscripción Taller Paz en la mesa - ${pago.reference}`}
            fallbackPayphoneUrl={payphoneLink}
          />
        )}

        {/* ACCESO AL GRUPO OFICIAL DE WHATSAPP */}
        <div
          style={{
            background: 'linear-gradient(135deg, #5c5847 0%, #4a463a 100%)',
            color: '#faf8f5',
            borderRadius: '18px',
            padding: '1.75rem',
            marginBottom: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'rgba(197,160,89,0.25)',
                color: '#f3e2bd',
                flexShrink: 0,
              }}
            >
              <WisdomIcon name="users" size={22} />
            </span>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.15rem', color: '#ffffff' }}>
                Grupo Oficial de WhatsApp del Taller
              </h4>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.92rem', color: 'rgba(250,248,245,0.85)', lineHeight: 1.5 }}>
                {pazPublicConfig.whatsappGroupUrl
                  ? 'Ingresa ahora a la comunidad privada del taller para recibir recordatorios, materiales y enlaces a los En Vivos.'
                  : 'El enlace directo al grupo privado se activará próximamente y te llegará a tu WhatsApp. También puedes contactar al número oficial (+593 99 875 5759) para solicitar tu ingreso inmediato.'}
              </p>
              <a
                href={whatsappGroupUrl}
                target="_blank"
                rel="noreferrer"
                className="paz-btn paz-btn--gold"
                style={{ display: 'inline-flex', padding: '0.75rem 1.5rem', fontWeight: 700 }}
              >
                <WisdomIcon name="users" size={17} />
                {pazPublicConfig.whatsappGroupUrl
                  ? 'Entrar al Grupo de WhatsApp'
                  : 'Contactar al WhatsApp (+593 99 875 5759)'}
              </a>
            </div>
          </div>
        </div>

        {/* Siguientes pasos */}
        <div
          style={{
            borderTop: '1px solid #e4dacb',
            paddingTop: '1.25rem',
            fontSize: '0.88rem',
            color: '#66615b',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <strong>Próximos pasos para disfrutar tu taller:</strong>
          <span>1. Guarda tu código de inscripción (<strong>{pago.reference}</strong>) para cualquier consulta o soporte.</span>
          <span>2. Las cuatro clases y el Cuaderno de Trabajo se liberan el <strong>8 de diciembre de 2026</strong>.</span>
          <span>3. La sesión exclusiva para alumnos será el <strong>martes 22 de diciembre a las 20:00</strong> y el Reto de 7 días se llevará a cabo del 23 al 30 de diciembre.</span>
          <div style={{ marginTop: '0.75rem' }}>
            <button
              type="button"
              onClick={() => {
                setStatus('idle');
                setResponse(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#8f4e38',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Registrar otra inscripción o becar a otro hogar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FORMULARIO PRINCIPAL DE INSCRIPCIÓN Y CHECKOUT UNIFICADO
  return (
    <div
      className={`paz-unified-checkout ${className}`.trim()}
      id={id}
      style={{
        background: '#ffffff',
        borderRadius: '24px',
        border: '1px solid #e4dacb',
        boxShadow: '0 20px 60px rgba(43,41,39,0.08)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #b36a50 0%, #8f4e38 100%)',
          color: '#faf8f5',
          padding: 'clamp(1.5rem, 3.5vw, 2.25rem)',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '0.09em',
            color: '#f3e2bd',
            fontWeight: 700,
            marginBottom: '0.4rem',
          }}
        >
          <WisdomIcon name="sparkles" size={13} /> Inscripción en un solo paso
        </span>
        <h3
          style={{
            fontFamily: 'var(--paz-serif)',
            fontSize: 'clamp(1.4rem, 3.2vw, 1.9rem)',
            margin: '0 0 0.5rem 0',
            lineHeight: 1.25,
          }}
        >
          Reserva tu lugar en el taller
        </h3>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(250,248,245,0.85)', lineHeight: 1.45 }}>
          Un solo acceso por hogar. Completa tus datos, selecciona tu forma de pago y accede a la comunidad oficial.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: 'clamp(1.5rem, 3.5vw, 2.25rem)' }}>
        {/* PASO 1: MODALIDAD DE PARTICIPACIÓN */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#2b2927',
              marginBottom: '0.75rem',
            }}
          >
            1. Selecciona tu modalidad de participación
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {/* Preventa */}
            <label
              style={{
                display: 'block',
                position: 'relative',
                padding: '1rem',
                borderRadius: '16px',
                border: plan === 'presale' ? '2px solid #b36a50' : '1px solid #e4dacb',
                background: plan === 'presale' ? '#fbf6f3' : '#faf8f5',
                cursor: 'pointer',
                transition: 'all 160ms ease',
              }}
            >
              <input
                type="radio"
                name={`plan-${formUid}`}
                value="presale"
                checked={plan === 'presale'}
                onChange={() => setPlan('presale')}
                style={{ position: 'absolute', top: '1rem', right: '1rem' }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8f4e38', textTransform: 'uppercase' }}>
                Del 3 al 8 de dic
              </span>
              <strong style={{ display: 'block', fontSize: '1.05rem', color: '#2b2927', margin: '0.2rem 0' }}>
                {PAZ_PRICING.presaleLabel}
              </strong>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#8f4e38', fontFamily: 'var(--paz-serif)' }}>
                {formatPazUsd(PAZ_PRICING.presaleCents)}
                <small style={{ fontSize: '0.75rem', fontWeight: 500, color: '#66615b', marginLeft: '0.25rem' }}>
                  / hogar
                </small>
              </div>
              <small style={{ display: 'block', fontSize: '0.76rem', color: '#66615b', marginTop: '0.35rem' }}>
                Acceso completo familiar para todo el hogar.
              </small>
            </label>

            {/* Precio oficial */}
            <label
              style={{
                display: 'block',
                position: 'relative',
                padding: '1rem',
                borderRadius: '16px',
                border: plan === 'official' ? '2px solid #5c5847' : '1px solid #e4dacb',
                background: plan === 'official' ? '#f5f4ef' : '#faf8f5',
                cursor: 'pointer',
                transition: 'all 160ms ease',
              }}
            >
              <input
                type="radio"
                name={`plan-${formUid}`}
                value="official"
                checked={plan === 'official'}
                onChange={() => setPlan('official')}
                style={{ position: 'absolute', top: '1rem', right: '1rem' }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5c5847', textTransform: 'uppercase' }}>
                Del 9 al 20 de dic
              </span>
              <strong style={{ display: 'block', fontSize: '1.05rem', color: '#2b2927', margin: '0.2rem 0' }}>
                {PAZ_PRICING.officialLabel}
              </strong>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#5c5847', fontFamily: 'var(--paz-serif)' }}>
                {formatPazUsd(PAZ_PRICING.officialCents)}
                <small style={{ fontSize: '0.75rem', fontWeight: 500, color: '#66615b', marginLeft: '0.25rem' }}>
                  / hogar
                </small>
              </div>
              <small style={{ display: 'block', fontSize: '0.76rem', color: '#66615b', marginTop: '0.35rem' }}>
                Precio regular de cohorte de fin de año.
              </small>
            </label>

            {/* Beca un Hogar */}
            <label
              style={{
                display: 'block',
                position: 'relative',
                padding: '1rem',
                borderRadius: '16px',
                border: plan === 'scholarship' ? '2px solid #c5a059' : '1px solid #e4dacb',
                background: plan === 'scholarship' ? '#fbf8f0' : '#faf8f5',
                cursor: 'pointer',
                transition: 'all 160ms ease',
              }}
            >
              <input
                type="radio"
                name={`plan-${formUid}`}
                value="scholarship"
                checked={plan === 'scholarship'}
                onChange={() => setPlan('scholarship')}
                style={{ position: 'absolute', top: '1rem', right: '1rem' }}
              />
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8f6820', textTransform: 'uppercase' }}>
                Aporte Solidario
              </span>
              <strong style={{ display: 'block', fontSize: '1.05rem', color: '#2b2927', margin: '0.2rem 0' }}>
                {PAZ_PRICING.scholarshipLabel}
              </strong>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#8f6820', fontFamily: 'var(--paz-serif)' }}>
                {formatPazUsd(PAZ_PRICING.scholarshipCents)}
                <small style={{ fontSize: '0.75rem', fontWeight: 500, color: '#66615b', marginLeft: '0.25rem' }}>
                  / matrimonio
                </small>
              </div>
              <small style={{ display: 'block', fontSize: '0.76rem', color: '#66615b', marginTop: '0.35rem' }}>
                Aporte para un hogar vulnerable de Fundación Casa Main.
              </small>
            </label>
          </div>
        </div>

        {/* PASO 2: DATOS DEL ESTUDIANTE / COMPRADOR */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#2b2927',
              marginBottom: '0.75rem',
            }}
          >
            2. Datos personales y de contacto
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1rem',
            }}
          >
            <div>
              <label
                htmlFor={`name-${formUid}`}
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a463a', marginBottom: '0.3rem' }}
              >
                Nombre y apellido *
              </label>
              <input
                id={`name-${formUid}`}
                type="text"
                required
                maxLength={160}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Carlos y Mariana Gómez"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '12px',
                  border: '1px solid #d9cebe',
                  background: '#faf8f5',
                  fontSize: '0.95rem',
                  color: '#2b2927',
                }}
              />
            </div>

            <div>
              <label
                htmlFor={`email-${formUid}`}
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a463a', marginBottom: '0.3rem' }}
              >
                Correo electrónico *
              </label>
              <input
                id={`email-${formUid}`}
                type="email"
                required
                maxLength={200}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '12px',
                  border: '1px solid #d9cebe',
                  background: '#faf8f5',
                  fontSize: '0.95rem',
                  color: '#2b2927',
                }}
              />
            </div>

            <div>
              <label
                htmlFor={`phone-${formUid}`}
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a463a', marginBottom: '0.3rem' }}
              >
                WhatsApp * (formato internacional)
              </label>
              <input
                id={`phone-${formUid}`}
                type="tel"
                required
                maxLength={40}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+593 9..."
                style={{
                  width: '100%',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '12px',
                  border: '1px solid #d9cebe',
                  background: '#faf8f5',
                  fontSize: '0.95rem',
                  color: '#2b2927',
                }}
              />
              <small style={{ fontSize: '0.74rem', color: '#7a7256' }}>
                Número para enviarte tu confirmación y el acceso al grupo.
              </small>
            </div>

            <div>
              <label
                htmlFor={`city-${formUid}`}
                style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#4a463a', marginBottom: '0.3rem' }}
              >
                Ciudad y País (opcional)
              </label>
              <input
                id={`city-${formUid}`}
                type="text"
                maxLength={120}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej. Quito, Ecuador"
                style={{
                  width: '100%',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '12px',
                  border: '1px solid #d9cebe',
                  background: '#faf8f5',
                  fontSize: '0.95rem',
                  color: '#2b2927',
                }}
              />
            </div>
          </div>
        </div>

        {/* PASO 3: FORMA DE PAGO */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.9rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#2b2927',
              marginBottom: '0.75rem',
            }}
          >
            3. Selecciona tu método de pago
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '16px',
                border: method === 'bank_transfer' ? '2px solid #5c5847' : '1px solid #e4dacb',
                background: method === 'bank_transfer' ? '#f5f4ef' : '#faf8f5',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name={`method-${formUid}`}
                value="bank_transfer"
                checked={method === 'bank_transfer'}
                onChange={() => setMethod('bank_transfer')}
                style={{ marginTop: '0.25rem' }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem', color: '#2b2927' }}>
                  Transferencia o depósito bancario
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#3d6139', fontWeight: 600 }}>
                  0% comisión adicional
                </span>
                <p style={{ fontSize: '0.78rem', color: '#66615b', margin: '0.25rem 0 0 0' }}>
                  A la cuenta de Fundación Casa Main en Ecuador. Genera tu código y envía el comprobante por WhatsApp.
                </p>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '16px',
                border: method === 'payphone' ? '2px solid #b36a50' : '1px solid #e4dacb',
                background: method === 'payphone' ? '#fbf6f3' : '#faf8f5',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name={`method-${formUid}`}
                value="payphone"
                checked={method === 'payphone'}
                onChange={() => setMethod('payphone')}
                style={{ marginTop: '0.25rem' }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.95rem', color: '#2b2927' }}>
                  Tarjeta de crédito / débito (PayPhone)
                </strong>
                <span style={{ fontSize: '0.8rem', color: '#7a7256', fontWeight: 600 }}>
                  Visa, Mastercard, Diners, Discover
                </span>
                <p style={{ fontSize: '0.78rem', color: '#66615b', margin: '0.25rem 0 0 0' }}>
                  Pago seguro inmediato en línea mediante la pasarela PayPhone (Ecuador e internacional).
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* PASO 4: RESUMEN DE PAGO Y CONSENTIMIENTO */}
        <div
          style={{
            background: '#faf8f5',
            borderRadius: '16px',
            border: '1px solid #e4dacb',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.95rem', color: '#4a463a' }}>
              Taller: <strong>{PAZ_BRAND.title}</strong>
            </span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#8f4e38', fontFamily: 'var(--paz-serif)' }}>
              {formatPazUsd(amountCents)}
            </span>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#66615b', lineHeight: 1.45 }}>
            Modalidad: <strong>{planTitle}</strong> · Acceso para todo tu hogar (4 clases magistrales, cuaderno de 24 págs, sesión en vivo y reto de 7 días).
          </div>
        </div>

        {/* CONSENTIMIENTO */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="paz-check" style={{ alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span style={{ fontSize: '0.86rem', color: '#4a463a', lineHeight: 1.4 }}>
              <strong>Autorizo a Wisdom Academy a contactarme sobre este taller.</strong> Consulta nuestra{' '}
              <Link href="/privacidad" target="_blank" style={{ textDecoration: 'underline', color: '#8f4e38' }}>
                política de privacidad
              </Link>.
            </span>
          </label>
        </div>

        {/* ALERTA DE ERROR */}
        {status === 'error' && (
          <div className="paz-alert paz-alert--error" style={{ marginBottom: '1.25rem' }}>
            <WisdomIcon name="shield" size={16} /> {errorMsg}
          </div>
        )}

        {/* BOTÓN DE ACCIÓN */}
        <button
          type="submit"
          disabled={status === 'sending'}
          className="paz-btn paz-btn--primary"
          style={{
            width: '100%',
            padding: '1rem',
            fontSize: '1.05rem',
            fontWeight: 800,
            justifyContent: 'center',
            boxShadow: '0 12px 32px rgba(179,106,80,0.35)',
          }}
        >
          <WisdomIcon name={status === 'sending' ? 'refresh' : 'credit-card'} size={18} />
          {status === 'sending'
            ? 'Procesando tu inscripción…'
            : method === 'bank_transfer'
            ? `Reservar mi lugar · ${formatPazUsd(amountCents)} por transferencia`
            : `Pagar ${formatPazUsd(amountCents)} con tarjeta PayPhone`}
        </button>

        <div style={{ textAlign: 'center', marginTop: '0.85rem', fontSize: '0.78rem', color: '#7a7256' }}>
          <WisdomIcon name="sparkles" size={12} /> Transacción segura · Sin crear cuentas complicadas · Atención oficial por WhatsApp: {pazPublicConfig.officialWhatsappPhone}
        </div>
      </form>
    </div>
  );
}

export default PazUnifiedEnrollment;
