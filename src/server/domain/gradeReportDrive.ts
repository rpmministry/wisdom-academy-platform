import { prepare } from '../db';
import { nowIso } from '../db/sqlite';
import type { AuthUser } from '../auth/authorization';
import { ApiError } from '../http/api';
import { writeAudit } from '../audit';
import { getProgramRowById } from './coursePrograms';
import { renderGradeReportHtml } from '@/lib/courses/reports';
import { createDriveGateway, ensureFolderStructure } from '@/lib/courses/googleDrive';

interface PendingReportRow {
  report_id: string;
  attempt_id: string;
  user_id: string;
  assessment_id: string;
  assessment_title: string;
  assessment_kind: string;
  module_title: string | null;
  attempt_number: number;
  assessment_version: number;
  percentage: number | null;
  correct_count: number | null;
  total_questions: number | null;
  submitted_at: string | null;
  graded_at: string | null;
  pass_percentage: number | null;
  display_name: string | null;
  email: string;
}

export interface GradeReportSyncResult {
  synced: number;
  failed: number;
  skipped: number;
  errors: string[];
}

/**
 * Copia los informes de calificación pendientes a la carpeta privada del
 * estudiante en Google Drive. Usa identificadores internos en la ruta, no
 * datos personales, y es idempotente por nombre de archivo.
 */
export async function syncGradeReports(
  programId: string,
  actor: AuthUser
): Promise<GradeReportSyncResult> {
  const program = getProgramRowById(programId);
  if (!program) throw new ApiError(404, 'PROGRAM_NOT_FOUND', 'El programa no existe.');
  const parentFolderId = process.env.GOOGLE_DRIVE_STUDENT_REPORTS_FOLDER_ID?.trim();
  if (!parentFolderId) {
    throw new ApiError(
      503,
      'REPORT_DRIVE_NOT_CONFIGURED',
      'Define GOOGLE_DRIVE_STUDENT_REPORTS_FOLDER_ID con una carpeta privada de expedientes para sincronizar los informes.'
    );
  }

  const rows = prepare(`
    SELECT gr.id AS report_id, a.id AS attempt_id, a.user_id, asm.id AS assessment_id,
           asm.title AS assessment_title, asm.kind AS assessment_kind, asm.pass_percentage,
           m.title AS module_title, a.attempt_number, a.assessment_version, a.percentage, a.correct_count,
           a.total_questions, a.submitted_at, a.graded_at, u.display_name, u.email
    FROM course_grade_reports gr
    JOIN assessment_attempts a ON a.id = gr.attempt_id
    JOIN assessments asm ON asm.id = gr.assessment_id
    LEFT JOIN course_modules m ON m.id = asm.module_id
    JOIN users u ON u.id = gr.user_id
    WHERE gr.program_id = ? AND gr.drive_status IN ('pending','failed')
    ORDER BY gr.generated_at
    LIMIT 200
  `).all(programId) as PendingReportRow[];

  const gateway = createDriveGateway();
  const result: GradeReportSyncResult = { synced: 0, failed: 0, skipped: 0, errors: [] };

  for (const row of rows) {
    try {
      const ensured = await ensureFolderStructure({
        gateway,
        rootFolderId: parentFolderId,
        nodes: [
          {
            name: 'Estudiantes',
            purpose: 'Expedientes privados por identificador interno.',
            children: [
              {
                name: row.user_id,
                purpose: 'Expediente privado del estudiante.',
                children: [
                  {
                    name: 'Wisdom Academy',
                    purpose: 'Documentos emitidos por Wisdom Academy.',
                    children: [
                      {
                        name: program.id,
                        purpose: 'Programa formativo.',
                        children: [
                          {
                            name: row.module_title || 'Sin semestre',
                            purpose: 'Semestre o módulo.',
                            children: [
                              {
                                name: 'Resultados de evaluaciones',
                                purpose: 'Informes individuales de calificación.',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
      const target = ensured.folders[ensured.folders.length - 1];
      const html = renderGradeReportHtml({
        programTitle: program.title,
        institution: program.institution,
        assessmentTitle: row.assessment_title,
        assessmentKind: row.assessment_kind,
        semesterLabel: row.module_title,
        studentName: row.display_name || row.email,
        attemptNumber: Number(row.attempt_number),
        assessmentVersion: Number(row.assessment_version),
        percentage: row.percentage === null ? null : Number(row.percentage),
        correctCount: row.correct_count === null ? null : Number(row.correct_count),
        totalQuestions: row.total_questions === null ? null : Number(row.total_questions),
        submittedAt: row.submitted_at,
        recordedAt: row.graded_at || row.submitted_at || nowIso(),
        passPercentage: row.pass_percentage,
        backHref: '',
        downloadName: 'informe-calificacion.html',
      });
      const upload = await gateway.uploadFile({
        parentId: target.id,
        name: `informe-${row.assessment_id}-intento-${row.attempt_number}.html`,
        mimeType: 'text/html',
        content: html,
      });
      prepare(
        "UPDATE course_grade_reports SET drive_status = 'synced', drive_file_id = ?, drive_url = ?, drive_error = NULL, updated_at = ? WHERE id = ?"
      ).run(
        upload.id,
        upload.webViewLink || `https://drive.google.com/file/d/${upload.id}/view`,
        nowIso(),
        row.report_id
      );
      result.synced += 1;
    } catch (error) {
      result.failed += 1;
      const message = error instanceof Error ? error.message.slice(0, 500) : 'Error desconocido';
      result.errors.push(message);
      prepare(
        "UPDATE course_grade_reports SET drive_status = 'failed', drive_error = ?, updated_at = ? WHERE id = ?"
      ).run(message, nowIso(), row.report_id);
    }
  }

  writeAudit({
    actor,
    action: 'course_grade_reports.drive_sync',
    entityType: 'course_program',
    entityId: programId,
    after: {
      synced: result.synced,
      failed: result.failed,
      errors: result.errors.slice(0, 20),
    },
  });
  return result;
}
