/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform
 * ARCHIVO: src/server/domain/pazAnalytics.ts
 *
 * PROPÓSITO:
 * Motor de analítica educativa y seguimiento de estudiantes para el taller
 * «Paz en la mesa, orden en el bolsillo y fuego en el corazón».
 *
 * CRITERIOS DE MEDICIÓN:
 * - Distingue entre tiempo activo real (interacciones) y tiempo inactivo/pestaña oculta.
 * - Registra sesiones de ingreso, duración efectiva y actividad por clase.
 * - Excluye cuentas de prueba (is_test = 1) de estadísticas comerciales y de ventas.
 * - Regla objetiva de finalización de clase: confirmación de avance o umbral de interacción.
 * ==============================================================================
 */

import { prepare, withTransaction } from '../db';
import { nowIso } from '../db/sqlite';
import type { AuthUser } from '../auth/authorization';
import { getProgramRowBySlug } from './coursePrograms';
import { PAZ_PROGRAM_SLUG } from '@/lib/paz-en-la-mesa/content';
import { enqueuePazSyncEvent } from './pazGoogleSync';

export interface PazHeartbeatInput {
  programSlug?: string;
  lessonId?: string;
  classNumber?: number;
  blockNumber?: number;
  activeSeconds: number;
  idleSeconds?: number;
  videoSeconds?: number;
  isVideoPlaying?: boolean;
  clientIp?: string;
  userAgent?: string;
}

export interface PazGeneralKpis {
  totalRegistrations: number;
  confirmedPayments: number;
  pendingBankTransfers: number;
  pendingRegistrations: number;
  totalEnrolled: number;
  gatewayEnrolled: number;
  transferEnrolled: number;
  adminEnrolled: number;
  activatedAccounts: number;
  neverLoggedIn: number;
  loggedInAtLeastOnce: number;
  recentlyActiveCount: number; // activo en las últimas 48h
  suspendedCount: number;
  totalCodesGenerated: number;
  pendingCodes: number;
  redeemedCodes: number;
  revokedCodes: number;
  totalActiveHours: number;
  averageActiveMinutesPerStudent: number;
  classMetrics: Array<{
    classNumber: number;
    title: string;
    studentCount: number;
    completedCount: number;
    averageMinutes: number;
    totalVideoPlays: number;
  }>;
}

export interface PazStudentDetailView {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  enrolledAt: string;
  plan: string;
  paymentMethod: string;
  paymentStatus: string;
  activationMethod: string;
  activatedAt: string | null;
  firstLoginAt: string | null;
  lastLoginAt: string | null;
  totalSessions: number;
  totalActiveMinutes: number;
  totalVideoMinutes: number;
  classesProgress: Array<{
    classNumber: number;
    activeMinutes: number;
    videoMinutes: number;
    completed: boolean;
    lastActiveAt: string | null;
  }>;
  overallProgressPercent: number;
  isTest: boolean;
}

/**
 * Registra un latido (heartbeat) periódico de actividad activa de un estudiante en el taller.
 */
export function recordPazHeartbeat(user: AuthUser, input: PazHeartbeatInput): {
  recorded: boolean;
  sessionId: string;
} {
  const programSlug = input.programSlug || PAZ_PROGRAM_SLUG;
  const program = getProgramRowBySlug(programSlug);
  if (!program) return { recorded: false, sessionId: '' };

  const now = nowIso();
  const activeSecs = Math.max(0, Math.min(120, Math.round(input.activeSeconds || 0)));
  const idleSecs = Math.max(0, Math.min(300, Math.round(input.idleSeconds || 0)));
  const videoSecs = Math.max(0, Math.min(120, Math.round(input.videoSeconds || 0)));

  // Determinar si el usuario es cuenta de prueba
  const testCheck = prepare(`
    SELECT is_test FROM paz_payment_intents WHERE user_id = ?
    UNION
    SELECT is_test FROM paz_access_codes WHERE user_id = ?
  `).get(user.id, user.id) as { is_test: number } | undefined;
  const isTest = testCheck?.is_test ? 1 : 0;

  return withTransaction(() => {
    // 1. Buscar o actualizar la sesión activa (menos de 30 minutos desde el último latido)
    const activeSession = prepare(`
      SELECT id, started_at, active_seconds, idle_seconds, video_seconds
      FROM paz_student_sessions
      WHERE user_id = ? AND program_id = ? AND status = 'active'
      ORDER BY started_at DESC
      LIMIT 1
    `).get(user.id, program.id) as
      | {
          id: string;
          started_at: string;
          active_seconds: number;
          idle_seconds: number;
          video_seconds: number;
        }
      | undefined;

    let sessionId: string;

    if (activeSession) {
      sessionId = activeSession.id;
      prepare(`
        UPDATE paz_student_sessions
        SET active_seconds = active_seconds + ?,
            idle_seconds = idle_seconds + ?,
            video_seconds = video_seconds + ?,
            last_heartbeat_at = ?,
            ended_at = ?,
            updated_at = ?
        WHERE id = ?
      `).run(activeSecs, idleSecs, videoSecs, now, now, now, sessionId);
    } else {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      prepare(`
        INSERT INTO paz_student_sessions (
          id, user_id, program_id, started_at, last_heartbeat_at, ended_at,
          active_seconds, idle_seconds, video_seconds, ip_address, user_agent,
          status, is_test, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
      `).run(
        sessionId,
        user.id,
        program.id,
        now,
        now,
        now,
        activeSecs,
        idleSecs,
        videoSecs,
        input.clientIp || null,
        input.userAgent || null,
        isTest,
        now,
        now
      );
    }

    // 2. Si el latido corresponde a una clase y lección específica, actualizar paz_lesson_activity
    if (input.lessonId && input.classNumber) {
      const lessonRow = prepare('SELECT module_id FROM course_lessons WHERE id = ?').get(input.lessonId) as
        | { module_id: string }
        | undefined;

      if (lessonRow) {
        const blockNum = input.blockNumber || 1;
        const playsIncrement = input.isVideoPlaying && videoSecs > 10 ? 1 : 0;

        prepare(`
          INSERT INTO paz_lesson_activity (
            id, user_id, program_id, module_id, lesson_id, class_number, block_number,
            active_seconds, video_seconds, play_count, completed, last_active_at,
            is_test, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
          ON CONFLICT(user_id, lesson_id) DO UPDATE SET
            active_seconds = active_seconds + excluded.active_seconds,
            video_seconds = video_seconds + excluded.video_seconds,
            play_count = play_count + excluded.play_count,
            last_active_at = excluded.last_active_at,
            updated_at = excluded.updated_at
        `).run(
          `act_${user.id}_${input.lessonId}`,
          user.id,
          program.id,
          lessonRow.module_id,
          input.lessonId,
          input.classNumber,
          blockNum,
          activeSecs,
          videoSecs,
          playsIncrement,
          now,
          isTest,
          now,
          now
        );
      }
    }

    return { recorded: true, sessionId };
  });
}

/**
 * Obtiene los KPIs consolidados del taller, excluyendo cuentas de prueba para análisis comercial.
 */
export function getPazGeneralKpis(options: { includeTest?: boolean } = {}): PazGeneralKpis {
  const program = getProgramRowBySlug(PAZ_PROGRAM_SLUG);
  const programId = program?.id || '';
  const testFilter = options.includeTest ? '' : 'AND (is_test = 0 OR is_test IS NULL)';

  // Inscritos por pasarela vs transferencia
  const totalIntents = prepare(`
    SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN method = 'payphone' AND status = 'approved' THEN 1 ELSE 0 END) AS gateway,
      SUM(CASE WHEN method = 'bank_transfer' AND status = 'approved' THEN 1 ELSE 0 END) AS transfer,
      SUM(CASE WHEN method = 'bank_transfer' AND status = 'pending' THEN 1 ELSE 0 END) AS pending_transfer,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS total_pending,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS total_approved
    FROM paz_payment_intents
    WHERE 1=1 ${testFilter}
  `).get() as {
    total: number;
    gateway: number;
    transfer: number;
    pending_transfer: number;
    total_pending: number;
    total_approved: number;
  };

  // Total de alumnos con derecho vigente
  const entitlementsRow = prepare(`
    SELECT
      COUNT(DISTINCT e.user_id) AS total_entitled,
      SUM(CASE WHEN e.origin = 'manual_owner' THEN 1 ELSE 0 END) AS admin_grant
    FROM entitlements e
    WHERE e.resource_id = ? AND e.status = 'active'
  `).get(program?.resource_id || '') as { total_entitled: number; admin_grant: number };

  // Códigos de acceso
  const codesRow = prepare(`
    SELECT
      COUNT(*) AS total_codes,
      SUM(CASE WHEN status = 'generated' OR status = 'sent' THEN 1 ELSE 0 END) AS pending_codes,
      SUM(CASE WHEN status = 'redeemed' THEN 1 ELSE 0 END) AS redeemed_codes,
      SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) AS revoked_codes
    FROM paz_access_codes
    WHERE 1=1 ${testFilter}
  `).get() as { total_codes: number; pending_codes: number; redeemed_codes: number; revoked_codes: number };

  // Sesiones de actividad y tiempo acumulado
  const sessionsAgg = prepare(`
    SELECT
      COUNT(DISTINCT user_id) AS users_with_sessions,
      SUM(active_seconds) AS total_active_seconds
    FROM paz_student_sessions
    WHERE program_id = ? ${testFilter}
  `).get(programId) as { users_with_sessions: number; total_active_seconds: number };

  // Activos en últimas 48 horas
  const recentCutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  const recentActiveRow = prepare(`
    SELECT COUNT(DISTINCT user_id) AS recent_count
    FROM paz_student_sessions
    WHERE program_id = ? AND last_heartbeat_at >= ? ${testFilter}
  `).get(programId, recentCutoff) as { recent_count: number };

  // Métricas por clase (1 a 4)
  const classNames = [
    'Clase 01: La Mesa — Limpiar el plato',
    'Clase 02: El Bolsillo — Orden y presupuesto',
    'Clase 03: El Corazón — Oír a Dios',
    'Clase 04: El Altar — Fuego en el hogar',
  ];

  const classMetrics = [1, 2, 3, 4].map((num) => {
    const agg = prepare(`
      SELECT
        COUNT(DISTINCT user_id) AS student_count,
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) AS completed_count,
        SUM(active_seconds) AS total_seconds,
        SUM(play_count) AS total_plays
      FROM paz_lesson_activity
      WHERE program_id = ? AND class_number = ? ${testFilter}
    `).get(programId, num) as {
      student_count: number;
      completed_count: number;
      total_seconds: number;
      total_plays: number;
    };

    const students = Number(agg?.student_count || 0);
    const totalSecs = Number(agg?.total_seconds || 0);
    const avgMins = students > 0 ? Math.round(totalSecs / students / 60) : 0;

    return {
      classNumber: num,
      title: classNames[num - 1],
      studentCount: students,
      completedCount: Number(agg?.completed_count || 0),
      averageMinutes: avgMins,
      totalVideoPlays: Number(agg?.total_plays || 0),
    };
  });

  const totalEnrolled = Number(entitlementsRow?.total_entitled || 0);
  const loggedInAtLeastOnce = Number(sessionsAgg?.users_with_sessions || 0);
  const neverLoggedIn = Math.max(0, totalEnrolled - loggedInAtLeastOnce);
  const totalActiveSeconds = Number(sessionsAgg?.total_active_seconds || 0);
  const totalActiveHours = Math.round((totalActiveSeconds / 3600) * 10) / 10;
  const avgMinsPerStudent =
    loggedInAtLeastOnce > 0 ? Math.round((totalActiveSeconds / loggedInAtLeastOnce / 60)) : 0;

  return {
    totalRegistrations: Number(totalIntents?.total || 0),
    confirmedPayments: Number(totalIntents?.total_approved || 0),
    pendingBankTransfers: Number(totalIntents?.pending_transfer || 0),
    pendingRegistrations: Number(totalIntents?.total_pending || 0),
    totalEnrolled,
    gatewayEnrolled: Number(totalIntents?.gateway || 0),
    transferEnrolled: Number(totalIntents?.transfer || 0),
    adminEnrolled: Number(entitlementsRow?.admin_grant || 0),
    activatedAccounts: totalEnrolled,
    neverLoggedIn,
    loggedInAtLeastOnce,
    recentlyActiveCount: Number(recentActiveRow?.recent_count || 0),
    suspendedCount: 0,
    totalCodesGenerated: Number(codesRow?.total_codes || 0),
    pendingCodes: Number(codesRow?.pending_codes || 0),
    redeemedCodes: Number(codesRow?.redeemed_codes || 0),
    revokedCodes: Number(codesRow?.revoked_codes || 0),
    totalActiveHours,
    averageActiveMinutesPerStudent: avgMinsPerStudent,
    classMetrics,
  };
}

/**
 * Consulta el perfil completo de un estudiante del taller para soporte y seguimiento.
 */
export function getPazStudentDetail(userId: string): PazStudentDetailView | null {
  const program = getProgramRowBySlug(PAZ_PROGRAM_SLUG);
  if (!program) return null;

  const user = prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | { id: string; display_name: string; email: string; created_at: string }
    | undefined;

  if (!user) return null;

  const intent = prepare('SELECT * FROM paz_payment_intents WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as
    | Record<string, unknown>
    | undefined;

  const code = prepare('SELECT * FROM paz_access_codes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as
    | Record<string, unknown>
    | undefined;

  const sessionsRow = prepare(`
    SELECT
      COUNT(*) AS total_sessions,
      MIN(started_at) AS first_login,
      MAX(last_heartbeat_at) AS last_login,
      SUM(active_seconds) AS total_active_sec,
      SUM(video_seconds) AS total_video_sec
    FROM paz_student_sessions
    WHERE user_id = ? AND program_id = ?
  `).get(userId, program.id) as {
    total_sessions: number;
    first_login: string | null;
    last_login: string | null;
    total_active_sec: number;
    total_video_sec: number;
  };

  const classesProgress = [1, 2, 3, 4].map((num) => {
    const act = prepare(`
      SELECT
        SUM(active_seconds) AS active_sec,
        SUM(video_seconds) AS video_sec,
        MAX(completed) AS is_completed,
        MAX(last_active_at) AS last_active
      FROM paz_lesson_activity
      WHERE user_id = ? AND program_id = ? AND class_number = ?
    `).get(userId, program.id, num) as {
      active_sec: number;
      video_sec: number;
      is_completed: number;
      last_active: string | null;
    };

    return {
      classNumber: num,
      activeMinutes: Math.round((Number(act?.active_sec || 0) / 60) * 10) / 10,
      videoMinutes: Math.round((Number(act?.video_sec || 0) / 60) * 10) / 10,
      completed: Boolean(act?.is_completed),
      lastActiveAt: act?.last_active || null,
    };
  });

  const completedClasses = classesProgress.filter((c) => c.completed).length;
  const overallPercent = Math.round((completedClasses / 4) * 100);

  return {
    userId: user.id,
    fullName: user.display_name,
    email: user.email,
    phone: intent?.buyer_phone ? String(intent.buyer_phone) : null,
    enrolledAt: intent?.created_at ? String(intent.created_at) : user.created_at,
    plan: intent?.plan ? String(intent.plan) : 'taller_oficial',
    paymentMethod: intent?.method ? String(intent.method) : (code ? 'bank_transfer' : 'admin_grant'),
    paymentStatus: intent?.status ? String(intent.status) : 'approved',
    activationMethod: code ? 'access_code_25' : (intent ? 'gateway_automatic' : 'admin_authorization'),
    activatedAt: code?.redeemed_at ? String(code.redeemed_at) : (intent?.reviewed_at ? String(intent.reviewed_at) : user.created_at),
    firstLoginAt: sessionsRow?.first_login || null,
    lastLoginAt: sessionsRow?.last_login || null,
    totalSessions: Number(sessionsRow?.total_sessions || 0),
    totalActiveMinutes: Math.round((Number(sessionsRow?.total_active_sec || 0) / 60) * 10) / 10,
    totalVideoMinutes: Math.round((Number(sessionsRow?.total_video_sec || 0) / 60) * 10) / 10,
    classesProgress,
    overallProgressPercent: overallPercent,
    isTest: Boolean(intent?.is_test || code?.is_test),
  };
}
