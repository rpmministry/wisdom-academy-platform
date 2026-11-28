import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { prepare, withTransaction } from '@/server/db';
import { nowIso } from '@/server/db/sqlite';
import { createUserByAdmin, findUserByIdentifier } from '@/server/domain/users';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WORKSHOP_ADMINS = [
  { key: 'mauricio', name: 'Mauricio' },
  { key: 'gabby', name: 'Gabby' },
  { key: 'samuel', name: 'Samuel' },
  { key: 'karen', name: 'Karen' },
] as const;

const ADMIN_ROLES = new Set(['platform_owner', 'principal_admin', 'delegated_admin']);

function findMatchingAdminRow(name: string) {
  const rows = prepare(`
    SELECT u.id, u.email, u.display_name, u.status, u.must_change_password, u.created_at,
           GROUP_CONCAT(ur.role_code) AS roles
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id AND ur.revoked_at IS NULL
    WHERE LOWER(u.display_name) LIKE ?
    GROUP BY u.id
    LIMIT 10
  `).all(`%${name.toLowerCase()}%`) as Array<{
    id: string;
    email: string;
    display_name: string | null;
    status: string;
    must_change_password: number;
    created_at: string;
    roles: string;
  }>;

  return rows.find((r) =>
    (r.roles || '')
      .split(',')
      .some((role) => ADMIN_ROLES.has(role.trim()))
  );
}

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'orders.read' });

    const admins = WORKSHOP_ADMINS.map((target) => {
      const match = findMatchingAdminRow(target.name);
      return {
        key: target.key,
        name: target.name,
        configured: Boolean(match),
        userId: match?.id || null,
        email: match?.email || null,
        displayName: match?.display_name || target.name,
        status: match?.status || 'pending_email',
        mustChangePassword: match ? Boolean(match.must_change_password) : false,
        roles: match ? match.roles.split(',').filter(Boolean) : [],
      };
    });

    return jsonOk({ admins });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, {
      mutation: true,
      permission: 'users.manage',
    });

    const body = await readJsonBody<{
      name?: unknown;
      email?: unknown;
    }>(request, 8 * 1024);

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!name || !['Mauricio', 'Gabby', 'Samuel', 'Karen'].includes(name)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Selecciona uno de los cuatro administradores autorizados.');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Ingresa una dirección de correo electrónico válida.');
    }

    const existing = findUserByIdentifier(email);
    const now = nowIso();

    if (existing) {
      withTransaction(() => {
        prepare(`
          INSERT OR IGNORE INTO user_roles (user_id, role_code, granted_by, granted_at)
          VALUES (?, 'principal_admin', ?, ?)
        `).run(existing.id, user.id, now);
        prepare(`
          UPDATE users SET status = 'active', updated_at = ? WHERE id = ?
        `).run(now, existing.id);
      });

      writeAudit({
        actor: user,
        action: 'paz.admin.role_granted',
        entityType: 'user',
        entityId: existing.id,
        after: { name, email, role: 'principal_admin' },
      });

      return jsonOk({
        created: false,
        email,
        name,
        temporaryPassword: null,
        mensaje: `Permisos administrativos asignados a ${name} (${email}).`,
      });
    }

    const created = await createUserByAdmin({
      actor: user,
      email,
      displayName: name,
      password: null,
    });

    withTransaction(() => {
      prepare(`
        INSERT OR IGNORE INTO user_roles (user_id, role_code, granted_by, granted_at)
        VALUES (?, 'principal_admin', ?, ?)
      `).run(created.userId, user.id, now);
      prepare(`
        UPDATE users SET must_change_password = 1, email_verified = 1, updated_at = ? WHERE id = ?
      `).run(now, created.userId);
    });

    writeAudit({
      actor: user,
      action: 'paz.admin.provisioned',
      entityType: 'user',
      entityId: created.userId,
      after: { name, email, role: 'principal_admin', mustChangePassword: true },
    });

    return jsonOk({
      created: true,
      email,
      name,
      temporaryPassword: created.initialPassword || null,
      mensaje: `Cuenta administrativa creada para ${name}. Entrega la contraseña temporal por un canal seguro; el sistema exigirá cambiarla en el primer ingreso.`,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
