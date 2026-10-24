import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { db, prepare } from '../../src/server/db';
import { resetDbForTests } from '../../src/server/db/sqlite';
import { buildFinanceReport } from '../../src/server/domain/finance';
import { createUser, productId } from './helpers';

const USER_EMAIL = 'finance-report@test.local';
let userId = '';
let productA = '';
let productB = '';

function insertOrder(input: {
  id: string;
  status: string;
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
  paidAt: string | null;
  paypalOrderId?: string | null;
  paypalCaptureId?: string | null;
  discountCodeId?: string | null;
  productId: string;
  title: string;
}) {
  prepare(`
    INSERT INTO orders
      (id, user_id, status, subtotal_cents, discount_cents, total_cents, currency,
       paypal_order_id, paypal_capture_id, discount_code_id, idempotency_key,
       metadata_json, created_at, updated_at, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, '{}', ?, ?, ?)
  `).run(
    input.id,
    userId,
    input.status,
    input.subtotal,
    input.discount,
    input.total,
    input.paypalOrderId ?? null,
    input.paypalCaptureId ?? null,
    input.discountCodeId ?? null,
    `idem-${input.id}`,
    input.createdAt,
    input.paidAt || input.createdAt,
    input.paidAt
  );
  prepare(`
    INSERT INTO order_items
      (id, order_id, product_id, title_snapshot, unit_price_cents, quantity)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(`oit_${input.id}`, input.id, input.productId, input.title, input.subtotal);
}

function insertTransaction(input: {
  id: string;
  orderId: string;
  kind: 'capture' | 'refund' | 'reversal' | 'free';
  providerTxnId: string;
  amount: number;
  status?: string;
  createdAt: string;
}) {
  prepare(`
    INSERT INTO transactions
      (id, order_id, provider, kind, provider_txn_id, amount_cents, currency, status,
       metadata_json, created_at)
    VALUES (?, ?, 'paypal', ?, ?, ?, 'USD', ?, '{}', ?)
  `).run(
    input.id,
    input.orderId,
    input.kind,
    input.providerTxnId,
    input.amount,
    input.status || 'completed',
    input.createdAt
  );
}

before(() => {
  db();
  userId = createUser({ email: USER_EMAIL, name: 'Comprador Finanzas' });
  productA = productId('curso-python-ia-jovenes');
  productB = productId('taller-liderazgo-cristiano');

  insertOrder({
    id: 'ord_fin_paid',
    status: 'paid',
    subtotal: 1000,
    discount: 100,
    total: 900,
    createdAt: '2026-01-10T10:00:00.000Z',
    paidAt: '2026-01-10T10:05:00.000Z',
    paypalOrderId: 'PP-FIN-1',
    paypalCaptureId: 'CAP-FIN-1',
    productId: productA,
    title: 'Curso A',
  });
  insertOrder({
    id: 'ord_fin_refunded',
    status: 'refunded',
    subtotal: 2500,
    discount: 0,
    total: 2500,
    createdAt: '2026-01-11T10:00:00.000Z',
    paidAt: '2026-01-11T10:05:00.000Z',
    paypalOrderId: 'PP-FIN-2',
    paypalCaptureId: 'CAP-FIN-2',
    productId: productB,
    title: 'Taller B',
  });
  insertOrder({
    id: 'ord_fin_partial',
    status: 'paid',
    subtotal: 2000,
    discount: 0,
    total: 2000,
    createdAt: '2026-01-12T10:00:00.000Z',
    paidAt: '2026-01-12T10:05:00.000Z',
    paypalOrderId: 'PP-FIN-3',
    paypalCaptureId: 'CAP-FIN-3',
    productId: productA,
    title: 'Curso A',
  });
  insertOrder({
    id: 'ord_fin_pending',
    status: 'pending',
    subtotal: 3000,
    discount: 0,
    total: 3000,
    createdAt: '2026-01-13T10:00:00.000Z',
    paidAt: null,
    productId: productA,
    title: 'Curso A',
  });
  insertOrder({
    id: 'ord_fin_failed',
    status: 'failed',
    subtotal: 1500,
    discount: 0,
    total: 1500,
    createdAt: '2026-01-14T10:00:00.000Z',
    paidAt: null,
    productId: productB,
    title: 'Taller B',
  });
  insertOrder({
    id: 'ord_fin_free',
    status: 'free',
    subtotal: 0,
    discount: 0,
    total: 0,
    createdAt: '2026-01-15T10:00:00.000Z',
    paidAt: '2026-01-15T10:01:00.000Z',
    productId: productA,
    title: 'Curso A',
  });

  insertTransaction({
    id: 'txn_fin_cap_1',
    orderId: 'ord_fin_paid',
    kind: 'capture',
    providerTxnId: 'CAP-FIN-1',
    amount: 900,
    createdAt: '2026-01-10T10:05:00.000Z',
  });
  insertTransaction({
    id: 'txn_fin_cap_2',
    orderId: 'ord_fin_refunded',
    kind: 'capture',
    providerTxnId: 'CAP-FIN-2',
    amount: 2500,
    createdAt: '2026-01-11T10:05:00.000Z',
  });
  insertTransaction({
    id: 'txn_fin_refund_2',
    orderId: 'ord_fin_refunded',
    kind: 'refund',
    providerTxnId: 'REF-FIN-2',
    amount: 2500,
    createdAt: '2026-01-11T11:00:00.000Z',
  });
  insertTransaction({
    id: 'txn_fin_cap_3',
    orderId: 'ord_fin_partial',
    kind: 'capture',
    providerTxnId: 'CAP-FIN-3',
    amount: 2000,
    createdAt: '2026-01-12T10:05:00.000Z',
  });
  insertTransaction({
    id: 'txn_fin_refund_3',
    orderId: 'ord_fin_partial',
    kind: 'refund',
    providerTxnId: 'REF-FIN-3',
    amount: 500,
    createdAt: '2026-01-12T12:00:00.000Z',
  });
  insertTransaction({
    id: 'txn_fin_refund_pending',
    orderId: 'ord_fin_partial',
    kind: 'refund',
    providerTxnId: 'REF-FIN-3-PENDING',
    amount: 250,
    status: 'pending',
    createdAt: '2026-01-12T13:00:00.000Z',
  });

  prepare(`
    INSERT INTO discounts
      (id, name, kind, value, status, applies_all, starts_at, created_at, updated_at)
    VALUES ('dsc_fin', 'Promo finanzas', 'fixed', 100, 'active', 1,
            '2025-01-01T00:00:00.000Z', '2025-01-01T00:00:00.000Z',
            '2025-01-01T00:00:00.000Z')
  `).run();
  prepare(`
    INSERT INTO discount_codes
      (id, discount_id, code_hash, code_hint, status, created_at)
    VALUES ('dc_fin', 'dsc_fin', 'hash-fin-1', 'WA-FIN-1', 'active',
            '2025-01-01T00:00:00.000Z')
  `).run();
  prepare(`
    INSERT INTO discount_redemptions
      (id, discount_code_id, user_id, order_id, amount_cents, status, created_at, consumed_at)
    VALUES ('dr_fin', 'dc_fin', ?, 'ord_fin_paid', 100, 'consumed',
            '2026-01-10T10:05:00.000Z', '2026-01-10T10:05:00.000Z')
  `).run(userId);
  prepare('UPDATE orders SET discount_code_id = ? WHERE id = ?').run('dc_fin', 'ord_fin_paid');
});

after(() => {
  resetDbForTests();
});

test('las métricas solo cuentan capturas confirmadas y restan reembolsos completados', () => {
  const report = buildFinanceReport();
  assert.equal(report.summary.capturedCents, 5400);
  assert.equal(report.summary.refundedCents, 3000);
  assert.equal(report.summary.netCents, 2400);
  assert.equal(report.summary.capturedOrders, 3);
  assert.equal(report.summary.paidOrders, 2);
  assert.equal(report.summary.refundedOrders, 1);
  assert.equal(report.summary.pendingOrders, 1);
  assert.equal(report.summary.failedOrders, 1);
  assert.equal(report.summary.freeOrders, 1);
  assert.equal(report.orders.length, 6);
});

test('la evolución diaria incluye cobros y reembolsos por separado', () => {
  const report = buildFinanceReport();
  const jan10 = report.series.find((row) => row.date === '2026-01-10');
  const jan11 = report.series.find((row) => row.date === '2026-01-11');
  const jan12 = report.series.find((row) => row.date === '2026-01-12');
  assert.equal(jan10?.grossCents, 900);
  assert.equal(jan11?.grossCents, 2500);
  assert.equal(jan11?.refundCents, 2500);
  assert.equal(jan12?.grossCents, 2000);
  assert.equal(jan12?.refundCents, 500);
  assert.equal(jan12?.netCents, 1500);
});

test('filtra por estado, producto, fecha y búsqueda sin mezclar pendientes', () => {
  const pending = buildFinanceReport({ status: 'pending' });
  assert.equal(pending.summary.pendingOrders, 1);
  assert.equal(pending.summary.capturedCents, 0);
  assert.equal(pending.orders.length, 1);

  const byProduct = buildFinanceReport({ productId: productB });
  assert.equal(byProduct.summary.capturedCents, 2500);
  assert.equal(byProduct.orders.length, 2);

  const byDate = buildFinanceReport({ from: '2026-01-11', to: '2026-01-12' });
  assert.equal(byDate.summary.capturedCents, 4500);
  assert.equal(byDate.orders.length, 2);

  const bySearch = buildFinanceReport({ q: USER_EMAIL });
  assert.equal(bySearch.orders.length, 6);
});

test('el ranking de productos y promociones se calcula desde registros persistidos', () => {
  const report = buildFinanceReport();
  const product = report.products.find((row) => row.productId === productA);
  assert.equal(product?.grossCents, 3000);
  const promo = report.promotions.find((row) => row.codeHint === 'WA-FIN-1');
  assert.equal(promo?.redemptions, 1);
  assert.equal(promo?.discountCents, 100);
});

test('rechaza filtros de fecha o estado inválidos', () => {
  assert.throws(() => buildFinanceReport({ from: '2026-99-99' }), /fecha/i);
  assert.throws(() => buildFinanceReport({ from: '2026-02-01', to: '2026-01-01' }), /posterior/i);
  assert.throws(() => buildFinanceReport({ status: 'inventado' }), /estado/i);
});
