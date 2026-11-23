import React from 'react';
import Image from 'next/image';
import { PazEnLaMesaLogo } from './PazEnLaMesaLogo';
import { PAZ_BRAND } from '@/lib/paz-en-la-mesa/content';
import { pazPublicConfig } from '@/lib/paz-en-la-mesa/config';

export interface PazPastorsPortraitProps {
  className?: string;
  priority?: boolean;
}

/**
 * Retrato editorial de los anfitriones. Sustituye la portada ilustrada del
 * hero por la fotografía oficial, con marco de arco, fondo cálido de mesa y
 * el logotipo del taller integrado.
 */
export function PazPastorsPortrait({
  className = '',
  priority = false,
}: PazPastorsPortraitProps) {
  return (
    <figure className={`paz-portrait ${className}`.trim()}>
      <div className="paz-portrait-topbar">
        <div className="paz-portrait-brand">
          <PazEnLaMesaLogo
            variant="mark"
            theme="light"
            className="paz-portrait-brand-mark"
          />
          <span className="paz-portrait-brand-copy">
            <strong>Paz en la mesa</strong>
            <small>Orden en el bolsillo · Fuego en el corazón</small>
          </span>
        </div>
        <span className="paz-portrait-seal">
          <small>Estreno</small>
          <strong>8 DIC</strong>
        </span>
      </div>
      <div
        className="paz-portrait-frame"
        style={{
          ['--paz-portrait-photo' as string]: `url("${pazPublicConfig.pastorsImage}")`,
        }}
      >
        <Image
          src={pazPublicConfig.pastorsImage}
          alt="Samuel y Gabby Palacio, anfitriones del taller Paz en la mesa, orden en el bolsillo y fuego en el corazón"
          fill
          priority={priority}
          unoptimized
          sizes="(max-width: 820px) 92vw, 480px"
          style={{ objectFit: 'contain', objectPosition: 'center center' }}
        />
      </div>
      <span className="paz-portrait-table-line" aria-hidden="true" />
      <figcaption className="paz-portrait-caption">
        <span className="paz-portrait-kicker">Anfitriones · Wisdom Academy</span>
        <strong>Samuel y Gabby Palacio</strong>
        <span>4 clases · Cuaderno 24 páginas · Reto de 7 días</span>
      </figcaption>
    </figure>
  );
}

export default PazPastorsPortrait;
