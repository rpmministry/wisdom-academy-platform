import { NextRequest, NextResponse } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  optionalJsonString,
  readJsonBody,
  requireJsonString,
  requireSession,
} from '@/server/http/api';
import { hasPermission } from '@/server/auth/authorization';
import { prepare } from '@/server/db';
import {
  computeAccessWindow,
  createEnrollment,
  effectiveStatus,
  grantEntitlement,
  listUserEntitlements,
} from '@/server/domain/access';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MANUAL_ORIGINS = new Set(['manual_owner', 'scholarship', 'enrollment']);

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'entitlements.read' });
    const params = request.nextUrl.searchParams;
    const filters: string[] = [];
    const values: Array<string | number> = [];
    if (params.get('userId')) {
      filters.push('e.user_id = ?');
      values.push(params.get('userId') as string);
    }
    if (params.get('resourceId')) {
      filters.push('e.resource_id = ?');
      values.push(params.get('resourceId') as string);
    }
    if (params.get('origin')) {
      filters.push('e.origin = ?');
      values.push(params.get('origin') as string);
    }
    if (params.get('q')) {
      filters.push('(u.email LIKE ? OR u.display_name LIKE ? OR r.title LIKE ?)');
      const term = `%${params.get('q')}%`;
      values.push(term, term, term);
    }
    const limit = Math.min(Math.max(Number(params.get('limit')) || 200, 1), 500);
    const rows = prepare(`
      SELECT e.*, u.email AS user_email, u.display_name AS user_name,
             r.slug AS resource_slug, r.title AS resource_title, r.type AS resource_type
      FROM entitlements e
      JOIN users u ON u.id = e.user_id
      JOIN resources r ON r.id = e.resource_id
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY e.created_at DESC LIMIT ?
    `).all(...values, limit) as Array<Record<string, unknown>>;

    const derechos = rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: row.user_name,
      resourceId: row.resource_id,
      resourceSlug: row.resource_slug,
      resourceTitle: row.resource_title,
      resourceType: row.resource_type,
      origin: row.origin,
      originRef: row.origin_ref,
      storedStatus: row.status,
      effectiveStatus: effectiveStatus(
        String(row.status),
        String(row.starts_at),
        row.ends_at ? String(row.ends_at) : null
      ),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json(
      { ok: true, derechos },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = requireSession(request, { mutation: true, permission: 'entitlements.manage' });
    const body = await readJsonBody<{
      userId?: string;
      resourceId?: string;
      origin?: string;
      startsAt?: string;
      durationDays?: number;
      durationMonths?: number;
      endsAt?: string;
      unlimited?: boolean;
      reason?: string;
    }>(request);
    const userId = requireJsonString(body.userId, 'userId', 120);
    const resourceId = requireJsonString(body.resourceId, 'resourceId', 180);
    const origin = requireJsonString(body.origin, 'origin', 40);
    if (!MANUAL_ORIGINS.has(origin)) {
      throw new ApiError(
        400,
        'ORIGIN_NOT_ALLOWED',
        'El origen debe ser manual_owner, scholarship o enrollment.'
      );
    }
    const target = prepare('SELECT id, is_minor FROM users WHERE id = ?').get(userId) as
      | { id: string; is_minor: number }
      | undefined;
    if (!target) throw new ApiError(404, 'USER_NOT_FOUND', 'La cuenta no existe.');
    if (target.is_minor && !hasPermission(user, 'minors.read')) {
      throw new ApiError(403, 'MINORS_FORBIDDEN', 'No tienes permiso para gestionar accesos de menores.');
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
    const granted = grantEntitlement({
      userId,
      resourceId,
      origin: origin as 'manual_owner' | 'scholarship' | 'enrollment',
      originRef: `manual:${user.id}:${userId}:${resourceId}:${Date.now()}`,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      grantedBy: user.id,
      metadata: { reason: optionalJsonString(body.reason, 300) },
    });
    createEnrollment({
      userId,
      resourceId,
      origin,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    });
    writeAudit({
      actor: user,
      action: 'entitlement.granted',
      entityType: 'entitlement',
      entityId: granted.id,
      after: { userId, resourceId, origin, window, reason: optionalJsonString(body.reason, 300) },
    });
    const view = listUserEntitlements(userId).find((item) => item.id === granted.id) || null;
    return jsonOk({ derecho: view });
  } catch (error) {
    return handleRouteError(error);
  }
}
