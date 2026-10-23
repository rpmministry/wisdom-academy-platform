import { NextRequest, NextResponse } from 'next/server';
import { ApiError, handleRouteError, readJsonBody, requireSession } from '@/server/http/api';
import { getProgramRowById, updateProgram } from '@/server/domain/coursePrograms';
import {
  createDriveGateway,
  driveConfigured,
  getDriveRootFolderId,
  sqliteDriveRegistry,
} from '@/lib/courses/googleDrive';
import { ensureProgramDriveStructure, semesterFolderIdFor } from '@/lib/courses/courseDrive';
import { prepare, withTransaction } from '@/server/db';
import { nowIso } from '@/server/db/sqlite';
import { writeAudit } from '@/server/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { user } = requireSession(request, { permission: 'resources.manage', mutation: true });
    const { id } = await context.params;
    const body = await readJsonBody<{
      action?: 'ensure' | 'link';
      folderId?: string;
      folderUrl?: string;
      n2nTemplate?: boolean;
    }>(request);
    const program = getProgramRowById(id);
    if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');

    if (body.action === 'link') {
      if (!body.folderId?.trim()) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Indica el ID de la carpeta de Google Drive.');
      }
      const folderId = body.folderId.trim();
      if (!/^[A-Za-z0-9_-]{10,200}$/.test(folderId)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'El ID de carpeta de Drive no tiene un formato válido.');
      }
      const folderUrl =
        body.folderUrl?.trim() || `https://drive.google.com/drive/folders/${folderId}`;
      if (!/^https:\/\/drive\.google\.com\//.test(folderUrl)) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'La URL debe pertenecer a Google Drive.');
      }
      const updated = updateProgram(
        id,
        { driveFolderId: folderId, driveFolderUrl: folderUrl },
        user
      );
      writeAudit({
        actor: user,
        action: 'course_program.drive_linked',
        entityType: 'course_program',
        entityId: id,
        after: { folderId },
      });
      return NextResponse.json({ ok: true, programa: updated });
    }

    if (!driveConfigured() || !getDriveRootFolderId()) {
      throw new ApiError(
        503,
        'DRIVE_NOT_CONFIGURED',
        'Google Drive no está configurado. Define la cuenta de servicio y la carpeta raíz en el servidor antes de crear carpetas.'
      );
    }

    const metadata = (() => {
      try {
        return JSON.parse(program.metadata_json) as { structureTemplate?: string };
      } catch {
        return {};
      }
    })();
    const n2nTemplate =
      body.n2nTemplate === true || metadata.structureTemplate === 'n2n' || /N2N/i.test(program.title);

    const gateway = createDriveGateway();
    const messages: string[] = [];
    const result = await ensureProgramDriveStructure({
      gateway,
      registry: sqliteDriveRegistry,
      rootFolderId: getDriveRootFolderId() as string,
      program,
      n2nTemplate,
      onProgress: (message) => messages.push(message),
    });

    const updated = updateProgram(
      id,
      {
        driveFolderId: result.programFolderId,
        driveFolderUrl: result.programFolderUrl,
      },
      user
    );

    if (n2nTemplate) {
      const modules = prepare('SELECT id, metadata_json FROM course_modules WHERE program_id = ?').all(
        id
      ) as Array<{ id: string; metadata_json: string }>;
      withTransaction(() => {
        for (const module of modules) {
          let semesterNumber: number | null = null;
          try {
            const parsed = JSON.parse(module.metadata_json) as { semesterNumber?: unknown };
            if (Number.isInteger(Number(parsed.semesterNumber))) semesterNumber = Number(parsed.semesterNumber);
          } catch {
            semesterNumber = null;
          }
          if (semesterNumber === null) continue;
          const folder = semesterFolderIdFor(result.folders, semesterNumber);
          if (!folder) continue;
          prepare(
            'UPDATE course_modules SET drive_folder_id = ?, drive_folder_url = ?, updated_at = ? WHERE id = ?'
          ).run(
            folder.id,
            folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
            nowIso(),
            module.id
          );
        }
      });
    }

    writeAudit({
      actor: user,
      action: 'course_program.drive_ensured',
      entityType: 'course_program',
      entityId: id,
      after: {
        folderId: result.programFolderId,
        created: result.created,
        reused: result.reused,
      },
    });

    return NextResponse.json({
      ok: true,
      programa: updated,
      carpeta: {
        id: result.programFolderId,
        url: result.programFolderUrl,
        creadas: result.created,
        reutilizadas: result.reused,
      },
      mensajes: messages.slice(-60),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
