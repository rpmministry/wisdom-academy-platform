import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { previewManifestImport } from '@/server/domain/courseImport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    requireSession(request, { permission: 'resources.manage', mutation: true });
    const { id } = await context.params;
    const body = await readJsonBody<{ filename?: string; content?: string }>(request, 5 * 1024 * 1024);
    if (!body.filename?.trim() || typeof body.content !== 'string') {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Adjunta el manifiesto y su nombre de archivo.');
    }
    const preview = previewManifestImport(id, body.filename.trim().slice(0, 250), body.content);
    return NextResponse.json(
      {
        ok: true,
        formato: preview.format,
        resumen: preview.stats,
        filas: preview.rows,
        errores: preview.errors,
        advertencias: preview.warnings,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
