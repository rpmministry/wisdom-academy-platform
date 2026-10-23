import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  optionalJsonString,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { hasPermission } from '@/server/auth/authorization';
import { prepare } from '@/server/db';
import { changeGlobalAccessStatus } from '@/server/domain/access';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { mutation: true });
    const grant = prepare('SELECT * FROM global_access_grants WHERE id = ?').get(
      (await context.params).id
    ) as { id: string; user_id: string; kind: string } | undefined;
    if (!grant) throw new ApiError(404, 'GLOBAL_ACCESS_NOT_FOUND', 'El acceso global no existe.');
    const required = grant.kind === 'manual' ? 'entitlements.manage' : 'founder_codes.manage';
    if (!hasPermission(user, required)) {
      throw new ApiError(403, 'FORBIDDEN', 'No tienes permiso para modificar este acceso global.');
    }
    const body = await readJsonBody<{ action?: 'pause' | 'resume' | 'revoke'; reason?: string }>(
      request
    );
    if (!body.action || !['pause', 'resume', 'revoke'].includes(body.action)) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'La acción debe ser pause, resume o revoke.');
    }
    changeGlobalAccessStatus(
      (await context.params).id,
      body.action,
      user.id,
      optionalJsonString(body.reason, 300) || undefined
    );
    writeAudit({
      actor: user,
      action: `global_access.${body.action}`,
      entityType: 'global_access',
      entityId: (await context.params).id,
      after: { userId: grant.user_id, kind: grant.kind },
    });
    return jsonOk({ mensaje: 'Acceso global actualizado.' });
  } catch (error) {
    return handleRouteError(error);
  }
}
