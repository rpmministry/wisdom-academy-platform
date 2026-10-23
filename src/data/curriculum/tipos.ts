/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Modelo Curricular Personalizado
 * ARCHIVO: src/data/curriculum/tipos.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Define el contrato de datos que describe la malla curricular real de cada
 * estudiante, sincronizada con las carpetas de Google Drive. Esta capa es
 * exclusivamente de contenido: no contiene lógica de interfaz ni de estado.
 * ==============================================================================
 */

/**
 * Áreas epistemológicas utilizadas para separar el tratamiento académico del
 * tratamiento teológico. Solo el área TEOLOGIA recibe contenido confesional.
 */
export type AreaCurricular =
  | 'LENGUA_Y_LITERATURA'
  | 'MATEMATICAS'
  | 'CIENCIAS_NATURALES'
  | 'ESTUDIOS_SOCIALES'
  | 'LENGUA_EXTRANJERA'
  | 'TECNOLOGIA'
  | 'ARTE'
  | 'EDUCACION_FISICA'
  | 'CIENCIAS_POLITICAS'
  | 'ADMINISTRACION'
  | 'TEOLOGIA';

/**
 * Unidad temática anual. El título, la idea esencial y la aplicación permiten
 * generar 200 jornadas lectivas sin depender de textos genéricos.
 */
export interface UnidadCurricular {
  titulo: string;
  conceptoClave: string;
  aplicacion: string;
}

/**
 * Referencia bibliográfica validada para el nivel y la asignatura.
 */
export interface ReferenciaCurricular {
  titulo: string;
  tipo: 'TEXTO_OFICIAL' | 'UNIVERSITARIO' | 'FUENTE_PRIMARIA' | 'RECURSO_DIGITAL';
}

/**
 * Configuración de la pizarra o laboratorio interactivo de la asignatura.
 */
export interface SimulacionCurricular {
  tipo:
    | 'PYTHON_SANDBOX'
    | 'MATH_EXPLORER'
    | 'SCIENCE_LAB'
    | 'LANGUAGE_STUDIO'
    | 'HISTORY_TIMELINE'
    | 'BIBLE_THEOLOGY'
    | 'ART_CANVAS';
  titulo: string;
  instrucciones: string;
  codigoOTextoInicial?: string;
  demostracionInteractiva: string;
}

/**
 * Pregunta formativa con retroalimentación pedagógica inmediata.
 */
export interface PreguntaCurricular {
  enunciado: string;
  opciones: string[];
  indiceCorrecto: number;
  explicacionPedagogica: string;
}

/**
 * Reto de Aprendizaje Basado en Proyectos para el portafolio MINEDUC.
 */
export interface ProyectoCurricular {
  titulo: string;
  descripcion: string;
  criteriosMineduc: string[];
  entregableEsperado: string;
}

/**
 * Asignatura completa de la malla personalizada de un estudiante.
 */
export interface AsignaturaCurricular {
  codigo: string;
  nombre: string;
  nombreCorto: string;
  area: AreaCurricular;
  profesorIA: 'Prof. Mateo' | 'Dra. Sofía de Valenzuela';
  carpetaDrive: string;
  driveFolderId: string;
  textoPrincipal: string;
  bibliografia: ReferenciaCurricular[];
  enfoqueAcademico: string;
  analisisModelo: string;
  aplicacionVida: string;
  sintesis: string;
  preguntaDisparadora: string;
  objetivos: string[];
  metodo: string[];
  conceptosFundamentales: Array<{ termino: string; definicion: string }>;
  lema: { referencia: string; texto: string };
  tipoGrafico?:
    | 'PIZZA_FRACCIONES'
    | 'RECTA_NUMERICA'
    | 'CELULA_VIVA'
    | 'ARBOL_GRAMATICAL'
    | 'COSMOS_CREACION'
    | 'BALANZA_ALGEBRAICA';
  insigniaGrafico: string;
  simulacion: SimulacionCurricular;
  preguntasQuiz: PreguntaCurricular[];
  retoPbl: ProyectoCurricular;
  unidades: UnidadCurricular[];
}

/**
 * Bloque del horario semanal oficial, tomado del manifiesto de Google Drive.
 */
export interface BloqueHorarioCurricular {
  bloque: number;
  hora: string;
  materia: string;
  modalidad: 'AGENTE_IA_OPENMAIC' | 'TUTORIA_PROFESOR_REAL';
  plataforma?: 'jitsi';
}

/**
 * Perfil curricular completo de un estudiante.
 */
export interface PerfilCurricular {
  estudiante: string;
  grado: string;
  subnivelMineduc: string;
  edad: number;
  codigoCarpetaAnioDrive: string;
  anoLectivo: string;
  asignaturas: AsignaturaCurricular[];
  horarioSemanal: Record<string, BloqueHorarioCurricular[]>;
}

/**
 * Estado de auditoría de una carpeta de Google Drive.
 */
export interface AuditoriaCarpetaDrive {
  codigo: string;
  nombre: string;
  estado: 'COMPLETA' | 'PARCIAL' | 'VACIA' | 'DUPLICADA' | 'ADMINISTRATIVA';
  hallazgos: string[];
  accionRecomendada: string;
}
