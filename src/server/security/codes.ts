import { prepare } from '../db';
import { nowIso } from '../db/sqlite';
import { hmacSha256, normalizeCode, randomToken } from './random';

/**
 * Pepper para hashes de códigos. Se prefiere la variable de entorno; en
 * desarrollo se genera una sola vez y se guarda fuera del código fuente.
 */
export function getCodePepper(): string {
  const configured = process.env.CODE_HASH_PEPPER?.trim();
  if (configured) return configured;
  const row = prepare("SELECT value FROM settings WHERE key = 'code_hash_pepper'").get() as
    | { value: string }
    | undefined;
  if (row?.value) return row.value;
  const generated = randomToken(32);
  prepare(
    "INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('code_hash_pepper', ?, ?)"
  ).run(generated, nowIso());
  return generated;
}

export function hashCode(code: string): string {
  return hmacSha256(normalizeCode(code), getCodePepper());
}
