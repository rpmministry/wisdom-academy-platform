/**
 * Estructura canónica de carpetas de Google Drive para Cursos y Talleres.
 *
 * La especificación es pura (sin red ni base de datos) para poder probar la
 * idempotencia y el orden de creación sin credenciales reales.
 */

export interface DriveFolderNode {
  name: string;
  purpose: string;
  children?: DriveFolderNode[];
}

export const COURSES_ROOT_NAME = 'Cursos';
export const WORKSHOPS_ROOT_NAME = 'Talleres';
export const N2N_PROGRAM_NAME = 'Curso teológico — Universidad Cristiana N2N';

export const N2N_CALENDAR_SOURCE = 'PENDIENTE_DE_VALIDACIÓN';

export const N2N_MANAGEMENT_FOLDERS: DriveFolderNode[] = [
  { name: '01_DOCUMENTOS_ORIGINALES', purpose: 'Documentos originales recibidos de N2N sin modificaciones.' },
  { name: '02_CALENDARIO_Y_PROGRAMA', purpose: 'Calendario y programa académico oficial por semestre.' },
  { name: '03_INDICE_DE_ENLACES_YOUTUBE', purpose: 'Manifiestos de enlaces de YouTube y plantillas de importación.' },
  { name: '04_INFORMES_DE_IMPORTACION', purpose: 'Informes de importación y auditoría de materiales.' },
];

export const N2N_EXAM_FOLDERS: DriveFolderNode[] = [
  { name: '01_VERSION_ESTUDIANTE', purpose: 'Versión sin respuestas visible para estudiantes.' },
  { name: '02_CLAVE_PRIVADA_DOCENTE', purpose: 'Clave y solucionario de acceso exclusivo del personal académico.' },
  { name: '03_VERSIONES_Y_AUDITORIA', purpose: 'Versiones, actas de revisión y auditorías internas.' },
];

export const N2N_SEMESTER_SUBFOLDERS: DriveFolderNode[] = [
  { name: '00_PROGRAMA_Y_CALENDARIO', purpose: 'Programa y calendario del semestre.' },
  { name: '01_TEXTO_COMPLETO_Y_LECTURAS', purpose: 'Texto completo y lecturas oficiales del semestre.' },
  { name: '02_MATERIALES_POR_CLASE', purpose: 'Materiales de apoyo organizados por clase.' },
  { name: '03_RECURSOS_COMPLEMENTARIOS', purpose: 'Recursos complementarios autorizados.' },
  { name: '04_ACTIVIDADES_Y_EVALUACIONES', purpose: 'Actividades y evaluaciones de proceso.' },
  { name: '05_REPASOS_SEMANALES', purpose: 'Documentos de repaso generados y revisados por semana.' },
  {
    name: '06_PARCIALES_Y_FINALES',
    purpose: 'Exámenes parciales y finales con separación estricta de claves.',
    children: [
      { name: '00_DOCUMENTOS_OFICIALES_ORIGINALES', purpose: 'Exámenes oficiales originales intactos.' },
      { name: '01_EXAMEN_PARCIAL', purpose: 'Parcial: versiones de estudiante, clave privada y auditoría.', children: N2N_EXAM_FOLDERS },
      { name: '02_EXAMEN_FINAL', purpose: 'Final: versiones de estudiante, clave privada y auditoría.', children: N2N_EXAM_FOLDERS },
      {
        name: '03_INFORMES_AGREGADOS_SIN_DATOS_IDENTIFICABLES',
        purpose: 'Estadísticas agregadas sin datos personales.',
      },
    ],
  },
];

export function semesterNumberLabel(semester: number): string {
  if (!Number.isInteger(semester) || semester < 1 || semester > 99) {
    throw new Error('El semestre debe ser un entero entre 1 y 99.');
  }
  return String(semester).padStart(2, '0');
}

export function semesterFolderName(semester: number): string {
  const label = semesterNumberLabel(semester);
  return `${label}_SEMESTRE_${label}`;
}

export function buildN2NProgramStructure(semesters = 10): DriveFolderNode {
  return {
    name: N2N_PROGRAM_NAME,
    purpose: 'Programa teológico de diez semestres de la Universidad Cristiana N2N.',
    children: [
      {
        name: '00_GESTION_E_INDICE_DE_MATERIALES',
        purpose: 'Gestión documental, calendario global y manifiestos de videos.',
        children: N2N_MANAGEMENT_FOLDERS,
      },
      ...Array.from({ length: semesters }, (_, index) => ({
        name: semesterFolderName(index + 1),
        purpose: `Semestre ${index + 1}: programa, texto, materiales, repasos y evaluaciones.`,
        children: N2N_SEMESTER_SUBFOLDERS,
      })),
    ],
  };
}

export function buildCoursesWorkshopsStructure(semesters = 10): DriveFolderNode[] {
  return [
    {
      name: COURSES_ROOT_NAME,
      purpose: 'Cursos extensos y secuenciales de Wisdom Academy.',
      children: [buildN2NProgramStructure(semesters)],
    },
    {
      name: WORKSHOPS_ROOT_NAME,
      purpose: 'Talleres cortos, intensivos y orientados a un resultado concreto.',
    },
  ];
}

export interface FlatDriveFolder {
  path: string;
  name: string;
  purpose: string;
  depth: number;
  parentPath: string | null;
}

/**
 * Aplana el árbol conservando rutas estables. Las rutas se usan como clave de
 * idempotencia en la tabla `drive_folders`.
 */
export function flattenStructure(
  nodes: DriveFolderNode[],
  parentPath: string | null = null,
  depth = 0
): FlatDriveFolder[] {
  const output: FlatDriveFolder[] = [];
  for (const node of nodes) {
    const path = parentPath ? `${parentPath}/${node.name}` : node.name;
    output.push({ path, name: node.name, purpose: node.purpose, depth, parentPath });
    if (node.children?.length) {
      output.push(...flattenStructure(node.children, path, depth + 1));
    }
  }
  return output;
}

export function buildFlatCoursesWorkshopsStructure(semesters = 10): FlatDriveFolder[] {
  return flattenStructure(buildCoursesWorkshopsStructure(semesters));
}

export function renderTreeText(nodes: DriveFolderNode[], prefix = ''): string[] {
  const lines: string[] = [];
  nodes.forEach((node, index) => {
    const last = index === nodes.length - 1;
    lines.push(`${prefix}${last ? '└── ' : '├── '}${node.name}`);
    if (node.children?.length) {
      lines.push(...renderTreeText(node.children, `${prefix}${last ? '    ' : '│   '}`));
    }
  });
  return lines;
}
