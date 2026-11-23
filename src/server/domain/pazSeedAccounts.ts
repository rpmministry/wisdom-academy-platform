/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform
 * ARCHIVO: src/server/domain/pazSeedAccounts.ts
 *
 * PROPÓSITO:
 * Aprovisionamiento determinista y seguro de los 3 accesos de prueba para
 * experimentar personalmente el taller «Paz en la mesa» en 3 escenarios reales:
 *
 * 1. Acceso Pasarela: Compra simulada por pasarela (PayPhone) con cobro aprobado.
 * 2. Acceso Transferencia: Registro con transferencia bancaria, aprobada por admin
 *    y activada mediante código único seguro de 25 caracteres.
 * 3. Acceso Autorización Administrativa: Concesión directa por administrador
 *    sin pago ni pasarela intermedia.
 *
 * CONDICIONES:
 * - Claramente marcadas como cuentas de prueba (is_test = 1).
 * - Excluidas de estadísticas comerciales y de ventas.
 * - Credenciales seguras para pruebas del usuario.
 * ==============================================================================
 */

import crypto from 'node:crypto';
import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import { getProgramRowBySlug } from './coursePrograms';
import { grantEntitlement } from './access';
import type { AuthUser } from '../auth/authorization';
import { PAZ_PROGRAM_SLUG, PAZ_PRICING } from '@/lib/paz-en-la-mesa/content';
import { generatePazAccessCode, redeemPazAccessCode } from './pazAccessCodes';
import { hashPasswordSync } from '../auth/passwords';

export interface PazTestAccountInfo {
  scenario: 'gateway' | 'bank_transfer' | 'admin_grant';
  scenarioTitle: string;
  email: string;
  passwordPlainText: string;
  displayName: string;
  userId: string;
  accessCode25?: string;
  details: string;
}

export const PAZ_TEST_CREDENTIALS = {
  sharedPassword: 'PazTest2026!AccesoSeguro',
  account1Email: 'paz.estudiante.pasarela@wisdomacademy.test',
  account2Email: 'paz.estudiante.transferencia@wisdomacademy.test',
  account3Email: 'paz.estudiante.admin@wisdomacademy.test',
};

/**
 * Asegura la existencia de las 3 cuentas de prueba y sus derechos de acceso al taller.
 */
export function ensurePazTestAccounts(): PazTestAccountInfo[] {
  const program = getProgramRowBySlug(PAZ_PROGRAM_SLUG);
  if (!program) {
    throw new Error('El programa Paz en la mesa debe estar creado antes de aprovisionar cuentas de prueba.');
  }

  const now = nowIso();
  const passwordHash = hashPasswordSync(PAZ_TEST_CREDENTIALS.sharedPassword);
  const results: PazTestAccountInfo[] = [];

  // Helper para buscar o crear usuario
  const upsertUser = (email: string, displayName: string, idPrefix: string): string => {
    const existing = prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
    if (existing) {
      prepare(`
        UPDATE users
        SET display_name = ?, password_hash = ?, status = 'active', email_verified = 1, updated_at = ?
        WHERE id = ?
      `).run(displayName, passwordHash, now, existing.id);
      return existing.id;
    }
    const newId = `${idPrefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const username = email.split('@')[0];
    prepare(`
      INSERT INTO users (id, email, username, display_name, password_hash, status, email_verified, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', 1, ?, ?)
    `).run(newId, email, username, displayName, passwordHash, now, now);

    prepare(`
      INSERT OR IGNORE INTO user_roles (id, user_id, role_code, granted_by, granted_at)
      VALUES (?, ?, 'student', 'paz_seed_accounts', ?)
    `).run(`ur_${newId}_student`, newId, now);

    return newId;
  };

  // Helper para obtener admin del sistema
  const getAdminUser = (): AuthUser => {
    let admin = prepare(`
      SELECT u.* FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.role_code IN ('platform_owner', 'principal_admin', 'owner')
      LIMIT 1
    `).get() as { id: string; email: string; display_name: string } | undefined;

    if (!admin) {
      admin = prepare('SELECT * FROM users WHERE status = "active" LIMIT 1').get() as
        | { id: string; email: string; display_name: string }
        | undefined;
    }

    if (!admin) {
      const adminId = 'usr_admin_system';
      prepare(`
        INSERT INTO users (id, email, username, display_name, status, email_verified, created_at, updated_at)
        VALUES (?, 'admin@wisdomacademy.alsiztech.com', 'admin', 'Administrador del Sistema', 'active', 1, ?, ?)
      `).run(adminId, now, now);
      prepare(`
        INSERT OR IGNORE INTO user_roles (id, user_id, role_code, granted_by, granted_at)
        VALUES ('ur_admin_sys', ?, 'principal_admin', 'system', ?)
      `).run(adminId, now);
      admin = {
        id: adminId,
        email: 'admin@wisdomacademy.alsiztech.com',
        display_name: 'Administrador del Sistema',
      };
    }

    return {
      id: admin.id,
      email: admin.email,
      displayName: admin.display_name || 'Administrador del Sistema',
      username: (admin.email || 'admin').split('@')[0],
      primaryRole: 'principal_admin',
      roles: ['principal_admin'],
      permissions: new Set(['paz.codes.manage', 'paz.analytics.view']),
      emailVerified: true,
      status: 'active',
      isMinor: false,
      mustChangePassword: false,
      hasGlobalContentAccess: true,
      isOwner: true,
      avatarUrl: null,
    };
  };

  // --------------------------------------------------------------------------
  // ESCENARIO 1: Pago mediante pasarela (PayPhone / Tarjeta de crédito)
  // --------------------------------------------------------------------------
  const user1Id = upsertUser(
    PAZ_TEST_CREDENTIALS.account1Email,
    'Estudiante Prueba Pasarela',
    'usr_test_gateway'
  );

  grantEntitlement({
    userId: user1Id,
    resourceId: program.resource_id,
    origin: 'purchase',
    originRef: `test_gateway_order_${user1Id}`,
  });

  // Intent de pago aprobado
  prepare(`
    INSERT INTO paz_payment_intents (
      id, reference, user_id, plan, method, amount_cents, currency, status,
      buyer_name, buyer_email, buyer_phone, note, is_test, created_at, updated_at
    ) VALUES (?, ?, ?, 'presale', 'payphone', ?, 'USD', 'approved',
      'Estudiante Prueba Pasarela', ?, '+593998755759',
      'Pago simulado en entorno de pruebas de pasarela (is_test=1)', 1, ?, ?)
    ON CONFLICT(reference) DO UPDATE SET
      status = 'approved', is_test = 1, updated_at = excluded.updated_at
  `).run(
    `pazpay_test_gw_${user1Id}`,
    `PAZ-TEST-GW-${user1Id.slice(-6).toUpperCase()}`,
    user1Id,
    PAZ_PRICING.presaleCents,
    PAZ_TEST_CREDENTIALS.account1Email,
    now,
    now
  );

  results.push({
    scenario: 'gateway',
    scenarioTitle: 'Acceso de Prueba 1 · Pago mediante pasarela integrada',
    email: PAZ_TEST_CREDENTIALS.account1Email,
    passwordPlainText: PAZ_TEST_CREDENTIALS.sharedPassword,
    displayName: 'Estudiante Prueba Pasarela',
    userId: user1Id,
    details: 'Simula una compra inmediata aprobada por pasarela con derecho activo automático.',
  });

  // --------------------------------------------------------------------------
  // ESCENARIO 2: Transferencia bancaria + Código de 25 caracteres
  // --------------------------------------------------------------------------
  const adminActor = getAdminUser();
  const user2Id = upsertUser(
    PAZ_TEST_CREDENTIALS.account2Email,
    'Estudiante Prueba Transferencia',
    'usr_test_transfer'
  );

  const intent2Id = `pazpay_test_tr_${user2Id}`;
  prepare(`
    INSERT INTO paz_payment_intents (
      id, reference, user_id, plan, method, amount_cents, currency, status,
      buyer_name, buyer_email, buyer_phone, transfer_reference, note, is_test, created_at, updated_at
    ) VALUES (?, ?, ?, 'official', 'bank_transfer', ?, 'USD', 'approved',
      'Estudiante Prueba Transferencia', ?, '+593998755759', 'TRANSF-BANCO-PICHINCHA-98234',
      'Transferencia manual verificada en prueba. Generación de código de 25 caracteres.', 1, ?, ?)
    ON CONFLICT(reference) DO UPDATE SET
      status = 'approved', is_test = 1, updated_at = excluded.updated_at
  `).run(
    intent2Id,
    `PAZ-TEST-TR-${user2Id.slice(-6).toUpperCase()}`,
    user2Id,
    PAZ_PRICING.officialCents,
    PAZ_TEST_CREDENTIALS.account2Email,
    now,
    now
  );

  // Generamos y redimimos el código de 25 caracteres
  const codeResult = generatePazAccessCode(
    adminActor,
    {
      email: PAZ_TEST_CREDENTIALS.account2Email,
      intentId: intent2Id,
      isTest: true,
    }
  );

  // Canjeamos el código para activar la cuenta
  redeemPazAccessCode({
    rawCode: codeResult.rawCode,
    email: PAZ_TEST_CREDENTIALS.account2Email,
    fullName: 'Estudiante Prueba Transferencia',
    clientIp: '127.0.0.1',
    userAgent: 'Wisdom-Test-Agent/2.0',
  });

  results.push({
    scenario: 'bank_transfer',
    scenarioTitle: 'Acceso de Prueba 2 · Transferencia bancaria verificada con código único de 25 caracteres',
    email: PAZ_TEST_CREDENTIALS.account2Email,
    passwordPlainText: PAZ_TEST_CREDENTIALS.sharedPassword,
    displayName: 'Estudiante Prueba Transferencia',
    userId: user2Id,
    accessCode25: codeResult.rawCode,
    details: 'Simula el flujo completo de transferencia verificada y activación con código criptográfico.',
  });

  // --------------------------------------------------------------------------
  // ESCENARIO 3: Autorización administrativa directa
  // --------------------------------------------------------------------------
  const user3Id = upsertUser(
    PAZ_TEST_CREDENTIALS.account3Email,
    'Estudiante Prueba Autorización Directa',
    'usr_test_admin'
  );

  grantEntitlement({
    userId: user3Id,
    resourceId: program.resource_id,
    origin: 'manual_owner',
    originRef: `admin_direct_grant_${adminActor.id}_${now}`,
  });

  results.push({
    scenario: 'admin_grant',
    scenarioTitle: 'Acceso de Prueba 3 · Autorización administrativa directa',
    email: PAZ_TEST_CREDENTIALS.account3Email,
    passwordPlainText: PAZ_TEST_CREDENTIALS.sharedPassword,
    displayName: 'Estudiante Prueba Autorización Directa',
    userId: user3Id,
    details: 'Simula un alumno becado o autorizado directamente por el administrador sin pago ficticio.',
  });

  return results;
}
