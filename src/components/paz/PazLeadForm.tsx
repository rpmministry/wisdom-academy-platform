'use client';

import React, { useState } from 'react';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { pazPublicConfig } from '@/lib/paz-en-la-mesa/config';

export interface PazLeadFormProps {
  source?: string;
  campaign?: string;
  compact?: boolean;
  id?: string;
  title?: string;
  description?: string;
}

export function PazLeadForm({
  source = 'landing',
  campaign = 'paz-en-la-mesa-2026',
  compact = false,
  id,
  title = 'Recibe el temario y los recordatorios',
  description = 'Déjanos tus datos para enviarte el cuaderno de bienvenida, la fecha de apertura y los enlaces de los En Vivos.',
}: PazLeadFormProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(true);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!consent) {
      setStatus('error');
      setMessage('Necesitamos tu autorización para enviarte la información del taller.');
      return;
    }
    setStatus('sending');
    setMessage('');
    try {
      await apiFetch('/api/paz/leads', {
        method: 'POST',
        body: {
          fullName,
          email,
          phone: phone || undefined,
          consent,
          source,
          campaign,
        },
      });
      setStatus('done');
      setMessage('Listo. Te escribiremos con el temario y los recordatorios del taller.');
      setFullName('');
      setEmail('');
      setPhone('');
    } catch (error) {
      setStatus('error');
      setMessage(errorMessage(error));
    }
  };

  if (status === 'done') {
    return (
      <div className="paz-lead-card" id={id}>
        <div className="paz-alert paz-alert--success" role="status">
          <strong>¡Bienvenido a la mesa!</strong>
          <br />
          {message}
        </div>
        {pazPublicConfig.whatsappUrl && (
          <a
            href={pazPublicConfig.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="paz-btn paz-btn--olive"
            style={{ width: '100%', marginTop: '0.75rem' }}
          >
            <WisdomIcon name="users" size={16} /> Entrar a la comunidad de WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <form className="paz-lead-card paz-form" id={id} onSubmit={submit}>
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className={compact ? 'paz-form' : 'paz-form-row'}>
        <div className="paz-field">
          <label htmlFor={`paz-name-${source}`}>Nombre y apellido</label>
          <input
            id={`paz-name-${source}`}
            name="fullName"
            autoComplete="name"
            required
            maxLength={160}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Samuel y Gabby Palacio"
          />
        </div>
        <div className="paz-field">
          <label htmlFor={`paz-email-${source}`}>Correo electrónico</label>
          <input
            id={`paz-email-${source}`}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={200}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="familia@correo.com"
          />
        </div>
      </div>
      <div className="paz-field">
        <label htmlFor={`paz-phone-${source}`}>WhatsApp (opcional)</label>
        <input
          id={`paz-phone-${source}`}
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={40}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+593 9..."
        />
        <small>Lo usaremos únicamente para recordatorios del taller y la comunidad oficial.</small>
      </div>
      <label className="paz-check" style={{ alignItems: 'flex-start' }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>
          Autorizo a MAIM Casa de Oración y Wisdom Academy a contactarme sobre este taller.
        </span>
      </label>
      {status === 'error' && (
        <div className="paz-alert paz-alert--error" role="alert">
          {message}
        </div>
      )}
      <button
        type="submit"
        className="paz-btn paz-btn--primary"
        disabled={status === 'sending'}
        style={{ width: '100%' }}
      >
        <WisdomIcon name={status === 'sending' ? 'refresh' : 'mail'} size={16} />
        {status === 'sending' ? 'Enviando…' : 'Quiero recibir el temario'}
      </button>
      {pazPublicConfig.whatsappUrl && (
        <a
          href={pazPublicConfig.whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="paz-btn paz-btn--olive"
          style={{ width: '100%' }}
        >
          <WisdomIcon name="users" size={16} /> Entrar directamente al WhatsApp
        </a>
      )}
    </form>
  );
}

export default PazLeadForm;
