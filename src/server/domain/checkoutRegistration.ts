import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import { ApiError } from '../http/api';
import { constantTimeEqual, hmacSha256, randomToken, sha256 } from '../security/random';
import { getCodePepper } from '../security/codes';
import { hashPassword, validatePasswordStrength } from '../auth/passwords';
import type { AuthUser } from '../auth/authorization';
import { appUrl } from '../config';
import {
  sendRegistrationResumeEmail,
  sendWelcomeEmail,
  type MailResult,
} from '../email/mailer';
import { createEmailVerificationLink } from './authTokens';
import { GUEST_CHECKOUT_USER_ID, normalizeBuyerEmail } from './guestCheckout';
import { grantAccessForOrder } from './checkout';

export const REGISTRATION_TERMS_VERSION = '2026-10-24';
export const REGISTRATION_PRIVACY_VERSION = '2026-10-24';
export const REGISTRATION_TTL_DAYS = 30;

const DOCUMENT_TYPES = ['cedula', 'pasaporte', 'dni', 'ruc', 'otro'] as const;
const RELATIONSHIPS = ['madre', 'padre', 'representante', 'tutor', 'otro'] as const;

export type RegistrationProductKind = 'course' | 'workshop' | 'program' | 'mixed' | 'other';
export type RegistrationStatus = 'pending' | 'completed' | 'expired' | 'revoked';

interface RegistrationRow {
  id: string;
  order_id: string;
  buyer_email: string;
  buyer_name: string | null;
  buyer_type: string;
  product_kind: RegistrationProductKind;
  requires_guardian: number;
  status: RegistrationStatus;
  expires_at: string;
  completed_user_id: string | null;
  completed_at: string | null;
  invite_sent_at: string | null;
  terms_version: string;
  privacy_version: string;
  marketing_opt_in: number;
  buyer_first_name: string | null;
  buyer_last_name: string | null;
  buyer_document_type: string | null;
  buyer_document_number: string | null;
  buyer_country: string | null;
  buyer_phone: string | null;
  student_first_name: string | null;
  student_last_name: string | null;
  student_birth_date: string | null;
  student_grade: string | null;
  student_academic_notes: string | null;
  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_email: string | null;
  guardian_phone: string | null;
  guardian_relationship: string | null;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
  data_json: string;
  created_at: string;
  updated_at: string;
}

interface RegistrationOrderRow {
  id: string;
  user_id: string;
  status: string;
  currency: string;
  total_cents: number;
  checkout_mode: 'account' | 'guest';
  buyer_email: string | null;
  buyer_name: string | null;
  registration_status: string;
  paypal_capture_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface OrderProductRequirement {
  productId: string;
  title: string;
  kind: RegistrationProductKind;
  requiresGuardian: boolean;
  grade: string | null;
  resourceSlug: string | null;
}

export interface OrderRegistrationRequirements {
  products: OrderProductRequirement[];
  productKind: RegistrationProductKind;
  requiresGuardian: boolean;
  grade: string | null;
  redirectTo: string;
}

export interface RegistrationView {
  registrationId: string;
  orderId: string;
  orderStatus: string;
  status: RegistrationStatus;
  expiresAt: string;
  completedAt: string | null;
  buyerEmail: string;
  buyerName: string | null;
  products: Array<{ title: string; kind: RegistrationProductKind }>;
  productKind: RegistrationProductKind;
  requiresGuardian: boolean;
  grade: string | null;
  accountExists: boolean;
  canLinkCurrentSession: boolean;
  totalCents: number;
  currency: string;
  termsVersion: string;
  privacyVersion: string;
  marketingOptIn: boolean;
  redirectTo: string;
  loginUrl: string;
  courseUrl: string;
}

export interface RegistrationSubmission {
  buyerFirstName: unknown;
  buyerLastName: unknown;
  documentType?: unknown;
  documentNumber?: unknown;
  country?: unknown;
  phone?: unknown;
  studentFirstName?: unknown;
  studentLastName?: unknown;
  studentBirthDate?: unknown;
  studentGrade?: unknown;
  studentAcademicNotes?: unknown;
  guardianFirstName?: unknown;
  guardianLastName?: unknown;
  guardianEmail?: unknown;
  guardianPhone?: unknown;
  guardianRelationship?: unknown;
  guardianAuthorization?: unknown;
  password?: unknown;
  passwordConfirm?: unknown;
  acceptTerms?: unknown;
  acceptPrivacy?: unknown;
  marketingOptIn?: unknown;
}

export interface CompletedRegistration {
  userId: string;
  isNewUser: boolean;
  registrationId: string;
  orderId: string;
  redirectTo: string;
  loginUrl: string;
  productNames: string[];
  emailSent: boolean;
}

function parseJson(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function isMinorMetadata(metadata: Record<string, unknown>): boolean {
  const audience = String(metadata.audience || metadata.publico || '').toLowerCase();
  return ['minor', 'minors', 'menor', 'menores', 'children', 'kids', 'teen', 'teens'].some(
    (token) => audience === token || audience.includes(token)
  );
}

export function orderRegistrationRequirements(orderId: string): OrderRegistrationRequirements {
  const rows = prepare(`
    SELECT oi.product_id, oi.title_snapshot, p.metadata_json AS product_metadata,
           r.type AS resource_type, r.metadata_json AS resource_metadata, r.slug AS resource_slug
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    LEFT JOIN product_resources pr ON pr.product_id = p.id
    LEFT JOIN resources r ON r.id = pr.resource_id
    WHERE oi.order_id = ?
    ORDER BY oi.id, r.title
  `).all(orderId) as Array<{
    product_id: string;
    title_snapshot: string;
    product_metadata: string;
    resource_type: string | null;
    resource_metadata: string | null;
    resource_slug: string | null;
  }>;

  const byProduct = new Map<string, OrderProductRequirement & { resourceTypes: string[] }>();
  for (const row of rows) {
    const productMeta = parseJson(row.product_metadata);
    const resourceMeta = parseJson(row.resource_metadata);
    const current = byProduct.get(row.product_id) || {
      productId: row.product_id,
      title: row.title_snapshot,
      kind: 'other' as RegistrationProductKind,
      requiresGuardian: false,
      grade: null,
      resourceSlug: null,
      resourceTypes: [],
    };
    if (row.resource_type) current.resourceTypes.push(row.resource_type);
    if (typeof resourceMeta.grade === 'string' && !current.grade) current.grade = resourceMeta.grade;
    if (!current.resourceSlug && row.resource_slug) current.resourceSlug = row.resource_slug;
    if (productMeta.homeschoolAnnualOffer === true || isMinorMetadata(productMeta)) {
      current.requiresGuardian = true;
    }
    if (isMinorMetadata(resourceMeta)) current.requiresGuardian = true;
    byProduct.set(row.product_id, current);
  }

  const products = [...byProduct.values()].map((product) => {
    const isProgram =
      product.requiresGuardian ||
      product.resourceTypes.some(
        (type) => type === 'homeschool_program' || type === 'grade'
      );
    const kind: RegistrationProductKind = isProgram
      ? 'program'
      : product.resourceTypes.includes('workshop')
        ? 'workshop'
        : product.resourceTypes.includes('course')
          ? 'course'
          : 'other';
    return { ...product, kind, requiresGuardian: isProgram };
  });

  const kinds = new Set(products.map((product) => product.kind));
  const requiresGuardian = products.some((product) => product.requiresGuardian);
  const productKind: RegistrationProductKind =
    products.length > 1 && kinds.size > 1
      ? 'mixed'
      : requiresGuardian
        ? 'program'
        : products[0]?.kind || 'other';
  const first = products.find((product) => product.resourceSlug)?.resourceSlug;
  return {
    products: products.map(({ resourceTypes: _types, ...product }) => product),
    productKind,
    requiresGuardian,
    grade: products.find((product) => product.grade)?.grade || null,
    redirectTo: first
      ? `/aula?recurso=${encodeURIComponent(first)}`
      : '/mi-acceso',
  };
}

function issueRegistrationToken(registrationId: string, expiresAt: string): string {
  const expiredUnix = Math.floor(Date.parse(expiresAt) / 1000);
  const signature = hmacSha256(`${registrationId}.${expiredUnix}`, getCodePepper());
  return `${registrationId}.${expiredUnix}.${signature}`;
}

function parseRegistrationToken(token: string): { registrationId: string; expiredUnix: number } {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[0].startsWith('reg_')) {
    throw new ApiError(400, 'REGISTRATION_TOKEN_INVALID', 'El enlace de registro no es válido.');
  }
  const [registrationId, expRaw, signature] = parts;
  const expiredUnix = Number(expRaw);
  if (!Number.isSafeInteger(expiredUnix)) {
    throw new ApiError(400, 'REGISTRATION_TOKEN_INVALID', 'El enlace de registro no es válido.');
  }
  const expected = hmacSha256(`${registrationId}.${expiredUnix}`, getCodePepper());
  if (!constantTimeEqual(signature, expected)) {
    throw new ApiError(400, 'REGISTRATION_TOKEN_INVALID', 'El enlace de registro no es válido.');
  }
  return { registrationId, expiredUnix };
}

function loadRegistration(id: string): RegistrationRow | null {
  return (
    (prepare('SELECT * FROM checkout_registrations WHERE id = ?').get(id) as
      | RegistrationRow
      | undefined) ?? null
  );
}

function loadRegistrationOrder(orderId: string): RegistrationOrderRow | null {
  return (
    (prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as
      | RegistrationOrderRow
      | undefined) ?? null
  );
}

function registrationTokenForRow(row: RegistrationRow): string {
  return issueRegistrationToken(row.id, row.expires_at);
}

function ensureRegistrationForOrder(orderId: string): {
  registration: RegistrationRow;
  order: RegistrationOrderRow;
} {
  return withTransaction(() => {
    const order = loadRegistrationOrder(orderId);
    if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'La orden no existe.');
    if (order.checkout_mode !== 'guest') {
      throw new ApiError(409, 'REGISTRATION_NOT_REQUIRED', 'Esta compra ya está vinculada a una cuenta.');
    }
    if (order.status !== 'paid' && order.status !== 'free') {
      throw new ApiError(409, 'ORDER_NOT_PAID', 'El pago todavía no está confirmado.');
    }
    const buyerEmail = normalizeBuyerEmail(order.buyer_email);
    const requirements = orderRegistrationRequirements(order.id);
    let row = prepare('SELECT * FROM checkout_registrations WHERE order_id = ?').get(
      order.id
    ) as RegistrationRow | undefined;
    const now = nowIso();
    const expiresAt = new Date(Date.now() + REGISTRATION_TTL_DAYS * 86_400_000).toISOString();

    if (!row) {
      const id = `reg_${randomToken(18)}`;
      prepare(`
        INSERT OR IGNORE INTO checkout_registrations
          (id, order_id, buyer_email, buyer_name, buyer_type, product_kind, requires_guardian,
           status, expires_at, terms_version, privacy_version, data_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, '{}', ?, ?)
      `).run(
        id,
        order.id,
        buyerEmail,
        order.buyer_name,
        requirements.requiresGuardian ? 'guardian' : 'student',
        requirements.productKind,
        requirements.requiresGuardian ? 1 : 0,
        expiresAt,
        REGISTRATION_TERMS_VERSION,
        REGISTRATION_PRIVACY_VERSION,
        now,
        now
      );
      // Un webhook simultáneo pudo crear la fila primero; se recarga por la
      // restricción UNIQUE de order_id en lugar de fallar.
      row = prepare('SELECT * FROM checkout_registrations WHERE order_id = ?').get(
        order.id
      ) as RegistrationRow | undefined;
    }

    if (row && row.status === 'pending') {
      prepare(`
        UPDATE checkout_registrations
        SET buyer_email = ?, buyer_name = COALESCE(buyer_name, ?), product_kind = ?,
            requires_guardian = ?, buyer_type = ?, updated_at = ?
        WHERE id = ?
      `).run(
        buyerEmail,
        order.buyer_name,
        requirements.productKind,
        requirements.requiresGuardian ? 1 : 0,
        requirements.requiresGuardian ? 'guardian' : 'student',
        now,
        row.id
      );
      row = loadRegistration(row.id) || row;
    }

    if (
      row &&
      (row.status === 'expired' || row.status === 'revoked' || row.expires_at <= now)
    ) {
      // La recuperación segura reabre un registro vencido mientras la compra
      // siga pagada. Un registro revocado solo se reabre por decisión admin.
      if (row.status !== 'revoked') {
        prepare(`
          UPDATE checkout_registrations
          SET status = 'pending', expires_at = ?, product_kind = ?, requires_guardian = ?,
              updated_at = ?
          WHERE id = ?
        `).run(
          expiresAt,
          requirements.productKind,
          requirements.requiresGuardian ? 1 : 0,
          now,
          row.id
        );
        row = loadRegistration(row.id) || row;
      }
    }
    if (!row) {
      throw new ApiError(500, 'REGISTRATION_CREATE_FAILED', 'No fue posible preparar el registro.');
    }
    prepare(`
      UPDATE orders
      SET registration_status = 'pending', buyer_email = COALESCE(buyer_email, ?), updated_at = ?
      WHERE id = ? AND registration_status <> 'completed'
    `).run(buyerEmail, now, order.id);
    return { registration: row, order };
  });
}

export function registrationUrlForOrder(orderId: string): string {
  const { registration } = ensureRegistrationForOrder(orderId);
  return `${appUrl()}/bienvenida/registro?token=${encodeURIComponent(
    registrationTokenForRow(registration)
  )}`;
}

export function getRegistrationView(
  token: string,
  sessionUser?: AuthUser | null
): RegistrationView {
  const parsed = parseRegistrationToken(token);
  const row = loadRegistration(parsed.registrationId);
  if (!row) {
    throw new ApiError(404, 'REGISTRATION_NOT_FOUND', 'El registro no existe.');
  }
  if (Math.floor(Date.parse(row.expires_at) / 1000) !== parsed.expiredUnix) {
    throw new ApiError(400, 'REGISTRATION_TOKEN_INVALID', 'El enlace de registro no es válido.');
  }
  if (parsed.expiredUnix * 1000 < Date.now()) {
    throw new ApiError(
      410,
      'REGISTRATION_EXPIRED',
      'El enlace de registro venció. Inicia sesión o solicita uno nuevo para continuar.'
    );
  }
  const order = loadRegistrationOrder(row.order_id);
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'La orden no existe.');
  if (
    order.status !== 'paid' &&
    order.status !== 'free' &&
    order.status !== 'refunded' &&
    order.status !== 'reversed'
  ) {
    throw new ApiError(
      409,
      'ORDER_NOT_PAID',
      'El pago todavía no está confirmado. No es posible activar el registro.'
    );
  }
  const requirements = orderRegistrationRequirements(order.id);
  const account = prepare(
    'SELECT id, email FROM users WHERE email = ? COLLATE NOCASE AND id <> ? LIMIT 1'
  ).get(row.buyer_email, GUEST_CHECKOUT_USER_ID) as { id: string; email: string } | undefined;
  const canLinkCurrentSession = Boolean(
    sessionUser && sessionUser.email.toLowerCase() === row.buyer_email.toLowerCase()
  );
  return {
    registrationId: row.id,
    orderId: order.id,
    orderStatus: order.status,
    status: row.status,
    expiresAt: row.expires_at,
    completedAt: row.completed_at,
    buyerEmail: row.buyer_email,
    buyerName: row.buyer_name,
    products: requirements.products.map((product) => ({
      title: product.title,
      kind: product.kind,
    })),
    productKind: requirements.productKind,
    requiresGuardian: requirements.requiresGuardian,
    grade: requirements.grade,
    accountExists: Boolean(account),
    canLinkCurrentSession,
    totalCents: Number(order.total_cents),
    currency: order.currency,
    termsVersion: row.terms_version,
    privacyVersion: row.privacy_version,
    marketingOptIn: Boolean(row.marketing_opt_in),
    redirectTo: requirements.redirectTo,
    loginUrl: `${appUrl()}/login`,
    courseUrl: `${appUrl()}${requirements.redirectTo}`,
  };
}

export function markRegistrationInviteSent(registrationId: string): void {
  prepare(
    'UPDATE checkout_registrations SET invite_sent_at = ?, updated_at = ? WHERE id = ?'
  ).run(nowIso(), nowIso(), registrationId);
}

function publicRegistrationUrl(registration: RegistrationRow): string {
  return `${appUrl()}/bienvenida/registro?token=${encodeURIComponent(
    registrationTokenForRow(registration)
  )}`;
}

export async function sendRegistrationInvite(
  orderId: string,
  options: { force?: boolean } = {}
): Promise<MailResult> {
  const { registration } = ensureRegistrationForOrder(orderId);
  if (registration.status === 'completed' || registration.status === 'revoked') {
    return { sent: false, skipped: 'not_configured' };
  }
  if (!options.force && registration.invite_sent_at) {
    return { sent: false, skipped: 'not_configured' };
  }
  const requirements = orderRegistrationRequirements(orderId);
  const result = await sendRegistrationResumeEmail({
    to: registration.buyer_email,
    name: registration.buyer_name || registration.buyer_email.split('@')[0],
    products: requirements.products.map((product) => product.title),
    url: publicRegistrationUrl(registration),
  });
  if (result.sent) markRegistrationInviteSent(registration.id);
  return result;
}

function requiredText(value: unknown, field: string, min = 2, max = 80): string {
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} es obligatorio.`);
  }
  const text = value.trim().replace(/\s+/g, ' ');
  if (text.length < min || text.length > max) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      `${field} debe tener entre ${min} y ${max} caracteres.`
    );
  }
  if (/[\u0000-\u001f\u007f]/.test(text)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} contiene caracteres no permitidos.`);
  }
  return text;
}

function optionalText(value: unknown, field: string, max = 120): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} no es válido.`);
  }
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text) return null;
  if (text.length > max) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} excede la longitud permitida.`);
  }
  return text;
}

function nameField(value: unknown, field: string): string {
  const text = requiredText(value, field, 2, 80);
  if (!/^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u.test(text)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} contiene caracteres no válidos.`);
  }
  return text;
}

function phoneField(value: unknown, field: string, required: boolean): string | null {
  const text = optionalText(value, field, 30);
  if (!text) {
    if (required) throw new ApiError(400, 'VALIDATION_ERROR', `${field} es obligatorio.`);
    return null;
  }
  if (!/^[+0-9()\s.-]{7,30}$/.test(text)) {
    throw new ApiError(400, 'VALIDATION_ERROR', `${field} no tiene un formato válido.`);
  }
  return text;
}

function dateOfBirth(value: unknown): { date: string; age: number } {
  const text = requiredText(value, 'La fecha de nacimiento', 10, 10);
  const date = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'La fecha de nacimiento no es válida.');
  }
  const now = new Date();
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - date.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < date.getUTCDate())) age -= 1;
  if (age < 4 || age >= 18) {
    throw new ApiError(
      400,
      'VALIDATION_ERROR',
      'El programa para menores requiere una fecha de nacimiento de una persona de 4 a 17 años.'
    );
  }
  return { date: text, age };
}

function uniqueUsername(baseEmail: string): string {
  const base =
    baseEmail
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '')
      .slice(0, 40) || 'estudiante';
  let candidate = base;
  let suffix = 1;
  while (
    prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE').get(candidate)
  ) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function maskedDocument(value: string | null): string | null {
  if (!value) return null;
  return value.length <= 4 ? '••••' : `••••${value.slice(-4)}`;
}

export async function completeRegistration(input: {
  token: string;
  sessionUser?: AuthUser | null;
  submission: RegistrationSubmission;
}): Promise<CompletedRegistration> {
  const parsed = parseRegistrationToken(input.token);
  const row = loadRegistration(parsed.registrationId);
  if (!row) {
    throw new ApiError(404, 'REGISTRATION_NOT_FOUND', 'El registro no existe.');
  }
  if (Math.floor(Date.parse(row.expires_at) / 1000) !== parsed.expiredUnix) {
    throw new ApiError(400, 'REGISTRATION_TOKEN_INVALID', 'El enlace de registro no es válido.');
  }
  const order = loadRegistrationOrder(row.order_id);
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'La orden no existe.');
  if (order.status !== 'paid' && order.status !== 'free') {
    throw new ApiError(409, 'ORDER_NOT_PAID', 'El pago todavía no está confirmado.');
  }
  if (row.status === 'completed') {
    // Reintento tras una respuesta de red perdida: no se crea nada nuevo.
    const user = row.completed_user_id
      ? prepare('SELECT id FROM users WHERE id = ?').get(row.completed_user_id)
      : null;
    if (user) {
      return {
        userId: row.completed_user_id as string,
        isNewUser: false,
        registrationId: row.id,
        orderId: row.order_id,
        redirectTo: orderRegistrationRequirements(order.id).redirectTo,
        loginUrl: `${appUrl()}/login`,
        productNames: orderRegistrationRequirements(order.id).products.map(
          (product) => product.title
        ),
        emailSent: false,
      };
    }
  }
  if (row.status !== 'pending' || row.expires_at <= nowIso()) {
    throw new ApiError(
      410,
      'REGISTRATION_EXPIRED',
      'El enlace de registro venció o fue revocado. Solicita uno nuevo.'
    );
  }

  const requirements = orderRegistrationRequirements(order.id);
  const buyerEmail = normalizeBuyerEmail(row.buyer_email);
  const buyerFirstName = nameField(input.submission.buyerFirstName, 'Los nombres');
  const buyerLastName = nameField(input.submission.buyerLastName, 'Los apellidos');
  const country = optionalText(input.submission.country, 'El país', 80) || 'Ecuador';
  const documentTypeRaw = optionalText(
    input.submission.documentType,
    'El tipo de documento',
    20
  );
  if (documentTypeRaw && !DOCUMENT_TYPES.includes(documentTypeRaw as (typeof DOCUMENT_TYPES)[number])) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El tipo de documento no es válido.');
  }
  const documentNumber = optionalText(
    input.submission.documentNumber,
    'El número de documento',
    30
  );
  if (documentNumber && !/^[A-Za-z0-9-]{5,30}$/.test(documentNumber)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'El número de documento no es válido.');
  }
  if (documentNumber && !documentTypeRaw) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Selecciona el tipo de documento.');
  }
  const phone = phoneField(
    input.submission.phone,
    'El teléfono',
    requirements.requiresGuardian
  );
  const acceptTerms = input.submission.acceptTerms === true;
  const acceptPrivacy = input.submission.acceptPrivacy === true;
  if (!acceptTerms || !acceptPrivacy) {
    throw new ApiError(
      400,
      'CONSENT_REQUIRED',
      'Debes aceptar los términos y el tratamiento de datos personales.'
    );
  }
  const marketingOptIn = input.submission.marketingOptIn === true;

  let studentFirstName: string | null = null;
  let studentLastName: string | null = null;
  let studentBirthDate: string | null = null;
  let studentAge: number | null = null;
  let studentAcademicNotes: string | null = null;
  let guardianFirstName: string | null = null;
  let guardianLastName: string | null = null;
  let guardianEmail: string | null = null;
  let guardianPhone: string | null = null;
  let guardianRelationship: string | null = null;

  if (requirements.requiresGuardian) {
    studentFirstName = nameField(input.submission.studentFirstName, 'Los nombres del estudiante');
    studentLastName = nameField(input.submission.studentLastName, 'Los apellidos del estudiante');
    const birth = dateOfBirth(input.submission.studentBirthDate);
    studentBirthDate = birth.date;
    studentAge = birth.age;
    studentAcademicNotes = optionalText(
      input.submission.studentAcademicNotes,
      'La información académica',
      500
    );
    guardianFirstName = nameField(
      input.submission.guardianFirstName,
      'Los nombres del representante'
    );
    guardianLastName = nameField(
      input.submission.guardianLastName,
      'Los apellidos del representante'
    );
    guardianEmail = normalizeBuyerEmail(input.submission.guardianEmail);
    guardianPhone = phoneField(input.submission.guardianPhone, 'El teléfono del representante', true);
    const relationship = optionalText(
      input.submission.guardianRelationship,
      'La relación con el estudiante',
      30
    );
    if (!relationship || !RELATIONSHIPS.includes(relationship as (typeof RELATIONSHIPS)[number])) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Indica la relación con el estudiante.');
    }
    guardianRelationship = relationship;
    if (input.submission.guardianAuthorization !== true) {
      throw new ApiError(
        400,
        'GUARDIAN_AUTHORIZATION_REQUIRED',
        'El representante legal debe autorizar la matrícula del estudiante.'
      );
    }
  }

  const sessionEmail = input.sessionUser?.email.toLowerCase();
  if (sessionEmail && sessionEmail !== buyerEmail) {
    throw new ApiError(
      403,
      'SESSION_EMAIL_MISMATCH',
      'La cuenta activa no coincide con el correo de la compra. Inicia sesión con el correo correcto.'
    );
  }
  const existingUser = prepare(
    'SELECT id, email, display_name, email_verified, status FROM users WHERE email = ? COLLATE NOCASE AND id <> ? LIMIT 1'
  ).get(buyerEmail, GUEST_CHECKOUT_USER_ID) as
    | {
        id: string;
        email: string;
        display_name: string | null;
        email_verified: number;
        status: string;
      }
    | undefined;
  if (existingUser?.status !== undefined && existingUser.status !== 'active') {
    throw new ApiError(403, 'ACCOUNT_UNAVAILABLE', 'La cuenta existente no está disponible.');
  }
  if (existingUser && !input.sessionUser) {
    throw new ApiError(
      409,
      'EMAIL_EXISTS',
      'Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña para vincular la compra.'
    );
  }
  if (existingUser && input.sessionUser && existingUser.id !== input.sessionUser.id) {
    throw new ApiError(403, 'SESSION_EMAIL_MISMATCH', 'La cuenta activa no coincide con la compra.');
  }

  let passwordHash: string | null = null;
  if (!existingUser) {
    const password = typeof input.submission.password === 'string' ? input.submission.password : '';
    const confirm =
      typeof input.submission.passwordConfirm === 'string'
        ? input.submission.passwordConfirm
        : '';
    if (!password || password !== confirm) {
      throw new ApiError(
        400,
        'PASSWORD_MISMATCH',
        'La contraseña y su confirmación deben coincidir.'
      );
    }
    const policy = validatePasswordStrength(password);
    if (!policy.ok) {
      throw new ApiError(400, 'WEAK_PASSWORD', policy.message || 'La contraseña es demasiado débil.');
    }
    passwordHash = await hashPassword(password);
  }

  const now = nowIso();
  const displayName = `${buyerFirstName} ${buyerLastName}`.trim();
  const userId = existingUser?.id || `usr_${randomToken(16)}`;
  const isNewUser = !existingUser;
  const data = {
    buyer: {
      firstName: buyerFirstName,
      lastName: buyerLastName,
      email: buyerEmail,
      type: requirements.requiresGuardian ? 'guardian' : 'student',
      documentType: documentTypeRaw,
      documentNumber,
      country,
      phone,
    },
    student: requirements.requiresGuardian
      ? {
          firstName: studentFirstName,
          lastName: studentLastName,
          birthDate: studentBirthDate,
          grade: requirements.grade,
          academicNotes: studentAcademicNotes,
        }
      : null,
    guardian: requirements.requiresGuardian
      ? {
          firstName: guardianFirstName,
          lastName: guardianLastName,
          email: guardianEmail,
          phone: guardianPhone,
          relationship: guardianRelationship,
        }
      : null,
    consent: {
      termsVersion: REGISTRATION_TERMS_VERSION,
      privacyVersion: REGISTRATION_PRIVACY_VERSION,
      marketingOptIn,
      guardianAuthorization: requirements.requiresGuardian ? true : null,
      acceptedAt: now,
    },
    source: 'checkout_guest',
  };

  let verifyUrl: string | null = null;
  let verificationPromise: Promise<MailResult> | null = null;

  withTransaction(() => {
    const current = loadRegistration(row.id);
    if (!current || current.status === 'completed') {
      // Otra petición completó el registro entre la lectura y la transacción.
      throw new ApiError(409, 'REGISTRATION_ALREADY_COMPLETED', 'El registro ya fue completado.');
    }
    if (current.status !== 'pending') {
      throw new ApiError(410, 'REGISTRATION_EXPIRED', 'El enlace de registro ya no está vigente.');
    }

    if (isNewUser) {
      prepare(`
        INSERT INTO users
          (id, email, email_verified, display_name, username, password_hash, password_updated_at,
           must_change_password, status, is_minor, created_at, updated_at)
        VALUES (?, ?, 0, ?, ?, ?, ?, 0, 'active', 0, ?, ?)
      `).run(
        userId,
        buyerEmail,
        displayName,
        uniqueUsername(buyerEmail),
        passwordHash,
        now,
        now,
        now
      );
      prepare(`
        INSERT INTO user_roles (id, user_id, role_code, granted_by, granted_at)
        VALUES (?, ?, ?, NULL, ?)
      `).run(
        `ur_${randomToken(12)}`,
        userId,
        requirements.requiresGuardian ? 'guardian' : 'student',
        now
      );
    }

    const profile = prepare('SELECT id FROM student_profiles WHERE user_id = ?').get(userId) as
      | { id: string }
      | undefined;
    const profileName = requirements.requiresGuardian
      ? `${studentFirstName} ${studentLastName}`.trim()
      : displayName;
    const profileId = profile?.id || `stp_${randomToken(12)}`;
    if (!profile) {
      prepare(`
        INSERT INTO student_profiles
          (id, user_id, full_name, age, grade, subnivel, folder_code, profile_agent, language,
           portfolio_owner, mentor_email, created_at, updated_at,
           first_name, last_name, birth_date, country, phone, document_type, document_number,
           guardian_first_name, guardian_last_name, guardian_email, guardian_phone,
           guardian_relationship, registration_origin)
        VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, 'ES', NULL, NULL, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'checkout_guest')
      `).run(
        profileId,
        userId,
        profileName,
        studentAge,
        requirements.grade,
        now,
        now,
        requirements.requiresGuardian ? studentFirstName : buyerFirstName,
        requirements.requiresGuardian ? studentLastName : buyerLastName,
        studentBirthDate,
        country,
        requirements.requiresGuardian ? guardianPhone : phone,
        documentTypeRaw,
        documentNumber,
        guardianFirstName,
        guardianLastName,
        guardianEmail,
        guardianPhone,
        guardianRelationship
      );
    }
    if (requirements.requiresGuardian) {
      prepare(`
        INSERT OR IGNORE INTO guardian_students
          (id, guardian_user_id, student_profile_id, relationship, verified_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        `gst_${randomToken(12)}`,
        userId,
        profileId,
        guardianRelationship || 'representante',
        now,
        now
      );
    }

    prepare(`
      INSERT INTO crm_contacts
        (id, email, name, phone, status, consent_email, consent_updated_at, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        status = excluded.status,
        consent_email = excluded.consent_email,
        consent_updated_at = excluded.consent_updated_at,
        updated_at = excluded.updated_at
    `).run(
      `crm_${randomToken(12)}`,
      buyerEmail,
      displayName,
      requirements.requiresGuardian ? guardianPhone : phone,
      requirements.requiresGuardian ? 'guardian' : 'customer',
      marketingOptIn ? 1 : 0,
      now,
      'Registro completado desde checkout; consentimiento de términos y datos registrado.',
      now,
      now
    );

    prepare(`
      UPDATE orders
      SET user_id = ?, registered_user_id = ?, buyer_name = ?, registration_status = 'completed',
          registration_completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(userId, userId, displayName, now, now, order.id);
    prepare(`
      UPDATE discount_redemptions
      SET user_id = ?
      WHERE order_id = ? AND user_id = ?
    `).run(userId, order.id, GUEST_CHECKOUT_USER_ID);
    prepare(`
      UPDATE checkout_registrations
      SET buyer_name = ?, buyer_first_name = ?, buyer_last_name = ?, buyer_document_type = ?,
          buyer_document_number = ?, buyer_country = ?, buyer_phone = ?, buyer_type = ?,
          student_first_name = ?, student_last_name = ?, student_birth_date = ?,
          student_grade = ?, student_academic_notes = ?, guardian_first_name = ?,
          guardian_last_name = ?, guardian_email = ?, guardian_phone = ?,
          guardian_relationship = ?, status = 'completed', completed_user_id = ?,
          completed_at = ?, terms_accepted_at = ?, privacy_accepted_at = ?,
          marketing_opt_in = ?, data_json = ?, updated_at = ?
      WHERE id = ?
    `).run(
      displayName,
      buyerFirstName,
      buyerLastName,
      documentTypeRaw,
      documentNumber,
      country,
      phone,
      requirements.requiresGuardian ? 'guardian' : 'student',
      studentFirstName,
      studentLastName,
      studentBirthDate,
      requirements.grade,
      studentAcademicNotes,
      guardianFirstName,
      guardianLastName,
      guardianEmail,
      guardianPhone,
      guardianRelationship,
      userId,
      now,
      now,
      now,
      marketingOptIn ? 1 : 0,
      JSON.stringify({
        ...data,
        buyer: {
          ...data.buyer,
          documentNumberMasked: maskedDocument(documentNumber),
        },
      }),
      now,
      row.id
    );

    grantAccessForOrder(order.id);
  });

  if (isNewUser) {
    const verification = createEmailVerificationLink({
      userId,
      email: buyerEmail,
      name: displayName,
    });
    verifyUrl = verification.verifyUrl;
    verificationPromise = verification.emailResult;
  }
  const productNames = requirements.products.map((product) => product.title);
  const welcomeResult = await sendWelcomeEmail({
    to: buyerEmail,
    name: displayName,
    products: productNames,
    loginUrl: `${appUrl()}/login`,
    courseUrl: `${appUrl()}${requirements.redirectTo}`,
    verifyUrl,
  });
  if (verificationPromise) {
    void verificationPromise.catch(() => undefined);
  }

  return {
    userId,
    isNewUser,
    registrationId: row.id,
    orderId: order.id,
    redirectTo: requirements.redirectTo,
    loginUrl: `${appUrl()}/login`,
    productNames,
    emailSent: welcomeResult.sent,
  };
}

export interface RegistrationListItem {
  registrationId: string;
  orderId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  buyerType: string;
  buyerCountry: string | null;
  documentType: string | null;
  documentNumberMasked: string | null;
  products: string[];
  productKind: string;
  requiresGuardian: boolean;
  amountCents: number;
  currency: string;
  paymentStatus: string;
  registrationStatus: string;
  registeredAt: string | null;
  createdAt: string;
  accountEmail: string | null;
  emailVerified: boolean | null;
  studentName: string | null;
  studentBirthDate: string | null;
  studentGrade: string | null;
  guardianName: string | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  guardianRelationship: string | null;
  activeAccess: boolean;
}

export function listCheckoutRegistrations(filters: {
  q?: string | null;
  status?: string | null;
  from?: string | null;
  to?: string | null;
  includeMinors?: boolean;
  limit?: number | null;
} = {}): RegistrationListItem[] {
  const clauses: string[] = ['1=1'];
  const params: Array<string | number> = [];
  // Sin minors.read no se devuelven expedientes de menores ni sus datos.
  if (filters.includeMinors !== true) {
    clauses.push('r.requires_guardian = 0');
  }
  const q = filters.q?.trim();
  if (q) {
    const like = `%${q.slice(0, 120)}%`;
    clauses.push(`(
      r.buyer_email LIKE ? OR COALESCE(r.buyer_name, '') LIKE ? OR r.order_id LIKE ?
      OR COALESCE(u.display_name, '') LIKE ? OR COALESCE(r.student_first_name, '') LIKE ?
      OR COALESCE(r.student_last_name, '') LIKE ?
    )`);
    params.push(like, like, like, like, like, like);
  }
  if (filters.status && filters.status !== 'all') {
    clauses.push('r.status = ?');
    params.push(filters.status);
  }
  if (filters.from) {
    clauses.push('r.created_at >= ?');
    params.push(`${filters.from}T00:00:00.000Z`);
  }
  if (filters.to) {
    const end = new Date(new Date(`${filters.to}T00:00:00.000Z`).getTime() + 86_400_000);
    clauses.push('r.created_at < ?');
    params.push(end.toISOString());
  }
  const limit = Math.max(1, Math.min(300, Number(filters.limit) || 200));
  const rows = prepare(`
    SELECT r.*, o.status AS payment_status, o.total_cents, o.currency, o.created_at AS order_created_at,
           COALESCE(o.buyer_email, u.email) AS contact_email,
           u.display_name AS account_name, u.email AS account_email, u.email_verified,
           EXISTS(
             SELECT 1 FROM entitlements e
             WHERE e.user_id = COALESCE(o.registered_user_id, o.user_id)
               AND e.status = 'active'
               AND e.origin_ref = o.id
               AND e.starts_at <= ?
               AND (e.ends_at IS NULL OR e.ends_at > ?)
           ) AS active_access
    FROM checkout_registrations r
    JOIN orders o ON o.id = r.order_id
    LEFT JOIN users u ON u.id = o.registered_user_id
    WHERE ${clauses.join(' AND ')}
    ORDER BY r.created_at DESC
    LIMIT ?
  `).all(nowIso(), nowIso(), ...params, limit) as Array<
    RegistrationRow & {
      payment_status: string;
      total_cents: number;
      currency: string;
      contact_email: string;
      account_name: string | null;
      account_email: string | null;
      email_verified: number | null;
      active_access: number;
    }
  >;

  return rows.map((row) => {
    const items = prepare(
      'SELECT title_snapshot FROM order_items WHERE order_id = ? ORDER BY id'
    ).all(row.order_id) as Array<{ title_snapshot: string }>;
    return {
      registrationId: row.id,
      orderId: row.order_id,
      buyerName: row.buyer_name || row.contact_email,
      buyerEmail: row.buyer_email,
      buyerPhone: row.buyer_phone,
      buyerType: row.buyer_type,
      buyerCountry: row.buyer_country,
      documentType: row.buyer_document_type,
      documentNumberMasked: maskedDocument(row.buyer_document_number),
      products: items.map((item) => item.title_snapshot),
      productKind: row.product_kind,
      requiresGuardian: Boolean(row.requires_guardian),
      amountCents: Number(row.total_cents),
      currency: row.currency,
      paymentStatus: row.payment_status,
      registrationStatus: row.status,
      registeredAt: row.completed_at,
      createdAt: row.created_at,
      accountEmail: row.account_email,
      emailVerified:
        row.email_verified === null || row.email_verified === undefined
          ? null
          : Boolean(row.email_verified),
      studentName:
        row.student_first_name && row.student_last_name
          ? `${row.student_first_name} ${row.student_last_name}`
          : null,
      studentBirthDate: row.student_birth_date,
      studentGrade: row.student_grade,
      guardianName:
        row.guardian_first_name && row.guardian_last_name
          ? `${row.guardian_first_name} ${row.guardian_last_name}`
          : null,
      guardianEmail: row.guardian_email,
      guardianPhone: row.guardian_phone,
      guardianRelationship: row.guardian_relationship,
      activeAccess: Boolean(row.active_access),
    };
  });
}

export function registrationIdFromToken(token: string): string {
  return parseRegistrationToken(token).registrationId;
}

export function orderIdFromRegistrationToken(token: string): string {
  const row = loadRegistration(parseRegistrationToken(token).registrationId);
  if (!row) {
    throw new ApiError(404, 'REGISTRATION_NOT_FOUND', 'El registro no existe.');
  }
  return row.order_id;
}

export function pendingRegistrationsForEmail(email: string): Array<{ orderId: string }> {
  return prepare(`
    SELECT r.order_id
    FROM checkout_registrations r
    JOIN orders o ON o.id = r.order_id
    WHERE r.buyer_email = ? COLLATE NOCASE
      AND r.status = 'pending'
      AND o.status IN ('paid','free')
    ORDER BY r.created_at DESC
    LIMIT 5
  `).all(email) as Array<{ orderId: string }>;
}
