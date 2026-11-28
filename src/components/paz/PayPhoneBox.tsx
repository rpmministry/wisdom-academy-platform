'use client';

import React, { useEffect, useRef, useState } from 'react';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

declare global {
  interface Window {
    PPaymentButtonBox?: new (options: {
      token: string;
      amount: number;
      amountWithoutTax: number;
      amountWithTax?: number;
      tax?: number;
      service?: number;
      tip?: number;
      currency: string;
      clientTransactionId: string;
      email?: string;
      phoneNumber?: string;
      reference?: string;
      storeId?: string;
      responseUrl: string;
    }) => {
      render: (containerId: string) => void;
    };
    payphone?: {
      PaymentBox: (options: {
        token: string;
        amount: number;
        amountWithoutTax: number;
        amountWithTax?: number;
        tax?: number;
        service?: number;
        tip?: number;
        currency: string;
        clientTransactionId: string;
        email?: string;
        phoneNumber?: string;
        reference?: string;
        storeId?: string;
        responseUrl: string;
      }) => {
        render: (containerId: string) => void;
      };
    };
  }
}

export interface PayPhoneBoxProps {
  token?: string | null;
  storeId?: string | null;
  amountCents: number;
  clientTransactionId: string;
  email: string;
  buyerName?: string;
  phoneNumber?: string;
  referenceText?: string;
  fallbackPayphoneUrl?: string | null;
}

function formatPhoneForPayphone(rawPhone?: string): string | undefined {
  if (!rawPhone) return undefined;
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('593')) return `+${digits}`;
  if (digits.startsWith('0')) return `+593${digits.substring(1)}`;
  if (digits.length === 9) return `+593${digits}`;
  return `+${digits}`;
}

export function PayPhoneBox({
  token,
  storeId,
  amountCents,
  clientTransactionId,
  email,
  buyerName,
  phoneNumber,
  referenceText = 'Taller Paz en la mesa, orden en el bolsillo y fuego en el corazón',
  fallbackPayphoneUrl,
}: PayPhoneBoxProps) {
  const containerId = 'payphone-payment-box-container';
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);
  const [boxRendered, setBoxRendered] = useState(false);
  const initializedRef = useRef(false);

  // Intentamos obtener el token de props o de variables de entorno públicas
  const activeToken = (
    token ||
    process.env.NEXT_PUBLIC_PAYPHONE_TOKEN ||
    ''
  ).trim();

  const activeStoreId = (
    storeId ||
    process.env.NEXT_PUBLIC_PAYPHONE_STORE_ID ||
    ''
  ).trim();

  // 1. Cargar CSS y JS del SDK de PayPhone de forma asíncrona
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Inyectar CSS si no está presente
    const cssId = 'payphone-box-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.css';
      document.head.appendChild(link);
    }

    // Inyectar JS si no está presente
    const scriptId = 'payphone-box-js';
    const checkPayphoneReady = () => {
      if (typeof window !== 'undefined') {
        if (
          typeof window.PPaymentButtonBox === 'function' ||
          (window.payphone && typeof window.payphone.PaymentBox === 'function')
        ) {
          setScriptLoaded(true);
          return true;
        }
      }
      return false;
    };

    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existingScript) {
      if (!checkPayphoneReady()) {
        const interval = setInterval(() => {
          if (checkPayphoneReady()) clearInterval(interval);
        }, 80);
        setTimeout(() => clearInterval(interval), 5000);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.type = 'module';
    script.src = 'https://cdn.payphonetodoesposible.com/box/v2.0/payphone-payment-box.js';
    script.onload = () => {
      if (!checkPayphoneReady()) {
        const interval = setInterval(() => {
          if (checkPayphoneReady()) clearInterval(interval);
        }, 80);
        setTimeout(() => clearInterval(interval), 5000);
      }
    };
    script.onerror = () => {
      setScriptError('No se pudo conectar con los servidores de PayPhone CDN.');
    };
    document.body.appendChild(script);
  }, []);

  // 2. Renderizar la Cajita de Pagos cuando el SDK y el Token estén disponibles
  useEffect(() => {
    if (!scriptLoaded || !activeToken || initializedRef.current) return;
    if (typeof window === 'undefined') return;

    const hasPPayment = typeof window.PPaymentButtonBox === 'function';
    const hasPayphone = Boolean(window.payphone && typeof window.payphone.PaymentBox === 'function');
    if (!hasPPayment && !hasPayphone) return;

    try {
      const responseUrl = `${window.location.origin}/paz-en-la-mesa/confirmacion`;

      // Limpiar contenedor por si existía contenido previo
      const container = document.getElementById(containerId);
      if (container) container.innerHTML = '';

      const formattedPhone = formatPhoneForPayphone(phoneNumber);

      const options: {
        token: string;
        amount: number;
        amountWithoutTax: number;
        amountWithTax: number;
        tax: number;
        service: number;
        tip: number;
        currency: string;
        clientTransactionId: string;
        email: string;
        phoneNumber?: string;
        reference: string;
        responseUrl: string;
        storeId?: string;
      } = {
        token: activeToken,
        amount: amountCents,
        amountWithoutTax: amountCents,
        amountWithTax: 0,
        tax: 0,
        service: 0,
        tip: 0,
        currency: 'USD',
        clientTransactionId,
        email: email.trim(),
        phoneNumber: formattedPhone,
        reference: referenceText,
        responseUrl,
      };

      if (activeStoreId && activeStoreId.trim()) {
        options.storeId = activeStoreId.trim();
      }

      if (hasPPayment && window.PPaymentButtonBox) {
        const box = new window.PPaymentButtonBox(options);
        box.render(containerId);
      } else if (hasPayphone && window.payphone) {
        window.payphone.PaymentBox(options).render(containerId);
      }

      initializedRef.current = true;
      setBoxRendered(true);

      // Auto-enfocar suavemente hacia la pasarela de pago para visibilidad inmediata
      setTimeout(() => {
        const el = document.getElementById(containerId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al inicializar Cajita PayPhone.';
      setScriptError(msg);
    }
  }, [scriptLoaded, activeToken, activeStoreId, amountCents, clientTransactionId, email, phoneNumber, referenceText]);

  const formattedAmount = (amountCents / 100).toFixed(2);

  return (
    <div
      style={{
        borderRadius: '18px',
        background: 'var(--paz-card-bg, #ffffff)',
        border: '1px solid rgba(197, 160, 89, 0.4)',
        boxShadow: '0 12px 36px rgba(43, 41, 39, 0.08)',
        padding: '1.75rem',
        margin: '1.5rem 0',
        fontFamily: 'var(--paz-sans, sans-serif)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '1rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid rgba(197, 160, 89, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#b36a50',
              color: '#ffffff',
            }}
          >
            <WisdomIcon name="credit-card" size={20} />
          </span>
          <div>
            <strong style={{ fontSize: '1.05rem', color: 'var(--paz-ink, #2b2927)', display: 'block' }}>
              Cajita de Pagos PayPhone
            </strong>
            <span style={{ fontSize: '0.8rem', color: '#6b665f' }}>
              Tarjetas de crédito, débito y saldo PayPhone
            </span>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.78rem', color: '#8a8379', display: 'block' }}>Total a pagar</span>
          <strong style={{ fontSize: '1.25rem', color: 'var(--paz-accent-text, #8f4e38)' }}>USD {formattedAmount}</strong>
        </div>
      </div>

      {/* Si NO hay token configurado, mostramos el panel guía para el administrador */}
      {!activeToken ? (
        <div
          style={{
            padding: '1.5rem',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(197,160,89,0.1), rgba(179,106,80,0.06))',
            border: '1px dashed rgba(197,160,89,0.6)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(197,160,89,0.2)',
              color: '#8f6820',
              marginBottom: '0.75rem',
            }}
          >
            <WisdomIcon name="settings" size={22} />
          </div>
          <h4
            style={{
              margin: '0 0 0.4rem',
              fontSize: '1.1rem',
              color: 'var(--paz-ink, #2b2927)',
              fontFamily: 'var(--paz-serif, serif)',
            }}
          >
            Cajita de Pagos Lista · Esperando Credenciales
          </h4>
          <p
            style={{
              margin: '0 auto 1rem',
              maxWidth: '480px',
              fontSize: '0.88rem',
              color: '#55514b',
              lineHeight: 1.5,
            }}
          >
            El componente y la infraestructura de <strong>Cajita de Pagos (Payment Box V2)</strong> están
            completamente integrados. En cuanto ingreses tus credenciales de PayPhone Developers, el formulario seguro de
            tarjeta se desplegará aquí en tiempo real.
          </p>

          <div
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              gap: '0.35rem',
              textAlign: 'left',
              padding: '0.85rem 1.25rem',
              borderRadius: '10px',
              background: 'var(--paz-card-bg, #ffffff)',
              border: '1px solid rgba(197,160,89,0.3)',
              fontSize: '0.82rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <code style={{ background: '#f5efe6', padding: '0.15rem 0.4rem', borderRadius: '4px', color: 'var(--paz-accent-text, #8f4e38)' }}>
                PAYPHONE_TOKEN
              </code>{' '}
              <span style={{ color: '#8a8379' }}>(Token de aplicación Web en developers.payphone.app)</span>
            </div>
            <div>
              <code style={{ background: '#f5efe6', padding: '0.15rem 0.4rem', borderRadius: '4px', color: 'var(--paz-accent-text, #8f4e38)' }}>
                PAYPHONE_STORE_ID
              </code>{' '}
              <span style={{ color: '#8a8379' }}>(Identificador de sucursal / StoreID si aplica)</span>
            </div>
          </div>

          {fallbackPayphoneUrl ? (
            <div>
              <a
                href={fallbackPayphoneUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '10px',
                  background: '#b36a50',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                }}
              >
                Pagar con enlace alternativo PayPhone <WisdomIcon name="arrow-right" size={14} />
              </a>
            </div>
          ) : null}
        </div>
      ) : (
        /* Si HAY token, renderizamos el contenedor oficial de la Cajita */
        <div>
          {!scriptLoaded && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6b665f', fontSize: '0.9rem' }}>
              <WisdomIcon name="clock" size={24} />
              <p style={{ marginTop: '0.5rem' }}>Cargando pasarela segura de PayPhone…</p>
            </div>
          )}

          {scriptError && (
            <div
              style={{
                padding: '1rem',
                borderRadius: '10px',
                background: 'rgba(180, 40, 40, 0.08)',
                border: '1px solid rgba(180, 40, 40, 0.3)',
                color: '#8a2b2b',
                fontSize: '0.86rem',
                marginBottom: '1rem',
              }}
            >
              <strong>Error en la pasarela:</strong> {scriptError}
            </div>
          )}

          {/* CONTENEDOR DONDE EL SDK DE PAYPHONE INYECTA EL IFRAME Y FORMULARIO */}
          <div
            id={containerId}
            style={{
              minHeight: '220px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          />
        </div>
      )}

      {/* Pie de seguridad y datos de la transacción */}
      <div
        style={{
          marginTop: '1.25rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid rgba(197, 160, 89, 0.15)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          fontSize: '0.78rem',
          color: '#8a8379',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <WisdomIcon name="shield" size={14} />
          <span>Transacción encriptada 256-bit SSL · Procesada por PayPhone Ecuador</span>
        </div>
        <div>
          Referencia: <strong>{clientTransactionId}</strong>
        </div>
      </div>
    </div>
  );
}

export default PayPhoneBox;
