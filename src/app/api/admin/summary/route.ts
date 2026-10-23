import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, requireSession } from '@/server/http/api';
import { prepare } from '@/server/db';
import { nowIso } from '@/server/db/sqlite';
import { addDays } from '@/server/domain/access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'admin.access' });
    const now = nowIso();
    const inSevenDays = addDays(now, 7);

    const count = (sql: string, ...params: Array<string | number>) => {
      const row = prepare(sql).get(...params) as { total: number } | undefined;
      return Number(row?.total ?? 0);
    };

    const users = count("SELECT COUNT(*) AS total FROM users WHERE status = 'active'");
    const students = count(`
      SELECT COUNT(DISTINCT sp.user_id) AS total
      FROM student_profiles sp JOIN users u ON u.id = sp.user_id
      WHERE u.status = 'active'
    `);
    const entitlementsActive = count(`
      SELECT COUNT(*) AS total FROM entitlements
      WHERE status = 'active' AND starts_at <= ? AND (ends_at IS NULL OR ends_at > ?)
    `, now, now);
    const expiring = count(`
      SELECT COUNT(*) AS total FROM entitlements
      WHERE status = 'active' AND ends_at IS NOT NULL AND ends_at > ? AND ends_at <= ?
    `, now, inSevenDays);
    const ordersPaid = count("SELECT COUNT(*) AS total FROM orders WHERE status IN ('paid','free')");
    const ordersPending = count("SELECT COUNT(*) AS total FROM orders WHERE status = 'pending'");
    const ordersFailed = count("SELECT COUNT(*) AS total FROM orders WHERE status = 'failed'");
    const revenue = prepare(`
      SELECT COALESCE(SUM(total_cents),0) AS total FROM orders
      WHERE status IN ('paid','free')
    `).get() as { total: number };
    const refunds = prepare(`
      SELECT COALESCE(SUM(amount_cents),0) AS total FROM transactions
      WHERE kind IN ('refund','reversal') AND status = 'completed'
    `).get() as { total: number };

    const activeDiscounts = count("SELECT COUNT(*) AS total FROM discounts WHERE status = 'active'");
    const activeGiftCodes = count(`
      SELECT COUNT(*) AS total FROM gift_codes
      WHERE status = 'active' AND (redeem_by IS NULL OR redeem_by > ?)
    `, now);
    const activeInvitations = count(`
      SELECT COUNT(*) AS total FROM invitations
      WHERE status = 'active' AND (expires_at IS NULL OR expires_at > ?)
    `, now);
    const webhookErrors = count("SELECT COUNT(*) AS total FROM webhook_events WHERE status = 'error'");
    const pendingGiftRedemptions = count(`
      SELECT COUNT(*) AS total FROM gift_redemptions
      WHERE status = 'paused'
    `);
    const academicPlans = count('SELECT COUNT(*) AS total FROM academic_plans');
    const academicSubjects = count('SELECT COUNT(*) AS total FROM academic_plan_subjects');
    const academicStudents = count(
      'SELECT COUNT(DISTINCT user_id) AS total FROM academic_plans'
    );
    const academicYear = prepare(
      "SELECT start_date, end_date FROM academic_years WHERE regime = 'SIERRA_AMAZONIA' ORDER BY start_date DESC LIMIT 1"
    ).get() as { start_date: string; end_date: string } | undefined;

    return NextResponse.json(
      {
        ok: true,
        resumen: {
          usuariosActivos: users,
          estudiantesActivos: students,
          derechosActivos: entitlementsActive,
          derechosPorVencer7Dias: expiring,
          ordenesPagadas: ordersPaid,
          ordenesPendientes: ordersPending,
          ordenesFallidas: ordersFailed,
          ingresosCentavos: Number(revenue.total),
          reembolsosCentavos: Number(refunds.total),
          descuentosActivos: activeDiscounts,
          codigosRegaloActivos: activeGiftCodes,
          invitacionesActivas: activeInvitations,
          erroresWebhook: webhookErrors,
          derechosPausadosPorRegalo: pendingGiftRedemptions,
          planesAcademicos: academicPlans,
          clasesGeneradas: academicSubjects,
          estudiantesConPlan: academicStudents,
          calendarioInicio: academicYear?.start_date || null,
          calendarioFin: academicYear?.end_date || null,
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
