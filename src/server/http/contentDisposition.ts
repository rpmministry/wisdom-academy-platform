/**
 * Construye una cabecera Content-Disposition compatible con navegadores
 * modernos y con nombres de archivo que contienen acentos u otros caracteres
 * no ASCII. Incluye un nombre ASCII de respaldo y la variante RFC 5987.
 */
export function contentDisposition(
  filename: string,
  disposition: 'inline' | 'attachment' = 'attachment'
): string {
  const base = (filename.split(/[\\/]/).pop() || 'archivo').trim() || 'archivo';
  const ascii = base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\\r\n]/g, '')
    .replace(/[^\w.\- ()]/g, '_')
    .slice(0, 120) || 'archivo';
  const encoded = encodeURIComponent(base)
    .replace(/['()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/**
 * Tipos que el navegador puede ejecutar como documento activo. Nunca deben
 * servirse inline desde el origen de la plataforma.
 */
const ACTIVE_MIME_TYPES = new Set([
  'application/javascript',
  'application/xhtml+xml',
  'application/xml',
  'image/svg+xml',
  'text/html',
  'text/javascript',
  'text/xml',
]);

const ACTIVE_EXTENSIONS = new Set(['.htm', '.html', '.js', '.mjs', '.svg', '.xhtml', '.xml']);

export function isActiveContent(mimeType: string, filename: string): boolean {
  const mime = mimeType.split(';')[0].trim().toLowerCase();
  if (ACTIVE_MIME_TYPES.has(mime)) return true;
  const dot = filename.lastIndexOf('.');
  if (dot < 0) return false;
  return ACTIVE_EXTENSIONS.has(filename.slice(dot).toLowerCase());
}

/** Evita reenviar tipos MIME malformados o vacíos al navegador. */
export function safeMimeType(mimeType: string | null | undefined): string {
  const value = (mimeType || '').split(';')[0].trim().toLowerCase();
  return /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/.test(value)
    ? value
    : 'application/octet-stream';
}
