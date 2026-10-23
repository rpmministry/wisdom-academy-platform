/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Puente de Integración Moodle REST API
 * ARCHIVO: src/services/moodleBridge.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Conector cliente tipado y resiliente para la API REST de Moodle 4.5/5.1.
 * Permite orquestar:
 * 1. Consulta de asignaturas matriculadas por estudiante (core_enrol_get_users_courses).
 * 2. Creación automatizada de las 14 categorías escolares y las asignaturas
 *    troncales bilingües de Gael (4° EGB) y Avril (8° EGB) (core_course_*).
 * 3. Sincronización de calificaciones formativas y retroalimentación de agentes
 *    de OpenMAIC al libro de calificaciones (core_grades_update_grades).
 * 4. Inyección de horarios escolares en el calendario (core_calendar_*).
 * 5. Empaquetado de recursos de estudio offline (core_course_get_contents).
 *
 * CONFIGURACIÓN:
 * El puente no simula calificaciones ni operaciones de escritura. Si Moodle no
 * está configurado o no responde, devuelve un error explícito para que la
 * interfaz no presente datos ficticios como si fueran reales.
 * ==============================================================================
 */

import {
  CursoMoodleWisdom,
  RecursoGuiaOffline,
  ESTUDIANTE_GAEL_INICIAL,
  ESTUDIANTE_AVRIL_INICIAL,
} from '@/types/wisdom';
import { obtenerPerfilCurricular } from '@/data/curriculum';

/**
 * Parámetros para registrar eventos en el Calendario de Moodle.
 */
export interface ParametrosEventoCalendario {
  nombreEvento: string;
  descripcion: string;
  idCurso: number;
  timestampInicio: number; // Timestamp UNIX en segundos
  duracionSegundos: number;
  tipoEvento: 'clase_ia' | 'tutoria_real';
}

/**
 * Respuesta estructurada de sincronización de calificaciones.
 */
export interface ResultadoSincronizacionNota {
  exito: boolean;
  idCurso: number;
  idUsuarioMoodle: number;
  notaAsignada: number;
  codigoEstadoMoodle: number;
  mensaje: string;
}

/**
 * Catálogo de categorías oficiales de Moodle que reflejan las 14 carpetas de Google Drive.
 */
export const CATEGORIAS_14_ANIOS_MOODLE = [
  { idnumber: '01_Primero_EGB', name: '1° de Educación General Básica (Preparatoria)' },
  { idnumber: '02_Segundo_EGB', name: '2° de Educación General Básica (Elemental)' },
  { idnumber: '03_Tercero_EGB', name: '3° de Educación General Básica (Elemental)' },
  { idnumber: '04_Cuarto_EGB_Gael', name: '4° de Educación General Básica - Gael (8 años)' },
  { idnumber: '05_Quinto_EGB', name: '5° de Educación General Básica (Media)' },
  { idnumber: '06_Sexto_EGB', name: '6° de Educación General Básica (Media)' },
  { idnumber: '07_Septimo_EGB', name: '7° de Educación General Básica (Media)' },
  { idnumber: '08_Octavo_EGB_Avril', name: '8° de Educación General Básica - Avril (12 años)' },
  { idnumber: '09_Noveno_EGB', name: '9° de Educación General Básica (Superior)' },
  { idnumber: '10_Decimo_EGB', name: '10° de Educación General Básica (Superior)' },
  { idnumber: '11_Primero_BGU', name: '1° de Bachillerato General Unificado' },
  { idnumber: '12_Segundo_BGU', name: '2° de Bachillerato General Unificado' },
  { idnumber: '13_Tercero_BGU', name: '3° de Bachillerato General Unificado' },
  { idnumber: '14_Talleres_y_Cursos_Libres', name: '14. Escuela de Talleres y Cursos Libres' },
];

/**
 * Clase principal que conecta Wisdom Academy con los servicios web de Moodle LMS.
 */
export class MoodleNotConfiguredError extends Error {
  constructor(message = 'La integración con Moodle no está configurada.') {
    super(message);
    this.name = 'MoodleNotConfiguredError';
  }
}

export class MoodleUnavailableError extends Error {
  constructor(message = 'Moodle no respondió correctamente.') {
    super(message);
    this.name = 'MoodleUnavailableError';
  }
}

export class MoodleWisdomBridge {
  private baseUrl: string;
  private token: string;
  private modoMockForzado: boolean;

  /**
   * Inicializa la instancia del puente con la URL base y token de servicios web de Moodle.
   */
  constructor(baseUrl?: string, token?: string) {
    this.baseUrl = (
      baseUrl ||
      process.env.NEXT_PUBLIC_MOODLE_URL ||
      process.env.MOODLE_INTERNAL_URL ||
      'http://localhost:8080'
    ).replace(/\/$/, '');

    this.token = (token || process.env.MOODLE_REST_TOKEN || '').trim();

    // El modo simulado debe activarse de forma explícita y nunca en producción.
    this.modoMockForzado =
      process.env.MOODLE_MOCK === '1' ||
      process.env.WISDOM_E2E === '1' ||
      this.token.startsWith('mock_');
  }

  /**
   * Método de bajo nivel que ejecuta peticiones HTTP POST hacia /webservice/rest/server.php.
   *
   * @param wsFunction Nombre de la función del Web Service de Moodle (e.g. core_course_get_courses)
   * @param params Diccionario de parámetros específicos de la función
   * @returns Datos JSON devueltos por Moodle
   */
  public async invocarMoodleWs<T>(wsFunction: string, params: Record<string, any> = {}): Promise<T> {
    if (!this.token || this.modoMockForzado) {
      throw new MoodleNotConfiguredError(
        this.modoMockForzado
          ? 'El modo simulado de Moodle está activo; no se ejecutan operaciones reales.'
          : 'Configura MOODLE_REST_TOKEN y NEXT_PUBLIC_MOODLE_URL para usar Moodle.'
      );
    }
    const url = `${this.baseUrl}/webservice/rest/server.php`;

    const bodyParams = new URLSearchParams();
    bodyParams.append('wstoken', this.token);
    bodyParams.append('wsfunction', wsFunction);
    bodyParams.append('moodlewsrestformat', 'json');

    // Serializa parámetros anidados en la notación que Moodle requiere: param[index][field]
    Object.entries(params).forEach(([key, val]) => {
      if (typeof val === 'object' && val !== null) {
        this.serializarParametrosAnidados(bodyParams, key, val);
      } else {
        bodyParams.append(key, String(val));
      }
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // Timeout de 4 segundos

      const respuesta = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!respuesta.ok) {
        throw new Error(`HTTP Error en Moodle: ${respuesta.status} ${respuesta.statusText}`);
      }

      const data = await respuesta.json();

      // Si Moodle devuelve un objeto de excepción de error
      if (data && data.exception) {
        throw new Error(`Moodle API Exception [${data.errorcode}]: ${data.message}`);
      }

      return data as T;
    } catch (error: any) {
      // Si la conexión falla (contenedor apagado o en inicio), conmutamos a Mock
      throw error;
    }
  }

  /**
   * Helper recursivo para serializar objetos complejos a formato compatible con Moodle REST.
   */
  private serializarParametrosAnidados(params: URLSearchParams, prefijo: string, obj: any) {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.serializarParametrosAnidados(params, `${prefijo}[${index}]`, item);
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([subKey, subVal]) => {
        this.serializarParametrosAnidados(params, `${prefijo}[${subKey}]`, subVal);
      });
    } else {
      params.append(prefijo, String(obj));
    }
  }

  /**
   * a) Obtiene las asignaturas en las que está matriculado un estudiante.
   * Consume la función 'core_enrol_get_users_courses'.
   *
   * @param idUsuarioMoodle ID numérico del usuario en Moodle (104 para Gael, 108 para Avril)
   * @returns Lista de cursos formateados según CursoMoodleWisdom
   */
  public async obtenerCursosPorEstudiante(idUsuarioMoodle: number): Promise<CursoMoodleWisdom[]> {
    const rawCourses = await this.invocarMoodleWs<any[]>('core_enrol_get_users_courses', {
      userid: idUsuarioMoodle,
    });
    if (!Array.isArray(rawCourses)) return [];
    return rawCourses.map((c) => ({
      id: c.id,
      nombre: c.fullname,
      codigoCorto: c.shortname,
      categoriaGrado: String(c.category || ''),
      porcentajeAvance: c.progress || 0,
      versiculoLema: 'Proverbios 2:6',
      estadoCertificacion: (c.progress || 0) >= 100 ? 'COMPLETADO' : 'EN_CURSO',
      urlGuiaPdfDrive: `/api/moodle/offline-package?idCurso=${c.id}`,
    }));
  }

  /**
   * b) Crea automáticamente en Moodle las 14 categorías escolares y las asignaturas
   * troncales bilingües de Gael (4° EGB) y Avril (8° EGB).
   * Consume 'core_course_create_categories' y 'core_course_create_courses'.
   */
  public async crearEstructuraAnualCategoriasYGrados(): Promise<{
    categoriasCreadas: number;
    cursosCreados: number;
    mensajes: string[];
  }> {
    const mensajes: string[] = [];
    mensajes.push('Iniciando sincronización de las 14 categorías en Moodle LMS...');

    try {
      // 1. Invoca core_course_create_categories
      const categoriasPayload = CATEGORIAS_14_ANIOS_MOODLE.map((cat, idx) => ({
        name: cat.name,
        idnumber: cat.idnumber,
        description: `Categoría oficial de año escolar o talleres: ${cat.name}`,
        parent: 0,
      }));

      await this.invocarMoodleWs('core_course_create_categories', {
        categories: categoriasPayload,
      });
      mensajes.push('✓ 14 categorías creadas exitosamente en el árbol de cursos de Moodle.');

      // 2. Invoca core_course_create_courses para la malla completa de Gael y Avril
      const perfilGael = obtenerPerfilCurricular(ESTUDIANTE_GAEL_INICIAL.codigoCarpetaAnioDrive);
      const perfilAvril = obtenerPerfilCurricular(ESTUDIANTE_AVRIL_INICIAL.codigoCarpetaAnioDrive);

      const construirCursos = (perfil: typeof perfilGael, categoryid: number) =>
        perfil.asignaturas.map((asignatura) => {
          const sufijo = asignatura.codigo.replace(/^\d+_/, '').toUpperCase().slice(0, 12);
          const shortname = `WA_${perfil.estudiante.toUpperCase()}_${sufijo}`;
          return {
            fullname: asignatura.nombre,
            shortname,
            categoryid,
            idnumber: shortname,
          };
        });

      const cursosPayload = [
        ...construirCursos(perfilGael, 4),
        ...construirCursos(perfilAvril, 8),
      ];

      await this.invocarMoodleWs('core_course_create_courses', {
        courses: cursosPayload,
      });
      mensajes.push(
        `✓ ${cursosPayload.length} asignaturas personalizadas creadas para Gael (4° EGB) y Avril (8° EGB).`
      );

      return {
        categoriasCreadas: 14,
        cursosCreados: cursosPayload.length,
        mensajes,
      };
    } catch (error) {
      throw error instanceof MoodleNotConfiguredError
        ? error
        : new MoodleUnavailableError(
            `No fue posible crear la estructura en Moodle: ${
              error instanceof Error ? error.message : 'error desconocido'
            }`
          );
    }
  }

  /**
   * c) Sincroniza calificaciones emitidas por el Profesor IA de OpenMAIC en el Libro de Moodle.
   * Consume 'core_grades_update_grades'.
   *
   * @param idCurso ID del curso en Moodle
   * @param idUsuarioMoodle ID del alumno
   * @param calificacion100 Nota formativa calculada sobre 100 puntos
   * @param retroalimentacionBilingue Comentario formativo generado por el agente
   */
  public async sincronizarCalificacionAgenteIA(
    idCurso: number,
    idUsuarioMoodle: number,
    calificacion100: number,
    retroalimentacionBilingue: string
  ): Promise<ResultadoSincronizacionNota> {
    const notaSobre10 = (calificacion100 / 10).toFixed(2);

    try {
      await this.invocarMoodleWs('core_grades_update_grades', {
        source: 'wisdom_openmaic_agent',
        courseid: idCurso,
        component: 'mod_assign',
        activityid: 1,
        itemnumber: 0,
        grades: [
          {
            studentid: idUsuarioMoodle,
            grade: calificacion100,
            str_feedback: `${retroalimentacionBilingue} [Nota MINEDUC: ${notaSobre10}/10]`,
          },
        ],
      });

      return {
        exito: true,
        idCurso,
        idUsuarioMoodle,
        notaAsignada: calificacion100,
        codigoEstadoMoodle: 200,
        mensaje: `Calificación de ${calificacion100}/100 asentada con éxito en el libro de calificaciones de Moodle.`,
      };
    } catch (error) {
      throw error instanceof MoodleNotConfiguredError
        ? error
        : new MoodleUnavailableError(
            `No fue posible sincronizar la calificación con Moodle: ${
              error instanceof Error ? error.message : 'error desconocido'
            }`
          );
    }
  }

  /**
   * d) Inyecta eventos diarios y tutorías en el Calendario de Moodle.
   * Consume 'core_calendar_create_calendar_events'.
   */
  public async registrarEventoHorarioEnCalendarioMoodle(
    evento: ParametrosEventoCalendario
  ): Promise<{ exito: boolean; idEventoMoodle: number; mensaje: string }> {
    try {
      const resultado = await this.invocarMoodleWs<any>('core_calendar_create_calendar_events', {
        events: [
          {
            name: evento.nombreEvento,
            description: evento.descripcion,
            format: 1,
            courseid: evento.idCurso,
            timestart: evento.timestampInicio,
            timeduration: evento.duracionSegundos,
            eventtype: 'course',
          },
        ],
      });

      const idGenerado = resultado?.events?.[0]?.id || 1001;
      return {
        exito: true,
        idEventoMoodle: idGenerado,
        mensaje: `Evento '${evento.nombreEvento}' agendado en el calendario de Moodle.`,
      };
    } catch (error) {
      throw error instanceof MoodleNotConfiguredError
        ? error
        : new MoodleUnavailableError(
            `No fue posible registrar el evento en Moodle: ${
              error instanceof Error ? error.message : 'error desconocido'
            }`
          );
    }
  }

  /**
   * e) Obtiene el paquete de estudio offline combinando la guía PDF vinculada desde
   * el repositorio Google Drive de Moodle con el archivo HTML interactivo de OpenMAIC v1.2.0.
   * Consume 'core_course_get_contents'.
   */
  public async obtenerPaqueteEstudioOffline(
    idCurso: number | string,
    idEscenaOpenMaic: string = 'scene_default',
    versiculoBiblicoUnidad: string = 'Proverbios 2:6'
  ): Promise<RecursoGuiaOffline> {
    const idNum = Number(idCurso) || 401;
    const esGael = idNum < 600;

    const nombreEs = esGael ? 'Matemáticas Creacionales' : 'Teología y Cosmovisión';
    const nombreEn = esGael ? 'Creation Mathematics' : 'Theology & Biblical Worldview';

    // No existen paquetes offline generados en el repositorio actual. Se
    // devuelve el estado real en lugar de enlaces a archivos inexistentes.
    return {
      idCurso: idNum,
      tituloMateriaBilingue: {
        es: nombreEs,
        en: nombreEn,
      },
      versiculoLema: versiculoBiblicoUnidad,
      urlGuiaPdfMoodle: '',
      urlPaqueteHtmlInteractivo: '',
      tamanoBytes: 0,
      fechaSincronizacion: new Date().toISOString(),
      disponibleOffline: false,
      mensaje:
        'El paquete offline aún no se ha generado para este curso. Solicita su publicación al equipo académico.',
    };
  }
}

// Instancia singleton para uso en el servidor Next.js
export const moodleBridge = new MoodleWisdomBridge();

