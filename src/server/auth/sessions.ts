import type { NextRequest, NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  SESSION_TTL_SECONDS,
  isProduction,
} from '../config';
import { prepare } from '../db';
import { nowIso } from '../db/sqlite';
import { randomToken, sha256 } from '../security/random';
import { loadAuthUser, type AuthUser } from './authorization';

export interface RequestMeta {
  ipHash: string | null;
  uaHash: string | null;
}

export interface SessionRecord {
  tokenHash: string;
  csrfToken: string;
  expiresAt: string;
  user: AuthUser;
}

export interface CreatedSession {
  token: string;
  csrfToken: string;
  expiresAt: string;
}

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key === name) return decodeURIComponent(valueParts.join('='));
  }
  return null;
}

/**
 * Elimina sesiones caducadas y revocadas antiguas. Se ejecuta al crear una
 * sesión nueva para evitar que la tabla crezca indefinidamente.
 */
function pruneStaleSessions(now: Date): void {
  const revokedCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  prepare(
    'DELETE FROM sessions WHERE expires_at <= ? OR (revoked_at IS NOT NULL AND revoked_at <= ?)'
  ).run(now.toISOString(), revokedCutoff);
}

export function createSession(
  userId: string,
  meta: RequestMeta,
  ttlMs = SESSION_TTL_MS
): CreatedSession {
  const token = randomToken(32);
  const csrfToken = randomToken(24);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMs).toISOString();

  prepare(`
    INSERT INTO sessions
      (id_hash, user_id, csrf_token, created_at, expires_at, last_seen_at, ip_hash, ua_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sha256(token),
    userId,
    csrfToken,
    now.toISOString(),
    expiresAt,
    now.toISOString(),
    meta.ipHash,
    meta.uaHash
  );
  pruneStaleSessions(now);

  return { token, csrfToken, expiresAt };
}

export function loadSessionFromRequest(request: Request): SessionRecord | null {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) return null;
  return loadSessionByToken(token);
}

export function loadSessionByToken(token: string): SessionRecord | null {
  const tokenHash = sha256(token);
  const row = prepare(`
    SELECT id_hash, user_id, csrf_token, expires_at, last_seen_at, revoked_at
    FROM sessions WHERE id_hash = ?
  `).get(tokenHash) as
    | {
        id_hash: string;
        user_id: string;
        csrf_token: string;
        expires_at: string;
        last_seen_at: string;
        revoked_at: string | null;
      }
    | undefined;
  if (!row || row.revoked_at) return null;

  const now = nowIso();
  if (row.expires_at <= now) {
    prepare('UPDATE sessions SET revoked_at = ? WHERE id_hash = ?').run(now, tokenHash);
    return null;
  }

  const user = loadAuthUser(row.user_id);
  if (!user) return null;

  const lastSeen = new Date(row.last_seen_at).getTime();
  if (Date.now() - lastSeen > 5 * 60 * 1000) {
    prepare('UPDATE sessions SET last_seen_at = ? WHERE id_hash = ?').run(now, tokenHash);
  }

  return {
    tokenHash,
    csrfToken: row.csrf_token,
    expiresAt: row.expires_at,
    user,
  };
}

export function revokeSession(token: string): void {
  prepare('UPDATE sessions SET revoked_at = ? WHERE id_hash = ?').run(
    nowIso(),
    sha256(token)
  );
}

export function revokeUserSessions(userId: string, exceptTokenHash?: string): void {
  const now = nowIso();
  if (exceptTokenHash) {
    prepare(
      'UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND id_hash <> ? AND revoked_at IS NULL'
    ).run(now, userId, exceptTokenHash);
    return;
  }
  prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(
    now,
    userId
  );
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    // La excepción solo se admite en el servidor E2E local; en producción
    // real la cookie siempre viaja por HTTPS.
    secure:
      isProduction() &&
      !(process.env.WISDOM_E2E === '1' && process.env.WISDOM_ALLOW_INSECURE_COOKIE === '1'),
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, '', {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}

export function getSessionCookie(request: NextRequest): string | null {
  return request.cookies?.get(SESSION_COOKIE)?.value || readCookie(request, SESSION_COOKIE);
}
