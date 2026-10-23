import { prepare, nowIso } from '../../src/server/db';
import { randomToken } from '../../src/server/security/random';
import { loadAuthUser, type AuthUser } from '../../src/server/auth/authorization';

export function createUser(input: {
  email: string;
  name?: string;
  roles?: string[];
  emailVerified?: boolean;
  isMinor?: boolean;
}): string {
  const id = `usr_test_${randomToken(12)}`;
  const now = nowIso();
  prepare(`
    INSERT INTO users
      (id, email, email_verified, display_name, username, status, is_minor, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)
  `).run(
    id,
    input.email.toLowerCase(),
    input.emailVerified === false ? 0 : 1,
    input.name || input.email,
    input.email.split('@')[0].replace(/[^a-z0-9._-]/gi, '').slice(0, 20) + randomToken(3),
    input.isMinor ? 1 : 0,
    now,
    now
  );
  for (const role of input.roles || ['customer']) {
    prepare(`
      INSERT INTO user_roles (id, user_id, role_code, granted_by, granted_at)
      VALUES (?, ?, ?, 'test', ?)
    `).run(`ur_${randomToken(12)}`, id, role, now);
  }
  return id;
}

export function actor(userId: string): AuthUser {
  const user = loadAuthUser(userId);
  if (!user) throw new Error(`No se pudo cargar el actor ${userId}`);
  return user;
}

export function resourceId(slug: string): string {
  const row = prepare('SELECT id FROM resources WHERE slug = ?').get(slug) as { id: string } | undefined;
  if (!row) throw new Error(`Recurso no encontrado: ${slug}`);
  return row.id;
}

export function productId(slug: string): string {
  const row = prepare('SELECT id FROM products WHERE slug = ?').get(slug) as { id: string } | undefined;
  if (!row) throw new Error(`Producto no encontrado: ${slug}`);
  return row.id;
}

export function tableCount(table: string, where = '1=1', ...params: Array<string | number>): number {
  const row = prepare(`SELECT COUNT(*) AS total FROM ${table} WHERE ${where}`).get(...params) as {
    total: number;
  };
  return Number(row.total);
}
