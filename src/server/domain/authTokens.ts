import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import { ApiError } from '../http/api';
import { randomToken, sha256 } from '../security/random';
import { hashPassword, validatePasswordStrength } from '../auth/passwords';
import { revokeUserSessions } from '../auth/sessions';
import {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  type MailResult,
} from '../email/mailer';
import { appUrl } from '../config';

export type AuthTokenKind = 'email_verify' | 'password_reset';

interface AuthTokenRow {
  id: string;
  user_id: string;
  kind: AuthTokenKind;
  expires_at: string;
  used_at: string | null;
}

function issueAuthToken(input: {
  userId: string;
  kind: AuthTokenKind;
  ttlMinutes: number;
}): { token: string; expiresAt: string } {
  const raw = randomToken(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + input.ttlMinutes * 60_000).toISOString();
  withTransaction(() => {
    // Un enlace nuevo invalida los anteriores del mismo tipo.
    prepare(
      'UPDATE auth_tokens SET used_at = ? WHERE user_id = ? AND kind = ? AND used_at IS NULL'
    ).run(now.toISOString(), input.userId, input.kind);
    prepare(`
      INSERT INTO auth_tokens (id, user_id, kind, token_hash, expires_at, used_at, created_at)
      VALUES (?, ?, ?, ?, ?, NULL, ?)
    `).run(
      `atk_${randomToken(16)}`,
      input.userId,
      input.kind,
      sha256(raw),
      expiresAt,
      now.toISOString()
    );
  });
  return { token: raw, expiresAt };
}

function loadToken(raw: string, kind: AuthTokenKind): AuthTokenRow {
  if (!raw || raw.length > 200) {
    throw new ApiError(400, 'TOKEN_INVALID', 'El enlace no es válido o ya expiró.');
  }
  const row = prepare(
    'SELECT * FROM auth_tokens WHERE token_hash = ? AND kind = ?'
  ).get(sha256(raw), kind) as AuthTokenRow | undefined;
  if (!row || row.used_at || row.expires_at <= nowIso()) {
    throw new ApiError(400, 'TOKEN_INVALID', 'El enlace no es válido o ya expiró.');
  }
  return row;
}

export function verifyEmailToken(raw: string): { userId: string } {
  const row = loadToken(raw, 'email_verify');
  return withTransaction(() => {
    const updated = prepare(
      'UPDATE auth_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL'
    ).run(nowIso(), row.id);
    if (updated.changes === 0) {
      throw new ApiError(400, 'TOKEN_INVALID', 'El enlace no es válido o ya expiró.');
    }
    prepare('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?').run(
      nowIso(),
      row.user_id
    );
    return { userId: row.user_id };
  });
}

export function createEmailVerificationLink(input: {
  userId: string;
  email: string;
  name: string;
}): { verifyUrl: string; emailResult: Promise<MailResult> } {
  const issued = issueAuthToken({ userId: input.userId, kind: 'email_verify', ttlMinutes: 48 * 60 });
  const verifyUrl = `${appUrl()}/verificar-correo?token=${encodeURIComponent(issued.token)}`;
  return {
    verifyUrl,
    emailResult: sendEmailVerificationEmail({
      to: input.email,
      name: input.name,
      url: verifyUrl,
    }),
  };
}

export function createPasswordResetToken(userId: string): {
  url: string;
  expiresAt: string;
} {
  const issued = issueAuthToken({ userId, kind: 'password_reset', ttlMinutes: 60 });
  return {
    url: `${appUrl()}/restablecer-contrasena?token=${encodeURIComponent(issued.token)}`,
    expiresAt: issued.expiresAt,
  };
}

export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const user = prepare(
    'SELECT id, email, display_name, status FROM users WHERE email = ? COLLATE NOCASE LIMIT 1'
  ).get(email) as
    | { id: string; email: string; display_name: string | null; status: string }
    | undefined;
  // La respuesta pública es siempre genérica; este trabajo solo ocurre si la
  // cuenta existe, está activa y puede iniciar sesión con contraseña.
  if (!user || user.status !== 'active') return;
  const hasPassword = prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as
    | { password_hash: string | null }
    | undefined;
  if (!hasPassword?.password_hash) return;

  const reset = createPasswordResetToken(user.id);
  try {
    await sendPasswordResetEmail({
      to: user.email,
      name: user.display_name || '',
      url: reset.url,
    });
  } catch {
    // No se propaga: la respuesta debe seguir siendo genérica.
  }
}

export async function resetPasswordWithToken(rawToken: string, newPassword: string): Promise<void> {
  const policy = validatePasswordStrength(newPassword);
  if (!policy.ok) {
    throw new ApiError(400, 'WEAK_PASSWORD', policy.message || 'Contraseña débil.');
  }
  const row = loadToken(rawToken, 'password_reset');
  const hash = await hashPassword(newPassword);
  withTransaction(() => {
    const updated = prepare(
      'UPDATE auth_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL'
    ).run(nowIso(), row.id);
    if (updated.changes === 0) {
      throw new ApiError(400, 'TOKEN_INVALID', 'El enlace no es válido o ya expiró.');
    }
    prepare(`
      UPDATE users
      SET password_hash = ?, password_updated_at = ?, must_change_password = 0, updated_at = ?
      WHERE id = ?
    `).run(hash, nowIso(), nowIso(), row.user_id);
  });
  revokeUserSessions(row.user_id);
}
