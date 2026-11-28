import 'dotenv/config';
import { prepare, withTransaction } from '../src/server/db';
import { nowIso } from '../src/server/db/sqlite';
import { generateInitialPassword, hashPassword } from '../src/server/auth/passwords';
import { findUserByIdentifier, uniqueUsernameFromEmail } from '../src/server/domain/users';
import { randomToken } from '../src/server/security/random';
import { writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Aprovisiona las cuentas administrativas individuales del taller "Paz en la mesa" para:
 * - Gabby
 * - Samuel
 * - Karen
 *
 * Genera contraseñas temporales y escribe un archivo de credenciales (ACCESOS_ADMIN_PAZ_EN_LA_MESA.txt)
 * que debe entregarse por canal seguro. El archivo se ignora en .gitignore.
 */
async function main() {
  const targets = [
    { name: 'Gabby', email: (process.env.PAZ_ADMIN_GABBY_EMAIL || 'gabby@wisdomacademy.alsiztech.com').trim().toLowerCase() },
    { name: 'Samuel', email: (process.env.PAZ_ADMIN_SAMUEL_EMAIL || 'samuel@wisdomacademy.alsiztech.com').trim().toLowerCase() },
    { name: 'Karen', email: (process.env.PAZ_ADMIN_KAREN_EMAIL || 'karen@wisdomacademy.alsiztech.com').trim().toLowerCase() },
  ];

  const now = nowIso();
  const credentials: Array<{ name: string; email: string; password: string }> = [];

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

    credentials.push({ name: target.name, email: target.email, password: tempPassword });
    console.log(`[CREADO] ${target.name} (${target.email}) -> contraseña temporal generada`);
  }

  if (credentials.length > 0) {
    const outputPath = join(process.cwd(), 'ACCESOS_ADMIN_PAZ_EN_LA_MESA.txt');
    const lines = [
      '============================================================',
      'CREDENCIALES DE ADMINISTRADOR - PAZ EN LA MESA',
      '============================================================',
      '',
      'Plataforma: https://wisdomacademy.alsiztech.com',
      'Panel de administración: /admin/paz-workshop',
      'Fecha de generación: ' + new Date().toISOString().split('T')[0],
      '',
      '--- CUENTAS CREADAS ---',
      '',
    ];

    for (const c of credentials) {
      lines.push(`Nombre: ${c.name}`);
      lines.push(`Email:  ${c.email}`);
      lines.push(`Pass:   ${c.password}`);
      lines.push('');
    }

    lines.push('--- INSTRUCCIONES ---');
    lines.push('1. Entregar cada credencial por canal privado (WhatsApp, Signal, etc.)');
    lines.push('2. Cada admin debe cambiar su contraseña en el primer acceso');
    lines.push('3. El rol asignado es "principal_admin" (permiso orders.manage)');
    lines.push('4. ESTE ARCHIVO CONTIENE CONTRASEÑAS EN TEXTO PLANO');
    lines.push('   - NO hacer commit a git (está en .gitignore)');
    lines.push('   - Eliminar después de entregar credenciales');
    lines.push('============================================================');

    const content = lines.join('\n');
    writeFileSync(outputPath, content, 'utf-8');
    console.log(`\n[OK] Credenciales guardadas en: ${outputPath}`);
  }
}

main().catch((err) => {
  console.error('Error aprovisionando administradores:', err);
  process.exit(1);
});