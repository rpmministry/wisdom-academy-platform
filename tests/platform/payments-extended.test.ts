import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { NextRequest } from 'next/server';
import { prepare } from '../../src/server/db';
import { getDatabasePath, resetDbForTests } from '../../src/server/db/sqlite';
import { createSession } from '../../src/server/auth/sessions';
import { createUser, actor, productId } from './helpers';
import {
  captureCheckout,
  createCheckout,
  getOrderForUser,
  handlePayPalWebhook,
  refundOrder,
} from '../../src/server/domain/checkout';
import { createProgram } from '../../src/server/domain/coursePrograms';
import { listUserEntitlements } from '../../src/server/domain/access';
import {
  getRegistrationView,
  registrationUrlForOrder,
} from '../../src/server/domain/checkoutRegistration';
import { GUEST_CHECKOUT_USER_ID } from '../../src/server/domain/guestCheckout';
import { POST as checkoutPOST } from '../../src/app/api/checkout/route';
import { POST as capturePOST } from '../../src/app/api/checkout/capture/route';
import { POST as webhookPOST } from '../../src/app/api/paypal/webhook/route';
import { PATCH as productPATCH } from '../../src/app/api/admin/products/[id]/route';
import { GET as authConfigGET } from '../../src/app/api/auth/config/route';

type CaptureBehavior = 'success' | 'fail' | 'already-captured';

interface MockOrder {
  id: string;
  amount: { value: string; currency: string };
  reference: string;
  captured: boolean;
  captureId: string;
}

let server: http.Server;
let baseUrl = '';
let captureBehavior: CaptureBehavior = 'success';
let refundStatus = 'COMPLETED';
let verifySuccess = true;
let createCalls = 0;
let captureCalls = 0;
let lastRefundId = '';
let lastRefundCents = 0;
let orderSequence = 0;
const orders = new Map<string, MockOrder>();

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

function completedOrderBody(order: MockOrder) {
  return {
    id: order.id,
    status: 'COMPLETED',
    purchase_units: [
      {
        reference_id: order.reference,
        custom_id: order.reference,
        payments: {
          captures: [
            {
              id: order.captureId,
              status: 'COMPLETED',
              amount: { currency_code: order.amount.currency, value: order.amount.value },
            },
          ],
        },
      },
    ],
  };
}

before(async () => {
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
      createCalls += 1;
      const body = JSON.parse(await readBody(req)) as {
        purchase_units: Array<{
          reference_id: string;
          amount: { value: string; currency_code: string };
        }>;
      };
      orderSequence += 1;
      const id = `PPX-ORDER-${orderSequence}`;
      orders.set(id, {
        id,
        amount: {
          value: body.purchase_units[0].amount.value,
          currency: body.purchase_units[0].amount.currency_code,
        },
        reference: body.purchase_units[0].reference_id,
        captured: false,
        captureId: `CAPX-${orderSequence}`,
      });
      json(res, 201, {
        id,
        status: 'CREATED',
        links: [{ rel: 'approve', href: `${baseUrl}/paypal/approve/${id}` }],
      });
      return;
    }

    const getOrderMatch = url.pathname.match(/^\/v2\/checkout\/orders\/([^/]+)$/);
    if (getOrderMatch && req.method === 'GET') {
      const order = orders.get(decodeURIComponent(getOrderMatch[1]));
      if (!order) {
        json(res, 404, { message: 'order not found' });
        return;
      }
      json(res, 200, order.captured ? completedOrderBody(order) : { id: order.id, status: 'APPROVED' });
      return;
    }

    const captureMatch = url.pathname.match(/^\/v2\/checkout\/orders\/([^/]+)\/capture$/);
    if (captureMatch) {
      captureCalls += 1;
      const order = orders.get(decodeURIComponent(captureMatch[1]));
      if (!order) {
        json(res, 404, { message: 'order not found' });
        return;
      }
      if (captureBehavior === 'fail') {
        json(res, 422, {
          message: 'The instrument presented was either declined by the processor or bank.',
          details: [{ issue: 'INSTRUMENT_DECLINED' }],
        });
        return;
      }
      if (captureBehavior === 'already-captured') {
        order.captured = true;
        json(res, 422, {
          message: 'Order already captured.',
          details: [{ issue: 'ORDER_ALREADY_CAPTURED' }],
        });
        return;
      }
      order.captured = true;
      json(res, 201, completedOrderBody(order));
      return;
    }

    const refundMatch = url.pathname.match(/^\/v2\/payments\/captures\/([^/]+)\/refund$/);
    if (refundMatch) {
      const body = JSON.parse(await readBody(req)) as {
        amount: { value: string; currency_code: string };
      };
      lastRefundCents = Math.round(Number(body.amount.value) * 100);
      lastRefundId = `REF-TEST-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      json(res, 201, { id: lastRefundId, status: refundStatus });
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
  process.env.PAYPAL_CURRENCY = 'USD';
});

after(async () => {
  resetDbForTests();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
});

function newCheckoutKey(): string {
  return `test-idem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function sessionHeaders(userId: string): { cookie: string; csrf: string } {
  const session = createSession(userId, { ipHash: null, uaHash: null });
  return { cookie: `wa_session=${session.token}`, csrf: session.csrfToken };
}

async function createPending(userId: string, slug = 'curso-python-ia-jovenes') {
  return createCheckout({
    user: actor(userId),
    productIds: [productId(slug)],
    idempotencyKey: newCheckoutKey(),
    appUrl: 'http://127.0.0.1:3100',
  });
}

function webhookHeaders(): Headers {
  return new Headers({
    'paypal-transmission-id': `tx-${Math.random()}`,
    'paypal-transmission-time': new Date().toISOString(),
    'paypal-cert-url': 'https://example.test/cert',
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-transmission-sig': 'signature',
  });
}

function captureCompletedEvent(input: {
  eventId: string;
  orderId: string;
  paypalOrderId: string;
  captureId: string;
  amount: number;
  currency?: string;
}) {
  return {
    id: input.eventId,
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: {
      id: input.captureId,
      status: 'COMPLETED',
      custom_id: input.orderId,
      amount: {
        currency_code: input.currency || 'USD',
        value: (input.amount / 100).toFixed(2),
      },
      supplementary_data: { related_ids: { order_id: input.paypalOrderId } },
    },
  };
}

function refundEvent(input: {
  eventId: string;
  refundId: string;
  captureId: string;
  amount: number;
  eventType?: 'PAYMENT.CAPTURE.REFUNDED' | 'PAYMENT.CAPTURE.REVERSED';
}) {
  return {
    id: input.eventId,
    event_type: input.eventType || 'PAYMENT.CAPTURE.REFUNDED',
    resource: {
      id: input.refundId,
      status: 'COMPLETED',
      amount: { currency_code: 'USD', value: (input.amount / 100).toFixed(2) },
      supplementary_data: { related_ids: { capture_id: input.captureId } },
      links: [
        {
          rel: 'up',
          href: `https://api.sandbox.paypal.com/v2/payments/captures/${input.captureId}`,
        },
      ],
    },
  };
}

function captureIdForOrder(orderId: string): string {
  const row = prepare(`
    SELECT provider_txn_id FROM transactions
    WHERE order_id = ? AND provider = 'paypal' AND kind = 'capture'
    ORDER BY created_at DESC LIMIT 1
  `).get(orderId) as { provider_txn_id: string } | undefined;
  if (!row) throw new Error(`No capture for ${orderId}`);
  return row.provider_txn_id;
}

test('rechaza producto inexistente, precio pendiente, producto no publicado y moneda incorrecta', async () => {
  const userId = createUser({ email: `pay-ext-invalid-${Date.now()}@test.local` });

  await assert.rejects(
    () =>
      createCheckout({
        user: actor(userId),
        productIds: ['prod_inexistente'],
        appUrl: 'http://127.0.0.1:3100',
      }),
    /no está disponible/i
  );

  const program = createProgram({
    kind: 'course',
    title: `Curso sin precio ${Date.now()}`,
    status: 'published',
  });
  const pendingProduct = prepare(`
    SELECT p.id, p.price_status FROM products p
    JOIN product_resources pr ON pr.product_id = p.id
    WHERE pr.resource_id = ?
    LIMIT 1
  `).get(program.resourceId) as { id: string; price_status: string };
  assert.equal(pendingProduct.price_status, 'pending');
  await assert.rejects(
    () =>
      createCheckout({
        user: actor(userId),
        productIds: [pendingProduct.id],
        appUrl: 'http://127.0.0.1:3100',
      }),
    /precio definido/i
  );

  const draft = createProgram({
    kind: 'course',
    title: `Curso en borrador ${Date.now()}`,
    status: 'draft',
  });
  const draftProduct = prepare(`
    SELECT p.id FROM products p
    JOIN product_resources pr ON pr.product_id = p.id
    WHERE pr.resource_id = ? LIMIT 1
  `).get(draft.resourceId) as { id: string };
  await assert.rejects(
    () =>
      createCheckout({
        user: actor(userId),
        productIds: [draftProduct.id],
        appUrl: 'http://127.0.0.1:3100',
      }),
    /no está disponible/i
  );

  const withArchivedResource = createProgram({
    kind: 'course',
    title: `Curso con recurso archivado ${Date.now()}`,
    status: 'published',
  });
  const archivedProduct = prepare(`
    SELECT p.id FROM products p
    JOIN product_resources pr ON pr.product_id = p.id
    WHERE pr.resource_id = ? LIMIT 1
  `).get(withArchivedResource.resourceId) as { id: string };
  prepare("UPDATE products SET price_cents = 2500, price_status = 'defined' WHERE id = ?").run(
    archivedProduct.id
  );
  const secondResource = createProgram({
    kind: 'course',
    title: `Curso complementario ${Date.now()}`,
    status: 'published',
  });
  prepare('INSERT INTO product_resources (product_id, resource_id) VALUES (?, ?)').run(
    archivedProduct.id,
    secondResource.resourceId
  );
  prepare("UPDATE resources SET status = 'archived' WHERE id = ?").run(
    withArchivedResource.resourceId
  );
  try {
    await assert.rejects(
      () =>
        createCheckout({
          user: actor(userId),
          productIds: [archivedProduct.id],
          appUrl: 'http://127.0.0.1:3100',
        }),
      /contenidos que no están publicados/i
    );
  } finally {
    prepare("UPDATE resources SET status = 'published' WHERE id = ?").run(
      withArchivedResource.resourceId
    );
  }

  const categoryProductId = productId('taller-liderazgo-cristiano');
  prepare("UPDATE products SET status = 'archived' WHERE id = ?").run(categoryProductId);
  try {
    await assert.rejects(
      () =>
        createCheckout({
          user: actor(userId),
          productIds: [categoryProductId],
          appUrl: 'http://127.0.0.1:3100',
        }),
      /no está disponible/i
    );
  } finally {
    prepare("UPDATE products SET status = 'published' WHERE id = ?").run(categoryProductId);
  }

  prepare("UPDATE products SET currency = 'EUR' WHERE id = ?").run(categoryProductId);
  try {
    await assert.rejects(
      () =>
        createCheckout({
          user: actor(userId),
          productIds: [categoryProductId],
          appUrl: 'http://127.0.0.1:3100',
        }),
      /moneda de cobro/i
    );
  } finally {
    prepare("UPDATE products SET currency = 'USD' WHERE id = ?").run(categoryProductId);
  }
});

test('el catálogo informa precio pendiente y no permite iniciar la compra', async () => {
  const program = createProgram({
    kind: 'workshop',
    title: `Taller sin precio ${Date.now()}`,
    status: 'published',
  });
  const { GET } = await import('../../src/app/api/catalog/route');
  const response = await GET(new NextRequest('http://127.0.0.1:3100/api/catalog'));
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    productos: Array<{ slug: string; pricePending?: boolean; name: string }>;
  };
  const product = body.productos.find((item) => item.name.startsWith('Taller sin precio'));
  assert.ok(product);
  assert.equal(product.pricePending, true);
  assert.equal(program.status, 'published');
});

test('un precio manipulado desde el navegador no altera el total calculado por el servidor', async () => {
  const userId = createUser({ email: `pay-ext-amount-${Date.now()}@test.local` });
  const checkout = await createCheckout({
    user: actor(userId),
    productIds: [productId('curso-python-ia-jovenes')],
    appUrl: 'http://127.0.0.1:3100',
    // @ts-expect-error: se simula un cliente que intenta enviar el importe.
    amountCents: 1,
    totalCents: 1,
  });
  const order = prepare('SELECT total_cents, currency FROM orders WHERE id = ?').get(
    checkout.orderId
  ) as { total_cents: number; currency: string };
  assert.equal(Number(order.total_cents), 1000);
  assert.equal(order.currency, 'USD');
});

test('la captura fallida deja la orden pendiente y no concede derechos', async () => {
  const userId = createUser({ email: `pay-ext-capture-fail-${Date.now()}@test.local` });
  const checkout = await createPending(userId);
  captureBehavior = 'fail';
  try {
    await assert.rejects(
      () =>
        captureCheckout({
          user: actor(userId),
          orderId: checkout.orderId,
        }),
      /rechazó|No fue posible/i
    );
  } finally {
    captureBehavior = 'success';
  }
  const order = prepare('SELECT status FROM orders WHERE id = ?').get(checkout.orderId) as {
    status: string;
  };
  assert.equal(order.status, 'pending');
  assert.equal(
    listUserEntitlements(userId).some((right) => right.effectiveStatus === 'active'),
    false
  );
});

test('una orden no puede capturarse por otro usuario', async () => {
  const ownerId = createUser({ email: `pay-ext-owner-${Date.now()}@test.local` });
  const otherId = createUser({ email: `pay-ext-other-${Date.now()}@test.local` });
  const checkout = await createPending(ownerId);
  await assert.rejects(
    () => captureCheckout({ user: actor(otherId), orderId: checkout.orderId }),
    /no existe/i
  );
});

test('la idempotencia del checkout devuelve la misma orden y no crea otra en PayPal', async () => {
  const userId = createUser({ email: `pay-ext-idem-${Date.now()}@test.local` });
  const key = newCheckoutKey();
  const first = await createCheckout({
    user: actor(userId),
    productIds: [productId('curso-python-ia-jovenes')],
    idempotencyKey: key,
    appUrl: 'http://127.0.0.1:3100',
  });
  const callsAfterFirst = createCalls;
  const second = await createCheckout({
    user: actor(userId),
    productIds: [productId('curso-python-ia-jovenes')],
    idempotencyKey: key,
    appUrl: 'http://127.0.0.1:3100',
  });
  assert.equal(second.orderId, first.orderId);
  assert.equal(createCalls, callsAfterFirst);
});

test('si PayPal ya capturó la orden se reconcilia sin duplicar el cobro', async () => {
  const userId = createUser({ email: `pay-ext-reconcile-${Date.now()}@test.local` });
  const checkout = await createPending(userId);
  captureBehavior = 'already-captured';
  const callsBefore = captureCalls;
  try {
    const result = await captureCheckout({ user: actor(userId), orderId: checkout.orderId });
    assert.equal(result.status, 'paid');
  } finally {
    captureBehavior = 'success';
  }
  assert.equal(captureCalls, callsBefore + 1);
  const order = prepare('SELECT status FROM orders WHERE id = ?').get(checkout.orderId) as {
    status: string;
  };
  assert.equal(order.status, 'paid');
  const entitlements = prepare(
    'SELECT COUNT(*) AS total FROM entitlements WHERE user_id = ?'
  ).get(userId) as { total: number };
  assert.ok(Number(entitlements.total) >= 1);
});

test('un webhook que relaciona una orden local con otra orden PayPal se rechaza', async () => {
  const userId = createUser({ email: `pay-ext-webhook-mismatch-${Date.now()}@test.local` });
  const first = await createPending(userId);
  const second = await createPending(userId, 'taller-liderazgo-cristiano');
  const secondPaypal = prepare('SELECT paypal_order_id FROM orders WHERE id = ?').get(
    second.orderId
  ) as { paypal_order_id: string };
  const total = prepare('SELECT total_cents FROM orders WHERE id = ?').get(first.orderId) as {
    total_cents: number;
  };
  const event = captureCompletedEvent({
    eventId: `WH-MISMATCH-${Date.now()}`,
    orderId: first.orderId,
    paypalOrderId: secondPaypal.paypal_order_id,
    captureId: `CAP-MISMATCH-${Date.now()}`,
    amount: Number(total.total_cents),
  });
  await assert.rejects(
    () => handlePayPalWebhook(webhookHeaders(), JSON.stringify(event)),
    /no coincide|otra orden/i
  );
  const firstOrder = prepare('SELECT status FROM orders WHERE id = ?').get(first.orderId) as {
    status: string;
  };
  assert.equal(firstOrder.status, 'pending');
});

test('un reembolso parcial no revoca el acceso hasta completar el importe total', async () => {
  const userId = createUser({ email: `pay-ext-partial-${Date.now()}@test.local` });
  const checkout = await createPending(userId);
  await captureCheckout({ user: actor(userId), orderId: checkout.orderId });
  const captureId = captureIdForOrder(checkout.orderId);
  const total = prepare('SELECT total_cents, paypal_order_id FROM orders WHERE id = ?').get(
    checkout.orderId
  ) as { total_cents: number; paypal_order_id: string };

  const firstHalf = Math.floor(Number(total.total_cents) / 2);
  await handlePayPalWebhook(
    webhookHeaders(),
    JSON.stringify(
      refundEvent({
        eventId: `WH-PARTIAL-1-${Date.now()}`,
        refundId: `REF-PARTIAL-1-${Date.now()}`,
        captureId,
        amount: firstHalf,
      })
    )
  );
  assert.equal(
    (prepare('SELECT status FROM orders WHERE id = ?').get(checkout.orderId) as { status: string })
      .status,
    'paid'
  );
  assert.equal(
    listUserEntitlements(userId).some((right) => right.effectiveStatus === 'active'),
    true
  );

  await handlePayPalWebhook(
    webhookHeaders(),
    JSON.stringify(
      refundEvent({
        eventId: `WH-PARTIAL-2-${Date.now()}`,
        refundId: `REF-PARTIAL-2-${Date.now()}`,
        captureId,
        amount: Number(total.total_cents) - firstHalf,
      })
    )
  );
  assert.equal(
    (prepare('SELECT status FROM orders WHERE id = ?').get(checkout.orderId) as { status: string })
      .status,
    'refunded'
  );
  assert.equal(
    listUserEntitlements(userId).some((right) => right.effectiveStatus === 'active'),
    false
  );
});

test('un reembolso administrativo posterior a uno parcial solicita solo el saldo restante', async () => {
  const ownerId = createUser({ email: `pay-ext-partial-admin-owner-${Date.now()}@test.local`, roles: ['platform_owner'] });
  const userId = createUser({ email: `pay-ext-partial-admin-${Date.now()}@test.local` });
  const checkout = await createPending(userId, 'taller-musica-adoracion');
  await captureCheckout({ user: actor(userId), orderId: checkout.orderId });
  const captureId = captureIdForOrder(checkout.orderId);
  const total = prepare('SELECT total_cents FROM orders WHERE id = ?').get(checkout.orderId) as {
    total_cents: number;
  };
  const firstHalf = Math.floor(Number(total.total_cents) / 2);
  await handlePayPalWebhook(
    webhookHeaders(),
    JSON.stringify(
      refundEvent({
        eventId: `WH-PARTIAL-ADMIN-1-${Date.now()}`,
        refundId: `REF-PARTIAL-ADMIN-1-${Date.now()}`,
        captureId,
        amount: firstHalf,
      })
    )
  );
  const remaining = Number(total.total_cents) - firstHalf;
  lastRefundCents = 0;
  refundStatus = 'COMPLETED';
  try {
    const result = await refundOrder({ orderId: checkout.orderId, actor: actor(ownerId) });
    assert.equal(result.refundStatus, 'completed');
    assert.equal(lastRefundCents, remaining);
  } finally {
    refundStatus = 'COMPLETED';
  }
  assert.equal(
    (prepare('SELECT status FROM orders WHERE id = ?').get(checkout.orderId) as { status: string })
      .status,
    'refunded'
  );
  const refunded = prepare(`
    SELECT COALESCE(SUM(amount_cents), 0) AS total FROM transactions
    WHERE order_id = ? AND kind IN ('refund','reversal') AND status = 'completed'
  `).get(checkout.orderId) as { total: number };
  assert.equal(Number(refunded.total), Number(total.total_cents));
});

test('un reembolso pendiente no revoca accesos hasta que el webhook confirma', async () => {
  const ownerId = createUser({ email: `pay-ext-refund-owner-${Date.now()}@test.local`, roles: ['platform_owner'] });
  const userId = createUser({ email: `pay-ext-refund-user-${Date.now()}@test.local` });
  const checkout = await createPending(userId, 'taller-mayordomia-financiera');
  await captureCheckout({ user: actor(userId), orderId: checkout.orderId });
  const captureId = captureIdForOrder(checkout.orderId);

  refundStatus = 'PENDING';
  try {
    const result = await refundOrder({ orderId: checkout.orderId, actor: actor(ownerId) });
    assert.equal(result.refundStatus, 'pending');
    assert.equal(result.status, 'paid');
    assert.equal(
      listUserEntitlements(userId).some((right) => right.effectiveStatus === 'active'),
      true
    );

    const total = prepare('SELECT total_cents, paypal_order_id FROM orders WHERE id = ?').get(
      checkout.orderId
    ) as { total_cents: number; paypal_order_id: string };
    await handlePayPalWebhook(
      webhookHeaders(),
      JSON.stringify(
        refundEvent({
          eventId: `WH-REFUND-PENDING-${Date.now()}`,
          refundId: lastRefundId,
          captureId,
          amount: Number(total.total_cents),
        })
      )
    );
    assert.equal(
      (prepare('SELECT status FROM orders WHERE id = ?').get(checkout.orderId) as { status: string })
        .status,
      'refunded'
    );
    assert.equal(
      listUserEntitlements(userId).some((right) => right.effectiveStatus === 'active'),
      false
    );
  } finally {
    refundStatus = 'COMPLETED';
  }
});

test('una reversión completada deja la orden revertida y revoca el acceso', async () => {
  const userId = createUser({ email: `pay-ext-reversal-${Date.now()}@test.local` });
  const checkout = await createPending(userId, 'taller-musica-adoracion');
  await captureCheckout({ user: actor(userId), orderId: checkout.orderId });
  const captureId = captureIdForOrder(checkout.orderId);
  const total = prepare('SELECT total_cents FROM orders WHERE id = ?').get(checkout.orderId) as {
    total_cents: number;
  };
  await handlePayPalWebhook(
    webhookHeaders(),
    JSON.stringify(
      refundEvent({
        eventId: `WH-REVERSAL-${Date.now()}`,
        refundId: `REV-${Date.now()}`,
        captureId,
        amount: Number(total.total_cents),
        eventType: 'PAYMENT.CAPTURE.REVERSED',
      })
    )
  );
  assert.equal(
    (prepare('SELECT status FROM orders WHERE id = ?').get(checkout.orderId) as { status: string })
      .status,
    'reversed'
  );
  assert.equal(
    listUserEntitlements(userId).some((right) => right.effectiveStatus === 'active'),
    false
  );
});

test('una reversión cuyo resource.id es la captura no sobrescribe la captura original', async () => {
  const userId = createUser({ email: `pay-ext-reversal-id-${Date.now()}@test.local` });
  const checkout = await createPending(userId, 'taller-mayordomia-financiera');
  await captureCheckout({ user: actor(userId), orderId: checkout.orderId });
  const captureId = captureIdForOrder(checkout.orderId);
  const total = prepare('SELECT total_cents FROM orders WHERE id = ?').get(checkout.orderId) as {
    total_cents: number;
  };
  const event = {
    id: `WH-REVERSAL-ID-${Date.now()}`,
    event_type: 'PAYMENT.CAPTURE.REVERSED',
    resource: {
      id: captureId,
      status: 'COMPLETED',
      amount: {
        currency_code: 'USD',
        value: (Number(total.total_cents) / 100).toFixed(2),
      },
    },
  };
  await handlePayPalWebhook(webhookHeaders(), JSON.stringify(event));
  assert.equal(
    (prepare('SELECT status FROM orders WHERE id = ?').get(checkout.orderId) as { status: string })
      .status,
    'reversed'
  );
  const capture = prepare(`
    SELECT kind, amount_cents, provider_txn_id FROM transactions
    WHERE order_id = ? AND kind = 'capture'
  `).get(checkout.orderId) as { kind: string; amount_cents: number; provider_txn_id: string };
  assert.equal(capture.kind, 'capture');
  assert.equal(Number(capture.amount_cents), Number(total.total_cents));
  assert.equal(capture.provider_txn_id, captureId);
  const reversal = prepare(`
    SELECT kind, status, provider_txn_id FROM transactions
    WHERE order_id = ? AND kind = 'reversal'
  `).get(checkout.orderId) as { kind: string; status: string; provider_txn_id: string };
  assert.equal(reversal.kind, 'reversal');
  assert.equal(reversal.status, 'completed');
  assert.equal(reversal.provider_txn_id, `reversal:${captureId}`);
});

test('el checkout permite invitados con correo y la captura autenticada sigue vinculada', async () => {
  const anonymous = await checkoutPOST(
    new NextRequest('http://127.0.0.1:3100/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productIds: [productId('curso-python-ia-jovenes')] }),
    })
  );
  assert.equal(anonymous.status, 400);
  assert.equal(
    ((await anonymous.json()) as { code: string }).code,
    'EMAIL_REQUIRED'
  );

  const guestEmail = `pay-ext-guest-${Date.now()}@test.local`;
  const guest = await checkoutPOST(
    new NextRequest('http://127.0.0.1:3100/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productIds: [productId('curso-python-ia-jovenes')],
        buyerEmail: guestEmail,
      }),
    })
  );
  assert.equal(guest.status, 200);
  const guestBody = (await guest.json()) as {
    checkout: {
      orderId: string;
      checkoutMode: string;
      registrationRequired: boolean;
      approvalUrl: string;
    };
  };
  assert.equal(guestBody.checkout.checkoutMode, 'guest');
  assert.equal(guestBody.checkout.registrationRequired, true);
  assert.ok(guestBody.checkout.approvalUrl);
  const guestOrder = prepare('SELECT user_id, buyer_email FROM orders WHERE id = ?').get(
    guestBody.checkout.orderId
  ) as { user_id: string; buyer_email: string };
  assert.equal(guestOrder.user_id, 'usr_guest_checkout');
  assert.equal(guestOrder.buyer_email, guestEmail);

  const userId = createUser({ email: `pay-ext-route-${Date.now()}@test.local` });
  const session = sessionHeaders(userId);
  const checkoutResponse = await checkoutPOST(
    new NextRequest('http://127.0.0.1:3100/api/checkout', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: session.cookie,
        'x-csrf-token': session.csrf,
      },
      body: JSON.stringify({
        productIds: [productId('curso-python-ia-jovenes')],
        totalCents: 1,
        amount: 1,
      }),
    })
  );
  assert.equal(checkoutResponse.status, 200);
  const checkoutBody = (await checkoutResponse.json()) as {
    checkout: { orderId: string; totalCents: number; approvalUrl: string | null };
  };
  assert.equal(checkoutBody.checkout.totalCents, 1000);
  assert.ok(checkoutBody.checkout.approvalUrl);

  const captureResponse = await capturePOST(
    new NextRequest('http://127.0.0.1:3100/api/checkout/capture', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: session.cookie,
        'x-csrf-token': session.csrf,
      },
      body: JSON.stringify({ orderId: checkoutBody.checkout.orderId }),
    })
  );
  assert.equal(captureResponse.status, 200);
  const order = getOrderForUser(checkoutBody.checkout.orderId, userId);
  assert.equal(order?.status, 'paid');
  assert.equal(order?.reference === checkoutBody.checkout.orderId, false);
});

test('el webhook público procesa un evento verificado a través de la ruta Next.js', async () => {
  const userId = createUser({ email: `pay-ext-webhook-route-${Date.now()}@test.local` });
  const checkout = await createPending(userId);
  const order = prepare('SELECT total_cents, paypal_order_id FROM orders WHERE id = ?').get(
    checkout.orderId
  ) as { total_cents: number; paypal_order_id: string };
  const event = captureCompletedEvent({
    eventId: `WH-ROUTE-${Date.now()}`,
    orderId: checkout.orderId,
    paypalOrderId: order.paypal_order_id,
    captureId: `CAP-ROUTE-${Date.now()}`,
    amount: Number(order.total_cents),
  });
  const response = await webhookPOST(
    new NextRequest('http://127.0.0.1:3100/api/paypal/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'paypal-transmission-id': `tx-route-${Date.now()}`,
        'paypal-transmission-time': new Date().toISOString(),
        'paypal-cert-url': 'https://example.test/cert',
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-transmission-sig': 'signature',
      },
      body: JSON.stringify(event),
    })
  );
  assert.equal(response.status, 200);
  assert.equal(
    (prepare('SELECT status FROM orders WHERE id = ?').get(checkout.orderId) as { status: string })
      .status,
    'paid'
  );
});

test('el webhook de una compra invitada prepara el registro sin conceder acceso', async () => {
  const email = `guest-webhook-${Date.now()}@test.local`;
  const checkout = await createCheckout({
    buyerEmail: email,
    productIds: [productId('taller-escuela-padres-homeschoolers')],
    appUrl: 'http://127.0.0.1:3100',
  });
  const order = prepare('SELECT total_cents, paypal_order_id FROM orders WHERE id = ?').get(
    checkout.orderId
  ) as { total_cents: number; paypal_order_id: string };
  const event = captureCompletedEvent({
    eventId: `WH-GUEST-ROUTE-${Date.now()}`,
    orderId: checkout.orderId,
    paypalOrderId: order.paypal_order_id,
    captureId: `CAP-GUEST-ROUTE-${Date.now()}`,
    amount: Number(order.total_cents),
  });
  const response = await webhookPOST(
    new NextRequest('http://127.0.0.1:3100/api/paypal/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'paypal-transmission-id': `tx-guest-route-${Date.now()}`,
        'paypal-transmission-time': new Date().toISOString(),
        'paypal-cert-url': 'https://example.test/cert',
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-transmission-sig': 'signature',
      },
      body: JSON.stringify(event),
    })
  );
  assert.equal(response.status, 200);
  const guestOrder = prepare(
    'SELECT status, registration_status FROM orders WHERE id = ?'
  ).get(checkout.orderId) as { status: string; registration_status: string };
  assert.equal(guestOrder.status, 'paid');
  assert.equal(guestOrder.registration_status, 'pending');
  const registration = prepare(
    'SELECT status FROM checkout_registrations WHERE order_id = ?'
  ).get(checkout.orderId) as { status: string } | undefined;
  assert.equal(registration?.status, 'pending');
  assert.equal(
    listUserEntitlements(GUEST_CHECKOUT_USER_ID).filter(
      (right) => right.effectiveStatus === 'active'
    ).length,
    0
  );
});

test('el administrador puede fijar el precio pendiente y habilitar la compra', async () => {
  const adminId = createUser({
    email: `pay-ext-admin-${Date.now()}@test.local`,
    roles: ['principal_admin'],
  });
  const adminSession = sessionHeaders(adminId);
  const program = createProgram({
    kind: 'course',
    title: `Curso con precio por definir ${Date.now()}`,
    status: 'published',
  });
  const product = prepare(`
    SELECT p.id FROM products p
    JOIN product_resources pr ON pr.product_id = p.id
    WHERE pr.resource_id = ? LIMIT 1
  `).get(program.resourceId) as { id: string };

  const nonAdminSession = sessionHeaders(
    createUser({ email: `pay-ext-nonadmin-${Date.now()}@test.local` })
  );
  const denied = await productPATCH(
    new NextRequest(`http://127.0.0.1:3100/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: nonAdminSession.cookie,
        'x-csrf-token': nonAdminSession.csrf,
      },
      body: JSON.stringify({ priceCents: 4200 }),
    }),
    { params: Promise.resolve({ id: product.id }) }
  );
  assert.equal(denied.status, 403);

  const updated = await productPATCH(
    new NextRequest(`http://127.0.0.1:3100/api/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        cookie: adminSession.cookie,
        'x-csrf-token': adminSession.csrf,
      },
      body: JSON.stringify({ priceCents: 4200 }),
    }),
    { params: Promise.resolve({ id: product.id }) }
  );
  assert.equal(updated.status, 200);
  const row = prepare('SELECT price_cents, price_status FROM products WHERE id = ?').get(product.id) as {
    price_cents: number;
    price_status: string;
  };
  assert.equal(Number(row.price_cents), 4200);
  assert.equal(row.price_status, 'defined');

  const userId = createUser({ email: `pay-ext-buyer-${Date.now()}@test.local` });
  const checkout = await createCheckout({
    user: actor(userId),
    productIds: [product.id],
    appUrl: 'http://127.0.0.1:3100',
  });
  assert.equal(checkout.totalCents, 4200);
});

test('las migraciones de SQLite incluyen el estado de precio y el adaptador local está activo', () => {
  assert.ok(getDatabasePath());
  const migration = prepare('SELECT MAX(version) AS version FROM schema_migrations').get() as {
    version: number;
  };
  assert.ok(Number(migration.version) >= 9);
  const registrationTable = prepare(
    "SELECT COUNT(*) AS total FROM sqlite_master WHERE type = 'table' AND name = 'checkout_registrations'"
  ).get() as { total: number };
  assert.equal(Number(registrationTable.total), 1);
  const column = prepare(
    "SELECT COUNT(*) AS total FROM pragma_table_info('products') WHERE name = 'price_status'"
  ).get() as { total: number };
  assert.equal(Number(column.total), 1);
});

test('la configuración pública no expone el secreto de PayPal', async () => {
  const response = await authConfigGET();
  const body = (await response.json()) as Record<string, unknown>;
  assert.equal('paypalClientSecret' in body, false);
  assert.equal('clientSecret' in body, false);
  assert.equal('paypalClientId' in body, false);
  assert.equal(typeof body.paypalConfigured, 'boolean');
});

test('un invitado captura con el token de PayPal y no recibe acceso hasta registrarse', async () => {
  const email = `guest-capture-${Date.now()}@test.local`;
  const checkout = await createCheckout({
    buyerEmail: email,
    productIds: [productId('taller-escuela-padres-homeschoolers')],
    appUrl: 'http://127.0.0.1:3100',
  });
  const paypalOrderId = checkout.approvalUrl?.split('/').pop() || '';
  assert.ok(paypalOrderId);
  await assert.rejects(
    () =>
      captureCheckout({
        user: null,
        orderId: checkout.orderId,
        paypalOrderId: 'TOKEN-AJENO',
      }),
    /no existe/i
  );
  const captured = await captureCheckout({
    user: null,
    orderId: checkout.orderId,
    paypalOrderId,
  });
  assert.equal(captured.status, 'paid');
  const order = prepare('SELECT user_id, registration_status FROM orders WHERE id = ?').get(
    checkout.orderId
  ) as { user_id: string; registration_status: string };
  assert.equal(order.user_id, GUEST_CHECKOUT_USER_ID);
  assert.equal(order.registration_status, 'pending');
  assert.equal(
    listUserEntitlements(GUEST_CHECKOUT_USER_ID).filter(
      (right) => right.effectiveStatus === 'active'
    ).length,
    0
  );
  const url = registrationUrlForOrder(checkout.orderId);
  const token = new URL(url).searchParams.get('token');
  assert.ok(token);
  const view = getRegistrationView(token);
  assert.equal(view.status, 'pending');
  assert.equal(view.accountExists, false);
});
