import { NextRequest, NextResponse } from 'next/server';
import { handleRouteError } from '@/server/http/api';
import { handlePayPalWebhook } from '@/server/domain/checkout';
import { checkRateLimit } from '@/server/http/rateLimit';
import { getClientIp } from '@/server/http/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit('paypal-webhook', getClientIp(request), 240, 60);
    if (!limit.allowed) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
    const raw = await request.text();
    if (raw.length > 256 * 1024) {
      return NextResponse.json({ ok: false, error: 'payload_too_large' }, { status: 413 });
    }
    const result = await handlePayPalWebhook(request.headers, raw);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') {
      return handleRouteError(error);
    }
    return handleRouteError(error);
  }
}
