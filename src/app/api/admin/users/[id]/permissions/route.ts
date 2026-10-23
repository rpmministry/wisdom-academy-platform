import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireJsonString,
  requireSession,
} from '@/server/http/api';
import { grantDirectPermission, revokeDirectPermission } from '@/server/domain/users';
import { hasPermission } from '@/server/auth/authorization';
import { serializeAdminUser } from '@/server/auth/serialize';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'users.permissions.manage' });
    const body = await readJsonBody<{
      permissionCode?: string;
      action?: 'grant' | 'revoke';
      expiresAt?: string | null;
    }>(request);
    const permissionCode = requireJsonString(body.permissionCode, 'permissionCode', 80);
    if (body.action !== 'grant' && body.action !== 'revoke') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'La acción debe ser grant o revoke.');
    }
    const result =
      body.action === 'grant'
        ? grantDirectPermission({
            actor: user,
            userId: (await context.params).id,
            permissionCode,
            expiresAt: body.expiresAt || null,
          })
        : revokeDirectPermission({
            actor: user,
            userId: (await context.params).id,
            permissionCode,
          });
    writeAudit({
      actor: user,
      action: `user.permission.${body.action}`,
      entityType: 'user',
      entityId: (await context.params).id,
      after: { permissionCode, expiresAt: body.expiresAt || null },
    });
    return jsonOk({
      resultado: result,
      usuario: serializeAdminUser((await context.params).id, {
        includeMinorProfile: hasPermission(user, 'minors.read'),
      }),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
