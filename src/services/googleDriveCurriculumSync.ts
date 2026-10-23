/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Sincronizador Curricular y de Horarios
 * ARCHIVO: src/services/googleDriveCurriculumSync.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Cerebro de automatización escolar que conecta Google Drive API v3, el generador
 * inteligente de horarios diferenciados por edad y el despachador de lecciones
 * hacia el motor multi-agente OpenMAIC v1.2.0 (MinerU + LangGraph 1.1).
 *
 * FLUJO DE OPERACIÓN:
 * 1. Inspecciona la carpeta de Google Drive correspondiente al grado del alumno.
 * 2. Lee el manifiesto 'curriculo_anual.json' o infiere materias a partir de PDFs subidos.
 * 3. Genera automáticamente la jornada diaria iniciando a las 08:00 AM:
 *    - Gael (4° EGB, 8 años): 5 bloques de 45 min + recreo central de 30 min.
 *    - Avril (8° EGB, 12 años): 5 bloques de 45 min + recreo central de 30 min.
 * 4. Asienta los bloques en el Calendario de Moodle vía 'moodleBridge'.
 * 5. Despacha el material del día al pipeline de OpenMAIC generando las 4 escenas:
 *    diapositivas ('slides'), pizarra ('interactive'), evaluación ('quiz') y reto ('pbl').
 * ==============================================================================
 */

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { EstudianteWisdom, BloqueHorarioDia, ModalidadInstruccion } from '@/types/wisdom';
import { moodleBridge } from '@/services/moodleBridge';
import { buscarAsignatura, obtenerLemaAcademico, obtenerPerfilCurricular } from '@/data/curriculum';

/**
 * Identifica la única asignatura que admite contenido confesional.
 */
function esAsignaturaTeologica(nombre: string): boolean {
  return /relaci[oó]n con dios|teolog[ií]a|cosmovisi[oó]n/i.test(nombre);
}

/**
 * Especificación de los 14 años escolares según la normativa MINEDUC Ecuador K-12.
 */
export interface DefinicionNivelDrive {
  codigoCarpeta: string;
  nombreVisible: string;
  subnivelMineduc: string;
  edadSugerida: number;
  duracionMinutosBloque: number;
  bloquesDiarios: number;
  recreoMinutos: number;
  horaInicio: string;
  materiasTroncales: string[];
}

/**
 * Catálogo exportado con las 14 carpetas escolares y sus especificaciones pedagógicas.
 */
export const ESTRUCTURA_ANIOS_ESCOLARES_DRIVE: DefinicionNivelDrive[] = [
  {
    codigoCarpeta: '01_Primero_EGB',
    nombreVisible: '1° de Básica (Preparatoria)',
    subnivelMineduc: 'Preparatoria',
    edadSugerida: 5,
    duracionMinutosBloque: 30,
    bloquesDiarios: 3,
    recreoMinutos: 15,
    horaInicio: '08:30',
    materiasTroncales: ['Identidad_y_Autonomia', 'Descubrimiento_del_Medio', 'Expresion_Artistica'],
  },
  {
    codigoCarpeta: '02_Segundo_EGB',
    nombreVisible: '2° de Básica (Elemental)',
    subnivelMineduc: 'Básica Elemental',
    edadSugerida: 6,
    duracionMinutosBloque: 30,
    bloquesDiarios: 4,
    recreoMinutos: 15,
    horaInicio: '08:30',
    materiasTroncales: ['Biblia_y_Caracter', 'Matematicas', 'Lengua_y_Literatura', 'Ciencias_Naturales'],
  },
  {
    codigoCarpeta: '03_Tercero_EGB',
    nombreVisible: '3° de Básica (Elemental)',
    subnivelMineduc: 'Básica Elemental',
    edadSugerida: 7,
    duracionMinutosBloque: 35,
    bloquesDiarios: 4,
    recreoMinutos: 15,
    horaInicio: '08:30',
    materiasTroncales: ['Biblia_y_Caracter', 'Matematicas', 'Lengua_y_Literatura', 'Ciencias_Naturales'],
  },
  {
    codigoCarpeta: '04_Cuarto_EGB_Gael',
    nombreVisible: '4° de Básica - Gael (8 años)',
    subnivelMineduc: 'Básica Elemental',
    edadSugerida: 8,
    duracionMinutosBloque: 45,
    bloquesDiarios: 5,
    recreoMinutos: 30,
    horaInicio: '08:00',
    materiasTroncales: [
      '01_Lengua_y_Literatura',
      '02_Matematicas',
      '03_Ciencias_Naturales',
      '04_Estudios_Sociales',
      '05_Ingles',
      '06_Software_y_Programacion',
      '07_Arte_ECA',
      '08_Educacion_Fisica',
      '09_Relacion_con_Dios',
    ],
  },
  {
    codigoCarpeta: '05_Quinto_EGB',
    nombreVisible: '5° de Básica (Media)',
    subnivelMineduc: 'Básica Media',
    edadSugerida: 9,
    duracionMinutosBloque: 40,
    bloquesDiarios: 5,
    recreoMinutos: 15,
    horaInicio: '08:30',
    materiasTroncales: ['Biblia_y_Caracter', 'Matematicas', 'Lenguaje_Bilingue', 'Ciencias_Naturales', 'Estudios_Sociales'],
  },
  {
    codigoCarpeta: '06_Sexto_EGB',
    nombreVisible: '6° de Básica (Media)',
    subnivelMineduc: 'Básica Media',
    edadSugerida: 10,
    duracionMinutosBloque: 40,
    bloquesDiarios: 5,
    recreoMinutos: 15,
    horaInicio: '08:30',
    materiasTroncales: ['Biblia_y_Caracter', 'Matematicas', 'Lenguaje_Bilingue', 'Ciencias_Naturales', 'Estudios_Sociales'],
  },
  {
    codigoCarpeta: '07_Septimo_EGB',
    nombreVisible: '7° de Básica (Media)',
    subnivelMineduc: 'Básica Media',
    edadSugerida: 11,
    duracionMinutosBloque: 40,
    bloquesDiarios: 5,
    recreoMinutos: 15,
    horaInicio: '08:30',
    materiasTroncales: ['Biblia_y_Caracter', 'Matematicas', 'Lenguaje_Bilingue', 'Ciencias_Naturales', 'Estudios_Sociales'],
  },
  {
    codigoCarpeta: '08_Octavo_EGB_Avril',
    nombreVisible: '8° de Básica - Avril (12 años)',
    subnivelMineduc: 'Básica Superior',
    edadSugerida: 12,
    duracionMinutosBloque: 45,
    bloquesDiarios: 5,
    recreoMinutos: 30,
    horaInicio: '08:00',
    materiasTroncales: [
      '01_Matematicas',
      '02_Lengua_y_Literatura',
      '03_Ciencias_Naturales',
      '04_Estudios_Sociales',
      '05_Ingles',
      '06_Software_y_Programacion',
      '07_Ciencias_Politicas_y_RRII',
      '08_Administracion_y_Marketing',
      '09_Arte_ECA',
      '10_Educacion_Fisica',
      '11_Relacion_con_Dios',
    ],
  },
  {
    codigoCarpeta: '09_Noveno_EGB',
    nombreVisible: '9° de Básica (Superior)',
    subnivelMineduc: 'Básica Superior',
    edadSugerida: 13,
    duracionMinutosBloque: 45,
    bloquesDiarios: 5,
    recreoMinutos: 15,
    horaInicio: '08:30',
    materiasTroncales: ['Teologia_y_Cosmovision', 'Algebra', 'Ciencias_Integradas', 'English_Literature', 'Historia'],
  },
  {
    codigoCarpeta: '10_Decimo_EGB',
    nombreVisible: '10° de Básica (Superior)',
    subnivelMineduc: 'Básica Superior',
    edadSugerida: 14,
    duracionMinutosBloque: 45,
    bloquesDiarios: 5,
    recreoMinutos: 15,
    horaInicio: '08:30',
    materiasTroncales: ['Teologia_y_Cosmovision', 'Geometria_y_Trigonometria', 'Fisica_Quimica', 'English_Literature', 'Civismo'],
  },
  {
    codigoCarpeta: '11_Primero_BGU',
    nombreVisible: '1° de Bachillerato General Unificado',
    subnivelMineduc: 'Bachillerato',
    edadSugerida: 15,
    duracionMinutosBloque: 50,
    bloquesDiarios: 6,
    recreoMinutos: 15,
    horaInicio: '08:30',
    materiasTroncales: ['Filosofia_Cristiana', 'Matematica_Superior', 'Fisica', 'Quimica', 'Literatura_Academica', 'Historia_Universal'],
  },
  {
    codigoCarpeta: '12_Segundo_BGU',
    nombreVisible: '2° de Bachillerato General Unificado',
    subnivelMineduc: 'Bachillerato',
    edadSugerida: 16,
    duracionMinutosBloque: 50,
    bloquesDiarios: 6,
    recreoMinutos: 15,
    horaInicio: '08:30',
    materiasTroncales: ['Apologetica', 'Calculo_Diferencial', 'Biologia_Celular', 'Quimica_Organica', 'Academic_Writing', 'Economia'],
  },
  {
    codigoCarpeta: '13_Tercero_BGU',
    nombreVisible: '3° de Bachillerato General Unificado',
    subnivelMineduc: 'Bachillerato',
    edadSugerida: 17,
    duracionMinutosBloque: 50,
    bloquesDiarios: 6,
    recreoMinutos: 15,
    horaInicio: '08:30',
    materiasTroncales: ['Etica_y_Sociedad', 'Calculo_Integral', 'Investigacion_Cientifica', 'World_Literature', 'Emprendimiento', 'Ciudadania'],
  },
  {
    codigoCarpeta: '14_Talleres_y_Cursos_Libres',
    nombreVisible: 'Escuela de Talleres y Cursos Libres',
    subnivelMineduc: 'Educación Continua',
    edadSugerida: 18,
    duracionMinutosBloque: 60,
    bloquesDiarios: 2,
    recreoMinutos: 15,
    horaInicio: '15:00',
    materiasTroncales: [
      '01_Programacion_con_IA_y_Python',
      '02_Liderazgo_y_Cosmovision_Biblica',
      '03_Mayordomia_Financiera_Cristiana',
      '04_Musica_y_Artes_para_la_Adoracion',
      '05_Escuela_para_Padres_Homeschoolers',
    ],
  },
];

/**
 * Estructura de un material curricular detectado en Google Drive.
 */
export interface MaterialCurricularDrive {
  idArchivoDrive: string;
  nombreArchivo: string;
  materia: string;
  semanaNumero: number;
  diaSemana: string;
  versiculoBiblico: string;
  requiereTutoriaHumana: boolean;
  plataformaTutoria?: 'jitsi' | 'bigbluebutton' | 'google_meet' | 'zoom' | 'microsoft_teams';
  enlaceVisualizacion?: string;
}

/**
 * Payload completo del aula interactiva generada por OpenMAIC v1.2.0.
 */
export interface SesionAulaOpenMaic {
  idSesion: string;
  urlAulaInteractiva: string;
  perfilPedagogico: string;
  versiculoLema: string;
  escenas: {
    slides: { totalDiapositivas: number; tema: string };
    interactive: { tipoSimulacion: string; pizarraActiva: boolean };
    quiz: { totalPreguntas: number; escalaNota: number };
    pbl: { tituloReto: string; formatoEntrega: string };
  };
  narradorNeural: string;
  timestampGeneracion: string;
}

/**
 * Horario escolar diario completo.
 */
export interface HorarioEscolarDiario {
  estudiante: EstudianteWisdom;
  fecha: string;
  semanaNumero: number;
  trimestre: 1 | 2 | 3;
  versiculoSemana: { referencia: string; texto: string };
  bloques: BloqueHorarioDia[];
  totalHorasPedagogicas: number;
}

/**
 * Clase orquestadora de sincronización entre Google Drive, Horarios y OpenMAIC.
 */
export class GoogleDriveCurriculumSynchronizer {
  private driveClient: any | null = null;

  constructor() {
    this.inicializarClienteDrive();
  }

  /**
   * Inicializa el cliente autenticado de Google Drive API v3 si hay credenciales disponibles.
   */
  private inicializarClienteDrive() {
    const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (
      serviceEmail &&
      !serviceEmail.startsWith('mock_') &&
      privateKey &&
      privateKey.includes('BEGIN PRIVATE KEY')
    ) {
      try {
        const auth = new google.auth.JWT({
          email: serviceEmail,
          key: privateKey.replace(/\\n/g, '\n'),
          scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        this.driveClient = google.drive({ version: 'v3', auth });
      } catch {
        this.driveClient = null;
      }
    }
  }

  /**
   * a) Conecta con Google Drive API v3 para leer los materiales del grado especificado.
   * Lee el manifiesto 'curriculo_anual.json' y escanea los PDFs y documentos en las subcarpetas.
   *
   * @param codigoCarpetaAnio Código de la carpeta (e.g. '04_Cuarto_EGB_Gael', '08_Octavo_EGB_Avril')
   * @returns Lista de materiales identificados con semana, materia y versículo
   */
  public async leerMaterialesDelAnioEnDrive(
    codigoCarpetaAnio: string
  ): Promise<MaterialCurricularDrive[]> {
    const materiales: MaterialCurricularDrive[] = [];
    const perfil = obtenerPerfilCurricular(codigoCarpetaAnio);

    // 1. Intenta leer desde caché local primero para velocidad
    const rutaLocal = path.join(process.cwd(), '.drive_local_cache', codigoCarpetaAnio, 'curriculo_anual.json');
    let curriculoJson: any = null;

    if (fs.existsSync(rutaLocal)) {
      try {
        curriculoJson = JSON.parse(fs.readFileSync(rutaLocal, 'utf-8'));
      } catch {
        // Fallback
      }
    }

    // 2. Si hay conexión en vivo con Google Drive, busca archivos adicionales
    if (this.driveClient && process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID) {
      try {
        const busquedaCarpeta = await this.driveClient.files.list({
          q: `'${process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID}' in parents and name = '${codigoCarpetaAnio}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: 'files(id, name)',
          supportsAllDrives: true,
        });

        if (busquedaCarpeta.data.files && busquedaCarpeta.data.files.length > 0) {
          const folderId = busquedaCarpeta.data.files[0].id;
          const archivosEnDrive = await this.driveClient.files.list({
            q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name, webViewLink, description)',
            supportsAllDrives: true,
          });

          if (archivosEnDrive.data.files) {
            for (const file of archivosEnDrive.data.files) {
              if (/plan_escolar|normativa|bases_pedagogicas|acuerdo_ministerial/i.test(file.name)) {
                continue;
              }
              const materiaInferida = this.inferirMateriaPorNombre(file.name);
              const asignatura = buscarAsignatura(perfil, materiaInferida);
              const requiereTutor =
                asignatura.area === 'TEOLOGIA' ||
                file.description?.includes('requiereTutoriaHumana') ||
                file.name.includes('Tutoria');
              materiales.push({
                idArchivoDrive: file.id,
                nombreArchivo: file.name,
                materia: asignatura.nombre,
                semanaNumero: this.inferirSemanaPorNombre(file.name),
                diaSemana: 'Lunes',
                versiculoBiblico: asignatura.lema.texto,
                requiereTutoriaHumana: Boolean(requiereTutor),
                plataformaTutoria: requiereTutor ? 'jitsi' : undefined,
                enlaceVisualizacion: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
              });
            }
          }
        }
      } catch {
        // En caso de cuota o error de red, usamos datos inferidos
      }
    }

    // 3. Si no hay archivos manuales en la raíz, genera el conjunto desde la malla personalizada.
    if (materiales.length === 0) {
      const perfil = obtenerPerfilCurricular(codigoCarpetaAnio);

      perfil.asignaturas.forEach((asignatura, idx) => {
        const esTutoria = asignatura.area === 'TEOLOGIA';
        materiales.push({
          idArchivoDrive: `drive_doc_${codigoCarpetaAnio}_${idx + 1}`,
          nombreArchivo: `Modulo1_${asignatura.nombre.replace(/\s+/g, '_')}.pdf`,
          materia: asignatura.nombre,
          semanaNumero: 1,
          diaSemana: 'Lunes',
          versiculoBiblico: asignatura.lema.texto,
          requiereTutoriaHumana: esTutoria,
          plataformaTutoria: esTutoria ? 'jitsi' : undefined,
          enlaceVisualizacion: `/drive_view/${codigoCarpetaAnio}/${asignatura.carpetaDrive}/Modulo1.pdf`,
        });
      });
    }

    return materiales;
  }

  /**
   * Helper para deducir la materia a partir del nombre del archivo subido a Drive.
   */
  private inferirMateriaPorNombre(nombre: string): string {
    const n = nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (n.includes('teologia') || n.includes('relacion con dios') || n.includes('biblia')) {
      return 'Relación con Dios';
    }
    if (n.includes('ac_4_cn') || n.includes('ciencias')) return 'Ciencias Naturales';
    if (n.includes('ac_4_ll') || n.includes('lengua')) return 'Lengua y Literatura';
    if (n.includes('ac_4_es') || n.includes('estudios sociales') || n.includes('sociales')) {
      return 'Estudios Sociales e Historia del Ecuador';
    }
    if (n.includes('ac_4_m') || n.includes('matematica')) return 'Matemáticas';
    if (n.includes('software') || n.includes('programacion') || n.includes('python') || n.includes('scratch')) {
      return 'Software y Programación';
    }
    if (n.includes('english') || n.includes('phonics') || n.includes('literature')) {
      return 'English Language & Literature';
    }
    if (n.includes('educacion fisica') || n.includes('deporte') || n.includes('salud')) {
      return 'Educación Física y Salud';
    }
    if (n.includes('arte') || n.includes('eca') || n.includes('musica')) {
      return 'Educación Cultural y Artística (ECA)';
    }
    if (n.includes('politica') || n.includes('rrii') || n.includes('internacional')) {
      return 'Ciencias Políticas y Relaciones Internacionales';
    }
    if (n.includes('administracion') || n.includes('marketing') || n.includes('empresa')) {
      return 'Administración y Marketing Digital';
    }
    if (n.includes('matematica') || n.includes('algebra')) return 'Matemáticas';
    if (n.includes('ciencia') || n.includes('biologia') || n.includes('fisica') || n.includes('quimica')) {
      return 'Ciencias Naturales';
    }
    if (n.includes('social') || n.includes('historia') || n.includes('civismo')) {
      return 'Estudios Sociales e Historia del Ecuador';
    }
    if (n.includes('lengua') || n.includes('literatura')) return 'Lengua y Literatura';
    return 'Asignatura Académica';
  }

  /**
   * Helper para deducir la semana lectiva por el nombre del archivo (ejemplo: Semana3_...).
   */
  private inferirSemanaPorNombre(nombre: string): number {
    const match = nombre.match(/semana\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 1;
  }

  /**
   * b) Construye el horario diario del estudiante desde el manifiesto de Drive:
   * jornada intensiva de 08:00 a 12:00, cinco bloques y recreo central de
   * 09:30 a 10:00. Si no existe manifiesto, rota las asignaturas reales del
   * perfil para no volver al catálogo fijo de cinco materias.
   */
  public async generarHorarioAutomaticoPorAlumno(
    estudiante: EstudianteWisdom,
    _materialesDrive?: MaterialCurricularDrive[]
  ): Promise<HorarioEscolarDiario> {
    const nombresDia = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'] as const;
    const diaActual = nombresDia[new Date().getDay()];
    const diaSemana: 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes' =
      diaActual === 'Sabado' || diaActual === 'Domingo' ? 'Lunes' : diaActual;

    const horario = await this.generarHorarioOficial08a12(estudiante, diaSemana);

    for (const bloque of horario.bloques) {
      const esTutoriaReal = bloque.modalidad === 'TUTORIA_PROFESOR_REAL';
      const duracionMinutos = Math.max(
        0,
        this.horaAMinutos(bloque.horaFin) - this.horaAMinutos(bloque.horaInicio)
      );
      const lema = esAsignaturaTeologica(bloque.nombreMateria)
        ? `Lema bíblico: ${bloque.versiculoBloque || ''}`
        : `Principio académico: ${bloque.versiculoBloque || ''}`;

      await moodleBridge.registrarEventoHorarioEnCalendarioMoodle({
        nombreEvento: `[${esTutoriaReal ? 'TUTORÍA REAL' : 'AULA IA'}] ${bloque.nombreMateria}`,
        descripcion: `Clase diaria de ${duracionMinutos} minutos. ${lema}`,
        idCurso: 400 + bloque.numeroBloque,
        timestampInicio: Math.floor(Date.now() / 1000) + (bloque.numeroBloque - 1) * 3600,
        duracionSegundos: duracionMinutos * 60,
        tipoEvento: esTutoriaReal ? 'tutoria_real' : 'clase_ia',
      });
    }

    return horario;
  }

  /**
   * Genera el horario oficial intensivo de 08:00 a 12:00 con recreo central de 09:30 a 10:00,
   * basado en los macrocurrículos y microcurrículos reales de Gael y Avril en Google Drive.
   *
   * @param estudiante Estudiante a consultar (Gael 4° EGB o Avril 8° EGB)
   * @param diaSemana Día de la semana (Lunes a Viernes)
   * @returns Horario oficial estructurado con 5 bloques diarios y recreo central
   */
  public async generarHorarioOficial08a12(
    estudiante: EstudianteWisdom,
    diaSemana: 'Lunes' | 'Martes' | 'Miercoles' | 'Jueves' | 'Viernes' = 'Lunes'
  ): Promise<HorarioEscolarDiario> {
    const perfil = obtenerPerfilCurricular(estudiante.codigoCarpetaAnioDrive);
    const rutaCache = path.join(
      process.cwd(),
      '.drive_local_cache',
      estudiante.codigoCarpetaAnioDrive,
      'curriculo_anual.json'
    );

    let curriculoJson: any = null;
    if (fs.existsSync(rutaCache)) {
      try {
        curriculoJson = JSON.parse(fs.readFileSync(rutaCache, 'utf-8'));
      } catch {}
    }

    const bloquesJson = curriculoJson?.horarioSemanal?.[diaSemana];

    const bloques: BloqueHorarioDia[] = [];
    if (bloquesJson && Array.isArray(bloquesJson)) {
      bloquesJson.forEach((b: any) => {
        const [hInicio, hFin] = b.hora.split(' - ');
        const asignatura = buscarAsignatura(perfil, b.materia);
        const esTutoria = b.modalidad === 'TUTORIA_PROFESOR_REAL';
        bloques.push({
          id: `bloque_oficial_${estudiante.idMoodle}_${b.bloque}`,
          numeroBloque: b.bloque,
          horaInicio: hInicio.trim(),
          horaFin: hFin.trim(),
          nombreMateria: asignatura.nombre,
          modalidad: b.modalidad,
          plataformaTutoria: b.plataforma || (esTutoria ? 'jitsi' : undefined),
          urlSesionTutoria: esTutoria
            ? `https://meet.jit.si/WisdomAcademy_${estudiante.gradoEcuador.replace(/\s+/g, '_')}_${asignatura.nombre.replace(/\s+/g, '_')}`
            : undefined,
          archivoDriveTema: `${asignatura.carpetaDrive}/Modulo1.pdf`,
          versiculoBloque: asignatura.lema.texto,
        });
      });
    } else {
      // Distribución de respaldo rotativa sobre las asignaturas reales del perfil.
      const dias = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes'];
      const offset = Math.max(0, dias.indexOf(diaSemana)) * 2;
      const horas = [
        { ini: '08:00', fin: '08:45' },
        { ini: '08:45', fin: '09:30' },
        { ini: '10:00', fin: '10:45' },
        { ini: '10:45', fin: '11:30' },
        { ini: '11:30', fin: '12:00' },
      ];

      for (let i = 0; i < 5; i++) {
        const asignatura = perfil.asignaturas[(offset + i) % perfil.asignaturas.length];
        const esTutoria = asignatura.area === 'TEOLOGIA';
        bloques.push({
          id: `bloque_oficial_${estudiante.idMoodle}_${i + 1}`,
          numeroBloque: i + 1,
          horaInicio: horas[i].ini,
          horaFin: horas[i].fin,
          nombreMateria: asignatura.nombre,
          modalidad: esTutoria ? 'TUTORIA_PROFESOR_REAL' : 'AGENTE_IA_OPENMAIC',
          plataformaTutoria: esTutoria ? 'jitsi' : undefined,
          urlSesionTutoria: esTutoria
            ? `https://meet.jit.si/WisdomAcademy_${estudiante.gradoEcuador.replace(/\s+/g, '_')}_${asignatura.nombre.replace(/\s+/g, '_')}`
            : undefined,
          archivoDriveTema: `${asignatura.carpetaDrive}/Modulo1.pdf`,
          versiculoBloque: asignatura.lema.texto,
        });
      }
    }

    const totalMinutos = bloques.reduce(
      (total, bloque) => total + Math.max(0, this.horaAMinutos(bloque.horaFin) - this.horaAMinutos(bloque.horaInicio)),
      0
    );

    return {
      estudiante,
      fecha: new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      semanaNumero: 1,
      trimestre: 1,
      versiculoSemana: obtenerLemaAcademico(1),
      bloques,
      totalHorasPedagogicas: Math.round((totalMinutos / 60) * 100) / 100,
    };
  }

  /**
   * Helper para convertir minutos transcurridos desde medianoche a formato "HH:MM".
   */
  private formatearMinutosAHora(minutosTotales: number): string {
    const horas = Math.floor(minutosTotales / 60);
    const minutos = minutosTotales % 60;
    const hh = String(horas).padStart(2, '0');
    const mm = String(minutos).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  /**
   * Convierte "HH:MM" en minutos desde medianoche.
   */
  private horaAMinutos(hora: string): number {
    const [hh, mm] = hora.split(':').map((valor) => parseInt(valor, 10));
    return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0);
  }

  /**
   * c) Despacha el material de Google Drive hacia el pipeline de OpenMAIC (MinerU + LangGraph 1.1).
   * Genera las 4 escenas interactivas con voz neural y pizarra digital colaborativa.
   *
   * @param estudiante Estudiante receptor de la clase (Gael o Avril)
   * @param materialDelDia Archivo y metadatos de la clase a dictar
   * @returns Sesión completa de aula interactiva de OpenMAIC
   */
  public async despacharMaterialDriveHaciaAgenteOpenMaic(
    estudiante: EstudianteWisdom,
    materialDelDia: MaterialCurricularDrive | { nombreArchivo: string; materia: string; versiculoBiblico: string }
  ): Promise<SesionAulaOpenMaic> {
    const esGael = estudiante.edad <= 10;
    const idSesion = `openmaic_session_${estudiante.idMoodle}_${Date.now()}`;
    const openmaicUrl = process.env.OPENMAIC_PORT ? `http://localhost:${process.env.OPENMAIC_PORT}` : 'http://localhost:3000';
    const perfil = obtenerPerfilCurricular(estudiante.codigoCarpetaAnioDrive);
    const asignatura = buscarAsignatura(perfil, materialDelDia.materia);
    const teologia = esAsignaturaTeologica(asignatura.nombre);
    const lemaOrientador = teologia
      ? asignatura.lema.texto
      : materialDelDia.versiculoBiblico || asignatura.lema.texto;

    // Construye el payload de generación según el área epistemológica del estudiante.
    const payloadDespacho = {
      profile: estudiante.perfilAgente,
      sourceDocument: {
        name: materialDelDia.nombreArchivo,
        subject: asignatura.nombre,
        bibleVerse: teologia ? lemaOrientador : null,
        academicPrinciple: teologia ? null : lemaOrientador,
        driveFileId: (materialDelDia as any).idArchivoDrive || 'local_cache_drive',
      },
      pedagogicalWeights: esGael
        ? { slides: 0.35, interactive: 0.35, quiz: 0.20, pbl: 0.10 }
        : { slides: 0.30, interactive: 0.25, quiz: 0.20, pbl: 0.25 },
      languages: esGael ? { es: 0.7, en: 0.3 } : { es: 0.5, en: 0.5 },
      voice: esGael ? 'es-CO-SalomeNeural' : 'es-MX-DaliaNeural',
    };

    try {
      // Intenta enviar al endpoint de OpenMAIC en Docker si está disponible
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const resp = await fetch(`${openmaicUrl}/api/workbench/generate-from-drive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadDespacho),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (resp.ok) {
        const datos = await resp.json();
        return {
          idSesion: datos.sessionId || idSesion,
          urlAulaInteractiva: `${openmaicUrl}/classroom/${datos.sessionId || idSesion}`,
          perfilPedagogico: estudiante.perfilAgente,
          versiculoLema: lemaOrientador,
          escenas: datos.scenes,
          narradorNeural: payloadDespacho.voice,
          timestampGeneracion: new Date().toISOString(),
        };
      }
    } catch {
      // Si el contenedor aún no responde, activamos el simulador determinista de OpenMAIC v1.2.0
    }

    return {
      idSesion,
      urlAulaInteractiva: `${openmaicUrl}/classroom/${idSesion}?student=${estudiante.nombreCompleto}&profile=${estudiante.perfilAgente}`,
      perfilPedagogico: estudiante.perfilAgente,
      versiculoLema: lemaOrientador,
      escenas: {
        slides: {
          totalDiapositivas: esGael ? 8 : 12,
          tema: `${asignatura.nombre}: ${asignatura.unidades[0].titulo}`,
        },
        interactive: {
          tipoSimulacion:
            asignatura.simulacion.tipo === 'PYTHON_SANDBOX'
              ? 'Editor Python, pruebas y depuración'
              : asignatura.simulacion.tipo === 'MATH_EXPLORER'
              ? 'Laboratorio de modelado matemático y geometría'
              : asignatura.simulacion.tipo === 'SCIENCE_LAB'
              ? 'Laboratorio experimental y análisis de datos'
              : asignatura.simulacion.tipo === 'BIBLE_THEOLOGY'
              ? 'Seminario de exégesis y teología sistemática'
              : asignatura.simulacion.tipo === 'ART_CANVAS'
              ? 'Estudio de composición y producción artística'
              : 'Análisis de fuentes y toma de decisiones',
          pizarraActiva: true,
        },
        quiz: {
          totalPreguntas: 5,
          escalaNota: 100,
        },
        pbl: {
          tituloReto: teologia
            ? 'Ensayo de teología aplicada y discipulado'
            : asignatura.retoPbl.titulo,
          formatoEntrega: teologia
            ? 'Documento PDF con bibliografía bíblica y teológica'
            : esGael
            ? 'Fotografía o PDF de bitácora con evidencia'
            : 'Documento PDF con fuentes académicas citadas',
        },
      },
      narradorNeural: payloadDespacho.voice,
      timestampGeneracion: new Date().toISOString(),
    };
  }
}

// Exporta instancia singleton del sincronizador
export const curriculumSynchronizer = new GoogleDriveCurriculumSynchronizer();

