import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Genera un token URL-safe con la entropía solicitada. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Hash SHA-256 para identificadores de sesión y datos de red. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** HMAC-SHA256 para códigos secretos y comparaciones resistentes a filtraciones. */
export function hmacSha256(value: string, pepper: string): string {
  return createHmac('sha256', pepper).update(value).digest('hex');
}

/** Comparación en tiempo constante de dos cadenas. */
export function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Codifica bytes en Base32 Crockford, sin caracteres ambiguos. Se usa para
 * códigos que un humano debe transcribir sin errores.
 */
export function base32Crockford(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += CROCKFORD[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += CROCKFORD[(value << (5 - bits)) & 31];
  }
  return output;
}

/** Normaliza un código escrito por una persona. */
export function normalizeCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/O/g, '0')
    .replace(/I/g, '1')
    .replace(/L/g, '1');
}

/** Genera un código legible de alta entropía (20 bytes ≈ 100 bits). */
export function generateHumanCode(prefix: string, bytes = 20): string {
  const raw = base32Crockford(randomBytes(bytes));
  const groups = raw.match(/.{1,5}/g) ?? [raw];
  return `${prefix}-${groups.join('-')}`;
}

/** Pista no reversible para mostrar un código sin revelarlo. */
export function codeHint(code: string): string {
  const normalized = normalizeCode(code);
  const tail = normalized.slice(-4);
  const prefix = normalized.slice(0, 4);
  return `${prefix}-…-${tail}`;
}

export function hashClientIp(value: string, salt: string): string {
  return sha256(`${salt}:${value}`);
}
