import { prepare } from '../db';
import { nowIso } from '../db/sqlite';
import { ApiError } from '../http/api';

/**
 * Reporte financiero del CRM.
 *
 * Los importes se leen de las órdenes y transacciones persistidas. Una orden
 * pendiente o fallida nunca suma como cobro; los reembolsos solo restan cuando
 * su transacción está completada. El reporte no estima conversiones porque la
 * plataforma no registra visitas ni intenciones de compra.
 */

export const FINANCE_STATUSES = [
  'pending',
  'paid',
  'failed',
  'cancelled',
  'refunded',
  'reversed',
  'free',
] as const;

export type FinanceStatus = (typeof FINANCE_STATUSES)[number];

export interface FinanceFilters {
  from?: string | null;
  to?: string | null;
  status?: string | null;
  productId?: string | null;
  q?: string | null;
  limit?: number | null;
}

export interface FinanceOrder {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: FinanceStatus;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  paypalOrderId: string | null;
  paypalCaptureId: string | null;
  discountCodeHint: string | null;
  createdAt: string;
  paidAt: string | null;
  updatedAt: string;
  items: Array<{
    productId: string;
    title: string;
    unitPriceCents: number;
    quantity: number;
  }>;
  transactions: Array<{
    kind: string;
    amountCents: number;
    currency: string;
    status: string;
    providerTxnId: string | null;
    createdAt: string;
  }>;
}

export interface FinanceReport {
  currency: string;
  generatedAt: string;
  filters: {
    from: string | null;
    to: string | null;
    status: FinanceStatus | null;
    productId: string | null;
    q: string | null;
  };
  summary: {
    capturedCents: number;
    refundedCents: number;
    netCents: number;
    capturedOrders: number;
    paidOrders: number;
    freeOrders: number;
    pendingOrders: number;
    failedOrders: number;
    refundedOrders: number;
    cancelledOrders: number;
  };
  series: Array<{
    date: string;
    grossCents: number;
    refundCents: number;
    netCents: number;
    orders: number;
  }>;
  products: Array<{
    productId: string;
    title: string;
    grossCents: number;
    orders: number;
  }>;
  promotions: Array<{
    discountName: string;
    codeHint: string;
    redemptions: number;
    discountCents: number;
  }>;
  orders: FinanceOrder[];
}

const MAX_LIMIT = 500;

function dateOnly(value: string | null | undefined, field: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new ApiError(400, 'INVALID_DATE', `El filtro ${field} debe usar el formato AAAA-MM-DD.`);
  }
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== trimmed) {
    throw new ApiError(400, 'INVALID_DATE', `El filtro ${field} no es una fecha válida.`);
  }
  return trimmed;
}

interface SqlFilter {
  clause: string;
  params: Array<string | number>;
}

function buildFilter(filters: FinanceFilters): {
  filter: SqlFilter;
  normalized: FinanceReport['filters'];
} {
  const from = dateOnly(filters.from, 'desde');
  const to = dateOnly(filters.to, 'hasta');
  if (from && to && from > to) {
    throw new ApiError(400, 'INVALID_RANGE', 'La fecha inicial no puede ser posterior a la final.');
  }
  const status = typeof filters.status === 'string' && filters.status.trim()
    ? filters.status.trim()
    : null;
  if (status && !FINANCE_STATUSES.includes(status as FinanceStatus)) {
    throw new ApiError(400, 'INVALID_STATUS', 'El estado financiero solicitado no es válido.');
  }
  const productId = typeof filters.productId === 'string' && filters.productId.trim()
    ? filters.productId.trim().slice(0, 120)
    : null;
  const q = typeof filters.q === 'string' && filters.q.trim()
    ? filters.q.trim().slice(0, 120)
    : null;

  const clauses: string[] = ['1=1'];
  const params: Array<string | number> = [];
  if (from) {
    clauses.push('COALESCE(o.paid_at, o.created_at) >= ?');
    params.push(`${from}T00:00:00.000Z`);
  }
  const toIso = to
    ? new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86_400_000).toISOString()
    : null;
  if (toIso) {
    clauses.push('COALESCE(o.paid_at, o.created_at) < ?');
    params.push(toIso);
  }
  if (status) {
    clauses.push('o.status = ?');
    params.push(status);
  }
  if (productId) {
    clauses.push(
      'EXISTS (SELECT 1 FROM order_items oi_filter WHERE oi_filter.order_id = o.id AND oi_filter.product_id = ?)'
    );
    params.push(productId);
  }
  if (q) {
    const like = `%${q}%`;
    clauses.push(`(
      o.id LIKE ?
      OR u.email LIKE ?
      OR COALESCE(u.display_name, '') LIKE ?
      OR COALESCE(o.paypal_order_id, '') LIKE ?
      OR COALESCE(o.paypal_capture_id, '') LIKE ?
    )`);
    params.push(like, like, like, like, like);
  }

  return {
    filter: { clause: clauses.join(' AND '), params },
    normalized: {
      from,
      to,
      status: (status as FinanceStatus | null) ?? null,
      productId,
      q,
    },
  };
}

export function buildFinanceReport(filters: FinanceFilters = {}): FinanceReport {
  const { filter, normalized } = buildFilter(filters);
  const limit = Math.max(1, Math.min(MAX_LIMIT, Number(filters.limit) || 300));

  const summaryRow = prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN o.status IN ('paid','refunded','reversed') THEN o.total_cents ELSE 0 END), 0) AS captured_cents,
      COALESCE(SUM(CASE WHEN o.status IN ('paid','refunded','reversed') THEN 1 ELSE 0 END), 0) AS captured_orders,
      COALESCE(SUM(CASE WHEN o.status = 'paid' THEN 1 ELSE 0 END), 0) AS paid_orders,
      COALESCE(SUM(CASE WHEN o.status = 'free' THEN 1 ELSE 0 END), 0) AS free_orders,
      COALESCE(SUM(CASE WHEN o.status = 'pending' THEN 1 ELSE 0 END), 0) AS pending_orders,
      COALESCE(SUM(CASE WHEN o.status = 'failed' THEN 1 ELSE 0 END), 0) AS failed_orders,
      COALESCE(SUM(CASE WHEN o.status IN ('refunded','reversed') THEN 1 ELSE 0 END), 0) AS refunded_orders,
      COALESCE(SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelled_orders
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE ${filter.clause}
  `).get(...filter.params) as Record<string, number>;

  const refundRow = prepare(`
    SELECT COALESCE(SUM(t.amount_cents), 0) AS refunded_cents
    FROM transactions t
    JOIN orders o ON o.id = t.order_id
    JOIN users u ON u.id = o.user_id
    WHERE t.kind IN ('refund','reversal')
      AND t.status = 'completed'
      AND ${filter.clause}
  `).get(...filter.params) as { refunded_cents?: number } | undefined;

  const capturedCents = Number(summaryRow.captured_cents || 0);
  const refundedCents = Number(refundRow?.refunded_cents || 0);

  const dailyRows = prepare(`
    SELECT
      substr(COALESCE(o.paid_at, o.created_at), 1, 10) AS day,
      SUM(CASE WHEN o.status IN ('paid','refunded','reversed') THEN o.total_cents ELSE 0 END) AS gross_cents,
      SUM(CASE WHEN o.status IN ('paid','refunded','reversed') THEN 1 ELSE 0 END) AS orders
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE ${filter.clause}
    GROUP BY day
    ORDER BY day ASC
  `).all(...filter.params) as Array<{ day: string; gross_cents: number; orders: number }>;

  const refundDaily = prepare(`
    SELECT
      substr(t.created_at, 1, 10) AS day,
      SUM(t.amount_cents) AS refund_cents
    FROM transactions t
    JOIN orders o ON o.id = t.order_id
    JOIN users u ON u.id = o.user_id
    WHERE t.kind IN ('refund','reversal')
      AND t.status = 'completed'
      AND ${filter.clause}
    GROUP BY day
    ORDER BY day ASC
  `).all(...filter.params) as Array<{ day: string; refund_cents: number }>;

  const seriesMap = new Map<
    string,
    { date: string; grossCents: number; refundCents: number; netCents: number; orders: number }
  >();
  for (const row of dailyRows) {
    seriesMap.set(row.day, {
      date: row.day,
      grossCents: Number(row.gross_cents || 0),
      refundCents: 0,
      netCents: 0,
      orders: Number(row.orders || 0),
    });
  }
  for (const row of refundDaily) {
    const current = seriesMap.get(row.day) ?? {
      date: row.day,
      grossCents: 0,
      refundCents: 0,
      netCents: 0,
      orders: 0,
    };
    current.refundCents = Number(row.refund_cents || 0);
    seriesMap.set(row.day, current);
  }
  const series = [...seriesMap.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => ({
      ...row,
      netCents: row.grossCents - row.refundCents,
    }));

  const productRows = prepare(`
    SELECT
      oi.product_id AS product_id,
      oi.title_snapshot AS title,
      SUM(oi.unit_price_cents * oi.quantity) AS gross_cents,
      COUNT(DISTINCT o.id) AS orders
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN users u ON u.id = o.user_id
    WHERE o.status IN ('paid','refunded','reversed')
      AND ${filter.clause}
    GROUP BY oi.product_id, oi.title_snapshot
    ORDER BY gross_cents DESC
    LIMIT 20
  `).all(...filter.params) as Array<{
    product_id: string;
    title: string;
    gross_cents: number;
    orders: number;
  }>;

  const promotionRows = prepare(`
    SELECT
      d.name AS discount_name,
      dc.code_hint AS code_hint,
      COUNT(dr.id) AS redemptions,
      SUM(dr.amount_cents) AS discount_cents
    FROM discount_redemptions dr
    JOIN discount_codes dc ON dc.id = dr.discount_code_id
    JOIN discounts d ON d.id = dc.discount_id
    JOIN orders o ON o.id = dr.order_id
    JOIN users u ON u.id = o.user_id
    WHERE dr.status = 'consumed'
      AND ${filter.clause}
    GROUP BY dr.discount_code_id, d.name, dc.code_hint
    ORDER BY redemptions DESC, discount_cents DESC
    LIMIT 20
  `).all(...filter.params) as Array<{
    discount_name: string;
    code_hint: string;
    redemptions: number;
    discount_cents: number;
  }>;

  const orderRows = prepare(`
    SELECT
      o.id, o.user_id, u.email AS user_email, COALESCE(u.display_name, u.email) AS user_name,
      o.status, o.subtotal_cents, o.discount_cents, o.total_cents, o.currency,
      o.paypal_order_id, o.paypal_capture_id, o.created_at, o.paid_at, o.updated_at,
      dc.code_hint AS discount_code_hint
    FROM orders o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN discount_codes dc ON dc.id = o.discount_code_id
    WHERE ${filter.clause}
    ORDER BY COALESCE(o.paid_at, o.created_at) DESC, o.created_at DESC
    LIMIT ?
  `).all(...filter.params, limit) as Array<{
    id: string;
    user_id: string;
    user_email: string;
    user_name: string;
    status: FinanceStatus;
    subtotal_cents: number;
    discount_cents: number;
    total_cents: number;
    currency: string;
    paypal_order_id: string | null;
    paypal_capture_id: string | null;
    created_at: string;
    paid_at: string | null;
    updated_at: string;
    discount_code_hint: string | null;
  }>;

  const orders: FinanceOrder[] = orderRows.map((row) => {
    const items = prepare(`
      SELECT product_id, title_snapshot, unit_price_cents, quantity
      FROM order_items WHERE order_id = ? ORDER BY id
    `).all(row.id) as Array<{
      product_id: string;
      title_snapshot: string;
      unit_price_cents: number;
      quantity: number;
    }>;
    const transactions = prepare(`
      SELECT kind, amount_cents, currency, status, provider_txn_id, created_at
      FROM transactions WHERE order_id = ? ORDER BY created_at DESC
    `).all(row.id) as Array<{
      kind: string;
      amount_cents: number;
      currency: string;
      status: string;
      provider_txn_id: string | null;
      created_at: string;
    }>;
    return {
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: row.user_name,
      status: row.status,
      subtotalCents: Number(row.subtotal_cents),
      discountCents: Number(row.discount_cents),
      totalCents: Number(row.total_cents),
      currency: row.currency,
      paypalOrderId: row.paypal_order_id,
      paypalCaptureId: row.paypal_capture_id,
      discountCodeHint: row.discount_code_hint,
      createdAt: row.created_at,
      paidAt: row.paid_at,
      updatedAt: row.updated_at,
      items: items.map((item) => ({
        productId: item.product_id,
        title: item.title_snapshot,
        unitPriceCents: Number(item.unit_price_cents),
        quantity: Number(item.quantity),
      })),
      transactions: transactions.map((txn) => ({
        kind: txn.kind,
        amountCents: Number(txn.amount_cents),
        currency: txn.currency,
        status: txn.status,
        providerTxnId: txn.provider_txn_id,
        createdAt: txn.created_at,
      })),
    };
  });

  return {
    currency: orderRows[0]?.currency || 'USD',
    generatedAt: nowIso(),
    filters: normalized,
    summary: {
      capturedCents,
      refundedCents,
      netCents: capturedCents - refundedCents,
      capturedOrders: Number(summaryRow.captured_orders || 0),
      paidOrders: Number(summaryRow.paid_orders || 0),
      freeOrders: Number(summaryRow.free_orders || 0),
      pendingOrders: Number(summaryRow.pending_orders || 0),
      failedOrders: Number(summaryRow.failed_orders || 0),
      refundedOrders: Number(summaryRow.refunded_orders || 0),
      cancelledOrders: Number(summaryRow.cancelled_orders || 0),
    },
    series,
    products: productRows.map((row) => ({
      productId: row.product_id,
      title: row.title,
      grossCents: Number(row.gross_cents || 0),
      orders: Number(row.orders || 0),
    })),
    promotions: promotionRows.map((row) => ({
      discountName: row.discount_name,
      codeHint: row.code_hint,
      redemptions: Number(row.redemptions || 0),
      discountCents: Number(row.discount_cents || 0),
    })),
    orders,
  };
}
