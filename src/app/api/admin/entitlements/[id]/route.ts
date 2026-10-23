import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  optionalJsonString,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import { prepare } from '@/server/db';
import {
  changeEntitlementStatus,
  extendEntitlement,
  listUserEntitlements,
} from '@/server/domain/access';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: entitlementId } = await context.params;
    const { user } = requireSession(request, { mutation: true, permission: 'entitlements.manage' });
    const entitlement = prepare('SELECT * FROM entitlements WHERE id = ?').get(
      entitlementId
    ) as { id: string; user_id: string } | undefined;
    if (!entitlement) throw new ApiError(404, 'ENTITLEMENT_NOT_FOUND', 'El derecho no existe.');

    const body = await readJsonBody<{
      action?: 'pause' | 'resume' | 'revoke' | 'extend';
      endsAt?: string | null;
      reason?: string;
    }>(request);
    if (!body.action) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'La acción es obligatoria.');
    }
    const before = listUserEntitlements(entitlement.user_id).find(
      (item) => item.id === entitlementId
    );
    let after;
    if (body.action === 'extend') {
      after = extendEntitlement(entitlementId, body.endsAt || null, user.id);
    } else {
      after = changeEntitlementStatus(
        entitlementId,
        body.action,
        user.id,
        optionalJsonString(body.reason, 300) || undefined
      );
    }
    writeAudit({
      actor: user,
      action: `entitlement.${body.action}`,
      entityType: 'entitlement',
      entityId: entitlementId,
      before,
      after,
    });
    return jsonOk({ derecho: after });
  } catch (error) {
    return handleRouteError(error);
  }
}
