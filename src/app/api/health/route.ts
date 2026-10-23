import { NextResponse } from 'next/server';
import { db, prepare } from '@/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  try {
    db();
    prepare('SELECT 1 AS ok').get();
    return NextResponse.json(
      {
        ok: true,
        service: 'wisdom-academy',
        database: 'ok',
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, service: 'wisdom-academy', database: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
