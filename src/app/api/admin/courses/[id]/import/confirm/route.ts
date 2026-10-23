import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { confirmManifestImport } from '@/server/domain/courseImport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { id } = await context.params;
    const body = await readJsonBody<{ filename?: string; content?: string; confirm?: boolean }>(
      request,
      5 * 1024 * 1024
    );
    if (body.confirm !== true) {
      throw new ApiError(400, 'CONFIRMATION_REQUIRED', 'Confirma explícitamente la importación.');
    }
    if (!body.filename?.trim() || typeof body.content !== 'string') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Adjunta el manifiesto y su nombre de archivo.');
    }
    const result = confirmManifestImport(id, body.filename.trim().slice(0, 250), body.content, user);
    return NextResponse.json({ ok: true, resultado: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
