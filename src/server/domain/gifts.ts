import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import { ApiError } from '../http/api';
import { hashCode } from '../security/codes';
import {
  codeHint,
  generateHumanCode,
  normalizeCode,
  randomToken,
} from '../security/random';
import type { AuthUser } from '../auth/authorization';
import {
  computeAccessWindow,
  createEnrollment,
  effectiveStatus,
  findResourceById,
} from './access';

interface GiftCodeRow {
  id: string;
  code_hash: string;
  code_hint: string;
  label: string | null;
  status: 'active' | 'paused' | 'revoked' | 'exhausted';
  max_redemptions: number;
  redemption_count: number;
  redeem_by: string | null;
  access_starts_at: string | null;
  duration_days: number | null;
  duration_months: number | null;
  ends_at: string | null;
  unlimited: number;
  recipient_email: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
  notes: string | null;
}

export interface GiftCodeView {
  id: string;
  hint: string;
  label: string | null;
  storedStatus: string;
  displayStatus: 'active' | 'paused' | 'revoked' | 'expired' | 'exhausted';
  maxRedemptions: number;
  redemptionCount: number;
  redeemBy: string | null;
  accessStartsAt: string | null;
  durationDays: number | null;
  durationMonths: number | null;
  endsAt: string | null;
  unlimited: boolean;
  recipientEmail: string | null;
  resources: Array<{ id: string; slug: string; title: string; type: string }>;
  createdAt: string;
  notes: string | null;
}

function loadGiftCodeByHash(hash: string): GiftCodeRow | null {
  return (
    (prepare('SELECT * FROM gift_codes WHERE code_hash = ?').get(hash) as GiftCodeRow | undefined) ??
    null
  );
}

function loadGiftCode(id: string): GiftCodeRow | null {
  return (
    (prepare('SELECT * FROM gift_codes WHERE id = ?').get(id) as GiftCodeRow | undefined) ?? null
  );
}

export function giftResources(giftCodeId: string): Array<{
  id: string;
  slug: string;
  title: string;
  type: string;
}> {
  return prepare(`
    SELECT r.id, r.slug, r.title, r.type
    FROM gift_code_resources gcr
    JOIN resources r ON r.id = gcr.resource_id
    WHERE gcr.gift_code_id = ?
    ORDER BY r.title
  `).all(giftCodeId) as Array<{ id: string; slug: string; title: string; type: string }>;
}

function displayStatus(row: GiftCodeRow, now = nowIso()): GiftCodeView['displayStatus'] {
  if (row.status === 'revoked') return 'revoked';
  if (row.status === 'paused') return 'paused';
  if (row.redeem_by && row.redeem_by <= now) return 'expired';
  if (!row.unlimited && row.redemption_count >= row.max_redemptions) return 'exhausted';
  return 'active';
}

export function toGiftCodeView(row: GiftCodeRow): GiftCodeView {
  return {
    id: row.id,
    hint: row.code_hint,
    label: row.label,
    storedStatus: row.status,
    displayStatus: displayStatus(row),
    maxRedemptions: Number(row.max_redemptions),
    redemptionCount: Number(row.redemption_count),
    redeemBy: row.redeem_by,
    accessStartsAt: row.access_starts_at,
    durationDays: row.duration_days === null ? null : Number(row.duration_days),
    durationMonths: row.duration_months === null ? null : Number(row.duration_months),
    endsAt: row.ends_at,
    unlimited: Boolean(row.unlimited),
    recipientEmail: row.recipient_email,
    resources: giftResources(row.id),
    createdAt: row.created_at,
    notes: row.notes,
  };
}

export function listGiftCodes(): GiftCodeView[] {
  const rows = prepare('SELECT * FROM gift_codes ORDER BY created_at DESC').all() as GiftCodeRow[];
  return rows.map(toGiftCodeView);
}

export interface CreateGiftInput {
  actor: AuthUser;
  label?: string | null;
  resourceIds: string[];
  count?: number;
  maxRedemptions?: number;
  redeemBy?: string | null;
  accessStartsAt?: string | null;
  durationDays?: number | null;
  durationMonths?: number | null;
  endsAt?: string | null;
  unlimited?: boolean;
  recipientEmail?: string | null;
  customCode?: string | null;
  notes?: string | null;
}

function validateWindow(input: CreateGiftInput): {
  accessStartsAt: string | null;
  durationDays: number | null;
  durationMonths: number | null;
  endsAt: string | null;
  unlimited: boolean;
} {
  const durationDays = input.durationDays ?? null;
  const durationMonths = input.durationMonths ?? null;
  const unlimited = Boolean(input.unlimited);
  const endsAt = input.endsAt ? new Date(input.endsAt).toISOString() : null;
  if (!unlimited && !endsAt && !durationDays && !durationMonths) {
    throw new ApiError(
      400,
      'GIFT_DURATION_REQUIRED',
      'Define una duración, una fecha de fin o autoriza acceso sin expiración.'
    );
  }
  if (durationDays !== null && (durationDays < 1 || durationDays > 3650)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'La duración en días debe estar entre 1 y 3650.');
  }
  if (durationMonths !== null && (durationMonths < 1 || durationMonths > 120)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'La duración en meses debe estar entre 1 y 120.');
  }
  if (endsAt && input.accessStartsAt && endsAt <= new Date(input.accessStartsAt).toISOString()) {
    throw new ApiError(400, 'DATE_RANGE', 'La fecha de fin debe ser posterior al inicio.');
  }
  return {
    accessStartsAt: input.accessStartsAt ? new Date(input.accessStartsAt).toISOString() : null,
    durationDays,
    durationMonths,
    endsAt,
    unlimited,
  };
}

export function createGiftCodes(input: CreateGiftInput): Array<{
  id: string;
  code: string;
  hint: string;
}> {
  if (input.resourceIds.length === 0) {
    throw new ApiError(
      400,
      'GIFT_SCOPE_REQUIRED',
      'Todo código de regalo debe estar asociado a uno o varios recursos concretos.'
    );
  }
  const count = input.count ?? 1;
  if (count < 1 || count > 100) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Genera entre 1 y 100 códigos por lote.');
  }
  for (const resourceId of input.resourceIds) {
    if (!findResourceById(resourceId)) {
      throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Uno de los recursos no existe.');
    }
  }

  const window = validateWindow(input);
  const maxRedemptions = Math.max(1, Math.min(input.maxRedemptions ?? 1, 100000));
  const recipient = input.recipientEmail?.trim().toLowerCase() || null;
  const created: Array<{ id: string; code: string; hint: string }> = [];
  const now = nowIso();

  withTransaction(() => {
    for (let index = 0; index < count; index += 1) {
      const code =
        input.customCode && index === 0
          ? input.customCode.toUpperCase()
          : generateHumanCode('WA-GIFT', 20);
      const normalized = normalizeCode(code);
      if (normalized.length < 12) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'El código debe tener al menos 12 caracteres.');
      }
      const hash = hashCode(code);
      if (loadGiftCodeByHash(hash)) {
        if (input.customCode) {
          throw new ApiError(409, 'CODE_EXISTS', 'Ese código de regalo ya existe.');
        }
        index -= 1;
        continue;
      }
      const id = `gift_${randomToken(16)}`;
      prepare(`
        INSERT INTO gift_codes
          (id, code_hash, code_hint, label, status, max_redemptions, redemption_count, redeem_by,
           access_starts_at, duration_days, duration_months, ends_at, unlimited, recipient_email,
           created_by, created_at, updated_at, notes)
        VALUES (?, ?, ?, ?, 'active', ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        hash,
        codeHint(code),
        input.label || null,
        maxRedemptions,
        input.redeemBy ? new Date(input.redeemBy).toISOString() : null,
        window.accessStartsAt,
        window.durationDays,
        window.durationMonths,
        window.endsAt,
        window.unlimited ? 1 : 0,
        recipient,
        input.actor.id,
        now,
        now,
        input.notes || null
      );
      for (const resourceId of input.resourceIds) {
        prepare(
          'INSERT OR IGNORE INTO gift_code_resources (gift_code_id, resource_id) VALUES (?, ?)'
        ).run(id, resourceId);
      }
      created.push({ id, code, hint: codeHint(code) });
    }
  });

  return created;
}

export interface GiftRedemptionResult {
  redemptionId: string;
  giftCodeId: string;
  resources: Array<{ id: string; slug: string; title: string; type: string }>;
  accessStartsAt: string;
  accessEndsAt: string | null;
  alreadyRedeemed: boolean;
}

export function redeemGiftCode(input: {
  code: string;
  userId: string;
  userEmail: string;
  emailVerified: boolean;
}): GiftRedemptionResult {
  const gift = loadGiftCodeByHash(hashCode(input.code));
  if (!gift) {
    throw new ApiError(404, 'GIFT_NOT_FOUND', 'El código de regalo no existe.');
  }
  const now = nowIso();

  // La idempotencia se resuelve antes de los límites: un beneficiario que ya
  // canjeó debe poder consultar su resultado aunque el lote esté agotado.
  const existingRedemption = prepare(
    'SELECT * FROM gift_redemptions WHERE gift_code_id = ? AND user_id = ?'
  ).get(gift.id, input.userId) as
    | { id: string; access_starts_at: string; access_ends_at: string | null; status: string }
    | undefined;
  if (existingRedemption) {
    return {
      redemptionId: existingRedemption.id,
      giftCodeId: gift.id,
      resources: giftResources(gift.id),
      accessStartsAt: existingRedemption.access_starts_at,
      accessEndsAt: existingRedemption.access_ends_at,
      alreadyRedeemed: true,
    };
  }

  if (gift.status === 'paused') {
    throw new ApiError(409, 'GIFT_PAUSED', 'El código de regalo está pausado.');
  }
  if (gift.status === 'revoked') {
    throw new ApiError(409, 'GIFT_REVOKED', 'El código de regalo fue revocado.');
  }
  if (gift.status === 'exhausted' || (!gift.unlimited && gift.redemption_count >= gift.max_redemptions)) {
    throw new ApiError(409, 'GIFT_EXHAUSTED', 'El código agotó sus canjes.');
  }
  if (gift.redeem_by && gift.redeem_by <= now) {
    throw new ApiError(409, 'GIFT_EXPIRED', 'El plazo para canjear este código ha expirado.');
  }
  if (gift.recipient_email && !input.emailVerified) {
    throw new ApiError(
      403,
      'GIFT_EMAIL_UNVERIFIED',
      'Este regalo nominativo requiere un correo verificado.'
    );
  }
  if (
    gift.recipient_email &&
    gift.recipient_email.toLowerCase() !== input.userEmail.toLowerCase()
  ) {
    throw new ApiError(403, 'GIFT_RECIPIENT_MISMATCH', 'Este código está reservado para otro destinatario.');
  }

  const scheduledStart = gift.access_starts_at || now;
  const window = computeAccessWindow({
    startsAt: scheduledStart,
    durationDays: gift.duration_days === null ? null : Number(gift.duration_days),
    durationMonths: gift.duration_months === null ? null : Number(gift.duration_months),
    endsAt: gift.ends_at,
    unlimited: Boolean(gift.unlimited),
  });

  return withTransaction(() => {
    const current = loadGiftCode(gift.id);
    if (!current) throw new ApiError(404, 'GIFT_NOT_FOUND', 'El código de regalo no existe.');
    if (current.status === 'exhausted') {
      throw new ApiError(409, 'GIFT_EXHAUSTED', 'El código agotó sus canjes.');
    }
    if (current.status !== 'active') {
      throw new ApiError(409, 'GIFT_NOT_ACTIVE', 'El código ya no está activo.');
    }
    if (current.redeem_by && current.redeem_by <= now) {
      throw new ApiError(409, 'GIFT_EXPIRED', 'El plazo para canjear este código ha expirado.');
    }
    if (!current.unlimited && current.redemption_count >= current.max_redemptions) {
      throw new ApiError(409, 'GIFT_EXHAUSTED', 'El código agotó sus canjes.');
    }

    const update = prepare(`
      UPDATE gift_codes
      SET redemption_count = redemption_count + 1,
          status = CASE
            WHEN unlimited = 0 AND redemption_count + 1 >= max_redemptions THEN 'exhausted'
            ELSE status
          END,
          updated_at = ?
      WHERE id = ? AND status = 'active'
    `).run(now, gift.id);
    if (update.changes === 0) {
      throw new ApiError(409, 'GIFT_RACE', 'El código ya no admite canjes.');
    }

    const redemptionId = `gred_${randomToken(16)}`;
    prepare(`
      INSERT INTO gift_redemptions
        (id, gift_code_id, user_id, redeemed_at, access_starts_at, access_ends_at, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(redemptionId, gift.id, input.userId, now, window.startsAt, window.endsAt);

    const resources = giftResources(gift.id);
    for (const resource of resources) {
      const existingEntitlement = prepare(`
        SELECT id FROM entitlements
        WHERE user_id = ? AND resource_id = ? AND origin = 'gift' AND origin_ref = ?
          AND status <> 'revoked'
      `).get(input.userId, resource.id, redemptionId) as { id: string } | undefined;
      if (existingEntitlement) continue;
      prepare(`
        INSERT INTO entitlements
          (id, user_id, resource_id, origin, origin_ref, status, starts_at, ends_at,
           metadata_json, created_at, updated_at)
        VALUES (?, ?, ?, 'gift', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        `ent_${randomToken(16)}`,
        input.userId,
        resource.id,
        redemptionId,
        effectiveStatus('active', window.startsAt, window.endsAt) === 'pending'
          ? 'pending'
          : 'active',
        window.startsAt,
        window.endsAt,
        JSON.stringify({ giftCodeId: gift.id }),
        now,
        now
      );
      createEnrollment({
        userId: input.userId,
        resourceId: resource.id,
        origin: 'gift',
        giftRedemptionId: redemptionId,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
      });
    }

    return {
      redemptionId,
      giftCodeId: gift.id,
      resources,
      accessStartsAt: window.startsAt,
      accessEndsAt: window.endsAt,
      alreadyRedeemed: false,
    };
  });
}

export function pauseGiftCode(giftCodeId: string, paused: boolean): void {
  const gift = loadGiftCode(giftCodeId);
  if (!gift) throw new ApiError(404, 'GIFT_NOT_FOUND', 'El código de regalo no existe.');
  if (gift.status === 'revoked') {
    throw new ApiError(409, 'GIFT_REVOKED', 'Un código revocado no puede reactivarse.');
  }
  prepare('UPDATE gift_codes SET status = ?, updated_at = ? WHERE id = ?').run(
    paused ? 'paused' : 'active',
    nowIso(),
    giftCodeId
  );
}

export function revokeGiftCode(giftCodeId: string, actor: AuthUser, reason: string): void {
  const gift = loadGiftCode(giftCodeId);
  if (!gift) throw new ApiError(404, 'GIFT_NOT_FOUND', 'El código de regalo no existe.');
  const now = nowIso();
  withTransaction(() => {
    prepare(`
      UPDATE gift_codes SET status = 'revoked', revoked_at = ?, updated_at = ? WHERE id = ?
    `).run(now, now, giftCodeId);
    void actor;
    void reason;
  });
}

export function listGiftBeneficiaries(giftCodeId: string): Array<{
  redemptionId: string;
  userId: string;
  email: string;
  name: string;
  redeemedAt: string;
  accessStartsAt: string;
  accessEndsAt: string | null;
  status: string;
  effectiveStatus: string;
}> {
  const rows = prepare(`
    SELECT gr.id, gr.user_id, u.email, u.display_name, gr.redeemed_at,
           gr.access_starts_at, gr.access_ends_at, gr.status
    FROM gift_redemptions gr
    JOIN users u ON u.id = gr.user_id
    WHERE gr.gift_code_id = ?
    ORDER BY gr.redeemed_at DESC
  `).all(giftCodeId) as Array<{
    id: string;
    user_id: string;
    email: string;
    display_name: string | null;
    redeemed_at: string;
    access_starts_at: string;
    access_ends_at: string | null;
    status: string;
  }>;
  return rows.map((row) => ({
    redemptionId: row.id,
    userId: row.user_id,
    email: row.email,
    name: row.display_name || row.email,
    redeemedAt: row.redeemed_at,
    accessStartsAt: row.access_starts_at,
    accessEndsAt: row.access_ends_at,
    status: row.status,
    effectiveStatus: effectiveStatus(row.status, row.access_starts_at, row.access_ends_at),
  }));
}

export function changeGiftRedemptionStatus(
  redemptionId: string,
  action: 'pause' | 'resume' | 'revoke',
  actor: AuthUser,
  reason?: string
): void {
  const redemption = prepare('SELECT * FROM gift_redemptions WHERE id = ?').get(redemptionId) as
    | { id: string; user_id: string; gift_code_id: string; access_starts_at: string; access_ends_at: string | null; status: string }
    | undefined;
  if (!redemption) {
    throw new ApiError(404, 'GIFT_REDEMPTION_NOT_FOUND', 'El canje no existe.');
  }
  const now = nowIso();
  withTransaction(() => {
    if (action === 'revoke') {
      prepare("UPDATE gift_redemptions SET status = 'revoked' WHERE id = ?").run(redemptionId);
      prepare(`
        UPDATE entitlements
        SET status = 'revoked', revoked_at = ?, revoked_by = ?, revoke_reason = ?, updated_at = ?
        WHERE user_id = ? AND origin = 'gift' AND origin_ref = ? AND status <> 'revoked'
      `).run(now, actor.id, reason || 'Regalo revocado', now, redemption.user_id, redemptionId);
    } else if (action === 'pause') {
      prepare("UPDATE gift_redemptions SET status = 'paused' WHERE id = ?").run(redemptionId);
      prepare(`
        UPDATE entitlements SET status = 'paused', updated_at = ?
        WHERE user_id = ? AND origin = 'gift' AND origin_ref = ? AND status IN ('active','pending')
      `).run(now, redemption.user_id, redemptionId);
    } else {
      prepare("UPDATE gift_redemptions SET status = 'active' WHERE id = ?").run(redemptionId);
      prepare(`
        UPDATE entitlements SET status = 'active', updated_at = ?
        WHERE user_id = ? AND origin = 'gift' AND origin_ref = ? AND status = 'paused'
      `).run(now, redemption.user_id, redemptionId);
    }
  });
}

export function expandGiftCodeScope(input: {
  giftCodeId: string;
  resourceIds: string[];
  applyToExisting: boolean;
  actor: AuthUser;
}): {
  added: Array<{ id: string; slug: string; title: string }>;
  affectedBeneficiaries: number;
  futureOnly: boolean;
} {
  const gift = loadGiftCode(input.giftCodeId);
  if (!gift) throw new ApiError(404, 'GIFT_NOT_FOUND', 'El código de regalo no existe.');
  if (input.resourceIds.length === 0) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Selecciona al menos un recurso nuevo.');
  }
  const now = nowIso();
  const added: Array<{ id: string; slug: string; title: string }> = [];
  let affected = 0;

  withTransaction(() => {
    for (const resourceId of input.resourceIds) {
      const resource = findResourceById(resourceId);
      if (!resource) {
        throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Uno de los recursos no existe.');
      }
      const exists = prepare(
        'SELECT 1 AS present FROM gift_code_resources WHERE gift_code_id = ? AND resource_id = ?'
      ).get(input.giftCodeId, resourceId);
      prepare(
        'INSERT OR IGNORE INTO gift_code_resources (gift_code_id, resource_id) VALUES (?, ?)'
      ).run(input.giftCodeId, resourceId);
      if (!exists) {
        added.push({ id: resource.id, slug: resource.slug, title: resource.title });
      }
    }
    prepare('UPDATE gift_codes SET updated_at = ? WHERE id = ?').run(now, input.giftCodeId);

    if (input.applyToExisting) {
      const redemptions = prepare(
        "SELECT * FROM gift_redemptions WHERE gift_code_id = ? AND status IN ('active','paused')"
      ).all(input.giftCodeId) as Array<{
        id: string;
        user_id: string;
        access_starts_at: string;
        access_ends_at: string | null;
        status: string;
      }>;
      for (const redemption of redemptions) {
        let changed = false;
        for (const resource of added) {
          const exists = prepare(`
            SELECT id FROM entitlements
            WHERE user_id = ? AND resource_id = ? AND origin = 'gift' AND origin_ref = ?
              AND status <> 'revoked'
          `).get(redemption.user_id, resource.id, redemption.id);
          if (exists) continue;
          prepare(`
            INSERT INTO entitlements
              (id, user_id, resource_id, origin, origin_ref, status, starts_at, ends_at,
               granted_by, metadata_json, created_at, updated_at)
            VALUES (?, ?, ?, 'gift', ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            `ent_${randomToken(16)}`,
            redemption.user_id,
            resource.id,
            redemption.id,
            redemption.status === 'paused' ? 'paused' : 'active',
            redemption.access_starts_at,
            redemption.access_ends_at,
            input.actor.id,
            JSON.stringify({ giftCodeId: gift.id, expanded: true }),
            now,
            now
          );
          createEnrollment({
            userId: redemption.user_id,
            resourceId: resource.id,
            origin: 'gift',
            giftRedemptionId: redemption.id,
            startsAt: redemption.access_starts_at,
            endsAt: redemption.access_ends_at,
          });
          changed = true;
        }
        if (changed) affected += 1;
      }
    }
  });

  return {
    added,
    affectedBeneficiaries: affected,
    futureOnly: !input.applyToExisting,
  };
}

export function updateGiftCodeSettings(input: {
  giftCodeId: string;
  redeemBy?: string | null;
  maxRedemptions?: number | null;
  durationDays?: number | null;
  durationMonths?: number | null;
  endsAt?: string | null;
  unlimited?: boolean;
  notes?: string | null;
}): void {
  const gift = loadGiftCode(input.giftCodeId);
  if (!gift) throw new ApiError(404, 'GIFT_NOT_FOUND', 'El código de regalo no existe.');
  if (gift.status === 'revoked') {
    throw new ApiError(409, 'GIFT_REVOKED', 'Un código revocado no puede modificarse.');
  }
  const maxRedemptions =
    input.maxRedemptions === undefined || input.maxRedemptions === null
      ? gift.max_redemptions
      : Math.max(1, Math.min(Number(input.maxRedemptions), 100000));
  prepare(`
    UPDATE gift_codes
    SET redeem_by = ?, max_redemptions = ?, duration_days = ?, duration_months = ?, ends_at = ?,
        unlimited = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.redeemBy === undefined
      ? gift.redeem_by
      : input.redeemBy
      ? new Date(input.redeemBy).toISOString()
      : null,
    maxRedemptions,
    input.durationDays === undefined ? gift.duration_days : input.durationDays,
    input.durationMonths === undefined ? gift.duration_months : input.durationMonths,
    input.endsAt === undefined
      ? gift.ends_at
      : input.endsAt
      ? new Date(input.endsAt).toISOString()
      : null,
    input.unlimited === undefined ? gift.unlimited : input.unlimited ? 1 : 0,
    input.notes === undefined ? gift.notes : input.notes,
    nowIso(),
    input.giftCodeId
  );
}
