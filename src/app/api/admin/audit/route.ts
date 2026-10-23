import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, requireSession } from '@/server/http/api';
import { prepare } from '@/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseSafe(json: string | null): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'audit.read' });
    const params = request.nextUrl.searchParams;
    const filters: string[] = [];
    const values: Array<string | number> = [];
    if (params.get('action')) {
      filters.push('action LIKE ?');
      values.push(`%${params.get('action')}%`);
    }
    if (params.get('entityType')) {
      filters.push('entity_type = ?');
      values.push(params.get('entityType') as string);
    }
    if (params.get('entityId')) {
      filters.push('entity_id = ?');
      values.push(params.get('entityId') as string);
    }
    const limit = Math.min(Math.max(Number(params.get('limit')) || 100, 1), 300);
    const rows = prepare(`
      SELECT a.*, u.email AS actor_email FROM audit_log a
      LEFT JOIN users u ON u.id = a.actor_user_id
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY a.created_at DESC LIMIT ?
    `).all(...values, limit) as Array<Record<string, unknown>>;

    return NextResponse.json(
      {
        ok: true,
        eventos: rows.map((row) => ({
          id: row.id,
          actorUserId: row.actor_user_id,
          actorEmail: row.actor_email,
          actorRole: row.actor_role,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          before: parseSafe(row.before_json as string | null),
          after: parseSafe(row.after_json as string | null),
          createdAt: row.created_at,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
