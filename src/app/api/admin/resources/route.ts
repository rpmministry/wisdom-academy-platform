import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, requireSession } from '@/server/http/api';
import { prepare } from '@/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'resources.read' });
    const params = request.nextUrl.searchParams;
    const filters: string[] = [];
    const values: string[] = [];
    if (params.get('type')) {
      filters.push('type = ?');
      values.push(params.get('type') as string);
    }
    if (params.get('status')) {
      filters.push('status = ?');
      values.push(params.get('status') as string);
    }
    if (params.get('q')) {
      filters.push('(title LIKE ? OR slug LIKE ?)');
      values.push(`%${params.get('q')}%`, `%${params.get('q')}%`);
    }
    const rows = prepare(`
      SELECT * FROM resources
      ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
      ORDER BY type, title LIMIT 500
    `).all(...values) as Array<Record<string, unknown>>;

    return NextResponse.json(
      {
        ok: true,
        recursos: rows.map((row) => {
          let metadata: Record<string, unknown> = {};
          try {
            metadata = JSON.parse(String(row.metadata_json)) as Record<string, unknown>;
          } catch {
            metadata = {};
          }
          return {
            id: row.id,
            slug: row.slug,
            type: row.type,
            title: row.title,
            description: row.description,
            status: row.status,
            metadata,
          };
        }),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
