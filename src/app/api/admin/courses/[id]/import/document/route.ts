import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { importDocument } from '@/server/domain/courseImport';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { id } = await context.params;
    const body = await readJsonBody<{
      filename?: string;
      base64?: string;
      mimeType?: string;
      visibility?: 'student' | 'staff';
    }>(request, 20 * 1024 * 1024);
    if (!body.filename?.trim() || !body.base64) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'Adjunta el documento en base64 y su nombre.');
    }
    const buffer = Buffer.from(body.base64, 'base64');
    if (!buffer.length) throw new ApiError(400, 'VALIDATION_ERROR', 'El archivo está vacío.');
    if (buffer.length > 12 * 1024 * 1024) {
      throw new ApiError(413, 'FILE_TOO_LARGE', 'El documento supera el límite de 12 MB.');
    }
    const result = await importDocument({
      programId: id,
      filename: body.filename.trim().slice(0, 250),
      buffer,
      mimeType: body.mimeType,
      visibility: body.visibility === 'staff' ? 'staff' : 'student',
      actor: user,
    });
    return NextResponse.json({ ok: true, documento: result });
  } catch (error) {
    return handleRouteError(error);
  }
}
