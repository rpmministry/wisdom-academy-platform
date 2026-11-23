import React from 'react';
import Link from 'next/link';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PazCountdown } from './PazCountdown';
import { PazPastorsPortrait } from './PazPastorsPortrait';
import { PAZ_BRAND, PAZ_PRICING } from '@/lib/paz-en-la-mesa/content';
import {
  formatPazUsd,
  pazNextMilestone,
  pazPhaseAt,
  pazPublicConfig,
} from '@/lib/paz-en-la-mesa/config';

export function PazHomeHero() {
  const now = new Date();
  const phase = pazPhaseAt(now);
  const milestone = pazNextMilestone(now);
  const currentPrice =
    phase === 'official' || phase === 'closed'
      ? PAZ_PRICING.officialCents
      : PAZ_PRICING.presaleCents;
  const showOldPrice = currentPrice !== PAZ_PRICING.officialCents;
  const whatsapp = pazPublicConfig.whatsappUrl;

  return (
    <section className="paz-world paz-home-hero" aria-labelledby="paz-home-title">
      <div className="paz-home-hero-inner">
        <div className="paz-home-hero-copy">
          <span className="paz-eyebrow">
            <WisdomIcon name="sparkles" size={13} /> {PAZ_BRAND.eyebrow}
          </span>
          <h2 className="paz-title" id="paz-home-title">
            Paz en la mesa,<br />
            <span className="paz-title-soft">Orden en el bolsillo</span><br />
            <em>y fuego en el corazón.</em>
          </h2>
          <p className="paz-subtitle">{PAZ_BRAND.subtitle}</p>

          <div className="paz-actions">
            <Link
              href="/paz-en-la-mesa#comunidad"
              className="paz-btn paz-btn--olive"
              data-testid="paz-home-whatsapp"
            >
              <WisdomIcon name="users" size={16} />
              Unirme a la comunidad
            </Link>
            <Link href="/paz-en-la-mesa#clases" className="paz-btn paz-btn--primary">
              <WisdomIcon name="book" size={16} /> Ver el temario completo
            </Link>
            <Link href="/paz-en-la-mesa#inscripcion" className="paz-btn paz-btn--ghost">
              <WisdomIcon name="credit-card" size={16} /> Reservar mi lugar
            </Link>
          </div>

          <div className="paz-price-strip">
            <strong>{formatPazUsd(currentPrice)}</strong>
            <span>por hogar · {phase === 'official' ? PAZ_PRICING.officialLabel : PAZ_PRICING.presaleLabel}</span>
            {showOldPrice && (
              <span className="paz-price-old">{formatPazUsd(PAZ_PRICING.officialCents)}</span>
            )}
            <span className="paz-price-badge">Cupo familiar</span>
          </div>

          <PazCountdown targetIso={milestone.targetIso} label={milestone.label} />

          <div className="paz-hero-badges">
            <span className="paz-chip">
              <WisdomIcon name="video" size={13} /> 4 clases · 35–40 min
            </span>
            <span className="paz-chip">
              <WisdomIcon name="file-text" size={13} /> Cuaderno 24 páginas
            </span>
            <span className="paz-chip">
              <WisdomIcon name="award" size={13} /> Reto de 7 días
            </span>
            <span className="paz-chip">
              <WisdomIcon name="users" size={13} /> Sesión en vivo 22 dic
            </span>
          </div>
        </div>

        <PazPastorsPortrait priority />
      </div>
    </section>
  );
}

export default PazHomeHero;

