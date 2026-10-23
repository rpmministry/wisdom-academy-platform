import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import { ApiError } from '../http/api';
import { codeHint, generateHumanCode, normalizeCode, randomToken } from '../security/random';
import { hashCode } from '../security/codes';
import type { AuthUser } from '../auth/authorization';

export type DiscountKind = 'percentage' | 'fixed' | 'full';

export interface ProductForDiscount {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  currency: string;
  priceStatus: 'defined' | 'pending';
  resourceIds: string[];
}

export interface DiscountValidation {
  codeId: string;
  discountId: string;
  discountName: string;
  kind: DiscountKind;
  discountCents: number;
  eligibleProductIds: string[];
  eligibleSubtotalCents: number;
}

export function hashDiscountCode(code: string): string {
  return hashCode(code);
}

export function loadProductForDiscount(productId: string): ProductForDiscount | null {
  const row = prepare('SELECT * FROM products WHERE id = ?').get(productId) as
    | {
        id: string;
        slug: string;
        name: string;
        price_cents: number;
        currency: string;
        price_status: 'defined' | 'pending';
        status: string;
      }
    | undefined;
  if (!row || row.status !== 'published') return null;
  const resources = prepare('SELECT resource_id FROM product_resources WHERE product_id = ?').all(
    productId
  ) as Array<{ resource_id: string }>;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    priceCents: Number(row.price_cents),
    currency: row.currency,
    priceStatus: row.price_status === 'pending' ? 'pending' : 'defined',
    resourceIds: resources.map((item) => item.resource_id),
  };
}

interface DiscountRow {
  id: string;
  name: string;
  kind: DiscountKind;
  value: number;
  status: string;
  applies_all: number;
  starts_at: string;
  ends_at: string | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  min_purchase_cents: number;
  stackable: number;
  created_at: string;
}

function loadDiscountRow(id: string): DiscountRow | null {
  return (
    (prepare('SELECT * FROM discounts WHERE id = ?').get(id) as DiscountRow | undefined) ?? null
  );
}

function discountResourceSet(discountId: string): Set<string> {
  const rows = prepare('SELECT resource_id FROM discount_resources WHERE discount_id = ?').all(
    discountId
  ) as Array<{ resource_id: string }>;
  return new Set(rows.map((row) => row.resource_id));
}

export function validateDiscountForUser(input: {
  code: string;
  userId: string;
  products: ProductForDiscount[];
  now?: string;
}): DiscountValidation {
  const now = input.now || nowIso();
  const hash = hashDiscountCode(input.code);
  const codeRow = prepare('SELECT * FROM discount_codes WHERE code_hash = ?').get(hash) as
    | { id: string; discount_id: string; status: string }
    | undefined;
  if (!codeRow) {
    throw new ApiError(404, 'DISCOUNT_NOT_FOUND', 'El código de descuento no existe.');
  }
  if (codeRow.status === 'paused') {
    throw new ApiError(409, 'DISCOUNT_PAUSED', 'El código de descuento está pausado.');
  }
  if (codeRow.status === 'revoked') {
    throw new ApiError(409, 'DISCOUNT_REVOKED', 'El código de descuento fue revocado.');
  }

  const discount = loadDiscountRow(codeRow.discount_id);
  if (!discount) {
    throw new ApiError(404, 'DISCOUNT_NOT_FOUND', 'La promoción no existe.');
  }
  if (discount.status !== 'active') {
    throw new ApiError(409, 'DISCOUNT_INACTIVE', 'La promoción no está activa.');
  }
  if (discount.starts_at > now) {
    throw new ApiError(409, 'DISCOUNT_NOT_STARTED', 'La promoción aún no ha comenzado.');
  }
  if (discount.ends_at && discount.ends_at <= now) {
    throw new ApiError(409, 'DISCOUNT_EXPIRED', 'La promoción ha expirado.');
  }

  const used = prepare(`
    SELECT COUNT(*) AS total FROM discount_redemptions
    WHERE discount_code_id = ? AND status IN ('reserved','consumed')
  `).get(codeRow.id) as { total: number };
  if (discount.max_uses !== null && Number(used.total) >= Number(discount.max_uses)) {
    throw new ApiError(409, 'DISCOUNT_EXHAUSTED', 'El código de descuento agotó sus usos.');
  }

  const usedByUser = prepare(`
    SELECT COUNT(*) AS total FROM discount_redemptions
    WHERE discount_code_id = ? AND user_id = ? AND status IN ('reserved','consumed')
  `).get(codeRow.id, input.userId) as { total: number };
  if (
    discount.max_uses_per_user !== null &&
    Number(usedByUser.total) >= Number(discount.max_uses_per_user)
  ) {
    throw new ApiError(409, 'DISCOUNT_USER_LIMIT', 'Ya utilizaste el máximo permitido de este código.');
  }

  const eligibleResources = discount.applies_all
    ? null
    : discountResourceSet(discount.id);
  const eligibleProducts = input.products.filter((product) => {
    if (product.resourceIds.length === 0) return false;
    if (!eligibleResources) return true;
    return product.resourceIds.every((resourceId) => eligibleResources.has(resourceId));
  });

  if (eligibleProducts.length === 0) {
    throw new ApiError(
      400,
      'DISCOUNT_NOT_APPLICABLE',
      'El código no aplica a ninguno de los productos seleccionados.'
    );
  }

  const eligibleSubtotal = eligibleProducts.reduce((total, product) => total + product.priceCents, 0);
  if (eligibleSubtotal < Number(discount.min_purchase_cents)) {
    throw new ApiError(
      400,
      'DISCOUNT_MIN_PURCHASE',
      'La compra elegible no alcanza el mínimo requerido por la promoción.'
    );
  }

  let discountCents = 0;
  if (discount.kind === 'percentage') {
    discountCents = Math.floor((eligibleSubtotal * Number(discount.value)) / 100);
  } else if (discount.kind === 'fixed') {
    discountCents = Math.min(eligibleSubtotal, Number(discount.value));
  } else {
    discountCents = eligibleSubtotal;
  }
  discountCents = Math.max(0, Math.min(discountCents, eligibleSubtotal));

  return {
    codeId: codeRow.id,
    discountId: discount.id,
    discountName: discount.name,
    kind: discount.kind,
    discountCents,
    eligibleProductIds: eligibleProducts.map((product) => product.id),
    eligibleSubtotalCents: eligibleSubtotal,
  };
}

export function reserveDiscountRedemption(input: {
  validation: DiscountValidation;
  userId: string;
  orderId: string;
  status?: 'reserved' | 'consumed';
}): void {
  const now = nowIso();
  prepare(`
    INSERT INTO discount_redemptions
      (id, discount_code_id, user_id, order_id, amount_cents, status, created_at, consumed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `dr_${randomToken(12)}`,
    input.validation.codeId,
    input.userId,
    input.orderId,
    input.validation.discountCents,
    input.status || 'reserved',
    now,
    input.status === 'consumed' ? now : null
  );
}

export function consumeDiscountRedemption(orderId: string): void {
  prepare(`
    UPDATE discount_redemptions
    SET status = 'consumed', consumed_at = ?
    WHERE order_id = ? AND status = 'reserved'
  `).run(nowIso(), orderId);
}

export function releaseDiscountRedemption(orderId: string): void {
  prepare(`
    UPDATE discount_redemptions SET status = 'released'
    WHERE order_id = ? AND status = 'reserved'
  `).run(orderId);
}

export interface DiscountCodeView {
  id: string;
  hint: string;
  status: string;
  createdAt: string;
  redemptions: number;
}

export interface DiscountView {
  id: string;
  name: string;
  kind: DiscountKind;
  value: number;
  status: string;
  appliesAll: boolean;
  startsAt: string;
  endsAt: string | null;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  minPurchaseCents: number;
  stackable: boolean;
  resources: Array<{ id: string; slug: string; title: string }>;
  codes: DiscountCodeView[];
  redemptions: number;
  createdAt: string;
}

export function listDiscounts(): DiscountView[] {
  const rows = prepare('SELECT * FROM discounts ORDER BY created_at DESC').all() as DiscountRow[];
  return rows.map((row) => {
    const resources = prepare(`
      SELECT r.id, r.slug, r.title
      FROM discount_resources dr
      JOIN resources r ON r.id = dr.resource_id
      WHERE dr.discount_id = ?
      ORDER BY r.title
    `).all(row.id) as Array<{ id: string; slug: string; title: string }>;
    const codes = prepare(`
      SELECT dc.id, dc.code_hint, dc.status, dc.created_at,
             (SELECT COUNT(*) FROM discount_redemptions dr
              WHERE dr.discount_code_id = dc.id AND dr.status = 'consumed') AS redemptions
      FROM discount_codes dc WHERE dc.discount_id = ?
      ORDER BY dc.created_at DESC
    `).all(row.id) as Array<{
      id: string;
      code_hint: string;
      status: string;
      created_at: string;
      redemptions: number;
    }>;
    const totalRedemptions = prepare(`
      SELECT COUNT(*) AS total FROM discount_redemptions dr
      JOIN discount_codes dc ON dc.id = dr.discount_code_id
      WHERE dc.discount_id = ? AND dr.status = 'consumed'
    `).get(row.id) as { total: number };

    return {
      id: row.id,
      name: row.name,
      kind: row.kind,
      value: Number(row.value),
      status: row.status,
      appliesAll: Boolean(row.applies_all),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      maxUses: row.max_uses === null ? null : Number(row.max_uses),
      maxUsesPerUser: row.max_uses_per_user === null ? null : Number(row.max_uses_per_user),
      minPurchaseCents: Number(row.min_purchase_cents),
      stackable: Boolean(row.stackable),
      resources,
      codes: codes.map((code) => ({
        id: code.id,
        hint: code.code_hint,
        status: code.status,
        createdAt: code.created_at,
        redemptions: Number(code.redemptions),
      })),
      redemptions: Number(totalRedemptions.total),
      createdAt: row.created_at,
    };
  });
}

export function createDiscount(input: {
  actor: AuthUser;
  name: string;
  kind: DiscountKind;
  value: number;
  resourceIds: string[];
  appliesAll?: boolean;
  status?: 'draft' | 'active';
  startsAt?: string | null;
  endsAt?: string | null;
  maxUses?: number | null;
  maxUsesPerUser?: number | null;
  minPurchaseCents?: number;
  stackable?: boolean;
  codeCount?: number;
  customCode?: string | null;
}): { discountId: string; codes: string[] } {
  const appliesAll = Boolean(input.appliesAll);
  if (!appliesAll && input.resourceIds.length === 0) {
    throw new ApiError(
      400,
      'DISCOUNT_SCOPE_REQUIRED',
      'Selecciona al menos un recurso o autoriza explícitamente toda la plataforma.'
    );
  }
  if (input.kind === 'percentage' && (input.value < 1 || input.value > 100)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El porcentaje debe estar entre 1 y 100.');
  }
  if (input.kind === 'fixed' && input.value < 1) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El descuento fijo debe ser mayor que cero.');
  }
  if (input.kind === 'full') {
    // Un descuento de tipo full solo puede crearlo quien gestiona promociones.
    input.value = 0;
  }

  const startsAt = input.startsAt ? new Date(input.startsAt).toISOString() : nowIso();
  const endsAt = input.endsAt ? new Date(input.endsAt).toISOString() : null;
  if (endsAt && endsAt <= startsAt) {
    throw new ApiError(400, 'DATE_RANGE', 'La fecha de fin debe ser posterior al inicio.');
  }
  if (input.resourceIds.length > 0) {
    const existentes = prepare(
      `SELECT COUNT(*) AS total FROM resources WHERE id IN (${input.resourceIds.map(() => '?').join(',')})`
    ).get(...input.resourceIds) as { total: number };
    if (Number(existentes.total) !== input.resourceIds.length) {
      throw new ApiError(400, 'RESOURCE_NOT_FOUND', 'Uno de los recursos seleccionados no existe.');
    }
  }

  const discountId = `dsc_${randomToken(16)}`;
  const now = nowIso();
  withTransaction(() => {
    prepare(`
      INSERT INTO discounts
        (id, name, kind, value, status, applies_all, starts_at, ends_at, max_uses, max_uses_per_user,
         min_purchase_cents, stackable, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      discountId,
      input.name,
      input.kind,
      input.value,
      input.status || 'active',
      appliesAll ? 1 : 0,
      startsAt,
      endsAt,
      input.maxUses ?? null,
      input.maxUsesPerUser ?? null,
      input.minPurchaseCents ?? 0,
      input.stackable ? 1 : 0,
      input.actor.id,
      now,
      now
    );
    for (const resourceId of input.resourceIds) {
      prepare(
        'INSERT OR IGNORE INTO discount_resources (discount_id, resource_id) VALUES (?, ?)'
      ).run(discountId, resourceId);
    }
  });

  const codes: string[] = [];
  if (input.customCode) {
    const created = createDiscountCodes({
      actor: input.actor,
      discountId,
      count: 1,
      customCode: input.customCode,
    });
    return { discountId, codes: created };
  }
  if ((input.codeCount ?? 1) > 0) {
    codes.push(
      ...createDiscountCodes({
        actor: input.actor,
        discountId,
        count: input.codeCount ?? 1,
      })
    );
  }
  return { discountId, codes };
}

export function createDiscountCodes(input: {
  actor: AuthUser;
  discountId: string;
  count: number;
  customCode?: string;
}): string[] {
  if (!loadDiscountRow(input.discountId)) {
    throw new ApiError(404, 'DISCOUNT_NOT_FOUND', 'La promoción no existe.');
  }
  if (input.count < 1 || input.count > 100) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Genera entre 1 y 100 códigos por lote.');
  }
  const generated: string[] = [];
  withTransaction(() => {
    for (let index = 0; index < input.count; index += 1) {
      const code =
        input.customCode && index === 0
          ? input.customCode.toUpperCase()
          : generateHumanCode('WA-PROMO', 20);
      const normalized = normalizeCode(code);
      if (normalized.length < 6) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'El código debe tener al menos 6 caracteres.');
      }
      const hash = hashDiscountCode(code);
      if (prepare('SELECT id FROM discount_codes WHERE code_hash = ?').get(hash)) {
        if (input.customCode) {
          throw new ApiError(409, 'CODE_EXISTS', 'Ese código ya existe.');
        }
        index -= 1;
        continue;
      }
      prepare(`
        INSERT INTO discount_codes
          (id, discount_id, code_hash, code_hint, status, created_by, created_at)
        VALUES (?, ?, ?, ?, 'active', ?, ?)
      `).run(
        `dc_${randomToken(12)}`,
        input.discountId,
        hash,
        codeHint(code),
        input.actor.id,
        nowIso()
      );
      generated.push(code);
    }
  });
  return generated;
}

export function updateDiscountStatus(
  discountId: string,
  status: 'active' | 'paused' | 'draft'
): void {
  if (!loadDiscountRow(discountId)) {
    throw new ApiError(404, 'DISCOUNT_NOT_FOUND', 'La promoción no existe.');
  }
  prepare('UPDATE discounts SET status = ?, updated_at = ? WHERE id = ?').run(
    status,
    nowIso(),
    discountId
  );
}

export function updateDiscountCodeStatus(
  codeId: string,
  status: 'active' | 'paused' | 'revoked'
): void {
  const row = prepare('SELECT id FROM discount_codes WHERE id = ?').get(codeId);
  if (!row) throw new ApiError(404, 'DISCOUNT_CODE_NOT_FOUND', 'El código no existe.');
  prepare('UPDATE discount_codes SET status = ?, revoked_at = ? WHERE id = ?').run(
    status,
    status === 'revoked' ? nowIso() : null,
    codeId
  );
}
