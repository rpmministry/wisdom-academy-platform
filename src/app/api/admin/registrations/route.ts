import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError, requireSession } from '@/server/http/api';
import { hasPermission } from '@/server/auth/authorization';
import { listCheckoutRegistrations } from '@/server/domain/checkoutRegistration';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Los expedientes incluyen datos personales y, en su caso, de menores.
    // Se exige users.read además del acceso al CRM.
    const { user } = requireSession(request, { permission: 'users.read' });
    const params = request.nextUrl.searchParams;
    const registros = listCheckoutRegistrations({
      q: params.get('q'),
      status: params.get('status'),
      from: params.get('from'),
      to: params.get('to'),
      includeMinors: hasPermission(user, 'minors.read'),
      limit: params.get('limit') ? Number(params.get('limit')) : null,
    });
    return NextResponse.json(
      { ok: true, registros },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
