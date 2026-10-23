import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireJsonString,
  requireSession,
} from '@/server/http/api';
import { hasPermission } from '@/server/auth/authorization';
import { prepare } from '@/server/db';
import {
  computeAccessWindow,
  effectiveStatus,
  grantGlobalAccess,
} from '@/server/domain/access';
import { randomToken } from '@/server/security/random';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'entitlements.read' });
    const rows = prepare(`
      SELECT g.*, u.email AS user_email, u.display_name AS user_name
      FROM global_access_grants g JOIN users u ON u.id = g.user_id
      ORDER BY g.created_at DESC LIMIT 300
    `).all() as Array<Record<string, unknown>>;
    const accesos = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: row.user_name,
      kind: row.kind,
      storedStatus: row.status,
      effectiveStatus: effectiveStatus(
        String(row.status),
        String(row.starts_at),
        row.ends_at ? String(row.ends_at) : null
      ),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      origin: row.origin,
      createdAt: row.created_at,
    }));
    return NextResponse.json(
      { ok: true, accesos },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { mutation: true });
    const body = await readJsonBody<{
      userId?: string;
      kind?: 'founder' | 'investor' | 'manual';
      startsAt?: string;
      durationDays?: number;
      durationMonths?: number;
      endsAt?: string;
      unlimited?: boolean;
      reason?: string;
    }>(request);
    const userId = requireJsonString(body.userId, 'userId', 120);
    const kind = body.kind;
    if (!kind || !['founder', 'investor', 'manual'].includes(kind)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Selecciona founder, investor o manual.');
    }
    const required = kind === 'manual' ? 'entitlements.manage' : 'founder_codes.manage';
    if (!hasPermission(user, required)) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        kind === 'manual'
          ? 'No tienes permiso para conceder accesos globales manuales.'
          : 'Solo el creador o un administrador expresamente autorizado puede gestionar accesos de fundador o inversor.'
      );
    }
    const target = prepare('SELECT id, email, is_minor FROM users WHERE id = ?').get(userId) as
      | { id: string; email: string; is_minor: number }
      | undefined;
    if (!target) throw new ApiError(404, 'USER_NOT_FOUND', 'La cuenta no existe.');

    const window = computeAccessWindow({
      startsAt: body.startsAt || null,
      durationDays: body.durationDays ? Number(body.durationDays) : null,
      durationMonths: body.durationMonths ? Number(body.durationMonths) : null,
      endsAt: body.endsAt || null,
      unlimited: body.unlimited !== false,
    });
    const grant = grantGlobalAccess({
      userId,
      kind,
      origin: 'manual_admin',
      originRef: `admin:${user.id}:${Date.now()}`,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      grantedBy: user.id,
    });

    if (kind === 'founder' || kind === 'investor') {
      const roleCode = kind;
      const hasRole = prepare(`
        SELECT 1 AS present FROM user_roles
        WHERE user_id = ? AND role_code = ? AND revoked_at IS NULL
      `).get(userId, roleCode);
      if (!hasRole) {
        prepare(`
          INSERT INTO user_roles (id, user_id, role_code, granted_by, granted_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(`ur_${randomToken(12)}`, userId, roleCode, user.id, new Date().toISOString());
      }
    }

    writeAudit({
      actor: user,
      action: 'global_access.granted',
      entityType: 'global_access',
      entityId: grant.id,
      after: { userId, kind, window },
    });
    return jsonOk({ id: grant.id, creado: grant.created });
  } catch (error) {
    return handleRouteError(error);
  }
}
