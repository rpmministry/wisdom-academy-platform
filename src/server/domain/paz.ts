import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import type { AuthUser } from '../auth/authorization';
import { ApiError } from '../http/api';
import { writeAudit } from '../audit';
import { randomToken } from '../security/random';
import { grantEntitlement } from './access';
import { ensureProgramProduct } from './courseCatalog';
import {
  assertProgramAccess,
  getProgramRowBySlug,
  type CourseProgramRow,
} from './coursePrograms';
import {
  PAZ_CHALLENGE_DAYS,
  PAZ_PROGRAM_SLUG,
  PAZ_PRICING,
} from '@/lib/paz-en-la-mesa/content';
import { pazPhaseAt } from '@/lib/paz-en-la-mesa/config';

export type PazPlan = 'presale' | 'official' | 'scholarship';
export type PazPaymentMethod = 'bank_transfer' | 'payphone';
export type PazPaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface PazLeadInput {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  church?: string | null;
  householdSize?: number | null;
  whatsappOptIn?: boolean;
  consent?: boolean;
  source?: string | null;
  campaign?: string | null;
  metadata?: Record<string, unknown>;
}

export interface PazPaymentIntentInput {
  plan: PazPlan;
  method: PazPaymentMethod;
  buyerName?: string | null;
  buyerPhone?: string | null;
  transferReference?: string | null;
  transferDate?: string | null;
  note?: string | null;
}

export interface PazPaymentIntentView {
  id: string;
  reference: string;
  userId: string;
  userEmail: string | null;
  plan: PazPlan;
  method: PazPaymentMethod;
  amountCents: number;
  currency: string;
  status: PazPaymentStatus;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  transferReference: string | null;
  transferDate: string | null;
  note: string | null;
  paymentUrl: string | null;
  orderId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PazPaymentIntentRow {
  id: string;
  reference: string;
  user_id: string;
  plan: PazPlan;
  method: PazPaymentMethod;
  amount_cents: number;
  currency: string;
  status: PazPaymentStatus;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  transfer_reference: string | null;
  transfer_date: string | null;
  note: string | null;
  payment_url: string | null;
  order_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

interface PazPaymentIntentAdminRow extends PazPaymentIntentRow {
  user_email: string | null;
}

interface PazChallengeRow {
  day: number;
  completed: number;
  note: string | null;
  completed_at: string | null;
  updated_at: string;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function normalizeEmail(value: unknown): string | null {
  const email = cleanText(value, 200);
  if (!email) return null;
  const normalized = email.toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function normalizePhone(value: unknown): string | null {
  const phone = cleanText(value, 40);
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, '');
  return digits.length >= 7 ? digits.slice(0, 20) : null;
}

function toPaymentView(row: PazPaymentIntentRow | PazPaymentIntentAdminRow): PazPaymentIntentView {
  return {
    id: row.id,
    reference: row.reference,
    userId: row.user_id,
    userEmail: 'user_email' in row ? row.user_email : null,
    plan: row.plan,
    method: row.method,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    status: row.status,
    buyerName: row.buyer_name,
    buyerEmail: row.buyer_email,
    buyerPhone: row.buyer_phone,
    transferReference: row.transfer_reference,
    transferDate: row.transfer_date,
    note: row.note,
    paymentUrl: row.payment_url,
    orderId: row.order_id,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function createReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  const token = randomToken(12).toUpperCase().replace(/[^A-Z0-9]/g, '');
  for (let index = 0; index < 8; index += 1) {
    const source = token[index] || alphabet[Math.floor(Math.random() * alphabet.length)];
    suffix += alphabet.includes(source)
      ? source
      : alphabet[source.charCodeAt(0) % alphabet.length];
  }
  return `PAZ-2026-${suffix}`;
}

export function createPazLead(input: PazLeadInput): { id: string } {
  const fullName = cleanText(input.fullName, 160);
  if (!fullName || fullName.length < 2) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Escribe tu nombre para reservar la información.');
  }
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  if (!email && !phone) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Necesitamos un correo o un WhatsApp de contacto.');
  }
  if (input.consent === false) {
    throw new ApiError(400, 'CONSENT_REQUIRED', 'Necesitamos tu autorización para contactarte.');
  }
  const id = `pazlead_${randomToken(16)}`;
  const now = nowIso();
  prepare(`
    INSERT INTO paz_leads
      (id, full_name, email, phone, city, church, household_size, whatsapp_opt_in,
       consent, source, campaign, metadata_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
  `).run(
    id,
    fullName,
    email,
    phone,
    cleanText(input.city, 120),
    cleanText(input.church, 160),
    Number.isInteger(input.householdSize) ? Number(input.householdSize) : null,
    input.whatsappOptIn === false ? 0 : 1,
    cleanText(input.source, 80) || 'landing',
    cleanText(input.campaign, 80) || 'paz-en-la-mesa-2026',
    JSON.stringify(input.metadata || {}),
    now,
    now
  );
  return { id };
}

export function getPazProgram(): CourseProgramRow | null {
  return getProgramRowBySlug(PAZ_PROGRAM_SLUG);
}

export function requirePazProgram(): CourseProgramRow {
  const program = getPazProgram();
  if (!program) {
    throw new ApiError(503, 'PAZ_NOT_READY', 'El taller aún no está aprovisionado en la plataforma.');
  }
  return program;
}

export function pazAmountForPlan(plan: PazPlan): number {
  if (plan === 'scholarship') return PAZ_PRICING.scholarshipCents;
  if (plan === 'official') return PAZ_PRICING.officialCents;
  return PAZ_PRICING.presaleCents;
}

export function assertPazPlanAllowed(plan: PazPlan, now: Date = new Date()): void {
  const phase = pazPhaseAt(now);
  if (plan === 'scholarship') {
    if (phase === 'closed') {
      throw new ApiError(409, 'PAZ_CLOSED', 'El período de inscripción y becas ya cerró.');
    }
    return;
  }
  if (phase === 'anticipation') {
    throw new ApiError(
      409,
      'PAZ_PRESALE_NOT_OPEN',
      'La preventa abre el jueves 3 de diciembre a las 20:00. Déjanos tus datos y te avisamos.'
    );
  }
  if (phase === 'closed') {
    throw new ApiError(409, 'PAZ_CLOSED', 'Las inscripciones del taller ya cerraron.');
  }
  if (plan === 'presale' && phase !== 'presale') {
    throw new ApiError(
      409,
      'PAZ_PRESALE_ENDED',
      'La preventa terminó. El precio oficial es de USD 37 por hogar.'
    );
  }
  if (plan === 'official' && phase !== 'official') {
    throw new ApiError(
      409,
      'PAZ_OFFICIAL_NOT_STARTED',
      'El precio oficial inicia el 9 de diciembre. Aún puedes aprovechar la preventa.'
    );
  }
}

function findPendingIntent(
  userId: string,
  plan: PazPlan,
  method: PazPaymentMethod
): PazPaymentIntentRow | null {
  return (
    (prepare(`
      SELECT * FROM paz_payment_intents
      WHERE user_id = ? AND plan = ? AND method = ? AND status = 'pending'
      ORDER BY created_at DESC LIMIT 1
    `).get(userId, plan, method) as PazPaymentIntentRow | undefined) ?? null
  );
}

export function createPazPaymentIntent(
  user: AuthUser,
  input: PazPaymentIntentInput,
  options: { paymentUrl?: string } = {}
): { intent: PazPaymentIntentView; created: boolean } {
  const plan = input.plan;
  if (!['presale', 'official', 'scholarship'].includes(plan)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El plan seleccionado no es válido.');
  }
  if (!['bank_transfer', 'payphone'].includes(input.method)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El método de pago no es válido.');
  }
  assertPazPlanAllowed(plan);
  requirePazProgram();

  const existing = findPendingIntent(user.id, plan, input.method);
  if (existing) {
    return { intent: toPaymentView(existing), created: false };
  }

  const buyerName =
    cleanText(input.buyerName, 160) ||
    cleanText(user.displayName || user.email, 160) ||
    user.email;
  const amountCents = pazAmountForPlan(plan);
  const id = `pazpay_${randomToken(16)}`;
  let reference = createReference();
  let attempts = 0;
  while (
    prepare('SELECT id FROM paz_payment_intents WHERE reference = ?').get(reference) &&
    attempts < 8
  ) {
    reference = createReference();
    attempts += 1;
  }
  const now = nowIso();
  const paymentUrl = input.method === 'payphone' ? options.paymentUrl || null : null;
  prepare(`
    INSERT INTO paz_payment_intents
      (id, reference, user_id, plan, method, amount_cents, currency, status,
       buyer_name, buyer_email, buyer_phone, transfer_reference, transfer_date, note,
       payment_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    reference,
    user.id,
    plan,
    input.method,
    amountCents,
    PAZ_PRICING.currency,
    buyerName,
    user.email.toLowerCase(),
    normalizePhone(input.buyerPhone),
    cleanText(input.transferReference, 120),
    cleanText(input.transferDate, 40),
    cleanText(input.note, 1000),
    paymentUrl,
    now,
    now
  );
  writeAudit({
    actor: user,
    action: 'paz.payment_intent.created',
    entityType: 'paz_payment_intent',
    entityId: id,
    after: { reference, plan, method: input.method, amountCents },
  });
  const row = prepare('SELECT * FROM paz_payment_intents WHERE id = ?').get(
    id
  ) as PazPaymentIntentRow;
  return { intent: toPaymentView(row), created: true };
}

export function listPazPaymentIntents(status?: PazPaymentStatus): PazPaymentIntentView[] {
  const rows = (
    status
      ? prepare(`
          SELECT p.*, u.email AS user_email
          FROM paz_payment_intents p
          LEFT JOIN users u ON u.id = p.user_id
          WHERE p.status = ?
          ORDER BY p.created_at DESC
          LIMIT 500
        `).all(status)
      : prepare(`
          SELECT p.*, u.email AS user_email
          FROM paz_payment_intents p
          LEFT JOIN users u ON u.id = p.user_id
          ORDER BY p.created_at DESC
          LIMIT 500
        `).all()
  ) as PazPaymentIntentAdminRow[];
  return rows.map(toPaymentView);
}

function createPaidOrderForIntent(
  intent: PazPaymentIntentRow,
  program: CourseProgramRow,
  productId: string,
  paidAt: string
): string {
  const orderId = `ord_${randomToken(16)}`;
  prepare(`
    INSERT INTO orders
      (id, user_id, status, subtotal_cents, discount_cents, total_cents, currency,
       notes, metadata_json, buyer_email, buyer_name, checkout_mode, registration_status,
       created_at, updated_at, paid_at)
    VALUES (?, ?, 'paid', ?, 0, ?, ?, ?, ?, ?, ?, 'account', 'not_required', ?, ?, ?)
  `).run(
    orderId,
    intent.user_id,
    intent.amount_cents,
    intent.amount_cents,
    intent.currency,
    `Pago ${intent.method} · ${intent.reference}`,
    JSON.stringify({
      source: 'paz-en-la-mesa',
      plan: intent.plan,
      method: intent.method,
      reference: intent.reference,
      transferReference: intent.transfer_reference,
    }),
    intent.buyer_email,
    intent.buyer_name,
    paidAt,
    paidAt,
    paidAt
  );
  prepare(`
    INSERT INTO order_items
      (id, order_id, product_id, title_snapshot, unit_price_cents, quantity)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(
    `oi_${randomToken(16)}`,
    orderId,
    productId,
    intent.plan === 'scholarship'
      ? 'Beca un Hogar · Paz en la mesa'
      : 'Paz en la mesa, Orden en el bolsillo y fuego en el corazón',
    intent.amount_cents
  );
  return orderId;
}

function productIdForProgram(program: CourseProgramRow): string {
  const linked = program.catalog_product_id
    ? (prepare('SELECT id FROM products WHERE id = ?').get(program.catalog_product_id) as
        | { id: string }
        | undefined)
    : undefined;
  if (linked) return linked.id;
  const created = ensureProgramProduct(program.id);
  if (!created) {
    throw new ApiError(500, 'PAZ_PRODUCT_MISSING', 'No se encontró el producto del taller.');
  }
  return created;
}

export function reviewPazPaymentIntent(
  actor: AuthUser,
  intentId: string,
  action: 'approve' | 'reject',
  note?: string | null
): PazPaymentIntentView {
  if (action !== 'approve' && action !== 'reject') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'La acción de revisión no es válida.');
  }
  const intent = prepare('SELECT * FROM paz_payment_intents WHERE id = ?').get(
    intentId
  ) as PazPaymentIntentRow | undefined;
  if (!intent) throw new ApiError(404, 'PAZ_PAYMENT_NOT_FOUND', 'El pago no existe.');
  if (intent.status !== 'pending') {
    throw new ApiError(409, 'PAZ_PAYMENT_REVIEWED', 'Este pago ya fue revisado.');
  }

  const now = nowIso();
  const reviewNote = cleanText(note, 1000);

  if (action === 'reject') {
    prepare(`
      UPDATE paz_payment_intents
      SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, review_note = ?, updated_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(actor.id, now, reviewNote, now, intent.id);
    writeAudit({
      actor,
      action: 'paz.payment_intent.rejected',
      entityType: 'paz_payment_intent',
      entityId: intent.id,
      before: { status: 'pending' },
      after: { status: 'rejected', note: reviewNote },
    });
    const updated = prepare('SELECT * FROM paz_payment_intents WHERE id = ?').get(
      intent.id
    ) as PazPaymentIntentRow;
    return toPaymentView(updated);
  }

  const program = requirePazProgram();
  const productId = productIdForProgram(program);
  const accessStartsAt = now;
  const accessEndsAt = new Date(new Date(now).getTime() + 365 * 86400000).toISOString();

  withTransaction(() => {
    let orderId = intent.order_id;
    if (!orderId) {
      orderId = createPaidOrderForIntent(intent, program, productId, now);
    }
    if (intent.plan !== 'scholarship') {
      grantEntitlement({
        userId: intent.user_id,
        resourceId: program.resource_id,
        origin: 'purchase',
        originRef: intent.reference,
        startsAt: accessStartsAt,
        endsAt: accessEndsAt,
        grantedBy: actor.id,
        metadata: {
          source: 'paz-en-la-mesa',
          plan: intent.plan,
          method: intent.method,
          intentId: intent.id,
          reference: intent.reference,
        },
      });
      prepare(`
        INSERT INTO enrollments
          (id, user_id, product_id, resource_id, status, origin, order_id, starts_at, ends_at,
           created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', 'purchase', ?, ?, ?, ?, ?)
      `).run(
        `enr_${randomToken(16)}`,
        intent.user_id,
        productId,
        program.resource_id,
        orderId,
        accessStartsAt,
        accessEndsAt,
        now,
        now
      );
    }
    prepare(`
      UPDATE paz_payment_intents
      SET status = 'approved', reviewed_by = ?, reviewed_at = ?, review_note = ?,
          order_id = ?, updated_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(actor.id, now, reviewNote, orderId, now, intent.id);
  });

  writeAudit({
    actor,
    action: 'paz.payment_intent.approved',
    entityType: 'paz_payment_intent',
    entityId: intent.id,
    before: { status: 'pending' },
    after: { status: 'approved', plan: intent.plan, method: intent.method },
  });

  const updated = prepare('SELECT * FROM paz_payment_intents WHERE id = ?').get(
    intent.id
  ) as PazPaymentIntentRow;
  return toPaymentView(updated);
}

export interface PazChallengeDayView {
  day: number;
  title: string;
  passage: string;
  focus: string;
  practice: string;
  prayer: string;
  completed: boolean;
  note: string | null;
  completedAt: string | null;
}

export function getPazChallengeProgress(userId: string, programId: string): PazChallengeDayView[] {
  const rows = prepare(`
    SELECT day, completed, note, completed_at, updated_at
    FROM paz_challenge_progress
    WHERE user_id = ? AND program_id = ?
    ORDER BY day
  `).all(userId, programId) as PazChallengeRow[];
  const byDay = new Map(rows.map((row) => [Number(row.day), row]));
  return PAZ_CHALLENGE_DAYS.map((definition) => {
    const row = byDay.get(definition.day);
    return {
      day: definition.day,
      title: definition.title,
      passage: definition.passage,
      focus: definition.focus,
      practice: definition.practice,
      prayer: definition.prayer,
      completed: Boolean(row && Number(row.completed) === 1),
      note: row?.note || null,
      completedAt: row?.completed_at || null,
    };
  });
}

export function setPazChallengeDay(
  user: AuthUser,
  input: { day: number; completed: boolean; note?: string | null }
): PazChallengeDayView[] {
  if (!Number.isInteger(input.day) || input.day < 1 || input.day > 7) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El día del reto debe estar entre 1 y 7.');
  }
  const program = requirePazProgram();
  assertProgramAccess(user, program);
  const note = cleanText(input.note, 1200);
  const now = nowIso();
  prepare(`
    INSERT INTO paz_challenge_progress
      (id, user_id, program_id, day, completed, note, completed_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id, program_id, day) DO UPDATE SET
      completed = excluded.completed,
      note = excluded.note,
      completed_at = excluded.completed_at,
      updated_at = excluded.updated_at
  `).run(
    `pazch_${randomToken(16)}`,
    user.id,
    program.id,
    input.day,
    input.completed ? 1 : 0,
    note,
    input.completed ? now : null,
    now,
    now
  );
  writeAudit({
    actor: user,
    action: 'paz.challenge.updated',
    entityType: 'paz_challenge_progress',
    entityId: `${user.id}:${program.id}:${input.day}`,
    after: { day: input.day, completed: input.completed },
  });
  return getPazChallengeProgress(user.id, program.id);
}
