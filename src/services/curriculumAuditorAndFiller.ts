/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Auditoría y Autocompletado Curricular
 * ARCHIVO: src/services/curriculumAuditorAndFiller.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Garantiza la cobertura de los 200 días lectivos del año escolar 2026-2027
 * para la malla personalizada de cada estudiante. Cada jornada se construye a
 * partir del horario semanal real de Google Drive y de la capa de datos
 * curricular, no de un catálogo fijo de cinco materias.
 *
 * El contenido de las asignaturas académicas es neutral y basado en evidencia.
 * La asignatura "Relación con Dios" conserva la profundidad bíblica y teológica
 * como espacio confesional exclusivo.
 * ==============================================================================
 */

import { EstudianteWisdom, ESTUDIANTE_GAEL_INICIAL, ESTUDIANTE_AVRIL_INICIAL } from '@/types/wisdom';
import { EcuadorSchoolCalendarEngine, DetalleDiaLectivo } from './ecuadorSchoolCalendar';
import {
  buscarAsignatura,
  obtenerAsignaturasDelDia,
  obtenerLemaAcademico,
  obtenerPerfilCurricular,
  type AreaCurricular,
  type AsignaturaCurricular,
  type PerfilCurricular,
  type UnidadCurricular,
} from '@/data/curriculum';

export interface GuiaPedagogicaContenido {
  introduccionYObjetivo: {
    queAprenderas: string;
    paraQueSirvePractica: string;
    objetivoOperativo: string;
  };
  desarrolloConceptual: {
    marcoTeorico: string;
    conceptosClave: Array<{ termino: string; definicion: string }>;
    fundamentoProfundo: string;
  };
  guiaPasoAPaso: Array<{
    pasoNumero: number;
    titulo: string;
    instruccionDetallada: string;
    consejoPro?: string;
  }>;
  ejemplosResueltos: Array<{
    tituloCaso: string;
    planteamiento: string;
    desarrolloPasoAPaso: string[];
    resultadoExplicado: string;
  }>;
  puntosClaveResumen: string[];
}

export interface MateriaJornada {
  codigoMineduc: string;
  nombreMateria: string;
  profesorIA: 'Prof. Mateo' | 'Dra. Sofía de Valenzuela';
  horaInicio: string;
  horaFin: string;
  temaDelDia: string;
  subtitulo: string;
  objetivoAprendizaje: string;
  conceptoClave: string;
  ejemploPasoAPaso: string[];
  tallerManual: string;
  preguntaQuiz: {
    enunciado: string;
    opciones: string[];
    respuestaCorrecta: number;
    explicacion: string;
  };
  versiculoBiblico: {
    referencia: string;
    texto: string;
  };
  guiaPedagogica?: GuiaPedagogicaContenido;
  /**
   * Área epistemológica de la asignatura. Permite que los compiladores
   * distingan el lema académico del lema bíblico sin cambiar la arquitectura
   * de los componentes.
   */
  areaCurricular?: AreaCurricular;
  tipoLema?: 'ACADEMICO' | 'BIBLICO';
}

export interface JornadaEscolarCompleta {
  diaLectivo: number;
  semanaNumero: number;
  trimestre: 1 | 2 | 3;
  fechaIso: string;
  fechaLarga: string;
  diaSemana: string;
  estudiante: string;
  grado: string;
  versiculoLemaJornada: {
    referencia: string;
    texto: string;
  };
  materias: MateriaJornada[];
  duracionTotalHoras: number;
  autocompletado: boolean;
}

export interface ResultadoAuditoriaCurricular {
  totalDiasRequeridos: number;
  totalDiasAuditados: number;
  diasCompletos: number;
  diasAutocompletados: number;
  coberturaPorcentaje: number;
  trimestre1Dias: number;
  trimestre2Dias: number;
  trimestre3Dias: number;
  estado: 'CERTIFICADO_SIN_FALTANTES' | 'INCOMPLETO';
  totalMateriasCatalogo?: number;
  totalUnidadesCurriculares?: number;
}

/**
 * Etiquetas legibles para el subtítulo de cada bloque.
 */
const ETIQUETA_AREA: Record<AreaCurricular, string> = {
  LENGUA_Y_LITERATURA: 'Lengua y Literatura',
  MATEMATICAS: 'Matemáticas',
  CIENCIAS_NATURALES: 'Ciencias Naturales',
  ESTUDIOS_SOCIALES: 'Estudios Sociales',
  LENGUA_EXTRANJERA: 'Lengua Extranjera',
  TECNOLOGIA: 'Tecnología',
  ARTE: 'Arte y Cultura',
  EDUCACION_FISICA: 'Educación Física y Salud',
  CIENCIAS_POLITICAS: 'Ciencias Políticas y RR.II.',
  ADMINISTRACION: 'Administración y Marketing',
  TEOLOGIA: 'Teología y Cosmovisión',
};

/**
 * Convierte "HH:MM" en minutos desde medianoche.
 */
function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(':').map((valor) => parseInt(valor, 10));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/**
 * Calcula la duración pedagógica real de una jornada a partir de sus bloques.
 */
function calcularDuracionHoras(materias: MateriaJornada[]): number {
  const minutos = materias.reduce(
    (total, materia) => total + Math.max(0, horaAMinutos(materia.horaFin) - horaAMinutos(materia.horaInicio)),
    0
  );
  return Math.round((minutos / 60) * 100) / 100;
}

export class CurriculumAuditorAndFiller {
  private static instancia: CurriculumAuditorAndFiller;

  private constructor() {}

  public static obtenerInstancia(): CurriculumAuditorAndFiller {
    if (!CurriculumAuditorAndFiller.instancia) {
      CurriculumAuditorAndFiller.instancia = new CurriculumAuditorAndFiller();
    }
    return CurriculumAuditorAndFiller.instancia;
  }

  /**
   * Obtiene el perfil personalizado a partir del código de carpeta del alumno.
   */
  private obtenerPerfil(estudiante: EstudianteWisdom): PerfilCurricular {
    return obtenerPerfilCurricular(estudiante.codigoCarpetaAnioDrive);
  }

  /**
   * Selecciona una unidad determinista para el día lectivo, evitando que dos
   * bloques consecutivos de la misma asignatura repitan el mismo tema.
   */
  private seleccionarUnidad(
    asignatura: AsignaturaCurricular,
    diaLectivo: number,
    indiceBloque: number
  ): UnidadCurricular {
    const codigoNumerico = parseInt(asignatura.codigo, 10) || 0;
    const indice =
      (Math.max(1, diaLectivo) - 1 + codigoNumerico * 2 + indiceBloque * 3) %
      asignatura.unidades.length;
    return asignatura.unidades[indice];
  }

  /**
   * Construye el cuestionario formativo del día con una respuesta correcta
   * rotada y distractores plausibles pero refutables.
   */
  private construirPreguntaDelDia(
    asignatura: AsignaturaCurricular,
    unidad: UnidadCurricular,
    diaLectivo: number,
    indiceBloque: number
  ): MateriaJornada['preguntaQuiz'] {
    const esTeologia = asignatura.area === 'TEOLOGIA';
    const correcta = unidad.conceptoClave;
    const distractores = esTeologia
      ? [
          'Se puede interpretar el texto sin considerar su contexto literario ni histórico.',
          'La doctrina bíblica no tiene relación con la vida práctica del creyente.',
        ]
      : [
          'Se trata de una opinión personal que no requiere evidencia ni verificación.',
          'No existe un método ni una fuente confiable para estudiarlo.',
        ];

    const posicion = (Math.max(1, diaLectivo) + indiceBloque) % 3;
    const opciones = [...distractores];
    opciones.splice(posicion, 0, correcta);

    return {
      enunciado: `¿Cuál afirmación describe correctamente "${unidad.titulo}" en ${asignatura.nombre}?`,
      opciones,
      respuestaCorrecta: posicion,
      explicacion: `${unidad.conceptoClave} Aplicación: ${unidad.aplicacion}`,
    };
  }

  /**
   * Construye la guía pedagógica completa de cinco secciones para una
   * asignatura y unidad determinadas.
   */
  private construirGuiaDesdeAsignatura(
    asignatura: AsignaturaCurricular,
    unidad: UnidadCurricular,
    esGael: boolean,
    diaLectivo: number
  ): GuiaPedagogicaContenido {
    const esTeologia = asignatura.area === 'TEOLOGIA';
    const nivel = esGael ? 'Básica Elemental' : 'Básica Superior';

    return {
      introduccionYObjetivo: {
        queAprenderas: `En esta jornada de ${asignatura.nombre} estudiarás "${unidad.titulo}". ${unidad.conceptoClave} Partimos de cero: definiremos los términos, revisaremos el contexto y aplicaremos el método de la asignatura hasta comprender el concepto con autonomía.`,
        paraQueSirvePractica: `${unidad.aplicacion} ${asignatura.aplicacionVida} Este aprendizaje se conecta con situaciones reales y con las demás asignaturas de tu malla de ${nivel}.`,
        objetivoOperativo: `Analizar, explicar y aplicar "${unidad.titulo}" mediante el procedimiento de ${asignatura.nombre}, comprobando el resultado con evidencia o con una verificación explícita.`,
      },
      desarrolloConceptual: {
        marcoTeorico: `${asignatura.enfoqueAcademico}\n\n${asignatura.analisisModelo}\n\nEn esta jornada profundizamos en "${unidad.titulo}". La idea esencial es: ${unidad.conceptoClave} Para comprenderla, no basta memorizar: hay que identificar sus componentes, relacionarlos y comprobarlos con el método de la asignatura.`,
        conceptosClave: asignatura.conceptosFundamentales.map((concepto) => ({
          termino: concepto.termino,
          definicion: concepto.definicion,
        })),
        fundamentoProfundo: esTeologia
          ? asignatura.sintesis
          : `${asignatura.sintesis} Este fundamento es epistemológico y metodológico: describe cómo se construye y se valida el conocimiento en esta disciplina.`,
      },
      guiaPasoAPaso: asignatura.metodo.map((instruccion, indice) => ({
        pasoNumero: indice + 1,
        titulo: [
          'Delimitar el problema',
          'Representar y analizar',
          'Ejecutar el procedimiento',
          'Verificar y comunicar',
        ][indice] || `Paso ${indice + 1}`,
        instruccionDetallada: `${instruccion} Aplica este paso al tema "${unidad.titulo}".`,
        consejoPro:
          indice === 0
            ? 'Escribe con tus propias palabras qué debes averiguar antes de empezar.'
            : indice === 1
            ? 'Un esquema, tabla o dibujo reduce la ambigüedad y los errores.'
            : indice === 2
            ? 'Justifica cada decisión; no saltes pasos aunque el resultado parezca obvio.'
            : 'Comprueba con un caso nuevo o con una fuente independiente.',
      })),
      ejemplosResueltos: [
        {
          tituloCaso: `Caso aplicado de ${asignatura.nombre}`,
          planteamiento: `Situación real o académica sobre "${unidad.titulo}". Identifica los datos, la pregunta y la evidencia disponible.`,
          desarrolloPasoAPaso: [
            ...asignatura.metodo.slice(0, 3),
            `Aplicación concreta: ${unidad.aplicacion}`,
          ],
          resultadoExplicado: `La respuesta se considera válida cuando se sostiene en el procedimiento y puede explicarse con las palabras de la disciplina. Concepto central: ${unidad.conceptoClave}`,
        },
      ],
      puntosClaveResumen: [
        `${unidad.titulo}: ${unidad.conceptoClave}`,
        `El método de ${asignatura.nombre} exige orden, justificación y verificación.`,
        `La aplicación práctica de esta jornada es: ${unidad.aplicacion}`,
        esTeologia
          ? 'La doctrina se comprende mejor cuando se lee en su contexto y se aplica con humildad y obediencia.'
          : 'Una conclusión es confiable cuando puede reproducirse y contrastarse con evidencia.',
      ],
    };
  }

  /**
   * Método público conservado por compatibilidad. Resuelve la asignatura y la
   * unidad a partir del nombre y del tema recibidos.
   */
  public construirGuiaPedagogica(
    nombreMateria: string,
    tema: string,
    esGael: boolean,
    diaLectivo: number
  ): GuiaPedagogicaContenido {
    const perfil = this.obtenerPerfil(esGael ? ESTUDIANTE_GAEL_INICIAL : ESTUDIANTE_AVRIL_INICIAL);
    const asignatura = buscarAsignatura(perfil, nombreMateria);
    const unidad =
      asignatura.unidades.find((u) =>
        tema.toLowerCase().includes(u.titulo.toLowerCase().slice(0, 18))
      ) || asignatura.unidades[0];
    return this.construirGuiaDesdeAsignatura(asignatura, unidad, esGael, diaLectivo);
  }

  /**
   * Genera una materia de la jornada a partir del bloque real del horario.
   */
  private generarMateriaDesdeBloque(
    asignatura: AsignaturaCurricular,
    diaLectivo: number,
    indiceBloque: number,
    horaInicio: string,
    horaFin: string,
    esGael: boolean,
    trimestre: 1 | 2 | 3
  ): MateriaJornada {
    const unidad = this.seleccionarUnidad(asignatura, diaLectivo, indiceBloque);
    const esTeologia = asignatura.area === 'TEOLOGIA';
    const lema = asignatura.lema;

    return {
      codigoMineduc: `${asignatura.codigo.replace(/^\d+_/, '')}.${diaLectivo}`,
      nombreMateria: asignatura.nombre,
      profesorIA: asignatura.profesorIA,
      horaInicio,
      horaFin,
      temaDelDia: `Día ${diaLectivo}: ${unidad.titulo}`,
      subtitulo: `${ETIQUETA_AREA[asignatura.area]} • Trimestre ${trimestre}`,
      objetivoAprendizaje: esTeologia
        ? `Analizar "${unidad.titulo}" con fidelidad exegética y aplicar la doctrina a la vida cristiana.`
        : `Analizar "${unidad.titulo}" y aplicar el método de ${asignatura.nombre} con evidencia y verificación.`,
      conceptoClave: unidad.conceptoClave,
      ejemploPasoAPaso: [
        ...asignatura.metodo.slice(0, 3),
        `Aplicación: ${unidad.aplicacion}`,
      ],
      tallerManual: `${unidad.aplicacion} Registra el proceso completo en tu cuaderno o portafolio.`,
      preguntaQuiz: this.construirPreguntaDelDia(asignatura, unidad, diaLectivo, indiceBloque),
      versiculoBiblico: lema,
      guiaPedagogica: this.construirGuiaDesdeAsignatura(asignatura, unidad, esGael, diaLectivo),
      areaCurricular: asignatura.area,
      tipoLema: esTeologia ? 'BIBLICO' : 'ACADEMICO',
    };
  }

  /**
   * Obtiene la jornada completa de cualquier día lectivo (1 a 200) usando el
   * horario semanal del manifiesto de Drive.
   */
  public obtenerJornadaEscolarCompleta(
    diaLectivo: number,
    estudiante: EstudianteWisdom
  ): JornadaEscolarCompleta {
    const perfil = this.obtenerPerfil(estudiante);
    const esGael = perfil.edad <= 10;
    const detalleDia: DetalleDiaLectivo = EcuadorSchoolCalendarEngine.obtenerDiaPorIndice(
      Math.max(0, Math.min(199, diaLectivo - 1))
    );
    const trimestre: 1 | 2 | 3 = diaLectivo <= 65 ? 1 : diaLectivo <= 130 ? 2 : 3;
    const semanaNumero = Math.floor((diaLectivo - 1) / 5) + 1;

    const asignaturasDelDia = obtenerAsignaturasDelDia(perfil, detalleDia.diaSemana);

    const materias: MateriaJornada[] = asignaturasDelDia.map(({ bloque, asignatura }, indice) => {
      const [horaInicio, horaFin] = bloque.hora.split(' - ').map((hora) => hora.trim());
      return this.generarMateriaDesdeBloque(
        asignatura,
        diaLectivo,
        indice,
        horaInicio,
        horaFin,
        esGael,
        trimestre
      );
    });

    return {
      diaLectivo,
      semanaNumero,
      trimestre,
      fechaIso: detalleDia.fechaIso,
      fechaLarga: detalleDia.diaSemanaLargo,
      diaSemana: detalleDia.diaSemana,
      estudiante: estudiante.nombreCompleto,
      grado: estudiante.gradoEcuador,
      versiculoLemaJornada: obtenerLemaAcademico(diaLectivo),
      materias,
      duracionTotalHoras: calcularDuracionHoras(materias),
      autocompletado: true,
    };
  }

  /**
   * Audita los 200 días lectivos y comprueba que cada jornada tenga cinco
   * bloques, tema, guía y cuestionario. También reporta el tamaño del catálogo
   * personalizado de cada estudiante.
   */
  public auditarPlanCompleto(): ResultadoAuditoriaCurricular {
    const totalDias = 200;
    let diasCompletos = 0;
    let diasAutocompletados = 0;
    let t1 = 0;
    let t2 = 0;
    let t3 = 0;

    for (let dia = 1; dia <= totalDias; dia++) {
      const jornadaGael = this.obtenerJornadaEscolarCompleta(dia, ESTUDIANTE_GAEL_INICIAL);
      const jornadaAvril = this.obtenerJornadaEscolarCompleta(dia, ESTUDIANTE_AVRIL_INICIAL);

      const jornadas = [jornadaGael, jornadaAvril];
      const completas = jornadas.every(
        (jornada) =>
          jornada.materias.length === 5 &&
          jornada.materias.every(
            (materia) =>
              Boolean(materia.temaDelDia) &&
              Boolean(materia.conceptoClave) &&
              Boolean(materia.guiaPedagogica) &&
              Boolean(materia.preguntaQuiz?.enunciado) &&
              Boolean(materia.versiculoBiblico?.texto)
          )
      );

      if (completas) {
        diasCompletos++;
        diasAutocompletados++;
      }

      if (dia <= 65) t1++;
      else if (dia <= 130) t2++;
      else t3++;
    }

    const perfilGael = this.obtenerPerfil(ESTUDIANTE_GAEL_INICIAL);
    const perfilAvril = this.obtenerPerfil(ESTUDIANTE_AVRIL_INICIAL);
    const totalMateriasCatalogo = perfilGael.asignaturas.length + perfilAvril.asignaturas.length;
    const totalUnidadesCurriculares =
      perfilGael.asignaturas.reduce((total, a) => total + a.unidades.length, 0) +
      perfilAvril.asignaturas.reduce((total, a) => total + a.unidades.length, 0);

    return {
      totalDiasRequeridos: totalDias,
      totalDiasAuditados: totalDias,
      diasCompletos,
      diasAutocompletados,
      coberturaPorcentaje: Math.round((diasCompletos / totalDias) * 10000) / 100,
      trimestre1Dias: t1,
      trimestre2Dias: t2,
      trimestre3Dias: t3,
      estado: diasCompletos === totalDias ? 'CERTIFICADO_SIN_FALTANTES' : 'INCOMPLETO',
      totalMateriasCatalogo,
      totalUnidadesCurriculares,
    };
  }
}

export const curriculumAuditorAndFiller = CurriculumAuditorAndFiller.obtenerInstancia();
