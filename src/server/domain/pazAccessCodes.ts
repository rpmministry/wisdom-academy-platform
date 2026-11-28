/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform
 * ARCHIVO: src/server/domain/pazAccessCodes.ts
 *
 * PROPÓSITO:
 * Sistema de emisión, validación criptográfica, canje y auditoría de códigos
 * únicos de 25 caracteres para participantes del taller que pagan por
 * transferencia bancaria o reciben autorización administrativa.
 *
 * ARQUITECTURA DE SEGURIDAD:
 * - Alfabeto seguro Crockford Base32 (evita confusión entre 0/O, 1/I/L).
 * - Formato: 25 caracteres alfanuméricos agrupados en bloques: PAZ26-XXXXX-XXXXX-XXXXX-XXXXX
 * - NUNCA se almacena el código original en texto plano en la base de datos.
 * - Se almacena un hash criptográfico SHA-256 con salt de aplicación.
 * - Solo es canjeable una vez (single-use) y asociado al correo de la inscripción.
 * - Protección contra ataques de fuerza bruta mediante limitación de intentos.
 * ==============================================================================
 */

import crypto from 'node:crypto';
import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import { ApiError } from '../http/api';
import { writeAudit } from '../audit';
import type { AuthUser } from '../auth/authorization';
import { grantEntitlement } from './access';
import { findUserByIdentifier, uniqueUsernameFromEmail } from './users';
import { getProgramRowBySlug } from './coursePrograms';
import { PAZ_PROGRAM_SLUG } from '@/lib/paz-en-la-mesa/content';
import { enqueuePazSyncEvent } from './pazGoogleSync';
import { randomToken } from '../security/random';

// Alfabeto Crockford Base32: 32 caracteres legibles sin 0/O ni 1/I/L
const SAFE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_SALT = process.env.SESSION_SECRET || 'wisdom-paz-access-code-salt-2026';
const MAX_ATTEMPTS = 5;
const DEFAULT_EXPIRATION_DAYS = 90;

export interface PazAccessCodeView {
  id: string;
  codePreview: string;
  intentId: string | null;
  email: string;
  userId: string | null;
  programId: string;
  status: 'generated' | 'sent' | 'redeemed' | 'revoked';
  generatedBy: string | null;
  generatedAt: string;
  sentAt: string | null;
  sentBy: string | null;
  expiresAt: string | null;
  redeemedAt: string | null;
  redeemedIp: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  revokeReason: string | null;
  attempts: number;
  isTest: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratePazCodeResult {
  id: string;
  rawCode: string; // Devuelto UNA SOLA VEZ al administrador para entrega
  codePreview: string;
  email: string;
  expiresAt: string;
}

/**
 * Normaliza cualquier formato de código ingresado por el usuario:
 * - Elimina guiones, espacios y convierte a mayúsculas.
 */
export function normalizeAccessCode(input: string): string {
  return (input || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/**
 * Calcula el hash seguro SHA-256 del código con salt de aplicación.
 */
export function hashAccessCode(normalizedCode: string): string {
  return crypto
    .createHmac('sha256', CODE_SALT)
    .update(`paz-code:${normalizedCode}`)
    .digest('hex');
}

/**
 * Genera un código criptográficamente seguro de 25 caracteres.
 * Formato resultante: PAZ26-XXXXX-XXXXX-XXXXX-XXXXX (25 caracteres de payload)
 */
export function generateRawSecureCode(): string {
  const bytes = crypto.randomBytes(20);
  let randomPart = '';
  for (let i = 0; i < 20; i += 1) {
    randomPart += SAFE_ALPHABET[bytes[i] % SAFE_ALPHABET.length];
  }
  // Prefijo identificador de 5 caracteres + 20 caracteres aleatorios = 25 caracteres
  const raw25 = `PAZ26${randomPart}`;
  return `${raw25.slice(0, 5)}-${raw25.slice(5, 10)}-${raw25.slice(10, 15)}-${raw25.slice(15, 20)}-${raw25.slice(20, 25)}`;
}

/**
 * Crea una vista previa enmascarada del código para auditoría en el panel.
 */
export function maskAccessCode(rawCodeFormatted: string): string {
  const normalized = normalizeAccessCode(rawCodeFormatted);
  if (normalized.length < 5) return 'PAZ26-•••••';
  const tail = normalized.slice(-5);
  return `PAZ26-••••-••••-••••-${tail}`;
}

/**
 * Genera un código de acceso único de 25 caracteres para una inscripción por transferencia.
 */
export function generatePazAccessCode(
  admin: AuthUser,
  options: {
    email: string;
    intentId?: string | null;
    programSlug?: string;
    expirationDays?: number;
    isTest?: boolean;
  }
): GeneratePazCodeResult {
  const email = (options.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new ApiError(400, 'INVALID_EMAIL', 'El correo electrónico del participante es inválido.');
  }

  const programSlug = options.programSlug || PAZ_PROGRAM_SLUG;
  const program = getProgramRowBySlug(programSlug);
  if (!program) {
    throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El taller Paz en la mesa no está disponible.');
  }

  const rawFormatted = generateRawSecureCode();
  const normalized = normalizeAccessCode(rawFormatted);
  const codeHash = hashAccessCode(normalized);
  const codePreview = maskAccessCode(rawFormatted);

  const now = nowIso();
  const id = `pazcode_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const days = options.expirationDays ?? DEFAULT_EXPIRATION_DAYS;
  const expiresAt = new Date(Date.now() + days * 86400 * 1000).toISOString();
  const isTest = options.isTest ? 1 : 0;

  return withTransaction(() => {
    prepare(`
      INSERT INTO paz_access_codes (
        id, code_hash, code_preview, intent_id, email, user_id, program_id,
        status, generated_by, generated_at, sent_at, sent_by, expires_at,
        attempts, is_test, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, 'generated', ?, ?, NULL, NULL, ?, 0, ?, ?, ?)
    `).run(
      id,
      codeHash,
      codePreview,
      options.intentId || null,
      email,
      program.id,
      admin.id,
      now,
      expiresAt,
      isTest,
      now,
      now
    );

    // Si viene vinculado a una intención de pago, validamos y actualizamos estado de forma atómica
    if (options.intentId) {
      const intentRow = prepare('SELECT id, status, method FROM paz_payment_intents WHERE id = ?').get(
        options.intentId
      ) as { id: string; status: string; method: string } | undefined;

      if (!intentRow) {
        throw new ApiError(404, 'PAZ_PAYMENT_NOT_FOUND', 'La inscripción vinculada no existe.');
      }
      if (intentRow.status === 'rejected' || intentRow.status === 'cancelled') {
        throw new ApiError(
          409,
          'PAZ_PAYMENT_REJECTED',
          'No se puede generar un código para un pago rechazado o cancelado.'
        );
      }
      if (intentRow.status === 'pending') {
        const updateRes = prepare(`
          UPDATE paz_payment_intents
          SET status = 'approved',
              reviewed_by = ?,
              reviewed_at = ?,
              review_note = COALESCE(review_note, 'Transferencia verificada. Código de acceso generado.'),
              updated_at = ?
          WHERE id = ? AND status = 'pending'
        `).run(admin.id, now, now, options.intentId);
        if (updateRes.changes === 0) {
          throw new ApiError(
            409,
            'PAZ_PAYMENT_ALREADY_APPROVED',
            'Este pago ya fue aprobado simultáneamente por otro administrador.'
          );
        }
      }
    }

    writeAudit({
      actor: admin,
      action: 'paz.code.generated',
      entityType: 'paz_access_code',
      entityId: id,
      after: { email, codePreview, intentId: options.intentId || null, isTest: Boolean(isTest) },
    });

    enqueuePazSyncEvent({
      eventType: 'code_generated',
      entityId: id,
      tabTarget: 'CODIGOS_ACCESO',
      payload: {
        codeId: id,
        email,
        codePreview,
        intentId: options.intentId || null,
        generatedAt: now,
        expiresAt,
        status: 'generated',
        isTest: Boolean(isTest),
      },
    });

    return {
      id,
      rawCode: rawFormatted,
      codePreview,
      email,
      expiresAt,
    };
  });
}

export interface RedeemPazAccessCodeInput {
  rawCode: string;
  email: string;
  fullName?: string;
  clientIp?: string;
  userAgent?: string;
}

export interface RedeemPazAccessCodeResult {
  success: boolean;
  user: {
    id: string;
    email: string;
    displayName: string;
  };
  program: {
    id: string;
    slug: string;
    title: string;
  };
  alreadyRedeemed?: boolean;
}

/**
 * Canjea un código de acceso de 25 caracteres para activar la cuenta del estudiante y conceder derecho de acceso.
 */
export function redeemPazAccessCode(input: RedeemPazAccessCodeInput): RedeemPazAccessCodeResult {
  const email = (input.email || '').trim().toLowerCase();
  const normalized = normalizeAccessCode(input.rawCode);

  if (!email || !email.includes('@')) {
    throw new ApiError(400, 'INVALID_EMAIL', 'El correo electrónico ingresado no es válido.');
  }

  if (normalized.length !== 25) {
    throw new ApiError(
      400,
      'INVALID_CODE_FORMAT',
      'El código de acceso debe contener exactamente 25 caracteres alfanuméricos.'
    );
  }

  const codeHash = hashAccessCode(normalized);

  const codeRow = prepare(`
    SELECT * FROM paz_access_codes WHERE code_hash = ?
  `).get(codeHash) as
    | {
        id: string;
        intent_id: string | null;
        email: string;
        user_id: string | null;
        program_id: string;
        status: string;
        expires_at: string | null;
        attempts: number;
        is_test: number;
      }
    | undefined;

  if (!codeRow) {
    throw new ApiError(404, 'CODE_NOT_FOUND', 'El código de acceso no es válido o no existe.');
  }

  // Comprobar intentos fallidos y fuerza bruta
  if (codeRow.attempts >= MAX_ATTEMPTS) {
    throw new ApiError(
      429,
      'CODE_LOCKED',
      'Este código ha superado el número máximo de intentos permitidos por seguridad. Contacta al soporte de Wisdom Academy.'
    );
  }

  // Validación estricta de correo electrónico asociado
  if (codeRow.email.toLowerCase() !== email) {
    prepare('UPDATE paz_access_codes SET attempts = attempts + 1, updated_at = ? WHERE id = ?').run(
      nowIso(),
      codeRow.id
    );
    throw new ApiError(
      403,
      'CODE_EMAIL_MISMATCH',
      'El código no corresponde al correo electrónico proporcionado.'
    );
  }

  // Validación de revocación
  if (codeRow.status === 'revoked') {
    throw new ApiError(403, 'CODE_REVOKED', 'Este código de acceso ha sido revocado por un administrador.');
  }

  // Validación de expiración
  if (codeRow.expires_at) {
    const expiry = new Date(codeRow.expires_at).getTime();
    if (expiry < Date.now()) {
      throw new ApiError(403, 'CODE_EXPIRED', 'El código de acceso ha expirado.');
    }
  }

  // Si ya fue canjeado para este usuario, confirmamos el acceso
  if (codeRow.status === 'redeemed') {
    const existingUser = codeRow.user_id
      ? (prepare('SELECT id, email, display_name FROM users WHERE id = ?').get(codeRow.user_id) as
          | { id: string; email: string; display_name: string }
          | undefined)
      : undefined;
    const programRow = prepare('SELECT * FROM course_programs WHERE id = ?').get(codeRow.program_id) as
      | { id: string; title: string; resource_id: string }
      | undefined;
    if (existingUser && programRow) {
      return {
        success: true,
        alreadyRedeemed: true,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          displayName: existingUser.display_name,
        },
        program: {
          id: programRow.id,
          slug: PAZ_PROGRAM_SLUG,
          title: programRow.title,
        },
      };
    }
    throw new ApiError(409, 'CODE_ALREADY_REDEEMED', 'Este código de acceso ya fue utilizado anteriormente.');
  }

  const now = nowIso();

  return withTransaction(() => {
    // 1. Obtener o aprovisionar la cuenta del estudiante
    let studentUser = findUserByIdentifier(email);
    if (!studentUser) {
      const newUserId = `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
      const username = uniqueUsernameFromEmail(email);
      const displayName = (input.fullName || '').trim() || email.split('@')[0];

      prepare(`
        INSERT INTO users (id, email, username, display_name, status, email_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', 1, ?, ?)
      `).run(newUserId, email, username, displayName, now, now);

      prepare(`
        INSERT INTO user_roles (id, user_id, role_code, granted_by, granted_at)
        VALUES (?, ?, 'student', 'paz_code_redemption', ?)
      `).run(`ur_${randomToken(12)}`, newUserId, now);

      studentUser = findUserByIdentifier(email);
    }

    if (!studentUser) {
      throw new ApiError(500, 'USER_PROVISIONING_FAILED', 'No se pudo crear o recuperar la cuenta del estudiante.');
    }

    // 2. Localizar el programa y recurso
    const programRow = prepare('SELECT * FROM course_programs WHERE id = ?').get(codeRow.program_id) as
      | { id: string; title: string; resource_id: string }
      | undefined;

    if (!programRow) {
      throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El taller asociado al código no existe.');
    }

    // 3. Conceder derecho de acceso permanente al taller
    grantEntitlement({
      userId: studentUser.id,
      resourceId: programRow.resource_id,
      origin: 'purchase',
      originRef: `paz_code_${codeRow.id}`,
    });

    // 4. Actualizar el estado del código a 'redeemed'
    prepare(`
      UPDATE paz_access_codes
      SET status = 'redeemed',
          user_id = ?,
          redeemed_at = ?,
          redeemed_ip = ?,
          updated_at = ?
      WHERE id = ?
    `).run(studentUser.id, now, input.clientIp || null, now, codeRow.id);

    // 5. Si existe intención de pago asociada, vincularla
    if (codeRow.intent_id) {
      prepare(`
        UPDATE paz_payment_intents
        SET user_id = ?,
            status = 'approved',
            updated_at = ?
        WHERE id = ?
      `).run(studentUser.id, now, codeRow.intent_id);
    }

    // 6. Auditoría y sincronización
    writeAudit({
      actor: studentUser as unknown as AuthUser,
      action: 'paz.code.redeemed',
      entityType: 'paz_access_code',
      entityId: codeRow.id,
      after: {
        email,
        programId: programRow.id,
        clientIp: input.clientIp || null,
        isTest: Boolean(codeRow.is_test),
      },
    });

    enqueuePazSyncEvent({
      eventType: 'code_redeemed',
      entityId: codeRow.id,
      tabTarget: 'CODIGOS_ACCESO',
      payload: {
        codeId: codeRow.id,
        email,
        userId: studentUser.id,
        redeemedAt: now,
        status: 'redeemed',
      },
    });

    enqueuePazSyncEvent({
      eventType: 'account_activated',
      entityId: studentUser.id,
      tabTarget: 'INSCRITOS',
      payload: {
        userId: studentUser.id,
        email,
        name: studentUser.display_name || email.split('@')[0],
        activationMethod: 'access_code_25',
        activatedAt: now,
      },
    });

    return {
      success: true,
      user: {
        id: studentUser.id,
        email: studentUser.email,
        displayName: studentUser.display_name || email.split('@')[0],
      },
      program: {
        id: programRow.id,
        slug: PAZ_PROGRAM_SLUG,
        title: programRow.title,
      },
    };
  });
}

/**
 * Revoca un código de acceso emitido.
 */
export function revokePazAccessCode(
  admin: AuthUser,
  codeId: string,
  reason: string
): { success: boolean; codeId: string } {
  const row = prepare('SELECT * FROM paz_access_codes WHERE id = ?').get(codeId) as
    | { id: string; status: string; email: string }
    | undefined;

  if (!row) {
    throw new ApiError(404, 'CODE_NOT_FOUND', 'El código de acceso no existe.');
  }

  if (row.status === 'redeemed') {
    throw new ApiError(400, 'CODE_ALREADY_REDEEMED', 'No se puede revocar un código que ya fue canjeado.');
  }

  const now = nowIso();
  prepare(`
    UPDATE paz_access_codes
    SET status = 'revoked',
        revoked_at = ?,
        revoked_by = ?,
        revoke_reason = ?,
        updated_at = ?
    WHERE id = ?
  `).run(now, admin.id, (reason || 'Revocado administrativamente').trim(), now, codeId);

  writeAudit({
    actor: admin,
    action: 'paz.code.revoked',
    entityType: 'paz_access_code',
    entityId: codeId,
    after: { email: row.email, reason },
  });

  enqueuePazSyncEvent({
    eventType: 'code_revoked',
    entityId: codeId,
    tabTarget: 'CODIGOS_ACCESO',
    payload: { codeId, email: row.email, revokedAt: now, reason },
  });

  return { success: true, codeId };
}

/**
 * Marca un código como enviado al estudiante.
 */
export function markPazAccessCodeSent(
  admin: AuthUser,
  codeId: string
): { success: boolean; codeId: string; sentAt: string } {
  const row = prepare('SELECT * FROM paz_access_codes WHERE id = ?').get(codeId) as
    | { id: string; status: string }
    | undefined;

  if (!row) {
    throw new ApiError(404, 'CODE_NOT_FOUND', 'El código de acceso no existe.');
  }

  const now = nowIso();
  prepare(`
    UPDATE paz_access_codes
    SET status = CASE WHEN status = 'generated' THEN 'sent' ELSE status END,
        sent_at = ?,
        sent_by = ?,
        updated_at = ?
    WHERE id = ?
  `).run(now, admin.id, now, codeId);

  return { success: true, codeId, sentAt: now };
}

/**
 * Lista códigos de acceso con filtros administrativos.
 */
export function listPazAccessCodes(filters: {
  status?: string;
  email?: string;
  limit?: number;
  offset?: number;
  includeTest?: boolean;
} = {}): PazAccessCodeView[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.status) {
    conditions.push('status = ?');
    params.push(filters.status);
  }
  if (filters.email) {
    conditions.push('email LIKE ?');
    params.push(`%${filters.email.trim()}%`);
  }
  if (!filters.includeTest) {
    conditions.push('is_test = 0');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = Math.min(Math.max(1, filters.limit || 50), 200);
  const offset = Math.max(0, filters.offset || 0);

  const rows = prepare(`
    SELECT * FROM paz_access_codes
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as Array<Record<string, unknown>>;

  return rows.map((r) => ({
    id: String(r.id),
    codePreview: String(r.code_preview),
    intentId: r.intent_id ? String(r.intent_id) : null,
    email: String(r.email),
    userId: r.user_id ? String(r.user_id) : null,
    programId: String(r.program_id),
    status: r.status as 'generated' | 'sent' | 'redeemed' | 'revoked',
    generatedBy: r.generated_by ? String(r.generated_by) : null,
    generatedAt: String(r.generated_at),
    sentAt: r.sent_at ? String(r.sent_at) : null,
    sentBy: r.sent_by ? String(r.sent_by) : null,
    expiresAt: r.expires_at ? String(r.expires_at) : null,
    redeemedAt: r.redeemed_at ? String(r.redeemed_at) : null,
    redeemedIp: r.redeemed_ip ? String(r.redeemed_ip) : null,
    revokedAt: r.revoked_at ? String(r.revoked_at) : null,
    revokedBy: r.revoked_by ? String(r.revoked_by) : null,
    revokeReason: r.revoke_reason ? String(r.revoke_reason) : null,
    attempts: Number(r.attempts || 0),
    isTest: Boolean(r.is_test),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  }));
}

/**
 * Regenera un código de acceso conservando el historial anterior (revoca el previo y emite uno nuevo).
 */
export function regeneratePazAccessCode(
  admin: AuthUser,
  previousCodeId: string
): GeneratePazCodeResult {
  const existing = prepare('SELECT * FROM paz_access_codes WHERE id = ?').get(previousCodeId) as
    | {
        id: string;
        email: string;
        intent_id: string | null;
        status: string;
        is_test: number;
      }
    | undefined;

  if (!existing) {
    throw new ApiError(404, 'CODE_NOT_FOUND', 'El código anterior no existe.');
  }
  if (existing.status === 'redeemed') {
    throw new ApiError(
      409,
      'CODE_ALREADY_REDEEMED',
      'No se puede regenerar un código que ya fue canjeado por el participante.'
    );
  }

  const now = nowIso();
  if (existing.status !== 'revoked') {
    prepare(`
      UPDATE paz_access_codes
      SET status = 'revoked',
          revoked_at = ?,
          revoked_by = ?,
          revoke_reason = 'Regenerado por administrador',
          updated_at = ?
      WHERE id = ?
    `).run(now, admin.id, now, existing.id);

    writeAudit({
      actor: admin,
      action: 'paz.code.revoked',
      entityType: 'paz_access_code',
      entityId: existing.id,
      after: { reason: 'Regenerado por administrador' },
    });
  }

  return generatePazAccessCode(admin, {
    email: existing.email,
    intentId: existing.intent_id,
    isTest: Boolean(existing.is_test),
  });
}
