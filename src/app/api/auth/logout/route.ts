import { NextRequest, NextResponse } from 'next/server';
import {
  clearSessionCookie,
  loadSessionFromRequest,
  revokeSession,
} from '@/server/auth/sessions';
import { assertSameOrigin, handleRouteError } from '@/server/http/api';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const token = request.cookies.get('wa_session')?.value;
    const session = loadSessionFromRequest(request);
    if (session && token) {
      revokeSession(token);
      writeAudit({
        actor: session.user,
        action: 'auth.logout',
        entityType: 'session',
      });
    }
    const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
