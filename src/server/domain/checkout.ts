import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import { paypalConfig } from '../config';
import { ApiError } from '../http/api';
import type { AuthUser } from '../auth/authorization';
import {
  computeAccessWindow,
  createEnrollment,
  grantEntitlement,
  revokeOriginEntitlements,
} from './access';
import {
  consumeDiscountRedemption,
  loadProductForDiscount,
  releaseDiscountRedemption,
  reserveDiscountRedemption,
  validateDiscountForUser,
  type DiscountValidation,
  type ProductForDiscount,
} from './discounts';
import {
  getPayPalClient,
  parsePayPalAmountToCents,
  PayPalApiError,
  type PayPalCaptureResponse,
} from '../payments/paypal';
import { randomToken } from '../security/random';

type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'reversed' | 'free';

interface OrderRow {
  id: string;
  user_id: string;
  status: OrderStatus;
  subtotal_cents: number;
  discount_cents: number;
  total_cents: number;
  currency: string;
  discount_id: string | null;
  discount_code_id: string | null;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  paypal_approval_url: string | null;
  idempotency_key: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  title_snapshot: string;
  unit_price_cents: number;
  quantity: number;
}

interface ProductDbRow {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  currency: string;
  price_status: 'defined' | 'pending';
  status: string;
  metadata_json: string;
}

interface RefundTransactionRow {
  id: string;
  order_id: string;
  provider_txn_id: string | null;
  amount_cents: number;
  status: string;
}

function loadOrder(orderId: string): OrderRow | null {
  return (
    (prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as OrderRow | undefined) ?? null
  );
}

function orderItems(orderId: string): OrderItemRow[] {
  return prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(
    orderId
  ) as OrderItemRow[];
}

function parseMetadata(json: string): Record<string, unknown> {
  try {
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function productAccessWindow(product: ProductDbRow, startsAt: string): string | null {
  const metadata = parseMetadata(product.metadata_json);
  const durationDays = Number(metadata.accessDays);
  const durationMonths = Number(metadata.accessMonths);
  const endsAt = typeof metadata.accessEndsAt === 'string' ? metadata.accessEndsAt : null;
  if (metadata.unlimited === true) return null;
  if (!durationDays && !durationMonths && !endsAt) return null;
  return computeAccessWindow({
    startsAt,
    durationDays: Number.isFinite(durationDays) && durationDays > 0 ? durationDays : null,
    durationMonths: Number.isFinite(durationMonths) && durationMonths > 0 ? durationMonths : null,
    endsAt,
    unlimited: false,
  }).endsAt;
}

export function loadPublishedProducts(productIds: string[]): {
  products: ProductForDiscount[];
  raw: ProductDbRow[];
} {
  const unique = [...new Set(productIds)];
  if (unique.length === 0) {
    throw new ApiError(400, 'PRODUCTS_REQUIRED', 'Selecciona al menos un producto.');
  }
  if (unique.length > 20) {
    throw new ApiError(400, 'PRODUCT_LIMIT', 'No se pueden comprar más de 20 productos a la vez.');
  }
  const placeholders = unique.map(() => '?').join(',');
  const rows = prepare(
    `SELECT * FROM products WHERE id IN (${placeholders}) AND status = 'published'`
  ).all(...unique) as ProductDbRow[];
  if (rows.length !== unique.length) {
    throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Uno de los productos no está disponible.');
  }

  const currency = paypalConfig().currency;
  const products = unique.map((id) => {
    const product = loadProductForDiscount(id);
    if (!product) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Uno de los productos no está disponible.');
    }
    if (product.priceStatus !== 'defined') {
      throw new ApiError(
        409,
        'PRODUCT_PRICE_PENDING',
        'Uno de los productos todavía no tiene un precio definido por administración.'
      );
    }
    if (product.currency !== currency) {
      throw new ApiError(
        409,
        'PRODUCT_CURRENCY_UNSUPPORTED',
        `El producto no está configurado en la moneda de cobro (${currency}).`
      );
    }
    const resources = prepare(`
      SELECT COUNT(*) AS total,
             SUM(CASE WHEN r.status = 'published' THEN 1 ELSE 0 END) AS published
      FROM product_resources pr
      JOIN resources r ON r.id = pr.resource_id
      WHERE pr.product_id = ?
    `).get(product.id) as { total: number; published: number | null };
    if (
      Number(resources.total) === 0 ||
      Number(resources.published || 0) !== Number(resources.total)
    ) {
      throw new ApiError(
        409,
        'PRODUCT_NOT_AVAILABLE',
        'Uno de los productos incluye contenidos que no están publicados.'
      );
    }
    return product;
  });
  return { products, raw: rows };
}

function insertFreeTransaction(
  orderId: string,
  amountCents: number,
  currency: string,
  now: string
): void {
  prepare(`
    INSERT OR IGNORE INTO transactions
      (id, order_id, provider, kind, provider_txn_id, amount_cents, currency, status,
       metadata_json, created_at)
    VALUES (?, ?, 'free', 'free', ?, ?, ?, 'completed', '{}', ?)
  `).run(`txn_${randomToken(16)}`, orderId, `free:${orderId}`, amountCents, currency, now);
}

/**
 * Concede los derechos exactos de los productos de la orden. Es idempotente:
 * puede ejecutarse por captura del navegador y por webhook sin duplicar.
 */
export function grantAccessForOrder(orderId: string): { entitlements: number; enrollments: number } {
  const order = loadOrder(orderId);
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'La orden no existe.');
  if (order.status !== 'paid' && order.status !== 'free') {
    throw new ApiError(409, 'ORDER_NOT_PAID', 'La orden todavía no está pagada.');
  }

  const now = order.paid_at || nowIso();
  const origin: 'purchase' | 'promo_full' =
    order.discount_cents > 0 && order.total_cents === 0 ? 'promo_full' : 'purchase';
  const items = orderItems(orderId);
  let entitlements = 0;
  let enrollments = 0;

  for (const item of items) {
    const product = prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) as
      | ProductDbRow
      | undefined;
    if (!product) continue;
    const resourceRows = prepare(
      'SELECT resource_id FROM product_resources WHERE product_id = ?'
    ).all(product.id) as Array<{ resource_id: string }>;
    const window = computeAccessWindow({
      startsAt: now,
      endsAt: productAccessWindow(product, now),
      unlimited: !productAccessWindow(product, now),
    });

    for (const resource of resourceRows) {
      const granted = grantEntitlement({
        userId: order.user_id,
        resourceId: resource.resource_id,
        origin,
        originRef: order.id,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        metadata: {
          orderId: order.id,
          productId: product.id,
          productSlug: product.slug,
          discountId: order.discount_id,
        },
      });
      if (granted.created) entitlements += 1;
    }

    const before = prepare(`
      SELECT id FROM enrollments WHERE user_id = ? AND product_id = ? AND order_id = ?
    `).get(order.user_id, product.id, order.id);
    createEnrollment({
      userId: order.user_id,
      productId: product.id,
      origin: origin === 'promo_full' ? 'promo_full' : 'purchase',
      orderId: order.id,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
    });
    if (!before) enrollments += 1;
  }

  return { entitlements, enrollments };
}

function markOrderPaid(input: {
  orderId: string;
  captureId: string;
  amountCents: number;
  currency: string;
  paidAt?: string;
}): { alreadyPaid: boolean } {
  return withTransaction(() => {
    const order = loadOrder(input.orderId);
    if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'La orden no existe.');
    if (order.status === 'paid' || order.status === 'free') {
      return { alreadyPaid: true };
    }
    if (order.status === 'refunded' || order.status === 'reversed') {
      throw new ApiError(409, 'ORDER_REVERSED', 'La orden fue reembolsada o revertida.');
    }
    const captureOwner = prepare(`
      SELECT order_id FROM transactions
      WHERE provider = 'paypal' AND provider_txn_id = ?
      LIMIT 1
    `).get(input.captureId) as { order_id: string } | undefined;
    if (captureOwner && captureOwner.order_id !== order.id) {
      throw new ApiError(
        409,
        'ORDER_MISMATCH',
        'La captura de PayPal ya está vinculada a otra orden.'
      );
    }
    if (order.total_cents !== input.amountCents || order.currency !== input.currency) {
      throw new ApiError(
        409,
        'PAYMENT_AMOUNT_MISMATCH',
        'El importe capturado no coincide con el total de la orden.'
      );
    }

    const paidAt = input.paidAt || nowIso();
    prepare(`
      UPDATE orders
      SET status = 'paid', paid_at = ?, paypal_capture_id = ?, updated_at = ?
      WHERE id = ?
    `).run(paidAt, input.captureId, paidAt, order.id);
    prepare(`
      INSERT OR IGNORE INTO transactions
        (id, order_id, provider, kind, provider_txn_id, amount_cents, currency, status,
         metadata_json, created_at)
      VALUES (?, ?, 'paypal', 'capture', ?, ?, ?, 'completed', '{}', ?)
    `).run(
      `txn_${randomToken(16)}`,
      order.id,
      input.captureId,
      input.amountCents,
      input.currency,
      paidAt
    );
    consumeDiscountRedemption(order.id);
    grantAccessForOrder(order.id);
    return { alreadyPaid: false };
  });
}

export interface CheckoutQuote {
  items: Array<{
    productId: string;
    slug: string;
    title: string;
    unitPriceCents: number;
    currency: string;
  }>;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  discountName: string | null;
}

/**
 * Cotización sin efectos secundarios. El cliente la usa solo para mostrar el
 * resumen; la orden y el cobro vuelven a validar catálogo, moneda y descuento.
 */
export function quoteCheckout(input: {
  user: AuthUser;
  productIds: string[];
  discountCode?: string | null;
}): CheckoutQuote {
  const productIds = [...new Set(input.productIds)];
  const { products } = loadPublishedProducts(productIds);
  const currency = paypalConfig().currency;
  const subtotalCents = products.reduce((total, product) => total + product.priceCents, 0);
  const discount = input.discountCode?.trim()
    ? validateDiscountForUser({
        code: input.discountCode,
        userId: input.user.id,
        products,
      })
    : null;
  const discountCents = Math.min(subtotalCents, discount?.discountCents ?? 0);
  return {
    items: products.map((product) => ({
      productId: product.id,
      slug: product.slug,
      title: product.name,
      unitPriceCents: product.priceCents,
      currency: product.currency,
    })),
    subtotalCents,
    discountCents,
    totalCents: Math.max(0, subtotalCents - discountCents),
    currency,
    discountName: discount?.discountName ?? null,
  };
}

export interface CheckoutResult {
  orderId: string;
  status: OrderStatus;
  totalCents: number;
  currency: string;
  approvalUrl?: string | null;
  freeAccessGranted?: boolean;
}

export async function createCheckout(input: {
  user: AuthUser;
  productIds: string[];
  discountCode?: string | null;
  idempotencyKey?: string | null;
  appUrl: string;
}): Promise<CheckoutResult> {
  const productIds = [...new Set(input.productIds)];
  const { products, raw } = loadPublishedProducts(productIds);
  const currency = paypalConfig().currency;
  const subtotal = products.reduce((total, product) => total + product.priceCents, 0);
  const rawById = new Map(raw.map((product) => [product.id, product]));
  const requestedKey = input.idempotencyKey?.trim().slice(0, 100) || null;

  if (requestedKey) {
    const existing = prepare(
      'SELECT * FROM orders WHERE user_id = ? AND idempotency_key = ?'
    ).get(input.user.id, requestedKey) as OrderRow | undefined;
    if (existing) return orderToCheckoutResult(existing);
  }

  let discount: DiscountValidation | null = null;
  let orderId = '';
  let totalCents = 0;
  let status: OrderStatus = 'pending';

  const transactionResult = withTransaction(() => {
    if (requestedKey) {
      const existing = prepare(
        'SELECT * FROM orders WHERE user_id = ? AND idempotency_key = ?'
      ).get(input.user.id, requestedKey) as OrderRow | undefined;
      if (existing) {
        return { existing };
      }
    }

    if (input.discountCode?.trim()) {
      discount = validateDiscountForUser({
        code: input.discountCode,
        userId: input.user.id,
        products,
      });
    }
    const discountCents = discount?.discountCents ?? 0;
    totalCents = Math.max(0, subtotal - discountCents);
    orderId = `ord_${randomToken(18)}`;
    const now = nowIso();
    status = totalCents === 0 ? 'free' : 'pending';

    prepare(`
      INSERT INTO orders
        (id, user_id, status, subtotal_cents, discount_cents, total_cents, currency, discount_id,
         discount_code_id, idempotency_key, metadata_json, created_at, updated_at, paid_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId,
      input.user.id,
      status,
      subtotal,
      discountCents,
      totalCents,
      currency,
      discount?.discountId ?? null,
      discount?.codeId ?? null,
      requestedKey,
      JSON.stringify({ source: 'checkout' }),
      now,
      now,
      status === 'free' ? now : null
    );

    for (const productId of productIds) {
      const product = rawById.get(productId);
      if (!product) continue;
      prepare(`
        INSERT INTO order_items
          (id, order_id, product_id, title_snapshot, unit_price_cents, quantity)
        VALUES (?, ?, ?, ?, ?, 1)
      `).run(`oit_${randomToken(14)}`, orderId, product.id, product.name, product.price_cents);
    }

    if (discount) {
      reserveDiscountRedemption({
        validation: discount,
        userId: input.user.id,
        orderId,
        status: status === 'free' ? 'consumed' : 'reserved',
      });
    }

    if (status === 'free') {
      insertFreeTransaction(orderId, 0, currency, now);
      grantAccessForOrder(orderId);
    }

    return { existing: null };
  });

  if (transactionResult.existing) {
    return orderToCheckoutResult(transactionResult.existing);
  }

  if (totalCents === 0) {
    return {
      orderId,
      status: 'free',
      totalCents: 0,
      currency,
      freeAccessGranted: true,
    };
  }

  const paypal = getPayPalClient();
  if (!paypal) {
    withTransaction(() => {
      prepare("UPDATE orders SET status = 'failed', updated_at = ? WHERE id = ?").run(
        nowIso(),
        orderId
      );
      releaseDiscountRedemption(orderId);
    });
    throw new ApiError(
      503,
      'PAYPAL_NOT_CONFIGURED',
      'PayPal no está configurado en este entorno. La orden quedó registrada como fallida.'
    );
  }

  try {
    const paypalOrder = await paypal.createOrder({
      orderId,
      amountCents: totalCents,
      currency,
      description: `Wisdom Academy · Orden ${orderId}`,
      returnUrl: `${input.appUrl}/checkout/return?wa_order=${encodeURIComponent(orderId)}`,
      cancelUrl: `${input.appUrl}/checkout/cancel?wa_order=${encodeURIComponent(orderId)}`,
      idempotencyKey: requestedKey || `wa-${orderId}`,
    });
    if (!paypalOrder.approvalUrl) {
      throw new ApiError(502, 'PAYPAL_NO_APPROVAL_URL', 'PayPal no devolvió una URL de aprobación.');
    }
    prepare(`
      UPDATE orders
      SET paypal_order_id = ?, paypal_approval_url = ?, updated_at = ?
      WHERE id = ?
    `).run(paypalOrder.id, paypalOrder.approvalUrl, nowIso(), orderId);

    return {
      orderId,
      status: 'pending',
      totalCents,
      currency,
      approvalUrl: paypalOrder.approvalUrl,
    };
  } catch (error) {
    withTransaction(() => {
      prepare(`
        UPDATE orders
        SET status = 'failed', updated_at = ?, metadata_json = ?
        WHERE id = ?
      `).run(
        nowIso(),
        JSON.stringify({
          source: 'checkout',
          paypalError: error instanceof PayPalApiError ? error.issue : 'create_order_failed',
        }),
        orderId
      );
      releaseDiscountRedemption(orderId);
    });
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      502,
      'PAYPAL_CREATE_FAILED',
      'No fue posible crear la orden en PayPal. Intenta nuevamente.'
    );
  }
}

function orderToCheckoutResult(order: OrderRow): CheckoutResult {
  return {
    orderId: order.id,
    status: order.status,
    totalCents: Number(order.total_cents),
    currency: order.currency,
    approvalUrl: order.status === 'pending' ? order.paypal_approval_url : null,
    freeAccessGranted: order.status === 'free' || order.status === 'paid',
  };
}

function validateCapture(
  order: OrderRow,
  capture: PayPalCaptureResponse
): { captureId: string; amountCents: number; currency: string } {
  if (capture.status !== 'COMPLETED') {
    throw new ApiError(409, 'CAPTURE_NOT_COMPLETED', 'PayPal no completó la captura del pago.');
  }
  const unit = capture.purchase_units?.[0];
  const captured = unit?.payments?.captures?.[0];
  if (!captured || captured.status !== 'COMPLETED') {
    throw new ApiError(409, 'CAPTURE_NOT_COMPLETED', 'El pago no figura como capturado.');
  }
  if (unit?.reference_id && unit.reference_id !== order.id) {
    throw new ApiError(409, 'ORDER_MISMATCH', 'La referencia del pago no coincide con la orden.');
  }
  if (unit?.custom_id && unit.custom_id !== order.id) {
    throw new ApiError(409, 'ORDER_MISMATCH', 'El identificador del pago no coincide con la orden.');
  }
  const currency = captured.amount?.currency_code || '';
  const amountCents = parsePayPalAmountToCents(captured.amount?.value || '', currency);
  if (
    amountCents === null ||
    amountCents !== Number(order.total_cents) ||
    currency !== order.currency
  ) {
    throw new ApiError(
      409,
      'PAYMENT_AMOUNT_MISMATCH',
      'El importe o la moneda capturados no coinciden con la orden.'
    );
  }
  return { captureId: captured.id, amountCents, currency };
}

export function findOrderByPayPalIdForUser(
  paypalOrderId: string,
  userId: string
): OrderRow | null {
  return (
    (prepare('SELECT * FROM orders WHERE paypal_order_id = ? AND user_id = ?').get(
      paypalOrderId,
      userId
    ) as OrderRow | undefined) ?? null
  );
}

export async function captureCheckout(input: {
  user: AuthUser;
  orderId?: string | null;
  paypalOrderId?: string | null;
}): Promise<{ orderId: string; status: OrderStatus; alreadyPaid: boolean }> {
  const order = input.orderId
    ? loadOrder(input.orderId)
    : input.paypalOrderId
    ? findOrderByPayPalIdForUser(input.paypalOrderId, input.user.id)
    : null;
  if (!order || order.user_id !== input.user.id) {
    throw new ApiError(404, 'ORDER_NOT_FOUND', 'La orden no existe.');
  }
  if (order.status === 'paid' || order.status === 'free') {
    return { orderId: order.id, status: order.status, alreadyPaid: true };
  }
  if (order.status === 'refunded' || order.status === 'reversed' || order.status === 'cancelled') {
    throw new ApiError(409, 'ORDER_NOT_CAPTURABLE', 'La orden no puede capturarse en su estado actual.');
  }
  if (!order.paypal_order_id) {
    throw new ApiError(409, 'PAYPAL_ORDER_MISSING', 'La orden no tiene una referencia de PayPal.');
  }
  if (input.paypalOrderId && input.paypalOrderId !== order.paypal_order_id) {
    throw new ApiError(409, 'ORDER_MISMATCH', 'El token de PayPal no corresponde a la orden.');
  }

  const paypal = getPayPalClient();
  if (!paypal) {
    throw new ApiError(503, 'PAYPAL_NOT_CONFIGURED', 'PayPal no está configurado.');
  }

  let capture: PayPalCaptureResponse;
  try {
    capture = await paypal.captureOrder(order.paypal_order_id, `capture-${order.id}`);
  } catch (error) {
    if (error instanceof PayPalApiError && error.issue === 'ORDER_ALREADY_CAPTURED') {
      // La captura anterior pudo completarse aunque la respuesta HTTP se
      // perdiera. Se consulta la orden y se reconcilia con la referencia local.
      try {
        const details = await paypal.getOrderDetails(order.paypal_order_id);
        if (details.status === 'COMPLETED') {
          const reconciled = validateCapture(order, details);
          const result = markOrderPaid({
            orderId: order.id,
            captureId: reconciled.captureId,
            amountCents: reconciled.amountCents,
            currency: reconciled.currency,
          });
          return { orderId: order.id, status: 'paid', alreadyPaid: result.alreadyPaid };
        }
      } catch {
        // Si la conciliación tampoco es concluyente, se conserva el error
        // original para que el webhook verificado complete la orden.
      }
    }
    throw new ApiError(
      502,
      'PAYPAL_CAPTURE_FAILED',
      error instanceof PayPalApiError && error.issue
        ? `PayPal rechazó la captura (${error.issue}).`
        : 'No fue posible capturar el pago en PayPal.'
    );
  }

  const validated = validateCapture(order, capture);
  const result = markOrderPaid({
    orderId: order.id,
    captureId: validated.captureId,
    amountCents: validated.amountCents,
    currency: validated.currency,
  });
  return { orderId: order.id, status: 'paid', alreadyPaid: result.alreadyPaid };
}

function findOrderForWebhook(input: {
  customId?: string | null;
  paypalOrderId?: string | null;
}): OrderRow | null {
  let order: OrderRow | null = null;
  if (input.customId) {
    order = loadOrder(input.customId);
  }
  if (input.paypalOrderId) {
    const byPaypal = (prepare('SELECT * FROM orders WHERE paypal_order_id = ?').get(
      input.paypalOrderId
    ) as OrderRow | undefined) ?? null;
    if (order && byPaypal && byPaypal.id !== order.id) {
      throw new ApiError(
        409,
        'ORDER_MISMATCH',
        'El webhook relaciona una orden local con otra orden de PayPal.'
      );
    }
    if (!order) order = byPaypal;
  }
  if (order && input.paypalOrderId && order.paypal_order_id && order.paypal_order_id !== input.paypalOrderId) {
    throw new ApiError(
      409,
      'ORDER_MISMATCH',
      'La orden de PayPal del evento no coincide con la orden local.'
    );
  }
  return order;
}

interface PayPalWebhookEvent {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    custom_id?: string;
    invoice_id?: string;
    amount?: { currency_code?: string; value?: string };
    supplementary_data?: {
      related_ids?: { order_id?: string; capture_id?: string };
    };
    links?: Array<{ href?: string; rel?: string }>;
  };
}

function webhookAmount(event: PayPalWebhookEvent): {
  cents: number | null;
  currency: string | null;
} {
  const currency = event.resource?.amount?.currency_code || null;
  const value = event.resource?.amount?.value || '';
  return {
    cents: currency ? parsePayPalAmountToCents(value, currency) : null,
    currency,
  };
}

/**
 * Registra o actualiza una devolución usando el id de reembolso de PayPal como
 * clave idempotente. Un reembolso iniciado por administración puede llegar
 * primero como `pending` y luego completarse por webhook.
 */
function recordRefundTransaction(input: {
  orderId: string;
  providerTxnId: string;
  amountCents: number;
  currency: string;
  status: 'pending' | 'completed';
  kind: 'refund' | 'reversal';
  metadata: Record<string, unknown>;
}): void {
  const existing = prepare(`
    SELECT id, order_id, provider_txn_id, amount_cents, status
    FROM transactions
    WHERE provider = 'paypal' AND provider_txn_id = ?
      AND kind IN ('refund','reversal')
    LIMIT 1
  `).get(input.providerTxnId) as RefundTransactionRow | undefined;
  if (existing) {
    if (existing.order_id !== input.orderId) {
      throw new ApiError(
        409,
        'ORDER_MISMATCH',
        'El reembolso de PayPal ya está vinculado a otra orden.'
      );
    }
    prepare(`
      UPDATE transactions
      SET amount_cents = ?, currency = ?, status = ?, metadata_json = ?
      WHERE id = ?
    `).run(
      input.amountCents,
      input.currency,
      input.status,
      JSON.stringify(input.metadata),
      existing.id
    );
    return;
  }
  prepare(`
    INSERT INTO transactions
      (id, order_id, provider, kind, provider_txn_id, amount_cents, currency, status,
       metadata_json, created_at)
    VALUES (?, ?, 'paypal', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `txn_${randomToken(16)}`,
    input.orderId,
    input.kind,
    input.providerTxnId,
    input.amountCents,
    input.currency,
    input.status,
    JSON.stringify(input.metadata),
    nowIso()
  );
}

export async function handlePayPalWebhook(headers: Headers, rawBody: string): Promise<{
  processed: boolean;
  duplicate: boolean;
  eventType: string | null;
}> {
  const paypal = getPayPalClient();
  if (!paypal) {
    throw new ApiError(503, 'PAYPAL_NOT_CONFIGURED', 'PayPal no está configurado.');
  }
  let verified = false;
  try {
    verified = await paypal.verifyWebhook(headers, rawBody);
  } catch {
    verified = false;
  }
  if (!verified) {
    throw new ApiError(400, 'WEBHOOK_SIGNATURE_INVALID', 'Firma de webhook inválida.');
  }

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PayPalWebhookEvent;
  } catch {
    throw new ApiError(400, 'WEBHOOK_INVALID', 'El webhook no es JSON válido.');
  }
  if (!event.id || !event.event_type) {
    throw new ApiError(400, 'WEBHOOK_INVALID', 'El webhook no contiene id y tipo de evento.');
  }

  const existing = prepare(
    "SELECT id, status FROM webhook_events WHERE provider = 'paypal' AND event_id = ?"
  ).get(event.id) as { id: string; status: string } | undefined;
  if (existing?.status === 'processed' || existing?.status === 'ignored') {
    return { processed: true, duplicate: true, eventType: event.event_type };
  }
  if (existing) {
    prepare("UPDATE webhook_events SET status = 'received', processed_at = NULL WHERE id = ?").run(
      existing.id
    );
  } else {
    const inserted = prepare(`
      INSERT OR IGNORE INTO webhook_events
        (id, provider, event_id, event_type, resource_id, status, created_at)
      VALUES (?, 'paypal', ?, ?, ?, 'received', ?)
    `).run(
      `wh_${randomToken(16)}`,
      event.id,
      event.event_type,
      event.resource?.id || null,
      nowIso()
    );
    if (inserted.changes === 0) {
      // Otra entrega simultánea del mismo evento ganó la inserción. Si ya
      // terminó, se trata como duplicado; si está en curso, esta entrega
      // espera a la siguiente notificación de PayPal en lugar de duplicar.
      const concurrent = prepare(
        "SELECT status FROM webhook_events WHERE provider = 'paypal' AND event_id = ?"
      ).get(event.id) as { status: string } | undefined;
      if (concurrent?.status === 'processed' || concurrent?.status === 'ignored') {
        return { processed: true, duplicate: true, eventType: event.event_type };
      }
      return { processed: false, duplicate: true, eventType: event.event_type };
    }
  }

  try {
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const customId = event.resource?.custom_id || event.resource?.invoice_id || null;
      const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id || null;
      const order = findOrderForWebhook({ customId, paypalOrderId });
      if (!order) {
        prepare(
          "UPDATE webhook_events SET status = 'ignored', processed_at = ? WHERE provider = 'paypal' AND event_id = ?"
        ).run(nowIso(), event.id);
        return { processed: true, duplicate: false, eventType: event.event_type };
      }
      if (event.resource?.status && event.resource.status !== 'COMPLETED') {
        throw new ApiError(
          409,
          'CAPTURE_NOT_COMPLETED',
          'El webhook declara una captura que no está completada.'
        );
      }
      const amount = webhookAmount(event);
      if (!event.resource?.id || amount.cents === null || amount.currency !== order.currency) {
        throw new ApiError(409, 'PAYMENT_AMOUNT_MISMATCH', 'El webhook no contiene un importe válido.');
      }
      markOrderPaid({
        orderId: order.id,
        captureId: event.resource.id,
        amountCents: amount.cents,
        currency: amount.currency,
      });
    } else if (event.event_type === 'PAYMENT.CAPTURE.DENIED') {
      const customId = event.resource?.custom_id || event.resource?.invoice_id || null;
      const paypalOrderId = event.resource?.supplementary_data?.related_ids?.order_id || null;
      const order = findOrderForWebhook({ customId, paypalOrderId });
      if (order) {
        withTransaction(() => {
          prepare(`
            UPDATE orders SET status = 'failed', updated_at = ?
            WHERE id = ? AND status = 'pending'
          `).run(nowIso(), order.id);
          releaseDiscountRedemption(order.id);
        });
      }
    } else if (
      event.event_type === 'PAYMENT.CAPTURE.REFUNDED' ||
      event.event_type === 'PAYMENT.CAPTURE.REVERSED'
    ) {
      const upLink = event.resource?.links?.find((link) => link.rel === 'up')?.href || '';
      const linkCaptureId = upLink.match(/\/captures\/([^/?#]+)/)?.[1] || null;
      const captureId =
        event.resource?.supplementary_data?.related_ids?.capture_id ||
        linkCaptureId ||
        (event.event_type === 'PAYMENT.CAPTURE.REVERSED' ? event.resource?.id || null : null);
      const txn = captureId
        ? (prepare(
            "SELECT * FROM transactions WHERE provider = 'paypal' AND provider_txn_id = ?"
          ).get(captureId) as { order_id: string } | undefined)
        : undefined;
      if (!txn) {
        prepare(
          "UPDATE webhook_events SET status = 'ignored', processed_at = ? WHERE provider = 'paypal' AND event_id = ?"
        ).run(nowIso(), event.id);
        return { processed: true, duplicate: false, eventType: event.event_type };
      }
      const order = loadOrder(txn.order_id);
      if (!order) {
        throw new ApiError(404, 'ORDER_NOT_FOUND', 'La orden del reembolso no existe.');
      }
      const amount = webhookAmount(event);
      if (!event.resource?.id || amount.cents === null) {
        throw new ApiError(
          409,
          'PAYMENT_AMOUNT_MISMATCH',
          'El webhook de reembolso no contiene un importe válido.'
        );
      }
      if (amount.currency !== order.currency) {
        throw new ApiError(
          409,
          'PAYMENT_AMOUNT_MISMATCH',
          'La moneda del reembolso no coincide con la orden.'
        );
      }

      const kind = event.event_type === 'PAYMENT.CAPTURE.REFUNDED' ? 'refund' : 'reversal';
      // En una reversión, resource.id puede ser el id de la captura original.
      // Se usa una clave propia para no sobrescribir la transacción de captura.
      const eventResourceId = event.resource.id;
      const providerTxnId =
        eventResourceId === captureId ? `${kind}:${captureId}` : eventResourceId;
      const previous = prepare(`
        SELECT COALESCE(SUM(amount_cents), 0) AS total
        FROM transactions
        WHERE order_id = ? AND provider = 'paypal'
          AND kind IN ('refund','reversal') AND status = 'completed'
          AND (provider_txn_id IS NULL OR provider_txn_id <> ?)
      `).get(order.id, providerTxnId) as { total: number };
      const accumulatedCents = Number(previous.total) + amount.cents;
      const fullyRefunded = accumulatedCents >= Number(order.total_cents);

      withTransaction(() => {
        recordRefundTransaction({
          orderId: order.id,
          providerTxnId,
          amountCents: amount.cents as number,
          currency: order.currency,
          status: 'completed',
          kind,
          metadata: {
            webhookEventId: event.id,
            partial: !fullyRefunded,
            accumulatedCents,
          },
        });
        if (
          fullyRefunded &&
          order.status !== 'refunded' &&
          order.status !== 'reversed'
        ) {
          const newStatus: OrderStatus = kind === 'refund' ? 'refunded' : 'reversed';
          prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(
            newStatus,
            nowIso(),
            order.id
          );
          revokeOriginEntitlements(
            order.id,
            'paypal_webhook',
            newStatus === 'refunded' ? 'Pago reembolsado' : 'Pago revertido'
          );
        }
      });
    } else {
      prepare(
        "UPDATE webhook_events SET status = 'ignored', processed_at = ? WHERE provider = 'paypal' AND event_id = ?"
      ).run(nowIso(), event.id);
      return { processed: true, duplicate: false, eventType: event.event_type };
    }
    prepare(
      "UPDATE webhook_events SET status = 'processed', processed_at = ? WHERE provider = 'paypal' AND event_id = ?"
    ).run(nowIso(), event.id);
    return { processed: true, duplicate: false, eventType: event.event_type };
  } catch (error) {
    prepare(
      "UPDATE webhook_events SET status = 'error', processed_at = ? WHERE provider = 'paypal' AND event_id = ?"
    ).run(nowIso(), event.id);
    throw error;
  }
}

export async function refundOrder(input: {
  orderId: string;
  actor: AuthUser;
}): Promise<{
  orderId: string;
  status: OrderStatus;
  refundStatus: 'completed' | 'pending';
}> {
  const order = loadOrder(input.orderId);
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'La orden no existe.');
  if (order.status === 'refunded' || order.status === 'reversed') {
    return { orderId: order.id, status: order.status, refundStatus: 'completed' };
  }
  if (order.status !== 'paid' && order.status !== 'free') {
    throw new ApiError(409, 'ORDER_NOT_REFUNDABLE', 'Solo se pueden reembolsar órdenes pagadas.');
  }

  if (order.status === 'free' || order.total_cents === 0) {
    withTransaction(() => {
      prepare("UPDATE orders SET status = 'refunded', updated_at = ? WHERE id = ?").run(
        nowIso(),
        order.id
      );
      revokeOriginEntitlements(order.id, input.actor.id, 'Orden gratuita anulada por administración');
    });
    return { orderId: order.id, status: 'refunded', refundStatus: 'completed' };
  }

  const capture = prepare(`
    SELECT provider_txn_id, amount_cents, currency FROM transactions
    WHERE order_id = ? AND provider = 'paypal' AND kind = 'capture' AND status = 'completed'
    ORDER BY created_at DESC LIMIT 1
  `).get(order.id) as
    | { provider_txn_id: string; amount_cents: number; currency: string }
    | undefined;
  if (!capture) {
    throw new ApiError(409, 'CAPTURE_NOT_FOUND', 'No se encontró la captura original del pago.');
  }

  const previousRefunds = prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) AS total
    FROM transactions
    WHERE order_id = ? AND provider = 'paypal'
      AND kind IN ('refund','reversal') AND status = 'completed'
  `).get(order.id) as { total: number };
  const remainingCents = Number(capture.amount_cents) - Number(previousRefunds.total);
  if (remainingCents <= 0) {
    withTransaction(() => {
      prepare("UPDATE orders SET status = 'refunded', updated_at = ? WHERE id = ?").run(
        nowIso(),
        order.id
      );
      revokeOriginEntitlements(order.id, input.actor.id, 'Pago ya reembolsado por completo');
    });
    return { orderId: order.id, status: 'refunded', refundStatus: 'completed' };
  }

  const paypal = getPayPalClient();
  if (!paypal) {
    throw new ApiError(503, 'PAYPAL_NOT_CONFIGURED', 'PayPal no está configurado.');
  }

  let refund: { id: string; status: string };
  try {
    refund = await paypal.refundCapture(
      capture.provider_txn_id,
      `refund-${order.id}-${capture.provider_txn_id}`,
      { cents: remainingCents, currency: capture.currency }
    );
  } catch (error) {
    if (error instanceof PayPalApiError && error.issue === 'REFUND_ALREADY_EXISTS') {
      throw new ApiError(
        409,
        'REFUND_ALREADY_EXISTS',
        'PayPal ya registró un reembolso para esta captura. Revisa su estado antes de reintentar.'
      );
    }
    throw new ApiError(502, 'PAYPAL_REFUND_FAILED', 'No fue posible procesar el reembolso en PayPal.');
  }

  const refundStatus: 'completed' | 'pending' | null =
    refund.status === 'COMPLETED'
      ? 'completed'
      : refund.status === 'PENDING' || refund.status === 'CREATED'
        ? 'pending'
        : null;
  if (!refundStatus) {
    throw new ApiError(
      502,
      'PAYPAL_REFUND_FAILED',
      `PayPal devolvió el reembolso en estado ${refund.status || 'desconocido'}. No se modificó el acceso.`
    );
  }

  withTransaction(() => {
    recordRefundTransaction({
      orderId: order.id,
      providerTxnId: refund.id,
      amountCents: remainingCents,
      currency: capture.currency,
      status: refundStatus,
      kind: 'refund',
      metadata: {
        actorId: input.actor.id,
        paypalStatus: refund.status,
        previousRefundedCents: Number(previousRefunds.total),
      },
    });
    if (refundStatus === 'completed') {
      prepare("UPDATE orders SET status = 'refunded', updated_at = ? WHERE id = ?").run(
        nowIso(),
        order.id
      );
      revokeOriginEntitlements(order.id, input.actor.id, 'Pago reembolsado por administración');
    }
  });
  return {
    orderId: order.id,
    status: refundStatus === 'completed' ? 'refunded' : order.status,
    refundStatus,
  };
}

export function cancelCheckout(orderId: string, userId: string): { status: OrderStatus } {
  return withTransaction(() => {
    const order = loadOrder(orderId);
    if (!order || order.user_id !== userId) {
      throw new ApiError(404, 'ORDER_NOT_FOUND', 'La orden no existe.');
    }
    if (order.status === 'paid' || order.status === 'free') {
      throw new ApiError(409, 'ORDER_PAID', 'La orden ya fue pagada.');
    }
    if (order.status === 'cancelled') return { status: 'cancelled' as OrderStatus };
    prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?").run(
      nowIso(),
      order.id
    );
    releaseDiscountRedemption(order.id);
    return { status: 'cancelled' as OrderStatus };
  });
}

export function listOrders(): Array<
  OrderRow & {
    userEmail: string;
    userName: string;
    items: Array<{ title: string; priceCents: number }>;
    transactions: Array<{ kind: string; amountCents: number; status: string; createdAt: string }>;
  }
> {
  const rows = prepare(`
    SELECT o.*, u.email AS user_email, u.display_name AS user_name
    FROM orders o JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC LIMIT 200
  `).all() as Array<OrderRow & { user_email: string; user_name: string }>;
  return rows.map((row) => {
    const items = prepare('SELECT title_snapshot, unit_price_cents FROM order_items WHERE order_id = ?').all(
      row.id
    ) as Array<{ title_snapshot: string; unit_price_cents: number }>;
    const transactions = prepare(`
      SELECT kind, amount_cents, status, created_at FROM transactions
      WHERE order_id = ? ORDER BY created_at DESC
    `).all(row.id) as Array<{
      kind: string;
      amount_cents: number;
      status: string;
      created_at: string;
    }>;
    return {
      ...row,
      userEmail: row.user_email,
      userName: row.user_name || row.user_email,
      items: items.map((item) => ({ title: item.title_snapshot, priceCents: Number(item.unit_price_cents) })),
      transactions: transactions.map((txn) => ({
        kind: txn.kind,
        amountCents: Number(txn.amount_cents),
        status: txn.status,
        createdAt: txn.created_at,
      })),
    };
  });
}

export function listOrdersForUser(userId: string) {
  const rows = prepare('SELECT id FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(
    userId
  ) as Array<{ id: string }>;
  return rows
    .map((row) => getOrderForUser(row.id, userId))
    .filter((order): order is NonNullable<ReturnType<typeof getOrderForUser>> => Boolean(order));
}

export function getOrderForUser(orderId: string, userId: string) {
  const order = loadOrder(orderId);
  if (!order || order.user_id !== userId) return null;
  return {
    id: order.id,
    status: order.status,
    subtotalCents: Number(order.subtotal_cents),
    discountCents: Number(order.discount_cents),
    totalCents: Number(order.total_cents),
    currency: order.currency,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    reference: order.paypal_capture_id || order.id,
    items: orderItems(order.id).map((item) => ({
      title: item.title_snapshot,
      priceCents: Number(item.unit_price_cents),
    })),
  };
}
