import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { db, prepare } from '../../src/server/db';
import { resetDbForTests } from '../../src/server/db/sqlite';
import { createUser, actor, productId, resourceId } from './helpers';
import {
  captureCheckout,
  createCheckout,
  handlePayPalWebhook,
  listOrders,
  refundOrder,
} from '../../src/server/domain/checkout';
import {
  createDiscount,
} from '../../src/server/domain/discounts';
import {
  grantEntitlement,
  listUserEntitlements,
  userCanAccessResource,
  findResourceBySlug,
} from '../../src/server/domain/access';

interface MockOrder {
  id: string;
  amount: string;
  reference: string;
}

let server: http.Server;
let baseUrl = '';
let paypalCalls = 0;
let verifySuccess = true;
let mismatchCapture = false;
const orders = new Map<string, MockOrder>();
let capCounter = 0;

function json(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => resolve(data));
  });
}

before(async () => {
  db();
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    if (url.pathname === '/v1/oauth2/token') {
      json(res, 200, { access_token: 'mock-token', expires_in: 3600 });
      return;
    }
    if (url.pathname === '/v1/notifications/verify-webhook-signature') {
      await readBody(req);
      json(res, 200, { verification_status: verifySuccess ? 'SUCCESS' : 'FAILURE' });
      return;
    }
    if (url.pathname === '/v2/checkout/orders' && req.method === 'POST') {
      paypalCalls += 1;
      const body = JSON.parse(await readBody(req)) as {
        purchase_units: Array<{ reference_id: string; amount: { value: string } }>;
      };
      const id = `PP-ORDER-${orders.size + 1}`;
      const amount = body.purchase_units[0].amount.value;
      orders.set(id, { id, amount, reference: body.purchase_units[0].reference_id });
      json(res, 201, {
        id,
        status: 'CREATED',
        links: [{ rel: 'approve', href: `${baseUrl}/paypal/approve/${id}` }],
      });
      return;
    }
    const captureMatch = url.pathname.match(/^\/v2\/checkout\/orders\/([^/]+)\/capture$/);
    if (captureMatch) {
      const id = decodeURIComponent(captureMatch[1]);
      const order = orders.get(id);
      if (!order) {
        json(res, 404, { message: 'order not found' });
        return;
      }
      capCounter += 1;
      const amount = mismatchCapture ? '9.99' : order.amount;
      json(res, 201, {
        id,
        status: 'COMPLETED',
        purchase_units: [
          {
            reference_id: order.reference,
            custom_id: order.reference,
            payments: {
              captures: [
                {
                  id: `CAP-${capCounter}`,
                  status: 'COMPLETED',
                  amount: { currency_code: 'USD', value: amount },
                },
              ],
            },
          },
        ],
      });
      return;
    }
    const refundMatch = url.pathname.match(/^\/v2\/payments\/captures\/([^/]+)\/refund$/);
    if (refundMatch) {
      await readBody(req);
      json(res, 201, { id: `REF-${Date.now()}`, status: 'COMPLETED' });
      return;
    }
    json(res, 404, { message: 'not found' });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Mock server failed');
  baseUrl = `http://127.0.0.1:${address.port}`;
  process.env.PAYPAL_API_BASE_URL = baseUrl;
  process.env.PAYPAL_CLIENT_ID = 'test-client';
  process.env.PAYPAL_CLIENT_SECRET = 'test-secret';
  process.env.PAYPAL_WEBHOOK_ID = 'test-webhook';
  process.env.PAYPAL_MODE = 'sandbox';
});

after(async () => {
  resetDbForTests();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
});

async function paidOrderFor(userId: string, slug = 'curso-python-ia-jovenes') {
  const user = actor(userId);
  const checkout = await createCheckout({
    user,
    productIds: [productId(slug)],
    appUrl: 'http://127.0.0.1:3100',
  });
  assert.equal(checkout.status, 'pending');
  assert.ok(checkout.approvalUrl);
  await captureCheckout({
    user,
    orderId: checkout.orderId,
    paypalOrderId: checkout.approvalUrl?.split('/').pop() || null,
  });
  return checkout;
}

test('crea una orden y captura el importe exacto; repetir captura es idempotente', async () => {
  const userId = createUser({ email: 'pay-capture@test.local' });
  const checkout = await paidOrderFor(userId);
  const rights = listUserEntitlements(userId);
  assert.ok(rights.some((right) => right.origin === 'purchase' && right.effectiveStatus === 'active'));
  assert.equal(
    userCanAccessResource(actor(userId), findResourceBySlug('taller-python-ia-jovenes')!),
    true
  );
  const repeat = await captureCheckout({ user: actor(userId), orderId: checkout.orderId });
  assert.equal(repeat.alreadyPaid, true);
});

test('un importe capturado distinto no habilita el acceso', async () => {
  const userId = createUser({ email: 'pay-mismatch@test.local' });
  const checkout = await createCheckout({
    user: actor(userId),
    productIds: [productId('taller-liderazgo-cristiano')],
    appUrl: 'http://127.0.0.1:3100',
  });
  mismatchCapture = true;
  await assert.rejects(
    () =>
      captureCheckout({
        user: actor(userId),
        orderId: checkout.orderId,
        paypalOrderId: checkout.approvalUrl?.split('/').pop() || null,
      }),
    /importe|no coincide/i
  );
  mismatchCapture = false;
  assert.equal(
    listUserEntitlements(userId).some((right) => right.effectiveStatus === 'active'),
    false
  );
});

test('el webhook verificado es idempotente y no duplica derechos', async () => {
  const userId = createUser({ email: 'pay-webhook@test.local' });
  const checkout = await createCheckout({
    user: actor(userId),
    productIds: [productId('taller-mayordomia-financiera')],
    appUrl: 'http://127.0.0.1:3100',
  });
  const paypalOrderId = checkout.approvalUrl?.split('/').pop() || '';
  const order = prepare('SELECT total_cents FROM orders WHERE id = ?').get(checkout.orderId) as {
    total_cents: number;
  };
  const event = {
    id: 'WH-EVENT-1',
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: {
      id: 'CAP-WEBHOOK-1',
      custom_id: checkout.orderId,
      amount: { currency_code: 'USD', value: (order.total_cents / 100).toFixed(2) },
      supplementary_data: { related_ids: { order_id: paypalOrderId } },
    },
  };
  const headers = new Headers({
    'paypal-transmission-id': 'tx-1',
    'paypal-transmission-time': new Date().toISOString(),
    'paypal-cert-url': 'https://example.test/cert',
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-transmission-sig': 'signature',
  });
  const first = await handlePayPalWebhook(headers, JSON.stringify(event));
  assert.equal(first.duplicate, false);
  const status = prepare('SELECT status FROM orders WHERE id = ?').get(checkout.orderId) as {
    status: string;
  };
  assert.equal(status.status, 'paid');
  const rights = listUserEntitlements(userId).filter((right) => right.effectiveStatus === 'active');
  assert.ok(rights.length >= 1);

  const second = await handlePayPalWebhook(headers, JSON.stringify(event));
  assert.equal(second.duplicate, true);
  const count = prepare('SELECT COUNT(*) AS total FROM entitlements WHERE user_id = ?').get(userId) as {
    total: number;
  };
  assert.equal(Number(count.total), rights.length);
});

test('un webhook con firma inválida se rechaza', async () => {
  verifySuccess = false;
  const headers = new Headers({
    'paypal-transmission-id': 'tx-invalid',
    'paypal-transmission-time': new Date().toISOString(),
    'paypal-cert-url': 'https://example.test/cert',
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-transmission-sig': 'invalid',
  });
  await assert.rejects(
    () =>
      handlePayPalWebhook(
        headers,
        JSON.stringify({ id: 'WH-INVALID', event_type: 'PAYMENT.CAPTURE.COMPLETED' })
      ),
    /Firma/i
  );
  verifySuccess = true;
});

test('un webhook con importe incorrecto no marca la orden como pagada', async () => {
  const userId = createUser({ email: 'pay-webhook-bad-amount@test.local' });
  const checkout = await createCheckout({
    user: actor(userId),
    productIds: [productId('taller-musica-adoracion')],
    appUrl: 'http://127.0.0.1:3100',
  });
  const event = {
    id: 'WH-BAD-AMOUNT',
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: {
      id: 'CAP-BAD-AMOUNT',
      custom_id: checkout.orderId,
      amount: { currency_code: 'USD', value: '9.99' },
    },
  };
  const headers = new Headers({
    'paypal-transmission-id': 'tx-bad-amount',
    'paypal-transmission-time': new Date().toISOString(),
    'paypal-cert-url': 'https://example.test/cert',
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-transmission-sig': 'signature',
  });
  await assert.rejects(() => handlePayPalWebhook(headers, JSON.stringify(event)), /importe|coincide/i);
  const status = prepare('SELECT status FROM orders WHERE id = ?').get(checkout.orderId) as {
    status: string;
  };
  assert.equal(status.status, 'pending');
});

test('un descuento total genera orden gratuita sin llamar a PayPal', async () => {
  const owner = actor(createUser({ email: 'pay-owner@test.local', roles: ['platform_owner'] }));
  const created = createDiscount({
    actor: owner,
    name: 'Todo gratis',
    kind: 'full',
    value: 0,
    resourceIds: [resourceId('taller-python-ia-jovenes')],
    codeCount: 1,
  });
  const userId = createUser({ email: 'pay-free-discount@test.local' });
  const callsBefore = paypalCalls;
  const checkout = await createCheckout({
    user: actor(userId),
    productIds: [productId('curso-python-ia-jovenes')],
    discountCode: created.codes[0],
    appUrl: 'http://127.0.0.1:3100',
  });
  assert.equal(checkout.status, 'free');
  assert.equal(paypalCalls, callsBefore);
  const rights = listUserEntitlements(userId);
  assert.ok(rights.some((right) => right.origin === 'promo_full'));
});

test('un producto de precio cero genera acceso sin pasar por PayPal', async () => {
  const userId = createUser({ email: 'pay-free-product@test.local' });
  const callsBefore = paypalCalls;
  const checkout = await createCheckout({
    user: actor(userId),
    productIds: [productId('guia-bienvenida-homeschool')],
    appUrl: 'http://127.0.0.1:3100',
  });
  assert.equal(checkout.status, 'free');
  assert.equal(paypalCalls, callsBefore);
});

test('el reembolso revoca solo los derechos de la compra y conserva un regalo', async () => {
  const ownerId = createUser({ email: 'pay-refund-owner@test.local', roles: ['platform_owner'] });
  const userId = createUser({ email: 'pay-refund@test.local' });
  const checkout = await paidOrderFor(userId, 'taller-liderazgo-cristiano');
  const gift = grantEntitlement({
    userId,
    resourceId: resourceId('taller-musica-adoracion'),
    origin: 'gift',
    originRef: 'test:gift-refund',
  });

  const result = await refundOrder({ orderId: checkout.orderId, actor: actor(ownerId) });
  assert.equal(result.status, 'refunded');
  const rights = listUserEntitlements(userId);
  const purchase = rights.find((right) => right.originRef === checkout.orderId);
  const giftRight = rights.find((right) => right.id === gift.id);
  assert.equal(purchase?.effectiveStatus, 'revoked');
  assert.equal(giftRight?.effectiveStatus, 'active');
});

test('el listado administrativo refleja las órdenes reales', () => {
  const list = listOrders();
  assert.ok(list.length >= 3);
  assert.ok(list.every((order) => typeof order.userEmail === 'string'));
});
