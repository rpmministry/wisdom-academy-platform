import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, requireSession } from '@/server/http/api';
import {
  assertProgramAccess,
  canManageCourses,
  getProgramRowBySlug,
} from '@/server/domain/coursePrograms';
import { prepare } from '@/server/db';
import {
  contentDisposition,
  isActiveContent,
  safeMimeType,
} from '@/server/http/contentDisposition';
import { createDriveGateway } from '@/lib/courses/googleDrive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
          drive_file_id: string | null;
          metadata_json: string;
        }
      | undefined;
    if (!material) throw new ApiError(404, 'MATERIAL_NOT_FOUND', 'El material no existe.');
    if (material.visibility !== 'student' && !canManageCourses(user)) {
      throw new ApiError(403, 'MATERIAL_FORBIDDEN', 'Este material es de uso interno del personal académico.');
    }
    if (!material.drive_file_id) {
      throw new ApiError(404, 'MATERIAL_FILE_MISSING', 'El material no tiene un archivo asociado.');
    }

    let metadata: { originalFilename?: unknown } = {};
    try {
      metadata = JSON.parse(material.metadata_json) as typeof metadata;
    } catch {
      metadata = {};
    }

    const drive = createDriveGateway();
    const file = await drive.downloadFile(material.drive_file_id);
    const download = request.nextUrl.searchParams.get('download') === '1';
    const originalName =
      typeof metadata.originalFilename === 'string'
        ? metadata.originalFilename
        : file.name || `${material.title}.pdf`;
    const mimeType = safeMimeType(file.mimeType);
    // HTML, SVG y otros documentos activos nunca se renderizan inline desde el
    // origen de la plataforma: se fuerzan como descarga para evitar XSS.
    const forceDownload = download || isActiveContent(mimeType, originalName);

    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': contentDisposition(
          originalName,
          forceDownload ? 'attachment' : 'inline'
        ),
        'Content-Length': String(file.buffer.length),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
