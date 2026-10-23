import type { EstudianteWisdom } from '@/types/wisdom';

export type RolUsuario =
  | 'ADMIN'
  | 'TEACHER'
  | 'STUDENT'
  | 'FOUNDER'
  | 'INVESTOR'
  | 'GUARDIAN'
  | 'CUSTOMER';

export interface MatriculaCurso {
  idCurso: number;
  nombre: string;
  codigoCorto: string;
  profesorIA: string;
  estado: 'ACTIVA' | 'SUSPENDIDA' | 'FINALIZADA';
  fechaInicio: string;
  fechaFin: string;
  porcentajeAvance: number;
  notaTrimestre1?: number;
  notaTrimestre2?: number;
  notaTrimestre3?: number;
  promedioFinal?: number;
  recursoSlug?: string;
  origen?: string;
}

export interface UsuarioCuenta {
  id: string;
  usuario: string;
  correo: string;
  /** Campo de compatibilidad para formularios administrativos; nunca se envía en la sesión. */
  contrasenia?: string;
  nombreCompleto: string;
  rol: RolUsuario;
  activo: boolean;
  perfilEstudiante?: EstudianteWisdom | null;
  avatarUrl?: string | null;
  matriculas: MatriculaCurso[];
  roles?: string[];
  permisos?: string[];
  accesoContenidoGlobal?: boolean;
  debeCambiarContrasena?: boolean;
  correoVerificado?: boolean;
  creadoEn?: string;
}

export interface PreguntaBanco {
  id: string;
  enunciado: string;
  opciones: string[];
  respuestaCorrecta: number;
  explicacionSocratica: string;
}

export interface TareaRevision {
  id: string;
  titulo: string;
  descripcion: string;
  rubricaMINEDUC: string;
  ponderacion: number;
}

export interface ConfiguracionProfesorIA {
  id: string;
  nombre: string;
  titulo: string;
  avatar: string;
  materiaAsignada: string;
  personalidad: 'Lúdico y Cercano' | 'Científico y Socrático' | 'Humanista y Reflexivo';
  tonoPedagogico: string;
  versiculoRector: {
    referencia: string;
    texto: string;
  };
  bancoPreguntas: PreguntaBanco[];
  tareasAsignadas: TareaRevision[];
}

export interface SessionPayload {
  ok: true;
  usuario: UsuarioCuenta | null;
  csrfToken: string | null;
  roles: string[];
  permisos: string[];
  googleClientId: string | null;
  paypalConfigured: boolean;
  ownerEmailConfigured: string | null;
}
