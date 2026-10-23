/**
 * Validación y normalización de enlaces de YouTube.
 *
 * Solo se aceptan identificadores de 11 caracteres. Nunca se almacena ni se
 * renderiza HTML/iframe enviado por el usuario: la URL de inserción se construye
 * aquí a partir de una lista cerrada de formatos y del ID validado.
 */

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export type YouTubeEmbedOptions = {
  privacyEnhanced?: boolean;
  startSeconds?: number;
};

function safeUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

function idFromPath(value: string): string | null {
  const candidate = value.split('/')[0];
  return VIDEO_ID_PATTERN.test(candidate) ? candidate : null;
}

/**
 * Extrae el ID de video de los formatos admitidos. Devuelve null si el enlace
 * no es de YouTube o no contiene un ID con estructura válida.
 */
export function extractYouTubeVideoId(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  if (VIDEO_ID_PATTERN.test(raw.trim())) return raw.trim();

  const url = safeUrl(raw);
  if (!url) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const allowedHosts = new Set([
    'youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtube-nocookie.com',
    'youtu.be',
  ]);
  if (!allowedHosts.has(host)) return null;

  if (host === 'youtu.be') {
    return idFromPath(url.pathname.replace(/^\//, ''));
  }

  const directQuery = url.searchParams.get('v');
  if (directQuery && VIDEO_ID_PATTERN.test(directQuery)) return directQuery;

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length >= 2) {
    const [kind, id] = segments;
    if (['embed', 'shorts', 'live', 'v'].includes(kind.toLowerCase())) {
      return idFromPath(id);
    }
  }
  return null;
}

export function normalizeYouTubeVideoIds(values: unknown): {
  ids: string[];
  invalid: string[];
  duplicates: string[];
} {
  const ids: string[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];
  const list = Array.isArray(values) ? values : typeof values === 'string' ? [values] : [];

  for (const value of list) {
    if (typeof value !== 'string') {
      invalid.push(String(value));
      continue;
    }
    const id = extractYouTubeVideoId(value);
    if (!id) {
      invalid.push(value);
      continue;
    }
    if (ids.includes(id)) {
      if (!duplicates.includes(id)) duplicates.push(id);
      continue;
    }
    ids.push(id);
  }
  return { ids, invalid, duplicates };
}

export function buildYouTubeEmbedUrl(
  videoId: string,
  options: YouTubeEmbedOptions = {}
): string {
  if (!VIDEO_ID_PATTERN.test(videoId)) {
    throw new Error('El identificador de video de YouTube no es válido.');
  }
  const host = options.privacyEnhanced === false ? 'www.youtube.com' : 'www.youtube-nocookie.com';
  const params = new URLSearchParams({ rel: '0', modestbranding: '1' });
  if (typeof options.startSeconds === 'number' && Number.isFinite(options.startSeconds) && options.startSeconds > 0) {
    params.set('start', String(Math.floor(options.startSeconds)));
  }
  return `https://${host}/embed/${videoId}?${params.toString()}`;
}

export function buildYouTubeWatchUrl(videoId: string): string {
  if (!VIDEO_ID_PATTERN.test(videoId)) {
    throw new Error('El identificador de video de YouTube no es válido.');
  }
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function isValidYouTubeVideoId(value: unknown): value is string {
  return typeof value === 'string' && VIDEO_ID_PATTERN.test(value);
}
