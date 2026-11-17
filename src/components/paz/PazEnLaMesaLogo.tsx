import React from 'react';

export type PazLogoVariant = 'full' | 'compact' | 'mark';
export type PazLogoTheme = 'light' | 'dark';

export interface PazEnLaMesaLogoProps {
  variant?: PazLogoVariant;
  theme?: PazLogoTheme;
  monochrome?: boolean;
  className?: string;
  title?: string;
}

const PALETTE = {
  terracotta: '#B36A50',
  terracottaDeep: '#8F4E38',
  olive: '#5C5847',
  wheat: '#C5A059',
  charcoal: '#2B2927',
  cream: '#FAF8F5',
  stone: '#8A8379',
};

function paletteFor(theme: PazLogoTheme, monochrome: boolean) {
  if (monochrome) {
    const ink = theme === 'dark' ? PALETTE.cream : PALETTE.charcoal;
    return { terracotta: ink, terracottaDeep: ink, olive: ink, wheat: ink, charcoal: ink, stone: ink };
  }
  return theme === 'dark'
    ? {
        ...PALETTE,
        terracotta: '#D89A82',
        terracottaDeep: '#B36A50',
        olive: '#D8CFBF',
        wheat: '#E6C78C',
        charcoal: PALETTE.cream,
        stone: '#C9C0B4',
      }
    : PALETTE;
}

function Mark({
  colors,
  x = 0,
  y = 0,
  scale = 1,
}: {
  colors: ReturnType<typeof paletteFor>;
  x?: number;
  y?: number;
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M16 46V30C16 18.8 24.8 10 36 10s20 8.8 20 20v16"
        fill="none"
        stroke={colors.terracotta}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 46h56"
        fill="none"
        stroke={colors.olive}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M8 46h56"
        fill="none"
        stroke={colors.olive}
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity="0.18"
        transform="translate(0 4)"
      />
      <path
        d="M36 19.2c-4.7 4.4-7.1 8.2-7.1 12.1 0 4.2 3.2 7.5 7.1 7.5s7.1-3.3 7.1-7.5c0-3.1-1.8-6.3-5.2-10.1Z"
        fill={colors.wheat}
      />
      <path
        d="M36 25.4c-2.3 2.3-3.5 4.3-3.5 6.4 0 2.2 1.6 3.9 3.5 3.9s3.5-1.7 3.5-3.9c0-1.6-.9-3.3-2.6-5.3Z"
        fill={colors.terracottaDeep}
        opacity="0.92"
      />
      <circle cx="36" cy="44.2" r="1.1" fill={colors.wheat} />
    </g>
  );
}

export const PazEnLaMesaLogo: React.FC<PazEnLaMesaLogoProps> = ({
  variant = 'full',
  theme = 'light',
  monochrome = false,
  className = '',
  title = 'Paz en la mesa, Orden en el bolsillo y fuego en el corazón',
}) => {
  const colors = paletteFor(theme, monochrome);
  const label = title;

  if (variant === 'mark') {
    return (
      <svg
        viewBox="0 0 64 56"
        className={className}
        role="img"
        aria-label={label}
        xmlns="http://www.w3.org/2000/svg"
      >
        <Mark colors={colors} />
      </svg>
    );
  }

  if (variant === 'compact') {
    return (
      <svg
        viewBox="0 0 360 64"
        className={className}
        role="img"
        aria-label={label}
        xmlns="http://www.w3.org/2000/svg"
      >
        <Mark colors={colors} x={2} y={6} scale={0.78} />
        <text
          x="72"
          y="27"
          fill={colors.charcoal}
          fontFamily="Lora, 'Playfair Display', Georgia, 'Times New Roman', serif"
          fontSize="17"
          fontWeight="600"
          letterSpacing="-0.2"
        >
          Paz en la mesa
        </text>
        <text
          x="72"
          y="45"
          fill={colors.olive}
          fontFamily="'Plus Jakarta Sans', Inter, 'Schibsted Grotesk', sans-serif"
          fontSize="7.2"
          fontWeight="600"
          letterSpacing="0.8"
        >
          ORDEN EN EL BOLSILLO · FUEGO EN EL CORAZÓN
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 620 150"
      className={className}
      role="img"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
    >
      <Mark colors={colors} x={6} y={20} scale={1.5} />
      <text
        x="122"
        y="45"
        fill={colors.charcoal}
        fontFamily="Lora, 'Playfair Display', Georgia, 'Times New Roman', serif"
        fontSize="33"
        fontWeight="600"
        letterSpacing="-0.7"
      >
        Paz en la mesa,
      </text>
      <text
        x="122"
        y="76"
        fill={colors.olive}
        fontFamily="Lora, 'Playfair Display', Georgia, 'Times New Roman', serif"
        fontSize="27"
        fontWeight="500"
        letterSpacing="-0.4"
      >
        Orden en el bolsillo
      </text>
      <text
        x="122"
        y="104"
        fill={colors.terracotta}
        fontFamily="Lora, 'Playfair Display', Georgia, 'Times New Roman', serif"
        fontSize="27"
        fontWeight="500"
        fontStyle="italic"
        letterSpacing="-0.3"
      >
        y fuego en el corazón
      </text>
      <line
        x1="122"
        y1="118"
        x2="600"
        y2="118"
        stroke={colors.wheat}
        strokeWidth="1"
        opacity="0.65"
      />
      <text
        x="122"
        y="135"
        fill={colors.stone}
        fontFamily="'Plus Jakarta Sans', Inter, 'Schibsted Grotesk', sans-serif"
        fontSize="8.5"
        fontWeight="700"
        letterSpacing="2.1"
      >
        MAIM CASA DE ORACIÓN · PASTORES SAMUEL Y GABBY PALACIO
      </text>
    </svg>
  );
};

export default PazEnLaMesaLogo;
