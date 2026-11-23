'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PazEnLaMesaLogo } from './PazEnLaMesaLogo';
import { PAZ_BRAND } from '@/lib/paz-en-la-mesa/content';
import { buildOfficialWhatsappChatUrl } from '@/lib/paz-en-la-mesa/config';
import { apiFetch, errorMessage } from '@/lib/api/client';

export function PazCodeActivationForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [rawCode, setRawCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  // Formateador automático de código en bloques de 5: PAZ26-XXXXX-XXXXX-XXXXX-XXXXX
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 25);
    const parts: string[] = [];
    for (let i = 0; i < clean.length; i += 5) {
      parts.push(clean.slice(i, i + 5));
    }
    setRawCode(parts.join('-'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiFetch<{
        success: boolean;
        redirectUrl: string;
        user: { displayName: string };
      }>('/api/paz/codes/redeem', {
        method: 'POST',
        body: {
          email,
          rawCode,
          fullName,
        },
      });

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(response.redirectUrl || '/cursos/paz-en-la-mesa');
        }, 1500);
      }
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '560px',
        margin: '2rem auto',
        padding: '2.5rem 2rem',
        borderRadius: '24px',
        background: '#ffffff',
        border: '1px solid rgba(197,160,89,0.3)',
        boxShadow: '0 20px 60px rgba(43,41,39,0.08)',
        fontFamily: 'var(--paz-sans, sans-serif)',
        color: '#2b2927',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ maxHeight: '42px', margin: '0 auto 1.25rem' }}>
          <PazEnLaMesaLogo variant="compact" theme="light" />
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.8rem',
            borderRadius: '999px',
            background: 'rgba(197,160,89,0.15)',
            color: '#8f6820',
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '0.75rem',
          }}
        >
          <WisdomIcon name="shield" size={13} /> Activación de transferencia bancaria
        </span>
        <h1
          style={{
            fontFamily: 'var(--paz-serif, serif)',
            fontSize: 'clamp(1.5rem, 4vw, 1.95rem)',
            margin: '0 0 0.5rem 0',
            lineHeight: 1.25,
            color: '#2b2927',
          }}
        >
          Activa tu acceso al taller
        </h1>
        <p style={{ fontSize: '0.92rem', color: '#66615b', margin: 0, lineHeight: 1.5 }}>
          Ingresa el correo de tu inscripción y el código único de 25 caracteres emitido tras la verificación de tu pago.
        </p>
      </div>

      {success ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2rem 1.5rem',
            borderRadius: '16px',
            background: 'rgba(46,125,50,0.08)',
            border: '1px solid rgba(46,125,50,0.25)',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#2e7d32',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <WisdomIcon name="check" size={28} />
          </div>
          <h2 style={{ fontSize: '1.25rem', margin: '0 0 0.5rem 0', color: '#1b5e20' }}>
            ¡Acceso verificado y activado!
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#2e7d32', margin: '0 0 1rem 0' }}>
            Tu derecho al taller ha sido habilitado. Ingresando a tu aula de estudiante...
          </p>
          <div style={{ fontSize: '0.85rem', color: '#555' }}>
            Si no eres redirigido automáticamente,{' '}
            <Link href="/cursos/paz-en-la-mesa" style={{ color: '#8f4e38', fontWeight: 700 }}>
              haz clic aquí
            </Link>.
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
          {error && (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                background: '#fde8e8',
                border: '1px solid #f8b4b4',
                color: '#9b1c1c',
                fontSize: '0.88rem',
                lineHeight: 1.4,
              }}
            >
              <strong style={{ display: 'block', marginBottom: '0.2rem' }}>Error de validación:</strong>
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="paz-code-email"
              style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.35rem' }}
            >
              Correo electrónico del participante *
            </label>
            <input
              id="paz-code-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu-correo@ejemplo.com"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '1px solid #d4c8b8',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            <small style={{ display: 'block', color: '#7a7256', marginTop: '0.3rem', fontSize: '0.78rem' }}>
              Debe coincidir exactamente con el correo con el que registraste tu transferencia.
            </small>
          </div>

          <div>
            <label
              htmlFor="paz-code-raw"
              style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.35rem' }}
            >
              Código único de 25 caracteres *
            </label>
            <input
              id="paz-code-raw"
              type="text"
              required
              value={rawCode}
              onChange={handleCodeChange}
              placeholder="PAZ26-XXXXX-XXXXX-XXXXX-XXXXX"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '1px solid #d4c8b8',
                fontSize: '1rem',
                letterSpacing: '0.08em',
                fontWeight: 700,
                fontFamily: 'monospace',
                outline: 'none',
                textTransform: 'uppercase',
              }}
            />
            <small style={{ display: 'block', color: '#7a7256', marginTop: '0.3rem', fontSize: '0.78rem' }}>
              Código de seguridad emitido por Wisdom Academy tras verificar tu comprobante.
            </small>
          </div>

          <div>
            <label
              htmlFor="paz-code-name"
              style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.35rem' }}
            >
              Nombre completo (opcional)
            </label>
            <input
              id="paz-code-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre para tu constancia de estudio"
              style={{
                width: '100%',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                border: '1px solid #d4c8b8',
                fontSize: '0.95rem',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="paz-btn paz-btn--primary"
            style={{ width: '100%', justifyContent: 'center', padding: '0.95rem', fontSize: '1rem' }}
          >
            {loading ? (
              <>
                <WisdomIcon name="refresh" size={16} /> Verificando código criptográfico...
              </>
            ) : (
              <>
                <WisdomIcon name="check" size={16} /> Validar y entrar al taller
              </>
            )}
          </button>
        </form>
      )}

      <div
        style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid #e8ded1',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: '#7a7256',
        }}
      >
        <p style={{ margin: '0 0 0.75rem 0' }}>¿Todavía no tienes tu código o necesitas reportar tu transferencia?</p>
        <a
          href={buildOfficialWhatsappChatUrl('Hola Wisdom Academy, realicé una transferencia bancaria para el taller Paz en la mesa y deseo validar mi código.')}
          target="_blank"
          rel="noreferrer"
          className="paz-btn paz-btn--olive paz-btn--small"
          style={{ display: 'inline-flex', margin: '0 auto' }}
        >
          <WisdomIcon name="users" size={14} /> Contactar soporte WhatsApp (+593998755759)
        </a>
      </div>
    </div>
  );
}
