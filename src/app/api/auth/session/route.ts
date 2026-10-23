import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/server/http/api';
import { loadSessionFromRequest } from '@/server/auth/sessions';
import { serializeCurrentUser } from '@/server/auth/serialize';
import { googleClientId, paypalConfig } from '@/server/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = loadSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        {
          ok: true,
          usuario: null,
          csrfToken: null,
          roles: [],
          permisos: [],
          googleClientId: googleClientId(),
          paypalConfigured: paypalConfig().configured,
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    return NextResponse.json(
      {
        ok: true,
        usuario: serializeCurrentUser(session.user),
        csrfToken: session.csrfToken,
        roles: session.user.roles,
        permisos: [...session.user.permissions],
        googleClientId: googleClientId(),
        paypalConfigured: paypalConfig().configured,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}


