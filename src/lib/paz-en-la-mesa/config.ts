import {
  PAZ_DATES,
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

export const pazPublicConfig = {
  whatsappUrl: envUrl(process.env.NEXT_PUBLIC_PAZ_WHATSAPP_URL, PAZ_PUBLIC_LINKS.whatsappFallback),
  payphoneUrl: envUrl(process.env.NEXT_PUBLIC_PAZ_PAYPHONE_URL, PAZ_PUBLIC_LINKS.payphoneFallback),
  pastorsImage:
    (process.env.NEXT_PUBLIC_PAZ_PASTORS_IMAGE || '').trim() || '/brand/paz-en-la-mesa/portada-paz-en-la-mesa.svg',
  notebookUrl: envHref(process.env.NEXT_PUBLIC_PAZ_NOTEBOOK_URL, ''),
  welcomeVideoUrl: envHref(process.env.NEXT_PUBLIC_PAZ_WELCOME_VIDEO_URL, ''),
  studentLiveUrl: envHref(process.env.NEXT_PUBLIC_PAZ_STUDENT_LIVE_URL, ''),
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
