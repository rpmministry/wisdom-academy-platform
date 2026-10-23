import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireJsonString,
  requireSession,
} from '@/server/http/api';
import { grantRole, revokeRole } from '@/server/domain/users';
import { hasPermission } from '@/server/auth/authorization';
import { serializeAdminUser } from '@/server/auth/serialize';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'users.roles.manage' });
    const body = await readJsonBody<{ roleCode?: string; action?: 'grant' | 'revoke' }>(request);
    const roleCode = requireJsonString(body.roleCode, 'roleCode', 60);
    if (body.action !== 'grant' && body.action !== 'revoke') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'La acción debe ser grant o revoke.');
    }
    const result =
      body.action === 'grant'
        ? grantRole({ actor: user, userId: (await context.params).id, roleCode })
        : revokeRole({ actor: user, userId: (await context.params).id, roleCode });
    writeAudit({
      actor: user,
      action: `user.role.${body.action}`,
      entityType: 'user',
      entityId: (await context.params).id,
      after: { roleCode },
    });
    const usuario = serializeAdminUser((await context.params).id, {
      includeMinorProfile: hasPermission(user, 'minors.read'),
    });
    return jsonOk({ resultado: result, usuario });
  } catch (error) {
    return handleRouteError(error);
  }
}
