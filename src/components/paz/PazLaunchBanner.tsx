import React from 'react';
import Link from 'next/link';
import { PazCountdown } from './PazCountdown';
import { PazEnLaMesaLogo } from './PazEnLaMesaLogo';
import { PAZ_BRAND, PAZ_PRICING } from '@/lib/paz-en-la-mesa/content';
import {
  formatPazUsd,
  pazNextMilestone,
  pazPhaseAt,
  pazPublicConfig,
} from '@/lib/paz-en-la-mesa/config';

export function pazBannerCopy(now: Date = new Date()): {
  headline: string;
  detail: string;
  cta: string;
} {
  const phase = pazPhaseAt(now);
  if (phase === 'anticipation') {
    return {
      headline: 'NUEVO TALLER DE FIN DE AÑO · ESTRENO 8 DE DICIEMBRE',
      detail: 'Preventa Madrugador USD 27 por hogar · abre el jueves 3 de diciembre, 20:00',
      cta: 'Ver el taller',
    };
  }
  if (phase === 'presale') {
    return {
      headline: 'PREVENTA MADRUGADOR ACTIVA · USD 27 POR HOGAR',
      detail: 'Las clases se liberan el 8 de diciembre · Precio oficial USD 37 desde el 9 de diciembre',
      cta: 'Reservar mi lugar',
    };
  }
  if (phase === 'official') {
    return {
      headline: 'PRECIO OFICIAL USD 37 POR HOGAR',
      detail: 'Inscripciones abiertas hasta el domingo 20 de diciembre · 23:59',
      cta: 'Inscribirme',
    };
  }
  return {
    headline: 'PAZ EN LA MESA · ORDEN EN EL BOLSILLO · FUEGO EN EL CORAZÓN',
    detail: 'Las clases y el Cuaderno de Trabajo están disponibles en tu portal',
    cta: 'Entrar al taller',
  };
}

export function PazLaunchBanner({ now = new Date() }: { now?: Date }) {
  const copy = pazBannerCopy(now);
  const milestone = pazNextMilestone(now);
  const whatsapp = pazPublicConfig.whatsappUrl;
  const ctaHref = whatsapp || '/paz-en-la-mesa#comunidad';
  const externo = Boolean(whatsapp);

  return (
    <aside className="paz-banner" aria-label="Anuncio del taller Paz en la mesa">
      <div className="paz-banner-inner">
        <div className="paz-banner-copy">
          <PazEnLaMesaLogo variant="mark" theme="dark" className="paz-banner-mark" />
          <div className="paz-banner-text">
            <strong>{copy.headline}</strong>
            <span>{copy.detail}</span>
          </div>
        </div>
        <div className="paz-banner-actions">
          <PazCountdown
            targetIso={milestone.targetIso}
            label={milestone.label}
            compact
          />
          <Link href="/paz-en-la-mesa" className="paz-banner-cta" data-testid="paz-banner-more">
            {copy.cta}
          </Link>
          {externo && (
            <a
              href={ctaHref}
              target="_blank"
              rel="noreferrer"
              className="paz-banner-cta"
              style={{ background: 'transparent', color: '#f3e2bd', borderColor: 'rgba(197,160,89,.55)' }}
              data-testid="paz-banner-whatsapp"
            >
              WhatsApp
            </a>
          )}
          <span className="paz-visually-hidden">
            {PAZ_BRAND.title}. {copy.detail}. Precio de referencia:{' '}
            {formatPazUsd(PAZ_PRICING.presaleCents)} en preventa y{' '}
            {formatPazUsd(PAZ_PRICING.officialCents)} en precio oficial.
          </span>
        </div>
      </div>
    </aside>
  );
}

export default PazLaunchBanner;
