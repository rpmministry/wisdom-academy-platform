import { NextRequest } from 'next/server';
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
  createEnrollment,
  grantEntitlement,
} from '@/server/domain/access';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = await requireSession(request, {
      mutation: true,
      permission: 'enrollments.manage',
    });
    const target = prepare('SELECT id, is_minor FROM users WHERE id = ?').get((await context.params).id) as
      | { id: string; is_minor: number }
      | undefined;
    if (!target) throw new ApiError(404, 'USER_NOT_FOUND', 'La cuenta no existe.');
    if (target.is_minor && !hasPermission(user, 'minors.read')) {
      throw new ApiError(403, 'MINORS_FORBIDDEN', 'No tienes permiso para gestionar matrículas de menores.');
    }

    const body = await readJsonBody<{
      resourceId?: string;
      legacyCourseId?: number;
      startsAt?: string;
      durationDays?: number;
      durationMonths?: number;
      endsAt?: string;
      unlimited?: boolean;
    }>(request);

    let resourceId = body.resourceId;
    if (!resourceId && body.legacyCourseId) {
      const row = prepare(
        "SELECT id FROM resources WHERE json_extract(metadata_json, '$.legacyCourseId') = ? LIMIT 1"
      ).get(Number(body.legacyCourseId)) as { id: string } | undefined;
      resourceId = row?.id;
    }
    if (!resourceId) {
      throw new ApiError(400, 'RESOURCE_REQUIRED', 'Selecciona un recurso educativo.');
    }
    const resource = prepare('SELECT id, slug, title FROM resources WHERE id = ?').get(resourceId) as
      | { id: string; slug: string; title: string }
      | undefined;
    if (!resource) throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'El recurso no existe.');

    const window = computeAccessWindow({
      startsAt: body.startsAt || null,
      durationDays: body.durationDays ? Number(body.durationDays) : null,
      durationMonths: body.durationMonths ? Number(body.durationMonths) : null,
      endsAt: body.endsAt || null,
      unlimited: body.unlimited !== false,
    });
    const originRef = `manual-enrollment:${(await context.params).id}:${resource.id}`;
    const granted = grantEntitlement({
      userId: (await context.params).id,
      resourceId: resource.id,
      origin: 'enrollment',
      originRef,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      grantedBy: user.id,
      metadata: { slug: resource.slug },
    });
    createEnrollment({
      userId: (await context.params).id,
      resourceId: resource.id,
      origin: 'enrollment',
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    });
    writeAudit({
      actor: user,
      action: 'enrollment.created',
      entityType: 'user',
      entityId: (await context.params).id,
      after: { resourceId: resource.id, slug: resource.slug, window },
    });
    return jsonOk({ entitlementId: granted.id, creado: granted.created, ventana: window });
  } catch (error) {
    return handleRouteError(error);
  }
}
