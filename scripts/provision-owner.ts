/**
 * Aprovisionamiento seguro de la cuenta creadora de Wisdom Academy.
 *
 * - Genera 32 bytes de entropía con randomBytes y almacena solo scrypt.
 * - Nunca imprime la contraseña: la escribe en un archivo fuera del repositorio
 *   con permisos restringidos y muestra únicamente la ruta.
 * - No utiliza el correo del navegador para conceder privilegios: crea el rol
 *   platform_owner en la base y el posterior inicio de sesión con Google exige
 *   un token verificado y la coincidencia con esta cuenta.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { db, nowIso } from '../src/server/db';
import { prepare } from '../src/server/db';
import {
  generateInitialPassword,
  hashPassword,
} from '../src/server/auth/passwords';
import { authenticateWithPassword } from '../src/server/domain/users';
import { loadAuthUser } from '../src/server/auth/authorization';
import {
  grantGlobalAccess,
  findResourceBySlug,
  userCanAccessResource,
} from '../src/server/domain/access';
import { ownerEmail } from '../src/server/config';
import { randomToken } from '../src/server/security/random';

interface OwnerRow {
  id: string;
  email: string;
  password_hash: string | null;
  must_change_password: number;
}

function credentialPath(): string {
  const configured = process.env.OWNER_CREDENTIALS_FILE?.trim();
  if (configured) return path.resolve(configured);
  return path.join(os.homedir(), '.wisdom-academy', 'owner-initial-credential.txt');
}

function writeProtectedCredential(input: {
  email: string;
  password: string;
  createdAt: string;
}): string {
  const target = credentialPath();
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });

  const content = [
    'WISDOM ACADEMY · CREDENCIAL INICIAL DEL CREADOR',
    '================================================',
    `Cuenta: ${input.email}`,
    `Contraseña inicial: ${input.password}`,
    `Generada: ${input.createdAt}`,
    '',
    'Esta contraseña se muestra una sola vez. Cámbiala inmediatamente en:',
    '  /cambiar-contrasena',
    '',
    'Después del primer cambio, elimina este archivo de forma segura.',
    'El archivo está fuera del repositorio y no debe copiarse a Git, correo',
    'sin cifrar, capturas de pantalla ni registros.',
    '',
  ].join('\n');

  fs.writeFileSync(target, content, { encoding: 'utf8', mode: 0o600, flag: 'w' });
  try {
    fs.chmodSync(target, 0o600);
  } catch {
    // Windows puede ignorar chmod; se aplica una ACL best-effort.
  }

  if (process.platform === 'win32' && process.env.USERNAME) {
    try {
      execFileSync(
        'icacls',
        [target, '/inheritance:r', '/grant:r', `${process.env.USERNAME}:F`],
        { stdio: 'ignore' }
      );
    } catch {
      // La ACL del perfil de usuario sigue siendo la protección principal.
    }
  }
  return target;
}

function ensureOwnerRole(userId: string): void {
  const now = nowIso();
  const ownerRole = prepare(`
    SELECT 1 AS present FROM user_roles
    WHERE user_id = ? AND role_code = 'platform_owner' AND revoked_at IS NULL
  `).get(userId);
  if (!ownerRole) {
    prepare(`
      INSERT INTO user_roles (id, user_id, role_code, granted_by, granted_at)
      VALUES (?, ?, 'platform_owner', 'provisioning_cli', ?)
    `).run(`ur_owner_${randomToken(12)}`, userId, now);
  }

  const otherOwners = prepare(`
    SELECT u.id FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    WHERE ur.role_code = 'platform_owner' AND ur.revoked_at IS NULL AND u.id <> ?
  `).all(userId) as Array<{ id: string }>;
  if (otherOwners.length > 0) {
    throw new Error(
      'Ya existe otra cuenta con rol platform_owner. Revisa la base antes de continuar.'
    );
  }
}

async function main(): Promise<void> {
  db();
  const rotate = process.argv.includes('--rotate');
  const email = ownerEmail();
  const existing = prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | OwnerRow
    | undefined;

  if (existing) {
    const ownerRole = prepare(`
      SELECT 1 AS present FROM user_roles
      WHERE user_id = ? AND role_code = 'platform_owner' AND revoked_at IS NULL
    `).get(existing.id);
    if (!ownerRole && !rotate) {
      console.log(
        `La cuenta ${email} existe pero no es creadora. Usa --rotate para aprovisionarla como platform_owner.`
      );
      process.exitCode = 1;
      return;
    }
    if (!rotate) {
      const path = credentialPath();
      console.log(`La cuenta creadora ya existe: ${email}`);
      console.log(`Rol platform_owner: ${ownerRole ? 'verificado' : 'pendiente (usa --rotate)'}.`);
      console.log(
        fs.existsSync(path)
          ? `Credencial protegida existente: ${path}`
          : 'No hay archivo de credencial inicial. Usa --rotate para generar uno nuevo.'
      );
      console.log('No se generó ni mostró ninguna contraseña.');
    }
  }

  const password =
    existing && !rotate ? null : generateInitialPassword();
  const passwordHash = password ? await hashPassword(password) : null;
  const now = nowIso();
  let userId: string;

  if (existing) {
    userId = existing.id;
    if (passwordHash) {
      prepare(`
        UPDATE users
        SET password_hash = ?, password_updated_at = ?, must_change_password = 1,
            status = 'active', updated_at = ?
        WHERE id = ?
      `).run(passwordHash, now, now, userId);
      prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").run(
        now,
        userId
      );
    }
  } else {
    userId = `usr_owner_${randomToken(16)}`;
    prepare(`
      INSERT INTO users
        (id, email, email_verified, display_name, username, password_hash, password_updated_at,
         must_change_password, status, is_minor, created_at, updated_at)
      VALUES (?, ?, 0, ?, ?, ?, ?, 1, 'active', 0, ?, ?)
    `).run(
      userId,
      email,
      'Creador de Wisdom Academy',
      'creador',
      passwordHash,
      now,
      now,
      now
    );
  }

  ensureOwnerRole(userId);
  grantGlobalAccess({
    userId,
    kind: 'owner',
    origin: 'owner_provisioning',
    originRef: 'owner',
    startsAt: now,
    endsAt: null,
    grantedBy: 'provisioning_cli',
  });
  prepare(`
    INSERT INTO crm_contacts (id, email, name, status, created_at, updated_at)
    VALUES (?, ?, 'Creador de Wisdom Academy', 'customer', ?, ?)
    ON CONFLICT(email) DO UPDATE SET updated_at = excluded.updated_at
  `).run(`ctc_owner_${randomToken(12)}`, email, now, now);

  if (password) {
    const target = writeProtectedCredential({ email, password, createdAt: now });
    const login = await authenticateWithPassword(email, password);
    const authUser = loadAuthUser(login.userId);
    const program = findResourceBySlug('programa-homeschool-8-egb');
    const accessOk =
      Boolean(authUser?.isOwner) &&
      Boolean(program) &&
      Boolean(authUser && program && userCanAccessResource(authUser, program));

    if (!authUser || !authUser.isOwner || !accessOk) {
      console.error('La verificación interna del aprovisionamiento falló. Revisa la base.');
      process.exitCode = 1;
      return;
    }

    console.log('Aprovisionamiento del creador completado y verificado localmente.');
    console.log(`Cuenta: ${email}`);
    console.log('Rol: platform_owner (permisos formativos y administrativos globales).');
    console.log(`Credencial inicial protegida: ${target}`);
    console.log('La contraseña no se imprime en la consola ni se registra en Git.');
    console.log('Completa el cambio en /cambiar-contrasena en el primer acceso.');
  } else {
    console.log('La cuenta creadora ya estaba aprovisionada. No se generó una nueva contraseña.');
    console.log('Usa --rotate si necesitas una credencial inicial nueva.');
  }
}

main().catch((error) => {
  console.error('No fue posible aprovisionar la cuenta creadora:', error instanceof Error ? error.message : 'error desconocido');
  process.exitCode = 1;
});
