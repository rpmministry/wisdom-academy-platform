import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import type { AuthUser } from '../auth/authorization';
import { hasPermission } from '../auth/authorization';
import { ApiError } from '../http/api';
import { randomToken } from '../security/random';

export type EntitlementStatus = 'pending' | 'active' | 'paused' | 'revoked' | 'expired';
export type EntitlementOrigin =
  | 'purchase'
  | 'gift'
  | 'promo_full'
  | 'scholarship'
  | 'founder_invitation'
  | 'investor_invitation'
  | 'manual_owner'
  | 'enrollment'
  | 'bundle'
  | 'migration';

export type ResourceType =
  | 'course'
  | 'workshop'
  | 'grade'
  | 'homeschool_program'
  | 'material'
  | 'collection';

export interface ResourceRow {
  id: string;
  slug: string;
  type: ResourceType;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  metadata_json: string;
  created_at: string;
  updated_at: string;
}

export interface EntitlementView {
  id: string;
  userId: string;
  resourceId: string;
  resourceSlug: string;
  resourceTitle: string;
  resourceType: ResourceType;
  origin: EntitlementOrigin;
  originRef: string;
  storedStatus: EntitlementStatus;
  effectiveStatus: EntitlementStatus;
  startsAt: string;
  endsAt: string | null;
  grantedBy: string | null;
  createdAt: string;
  updatedAt: string;
  revokeReason: string | null;
}

export interface GlobalAccessView {
  id: string;
  userId: string;
  kind: 'founder' | 'investor' | 'owner' | 'manual';
  storedStatus: EntitlementStatus;
  effectiveStatus: EntitlementStatus;
  startsAt: string;
  endsAt: string | null;
  origin: string;
  originRef: string;
  createdAt: string;
}

interface EntitlementDbRow {
  id: string;
  user_id: string;
  resource_id: string;
  origin: EntitlementOrigin;
  origin_ref: string;
  status: EntitlementStatus;
  starts_at: string;
  ends_at: string | null;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
  revoke_reason: string | null;
  resource_slug: string;
  resource_title: string;
  resource_type: ResourceType;
}

export function effectiveStatus(
  storedStatus: string,
  startsAt: string,
  endsAt: string | null,
  now = nowIso()
): EntitlementStatus {
  if (storedStatus === 'revoked') return 'revoked';
  if (storedStatus === 'paused') return 'paused';
  if (storedStatus === 'expired') return 'expired';
  if (startsAt > now) return 'pending';
  if (endsAt && endsAt <= now) return 'expired';
  return 'active';
}

export function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

/**
 * Suma meses naturales conservando la hora UTC. Si el mes de destino tiene
 * menos días (p. ej. 31 de enero + 1 mes), se ajusta al último día disponible.
 */
export function addMonthsClamped(iso: string, months: number): string {
  const source = new Date(iso);
  const year = source.getUTCFullYear();
  const month = source.getUTCMonth();
  const day = source.getUTCDate();
  const hours = source.getUTCHours();
  const minutes = source.getUTCMinutes();
  const seconds = source.getUTCSeconds();
  const milliseconds = source.getUTCMilliseconds();

  const targetMonthIndex = month + months;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      targetYear,
      normalizedMonth,
      Math.min(day, lastDay),
      hours,
      minutes,
      seconds,
      milliseconds
    )
  ).toISOString();
}

export interface AccessWindowInput {
  startsAt?: string | null;
  durationDays?: number | null;
  durationMonths?: number | null;
  endsAt?: string | null;
  unlimited?: boolean;
}

export function computeAccessWindow(input: AccessWindowInput): {
  startsAt: string;
  endsAt: string | null;
} {
  const startsAt = input.startsAt ? new Date(input.startsAt).toISOString() : nowIso();
  if (input.endsAt) {
    const endsAt = new Date(input.endsAt).toISOString();
    if (endsAt <= startsAt) {
      throw new ApiError(400, 'DATE_RANGE', 'La fecha de fin debe ser posterior al inicio.');
    }
    return { startsAt, endsAt };
  }

  let endsAt: string | null = null;
  if (input.durationMonths && input.durationMonths > 0) {
    endsAt = addMonthsClamped(startsAt, input.durationMonths);
  }
  if (input.durationDays && input.durationDays > 0) {
    endsAt = addDays(endsAt || startsAt, input.durationDays);
  }
  return { startsAt, endsAt };
}

export function findResourceBySlug(slug: string): ResourceRow | null {
  return (
    (prepare('SELECT * FROM resources WHERE slug = ?').get(slug) as ResourceRow | undefined) ??
    null
  );
}

export function findResourceById(id: string): ResourceRow | null {
  return (
    (prepare('SELECT * FROM resources WHERE id = ?').get(id) as ResourceRow | undefined) ?? null
  );
}

export function listUserEntitlements(userId: string): EntitlementView[] {
  const rows = prepare(`
    SELECT e.*, r.slug AS resource_slug, r.title AS resource_title, r.type AS resource_type
    FROM entitlements e
    JOIN resources r ON r.id = e.resource_id
    WHERE e.user_id = ?
    ORDER BY e.created_at DESC
  `).all(userId) as EntitlementDbRow[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    resourceId: row.resource_id,
    resourceSlug: row.resource_slug,
    resourceTitle: row.resource_title,
    resourceType: row.resource_type,
    origin: row.origin,
    originRef: row.origin_ref,
    storedStatus: row.status,
    effectiveStatus: effectiveStatus(row.status, row.starts_at, row.ends_at),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    grantedBy: row.granted_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    revokeReason: row.revoke_reason,
  }));
}

export function listUserGlobalGrants(userId: string): GlobalAccessView[] {
  const rows = prepare(`
    SELECT * FROM global_access_grants
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId) as Array<{
    id: string;
    user_id: string;
    kind: 'founder' | 'investor' | 'owner' | 'manual';
    status: EntitlementStatus;
    starts_at: string;
    ends_at: string | null;
    origin: string;
    origin_ref: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    storedStatus: row.status,
    effectiveStatus: effectiveStatus(row.status, row.starts_at, row.ends_at),
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    origin: row.origin,
    originRef: row.origin_ref,
    createdAt: row.created_at,
  }));
}

export function userHasActiveGlobalGrant(userId: string): boolean {
  const now = nowIso();
  const rows = prepare(`
    SELECT status, starts_at, ends_at FROM global_access_grants
    WHERE user_id = ? AND status IN ('active','pending')
  `).all(userId) as Array<{ status: string; starts_at: string; ends_at: string | null }>;
  return rows.some(
    (row) => effectiveStatus(row.status, row.starts_at, row.ends_at, now) === 'active'
  );
}

export function userCanAccessResource(
  user: AuthUser,
  resource: ResourceRow,
  now = nowIso()
): boolean {
  if (user.isOwner || hasPermission(user, 'content.access_all')) return true;
  if (resource.status !== 'published') return false;
  if (userHasActiveGlobalGrant(user.id)) return true;

  const row = prepare(`
    SELECT status, starts_at, ends_at FROM entitlements
    WHERE user_id = ? AND resource_id = ? AND status IN ('active','pending','paused')
  `).all(user.id, resource.id) as Array<{
    status: string;
    starts_at: string;
    ends_at: string | null;
  }>;
  return row.some(
    (item) => effectiveStatus(item.status, item.starts_at, item.ends_at, now) === 'active'
  );
}

export function assertResourceAccess(user: AuthUser, slug: string): ResourceRow {
  const resource = findResourceBySlug(slug);
  if (!resource) {
    throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'El recurso solicitado no existe.');
  }
  if (!userCanAccessResource(user, resource)) {
    throw new ApiError(403, 'RESOURCE_FORBIDDEN', 'No tienes un derecho de acceso vigente para este recurso.');
  }
  return resource;
}

export function userHasAnyEducationalAccess(user: AuthUser): boolean {
  if (user.isOwner || hasPermission(user, 'content.access_all')) return true;
  if (userHasActiveGlobalGrant(user.id)) return true;
  const rows = prepare(`
    SELECT status, starts_at, ends_at FROM entitlements
    WHERE user_id = ? AND status IN ('active','pending')
  `).all(user.id) as Array<{ status: string; starts_at: string; ends_at: string | null }>;
  return rows.some((row) => effectiveStatus(row.status, row.starts_at, row.ends_at) === 'active');
}

export function accessibleResources(user: AuthUser): ResourceRow[] {
  if (user.isOwner || hasPermission(user, 'content.access_all') || userHasActiveGlobalGrant(user.id)) {
    return prepare(
      "SELECT * FROM resources WHERE status = 'published' ORDER BY type, title"
    ).all() as ResourceRow[];
  }
  return prepare(`
    SELECT DISTINCT r.*
    FROM resources r
    JOIN entitlements e ON e.resource_id = r.id
    WHERE e.user_id = ? AND e.status = 'active'
      AND e.starts_at <= ?
      AND (e.ends_at IS NULL OR e.ends_at > ?)
      AND r.status = 'published'
    ORDER BY r.type, r.title
  `).all(user.id, nowIso(), nowIso()) as ResourceRow[];
}

export interface GrantEntitlementInput {
  userId: string;
  resourceId: string;
  origin: EntitlementOrigin;
  originRef?: string;
  startsAt?: string | null;
  endsAt?: string | null;
  grantedBy?: string | null;
  metadata?: Record<string, unknown>;
}

export function grantEntitlement(input: GrantEntitlementInput): {
  id: string;
  created: boolean;
} {
  return withTransaction(() => {
    const originRef = input.originRef || '';
    const existing = prepare(`
      SELECT id FROM entitlements
      WHERE user_id = ? AND resource_id = ? AND origin = ? AND origin_ref = ?
        AND status <> 'revoked'
    `).get(input.userId, input.resourceId, input.origin, originRef) as
      | { id: string }
      | undefined;
    if (existing) return { id: existing.id, created: false };

    const startsAt = input.startsAt || nowIso();
    const endsAt = input.endsAt || null;
    const status = effectiveStatus('active', startsAt, endsAt);
    const id = `ent_${randomToken(16)}`;
    const timestamp = nowIso();
    prepare(`
      INSERT INTO entitlements
        (id, user_id, resource_id, origin, origin_ref, status, starts_at, ends_at, granted_by,
         metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.userId,
      input.resourceId,
      input.origin,
      originRef,
      status === 'pending' ? 'pending' : 'active',
      startsAt,
      endsAt,
      input.grantedBy ?? null,
      JSON.stringify(input.metadata ?? {}),
      timestamp,
      timestamp
    );
    return { id, created: true };
  });
}

export function changeEntitlementStatus(
  entitlementId: string,
  action: 'pause' | 'resume' | 'revoke',
  actorId: string,
  reason?: string
): EntitlementView {
  const entitlement = prepare('SELECT * FROM entitlements WHERE id = ?').get(entitlementId) as
    | { user_id: string; status: string }
    | undefined;
  if (!entitlement) {
    throw new ApiError(404, 'ENTITLEMENT_NOT_FOUND', 'El derecho de acceso no existe.');
  }
  const timestamp = nowIso();
  if (action === 'revoke') {
    prepare(`
      UPDATE entitlements
      SET status = 'revoked', revoked_at = ?, revoked_by = ?, revoke_reason = ?, updated_at = ?
      WHERE id = ?
    `).run(timestamp, actorId, reason || 'Revocado por administración', timestamp, entitlementId);
  } else if (action === 'pause') {
    prepare("UPDATE entitlements SET status = 'paused', updated_at = ? WHERE id = ?").run(
      timestamp,
      entitlementId
    );
  } else {
    prepare("UPDATE entitlements SET status = 'active', updated_at = ? WHERE id = ?").run(
      timestamp,
      entitlementId
    );
  }
  return listUserEntitlements(entitlement.user_id).find((item) => item.id === entitlementId) as EntitlementView;
}

export function extendEntitlement(
  entitlementId: string,
  endsAt: string | null,
  actorId: string
): EntitlementView {
  const entitlement = prepare('SELECT user_id FROM entitlements WHERE id = ?').get(entitlementId) as
    | { user_id: string }
    | undefined;
  if (!entitlement) {
    throw new ApiError(404, 'ENTITLEMENT_NOT_FOUND', 'El derecho de acceso no existe.');
  }
  const normalizedEnd = endsAt ? new Date(endsAt).toISOString() : null;
  prepare('UPDATE entitlements SET ends_at = ?, status = ?, updated_at = ? WHERE id = ?').run(
    normalizedEnd,
    'active',
    nowIso(),
    entitlementId
  );
  void actorId;
  return listUserEntitlements(entitlement.user_id).find((item) => item.id === entitlementId) as EntitlementView;
}

export function grantGlobalAccess(input: {
  userId: string;
  kind: 'founder' | 'investor' | 'owner' | 'manual';
  origin: string;
  originRef?: string;
  startsAt?: string;
  endsAt?: string | null;
  grantedBy?: string | null;
}): { id: string; created: boolean } {
  return withTransaction(() => {
    const originRef = input.originRef || '';
    const existing = prepare(`
      SELECT id FROM global_access_grants
      WHERE user_id = ? AND kind = ? AND origin = ? AND origin_ref = ? AND status <> 'revoked'
    `).get(input.userId, input.kind, input.origin, originRef) as { id: string } | undefined;
    if (existing) return { id: existing.id, created: false };

    const startsAt = input.startsAt || nowIso();
    const endsAt = input.endsAt || null;
    const id = `gag_${randomToken(16)}`;
    const timestamp = nowIso();
    prepare(`
      INSERT INTO global_access_grants
        (id, user_id, kind, status, starts_at, ends_at, origin, origin_ref, granted_by,
         created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      input.userId,
      input.kind,
      effectiveStatus('active', startsAt, endsAt) === 'pending' ? 'pending' : 'active',
      startsAt,
      endsAt,
      input.origin,
      originRef,
      input.grantedBy ?? null,
      timestamp,
      timestamp
    );
    return { id, created: true };
  });
}

export function changeGlobalAccessStatus(
  grantId: string,
  action: 'pause' | 'resume' | 'revoke',
  actorId: string,
  reason?: string
): void {
  const grant = prepare('SELECT user_id FROM global_access_grants WHERE id = ?').get(grantId) as
    | { user_id: string }
    | undefined;
  if (!grant) {
    throw new ApiError(404, 'GLOBAL_ACCESS_NOT_FOUND', 'La autorización global no existe.');
  }
  const timestamp = nowIso();
  if (action === 'revoke') {
    prepare(`
      UPDATE global_access_grants
      SET status = 'revoked', revoked_at = ?, revoke_reason = ?, updated_at = ?
      WHERE id = ?
    `).run(timestamp, reason || 'Revocado por administración', timestamp, grantId);
  } else {
    prepare('UPDATE global_access_grants SET status = ?, updated_at = ? WHERE id = ?').run(
      action === 'pause' ? 'paused' : 'active',
      timestamp,
      grantId
    );
  }
  void actorId;
}

export function createEnrollment(input: {
  userId: string;
  productId?: string | null;
  resourceId?: string | null;
  studentProfileId?: string | null;
  origin: string;
  orderId?: string | null;
  giftRedemptionId?: string | null;
  startsAt: string;
  endsAt: string | null;
}): void {
  const existing = prepare(`
    SELECT id FROM enrollments
    WHERE user_id = ? AND COALESCE(product_id,'') = COALESCE(?,'')
      AND COALESCE(resource_id,'') = COALESCE(?,'')
      AND origin = ? AND COALESCE(order_id,'') = COALESCE(?,'')
  `).get(
    input.userId,
    input.productId ?? null,
    input.resourceId ?? null,
    input.origin,
    input.orderId ?? null
  ) as { id: string } | undefined;
  if (existing) return;

  const timestamp = nowIso();
  prepare(`
    INSERT INTO enrollments
      (id, user_id, product_id, resource_id, student_profile_id, status, origin, order_id,
       gift_redemption_id, starts_at, ends_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `enr_${randomToken(16)}`,
    input.userId,
    input.productId ?? null,
    input.resourceId ?? null,
    input.studentProfileId ?? null,
    input.origin,
    input.orderId ?? null,
    input.giftRedemptionId ?? null,
    input.startsAt,
    input.endsAt,
    timestamp,
    timestamp
  );
}

export function revokeOriginEntitlements(originRef: string, actorId: string, reason: string): number {
  const timestamp = nowIso();
  const rows = prepare(`
    SELECT id FROM entitlements
    WHERE origin_ref = ? AND origin IN ('purchase','promo_full','bundle') AND status <> 'revoked'
  `).all(originRef) as Array<{ id: string }>;
  for (const row of rows) {
    prepare(`
      UPDATE entitlements
      SET status = 'revoked', revoked_at = ?, revoked_by = ?, revoke_reason = ?, updated_at = ?
      WHERE id = ?
    `).run(timestamp, actorId, reason, timestamp, row.id);
  }
  prepare(`
    UPDATE enrollments SET status = 'revoked', updated_at = ?
    WHERE order_id = ? AND status <> 'revoked'
  `).run(timestamp, originRef);
  return rows.length;
}
