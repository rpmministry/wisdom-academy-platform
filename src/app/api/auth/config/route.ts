import { NextResponse } from 'next/server';
import { emailConfig, googleClientId, paypalConfig } from '@/server/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      googleClientId: googleClientId(),
      paypalConfigured: paypalConfig().configured,
      paypalMode: paypalConfig().mode,
      emailConfigured: emailConfig().configured,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
