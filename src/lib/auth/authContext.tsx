'use client';

/**
 * Sesión de Wisdom Academy respaldada por el servidor.
 *
 * La identidad y los permisos provienen de `/api/auth/session`; nunca se
 * persisten usuarios, roles ni contraseñas en localStorage. El token CSRF se
 * conserva en memoria y se envía en cada operación mutable.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { EstudianteWisdom } from '@/types/wisdom';
import { apiFetch, errorMessage, setApiCsrfToken } from '@/lib/api/client';
import type {
  ConfiguracionProfesorIA,
  MatriculaCurso,
  PreguntaBanco,
  RolUsuario,
  TareaRevision,
  UsuarioCuenta,
} from './types';

export type {
  ConfiguracionProfesorIA,
  MatriculaCurso,
  PreguntaBanco,
  RolUsuario,
  TareaRevision,
  UsuarioCuenta,
} from './types';

const PERFIL_NEUTRO: EstudianteWisdom = {
  idMoodle: 0,
  nombreCompleto: 'Estudiante',
  edad: 12,
  gradoEcuador: 'Sin grado asignado',
  subnivelMineduc: '',
  codigoCarpetaAnioDrive: '',
  perfilAgente: 'general_k12',
  idiomaPreferido: 'ES',
  responsablePortafolio: 'ESTUDIANTE_AUTONOMO',
  versiculoBiblicoLema: {
    referencia: 'Proverbios 2:6',
    texto: 'Porque Jehová da la sabiduría, y de su boca viene el conocimiento.',
  },
};

/** Cohortes curriculares de referencia para el gestor de matrículas. */
export const MATRICULAS_GAEL: MatriculaCurso[] = [
  [401, 'Matemáticas', 'MAT4', 'Prof. Mateo'],
  [402, 'Lengua y Literatura', 'LIT4', 'Prof. Mateo'],
  [403, 'Ciencias Naturales', 'CIE4', 'Prof. Mateo'],
  [404, 'Estudios Sociales del Ecuador', 'SOC4', 'Prof. Mateo'],
  [405, 'English Phonics & Reading', 'ENG4', 'Prof. Mateo'],
  [406, 'Software y Programación', 'PRG4', 'Prof. Mateo'],
  [407, 'Educación Cultural y Artística (ECA)', 'ECA4', 'Prof. Mateo'],
  [408, 'Educación Física y Salud', 'EFI4', 'Prof. Mateo'],
  [409, 'Relación con Dios', 'RDD4', 'Prof. Mateo'],
].map(([idCurso, nombre, codigoCorto, profesorIA]) => ({
  idCurso: Number(idCurso),
  nombre: String(nombre),
  codigoCorto: String(codigoCorto),
  profesorIA: String(profesorIA),
  estado: 'ACTIVA',
  fechaInicio: '2026-09-01',
  fechaFin: '2027-06-30',
  porcentajeAvance: 0,
}));

export const MATRICULAS_AVRIL: MatriculaCurso[] = [
  [801, 'Matemáticas y Pre-Álgebra', 'MAT8', 'Dra. Sofía de Valenzuela'],
  [802, 'Lengua y Literatura', 'LIT8', 'Dra. Sofía de Valenzuela'],
  [803, 'Ciencias Naturales Integradas', 'CIE8', 'Dra. Sofía de Valenzuela'],
  [804, 'Estudios Sociales e Historia del Ecuador', 'SOC8', 'Dra. Sofía de Valenzuela'],
  [805, 'Academic English & Literature', 'ENG8', 'Dra. Sofía de Valenzuela'],
  [806, 'Software y Programación Python', 'PRG8', 'Dra. Sofía de Valenzuela'],
  [807, 'Ciencias Políticas y Relaciones Internacionales', 'CPO8', 'Dra. Sofía de Valenzuela'],
  [808, 'Administración y Marketing Digital', 'ADM8', 'Dra. Sofía de Valenzuela'],
  [809, 'Educación Cultural y Artística (ECA)', 'ECA8', 'Dra. Sofía de Valenzuela'],
  [810, 'Educación Física y Salud', 'EFI8', 'Dra. Sofía de Valenzuela'],
  [811, 'Relación con Dios (Teología y Cosmovisión)', 'TEO8', 'Dra. Sofía de Valenzuela'],
].map(([idCurso, nombre, codigoCorto, profesorIA]) => ({
  idCurso: Number(idCurso),
  nombre: String(nombre),
  codigoCorto: String(codigoCorto),
  profesorIA: String(profesorIA),
  estado: 'ACTIVA',
  fechaInicio: '2026-09-01',
  fechaFin: '2027-06-30',
  porcentajeAvance: 0,
}));

const PROFESORES_IA_SEMILLA: ConfiguracionProfesorIA[] = [
  {
    id: 'mateo',
    nombre: 'Prof. Mateo',
    titulo: 'Tutor Lúdico K-12 (Básica Elemental)',
    avatar: '/brand/teachers/profesor-mateo.jpg',
    materiaAsignada:
      'Malla completa de 4.° EGB: Matemáticas, Lengua, Ciencias, Sociales, Inglés, Programación, Arte, Educación Física y Relación con Dios',
    personalidad: 'Lúdico y Cercano',
    tonoPedagogico:
      'Explicaciones visuales, analogías concretas, fracciones con pizzas y entusiasmo socrático.',
    versiculoRector: {
      referencia: 'Principio de aprendizaje activo',
      texto:
        'El conocimiento se construye con curiosidad, práctica deliberada y retroalimentación.',
    },
    bancoPreguntas: [
      {
        id: 'bp_m1',
        enunciado: '¿Cuántos cuartos (1/4) forman un medio (1/2)?',
        opciones: ['1 cuarto', '2 cuartos', '3 cuartos', '4 cuartos'],
        respuestaCorrecta: 1,
        explicacionSocratica:
          'Al juntar dos rebanadas de un cuarto, cubrimos exactamente la mitad del círculo entero.',
      },
      {
        id: 'bp_m2',
        enunciado:
          'Si dividimos una pizza en 6 partes iguales y tomamos 2, ¿qué fracción equivalente representa?',
        opciones: ['1/2', '1/3', '1/4', '2/3'],
        respuestaCorrecta: 1,
        explicacionSocratica:
          '2/6 se simplifica dividiendo numerador y denominador entre 2, dando 1/3.',
      },
    ],
    tareasAsignadas: [
      {
        id: 'tar_m1',
        titulo: 'Merienda Fraccionaria en Familia (PBL)',
        descripcion:
          'Fotografía para el Portafolio Ministerial dividiendo alimentos reales en partes iguales.',
        rubricaMINEDUC:
          'Identificación correcta de numerador y denominador con evidencia fotográfica.',
        ponderacion: 50,
      },
    ],
  },
  {
    id: 'sofia',
    nombre: 'Dra. Sofía de Valenzuela',
    titulo: 'Catedrática de Ciencias y Filosofía (Básica Superior)',
    avatar: '/brand/teachers/profesora-sofia.jpg',
    materiaAsignada:
      'Malla completa de 8.° EGB: Matemáticas, Lengua, Ciencias, Sociales, Inglés, Programación, Ciencias Políticas, Administración, Arte, Educación Física y Teología',
    personalidad: 'Científico y Socrático',
    tonoPedagogico:
      'Rigor lógico, análisis deductivo, historia de las matemáticas y pensamiento crítico.',
    versiculoRector: {
      referencia: 'Principio de rigor académico',
      texto: 'Toda afirmación debe sostenerse en evidencia y razonamiento verificable.',
    },
    bancoPreguntas: [
      {
        id: 'bp_s1',
        enunciado: '¿Cuál es el resultado de -5 + (-8) en el conjunto ℤ?',
        opciones: ['-13', '+13', '-3', '+3'],
        respuestaCorrecta: 0,
        explicacionSocratica:
          'Al sumar dos números con el mismo signo negativo, sus magnitudes se acumulan y se conserva el signo.',
      },
      {
        id: 'bp_s2',
        enunciado: '¿Cuál es el valor absoluto de |-15|?',
        opciones: ['-15', '15', '0', '30'],
        respuestaCorrecta: 1,
        explicacionSocratica:
          'El valor absoluto mide la distancia sin signo respecto al origen en la recta numérica.',
      },
    ],
    tareasAsignadas: [
      {
        id: 'tar_s1',
        titulo: 'Modelo de Presupuesto Financiero Cristiano',
        descripcion:
          'Hoja de balance usando números enteros ℤ para ingresos y egresos con diezmo bíblico.',
        rubricaMINEDUC:
          'Aplicación correcta de leyes de signos y balance contable equilibrado.',
        ponderacion: 60,
      },
    ],
  },
];

export interface ResultadoAutenticacion {
  exito: boolean;
  mensaje: string;
  rol?: RolUsuario;
  debeCambiarContrasena?: boolean;
}

export interface AuthContextType {
  usuario: UsuarioCuenta | null;
  sesionLista: boolean;
  estudianteActivo: EstudianteWisdom;
  esAdmin: boolean;
  esDocente: boolean;
  esEstudiante: boolean;
  accesoContenidoGlobal: boolean;
  temaOscuro: boolean;
  idiomaIngles: boolean;
  autenticar: (usuarioOCorreo: string, contrasenia: string) => Promise<ResultadoAutenticacion>;
  iniciarSesionGoogle: (credential: string) => Promise<ResultadoAutenticacion>;
  cerrarSesion: () => Promise<void>;
  refrescarSesion: () => Promise<UsuarioCuenta | null>;
  tienePermiso: (permiso: string) => boolean;
  alternarTema: () => void;
  alternarIdioma: () => void;
  seleccionarEstudiante: (estudiante: EstudianteWisdom) => void;
  usuariosRegistrados: UsuarioCuenta[];
  crearNuevoEstudiante: (nuevo: {
    usuario?: string;
    correo: string;
    contrasenia?: string;
    nombreCompleto: string;
    gradoEcuador: string;
    edad: number;
    emailMentorPadre?: string;
  }) => Promise<ResultadoAutenticacion>;
  actualizarUsuario: (id: string, updates: Partial<UsuarioCuenta>) => Promise<void>;
  eliminarUsuario: (id: string) => Promise<void>;
  matricularEstudianteEnCurso: (usuarioId: string, matricula: MatriculaCurso) => Promise<void>;
  actualizarCalificacionMatricula: (
    usuarioId: string,
    idCurso: number,
    trimestre: 1 | 2 | 3,
    nota: number
  ) => Promise<void>;
  profesoresIAConfiguracion: ConfiguracionProfesorIA[];
  actualizarProfesorIA: (id: string, updates: Partial<ConfiguracionProfesorIA>) => void;
  obtenerApuntesEstudiante: (cursoId: string | number, leccionId: string | number) => string;
  guardarApuntesEstudiante: (
    cursoId: string | number,
    leccionId: string | number,
    texto: string
  ) => void;
  obtenerHistorialOpenMAIC: () => Array<{ remitente: string; texto: string; timestamp: string }>;
  guardarHistorialOpenMAIC: (mensaje: {
    remitente: string;
    texto: string;
    timestamp: string;
  }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface SessionResponse {
  ok: boolean;
  usuario: UsuarioCuenta | null;
  csrfToken: string | null;
  roles: string[];
  permisos: string[];
  googleClientId: string | null;
  paypalConfigured: boolean;
}

interface LoginResponse {
  ok: boolean;
  usuario: UsuarioCuenta;
  csrfToken: string;
  debeCambiarContrasena?: boolean;
  creada?: boolean;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioCuenta | null>(null);
  const [sesionLista, setSesionLista] = useState(false);
  const [usuariosRegistrados, setUsuariosRegistrados] = useState<UsuarioCuenta[]>([]);
  const [estudianteActivo, setEstudianteActivo] = useState<EstudianteWisdom>(PERFIL_NEUTRO);
  const [profesoresIAConfiguracion, setProfesoresIAConfiguracion] = useState<
    ConfiguracionProfesorIA[]
  >(PROFESORES_IA_SEMILLA);
  const [temaOscuro, setTemaOscuro] = useState(false);
  const [idiomaIngles, setIdiomaIngles] = useState(false);
  const csrfRef = useRef<string | null>(null);

  const puedeCon = useCallback((user: UsuarioCuenta | null, permiso: string): boolean => {
    if (!user) return false;
    if (user.roles?.includes('platform_owner')) return true;
    return Boolean(user.permisos?.includes(permiso));
  }, []);

  const adoptarUsuario = useCallback(
    (nuevo: UsuarioCuenta | null) => {
      setUsuario(nuevo);
      if (nuevo?.perfilEstudiante) {
        setEstudianteActivo(nuevo.perfilEstudiante);
      } else {
        setEstudianteActivo(PERFIL_NEUTRO);
      }
    },
    []
  );

  const cargarUsuariosAdmin = useCallback(
    async (user: UsuarioCuenta | null) => {
      if (!user || !puedeCon(user, 'users.read')) {
        setUsuariosRegistrados(user ? [user] : []);
        return;
      }
      try {
        const response = await apiFetch<{ ok: boolean; usuarios: UsuarioCuenta[] }>(
          '/api/admin/users'
        );
        setUsuariosRegistrados(response.usuarios);
      } catch {
        setUsuariosRegistrados([user]);
      }
    },
    [puedeCon]
  );

  const refrescarSesion = useCallback(async (): Promise<UsuarioCuenta | null> => {
    try {
      const response = await apiFetch<SessionResponse>('/api/auth/session');
      csrfRef.current = response.csrfToken;
      setApiCsrfToken(response.csrfToken);
      adoptarUsuario(response.usuario);
      // La lista administrativa se carga en segundo plano: nunca debe bloquear
      // el acceso ni la primera pintura del panel.
      void cargarUsuariosAdmin(response.usuario);
      return response.usuario;
    } catch {
      csrfRef.current = null;
      setApiCsrfToken(null);
      adoptarUsuario(null);
      setUsuariosRegistrados([]);
      return null;
    }
  }, [adoptarUsuario, cargarUsuariosAdmin]);

  useEffect(() => {
    try {
      localStorage.removeItem('wa_registered_users');
      localStorage.removeItem('wa_current_user_id');
      localStorage.removeItem('wa_session_role');
      localStorage.removeItem('wa_session_version');
      const profesoresLocales = localStorage.getItem('wa_ai_professors_config');
      if (profesoresLocales) {
        const parsed = JSON.parse(profesoresLocales) as ConfiguracionProfesorIA[];
        if (Array.isArray(parsed) && parsed.length > 0) setProfesoresIAConfiguracion(parsed);
      }
      const temaGuardado = localStorage.getItem('wa_theme');
      if (temaGuardado === 'dark') {
        setTemaOscuro(true);
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch {
      // Almacenamiento no disponible: se continúa con valores por defecto.
    }

    refrescarSesion().finally(() => setSesionLista(true));
  }, [refrescarSesion]);

  const iniciarSesionConRespuesta = useCallback(
    async (nuevo: LoginResponse, mensaje: string): Promise<ResultadoAutenticacion> => {
      csrfRef.current = nuevo.csrfToken;
      setApiCsrfToken(nuevo.csrfToken);
      adoptarUsuario(nuevo.usuario);
      // El inicio de sesión devuelve el control de inmediato. Los datos
      // administrativos se completan sin retrasar la redirección al panel.
      void cargarUsuariosAdmin(nuevo.usuario);
      return {
        exito: true,
        mensaje,
        rol: nuevo.usuario.rol,
        debeCambiarContrasena:
          nuevo.debeCambiarContrasena || nuevo.usuario.debeCambiarContrasena || false,
      };
    },
    [adoptarUsuario, cargarUsuariosAdmin]
  );

  const autenticar = useCallback(
    async (usuarioOCorreo: string, contrasenia: string): Promise<ResultadoAutenticacion> => {
      try {
        const response = await apiFetch<LoginResponse>('/api/auth/login', {
          body: { identificador: usuarioOCorreo, contrasenia },
        });
        return iniciarSesionConRespuesta(response, `Bienvenido, ${response.usuario.nombreCompleto}`);
      } catch (error) {
        return { exito: false, mensaje: errorMessage(error) };
      }
    },
    [iniciarSesionConRespuesta]
  );

  const iniciarSesionGoogle = useCallback(
    async (credential: string): Promise<ResultadoAutenticacion> => {
      try {
        const response = await apiFetch<LoginResponse>('/api/auth/google', {
          body: { credential },
        });
        return iniciarSesionConRespuesta(
          response,
          `Bienvenido, ${response.usuario.nombreCompleto}`
        );
      } catch (error) {
        return { exito: false, mensaje: errorMessage(error) };
      }
    },
    [iniciarSesionConRespuesta]
  );

  const cerrarSesion = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // La cookie se limpia igualmente en el cliente.
    }
    csrfRef.current = null;
    setApiCsrfToken(null);
    adoptarUsuario(null);
    setUsuariosRegistrados([]);
  }, [adoptarUsuario]);

  const alternarTema = useCallback(() => {
    // Los efectos secundarios se ejecutan fuera del actualizador de estado:
    // React puede invocar el actualizador más de una vez en desarrollo.
    const nuevo = !temaOscuro;
    const temaStr = nuevo ? 'dark' : 'light';
    setTemaOscuro(nuevo);
    document.documentElement.setAttribute('data-theme', temaStr);
    try {
      localStorage.setItem('wa_theme', temaStr);
    } catch {
      // Preferencia no persistida.
    }
  }, [temaOscuro]);

  const alternarIdioma = () => setIdiomaIngles((prev) => !prev);

  const seleccionarEstudiante = (estudiante: EstudianteWisdom) => {
    setEstudianteActivo(estudiante);
  };

  const crearNuevoEstudiante = useCallback(
    async (nuevo: {
      usuario?: string;
      correo: string;
      contrasenia?: string;
      nombreCompleto: string;
      gradoEcuador: string;
      edad: number;
      emailMentorPadre?: string;
    }): Promise<ResultadoAutenticacion> => {
      try {
        const response = await apiFetch<{
          ok: boolean;
          usuario: UsuarioCuenta;
          passwordInicial: string | null;
          mensaje: string;
        }>('/api/admin/users', {
          body: {
            email: nuevo.correo,
            nombreCompleto: nuevo.nombreCompleto,
            password: nuevo.contrasenia || undefined,
            studentProfile: {
              age: nuevo.edad,
              grade: nuevo.gradoEcuador,
              subnivel: nuevo.edad <= 10 ? 'Básica Elemental' : 'Básica Superior',
              profileAgent: nuevo.edad <= 10 ? 'elementary_gael_8yo' : 'middle_school_avril_12yo',
              mentorEmail: nuevo.emailMentorPadre,
            },
          },
        });
        await cargarUsuariosAdmin(usuario);
        return {
          exito: true,
          mensaje: response.passwordInicial
            ? `${response.mensaje} Contraseña inicial: ${response.passwordInicial}`
            : response.mensaje,
        };
      } catch (error) {
        return { exito: false, mensaje: errorMessage(error) };
      }
    },
    [cargarUsuariosAdmin, usuario]
  );

  const actualizarUsuario = useCallback(
    async (id: string, updates: Partial<UsuarioCuenta>): Promise<void> => {
      try {
        if (updates.contrasenia) {
          await apiFetch(`/api/admin/users/${encodeURIComponent(id)}/password`, {
            method: 'POST',
            body: { password: updates.contrasenia },
          });
        }
        if (updates.nombreCompleto !== undefined || updates.activo !== undefined) {
          await apiFetch(`/api/admin/users/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: {
              ...(updates.nombreCompleto !== undefined
                ? { nombreCompleto: updates.nombreCompleto }
                : {}),
              ...(updates.activo !== undefined
                ? { estado: updates.activo ? 'active' : 'suspended' }
                : {}),
            },
          });
        }
        await cargarUsuariosAdmin(usuario);
      } catch (error) {
        console.warn('[auth] No fue posible actualizar el usuario:', errorMessage(error));
      }
    },
    [cargarUsuariosAdmin, usuario]
  );

  const eliminarUsuario = useCallback(
    async (id: string): Promise<void> => {
      try {
        await apiFetch(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
        await cargarUsuariosAdmin(usuario);
      } catch (error) {
        console.warn('[auth] No fue posible suspender el usuario:', errorMessage(error));
      }
    },
    [cargarUsuariosAdmin, usuario]
  );

  const matricularEstudianteEnCurso = useCallback(
    async (usuarioId: string, matricula: MatriculaCurso): Promise<void> => {
      try {
        await apiFetch(`/api/admin/users/${encodeURIComponent(usuarioId)}/enrollments`, {
          body: {
            legacyCourseId: matricula.idCurso,
            startsAt: matricula.fechaInicio,
            endsAt:
              matricula.fechaFin && matricula.fechaFin !== 'Sin vencimiento'
                ? `${matricula.fechaFin}T23:59:59.000Z`
                : null,
            unlimited: !matricula.fechaFin || matricula.fechaFin === 'Sin vencimiento',
          },
        });
        await cargarUsuariosAdmin(usuario);
      } catch (error) {
        console.warn('[auth] No fue posible crear la matrícula:', errorMessage(error));
      }
    },
    [cargarUsuariosAdmin, usuario]
  );

  const actualizarCalificacionMatricula = useCallback(
    async (
      usuarioId: string,
      idCurso: number,
      trimestre: 1 | 2 | 3,
      nota: number
    ): Promise<void> => {
      try {
        await apiFetch(`/api/admin/users/${encodeURIComponent(usuarioId)}/grades`, {
          body: { legacyCourseId: idCurso, trimestre, nota },
        });
        await cargarUsuariosAdmin(usuario);
      } catch (error) {
        console.warn('[auth] No fue posible registrar la calificación:', errorMessage(error));
      }
    },
    [cargarUsuariosAdmin, usuario]
  );

  const persistirProfesoresIA = (nuevos: ConfiguracionProfesorIA[]) => {
    setProfesoresIAConfiguracion(nuevos);
    try {
      localStorage.setItem('wa_ai_professors_config', JSON.stringify(nuevos));
    } catch {
      // Preferencia local no persistida.
    }
  };

  const actualizarProfesorIA = (id: string, updates: Partial<ConfiguracionProfesorIA>) => {
    persistirProfesoresIA(
      profesoresIAConfiguracion.map((profesor) =>
        profesor.id === id ? { ...profesor, ...updates } : profesor
      )
    );
  };

  const obtenerApuntesEstudiante = (
    cursoId: string | number,
    leccionId: string | number
  ): string => {
    if (!usuario) return '';
    try {
      return (
        localStorage.getItem(`wa_tenant_${usuario.id}_notes_${cursoId}_${leccionId}`) || ''
      );
    } catch {
      return '';
    }
  };

  const guardarApuntesEstudiante = (
    cursoId: string | number,
    leccionId: string | number,
    texto: string
  ): void => {
    if (!usuario) return;
    try {
      localStorage.setItem(`wa_tenant_${usuario.id}_notes_${cursoId}_${leccionId}`, texto);
    } catch {
      // Sin persistencia local.
    }
  };

  const obtenerHistorialOpenMAIC = (): Array<{
    remitente: string;
    texto: string;
    timestamp: string;
  }> => {
    if (!usuario) return [];
    try {
      const data = localStorage.getItem(`wa_tenant_${usuario.id}_openmaic_history`);
      return data ? (JSON.parse(data) as Array<{ remitente: string; texto: string; timestamp: string }>) : [];
    } catch {
      return [];
    }
  };

  const guardarHistorialOpenMAIC = (mensaje: {
    remitente: string;
    texto: string;
    timestamp: string;
  }): void => {
    if (!usuario) return;
    try {
      const actual = obtenerHistorialOpenMAIC();
      localStorage.setItem(
        `wa_tenant_${usuario.id}_openmaic_history`,
        JSON.stringify([...actual, mensaje].slice(-200))
      );
    } catch {
      // Sin persistencia local.
    }
  };

  const esAdmin = puedeCon(usuario, 'admin.access');
  const esDocente = puedeCon(usuario, 'content.access_all') && !esAdmin;
  const esEstudiante = usuario?.rol === 'STUDENT';
  const accesoContenidoGlobal = Boolean(usuario?.accesoContenidoGlobal);
  const tienePermiso = useCallback(
    (permiso: string) => puedeCon(usuario, permiso),
    [puedeCon, usuario]
  );

  const valor = useMemo<AuthContextType>(
    () => ({
      usuario,
      sesionLista,
      estudianteActivo,
      esAdmin,
      esDocente,
      esEstudiante,
      accesoContenidoGlobal,
      temaOscuro,
      idiomaIngles,
      autenticar,
      iniciarSesionGoogle,
      cerrarSesion,
      refrescarSesion,
      tienePermiso,
      alternarTema,
      alternarIdioma,
      seleccionarEstudiante,
      usuariosRegistrados,
      crearNuevoEstudiante,
      actualizarUsuario,
      eliminarUsuario,
      matricularEstudianteEnCurso,
      actualizarCalificacionMatricula,
      profesoresIAConfiguracion,
      actualizarProfesorIA,
      obtenerApuntesEstudiante,
      guardarApuntesEstudiante,
      obtenerHistorialOpenMAIC,
      guardarHistorialOpenMAIC,
    }),
    // Las funciones se recrean con el usuario y sus permisos; el valor se
    // recalcula para que ningún componente conserve privilegios obsoletos.
    [
      usuario,
      sesionLista,
      estudianteActivo,
      esAdmin,
      esDocente,
      esEstudiante,
      accesoContenidoGlobal,
      temaOscuro,
      idiomaIngles,
      autenticar,
      iniciarSesionGoogle,
      cerrarSesion,
      refrescarSesion,
      tienePermiso,
      usuariosRegistrados,
      crearNuevoEstudiante,
      actualizarUsuario,
      eliminarUsuario,
      matricularEstudianteEnCurso,
      actualizarCalificacionMatricula,
      profesoresIAConfiguracion,
    ]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
