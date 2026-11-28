import 'dotenv/config';
import { prepare, withTransaction } from '../src/server/db';
import { nowIso } from '../src/server/db/sqlite';
import { generateInitialPassword, hashPassword } from '../src/server/auth/passwords';
import { findUserByIdentifier, uniqueUsernameFromEmail } from '../src/server/domain/users';
import { randomToken } from '../src/server/security/random';

/**
 * Aprovisiona las cuentas administrativas individuales del taller para:
 * - Mauricio (platform_owner existente o principal_admin)
 * - Gabby (PAZ_ADMIN_GABBY_EMAIL)
 * - Samuel (PAZ_ADMIN_SAMUEL_EMAIL)
 * - Karen (PAZ_ADMIN_KAREN_EMAIL)
 *
 * Nunca almacena contraseñas en texto plano en el repositorio ni en logs de auditoría.
 * Si falta el correo de un administrador, reporta el estado pendiente sin inventar datos.
 */
async function main() {
  const targets = [
    { name: 'Mauricio', email: (process.env.PAZ_ADMIN_MAURICIO_EMAIL || process.env.PLATFORM_OWNER_EMAIL || '').trim().toLowerCase() },
    { name: 'Gabby', email: (process.env.PAZ_ADMIN_GABBY_EMAIL || '').trim().toLowerCase() },
    { name: 'Samuel', email: (process.env.PAZ_ADMIN_SAMUEL_EMAIL || '').trim().toLowerCase() },
    { name: 'Karen', email: (process.env.PAZ_ADMIN_KAREN_EMAIL || '').trim().toLowerCase() },
  ];

  const now = nowIso();

  for (const target of targets) {
    if (!target.email || target.email === 'owner@example.com') {
      console.log(`[PENDIENTE] ${target.name}: falta correo electrónico real en variable de entorno.`);
      continue;
    }

    const existing = findUserByIdentifier(target.email);
    if (existing) {
      withTransaction(() => {
        prepare(`
          INSERT OR IGNORE INTO user_roles (user_id, role_code, granted_at)
          VALUES (?, 'principal_admin', ?)
        `).run(existing.id, now);
      });
      console.log(`[ACTIVO] ${target.name} (${target.email}): rol administrativo verificado.`);
      continue;
    }

    const tempPassword = generateInitialPassword();
    const passwordHash = await hashPassword(tempPassword);
    const userId = `usr_${randomToken(16)}`;
    const username = uniqueUsernameFromEmail(target.email);

    withTransaction(() => {
      prepare(`
        INSERT INTO users
          (id, email, email_verified, display_name, username, password_hash,
           must_change_password, status, is_minor, created_at, updated_at)
        VALUES (?, ?, 1, ?, ?, ?, 1, 'active', 0, ?, ?)
      `).run(userId, target.email, target.name, username, passwordHash, now, now);

      prepare(`
        INSERT OR IGNORE INTO user_roles (user_id, role_code, granted_at)
        VALUES (?, 'principal_admin', ?)
      `).run(userId, now);
    });

    console.log(
      `[CREADO] ${target.name} (${target.email}) -> contraseña temporal generada (entregar por canal privado y cambiar en primer acceso): ${tempPassword}`
    );
  }
}

main().catch((err) => {
  console.error('Error aprovisionando administradores:', err);
  process.exit(1);
});
