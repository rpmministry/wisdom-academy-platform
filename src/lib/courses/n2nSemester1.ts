/**
 * Datos oficiales del Semestre 1 del currículo N2N.
 *
 * Fuentes:
 * - `1 SEMESTRE 2024.pdf` (tabla de materias y horario sugerido).
 * - `N2NLA Semester 1-Class schedule.pdf` (horario).
 * - `LINKS MATERIAS DEL 1 SEMESTRE.docx` (enlaces de YouTube).
 * - Libros de cada materia (N2-MF, 38-RYD, N3-VC, N4-FD, N5-SL).
 *
 * No se inventaron títulos ni sesiones: los títulos provienen del índice de cada
 * libro y el orden de las semanas del horario oficial.
 */

export interface N2nSessionSeed {
  key: string;
  subjectCode: string;
  subject: string;
  session: number;
  title: string;
  videoId: string;
  pages: string;
  bookTitle: string;
  bookFileId: string;
  week: number;
}

export const N2N_SEMESTER_1_SUBJECTS = [
  {
    code: '01',
    name: 'El Matrimonio y la Familia',
    professor: 'Rev. Stacy Cline',
    sessions: 10,
    bookTitle: 'El Matrimonio y la Familia',
    bookFileId: '1F9OQKBv-ot4jxMsE5jJzzcFl6wKmp6E7',
    bookFilename: 'N2-MF-00.pdf',
  },
  {
    code: '02',
    name: 'El Sufrimiento y La Pérdida',
    professor: 'Rev. Stacy Cline',
    sessions: 6,
    bookTitle: 'El Sufrimiento y La Pérdida',
    bookFileId: '1waw-0PnwrG32LVy9B6IpQeaK9wl08u68',
    bookFilename: 'N5-SL-00.pdf',
  },
  {
    code: '12',
    name: 'Libre por el Decreto Divino',
    professor: 'Rev. Paul Johansson',
    sessions: 10,
    bookTitle: 'Libre por el Decreto Divino',
    bookFileId: '1GhQfdJkh2sEpMPWo6F0Ec2uP_O8koubj',
    bookFilename: 'N4-FD-00.pdf',
  },
  {
    code: '38',
    name: 'Alcanzando Su Destino',
    professor: 'Dr. S. Brick Cliff',
    sessions: 5,
    bookTitle: 'Alcanzando Su Destino',
    bookFileId: '1h3l6QCzyPZ55dSsFR5O4uXBfv2vKUkxg',
    bookFilename: '38-RYD-5 Sesiones.pdf',
  },
  {
    code: '39',
    name: 'La Vida Cristiana Victoriosa',
    professor: 'Dr. S. Brick Cliff',
    sessions: 2,
    bookTitle: 'La Vida Cristiana Victoriosa',
    bookFileId: '13B5P61RZunXGegSTYeVbQdEomoo90SjT',
    bookFilename: 'N3-VC-00.pdf',
  },
] as const;

const MF_BOOK = '1F9OQKBv-ot4jxMsE5jJzzcFl6wKmp6E7';
const SP_BOOK = '1waw-0PnwrG32LVy9B6IpQeaK9wl08u68';
const LD_BOOK = '1GhQfdJkh2sEpMPWo6F0Ec2uP_O8koubj';
const AD_BOOK = '1h3l6QCzyPZ55dSsFR5O4uXBfv2vKUkxg';
const VC_BOOK = '13B5P61RZunXGegSTYeVbQdEomoo90SjT';

function mf(session: number, title: string, pages: string, videoId: string): N2nSessionSeed {
  return {
    key: `s1-mf-${String(session).padStart(2, '0')}`,
    subjectCode: '01',
    subject: 'El Matrimonio y la Familia',
    session,
    title,
    videoId,
    pages,
    bookTitle: 'El Matrimonio y la Familia',
    bookFileId: MF_BOOK,
    week: 0,
  };
}

function sp(session: number, title: string, pages: string, videoId: string): N2nSessionSeed {
  return {
    key: `s1-sp-${String(session).padStart(2, '0')}`,
    subjectCode: '02',
    subject: 'El Sufrimiento y La Pérdida',
    session,
    title,
    videoId,
    pages,
    bookTitle: 'El Sufrimiento y La Pérdida',
    bookFileId: SP_BOOK,
    week: 0,
  };
}

function ld(session: number, title: string, pages: string, videoId: string): N2nSessionSeed {
  return {
    key: `s1-ld-${String(session).padStart(2, '0')}`,
    subjectCode: '12',
    subject: 'Libre por el Decreto Divino',
    session,
    title,
    videoId,
    pages,
    bookTitle: 'Libre por el Decreto Divino',
    bookFileId: LD_BOOK,
    week: 0,
  };
}

function ad(session: number, title: string, pages: string, videoId: string): N2nSessionSeed {
  return {
    key: `s1-ad-${String(session).padStart(2, '0')}`,
    subjectCode: '38',
    subject: 'Alcanzando Su Destino',
    session,
    title,
    videoId,
    pages,
    bookTitle: 'Alcanzando Su Destino',
    bookFileId: AD_BOOK,
    week: 0,
  };
}

function vc(session: number, title: string, pages: string, videoId: string): N2nSessionSeed {
  return {
    key: `s1-vc-${String(session).padStart(2, '0')}`,
    subjectCode: '39',
    subject: 'La Vida Cristiana Victoriosa',
    session,
    title,
    videoId,
    pages,
    bookTitle: 'La Vida Cristiana Victoriosa',
    bookFileId: VC_BOOK,
    week: 0,
  };
}

export const N2N_SEMESTER_1_MF = [
  mf(1, '¿Cómo Define Dios el Matrimonio?', '1-3', 'Qbh6nvbarmA'),
  mf(2, 'El Matrimonio Edificado Sobre Principios Bíblicos', '4-6', 'f3LbAUnsCGs'),
  mf(3, 'Preparándose Para El Matrimonio - Parte 1', '7-9', 'OdFNtFFYavk'),
  mf(4, 'Preparándose Para El Matrimonio - Parte 2', '10-11', '_XjRG6pk5_E'),
  mf(5, 'Andando En Amor - Parte 1', '12-14', 'IS-Bng72XWU'),
  mf(6, 'Andando En Amor - Parte 2', '15-17', '1pd89zpzmCA'),
  mf(7, 'El Poder Para Influir', '18-19', '7uTrbYsYzOc'),
  mf(8, 'Sexualidad - Parte 1', '20-21', 'F5cYmuGrtx8'),
  mf(9, 'Sexualidad - Parte 2', '22-23', 'JYxwsWxvAtk'),
  mf(10, 'La Comunicación Saludable', '24-26', 'uWRFdEPpIIw'),
];

export const N2N_SEMESTER_1_SP = [
  sp(1, 'Introducción y Testimonio Personal', '27-29', 'zXgKo45gR2c'),
  sp(2, 'Entregando Las Preguntas ¿Por qué? A Dios', '30-32', 'ZMsqlPVQy4E'),
  sp(3, 'Aceptando el Camino de la Cruz', '33-34', '1bEaaDmJvDw'),
  sp(4, 'El Proceso de Sanidad', '35-36', '5-5ys0Hc7jY'),
  sp(5, 'Sirviendo a Otros Durante Dolor Personal', '37-39', 'N_auQBl-uoI'),
  sp(6, 'El Fruto de la Sanidad: Recibiendo una Bendición Nueva', '40-42', '3jdu8Ls-xws'),
];

export const N2N_SEMESTER_1_LD = [
  ld(1, 'Introducción Y Resumen', '1-3', '8YXnyTRkX1w'),
  ld(2, 'Apertura Del Caso Penal', '4-5', '9fAHdMJsUaY'),
  ld(3, 'El Caso Continúa', '6-7', '7zi2esKWU3w'),
  ld(4, 'Antejuicio A Favor Del Acusado', '8-9', 'xnrg5jTc7T4'),
  ld(5, 'Justificación Por Fe', '10-11', '8776sxwc3N8'),
  ld(6, 'Santificación Sin Ley', '12-13', 'akxwO1uHATY'),
  ld(7, 'Introducción Al Capítulo 8', '14-15', 'xj3q--LB2Xg'),
  ld(8, 'Israel: Soberanía De Dios', '16-17', 'bUEN7BCOjyI'),
  ld(9, 'Viviendo La Vida Cristiana', '18', 'TrKfR_UWTHg'),
  ld(10, 'Actitudes Hacia El Gobierno Y Los Hermanos Más Débiles', '19-20', 'PnJJyIJMZZM'),
];

export const N2N_SEMESTER_1_AD = [
  ad(1, 'Realizando Su Destino', '1-3', 'G4aC0e-RwC8'),
  ad(2, 'Obstáculos Que Nos Evitan Alcanzar Nuestro Destino', '4-6', 'Yh1PmrZIUvQ'),
  ad(3, 'Creciendo Hacia Nuestro Destino', '7-8', 'kjJgILNqbcU'),
  ad(4, 'Luchando por Su Destino', '9-10', '41por5xRkJg'),
  ad(5, 'Alcanzando Su Destino en Tiempos Difíciles', '11-12', '0AnxF3CNjDc'),
];

export const N2N_SEMESTER_1_VC = [
  vc(1, 'Venciendo La Tentación - Parte 1', '74-76', 'Ryd9mlrexqk'),
  vc(2, 'Venciendo La Tentación - Parte 2', '77-80', 'lNdG8J80-ao'),
];

const byKey = new Map<string, N2nSessionSeed>();
for (const list of [N2N_SEMESTER_1_MF, N2N_SEMESTER_1_SP, N2N_SEMESTER_1_LD, N2N_SEMESTER_1_AD, N2N_SEMESTER_1_VC]) {
  for (const session of list) byKey.set(session.key, session);
}

function session(key: string, week: number): N2nSessionSeed {
  const found = byKey.get(key);
  if (!found) throw new Error(`Sesión N2N no encontrada: ${key}`);
  return { ...found, week };
}

/**
 * Orden exacto del horario oficial. El horario usa 32 sesiones; la quinta
 * sesión de «Alcanzando Su Destino» queda disponible como material adicional,
 * pero no forma parte de las 32 sesiones programadas.
 */
export const N2N_SEMESTER_1_SCHEDULE: N2nSessionSeed[] = [
  session('s1-ad-01', 1),
  session('s1-mf-01', 1),
  session('s1-mf-02', 1),
  session('s1-ad-02', 2),
  session('s1-mf-03', 2),
  session('s1-mf-04', 2),
  session('s1-ad-03', 3),
  session('s1-mf-05', 3),
  session('s1-mf-06', 3),
  session('s1-ad-04', 4),
  session('s1-mf-07', 4),
  session('s1-mf-08', 4),
  session('s1-mf-09', 5),
  session('s1-vc-01', 5),
  session('s1-mf-10', 6),
  session('s1-vc-02', 6),
  session('s1-ld-01', 7),
  session('s1-sp-01', 7),
  session('s1-sp-02', 7),
  session('s1-ld-02', 8),
  session('s1-ld-03', 8),
  session('s1-sp-03', 8),
  session('s1-ld-04', 9),
  session('s1-ld-05', 9),
  session('s1-sp-04', 9),
  session('s1-ld-06', 10),
  session('s1-ld-07', 10),
  session('s1-sp-05', 10),
  session('s1-ld-08', 11),
  session('s1-ld-09', 11),
  session('s1-ld-10', 12),
  session('s1-sp-06', 12),
];

export const N2N_SEMESTER_1_EXTRA_SESSIONS = [N2N_SEMESTER_1_AD[4]];

export interface N2nPlannedSubject {
  code: string;
  name: string;
  professor: string;
  sessions: number;
}

export const N2N_SEMESTER_PLANS: Record<number, N2nPlannedSubject[]> = {
  1: N2N_SEMESTER_1_SUBJECTS.map((subject) => ({
    code: subject.code,
    name: subject.name,
    professor: subject.professor,
    sessions: subject.sessions,
  })),
  2: [
    { code: '47', name: 'Perspectivas Cristianas Mundiales', professor: 'Rev. Harry Vellekoop', sessions: 14 },
    { code: '34', name: 'Discipulado Integral', professor: 'Dr. Francisco Jiménez', sessions: 8 },
    { code: '55', name: 'Introducción a la Hermenéutica', professor: 'Dr. Daniel de los Reyes', sessions: 7 },
    { code: '36', name: 'La Mayordomía y la Verdadera Bendición', professor: 'Rev. Jaime Loya', sessions: 4 },
  ],
  3: [
    { code: '58', name: 'Los Hechos de los Apóstoles', professor: 'Rev. Paul Johansson', sessions: 12 },
    { code: '35', name: 'La Persona del Pastor y su Ministerio', professor: 'Dr. Francisco Jiménez', sessions: 6 },
    { code: '45', name: 'El Líder y su Visión', professor: 'Dr. Otoniel Collins', sessions: 5 },
    { code: '37', name: 'Profecía en la Iglesia', professor: 'Rev. Roberto Evans', sessions: 9 },
  ],
  4: [
    { code: '77', name: 'El Ministerio de los que Ayudan', professor: 'Dr. Buddy Bell', sessions: 10 },
    { code: '49', name: 'Iglecrecimiento', professor: 'Rev. Andrés Rincón', sessions: 7 },
    { code: '71', name: 'Preparación Pastoral', professor: 'Rev. Juan Spyker', sessions: 14 },
  ],
  5: [
    { code: '61', name: 'Completando la Gran Comisión', professor: 'Dr. Roland Vaughan', sessions: 12 },
    { code: '65', name: 'Los Evangelios', professor: 'Dr. Fount Shults', sessions: 14 },
    { code: '118', name: 'Introducción a la Consejería Bíblica', professor: 'Rev. Kathy Barton', sessions: 6 },
  ],
  6: [],
  7: [],
  8: [],
  9: [],
  10: [],
};

export const N2N_SEMESTER_DESCRIPTIONS: Record<number, string> = {
  1: 'Materias oficiales: 01 El Matrimonio y la Familia (10 sesiones), 02 El Sufrimiento y la Pérdida (6), 12 Libre por el Decreto Divino (10), 38 Alcanzando Su Destino (4 programadas de 5 disponibles) y 39 La Vida Cristiana Victoriosa (2). Total: 32 sesiones programadas.',
  2: 'Materias oficiales: 47 Perspectivas Cristianas Mundiales (14 sesiones), 34 Discipulado Integral (8), 55 Introducción a la Hermenéutica (7) y 36 La Mayordomía y la Verdadera Bendición (3-4). Contenido pendiente de carga.',
  3: 'Materias oficiales: 58 Los Hechos de los Apóstoles (12 sesiones), 35 La Persona del Pastor y su Ministerio (6), 45 El Líder y su Visión (5) y 37 Profecía en la Iglesia (9). Contenido pendiente de carga.',
  4: 'Materias oficiales: 77 El Ministerio de los que Ayudan (10 sesiones), 49 Iglecrecimiento (7) y 71 Preparación Pastoral (14). Contenido pendiente de carga.',
  5: 'Materias oficiales: 61 Completando la Gran Comisión (12 sesiones), 65 Los Evangelios (14) y 118 Introducción a la Consejería Bíblica (6). Contenido pendiente de carga.',
  6: 'Semestre pendiente de carga. La carpeta de Drive y la secuencia están preparadas; el contenido se incorporará cuando se entregue el material oficial.',
  7: 'Semestre pendiente de carga. La carpeta de Drive y la secuencia están preparadas; el contenido se incorporará cuando se entregue el material oficial.',
  8: 'Semestre pendiente de carga. La carpeta de Drive y la secuencia están preparadas; el contenido se incorporará cuando se entregue el material oficial.',
  9: 'Semestre pendiente de carga. La carpeta de Drive y la secuencia están preparadas; el contenido se incorporará cuando se entregue el material oficial.',
  10: 'Semestre pendiente de carga. La carpeta de Drive y la secuencia están preparadas; el contenido se incorporará cuando se entregue el material oficial.',
};

export const N2N_PROGRAM_METADATA = {
  structureTemplate: 'n2n',
  sequential: true,
  passPercentage: 60,
  ministryOnly: true,
  academicAccreditation: false,
  credential: 'Diploma/certificado ministerial por semestre',
  sourceUrl: 'https://n2ncu.org/',
  logoUrl: '/brand/n2n/n2ncu-logo-2021.svg',
  coverSource: 'https://n2ncu.org/images/online-mid1-2022.jpg',
  semesterCount: 10,
  scheduledSessionsSemester1: 32,
  availableSessionsSemester1: 33,
  disclaimer:
    'Educación para el ministerio. No otorga título académico ni cuenta con aval académico. Wisdom Academy emite diplomas y certificados ministeriales por semestre.',
};
