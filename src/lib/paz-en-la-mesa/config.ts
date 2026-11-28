import {
  PAZ_DATES,
  PAZ_OFFICIAL_WHATSAPP_NUMBER_RAW,
  PAZ_OFFICIAL_WHATSAPP_PHONE,
  PAZ_PRICING,
  PAZ_PUBLIC_LINKS,
  type PazPhase,
} from './content';

function envDate(value: string | undefined, fallback: string): Date {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(fallback);
}

function envUrl(value: string | undefined, fallback: string): string {
  const candidate = (value || fallback || '').trim();
  if (!candidate) return '';
  try {
    const url = new URL(candidate);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.toString();
  } catch {
    return '';
  }
  return '';
}

function envHref(value: string | undefined, fallback: string): string {
  const candidate = (value || fallback || '').trim();
  if (!candidate) return '';
  if (candidate.startsWith('/')) return candidate;
  return envUrl(candidate, '');
}

/**
 * Enlace oficial de chat de WhatsApp con número internacional (+593998755759).
 */
export function buildOfficialWhatsappChatUrl(message?: string): string {
  const base = `https://wa.me/${PAZ_OFFICIAL_WHATSAPP_NUMBER_RAW}`;
  if (!message || !message.trim()) {
    return `${base}?text=${encodeURIComponent(
      'Hola Wisdom Academy, deseo más información sobre el taller Paz en la mesa, orden en el bolsillo y fuego en el corazón.'
    )}`;
  }
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export const pazPublicConfig = {
  officialWhatsappPhone: PAZ_OFFICIAL_WHATSAPP_PHONE,
  officialWhatsappRaw: PAZ_OFFICIAL_WHATSAPP_NUMBER_RAW,
  whatsappUrl: envUrl(process.env.NEXT_PUBLIC_PAZ_WHATSAPP_URL, PAZ_PUBLIC_LINKS.whatsappFallback),
  whatsappGroupUrl: envUrl(process.env.NEXT_PUBLIC_PAZ_WHATSAPP_GROUP_URL, ''),
  payphoneUrl: envUrl(process.env.NEXT_PUBLIC_PAZ_PAYPHONE_URL, PAZ_PUBLIC_LINKS.payphoneFallback),
  pastorsImage:
    (process.env.NEXT_PUBLIC_PAZ_PASTORS_IMAGE || '').trim() ||
    '/brand/paz-en-la-mesa/pastores-samuel-gabby.jpg',
  trailerVideoUrl: envHref(
    process.env.NEXT_PUBLIC_PAZ_TRAILER_URL ||
      process.env.NEXT_PUBLIC_PAZ_WELCOME_VIDEO_URL,
    'https://www.youtube.com/watch?v=OQUIbCicITA'
  ),
  notebookUrl: envHref(
    process.env.NEXT_PUBLIC_PAZ_NOTEBOOK_URL,
    '/docs/cuaderno-de-trabajo-paz-en-la-mesa.pdf'
  ),
  welcomeVideoUrl: envHref(
    process.env.NEXT_PUBLIC_PAZ_WELCOME_VIDEO_URL,
    'https://www.youtube.com/watch?v=OQUIbCicITA'
  ),
  studentLiveUrl: envHref(process.env.NEXT_PUBLIC_PAZ_STUDENT_LIVE_URL, ''),
  classVideos: {
    class1: envHref(
      process.env.NEXT_PUBLIC_PAZ_CLASS1_VIDEO_URL,
      'https://youtu.be/Fiv6IQ-omIs'
    ),
    class2: envHref(
      process.env.NEXT_PUBLIC_PAZ_CLASS2_VIDEO_URL,
      'https://youtu.be/2QsNl6rIEzA'
    ),
    class3: envHref(
      process.env.NEXT_PUBLIC_PAZ_CLASS3_VIDEO_URL,
      'https://youtu.be/r0jVCPHmYZ0'
    ),
    class4: envHref(
      process.env.NEXT_PUBLIC_PAZ_CLASS4_VIDEO_URL,
      'https://youtu.be/AB6t2eO0SWk'
    ),
  },
  presaleStartsAt: envDate(process.env.NEXT_PUBLIC_PAZ_PRESALE_AT, PAZ_DATES.presaleStart).toISOString(),
  presaleEndsAt: envDate(process.env.NEXT_PUBLIC_PAZ_PRESALE_ENDS_AT, PAZ_DATES.presaleEnds).toISOString(),
  launchAt: envDate(process.env.NEXT_PUBLIC_PAZ_LAUNCH_AT, PAZ_DATES.launch).toISOString(),
  officialStartsAt: envDate(
    process.env.NEXT_PUBLIC_PAZ_OFFICIAL_STARTS_AT,
    PAZ_DATES.officialStarts
  ).toISOString(),
  enrollmentClosesAt: envDate(
    process.env.NEXT_PUBLIC_PAZ_ENROLLMENT_CLOSES_AT,
    PAZ_DATES.enrollmentCloses
  ).toISOString(),
  studentLiveAt: PAZ_DATES.studentLive,
  challengeStartsAt: PAZ_DATES.challengeStarts,
  challengeEndsAt: PAZ_DATES.challengeEnds,
} as const;

export function pazPhaseAt(now: Date = new Date()): PazPhase {
  const forced = (
    process.env.PAZ_FORCE_PHASE ||
    process.env.NEXT_PUBLIC_PAZ_FORCE_PHASE ||
    ''
  ).trim() as PazPhase;
  if (
    forced === 'anticipation' ||
    forced === 'presale' ||
    forced === 'official' ||
    forced === 'closed'
  ) {
    return forced;
  }
  const time = now.getTime();
  if (time < new Date(pazPublicConfig.presaleStartsAt).getTime()) return 'anticipation';
  if (time <= new Date(pazPublicConfig.presaleEndsAt).getTime()) return 'presale';
  if (time <= new Date(pazPublicConfig.enrollmentClosesAt).getTime()) return 'official';
  return 'closed';
}

export function pazPhaseLabel(phase: PazPhase): string {
  switch (phase) {
    case 'anticipation':
      return 'Preventa abre el 3 de diciembre · 20:00';
    case 'presale':
      return 'Preventa Madrugador activa';
    case 'official':
      return 'Precio oficial activo';
    default:
      return 'Inscripciones cerradas';
  }
}

export function pazPriceCentsAt(now: Date = new Date()): number {
  return pazPhaseAt(now) === 'presale' || pazPhaseAt(now) === 'anticipation'
    ? PAZ_PRICING.presaleCents
    : PAZ_PRICING.officialCents;
}

export function pazNextMilestone(now: Date = new Date()): {
  id: 'presale' | 'launch' | 'official' | 'closed';
  label: string;
  targetIso: string;
} {
  const phase = pazPhaseAt(now);
  if (phase === 'anticipation') {
    return {
      id: 'presale',
      label: 'Apertura de preventa',
      targetIso: pazPublicConfig.presaleStartsAt,
    };
  }
  if (phase === 'presale') {
    return {
      id: 'launch',
      label: 'Estreno y liberación de clases',
      targetIso: pazPublicConfig.launchAt,
    };
  }
  if (phase === 'official') {
    return {
      id: 'official',
      label: 'Cierre de inscripciones',
      targetIso: pazPublicConfig.enrollmentClosesAt,
    };
  }
  return { id: 'closed', label: 'Inscripciones cerradas', targetIso: pazPublicConfig.enrollmentClosesAt };
}

export function formatPazUsd(cents: number): string {
  const amount = new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
  return `${PAZ_PRICING.currency} ${amount}`;
}

export function formatPazDate(
  value: string,
  options: Intl.DateTimeFormatOptions = {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: PAZ_DATES.timezone,
  }
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', options).format(date);
}

export function isPazReleased(now: Date = new Date()): boolean {
  return now.getTime() >= new Date(pazPublicConfig.launchAt).getTime();
}

export function isPazPresale(now: Date = new Date()): boolean {
  return pazPhaseAt(now) === 'presale';
}
