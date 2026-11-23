import { NextRequest } from 'next/server';
import {
  ApiError,
  handleRouteError,
  jsonOk,
  readJsonBody,
  requireSession,
} from '@/server/http/api';
import {
  generatePazAccessCode,
  listPazAccessCodes,
} from '@/server/domain/pazAccessCodes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    requireSession(request, { permission: 'orders.read' });
    const status = request.nextUrl.searchParams.get('status') || undefined;
    const email = request.nextUrl.searchParams.get('email') || undefined;
    const includeTest = request.nextUrl.searchParams.get('includeTest') === '1';
    const codes = listPazAccessCodes({ status, email, includeTest });
    return jsonOk({ codes });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSession(request, { mutation: true, permission: 'orders.manage' });
    const body = await readJsonBody(request);
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!email) {
      throw new ApiError(400, 'EMAIL_REQUIRED', 'El correo electrónico es requerido.');
    }
    const intentId = typeof body.intentId === 'string' ? body.intentId : null;
    const isTest = Boolean(body.isTest);

    const result = generatePazAccessCode(session.user, {
      email,
      intentId,
      isTest,
    });

    return jsonOk({ result });
  } catch (error) {
    return handleRouteError(error);
  }
}
