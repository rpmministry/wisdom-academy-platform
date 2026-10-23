'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/authContext';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

type Modo = 'regalo' | 'invitacion';

export default function RedeemPage() {
  const { usuario, sesionLista, refrescarSesion } = useAuth();
  const [modo, setModo] = useState<Modo>('regalo');
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResultado(null);
    if (!usuario) return;
    setEnviando(true);
    try {
      const response =
        modo === 'regalo'
          ? await apiFetch<Record<string, unknown>>('/api/codes/gift/redeem', {
              body: { codigo },
            })
          : await apiFetch<Record<string, unknown>>('/api/invitations/accept', {
              body: { codigo },
            });
      setResultado(response);
      await refrescarSesion();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: '2rem', background: 'var(--bg-canvas)', color: 'var(--text-primary)', fontFamily: 'var(--wa-font-sans)' }}>
      <Card variant="gold-border" padding="lg" style={{ width: 'min(620px, 100%)' }}>
        <span className="wa-eyebrow">Canje seguro</span>
        <h1 style={{ margin: '0.5rem 0', fontFamily: 'var(--wa-font-display)', fontSize: '1.5rem' }}>
          Activa un regalo o invitación
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>
          Los códigos de regalo habilitan únicamente los recursos asociados. Las invitaciones de
          fundador o inversor habilitan contenidos formativos, nunca el panel administrativo.
        </p>

        <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
          <Button variant={modo === 'regalo' ? 'primary-navy' : 'secondary'} size="sm" onClick={() => { setModo('regalo'); setResultado(null); setError(null); }}>
            Código de regalo
          </Button>
          <Button variant={modo === 'invitacion' ? 'primary-navy' : 'secondary'} size="sm" onClick={() => { setModo('invitacion'); setResultado(null); setError(null); }}>
            Invitación fundador / inversor
          </Button>
        </div>

        {!sesionLista ? (
          <p role="status">Verificando sesión…</p>
        ) : !usuario ? (
          <div style={{ padding: '1rem', borderRadius: 'var(--wa-radius-md)', background: 'var(--bg-subtle)', fontSize: '0.875rem' }}>
            Debes iniciar sesión con una cuenta verificada para canjear el código.
            <div style={{ marginTop: '0.75rem' }}>
              <Link href="/login"><Button variant="primary-gold" size="sm">Iniciar sesión</Button></Link>
            </div>
          </div>
        ) : (
          <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600 }}>
              {modo === 'regalo' ? 'Código de regalo' : 'Código de invitación'}
              <input
                value={codigo}
                onChange={(event) => setCodigo(event.target.value)}
                placeholder={modo === 'regalo' ? 'WA-GIFT-…' : 'WA-FOUNDER-…'}
                required
                autoComplete="off"
                style={{ minHeight: 44, padding: '0.625rem 0.75rem', borderRadius: 'var(--wa-radius-md)', border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)', textTransform: 'uppercase' }}
              />
            </label>
            <Button type="submit" variant="primary-gold" disabled={enviando} cargando={enviando}>
              {enviando ? 'Validando…' : 'Canjear código'}
            </Button>
          </form>
        )}

        {error && (
          <div role="alert" style={{ marginTop: '1rem', padding: '0.75rem', borderRadius: 'var(--wa-radius-md)', border: '1px solid var(--status-danger)', color: 'var(--status-danger)', fontSize: '0.8125rem' }}>
            {error}
          </div>
        )}

        {resultado && (
          <div style={{ marginTop: '1rem', padding: '0.875rem', borderRadius: 'var(--wa-radius-md)', background: 'var(--brand-primary-soft)', fontSize: '0.8125rem', lineHeight: 1.6 }}>
            <Badge variant="emerald" size="sm">Código aceptado</Badge>
            <p style={{ margin: '0.5rem 0' }}>
              {String((resultado as { mensaje?: string }).mensaje || 'El acceso quedó habilitado.')}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link href="/mi-acceso"><Button variant="primary-gold" size="sm">Ver mi acceso</Button></Link>
              <Link href="/catalogo"><Button variant="secondary" size="sm">Explorar catálogo</Button></Link>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
          <Link href="/catalogo">← Catálogo</Link>
          <Link href={usuario ? '/dashboard' : '/login'}>Mi portal →</Link>
        </div>
      </Card>
    </main>
  );
}

