import { randomBytes, scrypt, scryptSync, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

type ScryptAsync = (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

const scryptAsync = promisify(scrypt) as unknown as ScryptAsync;

/**
 * Parámetros de scrypt equivalentes a un coste de memoria de 32 MiB. OWASP
 * admite scrypt como alternativa segura a Argon2id cuando la plataforma no
 * dispone de una implementación auditada.
 */
const SCRYPT_N = 32768;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;
const MAX_MEMORY = 96 * 1024 * 1024;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password.normalize('NFKC'), salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEMORY,
  })) as Buffer;
  return [
    'scrypt',
    `N=${SCRYPT_N}`,
    `r=${SCRYPT_R}`,
    `p=${SCRYPT_P}`,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

/** Variante síncrona reservada al sembrado de fixtures de prueba. */
export function hashPasswordSync(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password.normalize('NFKC'), salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: MAX_MEMORY,
  });
  return [
    'scrypt',
    `N=${SCRYPT_N}`,
    `r=${SCRYPT_R}`,
    `p=${SCRYPT_P}`,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const n = Number(parts[1].replace('N=', ''));
  const r = Number(parts[2].replace('r=', ''));
  const p = Number(parts[3].replace('p=', ''));
  const salt = Buffer.from(parts[4], 'base64url');
  const expected = Buffer.from(parts[5], 'base64url');
  // Los parámetros se leen de la base de datos: acotarlos evita que un hash
  // corrupto o manipulado provoque un consumo desmedido de memoria o CPU.
  const paramsSafe =
    Number.isInteger(n) &&
    n >= 16_384 &&
    n <= 1_048_576 &&
    (n & (n - 1)) === 0 &&
    Number.isInteger(r) &&
    r >= 1 &&
    r <= 16 &&
    Number.isInteger(p) &&
    p >= 1 &&
    p <= 4;
  const materialSafe =
    salt.length >= 8 &&
    salt.length <= 64 &&
    expected.length >= 32 &&
    expected.length <= 128;
  if (!paramsSafe || !materialSafe) return false;

  try {
    const derived = (await scryptAsync(password.normalize('NFKC'), salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: MAX_MEMORY,
    })) as Buffer;
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Contraseña inicial de 32 bytes de entropía, apta para entrega única. */
export function generateInitialPassword(): string {
  return randomBytes(32).toString('base64url');
}

export interface PasswordPolicyResult {
  ok: boolean;
  message?: string;
}

export function validatePasswordStrength(password: string): PasswordPolicyResult {
  if (password.length < 12) {
    return { ok: false, message: 'La contraseña debe tener al menos 12 caracteres.' };
  }
  if (password.length > 200) {
    return { ok: false, message: 'La contraseña no puede exceder 200 caracteres.' };
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      ok: false,
      message: 'La contraseña debe combinar mayúsculas, minúsculas y números.',
    };
  }
  return { ok: true };
}
