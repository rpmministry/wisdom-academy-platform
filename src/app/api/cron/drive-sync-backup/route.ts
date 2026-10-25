import { NextRequest, NextResponse } from 'next/server';
import { prepare } from '@/server/db';
import { nowIso } from '@/server/db/sqlite';
import { getWisdomDriveVault, isVaultConfigured, VAULT_FOLDERS } from '@/lib/drive/wisdomDriveVault';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function verifyCronAuth(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  // Si no se ha configurado CRON_SECRET, en desarrollo se permite para pruebas
  if (!cronSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const vercelCronHeader = request.headers.get('x-vercel-cron');
  if (vercelCronHeader && authHeader === `Bearer ${cronSecret}`) return true;

  // Parámetro de consulta de respaldo (solo si coincide con el secreto)
  const querySecret = request.nextUrl.searchParams.get('key');
  if (querySecret && querySecret === cronSecret) return true;

  return false;
}

export async function GET(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json({ error: 'No autorizado. Provee el CRON_SECRET válido.' }, { status: 401 });
  }

  const timestamp = nowIso();
  const dateStr = timestamp.split('T')[0];
  const summary: Record<string, unknown> = {
    startedAt: timestamp,
    vaultConfigured: isVaultConfigured(),
    actions: {},
  };

  try {
    // 1. Recopilar métricas estadísticas diarias
    const totalUsers = Number((prepare('SELECT COUNT(*) AS total FROM users').get() as { total: number })?.total || 0);
    const activeEnrollments = Number((prepare("SELECT COUNT(*) AS total FROM course_enrollments WHERE status = 'active'").get() as { total: number })?.total || 0);
    const completedLessons = Number((prepare("SELECT COUNT(*) AS total FROM course_progress WHERE status = 'completed'").get() as { total: number })?.total || 0);
    const totalOrders = Number((prepare('SELECT COUNT(*) AS total FROM orders').get() as { total: number })?.total || 0);
    const revenueCents = Number((prepare("SELECT COALESCE(SUM(total_cents), 0) AS total FROM orders WHERE status = 'completed'").get() as { total: number })?.total || 0);

    const statsPayload = {
      date: dateStr,
      generatedAt: timestamp,
      metrics: {
        totalUsers,
        activeEnrollments,
        completedLessons,
        totalOrders,
        revenueCents,
        revenueUsd: (revenueCents / 100).toFixed(2),
      },
    };

    const csvContent = [
      'date,total_users,active_enrollments,completed_lessons,total_orders,revenue_usd',
      `${dateStr},${totalUsers},${activeEnrollments},${completedLessons},${totalOrders},${(revenueCents / 100).toFixed(2)}`,
    ].join('\n');

    summary.metrics = statsPayload.metrics;

    // 2. Si Google Drive Vault está activo, exportar a las carpetas maestras
    if (isVaultConfigured()) {
      const vault = getWisdomDriveVault()!;
      await vault.ensureVaultStructure();

      // A. Exportar Estadísticas Diarias (/05_Estadisticas_y_Reportes/)
      const jsonStatsFile = await vault.uploadStatisticsReport(
        'diarias',
        dateStr.substring(0, 7), // YYYY-MM
        `metricas-${dateStr}.json`,
        JSON.stringify(statsPayload, null, 2),
        'application/json'
      );

      const csvStatsFile = await vault.uploadStatisticsReport(
        'diarias',
        dateStr.substring(0, 7),
        `metricas-${dateStr}.csv`,
        csvContent,
        'text/csv'
      );

      summary.actions = {
        ...summary.actions as any,
        statsBackup: {
          jsonFileId: jsonStatsFile.id,
          csvFileId: csvStatsFile.id,
        },
      };

      // B. Exportar Matrículas Nuevas (/01_Matriculas_y_Admisiones/)
      const recentEnrollments = prepare(`
        SELECT ce.id, u.email, u.display_name, cp.title as program_title, ce.enrolled_at, ce.status
        FROM course_enrollments ce
        JOIN users u ON u.id = ce.user_id
        JOIN course_programs cp ON cp.id = ce.program_id
        ORDER BY ce.enrolled_at DESC
        LIMIT 100
      `).all();

      const enrollmentsFile = await vault.uploadFile({
        folderPath: `${VAULT_FOLDERS.ADMISSIONS}/${dateStr.substring(0, 7)}`,
        fileName: `matriculas-resumen-${dateStr}.json`,
        content: JSON.stringify({ date: dateStr, count: recentEnrollments.length, enrollments: recentEnrollments }, null, 2),
        mimeType: 'application/json',
        description: `Resumen de matrículas activas al ${dateStr}`,
      });

      // C. Exportar Respaldo Completo de Base de Datos (/06_Database_Backups/)
      const usersData = prepare('SELECT id, email, display_name, status, is_minor, created_at FROM users').all();
      const ordersData = prepare('SELECT id, user_id, status, total_cents, currency, created_at FROM orders').all();
      const entitlementsData = prepare('SELECT id, user_id, resource_id, active, granted_at FROM entitlements').all();
      const progressData = prepare('SELECT id, user_id, program_id, lesson_id, status, completed_at FROM course_progress').all();
      const attemptsData = prepare('SELECT id, user_id, assessment_id, attempt_number, percentage, pass_status, submitted_at FROM assessment_attempts').all();

      const fullBackupPayload = {
        createdAt: timestamp,
        schemaVersion: 9,
        counts: {
          users: usersData.length,
          orders: ordersData.length,
          entitlements: entitlementsData.length,
          progress: progressData.length,
          attempts: attemptsData.length,
        },
        data: {
          users: usersData,
          orders: ordersData,
          entitlements: entitlementsData,
          progress: progressData,
          attempts: attemptsData,
        },
      };

      const backupFile = await vault.uploadDatabaseBackup(
        `wisdom-full-backup-${timestamp.replace(/[:.]/g, '-')}.json`,
        JSON.stringify(fullBackupPayload, null, 2),
        'application/json'
      );

      summary.actions = {
        ...summary.actions as any,
        enrollmentsBackup: { fileId: enrollmentsFile.id },
        databaseBackup: {
          fileId: backupFile.id,
          fileName: backupFile.name,
          webViewLink: backupFile.webViewLink,
        },
      };
    }

    summary.completedAt = nowIso();
    summary.status = 'SUCCESS';

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('[CRON /api/cron/drive-sync-backup] Error en ejecución:', error);
    return NextResponse.json(
      {
        status: 'ERROR',
        message: error.message || String(error),
        summary,
      },
      { status: 500 }
    );
  }
}

