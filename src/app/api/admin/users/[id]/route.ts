import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { hasPermission } from '@/server/auth/authorization';
import { serializeAdminUser } from '@/server/auth/serialize';
import { setUserStatus } from '@/server/domain/users';
import { prepare } from '@/server/db';
import { nowIso } from '@/server/db/sqlite';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'users.manage' });
    const targetId = (await context.params).id;
    const body = await readJsonBody<{ nombreCompleto?: string; estado?: 'active' | 'suspended' }>(
      request
    );
    const before = serializeAdminUser(targetId, {
      includeMinorProfile: hasPermission(user, 'minors.read'),
    });
    if (!before) throw new ApiError(404, 'USER_NOT_FOUND', 'La cuenta no existe.');

    if (before.roles?.includes('platform_owner') && !user.isOwner) {
      throw new ApiError(403, 'OWNER_PROTECTED', 'No puedes modificar la cuenta del creador.');
    }

    if (body.estado) {
      if (body.estado !== 'active' && body.estado !== 'suspended') {
        throw new ApiError(400, 'VALIDATION_ERROR', 'El estado solicitado no es válido.');
      }
      setUserStatus({ actor: user, userId: targetId, status: body.estado });
    }
    if (body.nombreCompleto !== undefined) {
      const name = body.nombreCompleto.trim();
      if (name.length < 2 || name.length > 160) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'El nombre no es válido.');
      }
      prepare('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?').run(
        name,
        nowIso(),
        targetId
      );
    }

    const after = serializeAdminUser(targetId, {
      includeMinorProfile: hasPermission(user, 'minors.read'),
    });
    writeAudit({
      actor: user,
      action: 'user.updated',
      entityType: 'user',
      entityId: targetId,
      before,
      after,
    });
    return jsonOk({ usuario: after });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'users.manage' });
    setUserStatus({ actor: user, userId: (await context.params).id, status: 'suspended' });
    writeAudit({
      actor: user,
      action: 'user.suspended',
      entityType: 'user',
      entityId: (await context.params).id,
    });
    return jsonOk({ mensaje: 'Cuenta suspendida. No se eliminó el historial.' });
  } catch (error) {
    return handleRouteError(error);
  }
}
