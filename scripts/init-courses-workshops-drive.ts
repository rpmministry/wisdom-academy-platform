/**
 * Aprovisiona la estructura real de Google Drive para Cursos y Talleres y
 * registra el programa N2N de diez semestres sin inventar contenidos.
 *
 * Uso: npm run init:courses-drive
 *
 * Requiere GOOGLE_DRIVE_ROOT_FOLDER_ID y credenciales de cuenta de servicio.
 * No concede permisos públicos ni imprime secretos.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { prepare, withTransaction } from '../src/server/db';
import { nowIso } from '../src/server/db/sqlite';
import {
  createProgram,
  getProgramRowById,
  getProgramRowBySlug,
  updateProgram,
} from '../src/server/domain/coursePrograms';
import {
  createDriveGateway,
  driveConfigured,
  ensureFolderStructure,
  getDriveRootFolderId,
  sqliteDriveRegistry,
} from '../src/lib/courses/googleDrive';
import { ensureProgramDriveStructure, semesterFolderIdFor } from '../src/lib/courses/courseDrive';
import {
  buildCoursesWorkshopsStructure,
  N2N_PROGRAM_NAME,
  renderTreeText,
} from '../src/lib/courses/drive-structure';

const N2N_SLUG = 'curso-teologico-universidad-cristiana-n2n';

function ensureN2NProgram(): string {
  const existing = getProgramRowBySlug(N2N_SLUG);
  if (existing) return existing.id;

  const created = createProgram({
    kind: 'course',
    title: N2N_PROGRAM_NAME,
    slug: N2N_SLUG,
    institution: 'Universidad Cristiana N2N',
    description:
      'Programa teológico de diez semestres. La estructura curricular, el calendario y los contenidos se incorporarán exclusivamente a partir de los materiales oficiales proporcionados por la institución.',
    level: 'Formación teológica',
    status: 'draft',
    metadata: { structureTemplate: 'n2n', semesters: 10, source: 'prompt-maestro' },
  });
  console.log(`+ Programa creado: ${created.title} [${created.id}]`);
  return created.id;
}

function ensureSemesterModules(programId: string): void {
  const existing = prepare('SELECT id, metadata_json FROM course_modules WHERE program_id = ?').all(
    programId
  ) as Array<{ id: string; metadata_json: string }>;
  const bySemester = new Map<number, string>();
  for (const module of existing) {
    try {
      const metadata = JSON.parse(module.metadata_json) as { semesterNumber?: unknown };
      if (Number.isInteger(Number(metadata.semesterNumber))) {
        bySemester.set(Number(metadata.semesterNumber), module.id);
      }
    } catch {
      // Se ignora metadata inválida.
    }
  }

  const now = nowIso();
  for (let semester = 1; semester <= 10; semester += 1) {
    if (bySemester.has(semester)) continue;
    const id = `mod_${semester}_${programId.slice(-6)}_${now.slice(0, 10).replace(/-/g, '')}`;
    prepare(`
      INSERT INTO course_modules
        (id, program_id, title, kind, position, description, metadata_json, created_at, updated_at)
      VALUES (?, ?, ?, 'semester', ?, ?, ?, ?, ?)
    `).run(
      id,
      programId,
      `Semestre ${String(semester).padStart(2, '0')}`,
      semester,
      `Estructura del semestre ${semester}. Los contenidos se incorporarán desde los materiales oficiales.`,
      JSON.stringify({ semesterNumber: semester, placeholder: true, source: 'init-courses-drive' }),
      now,
      now
    );
    bySemester.set(semester, id);
    console.log(`+ Módulo creado: Semestre ${String(semester).padStart(2, '0')}`);
  }
}

function writeReport(input: {
  created: number;
  reused: number;
  programId: string;
  programFolderId: string;
  programFolderUrl: string | null;
}): void {
  const rows = prepare('SELECT * FROM drive_folders ORDER BY path').all() as Array<{
    id: string;
    parent_id: string | null;
    name: string;
    path: string;
    purpose: string;
    web_view_link: string | null;
  }>;
  const dataDir = path.join(process.cwd(), '.data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'drive-courses-workshops-report.json'),
    JSON.stringify(
      {
        generatedAt: nowIso(),
        rootFolderId: getDriveRootFolderId(),
        programId: input.programId,
        programFolderId: input.programFolderId,
        programFolderUrl: input.programFolderUrl,
        created: input.created,
        reused: input.reused,
        folders: rows,
      },
      null,
      2
    ),
    'utf8'
  );

  const tree = buildCoursesWorkshopsStructure(10);
  const lines: string[] = [];
  lines.push('# Estructura real de Google Drive — Cursos y Talleres');
  lines.push('');
  lines.push(`Generado: ${nowIso()}`);
  lines.push('');
  lines.push('## Resultado de la ejecución');
  lines.push('');
  lines.push(`- Carpetas creadas en esta ejecución: ${input.created}`);
  lines.push(`- Carpetas reutilizadas (idempotencia): ${input.reused}`);
  lines.push(`- Carpeta del programa: [${input.programFolderId}](${input.programFolderUrl || `https://drive.google.com/drive/folders/${input.programFolderId}`})`);
  lines.push('- Raíz utilizada: carpeta configurada en `GOOGLE_DRIVE_ROOT_FOLDER_ID` (no se publica su ID por seguridad).');
  lines.push('');
  lines.push('## Árbol canónico');
  lines.push('');
  lines.push('```text');
  lines.push(...renderTreeText(tree));
  lines.push('```');
  lines.push('');
  lines.push('## Carpetas verificadas con ID y URL');
  lines.push('');
  lines.push('| Ruta | Nombre | ID | URL |');
  lines.push('| --- | --- | --- | --- |');
  for (const row of rows) {
    lines.push(
      `| ${row.path.replace(/\|/g, '\\|')} | ${row.name.replace(/\|/g, '\\|')} | ${row.id} | ${
        row.web_view_link || `https://drive.google.com/drive/folders/${row.id}`
      } |`
    );
  }
  lines.push('');
  lines.push('## Notas de privacidad');
  lines.push('');
  lines.push('- No se concedió acceso público a ninguna carpeta.');
  lines.push('- `02_CLAVE_PRIVADA_DOCENTE` solo debe ser accesible por personal académico autorizado.');
  lines.push('- Si la carpeta padre hereda permisos amplios, guarda los originales con respuestas en una ubicación privada de administración fuera del árbol visible para estudiantes y registra su ID en los metadatos protegidos del curso.');
  lines.push('- Los informes individuales de calificaciones no se almacenan en la carpeta compartida del curso.');
  lines.push('');
  fs.mkdirSync(path.join(process.cwd(), 'docs'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), 'docs', 'drive-structure-courses-workshops.md'), lines.join('\n'), 'utf8');
  console.log('Informe escrito en docs/drive-structure-courses-workshops.md');
}

async function main(): Promise<void> {
  prepare('SELECT 1').get();
  if (!driveConfigured() || !getDriveRootFolderId()) {
    console.error(
      'Google Drive no está configurado. Define GOOGLE_DRIVE_ROOT_FOLDER_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.'
    );
    process.exitCode = 2;
    return;
  }

  const programId = ensureN2NProgram();
  ensureSemesterModules(programId);
  const program = getProgramRowById(programId);
  if (!program) throw new Error('No se pudo cargar el programa N2N.');

  const gateway = createDriveGateway();
  const rootFolderId = getDriveRootFolderId() as string;

  console.log('Verificando carpetas raíz Cursos/ y Talleres/...');
  const roots = await ensureFolderStructure({
    gateway,
    rootFolderId,
    nodes: [
      { name: 'Cursos', purpose: 'Cursos extensos y secuenciales de Wisdom Academy.' },
      { name: 'Talleres', purpose: 'Talleres cortos, intensivos y orientados a un resultado concreto.' },
    ],
    registry: sqliteDriveRegistry,
    onProgress: (message) => console.log(message),
  });

  console.log('Verificando estructura del programa N2N y sus diez semestres...');
  const result = await ensureProgramDriveStructure({
    gateway,
    registry: sqliteDriveRegistry,
    rootFolderId,
    program,
    n2nTemplate: true,
    onProgress: (message) => console.log(message),
  });

  updateProgram(
    programId,
    {
      driveFolderId: result.programFolderId,
      driveFolderUrl: result.programFolderUrl,
      status: 'draft',
    },
    null
  );

  withTransaction(() => {
    const modules = prepare('SELECT id, metadata_json FROM course_modules WHERE program_id = ?').all(
      programId
    ) as Array<{ id: string; metadata_json: string }>;
    for (const module of modules) {
      let semesterNumber: number | null = null;
      try {
        const metadata = JSON.parse(module.metadata_json) as { semesterNumber?: unknown };
        if (Number.isInteger(Number(metadata.semesterNumber))) semesterNumber = Number(metadata.semesterNumber);
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

  const totalCreated = roots.created + result.created;
  const totalReused = roots.reused + result.reused;
  writeReport({
    created: totalCreated,
    reused: totalReused,
    programId,
    programFolderId: result.programFolderId,
    programFolderUrl: result.programFolderUrl,
  });

  console.log('');
  console.log(`Carpetas creadas: ${totalCreated}`);
  console.log(`Carpetas reutilizadas: ${totalReused}`);
  console.log(`Carpeta del programa: ${result.programFolderId}`);
  console.log(`URL: ${result.programFolderUrl}`);
  console.log('El programa N2N quedó en estado borrador, sin contenidos inventados.');
}

main().catch((error) => {
  console.error('Error al aprovisionar la estructura:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
