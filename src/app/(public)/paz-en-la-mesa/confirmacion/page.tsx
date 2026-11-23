'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PAZ_BRAND } from '@/lib/paz-en-la-mesa/content';
import { buildOfficialWhatsappChatUrl, pazPublicConfig } from '@/lib/paz-en-la-mesa/config';

interface ConfirmResult {
  success: boolean;
  reference?: string;
  amountCents?: number;
  buyerEmail?: string;
  buyerName?: string;
  payphoneId?: string;
  status?: string;
  message?: string;
  alreadyConfirmed?: boolean;
  redirectUrl?: string;
}

function PazConfirmacionContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [data, setData] = useState<ConfirmResult | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const executedRef = useRef(false);

  const payphoneId = searchParams.get('id') || searchParams.get('transactionId') || '';
  const clientTransactionId =
    searchParams.get('clientTransactionId') ||
    searchParams.get('clientTxId') ||
    searchParams.get('reference') ||
    '';

  useEffect(() => {
    if (executedRef.current) return;

    if (!payphoneId && !clientTransactionId) {
      setStatus('error');
      setErrorText('No se recibieron los parámetros de confirmación de PayPhone en la URL.');
      return;
    }

    executedRef.current = true;

    apiFetch<ConfirmResult>('/api/paz/payments/confirm', {
      body: {
        id: payphoneId,
        clientTransactionId,
      },
    })
      .then((res) => {
        setData(res);
        setStatus('success');
      })
      .catch((err) => {
        setStatus('error');
        setErrorText(errorMessage(err) || 'No se pudo verificar el pago con PayPhone.');
      });
  }, [payphoneId, clientTransactionId]);

  const whatsappCommunityUrl =
    pazPublicConfig.whatsappUrl ||
    buildOfficialWhatsappChatUrl(
      `Hola Samuel y Gabby, acabo de inscribirme en el taller Paz en la mesa con el código ${clientTransactionId || (data?.reference ?? '')}. ¡Deseo ingresar a la comunidad oficial!`
    );

  const whatsappSupportUrl = buildOfficialWhatsappChatUrl(
    `Hola equipo de Wisdom Academy, tuve un problema al confirmar mi pago en PayPhone para el taller Paz en la mesa. Referencia: ${clientTransactionId || 'N/A'}`
  );

  return (
    <div
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: 'clamp(2rem, 5vw, 4rem) 1.25rem',
        fontFamily: 'var(--paz-sans, sans-serif)',
      }}
    >
      {/* ESTADO: CARGANDO */}
      {status === 'loading' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid rgba(197, 160, 89, 0.4)',
            boxShadow: '0 20px 48px rgba(43, 41, 39, 0.08)',
            padding: '3rem 2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(197, 160, 89, 0.15)',
              color: '#8f4e38',
              marginBottom: '1.25rem',
            }}
          >
            <WisdomIcon name="clock" size={32} />
          </div>
          <h2
            style={{
              margin: '0 0 0.5rem',
              fontSize: '1.65rem',
              fontFamily: 'var(--paz-serif, serif)',
              color: '#2b2927',
            }}
          >
            Confirmando tu pago con PayPhone…
          </h2>
          <p style={{ margin: 0, color: '#6b665f', fontSize: '0.98rem' }}>
            Estamos validando la transacción de forma segura con la pasarela bancaria. Esto tomará sólo unos segundos.
          </p>
        </div>
      )}

      {/* ESTADO: ÉXITO */}
      {status === 'success' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '2px solid rgba(197, 160, 89, 0.5)',
            boxShadow: '0 24px 60px rgba(43, 41, 39, 0.1)',
            padding: 'clamp(2rem, 4vw, 3rem)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%)',
              color: '#ffffff',
              marginBottom: '1.25rem',
              boxShadow: '0 8px 24px rgba(45, 106, 79, 0.3)',
            }}
          >
            <WisdomIcon name="check" size={36} />
          </div>

          <div
            style={{
              display: 'inline-block',
              padding: '0.35rem 0.9rem',
              borderRadius: '999px',
              background: 'rgba(45, 106, 79, 0.1)',
              color: '#1b4332',
              fontSize: '0.82rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '0.75rem',
            }}
          >
            ¡Pago Aprobado y Acceso Activado!
          </div>

          <h1
            style={{
              margin: '0 0 0.75rem',
              fontSize: 'clamp(1.6rem, 3.5vw, 2.2rem)',
              fontFamily: 'var(--paz-serif, serif)',
              color: '#2b2927',
              lineHeight: 1.25,
            }}
          >
            Bienvenido al Taller Oficial
          </h1>
          <p
            style={{
              margin: '0 auto 1.75rem',
              maxWidth: '560px',
              color: '#55514b',
              fontSize: '1rem',
              lineHeight: 1.55,
            }}
          >
            Tu cupo y acceso para <strong>{data?.buyerName || 'tu hogar'}</strong> han quedado registrados en Wisdom Academy. Ya puedes entrar directamente a las clases y a los materiales de estudio.
          </p>

          {/* DETALLES DE LA TRANSACCIÓN */}
          <div
            style={{
              background: '#fcfbfa',
              border: '1px solid rgba(197, 160, 89, 0.3)',
              borderRadius: '16px',
              padding: '1.25rem',
              textAlign: 'left',
              marginBottom: '2rem',
              fontSize: '0.9rem',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '0.85rem',
              }}
            >
              <div>
                <span style={{ color: '#8a8379', fontSize: '0.78rem', display: 'block' }}>
                  Código oficial de inscripción:
                </span>
                <strong style={{ color: '#8f4e38', fontSize: '1.05rem', fontFamily: 'var(--paz-serif, serif)' }}>
                  {data?.reference || clientTransactionId}
                </strong>
              </div>
              {data?.amountCents && (
                <div>
                  <span style={{ color: '#8a8379', fontSize: '0.78rem', display: 'block' }}>Monto cancelado:</span>
                  <strong style={{ color: '#2b2927' }}>USD {(data.amountCents / 100).toFixed(2)}</strong>
                </div>
              )}
              {payphoneId && (
                <div>
                  <span style={{ color: '#8a8379', fontSize: '0.78rem', display: 'block' }}>ID PayPhone:</span>
                  <span style={{ color: '#55514b', fontFamily: 'monospace' }}>{payphoneId}</span>
                </div>
              )}
              {data?.buyerEmail && (
                <div>
                  <span style={{ color: '#8a8379', fontSize: '0.78rem', display: 'block' }}>Correo registrado:</span>
                  <span style={{ color: '#55514b' }}>{data.buyerEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* ACCIONES PRINCIPALES */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '2rem' }}>
            <Link
              href="/cursos/paz-en-la-mesa"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                padding: '1rem 1.75rem',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #b36a50 0%, #8f4e38 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '1.05rem',
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(179, 106, 80, 0.35)',
              }}
            >
              <WisdomIcon name="play" size={18} /> Entrar al Taller y Ver mis Clases
            </Link>

            <a
              href={whatsappCommunityUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                padding: '0.9rem 1.75rem',
                borderRadius: '14px',
                background: '#2d6a4f',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.95rem',
                textDecoration: 'none',
              }}
            >
              <WisdomIcon name="users" size={18} /> Unirme a la Comunidad Oficial de WhatsApp
            </a>

            <a
              href="/docs/cuaderno-de-trabajo-paz-en-la-mesa.pdf"
              target="_blank"
              rel="noreferrer"
              download="Cuaderno_de_Trabajo_Paz_en_la_Mesa.pdf"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                padding: '0.85rem 1.75rem',
                borderRadius: '14px',
                background: '#faf8f5',
                border: '1px solid rgba(197, 160, 89, 0.4)',
                color: '#2b2927',
                fontWeight: 600,
                fontSize: '0.92rem',
                textDecoration: 'none',
              }}
            >
              <WisdomIcon name="download" size={16} /> Descargar Cuaderno de Trabajo (PDF 24 páginas)
            </a>
          </div>

          <div style={{ fontSize: '0.84rem', color: '#8a8379' }}>
            Wisdom Academy · Samuel y Gabby Palacio · Fundación Casa Main
          </div>
        </div>
      )}

      {/* ESTADO: ERROR */}
      {status === 'error' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            border: '1px solid rgba(214, 40, 40, 0.3)',
            boxShadow: '0 20px 48px rgba(43, 41, 39, 0.08)',
            padding: '3rem 2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(214, 40, 40, 0.1)',
              color: '#d62828',
              marginBottom: '1.25rem',
            }}
          >
            <WisdomIcon name="shield" size={32} />
          </div>
          <h2
            style={{
              margin: '0 0 0.5rem',
              fontSize: '1.65rem',
              fontFamily: 'var(--paz-serif, serif)',
              color: '#2b2927',
            }}
          >
            No se pudo confirmar la transacción
          </h2>
          <p style={{ margin: '0 auto 1.5rem', maxWidth: '520px', color: '#6b665f', fontSize: '0.95rem' }}>
            {errorText || 'La transacción no pudo ser verificada por la entidad emisora o fue cancelada.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '380px', margin: '0 auto' }}>
            <Link
              href="/paz-en-la-mesa#inscripcion"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.5rem',
                borderRadius: '12px',
                background: '#b36a50',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.95rem',
                textDecoration: 'none',
              }}
            >
              <WisdomIcon name="refresh" size={16} /> Volver a intentar la inscripción
            </Link>

            <a
              href={whatsappSupportUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.5rem',
                borderRadius: '12px',
                background: '#faf8f5',
                border: '1px solid #d4c8b8',
                color: '#2b2927',
                fontWeight: 600,
                fontSize: '0.95rem',
                textDecoration: 'none',
              }}
            >
              <WisdomIcon name="users" size={16} /> Contactar soporte por WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PazConfirmacionPage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#f9f6f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Suspense
        fallback={
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b665f' }}>
            Cargando confirmación…
          </div>
        }
      >
        <PazConfirmacionContent />
      </Suspense>
    </main>
  );
}
