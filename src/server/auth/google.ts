import { OAuth2Client } from 'google-auth-library';
import { googleClientId, ownerEmail } from '../config';
import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import { ApiError, type RequestMeta } from '../http/api';
import { randomToken, sha256 } from '../security/random';

export interface VerifiedGoogleClaims {
  subject: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

interface GooglePayload {
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
}

/**
 * Verifica el ID token con la librería oficial de Google. Comprueba firma,
 * emisor, audiencia y expiración; no se confía en datos enviados por el
 * navegador.
 */
export async function verifyGoogleIdToken(credential: string): Promise<VerifiedGoogleClaims> {
  const clientId = googleClientId();
  if (!clientId) {
    throw new ApiError(
      503,
      'GOOGLE_NOT_CONFIGURED',
      'El inicio de sesión con Google no está configurado en este entorno.'
    );
  }
  if (!credential || credential.length > 8000) {
    throw new ApiError(400, 'GOOGLE_CREDENTIAL_INVALID', 'Credencial de Google no válida.');
  }

  const client = new OAuth2Client(clientId);
  let payload: GooglePayload | undefined;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload() as GooglePayload | undefined;
  } catch {
    throw new ApiError(401, 'GOOGLE_TOKEN_INVALID', 'No fue posible verificar la identidad de Google.');
  }

  if (!payload?.sub || !payload.email) {
    throw new ApiError(401, 'GOOGLE_TOKEN_INVALID', 'La identidad de Google está incompleta.');
  }
  const emailVerified =
    payload.email_verified === true || payload.email_verified === 'true';
  if (!emailVerified) {
    throw new ApiError(403, 'GOOGLE_EMAIL_UNVERIFIED', 'El correo de Google no está verificado.');
  }

  return {
    subject: payload.sub,
    email: payload.email.trim().toLowerCase(),
    emailVerified: true,
    name: payload.name?.trim() || null,
    picture: payload.picture || null,
  };
}

export interface GoogleLoginResult {
  userId: string;
  created: boolean;
  linked: boolean;
}

function normalizeUsername(email: string): string {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 24) || 'usuario';
  let candidate = base;
  let suffix = 1;
  while (prepare('SELECT id FROM users WHERE username = ?').get(candidate)) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

/**
 * Vincula o crea la identidad a partir de claims YA VERIFICADOS. No promueve
 * cuentas por correo: la cuenta del creador debe existir previamente con rol
 * platform_owner, creada por el procedimiento de aprovisionamiento.
 */
export function loginWithVerifiedGoogleClaims(
  claims: VerifiedGoogleClaims,
  meta: RequestMeta
): GoogleLoginResult {
  if (!claims.emailVerified) {
    throw new ApiError(403, 'GOOGLE_EMAIL_UNVERIFIED', 'El correo de Google no está verificado.');
  }

  return withTransaction(() => {
    const now = nowIso();
    let userId: string;
    let created = false;
    let linked = false;

    const identity = prepare(`
      SELECT id, user_id FROM identities WHERE provider = 'google' AND subject = ?
    `).get(claims.subject) as { id: string; user_id: string } | undefined;

    if (identity) {
      userId = identity.user_id;
      const userRow = prepare('SELECT status, email FROM users WHERE id = ?').get(userId) as
        | { status: string; email: string }
        | undefined;
      if (!userRow || userRow.status !== 'active') {
        throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'La cuenta está suspendida.');
      }
      if (userRow.email.toLowerCase() !== claims.email) {
        throw new ApiError(
          403,
          'IDENTITY_EMAIL_MISMATCH',
          'El correo verificado no coincide con la cuenta vinculada.'
        );
      }
      prepare('UPDATE identities SET last_login_at = ?, email_verified = 1 WHERE id = ?').run(
        now,
        identity.id
      );
    } else {
      const existing = prepare('SELECT * FROM users WHERE email = ?').get(claims.email) as
        | {
            id: string;
            email: string;
            status: string;
            display_name: string | null;
            email_verified: number;
          }
        | undefined;

      if (existing) {
        if (existing.status !== 'active') {
          throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'La cuenta está suspendida.');
        }
        userId = existing.id;
        linked = true;

        const ownerRole = prepare(`
          SELECT 1 AS present FROM user_roles
          WHERE user_id = ? AND role_code = 'platform_owner' AND revoked_at IS NULL
        `).get(userId) as { present: number } | undefined;
        if (ownerRole) {
          if (existing.email.toLowerCase() !== ownerEmail()) {
            throw new ApiError(403, 'OWNER_IDENTITY_MISMATCH', 'La identidad no corresponde a la cuenta creadora.');
          }
          const pinned = prepare('SELECT value FROM settings WHERE key = ?').get('owner_google_sub') as
            | { value: string }
            | undefined;
          if (pinned && pinned.value !== claims.subject) {
            throw new ApiError(403, 'OWNER_IDENTITY_MISMATCH', 'Esta cuenta creadora ya está vinculada a otra identidad Google.');
          }
          if (!pinned) {
            prepare(
              'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)'
            ).run('owner_google_sub', claims.subject, now);
          }
        }
      } else {
        userId = `usr_${randomToken(16)}`;
        created = true;
        prepare(`
          INSERT INTO users
            (id, email, email_verified, display_name, username, status, is_minor, avatar_url,
             created_at, updated_at)
          VALUES (?, ?, 1, ?, ?, 'active', 0, ?, ?, ?)
        `).run(
          userId,
          claims.email,
          claims.name || claims.email.split('@')[0],
          normalizeUsername(claims.email),
          claims.picture,
          now,
          now
        );
        prepare(`
          INSERT INTO user_roles (id, user_id, role_code, granted_by, granted_at)
          VALUES (?, ?, 'customer', 'system_google', ?)
        `).run(`ur_${randomToken(12)}`, userId, now);
      }

      prepare(`
        INSERT INTO identities
          (id, user_id, provider, subject, email, email_verified, created_at, last_login_at)
        VALUES (?, ?, 'google', ?, ?, 1, ?, ?)
      `).run(`idn_${randomToken(16)}`, userId, claims.subject, claims.email, now, now);

      prepare(`
        UPDATE users
        SET email_verified = 1, avatar_url = COALESCE(avatar_url, ?), updated_at = ?
        WHERE id = ?
      `).run(claims.picture, now, userId);
    }

    const userEmail = (prepare('SELECT email FROM users WHERE id = ?').get(userId) as {
      email: string;
    }).email;
    prepare(`
      INSERT INTO crm_contacts (id, email, name, status, created_at, updated_at)
      VALUES (?, ?, ?, 'customer', ?, ?)
      ON CONFLICT(email) DO UPDATE SET updated_at = excluded.updated_at
    `).run(`ctc_${randomToken(12)}`, userEmail, claims.name || userEmail, now, now);

    void meta;
    void sha256;
    return { userId, created, linked };
  });
}
