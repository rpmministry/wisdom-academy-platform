/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Hub Multicanal de Videollamadas
 * ARCHIVO: src/services/videoTutoringHub.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Orquestador de salas sincrónicas para conectar a los estudiantes con profesores
 * humanos reales en tutorías personalizadas, devocionales y entrevistas ministeriales
 * de seguimiento del MINEDUC Ecuador.
 *
 * PLATAFORMAS INTEGRADAS:
 * 1. Jitsi Meet: Salas gratuitas sin límite de tiempo, incrustables por IFrame in-app.
 * 2. BigBlueButton: Pizarra multiusuario sobre PDFs de Google Drive y grabación en Moodle.
 * 3. Google Meet: Enlaces automáticos vinculados a Google Calendar y Google Workspace.
 * 4. Zoom: Soporte de enlaces diferenciados (ingreso de alumno vs inicio de profesor).
 * 5. Microsoft Teams: Conexión directa para tutores externos con licencias institucionales.
 * ==============================================================================
 */

import { PlataformaVideollamada } from '@/types/wisdom';

/**
 * Metadatos y configuración de una sala de tutoría generada.
 */
export interface ConfiguracionSalaTutoria {
  plataforma: PlataformaVideollamada;
  nombreVisible: string;
  nombreSala: string;
  urlReunion: string;
  urlModerador?: string;
  permiteIncrustarIframe: boolean;
  instruccionesDocente: string;
  instruccionesAlumno: string;
  icono: string;
  colorAcento: string;
  soportaPizarraCompartida: boolean;
  soportaGrabacionClase: boolean;
  /** Indica si la institución configuró una sala real para esta plataforma. */
  disponible: boolean;
  motivoNoDisponible?: string;
}

/**
 * Parámetros para inicializar una reunión sincrónica con un docente tutor.
 */
export interface ParametrosNuevaTutoria {
  grado: string;
  curso: string;
  nombreEstudiante: string;
  nombreTutor?: string;
  idMoodleCurso?: number;
}

/**
 * Clase principal que resuelve y construye las salas de videollamadas.
 */
export class VideoTutoringMultiPlatformHub {
  private jitsiDomain: string;
  private defaultGoogleMeet: string;
  private defaultZoom: string;
  private defaultTeams: string;

  constructor() {
    this.jitsiDomain = process.env.JITSI_DOMAIN || 'meet.jit.si';
    // No se usan servidores ni secretos públicos de demostración. Si la
    // institución no configuró una sala, la plataforma se marca como no
    // disponible en lugar de abrir una URL ficticia.
    this.defaultGoogleMeet = process.env.GOOGLE_MEET_DEFAULT_URL || '';
    this.defaultZoom = process.env.ZOOM_DEFAULT_JOIN_URL || '';
    this.defaultTeams = process.env.MS_TEAMS_DEFAULT_URL || '';
  }

  /**
   * Genera la configuración completa de la sala de videollamada para la plataforma seleccionada.
   *
   * @param plataforma Identificador de la plataforma ('jitsi' | 'bigbluebutton' | 'google_meet' | 'zoom' | 'microsoft_teams')
   * @param params Grado, materia y nombre del estudiante
   * @returns Configuración lista para incrustar en IFrame o lanzar en pestaña externa
   */
  public generarSesionTutoria(
    plataforma: PlataformaVideollamada,
    params: ParametrosNuevaTutoria
  ): ConfiguracionSalaTutoria {
    const gradoLimpio = params.grado.replace(/[^a-zA-Z0-9]/g, '_');
    const cursoLimpio = params.curso.replace(/[^a-zA-Z0-9]/g, '_');
    const nombreSala = `WisdomAcademy_${gradoLimpio}_${cursoLimpio}`;

    switch (plataforma) {
      // 1. JITSI MEET (Incrustable en IFrame dentro de Wisdom Academy)
      case 'jitsi': {
        const urlJitsi = `https://${this.jitsiDomain}/${nombreSala}#config.prejoinPageEnabled=false&config.defaultLanguage="es"&interfaceConfig.SHOW_JITSI_WATERMARK=false`;
        return {
          plataforma: 'jitsi',
          nombreVisible: 'Jitsi Meet (In-App)',
          nombreSala,
          urlReunion: urlJitsi,
          permiteIncrustarIframe: true,
          instruccionesAlumno: 'La tutoría cargará dentro de esta misma pantalla. Activa tu cámara y micrófono cuando el docente ingrese.',
          instruccionesDocente: 'Comparte tu pantalla y utiliza el chat integrado para interactuar con el alumno.',
          icono: 'video',
          colorAcento: 'var(--wa-brand-gold-primary)',
          soportaPizarraCompartida: true,
          soportaGrabacionClase: false,
          disponible: true,
        };
      }

      // 2. BIGBLUEBUTTON (Moodle BN con soporte de pizarra sobre PDF)
      case 'bigbluebutton': {
        const idCurso = params.idMoodleCurso || 401;
        const moodleUrl = process.env.NEXT_PUBLIC_MOODLE_URL?.replace(/\/$/, '') || '';
        const disponible = Boolean(moodleUrl);
        const urlBbb = disponible
          ? `${moodleUrl}/mod/bigbluebuttonbn/view.php?id=${idCurso}`
          : '';

        return {
          plataforma: 'bigbluebutton',
          nombreVisible: 'BigBlueButton (Pizarra Moodle)',
          nombreSala,
          urlReunion: urlBbb,
          permiteIncrustarIframe: true,
          instruccionesAlumno: 'Conéctate a la sesión con audio y pizarra interactiva sobre los libros de texto.',
          instruccionesDocente: 'Carga el PDF de Google Drive directamente en la pizarra compartida de BigBlueButton.',
          icono: 'presentation',
          colorAcento: 'var(--wa-brand-navy-primary)',
          soportaPizarraCompartida: true,
          soportaGrabacionClase: true,
          disponible,
          ...(disponible
            ? {}
            : { motivoNoDisponible: 'El aula Moodle/BigBlueButton no está configurada.' }),
        };
      }

      // 3. GOOGLE MEET (Sincronizado con Google Calendar)
      case 'google_meet': {
        const disponible = /^https:\/\/meet\.google\.com\//.test(this.defaultGoogleMeet);
        return {
          plataforma: 'google_meet',
          nombreVisible: 'Google Meet',
          nombreSala: 'Enlace Google Meet',
          urlReunion: disponible ? this.defaultGoogleMeet : '',
          permiteIncrustarIframe: false, // Google Meet bloquea IFrame por política CSP X-Frame-Options
          instruccionesAlumno: 'Haz clic en el botón para unirte a la reunión en tu cuenta de Google.',
          instruccionesDocente: 'Inicia la reunión con tu cuenta de tutor de Wisdom Academy.',
          icono: 'external-link',
          colorAcento: '#1A73E8',
          soportaPizarraCompartida: true,
          soportaGrabacionClase: true,
          disponible,
          ...(disponible
            ? {}
            : { motivoNoDisponible: 'La sala institucional de Google Meet no está configurada.' }),
        };
      }

      // 4. ZOOM (Lanzamiento para estudiante y profesor)
      case 'zoom': {
        const disponible = /^https:\/\//.test(this.defaultZoom);
        return {
          plataforma: 'zoom',
          nombreVisible: 'Zoom Meeting',
          nombreSala: 'Sala Zoom Wisdom',
          urlReunion: disponible ? this.defaultZoom : '',
          urlModerador: disponible ? `${this.defaultZoom}?role=host` : undefined,
          permiteIncrustarIframe: false,
          instruccionesAlumno: 'Abre la aplicación de Zoom o ingresa directamente desde el navegador web.',
          instruccionesDocente: 'Inicia sesión como anfitrión para habilitar la sala de espera y la grabación en la nube.',
          icono: 'external-link',
          colorAcento: '#2D8CFF',
          soportaPizarraCompartida: true,
          soportaGrabacionClase: true,
          disponible,
          ...(disponible
            ? {}
            : { motivoNoDisponible: 'La sala institucional de Zoom no está configurada.' }),
        };
      }

      // 5. MICROSOFT TEAMS (Tutorías Especialistas)
      case 'microsoft_teams': {
        const disponible = /^https:\/\/teams\.microsoft\.com\//.test(this.defaultTeams);
        return {
          plataforma: 'microsoft_teams',
          nombreVisible: 'Microsoft Teams',
          nombreSala: 'Reunión Teams',
          urlReunion: disponible ? this.defaultTeams : '',
          permiteIncrustarIframe: false,
          instruccionesAlumno: 'Únete como invitado o mediante tu cuenta de Microsoft.',
          instruccionesDocente: 'Gestiona la sesión desde Teams con soporte de transcripción y notas en vivo.',
          icono: 'external-link',
          colorAcento: '#464EB8',
          soportaPizarraCompartida: true,
          soportaGrabacionClase: true,
          disponible,
          ...(disponible
            ? {}
            : { motivoNoDisponible: 'La sala institucional de Microsoft Teams no está configurada.' }),
        };
      }
    }
  }

  /**
   * Devuelve el catálogo de plataformas disponibles para el menú selector del aula.
   */
  public obtenerPlataformasDisponibles(): {
    id: PlataformaVideollamada;
    nombre: string;
    descripcion: string;
    soportaIframe: boolean;
    insignia: string;
    disponible: boolean;
  }[] {
    return [
      {
        id: 'jitsi',
        nombre: 'Jitsi Meet',
        descripcion: 'Videollamada instantánea sin salir del aula (IFrame integrado).',
        soportaIframe: true,
        insignia: 'In-App Directo',
        disponible: true,
      },
      {
        id: 'bigbluebutton',
        nombre: 'BigBlueButton',
        descripcion: 'Pizarra colaborativa sobre PDFs de Google Drive y grabación en Moodle.',
        soportaIframe: true,
        insignia: 'Pizarra Académica',
        disponible: Boolean(process.env.NEXT_PUBLIC_MOODLE_URL),
      },
      {
        id: 'google_meet',
        nombre: 'Google Meet',
        descripcion: 'Reunión en Google Calendar sincronizada con tu cuenta de Drive.',
        soportaIframe: false,
        insignia: 'Google Workspace',
        disponible: /^https:\/\/meet\.google\.com\//.test(this.defaultGoogleMeet),
      },
      {
        id: 'zoom',
        nombre: 'Zoom Meeting',
        descripcion: 'Enlace de alta estabilidad para tutorías grupales y conferencias.',
        soportaIframe: false,
        insignia: 'Zoom Cloud',
        disponible: /^https:\/\//.test(this.defaultZoom),
      },
      {
        id: 'microsoft_teams',
        nombre: 'Microsoft Teams',
        descripcion: 'Tutorías externas especializadas con herramientas de productividad.',
        soportaIframe: false,
        insignia: 'MS Teams',
        disponible: /^https:\/\/teams\.microsoft\.com\//.test(this.defaultTeams),
      },
    ];
  }
}

// Instancia singleton para exportación
export const videoTutoringHub = new VideoTutoringMultiPlatformHub();

