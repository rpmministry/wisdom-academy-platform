import { NextRequest } from 'next/server';
import {
  handleRouteError,
  jsonOk,
  requireSession,
} from '@/server/http/api';
import { prepare } from '@/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'orders.read' });
    const rows = prepare(`
      SELECT
        a.id,
        a.actor_user_id,
        u.email AS actor_email,
        a.action,
        a.entity_type,
        a.entity_id,
        a.before_json,
        a.after_json,
        a.created_at
      FROM audit_log a
      LEFT JOIN users u ON u.id = a.actor_user_id
      WHERE a.action LIKE 'paz.%' OR a.entity_type LIKE 'paz_%'
      ORDER BY a.created_at DESC
      LIMIT 150
    `).all();
    return jsonOk({ logs: rows });
  } catch (error) {
    return handleRouteError(error);
  }
}
