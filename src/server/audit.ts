import { prepare } from './db';
import { nowIso } from './db/sqlite';
import type { AuthUser } from './auth/authorization';
import type { RequestMeta } from './http/api';
import { randomToken } from './security/random';

const SENSITIVE_KEYS = new Set([
  'password',
  'contrasenia',
  'password_hash',
  'passwordHash',
  'token',
  'token_hash',
  'code',
  'code_hash',
  'secret',
  'client_secret',
  'authorization',
  'csrf',
  'csrfToken',
]);

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[omitted]';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitize(item, depth + 1));
  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key)) continue;
      output[key] = sanitize(item, depth + 1);
    }
    return output;
  }
  if (typeof value === 'string' && value.length > 1000) return value.slice(0, 1000);
  return value;
}

export function writeAudit(input: {
  actor?: AuthUser | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  meta?: RequestMeta;
}): void {
  prepare(`
    INSERT INTO audit_log
      (id, actor_user_id, actor_role, action, entity_type, entity_id, before_json, after_json,
       ip_hash, ua_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomToken(16),
    input.actor?.id ?? null,
    input.actor?.primaryRole ?? null,
    input.action,
    input.entityType,
    input.entityId ?? null,
    input.before === undefined ? null : JSON.stringify(sanitize(input.before)),
    input.after === undefined ? null : JSON.stringify(sanitize(input.after)),
    input.meta?.ipHash ?? null,
    input.meta?.uaHash ?? null,
    nowIso()
  );
}
