/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Definiciones de Tipos Globales
 * ARCHIVO: src/types/wisdom.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Establece el modelo de dominio central para la educación Homeschool en Ecuador
 * (MINEDUC K-12), incorporando la cosmovisión cristiana evangélica, perfiles
 * pedagógicos de IA diferenciados por edad, gestión de portafolios legales,
 * horarios escolares y paquetes de estudio offline.
 * ==============================================================================
 */

/**
 * Rol responsable de la administración del portafolio según la edad del alumno y MINEDUC:
 * - PADRE_MENTOR: Para educación elemental y media (e.g. Gael, 8 años, 4° EGB).
 * - ESTUDIANTE_AUTONOMO: Para básica superior y bachillerato (e.g. Avril, 12 años, 8° EGB).
 */
export type ResponsablePortafolio = 'PADRE_MENTOR' | 'ESTUDIANTE_AUTONOMO';

/**
 * Identificador de perfil pedagógico en el motor multi-agente OpenMAIC.
 */
export type PerfilAgentePedagogico =
  | 'elementary_gael_8yo'
  | 'middle_school_avril_12yo'
  | 'general_k12'
  | 'general_k12_and_workshops';

/**
 * Idiomas oficiales soportados en el modelo bilingüe de Wisdom Academy.
 */
export type IdiomaPlataforma = 'ES' | 'EN';

/**
 * Plataformas soportadas en el Hub Multicanal de Videollamadas con Profesores Reales.
 */
export type PlataformaVideollamada =
  | 'jitsi'
  | 'bigbluebutton'
  | 'google_meet'
  | 'zoom'
  | 'microsoft_teams';

/**
 * Modalidad de instrucción en cada bloque de la jornada escolar.
 */
export type ModalidadInstruccion =
  | 'AGENTE_IA_OPENMAIC'
  | 'TUTORIA_PROFESOR_REAL'
  | 'RECREO_ACTIVO'
  | 'ESTUDIO_AUTONOMO';

/**
 * Entidad principal que representa a un estudiante matriculado en Wisdom Academy.
 */
export interface EstudianteWisdom {
  idMoodle: number;
  nombreCompleto: string;
  edad: number;
  gradoEcuador: string;
  grado?: string;
  subnivelMineduc: string;
  codigoCarpetaAnioDrive: string;
  perfilAgente: PerfilAgentePedagogico;
  idiomaPreferido: IdiomaPlataforma;
  responsablePortafolio: ResponsablePortafolio;
  versiculoBiblicoLema: {
    referencia: string;
    texto: string;
  };
  emailMentorPadre?: string;
}

/**
 * Curso o materia registrada en el LMS Moodle asociada a un grado o taller.
 */
export interface CursoMoodleWisdom {
  id: number;
  nombre: string;
  codigoCorto: string;
  categoriaGrado: string;
  porcentajeAvance: number;
  versiculoLema: string;
  estadoCertificacion: 'EN_CURSO' | 'COMPLETADO' | 'NO_INICIADO';
  urlGuiaPdfDrive?: string;
}

/**
 * Bloque individual dentro del horario escolar diario del alumno.
 */
export interface BloqueHorarioDia {
  id: string;
  numeroBloque: number;
  horaInicio: string; // Formato "HH:MM" (e.g. "08:30")
  horaFin: string;    // Formato "HH:MM" (e.g. "09:05")
  nombreMateria: string;
  modalidad: ModalidadInstruccion;
  plataformaTutoria?: PlataformaVideollamada;
  urlSesionTutoria?: string;
  archivoDriveTema?: string;
  versiculoBloque?: string;
}

/**
 * Paquete de estudio descargable para trabajo sin internet (Offline-First).
 */
export interface RecursoGuiaOffline {
  idCurso: number | string;
  tituloMateriaBilingue: {
    es: string;
    en: string;
  };
  versiculoLema: string;
  urlGuiaPdfMoodle: string;
  urlPaqueteHtmlInteractivo: string;
  tamanoBytes: number;
  fechaSincronizacion: string;
  disponibleOffline: boolean;
  mensaje?: string;
}

/**
 * Evidencia del Portafolio Homeschool Ecuador conforme a acuerdos ministeriales.
 */
export interface EvidenciaPortafolioEcuador {
  id: string;
  idEstudiante: number;
  semanaNumero: number;
  trimestre: 1 | 2 | 3;
  categoria:
    | 'INVESTIGACION'
    | 'LECTURA_EN_VOZ_ALTA'
    | 'FORMACION_ESPIRITUAL'
    | 'ARTE_Y_CULTURA'
    | 'DEPORTE_Y_SALUD'
    | 'PROYECTO_PBL'
    | 'ACTA_ENTREVISTA_DOCENTE';
  titulo: string;
  descripcion: string;
  archivoAdjuntoUrl?: string;
  fechaRegistro: string;
  calificacionFormativa?: number; // Escala sobre 10 según MINEDUC
  retroalimentacionMentor?: string;
}

/**
 * ==============================================================================
 * CONSTANTES PRECONFIGURADAS DE LOS DOS PRIMEROS ESTUDIANTES OFICIALES
 * ==============================================================================
 */

/**
 * Perfil Inicial de Gael: 8 años, 4° de EGB (Básica Elemental Ecuador).
 * Gobernanza del portafolio por el Padre-Mentor según normativa ministerial.
 */
export const ESTUDIANTE_GAEL_INICIAL: EstudianteWisdom = {
  idMoodle: 104,
  nombreCompleto: 'Gael Andrade Sanchez',
  edad: 8,
  gradoEcuador: '4° de EGB',
  grado: '4° de EGB',
  subnivelMineduc: 'Básica Elemental',
  codigoCarpetaAnioDrive: '04_Cuarto_EGB_Gael',
  perfilAgente: 'elementary_gael_8yo',
  idiomaPreferido: 'ES',
  responsablePortafolio: 'PADRE_MENTOR',
  versiculoBiblicoLema: {
    referencia: 'Proverbios 2:6',
    texto: 'Porque Jehová da la sabiduría, y de su boca viene el conocimiento y la inteligencia.',
  },
  emailMentorPadre: 'mauriandrade2@gmail.com',
};

/**
 * Perfil Inicial de Avril: 12 años, 8° de EGB (Básica Superior Ecuador).
 * Autogestión del portafolio por el estudiante con acompañamiento de mentores.
 */
export const ESTUDIANTE_AVRIL_INICIAL: EstudianteWisdom = {
  idMoodle: 108,
  nombreCompleto: 'Avril Andrade Sanchez',
  edad: 12,
  gradoEcuador: '8° de EGB',
  grado: '8° de EGB',
  subnivelMineduc: 'Básica Superior',
  codigoCarpetaAnioDrive: '08_Octavo_EGB_Avril',
  perfilAgente: 'middle_school_avril_12yo',
  idiomaPreferido: 'ES',
  responsablePortafolio: 'ESTUDIANTE_AUTONOMO',
  versiculoBiblicoLema: {
    referencia: 'Colosenses 2:3',
    texto: 'En quien están escondidos todos los tesoros de la sabiduría y del conocimiento.',
  },
  emailMentorPadre: 'mauriandrade2@gmail.com',
};

