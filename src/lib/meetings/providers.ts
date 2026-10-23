export type MeetingProviderId =
  | 'google_meet'
  | 'jitsi'
  | 'daily'
  | 'bigbluebutton'
  | 'zoom'
  | 'teams'
  | 'custom';

export type MeetingEmbedMode = 'iframe' | 'external' | 'sdk';

export interface MeetingProviderDefinition {
  id: MeetingProviderId;
  label: string;
  shortLabel: string;
  description: string;
  defaultEmbedMode: MeetingEmbedMode;
  supportsEmbed: boolean;
  accent: string;
  hosts: string[];
}

export const DEFAULT_MEETING_URL = 'https://meet.google.com/vts-kbvh-xij';

export const MEETING_PROVIDERS: MeetingProviderDefinition[] = [
  {
    id: 'google_meet',
    label: 'Google Meet',
    shortLabel: 'Meet',
    description: 'Enlace institucional. Se abre en una pestaña segura; Google Meet no permite iframe.',
    defaultEmbedMode: 'external',
    supportsEmbed: false,
    accent: '#1a73e8',
    hosts: ['meet.google.com'],
  },
  {
    id: 'jitsi',
    label: 'Jitsi Meet',
    shortLabel: 'Jitsi',
    description: 'Videollamada embebida dentro del aula. Requiere una sala privada o JaaS.',
    defaultEmbedMode: 'iframe',
    supportsEmbed: true,
    accent: '#0b6b43',
    hosts: ['meet.jit.si', '8x8.vc'],
  },
  {
    id: 'daily',
    label: 'Daily',
    shortLabel: 'Daily',
    description: 'Sala premium embebible. Configura el enlace y, si aplica, el token del proveedor.',
    defaultEmbedMode: 'iframe',
    supportsEmbed: true,
    accent: '#0f766e',
    hosts: ['daily.co'],
  },
  {
    id: 'bigbluebutton',
    label: 'BigBlueButton',
    shortLabel: 'BBB',
    description: 'Sala académica con pizarra compartida y grabación.',
    defaultEmbedMode: 'iframe',
    supportsEmbed: true,
    accent: '#1d4ed8',
    hosts: ['bigbluebutton.org'],
  },
  {
    id: 'zoom',
    label: 'Zoom',
    shortLabel: 'Zoom',
    description: 'Enlace de Zoom. Se abre en una pestaña externa.',
    defaultEmbedMode: 'external',
    supportsEmbed: false,
    accent: '#2d8cff',
    hosts: ['zoom.us'],
  },
  {
    id: 'teams',
    label: 'Microsoft Teams',
    shortLabel: 'Teams',
    description: 'Reunión de Teams. Se abre en una pestaña externa.',
    defaultEmbedMode: 'external',
    supportsEmbed: false,
    accent: '#464eb8',
    hosts: ['teams.microsoft.com', 'teams.live.com'],
  },
  {
    id: 'custom',
    label: 'Otro proveedor',
    shortLabel: 'Otro',
    description: 'Cualquier enlace HTTPS validado manualmente por el administrador.',
    defaultEmbedMode: 'external',
    supportsEmbed: false,
    accent: '#6b7280',
    hosts: [],
  },
];

export function getMeetingProvider(id: string): MeetingProviderDefinition {
  return MEETING_PROVIDERS.find((provider) => provider.id === id) || MEETING_PROVIDERS[6];
}

export function providerLabel(id: string): string {
  return getMeetingProvider(id).label;
}

export function providerShortLabel(id: string): string {
  return getMeetingProvider(id).shortLabel;
}

export function providerAccent(id: string): string {
  return getMeetingProvider(id).accent;
}

function hostMatches(hostname: string, allowed: string): boolean {
  return hostname === allowed || hostname.endsWith(`.${allowed}`);
}

export function validateMeetingUrl(
  providerId: string,
  rawUrl: string
): { ok: true; url: string } | { ok: false; message: string } {
  const value = String(rawUrl || '').trim();
  if (!value) return { ok: false, message: 'El enlace de la reunión es obligatorio.' };
  if (value.length > 2048) return { ok: false, message: 'El enlace es demasiado largo.' };

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, message: 'El enlace no es una URL válida.' };
  }
  if (url.protocol !== 'https:') {
    return { ok: false, message: 'El enlace debe usar HTTPS.' };
  }
  if (url.username || url.password) {
    return { ok: false, message: 'El enlace no puede incluir credenciales embebidas.' };
  }

  const provider = getMeetingProvider(providerId);
  const hostname = url.hostname.toLowerCase();
  if (provider.id !== 'custom' && !provider.hosts.some((host) => hostMatches(hostname, host))) {
    return {
      ok: false,
      message: `El enlace no corresponde a ${provider.label}. Revisa el dominio o selecciona “Otro proveedor”.`,
    };
  }

  if (provider.id === 'google_meet') {
    const code = url.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    if (!/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(code)) {
      return {
        ok: false,
        message: 'El código de Google Meet debe tener el formato xxx-xxxx-xxx.',
      };
    }
  }

  if (provider.id === 'bigbluebutton' && !/bigbluebutton|mod\/bigbluebuttonbn/i.test(url.pathname)) {
    return {
      ok: false,
      message: 'El enlace debe corresponder a una sala BigBlueButton.',
    };
  }

  return { ok: true, url: url.toString() };
}

export function detectProvider(rawUrl: string): MeetingProviderId | null {
  const value = String(rawUrl || '').trim();
  if (!value) return null;
  try {
    const host = new URL(value).hostname.toLowerCase();
    for (const provider of MEETING_PROVIDERS) {
      if (provider.id === 'custom') continue;
      if (provider.hosts.some((allowed) => hostMatches(host, allowed))) return provider.id;
    }
  } catch {
    return null;
  }
  return null;
}

export function resolveEmbedMode(
  providerId: string,
  requested?: string | null
): MeetingEmbedMode {
  const provider = getMeetingProvider(providerId);
  if (requested === 'iframe' || requested === 'external' || requested === 'sdk') {
    return requested;
  }
  return provider.defaultEmbedMode;
}
