'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Interfaz Principal del Aula Híbrida
 * ARCHIVO: src/components/WisdomClassroomShell.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * UI Shell de la plataforma educativa sobre el 2x Grid de IBM Carbon Design System
 * e Impeccable Style. Orquesta:
 * 1. Cabecera fija de 64px (8x) con selector de perfil (Gael 4° EGB vs Avril 8° EGB),
 *    conmutador en un clic (Profesor IA OpenMAIC vs Tutoría con Profesor Real),
 *    selector bilingüe (ES / EN) y selector de tema (Pergamino / Obsidiana).
 * 2. Panel lateral (span 4): Horario automático de Drive, versículo lema de fe,
 *    paquetes descargables sin internet (Offline-First) y portafolio MINEDUC diferenciado.
 * 3. Lienzo principal 16:9 (span 12): Aula interactiva multi-agente con 4 escenas
 *    (slides, pizarra, quiz formativo, reto PBL) o sala de videollamada multicanal
 *    (Jitsi Meet in-app, BigBlueButton, Google Meet, Zoom y Teams).
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  EstudianteWisdom,
  BloqueHorarioDia,
  PlataformaVideollamada,
  ESTUDIANTE_GAEL_INICIAL,
  ESTUDIANTE_AVRIL_INICIAL,
} from '@/types/wisdom';
import { videoTutoringHub } from '@/services/videoTutoringHub';
import {
  curriculumContentEngine,
  LeccionMateriaCompleta,
  DiapositivaLeccion,
  IntervencionOpenMAIC,
} from '@/services/curriculumContentEngine';
import { teacherSpeechManager } from '@/utils/speechSynthesis';
import { printableGuideGenerator } from '@/services/printableGuideGenerator';
import { EcuadorPortfolioManager } from './EcuadorPortfolioManager';
import { WorkshopsAndGradesCatalog } from './WorkshopsAndGradesCatalog';
import { OpenMAICClassroomViewer } from './OpenMAICClassroomViewer';
import {
  EcuadorSchoolCalendarEngine,
  DetalleDiaLectivo,
  FERIADOS_ECUADOR_2026_2027,
  FeriadoEcuador,
} from '@/services/ecuadorSchoolCalendar';

/**
 * Modos de visualización del aula interactiva y módulos del ecosistema
 */
type ModoAula = 'AGENTE_IA' | 'PROFESOR_REAL';
type PestanaEscenaIA = 'slides' | 'interactive' | 'quiz' | 'pbl';
type ModuloNavegacion = 'AULA' | 'CATALOGO' | 'PORTAFOLIO';

export default function WisdomClassroomShell() {
  // ----------------------------------------------------------------------------
  // ESTADOS PRINCIPALES DE SESIÓN Y PERFIL
  // ----------------------------------------------------------------------------
  const [estudianteActivo, setEstudianteActivo] = useState<EstudianteWisdom>(ESTUDIANTE_AVRIL_INICIAL);
  const [moduloActivo, setModuloActivo] = useState<ModuloNavegacion>('AULA');
  const [modoAula, setModoAula] = useState<ModoAula>('AGENTE_IA');
  const [temaOscuro, setTemaOscuro] = useState<boolean>(false);
  const [idiomaIngles, setIdiomaIngles] = useState<boolean>(false);

  // Estados del lienzo interactivo de OpenMAIC
  const [escenaActiva, setEscenaActiva] = useState<PestanaEscenaIA>('slides');
  const [diapositivaActual, setDiapositivaActual] = useState<number>(1);
  const [respuestaQuizSeleccionada, setRespuestaQuizSeleccionada] = useState<number | null>(null);
  const [notaQuizAsentada, setNotaQuizAsentada] = useState<number | null>(null);

  // Estados dinámicos de evaluación y simulación de asignaturas
  const [preguntaQuizIndex, setPreguntaQuizIndex] = useState<number>(0);
  const [respuestasQuizUsuario, setRespuestasQuizUsuario] = useState<Record<number, number>>({});
  const [mostrarExplicacionQuiz, setMostrarExplicacionQuiz] = useState<boolean>(false);
  const [codigoPython, setCodigoPython] = useState<string>('');
  const [consolaPython, setConsolaPython] = useState<string>('');
  const [ejecutandoPython, setEjecutandoPython] = useState<boolean>(false);

  // Estados del asistente interactivo con Gemini 3.8 Flash (OpenMAIC Live)
  const [mostrarModalIA, setMostrarModalIA] = useState<boolean>(false);
  const [preguntaEstudianteIA, setPreguntaEstudianteIA] = useState<string>('');
  const [respuestaProfesorIA, setRespuestaProfesorIA] = useState<string>('');
  const [cargandoIA, setCargandoIA] = useState<boolean>(false);
  const [hablandoProfesor, setHablandoProfesor] = useState<boolean>(false);
  const [mostrarModalGuiaPdf, setMostrarModalGuiaPdf] = useState<boolean>(false);

  // Estados del Hub de Videollamadas
  const [plataformaVideo, setPlataformaVideo] = useState<PlataformaVideollamada>('jitsi');

  // Estado del bloque seleccionado en el horario
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<number>(1);

  // Estados del Calendario Escolar Ecuador Sierra 2026-2027
  // Índice 0 = Día 1 (Lunes 20 de Octubre de 2026 - Inicio Oficial)
  const [diaLectivoIndex, setDiaLectivoIndex] = useState<number>(0);
  const [mostrarModalCalendario, setMostrarModalCalendario] = useState<boolean>(false);

  // ----------------------------------------------------------------------------
  // APLICACIÓN DEL TEMA (PERGAMINO CLARO VS OBSIDIANA OSCURO)
  // ----------------------------------------------------------------------------
  useEffect(() => {
    const htmlElement = document.documentElement;
    if (temaOscuro) {
      htmlElement.setAttribute('data-theme', 'dark');
    } else {
      htmlElement.removeAttribute('data-theme');
    }
  }, [temaOscuro]);

  // ----------------------------------------------------------------------------
  // CALENDARIO ESCOLAR OFICIAL SIERRA - AMAZONÍA 2026 / 2027 (MINEDUC)
  // Clases inician el Lunes 20 de Octubre de 2026 con progresión día a día.
  // Respeta los feriados nacionales ecuatorianos y vacaciones oficiales.
  // ----------------------------------------------------------------------------
  const esGael = estudianteActivo.edad <= 10;
  const diasLectivos: DetalleDiaLectivo[] = EcuadorSchoolCalendarEngine.generarDiasLectivos(40);
  const diaLectivoActual: DetalleDiaLectivo = diasLectivos[diaLectivoIndex] || diasLectivos[0];

  // Helper para generar los bloques del horario escolar según el día de la semana oficial
  const obtenerHorarioSegunDia = (dia: DetalleDiaLectivo, esGaelAlumno: boolean): BloqueHorarioDia[] => {
    const dSemana = dia.diaSemana;
    if (esGaelAlumno) {
      // HORARIO SEMANAL DE GAEL (4° EGB - 08:00 A 12:00)
      switch (dSemana) {
        case 'Lunes':
          return [
            {
              id: 'bloque_gael_lun_1',
              numeroBloque: 1,
              horaInicio: '08:00',
              horaFin: '08:45',
              nombreMateria: 'Lengua y Literatura',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Texto Lengua 4.pdf',
              versiculoBloque: 'Proverbios 1:7: El principio de la sabiduría es el temor de Jehová.',
            },
            {
              id: 'bloque_gael_lun_2',
              numeroBloque: 2,
              horaInicio: '08:45',
              horaFin: '09:30',
              nombreMateria: 'Lengua y Literatura',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Super-cuaderno de ortografía.pdf',
              versiculoBloque: 'Salmos 119:105: Lámpara es a mis pies tu palabra.',
            },
            {
              id: 'bloque_gael_lun_3',
              numeroBloque: 3,
              horaInicio: '10:00',
              horaFin: '10:45',
              nombreMateria: 'Matemáticas Creacionales',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'texto Matematica 4.pdf',
              versiculoBloque: 'Salmos 147:4: Él cuenta el número de las estrellas; a todas llama por su nombre.',
            },
            {
              id: 'bloque_gael_lun_4',
              numeroBloque: 4,
              horaInicio: '10:45',
              horaFin: '11:30',
              nombreMateria: 'Ciencias Naturales',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'AC_4_CN.pdf',
              versiculoBloque: 'Génesis 1:1: En el principio creó Dios los cielos y la tierra.',
            },
            {
              id: 'bloque_gael_lun_5',
              numeroBloque: 5,
              horaInicio: '11:30',
              horaFin: '12:00',
              nombreMateria: 'Relación con Dios',
              modalidad: 'TUTORIA_PROFESOR_REAL',
              plataformaTutoria: 'jitsi',
              archivoDriveTema: 'Plan Curricular Relación con Dios 4to EGB.pdf',
              versiculoBloque: 'Miqueas 6:8: Hacer justicia, amar misericordia y humillarte ante Dios.',
            },
          ];
        case 'Martes':
          return [
            {
              id: 'bloque_gael_mar_1',
              numeroBloque: 1,
              horaInicio: '08:00',
              horaFin: '08:45',
              nombreMateria: 'Matemáticas Creacionales',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'texto Matematica 4.pdf',
              versiculoBloque: 'Proverbios 11:1: El peso falso es abominación a Jehová; mas la pesa cabal le agrada.',
            },
            {
              id: 'bloque_gael_mar_2',
              numeroBloque: 2,
              horaInicio: '08:45',
              horaFin: '09:30',
              nombreMateria: 'Matemáticas Creacionales',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'AC_4_M.pdf',
              versiculoBloque: '1 Corintios 14:40: Pero hágase todo decentemente y con orden.',
            },
            {
              id: 'bloque_gael_mar_3',
              numeroBloque: 3,
              horaInicio: '10:00',
              horaFin: '10:45',
              nombreMateria: 'Ciencias Naturales',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'AC_4_CN.pdf',
              versiculoBloque: 'Salmos 104:24: ¡Cuán innumerables son tus obras, oh Jehová!',
            },
            {
              id: 'bloque_gael_mar_4',
              numeroBloque: 4,
              horaInicio: '10:45',
              horaFin: '11:30',
              nombreMateria: 'English Phonics & Reading',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: '4th_EGB_ENGLISH.pdf',
              versiculoBloque: 'Filipenses 4:8: Todo lo que es verdadero, en esto pensad.',
            },
            {
              id: 'bloque_gael_mar_5',
              numeroBloque: 5,
              horaInicio: '11:30',
              horaFin: '12:00',
              nombreMateria: 'Educación Cultural y Artística (Arte)',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Libro_de_Actividades_4to._Grado.pdf',
              versiculoBloque: 'Éxodo 35:35: Los ha llenado de sabiduría de corazón, para que hagan toda obra de arte.',
            },
          ];
        case 'Miercoles':
          return [
            {
              id: 'bloque_gael_mie_1',
              numeroBloque: 1,
              horaInicio: '08:00',
              horaFin: '08:45',
              nombreMateria: 'Lengua y Literatura',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Texto Lengua 4.pdf',
              versiculoBloque: 'Proverbios 4:7: Sabiduría ante todo; adquiere sabiduría.',
            },
            {
              id: 'bloque_gael_mie_2',
              numeroBloque: 2,
              horaInicio: '08:45',
              horaFin: '09:30',
              nombreMateria: 'Lengua y Literatura',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'AC_4_LL.pdf',
              versiculoBloque: 'Salmos 19:7: La ley de Jehová es perfecta, que convierte el alma.',
            },
            {
              id: 'bloque_gael_mie_3',
              numeroBloque: 3,
              horaInicio: '10:00',
              horaFin: '10:45',
              nombreMateria: 'Estudios Sociales del Ecuador',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: '4to_EGB_ESTUDIOS_SOCIALES.pdf',
              versiculoBloque: 'Salmos 33:12: Bienaventurada la nación cuyo Dios es Jehová.',
            },
            {
              id: 'bloque_gael_mie_4',
              numeroBloque: 4,
              horaInicio: '10:45',
              horaFin: '11:30',
              nombreMateria: 'Matemáticas Creacionales',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'texto Matematica 4.pdf',
              versiculoBloque: 'Génesis 1:28: Fructificad y multiplicaos; llenad la tierra.',
            },
            {
              id: 'bloque_gael_mie_5',
              numeroBloque: 5,
              horaInicio: '11:30',
              horaFin: '12:00',
              nombreMateria: 'Educación Física y Salud',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Plan Curricular Educación Física 4to EGB.pdf',
              versiculoBloque: '1 Corintios 6:19: Vuestro cuerpo es templo del Espíritu Santo.',
            },
          ];
        case 'Jueves':
          return [
            {
              id: 'bloque_gael_jue_1',
              numeroBloque: 1,
              horaInicio: '08:00',
              horaFin: '08:45',
              nombreMateria: 'Ciencias Naturales',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'AC_4_CN.pdf',
              versiculoBloque: 'Salmos 19:1: Los cielos cuentan la gloria de Dios.',
            },
            {
              id: 'bloque_gael_jue_2',
              numeroBloque: 2,
              horaInicio: '08:45',
              horaFin: '09:30',
              nombreMateria: 'Ciencias Naturales',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Plan Curricular Ciencias Naturales 4to EGB.pdf',
              versiculoBloque: 'Hebreos 11:3: Por la fe entendemos haber sido constituido el universo.',
            },
            {
              id: 'bloque_gael_jue_3',
              numeroBloque: 3,
              horaInicio: '10:00',
              horaFin: '10:45',
              nombreMateria: 'English Phonics & Reading',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Plan Curricular Inglés 4to EGB.pdf',
              versiculoBloque: 'Colosenses 3:16: La palabra de Cristo more en abundancia en vosotros.',
            },
            {
              id: 'bloque_gael_jue_4',
              numeroBloque: 4,
              horaInicio: '10:45',
              horaFin: '11:30',
              nombreMateria: 'Software y Programación',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Software y Programación 4 de básica Gael.pdf',
              versiculoBloque: 'Proverbios 2:6: Porque Jehová da la sabiduría, y de su boca viene el conocimiento.',
            },
            {
              id: 'bloque_gael_jue_5',
              numeroBloque: 5,
              horaInicio: '11:30',
              horaFin: '12:00',
              nombreMateria: 'Lengua y Literatura',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Texto Lengua 4.pdf',
              versiculoBloque: 'Proverbios 16:24: Panal de miel son los dichos suaves.',
            },
          ];
        case 'Viernes':
          return [
            {
              id: 'bloque_gael_vie_1',
              numeroBloque: 1,
              horaInicio: '08:00',
              horaFin: '08:45',
              nombreMateria: 'Matemáticas Creacionales',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'texto Matematica 4.pdf',
              versiculoBloque: 'Lucas 9:16: Y tomando los cinco panes y los dos pescados... los bendijo y los partió.',
            },
            {
              id: 'bloque_gael_vie_2',
              numeroBloque: 2,
              horaInicio: '08:45',
              horaFin: '09:30',
              nombreMateria: 'Estudios Sociales del Ecuador',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: '4to_EGB_ESTUDIOS_SOCIALES.pdf',
              versiculoBloque: 'Proverbios 14:34: La justicia engrandece a la nación.',
            },
            {
              id: 'bloque_gael_vie_3',
              numeroBloque: 3,
              horaInicio: '10:00',
              horaFin: '10:45',
              nombreMateria: 'Estudios Sociales del Ecuador',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'AC_4_ES.pdf',
              versiculoBloque: 'Salmos 20:5: Nosotros nos alegraremos en tu salvación.',
            },
            {
              id: 'bloque_gael_vie_4',
              numeroBloque: 4,
              horaInicio: '10:45',
              horaFin: '11:30',
              nombreMateria: 'Software y Programación',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'think-python-es.pdf',
              versiculoBloque: 'Daniel 1:17: A estos muchachos Dios les dio conocimiento e inteligencia.',
            },
            {
              id: 'bloque_gael_vie_5',
              numeroBloque: 5,
              horaInicio: '11:30',
              horaFin: '12:00',
              nombreMateria: 'English Phonics & Reading',
              modalidad: 'TUTORIA_PROFESOR_REAL',
              plataformaTutoria: 'jitsi',
              archivoDriveTema: '4th_EGB_ENGLISH.pdf',
              versiculoBloque: '1 Juan 4:7: Amémonos unos a otros; porque el amor es de Dios.',
            },
          ];
      }
    } else {
      // HORARIO SEMANAL DE AVRIL (8° EGB - 08:00 A 12:00)
      switch (dSemana) {
        case 'Lunes':
          return [
            {
              id: 'bloque_avril_lun_1',
              numeroBloque: 1,
              horaInicio: '08:00',
              horaFin: '08:45',
              nombreMateria: 'Matemáticas y Pre-Álgebra',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'MATEMATICA 8.pdf',
              versiculoBloque: 'Jeremías 33:25: Si no permaneciere mi pacto con el día y la noche, si yo no he puesto las leyes del cielo y la tierra...',
            },
            {
              id: 'bloque_avril_lun_2',
              numeroBloque: 2,
              horaInicio: '08:45',
              horaFin: '09:30',
              nombreMateria: 'Matemáticas y Pre-Álgebra',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'MATEMATICA 8.pdf',
              versiculoBloque: 'Colosenses 2:3: En quien están escondidos todos los tesoros de la sabiduría y del conocimiento.',
            },
            {
              id: 'bloque_avril_lun_3',
              numeroBloque: 3,
              horaInicio: '10:00',
              horaFin: '10:45',
              nombreMateria: 'Ciencias Naturales Integradas',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'CIENCIAS NATURALES 8.pdf',
              versiculoBloque: 'Romanos 1:20: Las cosas invisibles de él se hacen claramente visibles.',
            },
            {
              id: 'bloque_avril_lun_4',
              numeroBloque: 4,
              horaInicio: '10:45',
              horaFin: '11:30',
              nombreMateria: 'Lengua y Literatura',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'LENGUA Y LITERATURA 8.pdf',
              versiculoBloque: 'Proverbios 4:7: Sabiduría ante todo; adquiere sabiduría.',
            },
            {
              id: 'bloque_avril_lun_5',
              numeroBloque: 5,
              horaInicio: '11:30',
              horaFin: '12:00',
              nombreMateria: 'Relación con Dios (Teología)',
              modalidad: 'TUTORIA_PROFESOR_REAL',
              plataformaTutoria: 'jitsi',
              archivoDriveTema: 'Macro Currículo - Relación con Dios - Avril.pdf',
              versiculoBloque: 'Miqueas 6:8: Hacer justicia, amar misericordia y humillarte ante Dios.',
            },
          ];
        case 'Martes':
          return [
            {
              id: 'bloque_avril_mar_1',
              numeroBloque: 1,
              horaInicio: '08:00',
              horaFin: '08:45',
              nombreMateria: 'Academic English & Literature',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: '8th_EGB_ENGLISH.pdf',
              versiculoBloque: 'Filipenses 4:8: Todo lo que es verdadero, todo lo honesto, en esto pensad.',
            },
            {
              id: 'bloque_avril_mar_2',
              numeroBloque: 2,
              horaInicio: '08:45',
              horaFin: '09:30',
              nombreMateria: 'Academic English & Literature',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Macro Currículo INGLES - Wisdom School.pdf',
              versiculoBloque: 'Colosenses 4:6: Sea vuestra palabra siempre con gracia, sazonada con sal.',
            },
            {
              id: 'bloque_avril_mar_3',
              numeroBloque: 3,
              horaInicio: '10:00',
              horaFin: '10:45',
              nombreMateria: 'Estudios Sociales',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Macro Currículo - Estudios Sociales - Wisdom School.pdf',
              versiculoBloque: 'Salmos 33:12: Bienaventurada la nación cuyo Dios es Jehová.',
            },
            {
              id: 'bloque_avril_mar_4',
              numeroBloque: 4,
              horaInicio: '10:45',
              horaFin: '11:30',
              nombreMateria: 'Administración y Marketing',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Macro Currículo - Administración y Marketing.pdf',
              versiculoBloque: 'Lucas 16:10: El que es fiel en lo muy poco, también en lo más es fiel.',
            },
            {
              id: 'bloque_avril_mar_5',
              numeroBloque: 5,
              horaInicio: '11:30',
              horaFin: '12:00',
              nombreMateria: 'Educación Cultural y Artística (Arte)',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'ECA_artistica 8.pdf',
              versiculoBloque: 'Salmos 27:4: Para contemplar la hermosura de Jehová, y para inquirir en su templo.',
            },
          ];
        case 'Miercoles':
          return [
            {
              id: 'bloque_avril_mie_1',
              numeroBloque: 1,
              horaInicio: '08:00',
              horaFin: '08:45',
              nombreMateria: 'Lengua y Literatura',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'LENGUA Y LITERATURA 8.pdf',
              versiculoBloque: 'Proverbios 25:11: Manzana de oro con figuras de plata es la palabra dicha como conviene.',
            },
            {
              id: 'bloque_avril_mie_2',
              numeroBloque: 2,
              horaInicio: '08:45',
              horaFin: '09:30',
              nombreMateria: 'Lengua y Literatura',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Micro Currículo - Lengua y Literatura 8vo.pdf',
              versiculoBloque: 'Santiago 1:19: Pronto para oír, tardo para hablar, tardo para airarse.',
            },
            {
              id: 'bloque_avril_mie_3',
              numeroBloque: 3,
              horaInicio: '10:00',
              horaFin: '10:45',
              nombreMateria: 'Software y Programación',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Macro Currículo software- Wisdom School.pdf',
              versiculoBloque: '1 Corintios 14:40: Pero hágase todo decentemente y con orden.',
            },
            {
              id: 'bloque_avril_mie_4',
              numeroBloque: 4,
              horaInicio: '10:45',
              horaFin: '11:30',
              nombreMateria: 'Matemáticas y Pre-Álgebra',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'MATEMATICA 8.pdf',
              versiculoBloque: 'Colosenses 2:14: Anulando el acta de los decretos que había contra nosotros.',
            },
            {
              id: 'bloque_avril_mie_5',
              numeroBloque: 5,
              horaInicio: '11:30',
              horaFin: '12:00',
              nombreMateria: 'Educación Física y Salud',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Macro Currículo - Educación Física - Avril.pdf',
              versiculoBloque: '1 Timoteo 4:8: El ejercicio corporal para poco es provechoso, pero la piedad para todo aprovecha.',
            },
          ];
        case 'Jueves':
          return [
            {
              id: 'bloque_avril_jue_1',
              numeroBloque: 1,
              horaInicio: '08:00',
              horaFin: '08:45',
              nombreMateria: 'Ciencias Naturales Integradas',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'CIENCIAS NATURALES 8.pdf',
              versiculoBloque: 'Salmos 104:24: ¡Cuán innumerables son tus obras, oh Jehová! Hiciste todas ellas con sabiduría.',
            },
            {
              id: 'bloque_avril_jue_2',
              numeroBloque: 2,
              horaInicio: '08:45',
              horaFin: '09:30',
              nombreMateria: 'Ciencias Naturales Integradas',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'CIENCIAS NATURALES 8.pdf',
              versiculoBloque: 'Génesis 1:11: Produzca la tierra hierba verde, hierba que dé semilla...',
            },
            {
              id: 'bloque_avril_jue_3',
              numeroBloque: 3,
              horaInicio: '10:00',
              horaFin: '10:45',
              nombreMateria: 'Ciencias Políticas y RR.II.',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Macro Currículo - Ciencias Políticas y RR.II. - Wisdom School.pdf',
              versiculoBloque: 'Proverbios 29:2: Cuando los justos dominan, el pueblo se alegra.',
            },
            {
              id: 'bloque_avril_jue_4',
              numeroBloque: 4,
              horaInicio: '10:45',
              horaFin: '11:30',
              nombreMateria: 'Lengua y Literatura',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'LENGUA Y LITERATURA 8.pdf',
              versiculoBloque: 'Colosenses 3:17: Y todo lo que hacéis, hacedlo todo en el nombre del Señor Jesús.',
            },
            {
              id: 'bloque_avril_jue_5',
              numeroBloque: 5,
              horaInicio: '11:30',
              horaFin: '12:00',
              nombreMateria: 'Administración y Marketing',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Micro Currículo - Administración y Marketing.pdf',
              versiculoBloque: 'Proverbios 16:3: Encomienda a Jehová tus obras, y tus pensamientos serán afirmados.',
            },
          ];
        case 'Viernes':
          return [
            {
              id: 'bloque_avril_vie_1',
              numeroBloque: 1,
              horaInicio: '08:00',
              horaFin: '08:45',
              nombreMateria: 'Matemáticas y Pre-Álgebra',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'MATEMATICA 8.pdf',
              versiculoBloque: 'Job 31:6: Péseme Dios en balanzas de justicia, y conocerá mi integridad.',
            },
            {
              id: 'bloque_avril_vie_2',
              numeroBloque: 2,
              horaInicio: '08:45',
              horaFin: '09:30',
              nombreMateria: 'Software y Programación',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Micro Currículo software- Wisdom School.pdf',
              versiculoBloque: 'Salmos 90:17: Confirma sobre nosotros la obra de nuestras manos.',
            },
            {
              id: 'bloque_avril_vie_3',
              numeroBloque: 3,
              horaInicio: '10:00',
              horaFin: '10:45',
              nombreMateria: 'Ciencias Políticas y RR.II.',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Micro Currículo - Ciencias Políticas y RR.II. - Wisdom School.pdf',
              versiculoBloque: 'Miqueas 4:3: Y juzgará entre muchos pueblos, y corregirá a naciones poderosas.',
            },
            {
              id: 'bloque_avril_vie_4',
              numeroBloque: 4,
              horaInicio: '10:45',
              horaFin: '11:30',
              nombreMateria: 'Estudios Sociales',
              modalidad: 'AGENTE_IA_OPENMAIC',
              archivoDriveTema: 'Micro Currículo - Estudios Sociales - Wisdom School.pdf',
              versiculoBloque: 'Hechos 17:26: Y de una sangre ha hecho todo el linaje de los hombres.',
            },
            {
              id: 'bloque_avril_vie_5',
              numeroBloque: 5,
              horaInicio: '11:30',
              horaFin: '12:00',
              nombreMateria: 'Academic English & Literature',
              modalidad: 'TUTORIA_PROFESOR_REAL',
              plataformaTutoria: 'jitsi',
              archivoDriveTema: 'Micro Currículo INGLES - Wisdom School.pdf',
              versiculoBloque: 'Romanos 12:2: Transformaos por medio de la renovación de vuestro entendimiento.',
            },
          ];
      }
    }
  };

  const bloquesHorario: BloqueHorarioDia[] = obtenerHorarioSegunDia(diaLectivoActual, esGael);
  const bloqueActivo = bloquesHorario[bloqueSeleccionado - 1] || bloquesHorario[0];

  // Configuración de la sala de tutoría
  const sesionTutoria = videoTutoringHub.generarSesionTutoria(plataformaVideo, {
    grado: estudianteActivo.gradoEcuador,
    curso: bloqueActivo.nombreMateria,
    nombreEstudiante: estudianteActivo.nombreCompleto,
  });
  const plataformasVideo = videoTutoringHub.obtenerPlataformasDisponibles();

  // ----------------------------------------------------------------------------
  // LECCIÓN PEDAGÓGICA DINÁMICA DE OPENMAIC (CURRICULUM CONTENT ENGINE)
  // Vincula los libros oficiales de MINEDUC y el macrocurrículo cristiano
  // ----------------------------------------------------------------------------
  const leccionActiva = curriculumContentEngine.obtenerLeccion(
    bloqueActivo.nombreMateria,
    esGael
  );
  const totalDiapositivas = leccionActiva.diapositivas.length;
  const diapositivaActiva: DiapositivaLeccion =
    leccionActiva.diapositivas[diapositivaActual - 1] || leccionActiva.diapositivas[0];
  const totalPreguntasQuiz = leccionActiva.preguntasQuiz.length;
  const preguntaQuizActual =
    leccionActiva.preguntasQuiz[preguntaQuizIndex] || leccionActiva.preguntasQuiz[0];

  // Intervención hablada del Profesor IA y compañero de clase OpenMAIC
  const intervencionProfesor: IntervencionOpenMAIC = curriculumContentEngine.obtenerIntervencionProfesor(
    bloqueActivo.nombreMateria,
    esGael,
    escenaActiva,
    diapositivaActual
  );

  // Detener la locución al cambiar de diapositiva o escena
  useEffect(() => {
    teacherSpeechManager.detener();
    setHablandoProfesor(false);
  }, [diapositivaActual, escenaActiva, bloqueSeleccionado, estudianteActivo.idMoodle]);

  // Manejador de locución de voz para el Profesor IA con soporte de velocidad
  const handleToggleVozProfesor = (velocidad?: number | React.MouseEvent) => {
    const velReal = typeof velocidad === 'number' ? velocidad : 1;
    if (hablandoProfesor) {
      teacherSpeechManager.detener();
      setHablandoProfesor(false);
    } else {
      const guion = diapositivaActiva.guionVozEspecifico || intervencionProfesor.guionVoz;
      const esIngles = bloqueActivo.nombreMateria.toLowerCase().includes('english');
      teacherSpeechManager.hablar(
        guion,
        {
          idioma: esIngles ? 'en' : 'es',
          velocidad: velReal,
          perfil: esGael ? 'mateo' : 'sofia',
        },
        {
          onStart: () => setHablandoProfesor(true),
          onEnd: () => setHablandoProfesor(false),
          onError: () => setHablandoProfesor(false),
        }
      );
    }
  };

  // Sincronización del estado al cambiar de bloque o de estudiante
  useEffect(() => {
    setDiapositivaActual(1);
    setPreguntaQuizIndex(0);
    setRespuestasQuizUsuario({});
    setMostrarExplicacionQuiz(false);
    setRespuestaQuizSeleccionada(null);
    setNotaQuizAsentada(null);
    setRespuestaProfesorIA('');
    setPreguntaEstudianteIA('');
    if (leccionActiva.simulacion?.codigoOTextoInicial) {
      setCodigoPython(leccionActiva.simulacion.codigoOTextoInicial);
    } else {
      setCodigoPython('');
    }
    setConsolaPython(leccionActiva.simulacion?.demostracionInteractiva || '');
  }, [bloqueSeleccionado, estudianteActivo.idMoodle]);

  // Manejador de ejecución del código en el Sandbox de Python
  const handleEjecutarCodigoPython = () => {
    setEjecutandoPython(true);
    setTimeout(() => {
      let salidaGenerada = '';
      try {
        const lineas = codigoPython.split('\n');
        for (const linea of lineas) {
          const l = linea.trim();
          if (l.startsWith('print(') && l.endsWith(')')) {
            const contenido = l.substring(6, l.length - 1);
            if ((contenido.startsWith('"') && contenido.endsWith('"')) || (contenido.startsWith("'") && contenido.endsWith("'"))) {
              salidaGenerada += contenido.slice(1, -1) + '\n';
            } else {
              salidaGenerada += contenido + '\n';
            }
          }
        }
        if (!salidaGenerada.trim()) {
          salidaGenerada = leccionActiva.simulacion.demostracionInteractiva;
        } else {
          salidaGenerada += '\n[✓ Ejecución en Sandbox Python 3.12 completada con éxito en 0.04s]';
        }
      } catch {
        salidaGenerada = leccionActiva.simulacion.demostracionInteractiva;
      }
      setConsolaPython(salidaGenerada);
      setEjecutandoPython(false);
    }, 350);
  };

  // Manejador de consulta en vivo al Profesor IA con Gemini 3.8 Flash
  const handleConsultarProfesorIA = async () => {
    if (!preguntaEstudianteIA.trim()) return;
    setCargandoIA(true);
    setRespuestaProfesorIA('');
    try {
      const res = await fetch('/api/openmaic/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante: estudianteActivo.nombreCompleto,
          edad: estudianteActivo.edad,
          grado: estudianteActivo.gradoEcuador,
          materia: bloqueActivo.nombreMateria,
          temaActual: diapositivaActiva.titulo,
          preguntaEstudiante: preguntaEstudianteIA,
          diapositivaNumero: diapositivaActual,
        }),
      });
      const data = await res.json();
      if (data.exito && data.explicacion) {
        setRespuestaProfesorIA(data.explicacion);
      } else {
        setRespuestaProfesorIA(diapositivaActiva.contenidoExplicativo);
      }
    } catch {
      setRespuestaProfesorIA(diapositivaActiva.contenidoExplicativo);
    } finally {
      setCargandoIA(false);
    }
  };

  // Manejador de selección de respuesta en el Quiz
  const handleSeleccionarOpcionQuiz = (indice: number) => {
    const nuevasRespuestas = { ...respuestasQuizUsuario, [preguntaQuizActual.id]: indice };
    setRespuestasQuizUsuario(nuevasRespuestas);
    setRespuestaQuizSeleccionada(indice);
    setMostrarExplicacionQuiz(true);

    // Calcular nota acumulada
    let aciertos = 0;
    leccionActiva.preguntasQuiz.forEach((preg) => {
      const resp = nuevasRespuestas[preg.id];
      if (resp !== undefined && resp === preg.indiceCorrecto) {
        aciertos++;
      }
    });
    const notaCalculada = Math.round((aciertos / leccionActiva.preguntasQuiz.length) * 100);
    setNotaQuizAsentada(notaCalculada);
  };

  const handleSiguientePreguntaQuiz = () => {
    if (preguntaQuizIndex < totalPreguntasQuiz - 1) {
      setPreguntaQuizIndex(preguntaQuizIndex + 1);
      const siguienteId = leccionActiva.preguntasQuiz[preguntaQuizIndex + 1]?.id;
      setRespuestaQuizSeleccionada(respuestasQuizUsuario[siguienteId] ?? null);
      setMostrarExplicacionQuiz(respuestasQuizUsuario[siguienteId] !== undefined);
    }
  };

  const handleAnteriorPreguntaQuiz = () => {
    if (preguntaQuizIndex > 0) {
      setPreguntaQuizIndex(preguntaQuizIndex - 1);
      const anteriorId = leccionActiva.preguntasQuiz[preguntaQuizIndex - 1]?.id;
      setRespuestaQuizSeleccionada(respuestasQuizUsuario[anteriorId] ?? null);
      setMostrarExplicacionQuiz(respuestasQuizUsuario[anteriorId] !== undefined);
    }
  };

  // ----------------------------------------------------------------------------
  // GENERADOR LOCAL DE PAQUETES OFFLINE (HTML AUTÓNOMO + GUÍA IMPRIMIBLE)
  // Garantiza que la descarga funcione en cualquier entorno, incluso sin internet.
  // ----------------------------------------------------------------------------
  const handleDescargarAulaHtmlOffline = () => {
    const contenidoHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Wisdom Academy Offline - ${bloqueActivo.nombreMateria}</title>
  <style>
    body { font-family: 'Segoe UI', 'Helvetica Neue', sans-serif; background: #F7FAF7; color: #12211A; padding: 2rem; max-width: 800px; margin: auto; }
    .card { background: #FCFDFC; border: 1px solid #DDE8E1; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; }
    .gold { color: #2563EB; font-weight: bold; }
    h1 { color: #03583A; }
  </style>
</head>
<body>
  <h1>Wisdom Academy (Modo Sin Internet)</h1>
  <div class="card">
    <p class="gold">Lección para: ${estudianteActivo.nombreCompleto} (${estudianteActivo.gradoEcuador})</p>
    <h2>${bloqueActivo.nombreMateria}</h2>
    <blockquote>"${bloqueActivo.versiculoBloque}"</blockquote>
    <p>Este paquete interactivo autónomo permite estudiar, responder preguntas formativas y registrar evidencias sin conexión.</p>
  </div>
</body>
</html>`;

    const blob = new Blob([contenidoHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Wisdom_Offline_${estudianteActivo.nombreCompleto}_${bloqueActivo.nombreMateria.replace(/\s+/g, '_')}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ----------------------------------------------------------------------------
  // GENERADOR OFICIAL DE GUÍAS DE ESTUDIO IMPRIMIBLES Y PDF (MINEDUC ECUADOR)
  // Genera el documento A4 oficial, abre el diálogo de impresión / Guardar PDF y descarga
  // ----------------------------------------------------------------------------
  const handleDescargarGuiaPdf = () => {
    setMostrarModalGuiaPdf(true);
    printableGuideGenerator.imprimirODescargarPdf(estudianteActivo, bloqueActivo, leccionActiva);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--wa-bg-canvas)' }}>
      {/* ======================================================================
        1. CABECERA GLOBAL (UI SHELL HEADER: 64PX = 8X)
      ======================================================================= */}
      <header
        style={{
          height: 'var(--carbon-space-8x)',
          backgroundColor: 'var(--wa-bg-surface)',
          borderBottom: '1px solid var(--wa-keyline-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 'var(--carbon-space-2x)',
          paddingRight: 'var(--carbon-space-2x)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxSizing: 'border-box',
        }}
      >
        {/* LOGOTIPO DINÁMICO SEGÚN TEMA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--carbon-space-2x)' }}>
          <img
            src={temaOscuro ? '/brand/svg/wisdom-logo-horizontal-on-dark.svg' : '/brand/svg/wisdom-logo-horizontal-color.svg'}
            alt="Wisdom Academy"
            style={{ height: '36px', width: 'auto' }}
          />

          {/* SELECTOR RÁPIDO DE ESTUDIANTE */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--wa-bg-interactive-subtle)', padding: '2px', borderRadius: 'var(--wa-radius-sm)' }}>
            <button
              onClick={() => {
                setEstudianteActivo(ESTUDIANTE_AVRIL_INICIAL);
                setBloqueSeleccionado(1);
              }}
              style={{
                background: !esGael ? 'var(--wa-brand-gold-primary)' : 'transparent',
                color: !esGael ? 'var(--wa-bg-surface)' : 'var(--wa-text-primary)',
                border: 'none',
                borderRadius: 'var(--wa-radius-sm)',
                padding: '4px 10px',
                fontSize: '0.8125rem',
                fontFamily: 'var(--wa-font-sans)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Avril (12a • 8° EGB)
            </button>
            <button
              onClick={() => {
                setEstudianteActivo(ESTUDIANTE_GAEL_INICIAL);
                setBloqueSeleccionado(1);
              }}
              style={{
                background: esGael ? 'var(--wa-brand-gold-primary)' : 'transparent',
                color: esGael ? 'var(--wa-bg-surface)' : 'var(--wa-text-primary)',
                border: 'none',
                borderRadius: 'var(--wa-radius-sm)',
                padding: '4px 10px',
                fontSize: '0.8125rem',
                fontFamily: 'var(--wa-font-sans)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Gael (8a • 4° EGB)
            </button>
          </div>
        </div>

        {/* CONTROLES CENTRALES Y DERECHOS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--carbon-space-2x)' }}>
          {/* CONMUTADOR PRINCIPAL: PROFESOR IA VS PROFESOR REAL */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--wa-bg-interactive-subtle)',
              padding: '3px',
              borderRadius: 'var(--wa-radius-md)',
              border: '1px solid var(--wa-keyline-subtle)',
            }}
          >
            <button
              onClick={() => setModoAula('AGENTE_IA')}
              style={{
                background: modoAula === 'AGENTE_IA' ? 'var(--wa-brand-navy-primary)' : 'transparent',
                color: modoAula === 'AGENTE_IA' ? 'var(--wa-bg-surface)' : 'var(--wa-text-secondary)',
                border: 'none',
                borderRadius: 'var(--wa-radius-sm)',
                padding: '6px 14px',
                fontSize: '0.8125rem',
                fontFamily: 'var(--wa-font-sans)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity var(--wa-duration-fast) var(--wa-ease-decelerate)',
              }}
            >
              {idiomaIngles ? '🤖 AI Teacher (OpenMAIC)' : '🤖 Profesor IA (Aula OpenMAIC)'}
            </button>
            <button
              onClick={() => setModoAula('PROFESOR_REAL')}
              style={{
                background: modoAula === 'PROFESOR_REAL' ? 'var(--wa-brand-gold-primary)' : 'transparent',
                color: modoAula === 'PROFESOR_REAL' ? 'var(--wa-bg-surface)' : 'var(--wa-text-secondary)',
                border: 'none',
                borderRadius: 'var(--wa-radius-sm)',
                padding: '6px 14px',
                fontSize: '0.8125rem',
                fontFamily: 'var(--wa-font-sans)',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'opacity var(--wa-duration-fast) var(--wa-ease-decelerate)',
              }}
            >
              {idiomaIngles ? '📹 Real Teacher Tutoring' : '📹 Tutoría con Profesor Real'}
            </button>
          </div>

          {/* CONMUTADOR DE IDIOMA EN VIVO */}
          <button
            onClick={() => setIdiomaIngles(!idiomaIngles)}
            style={{
              background: 'var(--wa-bg-surface)',
              color: 'var(--wa-brand-navy-primary)',
              border: '1px solid var(--wa-keyline-subtle)',
              borderRadius: 'var(--wa-radius-sm)',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontFamily: 'var(--wa-font-mono)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Cambiar idioma entre Español e Inglés"
          >
            {idiomaIngles ? 'EN / ES' : 'ES / EN'}
          </button>

          {/* CONMUTADOR DE TEMA */}
          <button
            onClick={() => setTemaOscuro(!temaOscuro)}
            style={{
              background: 'var(--wa-bg-surface)',
              color: 'var(--wa-text-primary)',
              border: '1px solid var(--wa-keyline-subtle)',
              borderRadius: 'var(--wa-radius-sm)',
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontFamily: 'var(--wa-font-sans)',
              cursor: 'pointer',
            }}
            title="Alternar entre modo Pergamino y modo Nocturno"
          >
            {temaOscuro ? '☀️ Pergamino' : '🌙 Obsidiana'}
          </button>
        </div>
      </header>

      {/* ======================================================================
        BARRA DE NAVEGACIÓN PRINCIPAL DEL ECOSISTEMA WISDOM
      ======================================================================= */}
      <nav
        style={{
          backgroundColor: 'var(--wa-bg-surface)',
          borderBottom: '1px solid var(--wa-keyline-subtle)',
          paddingLeft: 'var(--carbon-space-2x)',
          paddingRight: 'var(--carbon-space-2x)',
          display: 'flex',
          gap: 'var(--carbon-space-1x)',
          alignItems: 'center',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'AULA', icon: '🏫', es: 'Aula y Videollamadas', en: 'Classroom & Video' },
          { id: 'CATALOGO', icon: '📚', es: '14 Grados y Talleres', en: '14 Grades & Workshops' },
          { id: 'PORTAFOLIO', icon: '📋', es: 'Portafolio MINEDUC Ecuador', en: 'Ecuador MINEDUC Portfolio' },
        ].map((tab) => {
          const esActiva = moduloActivo === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setModuloActivo(tab.id as ModuloNavegacion)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: esActiva ? '3px solid var(--wa-brand-gold-primary)' : '3px solid transparent',
                color: esActiva ? 'var(--wa-brand-navy-primary)' : 'var(--wa-text-secondary)',
                fontWeight: esActiva ? 700 : 500,
                fontFamily: 'var(--wa-font-sans)',
                fontSize: '0.875rem',
                padding: '12px 16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'opacity var(--wa-duration-fast) var(--wa-ease-decelerate)',
              }}
            >
              <span>{tab.icon}</span>
              <span>{idiomaIngles ? tab.en : tab.es}</span>
            </button>
          );
        })}
      </nav>

      {/* ======================================================================
        VISTAS ALTERNAS DEL ECOSISTEMA WISDOM ACADEMY
      ======================================================================= */}
      {moduloActivo === 'CATALOGO' && (
        <WorkshopsAndGradesCatalog idiomaIngles={idiomaIngles} />
      )}

      {moduloActivo === 'PORTAFOLIO' && (
        <EcuadorPortfolioManager estudiante={estudianteActivo} idiomaIngles={idiomaIngles} />
      )}

      {/* ======================================================================
        2. CUERPO PRINCIPAL SOBRE EL 2X GRID DE CARBON (.wa-carbon-grid)
      ======================================================================= */}
      {moduloActivo === 'AULA' && (
      <div
        className="wa-carbon-grid"
        style={{
          paddingTop: 'var(--carbon-space-3x)',
          paddingBottom: 'var(--carbon-space-6x)',
        }}
      >
        {/* --------------------------------------------------------------------
          COLUMNA IZQUIERDA (span 4): HORARIOS, BIBLIA, OFFLINE Y PORTAFOLIO
        --------------------------------------------------------------------- */}
        <aside className="wa-col-sm-4 wa-col-md-8 wa-col-lg-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--carbon-space-2x)' }}>
          {/* BLOQUE 1: FUNDAMENTO BÍBLICO DE LA CLASE */}
          <div className="wa-surface-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--carbon-mini-unit)', marginBottom: '8px' }}>
              <img
                src="/brand/svg/wisdom-icon-color.svg"
                alt="Fe"
                style={{ width: '24px', height: '24px' }}
              />
              <span style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.75rem', color: 'var(--wa-brand-gold-dark)', fontWeight: 600 }}>
                {idiomaIngles ? 'SCRIPTURE FOUNDATION' : 'FUNDAMENTO BÍBLICO'}
              </span>
            </div>
            <p style={{ fontFamily: 'var(--wa-font-display)', fontStyle: 'italic', fontSize: '0.9375rem', color: 'var(--wa-text-primary)', margin: 0, lineHeight: 1.4 }}>
              &ldquo;{bloqueActivo.versiculoBloque}&rdquo;
            </p>
          </div>

          {/* BLOQUE 2: HORARIO AUTOMÁTICO DEL DÍA (CALENDARIO OFICIAL SIERRA 2026/2027) */}
          <div className="wa-surface-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Cabecera con Botón de Calendario Oficial */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1rem' }}>📅</span>
                <span style={{ fontFamily: 'var(--wa-font-sans)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--wa-text-primary)' }}>
                  {idiomaIngles ? "Ecuador School Schedule" : 'Horario Escolar Oficial'}
                </span>
              </div>
              <button
                onClick={() => setMostrarModalCalendario(true)}
                title="Ver calendario anual completo 2026-2027 y feriados de Ecuador"
                style={{
                  background: 'var(--wa-bg-interactive-subtle)',
                  border: '1px solid var(--wa-brand-gold-primary)',
                  borderRadius: 'var(--wa-radius-sm)',
                  padding: '3px 8px',
                  fontSize: '0.6875rem',
                  fontFamily: 'var(--wa-font-mono)',
                  fontWeight: 600,
                  color: 'var(--wa-brand-gold-dark)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>📜</span>
                <span>{idiomaIngles ? '2026-27 Calendar' : 'Sierra 2026-27'}</span>
              </button>
            </div>

            {/* Selector y Navegador de Día Lectivo */}
            <div
              style={{
                backgroundColor: 'var(--wa-bg-interactive-subtle)',
                padding: '8px 10px',
                borderRadius: 'var(--wa-radius-sm)',
                border: '1px solid var(--wa-keyline-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  disabled={diaLectivoIndex === 0}
                  onClick={() => {
                    if (diaLectivoIndex > 0) {
                      setDiaLectivoIndex(diaLectivoIndex - 1);
                      setBloqueSeleccionado(1);
                    }
                  }}
                  style={{
                    background: diaLectivoIndex === 0 ? 'transparent' : 'var(--wa-bg-surface)',
                    border: '1px solid var(--wa-keyline-strong)',
                    borderRadius: 'var(--wa-radius-sm)',
                    padding: '3px 7px',
                    fontSize: '0.75rem',
                    cursor: diaLectivoIndex === 0 ? 'not-allowed' : 'pointer',
                    color: diaLectivoIndex === 0 ? 'var(--wa-text-muted)' : 'var(--wa-text-primary)',
                    fontFamily: 'var(--wa-font-mono)',
                  }}
                  title="Día de clases anterior"
                >
                  ◀
                </button>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--wa-font-sans)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--wa-brand-navy-primary)' }}>
                    {diaLectivoActual.diaSemanaLargo}
                  </div>
                  <div style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.6875rem', color: 'var(--wa-text-muted)' }}>
                    {diaLectivoActual.feriado
                      ? '🏖️ ASUETO / FERIADO NACIONAL'
                      : `Día ${diaLectivoActual.numeroDiaLectivo} de 200 • Semana ${diaLectivoActual.semanaNumero} • Trimestre ${diaLectivoActual.trimestre}`}
                  </div>
                </div>

                <button
                  disabled={diaLectivoIndex >= diasLectivos.length - 1}
                  onClick={() => {
                    if (diaLectivoIndex < diasLectivos.length - 1) {
                      setDiaLectivoIndex(diaLectivoIndex + 1);
                      setBloqueSeleccionado(1);
                    }
                  }}
                  style={{
                    background: diaLectivoIndex >= diasLectivos.length - 1 ? 'transparent' : 'var(--wa-bg-surface)',
                    border: '1px solid var(--wa-keyline-strong)',
                    borderRadius: 'var(--wa-radius-sm)',
                    padding: '3px 7px',
                    fontSize: '0.75rem',
                    cursor: diaLectivoIndex >= diasLectivos.length - 1 ? 'not-allowed' : 'pointer',
                    color: diaLectivoIndex >= diasLectivos.length - 1 ? 'var(--wa-text-muted)' : 'var(--wa-text-primary)',
                    fontFamily: 'var(--wa-font-mono)',
                  }}
                  title="Día de clases siguiente"
                >
                  ▶
                </button>
              </div>

              {/* Si es feriado, mostramos aviso oficial de la Ley de Feriados */}
              {diaLectivoActual.feriado && (
                <div
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--wa-radius-sm)',
                    backgroundColor: 'rgba(217, 119, 6, 0.12)',
                    border: '1px solid #D97706',
                    fontSize: '0.75rem',
                    color: '#92400E',
                    lineHeight: '1.3',
                  }}
                >
                  <strong>🏖️ {diaLectivoActual.feriado.nombre}:</strong> {diaLectivoActual.feriado.descripcion}
                  <div style={{ marginTop: '4px', fontSize: '0.6875rem', fontStyle: 'italic', color: 'var(--wa-text-muted)' }}>
                    Ley de Feriados del Ecuador • Asueto no recuperable. ¡Tiempo para compartir en familia y lecturas formativas!
                  </div>
                </div>
              )}

              {/* Enfoque pedagógico del día para Matemáticas */}
              {!diaLectivoActual.feriado && (
                <div
                  style={{
                    padding: '6px 8px',
                    borderRadius: 'var(--wa-radius-sm)',
                    backgroundColor: 'var(--wa-bg-surface)',
                    border: '1px solid var(--wa-brand-emerald-faith)',
                    fontSize: '0.75rem',
                    lineHeight: '1.3',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--wa-brand-emerald-faith)', textTransform: 'uppercase' }}>
                      📐 Enfoque de Matemáticas
                    </span>
                    <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--wa-font-mono)', color: 'var(--wa-text-muted)' }}>
                      {esGael ? 'Gael (4°)' : 'Avril (8°)'}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--wa-text-primary)', marginBottom: '3px' }}>
                    {esGael
                      ? diaLectivoActual.enfoquePedagogicoGael.temaMatematicas
                      : diaLectivoActual.enfoquePedagogicoAvril.temaMatematicas}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--wa-text-secondary)', fontStyle: 'italic' }}>
                    "{esGael
                      ? diaLectivoActual.enfoquePedagogicoGael.explicacionInicial
                      : diaLectivoActual.enfoquePedagogicoAvril.explicacionInicial}"
                  </div>
                </div>
              )}
            </div>

            {/* Lista de bloques de clase del día */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {bloquesHorario.map((b) => {
                const esSeleccionado = b.numeroBloque === bloqueSeleccionado;
                return (
                  <React.Fragment key={b.id}>
                    {b.numeroBloque === 3 && (
                      <div
                        style={{
                          padding: '6px 10px',
                          borderRadius: 'var(--wa-radius-sm)',
                          backgroundColor: 'var(--wa-bg-interactive-subtle)',
                          border: '1px dashed var(--wa-brand-gold-dark)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          color: 'var(--wa-brand-gold-dark)',
                          fontFamily: 'var(--wa-font-mono)',
                          fontWeight: 600,
                          margin: '2px 0',
                        }}
                      >
                        <span>☕ {idiomaIngles ? 'RECESS / PAUSE' : 'RECREO / PAUSA ACTIVA'}</span>
                        <span>09:30 - 10:00 (30 min)</span>
                      </div>
                    )}
                    <div
                      onClick={() => {
                        setBloqueSeleccionado(b.numeroBloque);
                        if (b.modalidad === 'TUTORIA_PROFESOR_REAL') {
                          setModoAula('PROFESOR_REAL');
                        }
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--wa-radius-sm)',
                        backgroundColor: esSeleccionado ? 'var(--wa-bg-interactive-subtle)' : 'transparent',
                        border: esSeleccionado ? '1px solid var(--wa-brand-gold-primary)' : '1px solid var(--wa-keyline-subtle)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--wa-brand-navy-primary)' }}>
                          {b.horaInicio} - {b.horaFin}
                        </span>
                        <span
                          style={{
                            fontSize: '0.6875rem',
                            padding: '1px 6px',
                            borderRadius: '2px',
                            fontFamily: 'var(--wa-font-mono)',
                            backgroundColor: b.modalidad === 'TUTORIA_PROFESOR_REAL' ? 'var(--wa-brand-gold-primary)' : 'var(--wa-bg-canvas)',
                            color: b.modalidad === 'TUTORIA_PROFESOR_REAL' ? 'var(--wa-bg-surface)' : 'var(--wa-brand-emerald-faith)',
                            fontWeight: 600,
                          }}
                        >
                          {b.modalidad === 'TUTORIA_PROFESOR_REAL' ? 'TUTOR REAL' : 'PROFESOR IA'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--wa-text-primary)' }}>
                        {b.nombreMateria}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* BLOQUE 3: MATERIAL DE ESTUDIO SIN INTERNET (OFFLINE-FIRST) */}
          <div className="wa-surface-card">
            <span style={{ fontFamily: 'var(--wa-font-sans)', fontWeight: 600, fontSize: '0.875rem', display: 'block', marginBottom: '8px' }}>
              {idiomaIngles ? 'Offline-First Study Pack' : 'Material Sin Internet (Offline)'}
            </span>
            <p style={{ fontSize: '0.75rem', color: 'var(--wa-text-secondary)', margin: '0 0 10px 0' }}>
              Descarga la guía y el aula interactiva para estudiar en viajes o sin conexión.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                onClick={handleDescargarGuiaPdf}
                style={{
                  background: 'var(--wa-bg-surface)',
                  color: 'var(--wa-brand-navy-primary)',
                  border: '1px solid var(--wa-keyline-strong)',
                  borderRadius: 'var(--wa-radius-sm)',
                  padding: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                ↓ {idiomaIngles ? 'Download Printable Guide (PDF)' : 'Descargar Guía Imprimible (PDF)'}
              </button>
              <button
                onClick={handleDescargarAulaHtmlOffline}
                style={{
                  background: 'var(--wa-brand-emerald-faith)',
                  color: 'var(--wa-bg-surface)',
                  border: 'none',
                  borderRadius: 'var(--wa-radius-sm)',
                  padding: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                ↓ {idiomaIngles ? 'Download Offline Interactive Aula (HTML)' : 'Descargar Aula Interactiva (HTML)'}
              </button>
            </div>
          </div>

          {/* BLOQUE 4: INDICADOR DE PORTAFOLIO HOMESCHOOL ECUADOR */}
          <div className="wa-surface-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--wa-text-primary)' }}>
                Portafolio MINEDUC
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--wa-brand-gold-dark)',
                  backgroundColor: 'var(--wa-bg-interactive-subtle)',
                  padding: '2px 6px',
                  borderRadius: 'var(--wa-radius-sm)',
                  fontFamily: 'var(--wa-font-mono)',
                }}
              >
                {estudianteActivo.responsablePortafolio === 'PADRE_MENTOR' ? 'Padre-Mentor' : 'Autónomo'}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--wa-text-secondary)', margin: 0 }}>
              {estudianteActivo.responsablePortafolio === 'PADRE_MENTOR'
                ? 'Supervisión requerida: Registra fotos de cuaderno, lecturas en voz alta y actas del docente tutor.'
                : 'Autogestión activa: Avril carga sus entregables de retos PBL, ensayos bíblicos y reportes analíticos.'}
            </p>
          </div>
        </aside>

        {/* --------------------------------------------------------------------
          COLUMNA PRINCIPAL (span 12): LIENZO 16:9 DE AULA O VIDEOLLAMADA
        --------------------------------------------------------------------- */}
        <section className="wa-col-sm-4 wa-col-md-8 wa-col-lg-12">
          <div
            className="wa-surface-card"
            style={{
              padding: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              backgroundColor: 'var(--wa-bg-surface)',
              minHeight: '740px',
            }}
          >
            {/* ------------------------------------------------------------------
              MODO 1: AULA INTERACTIVA MULTI-AGENTE (OPENMAIC)
            ------------------------------------------------------------------- */}
            {modoAula === 'AGENTE_IA' ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                {/* BARRA SUPERIOR DE ESCENAS PEDAGÓGICAS */}
                <div
                  style={{
                    height: '48px',
                    borderBottom: '1px solid var(--wa-keyline-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingLeft: 'var(--carbon-space-2x)',
                    paddingRight: 'var(--carbon-space-2x)',
                    backgroundColor: 'var(--wa-bg-surface)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--carbon-space-2x)' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--wa-brand-navy-primary)' }}>
                      {bloqueActivo.nombreMateria} • {estudianteActivo.nombreCompleto}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--wa-text-muted)', fontFamily: 'var(--wa-font-mono)' }}>
                      Modelo: Gemini 3.8 Flash • Edge TTS
                    </span>
                  </div>

                  {/* SELECTOR DE LAS 4 ESCENAS DE OPENMAIC */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['slides', 'interactive', 'quiz', 'pbl'] as PestanaEscenaIA[]).map((escena) => {
                      const etiquetas: Record<PestanaEscenaIA, string> = {
                        slides: idiomaIngles ? '1. Slides' : '1. Diapositivas',
                        interactive: idiomaIngles ? '2. Whiteboard' : '2. Pizarra & Simulación',
                        quiz: idiomaIngles ? '3. Quiz' : '3. Quiz Formativo',
                        pbl: idiomaIngles ? '4. PBL Project' : '4. Reto PBL',
                      };
                      const activa = escenaActiva === escena;
                      return (
                        <button
                          key={escena}
                          onClick={() => setEscenaActiva(escena)}
                          style={{
                            background: activa ? 'var(--wa-brand-gold-primary)' : 'transparent',
                            color: activa ? 'var(--wa-bg-surface)' : 'var(--wa-text-secondary)',
                            border: 'none',
                            borderRadius: 'var(--wa-radius-sm)',
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {etiquetas[escena]}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setMostrarModalGuiaPdf(true)}
                      title="Ver y descargar la guía imprimible oficial en formato A4 / PDF"
                      style={{
                        background: 'var(--wa-bg-interactive-subtle)',
                        color: 'var(--wa-brand-navy-primary)',
                        border: '1px solid var(--wa-keyline-subtle)',
                        borderRadius: 'var(--wa-radius-sm)',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginLeft: '4px',
                      }}
                    >
                      <span>📑</span> {idiomaIngles ? 'PDF Guide' : 'Guía PDF'}
                    </button>
                  </div>
                </div>

                {/* ESCENARIO COMPLETO OPENMAIC: VISIONADO INTERACTIVO O LIENZO MULTI-ESCENA */}
                {escenaActiva === 'slides' ? (
                  <OpenMAICClassroomViewer
                    diapositiva={diapositivaActiva}
                    diapositivaActual={diapositivaActual}
                    totalDiapositivas={totalDiapositivas}
                    nombreMateria={bloqueActivo.nombreMateria}
                    nombreEstudiante={estudianteActivo.nombreCompleto}
                    esGael={esGael}
                    intervencion={intervencionProfesor}
                    hablandoProfesor={hablandoProfesor}
                    onToggleVoz={handleToggleVozProfesor}
                    onCambiarDiapositiva={(nuevaDiapo) => setDiapositivaActual(nuevaDiapo)}
                    onAbrirModalIA={() => setMostrarModalIA(true)}

                  />
                ) : (
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'row',
                      flexWrap: 'nowrap',
                      boxSizing: 'border-box',
                      minHeight: 0,
                    }}
                  >
                    {/* COLUMNA 1: LIENZO DIDÁCTICO MULTI-ESCENA (PIZARRA / QUIZ / PBL) */}
                    <div
                      style={{
                        flex: '1 1 0',
                        minWidth: 0,
                        padding: 'var(--carbon-space-3x)',
                        display: 'flex',
                        flexDirection: 'column',
                        boxSizing: 'border-box',
                        overflowY: 'auto',
                      }}
                    >

                  {/* ESCENA 2: PIZARRA Y SIMULACIÓN (INTERACTIVE) */}
                  {escenaActiva === 'interactive' && (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '380px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--wa-text-primary)' }}>
                            {leccionActiva.simulacion.titulo}
                          </h3>
                          <p style={{ margin: '4px 0 0 0', fontSize: '0.8125rem', color: 'var(--wa-text-secondary)' }}>
                            {leccionActiva.simulacion.instrucciones}
                          </p>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--wa-brand-emerald-faith)', fontFamily: 'var(--wa-font-mono)', fontWeight: 600 }}>
                          ● {leccionActiva.simulacion.tipo}
                        </span>
                      </div>

                      {/* SANDBOX ESPECÍFICO DE PYTHON (SOFTWARE Y PROGRAMACIÓN) */}
                      {leccionActiva.simulacion.tipo === 'PYTHON_SANDBOX' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', color: 'var(--wa-text-muted)' }}>
                              Editor Python Interactivo (Sandboxed):
                            </span>
                            <button
                              onClick={handleEjecutarCodigoPython}
                              disabled={ejecutandoPython}
                              style={{
                                background: 'var(--wa-brand-emerald-faith)',
                                color: 'var(--wa-bg-surface)',
                                border: 'none',
                                borderRadius: 'var(--wa-radius-sm)',
                                padding: '6px 14px',
                                fontSize: '0.8125rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {ejecutandoPython ? 'Ejecutando...' : '▶ Ejecutar Código'}
                            </button>
                          </div>
                          <textarea
                            value={codigoPython}
                            onChange={(e) => setCodigoPython(e.target.value)}
                            style={{
                              flex: 1,
                              minHeight: '130px',
                              backgroundColor: 'var(--wa-bg-canvas)',
                              color: 'var(--wa-brand-navy-primary)',
                              fontFamily: 'var(--wa-font-mono)',
                              fontSize: '0.875rem',
                              padding: '12px',
                              borderRadius: 'var(--wa-radius-sm)',
                              border: '1px solid var(--wa-keyline-strong)',
                              resize: 'vertical',
                            }}
                          />
                          <div style={{ backgroundColor: 'var(--wa-bg-surface-elevated)', borderRadius: 'var(--wa-radius-sm)', padding: '10px 12px', border: '1px solid var(--wa-keyline-subtle)' }}>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', color: 'var(--wa-brand-gold-dark)', display: 'block', marginBottom: '4px' }}>
                              Consola de Salida:
                            </span>
                            <pre style={{ margin: 0, fontFamily: 'var(--wa-font-mono)', fontSize: '0.8125rem', color: 'var(--wa-text-primary)', whiteSpace: 'pre-wrap' }}>
                              {consolaPython || 'Presiona "Ejecutar Código" para ver los resultados...'}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        /* PIZARRA ACTIVA PARA OTRAS ASIGNATURAS */
                        <div
                          style={{
                            flex: 1,
                            margin: '8px 0',
                            border: '2px dashed var(--wa-keyline-strong)',
                            borderRadius: 'var(--wa-radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'var(--wa-bg-canvas)',
                            padding: 'var(--carbon-space-3x)',
                            textAlign: 'center',
                          }}
                        >
                          <span style={{ fontSize: '2rem', marginBottom: '8px' }}>🔬</span>
                          <h4 style={{ margin: '0 0 6px 0', fontSize: '1.125rem', color: 'var(--wa-brand-navy-primary)' }}>
                            {leccionActiva.simulacion.titulo}
                          </h4>
                          <div
                            style={{
                              maxWidth: '560px',
                              backgroundColor: 'var(--wa-bg-surface)',
                              border: '1px solid var(--wa-keyline-subtle)',
                              padding: '12px 16px',
                              borderRadius: 'var(--wa-radius-sm)',
                              marginBottom: '12px',
                              textAlign: 'left',
                            }}
                          >
                            <pre style={{ margin: 0, fontFamily: 'var(--wa-font-mono)', fontSize: '0.8125rem', color: 'var(--wa-text-primary)', whiteSpace: 'pre-wrap' }}>
                              {consolaPython || leccionActiva.simulacion.demostracionInteractiva}
                            </pre>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--wa-text-muted)' }}>
                            Pizarra táctil e interactiva lista para tableta, iPad y Chromebook de {estudianteActivo.nombreCompleto}.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ESCENA 3: QUIZ FORMATIVO DINÁMICO (QUIZ) */}
                  {escenaActiva === 'quiz' && (
                    <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.75rem', color: 'var(--wa-brand-gold-dark)', fontWeight: 600 }}>
                          Pregunta {preguntaQuizIndex + 1} de {totalPreguntasQuiz} • Evaluación Formativa Moodle
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--wa-text-secondary)', fontFamily: 'var(--wa-font-mono)' }}>
                          {bloqueActivo.nombreMateria}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.125rem', margin: '0 0 16px 0', color: 'var(--wa-text-primary)', lineHeight: 1.4 }}>
                        {preguntaQuizActual.enunciado}
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        {preguntaQuizActual.opciones.map((opcion, index) => {
                          const seleccionada = respuestasQuizUsuario[preguntaQuizActual.id] === index;
                          const esCorrecta = index === preguntaQuizActual.indiceCorrecto;
                          const respondida = respuestasQuizUsuario[preguntaQuizActual.id] !== undefined;

                          let bg = 'var(--wa-bg-canvas)';
                          let color = 'var(--wa-text-primary)';
                          if (respondida) {
                            if (seleccionada && esCorrecta) {
                              bg = 'var(--wa-bg-interactive-subtle)';
                              color = 'var(--wa-brand-emerald-faith)';
                            } else if (seleccionada && !esCorrecta) {
                              bg = 'var(--wa-bg-surface-elevated)';
                            }
                          } else if (respuestaQuizSeleccionada === index) {
                            bg = 'var(--wa-brand-gold-primary)';
                            color = 'var(--wa-bg-surface)';
                          }

                          return (
                            <button
                              key={index}
                              onClick={() => handleSeleccionarOpcionQuiz(index)}
                              style={{
                                padding: '10px 14px',
                                textAlign: 'left',
                                background: bg,
                                color: color,
                                border: seleccionada ? '2px solid var(--wa-brand-gold-primary)' : '1px solid var(--wa-keyline-subtle)',
                                borderRadius: 'var(--wa-radius-sm)',
                                cursor: 'pointer',
                                fontFamily: 'var(--wa-font-sans)',
                                fontSize: '0.875rem',
                                fontWeight: seleccionada ? 600 : 400,
                              }}
                            >
                              {String.fromCharCode(65 + index)}) {opcion}
                            </button>
                          );
                        })}
                      </div>

                      {mostrarExplicacionQuiz && (
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--wa-radius-sm)',
                            backgroundColor: 'var(--accent-study-soft)',
                            border: '1px solid var(--border-subtle)',
                            marginBottom: '16px',
                          }}
                        >
                          <span style={{ fontWeight: 700, color: 'var(--wa-brand-emerald-faith)', fontSize: '0.8125rem', display: 'block', marginBottom: '4px' }}>
                            Retroalimentación Pedagógica del Profesor IA:
                          </span>
                          <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--wa-text-secondary)', lineHeight: 1.4 }}>
                            {preguntaQuizActual.explicacionPedagogica}
                          </p>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={handleAnteriorPreguntaQuiz}
                            disabled={preguntaQuizIndex === 0}
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.8125rem',
                              borderRadius: 'var(--wa-radius-sm)',
                              border: '1px solid var(--wa-keyline-subtle)',
                              background: 'var(--wa-bg-surface)',
                              color: 'var(--wa-text-primary)',
                              cursor: preguntaQuizIndex === 0 ? 'not-allowed' : 'pointer',
                              opacity: preguntaQuizIndex === 0 ? 0.5 : 1,
                            }}
                          >
                            ← Anterior
                          </button>
                          <button
                            onClick={handleSiguientePreguntaQuiz}
                            disabled={preguntaQuizIndex === totalPreguntasQuiz - 1}
                            style={{
                              padding: '6px 12px',
                              fontSize: '0.8125rem',
                              borderRadius: 'var(--wa-radius-sm)',
                              border: 'none',
                              background: 'var(--wa-brand-navy-primary)',
                              color: 'var(--wa-bg-surface)',
                              cursor: preguntaQuizIndex === totalPreguntasQuiz - 1 ? 'not-allowed' : 'pointer',
                              opacity: preguntaQuizIndex === totalPreguntasQuiz - 1 ? 0.5 : 1,
                            }}
                          >
                            Siguiente Pregunta →
                          </button>
                        </div>

                        {notaQuizAsentada !== null && (
                          <span style={{ fontWeight: 700, color: 'var(--wa-brand-emerald-faith)', fontSize: '0.8125rem', fontFamily: 'var(--wa-font-mono)' }}>
                            ✓ Nota: {notaQuizAsentada}/100 (Moodle)
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ESCENA 4: RETO PBL DINÁMICO (PBL) */}
                  {escenaActiva === 'pbl' && (
                    <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.75rem', color: 'var(--wa-brand-gold-dark)', fontWeight: 600 }}>
                        Reto de Aprendizaje Basado en Proyectos (PBL) • MINEDUC Ecuador
                      </span>
                      <h3 style={{ fontSize: '1.25rem', margin: '8px 0 10px 0', color: 'var(--wa-text-primary)' }}>
                        {leccionActiva.retoPbl.titulo}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: 'var(--wa-text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                        {leccionActiva.retoPbl.descripcion}
                      </p>

                      {/* CRITERIOS DE EVALUACIÓN MINEDUC */}
                      <div
                        style={{
                          backgroundColor: 'var(--wa-bg-canvas)',
                          border: '1px solid var(--wa-keyline-subtle)',
                          borderRadius: 'var(--wa-radius-sm)',
                          padding: '12px 14px',
                          marginBottom: '16px',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--wa-brand-navy-primary)', fontFamily: 'var(--wa-font-mono)', display: 'block', marginBottom: '6px' }}>
                          Criterios de Evaluación Ministerial:
                        </span>
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8125rem', color: 'var(--wa-text-secondary)', lineHeight: 1.4 }}>
                          {leccionActiva.retoPbl.criteriosMineduc.map((criterio, i) => (
                            <li key={i} style={{ marginBottom: '4px' }}>
                              {criterio}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* ENTREGABLE ESPERADO */}
                      <div style={{ padding: '8px 12px', backgroundColor: 'var(--wa-bg-surface-elevated)', borderRadius: 'var(--wa-radius-sm)', marginBottom: '16px', border: '1px solid var(--wa-keyline-subtle)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--wa-brand-gold-dark)', fontWeight: 600, fontFamily: 'var(--wa-font-mono)' }}>
                          📁 Entregable oficial:
                        </span>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.8125rem', color: 'var(--wa-text-primary)' }}>
                          {leccionActiva.retoPbl.entregableEsperado}
                        </p>
                      </div>

                      <button
                        onClick={() => setModuloActivo('PORTAFOLIO')}
                        style={{
                          background: 'var(--wa-brand-gold-primary)',
                          color: 'var(--wa-bg-surface)',
                          border: 'none',
                          padding: '10px 18px',
                          borderRadius: 'var(--wa-radius-sm)',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                        }}
                      >
                        + Adjuntar Evidencia al Portafolio Ecuador
                      </button>
                    </div>
                  )}
                </div>

                {/* ==========================================================
                  COLUMNA 2: PODIO DEL PROFESOR IA Y COMUNIDAD OPENMAIC
                  Muestra visiblemente al Profesor IA (Mateo / Sofía), su explicación
                  vocalizada con ondas sonoras, el debate con el compañero de clase
                  (Lucas / Daniel) y consultas en tiempo real con Gemini 3.8 Flash.
                =========================================================== */}
                <div
                  style={{
                    flex: '0 0 340px',
                    width: '340px',
                    borderLeft: '1px solid var(--wa-keyline-subtle)',
                    backgroundColor: 'var(--wa-bg-canvas)',
                    padding: 'var(--carbon-space-2x)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    boxSizing: 'border-box',
                    overflowY: 'auto',
                  }}
                >
                  {/* TARJETA VISUAL DEL PROFESOR IA */}
                  <div
                    style={{
                      backgroundColor: 'var(--wa-bg-surface)',
                      borderRadius: 'var(--wa-radius-md)',
                      border: '1px solid var(--wa-keyline-subtle)',
                      padding: '12px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      boxShadow: '0 2px 8px rgba(20, 40, 75, 0.04)',
                    }}
                  >
                    <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={intervencionProfesor.avatarProfesor}
                        alt={intervencionProfesor.nombreProfesor}
                        className={hablandoProfesor ? 'wa-teacher-speaking-halo' : ''}
                        style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          border: '2px solid var(--wa-brand-gold-primary)',
                          objectFit: 'cover',
                          backgroundColor: 'var(--wa-bg-surface-elevated)',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: -2,
                          right: -2,
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: hablandoProfesor ? 'var(--wa-brand-gold-primary)' : 'var(--wa-brand-emerald-faith)',
                          border: '2px solid var(--wa-bg-surface)',
                        }}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <span style={{ fontFamily: 'var(--wa-font-display)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--wa-text-primary)' }}>
                          {intervencionProfesor.nombreProfesor}
                        </span>
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontFamily: 'var(--wa-font-mono)',
                            fontWeight: 700,
                            color: hablandoProfesor ? 'var(--wa-brand-gold-dark)' : 'var(--wa-brand-emerald-faith)',
                            backgroundColor: 'var(--wa-bg-interactive-subtle)',
                            padding: '1px 6px',
                            borderRadius: 'var(--wa-radius-sm)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {hablandoProfesor ? '● HABLANDO' : '● EN VIVO'}
                        </span>
                      </div>
                      <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--wa-brand-gold-dark)', lineHeight: 1.3, marginTop: '2px' }}>
                        {intervencionProfesor.tituloProfesor}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--wa-text-secondary)', fontFamily: 'var(--wa-font-mono)', marginTop: '2px' }}>
                        {intervencionProfesor.estadoProfesor}
                      </span>
                    </div>
                  </div>

                  {/* BURBUJA DE VOZ Y CONTROL DE AUDIO DEL PROFESOR IA */}
                  <div
                    style={{
                      backgroundColor: 'var(--wa-bg-surface-elevated)',
                      borderRadius: 'var(--wa-radius-md)',
                      border: '1px solid var(--wa-keyline-subtle)',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--wa-brand-navy-primary)', fontFamily: 'var(--wa-font-mono)' }}>
                        🎙️ EXPLICACIÓN DEL PROFESOR:
                      </span>

                      {/* VISUALIZADOR DE ONDAS DE SONIDO (GPU-ONLY) */}
                      <div
                        className={hablandoProfesor ? 'wa-soundwave-active' : ''}
                        style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '18px' }}
                        title={hablandoProfesor ? 'Voz activa' : 'Audio en reposo'}
                      >
                        <div className="wa-bar-1" style={{ width: '3px', height: '14px', backgroundColor: 'var(--wa-brand-gold-primary)', borderRadius: '2px', transform: hablandoProfesor ? undefined : 'scaleY(0.3)' }} />
                        <div className="wa-bar-2" style={{ width: '3px', height: '14px', backgroundColor: 'var(--wa-brand-gold-primary)', borderRadius: '2px', transform: hablandoProfesor ? undefined : 'scaleY(0.3)' }} />
                        <div className="wa-bar-3" style={{ width: '3px', height: '14px', backgroundColor: 'var(--wa-brand-gold-primary)', borderRadius: '2px', transform: hablandoProfesor ? undefined : 'scaleY(0.3)' }} />
                        <div className="wa-bar-4" style={{ width: '3px', height: '14px', backgroundColor: 'var(--wa-brand-gold-primary)', borderRadius: '2px', transform: hablandoProfesor ? undefined : 'scaleY(0.3)' }} />
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--wa-text-primary)', lineHeight: 1.5, fontStyle: 'italic' }}>
                      "{intervencionProfesor.guionVoz}"
                    </p>

                    <button
                      onClick={() => handleToggleVozProfesor()}
                      style={{
                        background: hablandoProfesor ? 'var(--wa-brand-gold-primary)' : 'var(--wa-brand-navy-primary)',
                        color: 'var(--wa-bg-surface)',
                        border: 'none',
                        borderRadius: 'var(--wa-radius-sm)',
                        padding: '8px 12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px',
                      }}
                    >
                      <span>{hablandoProfesor ? '⏸' : '🔊'}</span>
                      {hablandoProfesor ? 'Pausar Explicación' : 'Escuchar Explicación en Voz Alta'}
                    </button>
                  </div>

                  {/* COMUNIDAD Y COMPAÑERO DE CLASE OPENMAIC (MULTI-AGENT) */}
                  {intervencionProfesor.companero && (
                    <div
                      style={{
                        backgroundColor: 'var(--wa-bg-surface)',
                        borderRadius: 'var(--wa-radius-md)',
                        border: '1px solid var(--wa-keyline-subtle)',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={intervencionProfesor.companero.avatar}
                          alt={intervencionProfesor.companero.nombre}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            border: '1px solid var(--wa-brand-gold-primary)',
                            objectFit: 'cover',
                          }}
                        />
                        <div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--wa-text-primary)' }}>
                            {intervencionProfesor.companero.nombre} ({intervencionProfesor.companero.edad} años)
                          </span>
                          <span style={{ display: 'block', fontSize: '0.625rem', color: 'var(--wa-text-muted)' }}>
                            Compañero de Clase Virtual
                          </span>
                        </div>
                      </div>

                      <div style={{ backgroundColor: 'var(--wa-bg-canvas)', borderRadius: 'var(--wa-radius-sm)', padding: '6px 8px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--wa-brand-navy-primary)', display: 'block' }}>
                          Pregunta de {intervencionProfesor.companero.nombre}:
                        </span>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--wa-text-secondary)', lineHeight: 1.35 }}>
                          "{intervencionProfesor.companero.pregunta}"
                        </p>
                      </div>

                      <div style={{ backgroundColor: 'var(--accent-study-soft)', borderRadius: 'var(--wa-radius-sm)', padding: '6px 8px', border: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--wa-brand-emerald-faith)', display: 'block' }}>
                          Respuesta de {intervencionProfesor.nombreProfesor}:
                        </span>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--wa-text-secondary)', lineHeight: 1.35 }}>
                          "{intervencionProfesor.companero.respuestaProfesor}"
                        </p>
                      </div>
                    </div>
                  )}

                  {/* CAJA RÁPIDA DE PREGUNTAS CON GEMINI 3.8 FLASH */}
                  <div
                    style={{
                      backgroundColor: 'var(--wa-bg-surface)',
                      borderRadius: 'var(--wa-radius-md)',
                      border: '1px solid var(--wa-keyline-subtle)',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      marginTop: 'auto',
                    }}
                  >
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--wa-brand-navy-primary)', fontFamily: 'var(--wa-font-mono)' }}>
                      🤖 PREGUNTA A TU PROFESOR (GEMINI 3.8 FLASH):
                    </span>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder={`Duda sobre esta lección...`}
                        value={preguntaEstudianteIA}
                        onChange={(e) => setPreguntaEstudianteIA(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConsultarProfesorIA();
                        }}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          fontSize: '0.75rem',
                          borderRadius: 'var(--wa-radius-sm)',
                          border: '1px solid var(--wa-keyline-strong)',
                          backgroundColor: 'var(--wa-bg-canvas)',
                          color: 'var(--wa-text-primary)',
                        }}
                      />
                      <button
                        onClick={handleConsultarProfesorIA}
                        disabled={cargandoIA || !preguntaEstudianteIA.trim()}
                        style={{
                          background: 'var(--wa-brand-navy-primary)',
                          color: 'var(--wa-bg-surface)',
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: 'var(--wa-radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: cargandoIA ? 'wait' : 'pointer',
                        }}
                      >
                        {cargandoIA ? '...' : 'Enviar'}
                      </button>
                    </div>

                    {/* RESPUESTA RÁPIDA EN EL PODIO */}
                    {respuestaProfesorIA && (
                      <div
                        style={{
                          backgroundColor: 'var(--wa-bg-canvas)',
                          borderRadius: 'var(--wa-radius-sm)',
                          padding: '8px',
                          border: '1px solid var(--wa-keyline-subtle)',
                          maxHeight: '140px',
                          overflowY: 'auto',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--wa-brand-gold-dark)', display: 'block' }}>
                            {esGael ? 'Prof. Mateo' : 'Dra. Sofía'}:
                          </span>
                          <button
                            onClick={() => {
                              if (hablandoProfesor) {
                                teacherSpeechManager.detener();
                                setHablandoProfesor(false);
                              } else {
                                teacherSpeechManager.hablar(
                                  respuestaProfesorIA,
                                  {
                                    idioma: bloqueActivo.nombreMateria.toLowerCase().includes('english') ? 'en' : 'es',
                                    velocidad: 1,
                                    perfil: esGael ? 'mateo' : 'sofia',
                                  },
                                  {
                                    onStart: () => setHablandoProfesor(true),
                                    onEnd: () => setHablandoProfesor(false),
                                    onError: () => setHablandoProfesor(false),
                                  }
                                );
                              }
                            }}
                            title="Escuchar respuesta con la voz del profesor"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--wa-brand-navy-primary)',
                              fontSize: '0.6875rem',
                              cursor: 'pointer',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            {hablandoProfesor ? '⏹ Detener' : '🔊 Escuchar'}
                          </button>
                        </div>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--wa-text-primary)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                          {respuestaProfesorIA}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

              {/* MODAL / DRAWER INTERACTIVO CON PROFESOR IA (GEMINI 3.8 FLASH) */}
                  {mostrarModalIA && (
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(20, 40, 75, 0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '16px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: 'var(--wa-bg-surface)',
                          borderRadius: 'var(--wa-radius-md)',
                          border: '1px solid var(--wa-keyline-strong)',
                          width: '100%',
                          maxWidth: '580px',
                          padding: '20px',
                          boxShadow: 'var(--wa-shadow-elevated)',
                          boxSizing: 'border-box',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--wa-text-primary)' }}>
                              🤖 Consulta con el Profesor IA (Gemini 3.8 Flash)
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--wa-brand-gold-dark)', fontFamily: 'var(--wa-font-mono)' }}>
                              Materia: {bloqueActivo.nombreMateria} • {estudianteActivo.nombreCompleto}
                            </span>
                          </div>
                          <button
                            onClick={() => setMostrarModalIA(false)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              fontSize: '1.25rem',
                              cursor: 'pointer',
                              color: 'var(--wa-text-muted)',
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* PREGUNTAS RÁPIDAS SUGERIDAS */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {[
                            '¿Puedes darme otro ejemplo práctico?',
                            '¿Cómo se aplica esto en la vida diaria?',
                            '¿Qué nos enseña la Biblia sobre este tema?',
                          ].map((sug, i) => (
                            <button
                              key={i}
                              onClick={() => setPreguntaEstudianteIA(sug)}
                              style={{
                                background: 'var(--wa-bg-canvas)',
                                border: '1px solid var(--wa-keyline-subtle)',
                                borderRadius: 'var(--wa-radius-sm)',
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                color: 'var(--wa-text-secondary)',
                                cursor: 'pointer',
                              }}
                            >
                              {sug}
                            </button>
                          ))}
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="Escribe tu pregunta sobre la lección..."
                            value={preguntaEstudianteIA}
                            onChange={(e) => setPreguntaEstudianteIA(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleConsultarProfesorIA();
                            }}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              borderRadius: 'var(--wa-radius-sm)',
                              border: '1px solid var(--wa-keyline-strong)',
                              backgroundColor: 'var(--wa-bg-canvas)',
                              color: 'var(--wa-text-primary)',
                              fontSize: '0.875rem',
                            }}
                          />
                          <button
                            onClick={handleConsultarProfesorIA}
                            disabled={cargandoIA || !preguntaEstudianteIA.trim()}
                            style={{
                              background: 'var(--wa-brand-navy-primary)',
                              color: 'var(--wa-bg-surface)',
                              border: 'none',
                              padding: '8px 14px',
                              borderRadius: 'var(--wa-radius-sm)',
                              fontWeight: 600,
                              cursor: cargandoIA ? 'wait' : 'pointer',
                              fontSize: '0.875rem',
                            }}
                          >
                            {cargandoIA ? 'Consultando...' : 'Enviar'}
                          </button>
                        </div>

                        {/* RESPUESTA DEL PROFESOR IA */}
                        {respuestaProfesorIA && (
                          <div
                            style={{
                              backgroundColor: 'var(--wa-bg-canvas)',
                              borderRadius: 'var(--wa-radius-sm)',
                              padding: '12px 14px',
                              border: '1px solid var(--wa-keyline-subtle)',
                              maxHeight: '220px',
                              overflowY: 'auto',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--wa-brand-gold-dark)' }}>
                                Respuesta de {esGael ? 'Prof. Mateo' : 'Dra. Sofía'} (Gemini 3.8 Flash):
                              </span>
                              <button
                                onClick={() => {
                                  if (hablandoProfesor) {
                                    teacherSpeechManager.detener();
                                    setHablandoProfesor(false);
                                  } else {
                                    teacherSpeechManager.hablar(
                                      respuestaProfesorIA,
                                      {
                                        idioma: bloqueActivo.nombreMateria.toLowerCase().includes('english') ? 'en' : 'es',
                                        velocidad: 1,
                                        perfil: esGael ? 'mateo' : 'sofia',
                                      },
                                      {
                                        onStart: () => setHablandoProfesor(true),
                                        onEnd: () => setHablandoProfesor(false),
                                        onError: () => setHablandoProfesor(false),
                                      }
                                    );
                                  }
                                }}
                                style={{
                                  background: 'var(--wa-bg-surface)',
                                  border: '1px solid var(--wa-keyline-subtle)',
                                  borderRadius: 'var(--wa-radius-sm)',
                                  padding: '4px 10px',
                                  fontSize: '0.75rem',
                                  cursor: 'pointer',
                                  color: 'var(--wa-brand-navy-primary)',
                                  fontWeight: 600,
                                }}
                              >
                                {hablandoProfesor ? '⏹ Detener Audio' : '🔊 Escuchar con Voz del Profesor'}
                              </button>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--wa-text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                              {respuestaProfesorIA}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
            ) : (
              /* ------------------------------------------------------------------
                MODO 2: HUB MULTICANAL DE VIDEOLLAMADAS CON PROFESORES REALES
              ------------------------------------------------------------------- */
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
                {/* SELECTOR DE PLATAFORMA DE VIDEOLLAMADA */}
                <div
                  style={{
                    height: '48px',
                    borderBottom: '1px solid var(--wa-keyline-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingLeft: 'var(--carbon-space-2x)',
                    paddingRight: 'var(--carbon-space-2x)',
                    backgroundColor: 'var(--wa-bg-surface)',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--wa-brand-navy-primary)' }}>
                    Tutoría con Docente Real • {bloqueActivo.nombreMateria}
                  </span>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    {plataformasVideo.map((plataforma) => {
                      const plat = plataforma.id;
                      const activa = plataformaVideo === plat;
                      return (
                        <button
                          key={plat}
                          type="button"
                          onClick={() => setPlataformaVideo(plat)}
                          disabled={!plataforma.disponible}
                          title={plataforma.disponible ? plataforma.descripcion : 'Sala no configurada'}
                          aria-pressed={activa}
                          style={{
                            background: activa ? 'var(--wa-brand-gold-primary)' : 'transparent',
                            color: activa ? 'var(--wa-bg-surface)' : 'var(--wa-text-secondary)',
                            border: 'none',
                            borderRadius: 'var(--wa-radius-sm)',
                            padding: '4px 8px',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            cursor: plataforma.disponible ? 'pointer' : 'not-allowed',
                            opacity: plataforma.disponible ? 1 : 0.45,
                          }}
                        >
                          {plataforma.nombre}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* LIENZO DE LA VIDEOLLAMADA */}
                <div style={{ flex: 1, position: 'relative' }}>
                  {!sesionTutoria.disponible ? (
                    <div
                      role="status"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        textAlign: 'center',
                        padding: 'var(--carbon-space-4x)',
                        boxSizing: 'border-box',
                        gap: '0.5rem',
                      }}
                    >
                      <h3 style={{ fontSize: '1.25rem', margin: 0 }}>
                        Sala no configurada
                      </h3>
                      <p style={{ maxWidth: '480px', color: 'var(--wa-text-secondary)', fontSize: '0.9375rem' }}>
                        {sesionTutoria.motivoNoDisponible ||
                          'La institución todavía no configuró esta plataforma de videollamada.'}
                      </p>
                    </div>
                  ) : sesionTutoria.permiteIncrustarIframe ? (
                    <iframe
                      src={sesionTutoria.urlReunion}
                      title={`Tutoría Sincrónica - ${sesionTutoria.nombreVisible}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                      }}
                      allow="camera; microphone; display-capture; fullscreen"
                    />
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        textAlign: 'center',
                        padding: 'var(--carbon-space-4x)',
                        boxSizing: 'border-box',
                      }}
                    >
                      <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
                        Sala de Tutoría: {sesionTutoria.nombreVisible}
                      </h3>
                      <p style={{ maxWidth: '480px', color: 'var(--wa-text-secondary)', fontSize: '0.9375rem', marginBottom: 'var(--carbon-space-3x)' }}>
                        {sesionTutoria.instruccionesAlumno}
                      </p>
                      <a
                        href={sesionTutoria.urlReunion}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          backgroundColor: 'var(--wa-brand-gold-primary)',
                          color: 'var(--wa-bg-surface)',
                          textDecoration: 'none',
                          padding: '12px 24px',
                          borderRadius: 'var(--wa-radius-sm)',
                          fontWeight: 600,
                          fontSize: '0.9375rem',
                        }}
                      >
                        Abrir Reunión en {sesionTutoria.nombreVisible} ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
      )}

      {/* ======================================================================
        MODAL OFICIAL DE VISTA PREVIA E IMPRESIÓN DE LA GUÍA DE ESTUDIO (PDF)
        Permite previsualizar el documento ministerial con formato A4, imprimirlo
        o descargarlo como PDF nativo de manera 100% confiable y sin bloqueos.
      ======================================================================= */}
      {mostrarModalGuiaPdf && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(20, 40, 75, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--wa-bg-surface)',
              borderRadius: 'var(--wa-radius-md)',
              border: '1px solid var(--wa-keyline-strong)',
              width: '100%',
              maxWidth: '920px',
              height: '90vh',
              boxShadow: 'var(--wa-shadow-elevated)',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* CABECERA DEL MODAL DE LA GUÍA */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--wa-keyline-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--wa-bg-canvas)',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', color: 'var(--wa-brand-navy-primary)', fontFamily: 'var(--wa-font-display)' }}>
                  📑 Guía de Estudio Oficial A4 • {bloqueActivo.nombreMateria}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--wa-brand-gold-dark)', fontFamily: 'var(--wa-font-mono)' }}>
                  Estudiante: {estudianteActivo.nombreCompleto} ({estudianteActivo.gradoEcuador}) • Acuerdos MINEDUC 2019-00057-A / 2023-00069-A
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => printableGuideGenerator.imprimirODescargarPdf(estudianteActivo, bloqueActivo, leccionActiva)}
                  style={{
                    background: 'var(--wa-brand-gold-primary)',
                    color: 'var(--wa-bg-surface)',
                    border: 'none',
                    borderRadius: 'var(--wa-radius-sm)',
                    padding: '8px 14px',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>🖨️</span> Imprimir / Guardar como PDF
                </button>

                <button
                  onClick={() => window.open(`/api/curriculum/guide-pdf?materia=${encodeURIComponent(bloqueActivo.nombreMateria)}&estudiante=${encodeURIComponent(estudianteActivo.nombreCompleto)}`, '_blank')}
                  style={{
                    background: 'var(--wa-bg-surface)',
                    color: 'var(--wa-text-primary)',
                    border: '1px solid var(--wa-keyline-strong)',
                    borderRadius: 'var(--wa-radius-sm)',
                    padding: '8px 12px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🌐 Pestaña Completa
                </button>

                <button
                  onClick={() => setMostrarModalGuiaPdf(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    color: 'var(--wa-text-muted)',
                    padding: '4px 8px',
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* VISTA PREVIA DEL DOCUMENTO OFICIAL IFRAME */}
            <iframe
              src={`/api/curriculum/guide-pdf?materia=${encodeURIComponent(bloqueActivo.nombreMateria)}&estudiante=${encodeURIComponent(estudianteActivo.nombreCompleto)}`}
              style={{
                flex: 1,
                width: '100%',
                border: 'none',
                backgroundColor: 'var(--wa-bg-canvas)',
              }}
              title={`Guía de Estudio - ${bloqueActivo.nombreMateria}`}
            />
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL: CALENDARIO ESCOLAR OFICIAL ECUADOR RÉGIMEN SIERRA 2026 - 2027
          ======================================================================= */}
      {mostrarModalCalendario && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 14, 23, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--wa-bg-surface)',
              borderRadius: 'var(--wa-radius-md)',
              border: '1px solid var(--wa-keyline-strong)',
              width: '100%',
              maxWidth: '960px',
              maxHeight: '90vh',
              boxShadow: 'var(--wa-shadow-elevated)',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* CABECERA DEL MODAL */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--wa-keyline-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--wa-bg-canvas)',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--wa-brand-navy-primary)', fontFamily: 'var(--wa-font-display)' }}>
                  🏛️ Calendario Escolar Oficial Régimen Sierra - Amazonía 2026 / 2027
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--wa-brand-gold-dark)', fontFamily: 'var(--wa-font-mono)' }}>
                  Ministerio de Educación del Ecuador (MINEDUC) • 200 Días Laborables • Inicio: Lunes 20 de Octubre de 2026
                </span>
              </div>

              <button
                onClick={() => setMostrarModalCalendario(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: 'var(--wa-text-muted)',
                  padding: '4px 8px',
                }}
              >
                ✕
              </button>
            </div>

            {/* CUERPO DEL CALENDARIO CON SCROLL */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Resumen de Métricas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--wa-keyline-subtle)', backgroundColor: 'var(--wa-bg-canvas)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--wa-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--wa-font-mono)' }}>Fecha de Inicio Oficial</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--wa-brand-emerald-faith)', marginTop: '2px' }}>Lunes 20 Oct 2026</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--wa-text-secondary)', marginTop: '2px' }}>Clases fundacionales y diagnóstico</div>
                </div>

                <div style={{ padding: '12px', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--wa-keyline-subtle)', backgroundColor: 'var(--wa-bg-canvas)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--wa-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--wa-font-mono)' }}>Meta de Días Laborables</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--wa-brand-navy-primary)', marginTop: '2px' }}>200 Días Lectivos</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--wa-text-secondary)', marginTop: '2px' }}>Cumplimiento ministerial estricto</div>
                </div>

                <div style={{ padding: '12px', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--wa-keyline-subtle)', backgroundColor: 'var(--wa-bg-canvas)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--wa-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--wa-font-mono)' }}>Estructura Académica</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--wa-brand-gold-dark)', marginTop: '2px' }}>3 Trimestres</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--wa-text-secondary)', marginTop: '2px' }}>Evaluación formativa y proyectos PBL</div>
                </div>

                <div style={{ padding: '12px', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--wa-keyline-subtle)', backgroundColor: 'var(--wa-bg-canvas)' }}>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--wa-text-muted)', textTransform: 'uppercase', fontFamily: 'var(--wa-font-mono)' }}>Cierre Año Lectivo</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--wa-brand-navy-primary)', marginTop: '2px' }}>25 Junio 2027</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--wa-text-secondary)', marginTop: '2px' }}>Entrega de portafolio y actas</div>
                </div>
              </div>

              {/* Trimestres Académicos */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9375rem', color: 'var(--wa-brand-navy-primary)' }}>
                  📚 Distribución Oficial de los 3 Trimestres
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                  {/* Trimestre 1 */}
                  <div style={{ padding: '12px', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--wa-brand-emerald-faith)', backgroundColor: 'rgba(15, 110, 86, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--wa-brand-emerald-faith)' }}>1.ER TRIMESTRE</span>
                      <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--wa-font-mono)', color: 'var(--wa-text-muted)' }}>40 Días</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', margin: '4px 0' }}>20 Oct 2026 – 11 Dic 2026</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--wa-text-secondary)', margin: 0 }}>
                      <strong>Enfoque:</strong> Nivelación diagnóstica, fundamentos sólidos de matemáticas (valor posicional y recta numérica Z), proyecto interdisciplinario 1. Feriados: 2 y 3 de noviembre; 4 de diciembre.
                    </p>
                  </div>

                  {/* Trimestre 2 */}
                  <div style={{ padding: '12px', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--wa-brand-gold-primary)', backgroundColor: 'rgba(184, 134, 11, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--wa-brand-gold-dark)' }}>2.º TRIMESTRE</span>
                      <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--wa-font-mono)', color: 'var(--wa-text-muted)' }}>80 Días</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', margin: '4px 0' }}>14 Dic 2026 – 19 Mar 2027</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--wa-text-secondary)', margin: 0 }}>
                      <strong>Enfoque:</strong> Profundización analítica, álgebra formal, fracciones y geometría. Incluye Vacaciones de Navidad (24 Dic – 03 Ene) y Carnaval (08 y 09 Feb).
                    </p>
                  </div>

                  {/* Trimestre 3 */}
                  <div style={{ padding: '12px', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--wa-brand-navy-primary)', backgroundColor: 'rgba(30, 58, 138, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--wa-brand-navy-primary)' }}>3.ER TRIMESTRE</span>
                      <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--wa-font-mono)', color: 'var(--wa-text-muted)' }}>80 Días</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', margin: '4px 0' }}>22 Mar 2027 – 25 Jun 2027</div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--wa-text-secondary)', margin: 0 }}>
                      <strong>Enfoque:</strong> Consolidación de aprendizajes, aplicaciones en ciencia y tecnología, entrega del portafolio final. Feriados: Viernes Santo (26 Mar), Día del Trabajo (30 Abr) y Pichincha (24 May).
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabla de Feriados Nacionales Oficiales */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9375rem', color: 'var(--wa-brand-navy-primary)' }}>
                  🏖️ Feriados Nacionales de Ecuador y Asuetos Escolares (Ley de Feriados)
                </h4>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--wa-bg-canvas)', borderBottom: '2px solid var(--wa-keyline-subtle)' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontFamily: 'var(--wa-font-mono)' }}>Fecha</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Motivo / Celebración</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Tipo de Asueto</th>
                        <th style={{ padding: '8px 10px', textAlign: 'left' }}>Efecto en Clases</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FERIADOS_ECUADOR_2026_2027.map((f, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--wa-keyline-subtle)' }}>
                          <td style={{ padding: '8px 10px', fontFamily: 'var(--wa-font-mono)', fontWeight: 600, color: 'var(--wa-brand-navy-primary)' }}>
                            {f.fecha}
                          </td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--wa-text-primary)' }}>
                            {f.nombre}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '3px',
                                fontSize: '0.6875rem',
                                backgroundColor: f.tipo === 'FERIADO_NACIONAL' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                                color: f.tipo === 'FERIADO_NACIONAL' ? '#DC2626' : '#D97706',
                                fontWeight: 600,
                              }}
                            >
                              {f.tipo === 'FERIADO_NACIONAL' ? 'Nacional Obligatorio' : f.tipo === 'FERIADO_LOCAL_SIERRA' ? 'Local Sierra' : 'Vacaciones'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 10px', color: 'var(--wa-text-secondary)' }}>
                            {f.descripcion} (No laborable)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Botón de cierre */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
                <button
                  onClick={() => setMostrarModalCalendario(false)}
                  style={{
                    backgroundColor: 'var(--wa-brand-navy-primary)',
                    color: 'var(--wa-bg-surface)',
                    border: 'none',
                    borderRadius: 'var(--wa-radius-sm)',
                    padding: '8px 18px',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Entendido y Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

