import type { CourseProgramRow } from '@/server/domain/coursePrograms';
import {
  buildN2NProgramStructure,
  COURSES_ROOT_NAME,
  WORKSHOPS_ROOT_NAME,
  semesterFolderName,
  type DriveFolderNode,
} from './drive-structure';
import {
  ensureFolderStructure,
  type DriveFolderGateway,
  type DriveFolderRegistry,
  type DriveFolderRegistryRecord,
} from './googleDrive';

export interface ProgramDriveResult {
  rootFolderId: string;
  programFolderId: string;
  programFolderUrl: string | null;
  folders: DriveFolderRegistryRecord[];
  created: number;
  reused: number;
}

/**
 * Asegura la carpeta raíz (Cursos o Talleres) y la carpeta del programa.
 * Si el programa declara la plantilla N2N, crea además los diez semestres con
 * su estructura estándar. Es idempotente gracias al registro `drive_folders`.
 */
export async function ensureProgramDriveStructure(options: {
  gateway: DriveFolderGateway;
  registry: DriveFolderRegistry;
  rootFolderId: string;
  program: CourseProgramRow;
  n2nTemplate?: boolean;
  onProgress?: (message: string) => void;
}): Promise<ProgramDriveResult> {
  const rootName = options.program.kind === 'course' ? COURSES_ROOT_NAME : WORKSHOPS_ROOT_NAME;
  const rootNode: DriveFolderNode = {
    name: rootName,
    purpose: 'Programas de Wisdom Academy.',
  };
  const rootResult = await ensureFolderStructure({
    gateway: options.gateway,
    rootFolderId: options.rootFolderId,
    nodes: [rootNode],
    registry: options.registry,
    onProgress: options.onProgress,
  });
  const rootFolder = rootResult.folders[0];

  const isN2N = options.n2nTemplate === true;
  const programNode: DriveFolderNode = isN2N
    ? buildN2NProgramStructure(10)
    : {
        name: options.program.title,
        purpose: `Carpeta del ${options.program.kind === 'course' ? 'curso' : 'taller'} ${options.program.title}.`,
      };

  const programResult = await ensureFolderStructure({
    gateway: options.gateway,
    rootFolderId: rootFolder.id,
    nodes: [programNode],
    registry: options.registry,
    pathPrefix: rootName,
    onProgress: options.onProgress,
  });
  const programFolder = programResult.folders[0];

  return {
    rootFolderId: rootFolder.id,
    programFolderId: programFolder.id,
    programFolderUrl:
      programFolder.webViewLink || `https://drive.google.com/drive/folders/${programFolder.id}`,
    folders: [...rootResult.folders, ...programResult.folders],
    created: rootResult.created + programResult.created,
    reused: rootResult.reused + programResult.reused,
  };
}

/**
 * Empareja las carpetas de semestre del resultado de Drive con los módulos del
 * programa para guardar IDs estables en cada módulo.
 */
export function semesterFolderIdFor(
  folders: DriveFolderRegistryRecord[],
  semester: number
): DriveFolderRegistryRecord | null {
  const name = semesterFolderName(semester);
  return folders.find((folder) => folder.name === name) || null;
}
