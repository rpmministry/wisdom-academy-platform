import { N2N_SEMESTER_PLANS } from './n2nSemester1';

/**
 * Ficha docente del Semestre 1, elaborada con la información publicada en las
 * introducciones de los libros oficiales. No se inventaron credenciales.
 *
 * Las fotos se extrajeron de la primera página de cada libro y se guardan en
 * `public/images/faculty/`. Para semestres sin material cargado se muestran
 * nombres y materias, pero no se atribuyen biografías no verificadas.
 */

export interface FacultyMember {
  id: string;
  name: string;
  title: string;
  photo: string | null;
  shortBio: string;
  fullBio: string;
  credentials: string[];
  focus: string;
  subjects: Array<{ code: string; name: string }>;
  sourceRefs: string[];
  semester: number;
}

export const N2N_FACULTY: FacultyMember[] = [
  {
    id: 'stacy-cline',
    name: 'Rev. Stacy Cline',
    title: 'Decano de Estudiantes · Instituto Bíblico Elim',
    photo: '/images/faculty/mf-1.jpeg',
    shortBio:
      'Pastor de campus, profesor y decano con más de 25 años de servicio en el Instituto Bíblico Elim.',
    fullBio:
      'El Rev. Stacy Cline se ha desempeñado como Decano de Estudiantes en el Instituto Bíblico Elim por más de 25 años. Es descrito en el material oficial como un pastor de campus respetado y un profesor popular, cuyo liderazgo ha ganado los corazones de cientos de estudiantes durante su mandato. En el Semestre 1 acompaña las materias de matrimonio, familia, sufrimiento y pérdida.',
    credentials: [
      'Decano de Estudiantes del Instituto Bíblico Elim por más de 25 años',
      'Pastor de campus y profesor del Instituto Bíblico Elim',
      'Autor de los materiales de El Matrimonio y la Familia y El Sufrimiento y La Pérdida',
    ],
    focus: 'Matrimonio, familia, acompañamiento pastoral y proceso de sanidad.',
    subjects: [
      { code: '01', name: 'El Matrimonio y la Familia' },
      { code: '02', name: 'El Sufrimiento y La Pérdida' },
    ],
    sourceRefs: ['N2-MF-00.pdf, portada e introducción', 'N5-SL-00.pdf, portada e introducción'],
    semester: 1,
  },
  {
    id: 'paul-johansson',
    name: 'Rev. Paul Johansson',
    title: 'Presidente del Instituto Bíblico Elim · Lima, Nueva York',
    photo: '/images/faculty/ld-1.jpeg',
    shortBio:
      'Misionero en África Oriental, presidente del Instituto Bíblico Elim y cofundador de la Escuela de Ministerio Urbano de Nueva York.',
    fullBio:
      'El Reverendo Paul Johansson sirvió como misionero en África Oriental y fue presidente del Instituto Bíblico Elim en Lima, Nueva York. Junto a su esposa Gloria cofundó la Escuela de Ministerio Urbano de Nueva York. Actualmente ministra en seminarios y conferencias en todo el mundo. En el Semestre 1 guía el estudio de Romanos en Libre por el Decreto Divino.',
    credentials: [
      'Misionero en África Oriental',
      'Presidente del Instituto Bíblico Elim, Lima, Nueva York',
      'Cofundador de la Escuela de Ministerio Urbano de Nueva York',
      'Conferencista internacional en seminarios y conferencias',
    ],
    focus: 'Romanos, justificación por fe, gracia y formación ministerial.',
    subjects: [{ code: '12', name: 'Libre por el Decreto Divino' }],
    sourceRefs: ['N4-FD-00.pdf, portada e introducción'],
    semester: 1,
  },
  {
    id: 'brick-cliff',
    name: 'Dr. S. Brick Cliff',
    title: 'Presidente de W.I.N. Ministries',
    photo: '/images/faculty/ad-1.jpeg',
    shortBio:
      'Presidente de W.I.N. Ministries, dedicado al entrenamiento de liderazgo cristiano alrededor del mundo.',
    fullBio:
      'El Dr. S. Brick Cliff es Presidente de W.I.N. Ministries (Impactando al Mundo Ahora), una organización cristiana dedicada al entrenamiento de liderazgo alrededor del mundo. Él y su esposa Beth han servido como misioneros desde 1987. En el Semestre 1 acompaña Alcanzando Su Destino y La Vida Cristiana Victoriosa, con énfasis en propósito, perseverancia y victoria sobre la tentación.',
    credentials: [
      'Presidente de W.I.N. Ministries (Impactando al Mundo Ahora)',
      'Entrenamiento de liderazgo cristiano a nivel internacional',
      'Misionero junto a su esposa Beth desde 1987',
    ],
    focus: 'Propósito, liderazgo, perseverancia y vida cristiana victoriosa.',
    subjects: [
      { code: '38', name: 'Alcanzando Su Destino' },
      { code: '39', name: 'La Vida Cristiana Victoriosa' },
    ],
    sourceRefs: ['38-RYD-5 Sesiones.pdf, portada e introducción', 'N3-VC-00.pdf, portada e introducción'],
    semester: 1,
  },
];

function futureFacultyForSemester(semester: number): FacultyMember[] {
  const plan = N2N_SEMESTER_PLANS[semester] || [];
  const byProfessor = new Map<string, Array<{ code: string; name: string }>>();
  for (const subject of plan) {
    const current = byProfessor.get(subject.professor) || [];
    current.push({ code: subject.code, name: subject.name });
    byProfessor.set(subject.professor, current);
  }
  return [...byProfessor.entries()].map(([professor, subjects]) => ({
    id: `future-${semester}-${professor.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: professor,
    title: 'Profesor del semestre',
    photo: null,
    shortBio: 'Perfil pendiente de los materiales oficiales de este semestre.',
    fullBio:
      'La biografía y las credenciales se incorporarán cuando la institución entregue el material oficial del semestre. No se generan datos académicos no verificados.',
    credentials: [],
    focus: subjects.map((subject) => subject.name).join(' · '),
    subjects,
    sourceRefs: ['Plan de estudios N2N del semestre'],
    semester,
  }));
}

export function getFacultyForSemester(semester: number): FacultyMember[] {
  if (semester === 1) return N2N_FACULTY;
  return futureFacultyForSemester(semester);
}
