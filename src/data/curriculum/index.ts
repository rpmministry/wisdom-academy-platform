/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Índice Curricular y Auditoría de Drive
 * ARCHIVO: src/data/curriculum/index.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Centraliza el acceso de solo lectura a las mallas personalizadas, resuelve
 * nombres de asignaturas con alias y expone el mapa de auditoría de las
 * carpetas de Google Drive. No contiene lógica de React ni acceso al sistema
 * de archivos, por lo que puede importarse tanto en servidor como en cliente.
 * ==============================================================================
 */

import type {
  AsignaturaCurricular,
  AuditoriaCarpetaDrive,
  BloqueHorarioCurricular,
  PerfilCurricular,
} from './tipos';
import { PERFIL_GAEL_4TO } from './gael-4to';
import { PERFIL_AVRIL_8VO } from './avril-8vo';

export type {
  AreaCurricular,
  AsignaturaCurricular,
  AuditoriaCarpetaDrive,
  BloqueHorarioCurricular,
  PerfilCurricular,
  ReferenciaCurricular,
  UnidadCurricular,
} from './tipos';

/**
 * Normaliza un nombre para comparaciones tolerantes a tildes, mayúsculas y
 * signos de puntuación.
 */
export function normalizarNombreAsignatura(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Perfiles curriculares disponibles, indexados por código de carpeta de Drive.
 */
export const PERFILES_CURRICULARES: Record<string, PerfilCurricular> = {
  [PERFIL_GAEL_4TO.codigoCarpetaAnioDrive]: PERFIL_GAEL_4TO,
  [PERFIL_AVRIL_8VO.codigoCarpetaAnioDrive]: PERFIL_AVRIL_8VO,
};

/**
 * Devuelve el perfil que corresponde a un código de carpeta o a un nombre de
 * estudiante. Si no se reconoce, retorna el perfil de Avril para conservar el
 * comportamiento histórico de la plataforma.
 */
export function obtenerPerfilCurricular(codigoOCarpeta: string): PerfilCurricular {
  const clave = codigoOCarpeta.trim();
  if (PERFILES_CURRICULARES[clave]) return PERFILES_CURRICULARES[clave];

  const normalizado = normalizarNombreAsignatura(clave);
  if (normalizado.includes('gael') || normalizado.includes('cuarto')) {
    return PERFIL_GAEL_4TO;
  }
  if (normalizado.includes('avril') || normalizado.includes('octavo')) {
    return PERFIL_AVRIL_8VO;
  }
  return PERFIL_AVRIL_8VO;
}

/**
 * Obtiene el perfil por nombre de estudiante.
 */
export function obtenerPerfilPorEstudiante(nombre: string): PerfilCurricular {
  return obtenerPerfilCurricular(nombre);
}

/**
 * Alias funcionales para resolver los nombres usados por la interfaz, Moodle
 * y los manifiestos de Drive sin acoplar la UI al catálogo nuevo.
 */
const ALIAS_POR_AREA: Array<{ claves: string[]; codigo: string }> = [
  { claves: ['matematica', 'matematicas', 'prealgebra', 'algebra', 'calculo', 'geometria'], codigo: 'MATEMATICAS' },
  { claves: ['lengua', 'literatura', 'lenguaje', 'comunicacion', 'retorica'], codigo: 'LENGUA' },
  { claves: ['politica', 'politicas', 'rrii', 'internacional', 'relaciones internacionales'], codigo: 'POLITICAS' },
  { claves: ['educacion fisica', 'fisica y salud', 'deporte', 'deportes'], codigo: 'EDUCACION_FISICA' },
  { claves: ['administracion', 'marketing', 'empresa', 'emprendimiento', 'negocio'], codigo: 'ADMINISTRACION' },
  { claves: ['relacion con dios', 'teologia', 'cosmovision', 'biblia'], codigo: 'RELACION_CON_DIOS' },
  { claves: ['english', 'ingles', 'phonics', 'reading', 'literature'], codigo: 'INGLES' },
  { claves: ['software', 'programacion', 'python', 'computacion', 'tecnologia'], codigo: 'SOFTWARE' },
  { claves: ['arte', 'artistica', 'eca', 'musica', 'teatro', 'danza'], codigo: 'ARTE' },
  { claves: ['sociales', 'historia', 'civismo', 'realidad nacional', 'estudios sociales'], codigo: 'SOCIALES' },
  { claves: ['ciencia', 'ciencias', 'naturales', 'biologia', 'fisica', 'quimica'], codigo: 'CIENCIAS' },
];

/**
 * Busca una asignatura dentro del perfil. Primero intenta coincidencia exacta
 * y después aplica alias por área. Esto mantiene compatibles los nombres
 * antiguos de la UI ("Matemáticas Creacionales", "Ciencias Integradas", etc.).
 */
export function buscarAsignatura(
  perfil: PerfilCurricular,
  nombre: string
): AsignaturaCurricular {
  const buscado = normalizarNombreAsignatura(nombre);

  const exacta = perfil.asignaturas.find(
    (a) =>
      normalizarNombreAsignatura(a.nombre) === buscado ||
      normalizarNombreAsignatura(a.nombreCorto) === buscado
  );
  if (exacta) return exacta;

  for (const alias of ALIAS_POR_AREA) {
    if (alias.claves.some((clave) => buscado.includes(clave))) {
      const porArea = perfil.asignaturas.find((a) =>
        a.codigo.toUpperCase().includes(alias.codigo)
      );
      if (porArea) return porArea;
    }
  }

  const porCodigo = perfil.asignaturas.find((a) =>
    normalizarNombreAsignatura(a.codigo).includes(buscado)
  );
  return porCodigo || perfil.asignaturas[0];
}

/**
 * Devuelve los bloques del día indicado. Acepta nombres con o sin tilde.
 */
export function obtenerBloquesDelDia(
  perfil: PerfilCurricular,
  diaSemana: string
): BloqueHorarioCurricular[] {
  const normalizado = normalizarNombreAsignatura(diaSemana);
  const clave = Object.keys(perfil.horarioSemanal).find(
    (dia) => normalizarNombreAsignatura(dia) === normalizado
  );
  return clave ? perfil.horarioSemanal[clave] : perfil.horarioSemanal.Lunes;
}

/**
 * Resuelve las asignaturas que corresponden a un día lectivo.
 */
export function obtenerAsignaturasDelDia(
  perfil: PerfilCurricular,
  diaSemana: string
): Array<{ bloque: BloqueHorarioCurricular; asignatura: AsignaturaCurricular }> {
  return obtenerBloquesDelDia(perfil, diaSemana).map((bloque) => ({
    bloque,
    asignatura: buscarAsignatura(perfil, bloque.materia),
  }));
}

/**
 * Lema institucional neutral para la jornada. La formación bíblica se reserva
 * exclusivamente a la asignatura Relación con Dios.
 */
export const LEMAS_ACADEMICOS_JORNADA: Array<{ referencia: string; texto: string }> = [
  {
    referencia: 'Wisdom Academy • Principio de rigor',
    texto: 'La excelencia académica se construye con curiosidad, método y honestidad intelectual.',
  },
  {
    referencia: 'Wisdom Academy • Principio de evidencia',
    texto: 'Toda afirmación debe sostenerse en evidencia verificable y en razonamiento transparente.',
  },
  {
    referencia: 'Wisdom Academy • Principio de pensamiento crítico',
    texto: 'Pensar críticamente es examinar las propias ideas con la misma exigencia que las ajenas.',
  },
  {
    referencia: 'Wisdom Academy • Principio de ciudadanía',
    texto: 'El conocimiento se vuelve valioso cuando se pone al servicio del bien común.',
  },
  {
    referencia: 'Wisdom Academy • Principio de mejora continua',
    texto: 'Aprender exige revisar, corregir y volver a intentar con método.',
  },
];

/**
 * Selecciona un lema académico determinista para un día lectivo.
 */
export function obtenerLemaAcademico(diaLectivo: number): { referencia: string; texto: string } {
  return LEMAS_ACADEMICOS_JORNADA[(Math.max(1, diaLectivo) - 1) % LEMAS_ACADEMICOS_JORNADA.length];
}

/**
 * Mapa de auditoría de Google Drive por estudiante. Documenta hallazgos,
 * duplicados, carpetas administrativas y acciones de compendio.
 */
export const AUDITORIA_DRIVE_POR_ESTUDIANTE: Record<string, AuditoriaCarpetaDrive[]> = {
  '04_Cuarto_EGB_Gael': [
    {
      codigo: '01_Lengua_y_Literatura',
      nombre: 'Lengua y Literatura',
      estado: 'COMPLETA',
      hallazgos: [
        'Texto base, plan curricular y cuaderno de ortografía presentes.',
        'El cuaderno de ortografía aparece también en la carpeta de Avril; conservar una copia canónica por nivel.',
      ],
      accionRecomendada: 'Mantener texto base y plan; mover el cuaderno duplicado a 00_Compendio_Recursos_Transversales.',
    },
    {
      codigo: '02_Matematicas',
      nombre: 'Matemáticas',
      estado: 'COMPLETA',
      hallazgos: ['Texto base, plan curricular y acuerdo curricular AC_4_M presentes.'],
      accionRecomendada: 'Conservar. Renombrar el plan con el código M.2.1 para trazabilidad.',
    },
    {
      codigo: '03_Ciencias_Naturales',
      nombre: 'Ciencias Naturales',
      estado: 'PARCIAL',
      hallazgos: [
        'Plan y AC_4_CN presentes; no hay texto base completo en la carpeta.',
        'Se añaden referencias abiertas CK-12 y OpenStax Biology como apoyo.',
      ],
      accionRecomendada: 'Incorporar un texto base o compendio de lecturas validadas y conservar el AC.',
    },
    {
      codigo: '04_Estudios_Sociales',
      nombre: 'Estudios Sociales del Ecuador',
      estado: 'COMPLETA',
      hallazgos: ['Texto base, plan y AC_4_ES presentes.'],
      accionRecomendada: 'Conservar. Añadir atlas del Ecuador como recurso complementario.',
    },
    {
      codigo: '05_Ingles',
      nombre: 'English Phonics & Reading',
      estado: 'COMPLETA',
      hallazgos: ['Texto base y plan presentes.'],
      accionRecomendada: 'Conservar. Añadir Oxford Phonics World 4 como apoyo fonético.',
    },
    {
      codigo: '06_Software_y_Programacion',
      nombre: 'Software y Programación',
      estado: 'DUPLICADA',
      hallazgos: [
        'Dos textos introductorios de Python con solapamiento de contenido.',
        'El plan de Software y el texto think-python cubren niveles distintos.',
      ],
      accionRecomendada: 'Consolidar en un compendio progresivo: Scratch → Python básico → proyecto.',
    },
    {
      codigo: '07_Arte_ECA',
      nombre: 'Educación Cultural y Artística',
      estado: 'COMPLETA',
      hallazgos: ['Libro de actividades y plan curricular presentes.'],
      accionRecomendada: 'Conservar. Añadir referencias visuales de arte ecuatoriano.',
    },
    {
      codigo: '08_Educacion_Fisica',
      nombre: 'Educación Física y Salud',
      estado: 'PARCIAL',
      hallazgos: ['Solo plan curricular; no hay texto base ni guía de actividades.'],
      accionRecomendada: 'Añadir manual de juegos cooperativos y recomendaciones OMS de actividad física.',
    },
    {
      codigo: '09_Relacion_con_Dios',
      nombre: 'Relación con Dios',
      estado: 'PARCIAL',
      hallazgos: [
        'Plan curricular y listado de recursos web presentes.',
        'No hay texto teológico estructurado para el nivel.',
      ],
      accionRecomendada: 'Incorporar Biblia de estudio infantil y catecismo comentado para familias.',
    },
    {
      codigo: '10_Plan_y_Curriculo_Oficial',
      nombre: 'Plan Escolar y Normativa MINEDUC',
      estado: 'ADMINISTRATIVA',
      hallazgos: [
        'Contiene plan escolar, AC_4, bases pedagógicas y normativa.',
        'No debe contarse como asignatura de la malla.',
      ],
      accionRecomendada: 'Mover a 00_Administrativo y excluir del catálogo de materias.',
    },
  ],
  '08_Octavo_EGB_Avril': [
    {
      codigo: '01_Matematicas',
      nombre: 'Matemáticas y Pre-Álgebra',
      estado: 'COMPLETA',
      hallazgos: ['Texto base, macrocurrículo y microcurrículo presentes.'],
      accionRecomendada: 'Conservar. Añadir OpenStax Prealgebra como texto universitario de apoyo.',
    },
    {
      codigo: '02_Lengua_y_Literatura',
      nombre: 'Lengua y Literatura',
      estado: 'DUPLICADA',
      hallazgos: [
        'Texto base, macro y microcurrículo presentes.',
        'El cuaderno de ortografía tiene una copia con sufijo (1) que duplica el recurso de Gael.',
      ],
      accionRecomendada: 'Consolidar en un único cuaderno de ortografía transversal y eliminar la copia redundante.',
    },
    {
      codigo: '03_Ciencias_Naturales',
      nombre: 'Ciencias Naturales Integradas',
      estado: 'COMPLETA',
      hallazgos: ['Texto base y documento combinado macro/micro presentes.'],
      accionRecomendada: 'Separar macro y micro en dos archivos para facilitar la sincronización.',
    },
    {
      codigo: '04_Estudios_Sociales',
      nombre: 'Estudios Sociales e Historia del Ecuador',
      estado: 'COMPLETA',
      hallazgos: [
        'Texto base, macro, micro y módulo de etnoeducación presentes.',
        'El módulo de etnoeducación es un recurso docente, no un texto estudiantil.',
      ],
      accionRecomendada: 'Mover el módulo docente a 00_Recursos_Docentes y conservar el texto base.',
    },
    {
      codigo: '05_Ingles',
      nombre: 'Academic English & Literature',
      estado: 'COMPLETA',
      hallazgos: ['Texto base, macro y microcurrículo presentes.'],
      accionRecomendada: 'Conservar. Añadir The Elements of Style y Purdue OWL como apoyo de escritura.',
    },
    {
      codigo: '06_Software_y_Programacion',
      nombre: 'Software y Programación Python',
      estado: 'DUPLICADA',
      hallazgos: [
        'Dos textos introductorios de Python y un plan macro/micro.',
        'think-python-es (1) duplica el texto de Gael.',
      ],
      accionRecomendada: 'Consolidar en una ruta única: Think Python + Python Crash Course + proyecto.',
    },
    {
      codigo: '07_Ciencias_Politicas_y_RRII',
      nombre: 'Ciencias Políticas y Relaciones Internacionales',
      estado: 'COMPLETA',
      hallazgos: ['Tres textos universitarios y macro/microcurrículo presentes.'],
      accionRecomendada: 'Conservar. Priorizar Legler y Mingst como textos base del nivel.',
    },
    {
      codigo: '08_Administracion_y_Marketing',
      nombre: 'Administración y Marketing Digital',
      estado: 'COMPLETA',
      hallazgos: ['Cuatro textos de marketing y macro/microcurrículo presentes.'],
      accionRecomendada: 'Conservar. Usar Kotler como texto base y Burgos/Cerezo como aplicación digital.',
    },
    {
      codigo: '09_Arte_ECA',
      nombre: 'Educación Cultural y Artística',
      estado: 'COMPLETA',
      hallazgos: ['Texto ECA, macro y microcurrículo presentes.'],
      accionRecomendada: 'Conservar. Añadir Historia del arte de Gombrich como referencia.',
    },
    {
      codigo: '10_Educacion_Fisica',
      nombre: 'Educación Física y Salud',
      estado: 'PARCIAL',
      hallazgos: ['Solo macro y microcurrículo; no hay texto base ni guía de entrenamiento.'],
      accionRecomendada: 'Añadir fisiología del ejercicio y manual de primeros auxilios.',
    },
    {
      codigo: '11_Relacion_con_Dios',
      nombre: 'Relación con Dios (Teología y Cosmovisión)',
      estado: 'PARCIAL',
      hallazgos: [
        'Macro y microcurrículo presentes; no hay bibliografía teológica estructurada.',
        'Es la única asignatura donde se profundiza el contenido confesional.',
      ],
      accionRecomendada: 'Incorporar Teología Sistemática de Grudem, Calvino y Mero cristianismo de Lewis.',
    },
    {
      codigo: '12_Plan_y_Curriculo_Oficial',
      nombre: 'Plan Escolar y Normativa MINEDUC',
      estado: 'ADMINISTRATIVA',
      hallazgos: [
        'Plan escolar y HTML duplicado del mismo contenido.',
        'BGU-tomo-1 y BGU-tomo-2 corresponden a Bachillerato, no a 8.° EGB.',
      ],
      accionRecomendada: 'Mover documentos BGU a 00_Referencia_BGU y conservar solo el plan 2026-2027 en 00_Administrativo.',
    },
  ],
};

/**
 * Resumen ejecutivo de la malla personalizada.
 */
export interface ResumenMallaEstudiante {
  estudiante: string;
  grado: string;
  totalAsignaturas: number;
  asignaturasAcademicas: number;
  asignaturasConfesionales: number;
  totalUnidades: number;
  totalReferencias: number;
}

export function obtenerResumenMalla(perfil: PerfilCurricular): ResumenMallaEstudiante {
  const confesionales = perfil.asignaturas.filter((a) => a.area === 'TEOLOGIA').length;
  return {
    estudiante: perfil.estudiante,
    grado: perfil.grado,
    totalAsignaturas: perfil.asignaturas.length,
    asignaturasAcademicas: perfil.asignaturas.length - confesionales,
    asignaturasConfesionales: confesionales,
    totalUnidades: perfil.asignaturas.reduce((total, a) => total + a.unidades.length, 0),
    totalReferencias: perfil.asignaturas.reduce((total, a) => total + a.bibliografia.length, 0),
  };
}
