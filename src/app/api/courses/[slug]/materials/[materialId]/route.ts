import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import {
  assertProgramAccess,
  canManageCourses,
  getProgramRowBySlug,
} from '@/server/domain/coursePrograms';
import { contentDisposition } from '@/server/http/contentDisposition';
import { prepare } from '@/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string; materialId: string }> }
) {
  try {
    const { user } = requireSession(request);
    const { slug, materialId } = await context.params;
    const program = getProgramRowBySlug(slug);
    if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
    assertProgramAccess(user, program);

    const material = prepare(
      'SELECT * FROM course_materials WHERE id = ? AND program_id = ?'
    ).get(materialId, program.id) as
      | {
          id: string;
          title: string;
          kind: string;
          visibility: string;
          metadata_json: string;
        }
      | undefined;
    if (!material) throw new ApiError(404, 'MATERIAL_NOT_FOUND', 'El material no existe.');
    if (material.visibility !== 'student' && !canManageCourses(user)) {
      throw new ApiError(403, 'MATERIAL_FORBIDDEN', 'Este material es de uso interno del personal académico.');
    }
    if (!['text', 'full_text', 'drive_file'].includes(material.kind)) {
      throw new ApiError(409, 'MATERIAL_NOT_TEXT', 'Este material no tiene una versión de texto descargable.');
    }

    let metadata: { extractedText?: unknown; originalFilename?: unknown } = {};
    try {
      metadata = JSON.parse(material.metadata_json) as typeof metadata;
    } catch {
      metadata = {};
    }
    const text = typeof metadata.extractedText === 'string' ? metadata.extractedText : '';
    if (!text) {
      throw new ApiError(
        404,
        'MATERIAL_TEXT_MISSING',
        'El material no tiene texto extraído. Si el original está en Drive, ábrelo desde el enlace del programa.'
      );
    }

    const download = request.nextUrl.searchParams.get('download') === '1';
    const filename =
      typeof metadata.originalFilename === 'string'
        ? metadata.originalFilename.replace(/\.[^.]+$/, '.txt')
        : 'material.txt';
    return new NextResponse(text, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': contentDisposition(
          filename,
          download ? 'attachment' : 'inline'
        ),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
