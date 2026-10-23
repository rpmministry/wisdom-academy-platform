/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Motor de Contenido Curricular Dinámico
 * ARCHIVO: src/services/curriculumContentEngine.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Genera la lección completa de cualquier asignatura de la malla personalizada
 * de Gael (4.° EGB) y Avril (8.° EGB). El contenido académico es neutral y se
 * basa en el método científico y en los lineamientos curriculares del MINEDUC.
 * La profundidad bíblica se concentra exclusivamente en "Relación con Dios".
 *
 * La API pública se conserva intacta para no romper los componentes que ya
 * consumen este motor (aula OpenMAIC, reproductor Platzi, guías PDF y API REST).
 * ==============================================================================
 */

import {
  buscarAsignatura,
  normalizarNombreAsignatura,
  obtenerPerfilCurricular,
  type AsignaturaCurricular,
  type PerfilCurricular,
  type UnidadCurricular,
} from '@/data/curriculum';
import type { ContextoAcademico } from '@/types/educationalResources';

export interface DiapositivaLeccion {
  numero: number;
  etiquetaFase: string;
  titulo: string;
  subtitulo: string;
  contenidoExplicativo: string;
  referenciaLibroTexto: string;
  versiculoBiblico: {
    referencia: string;
    texto: string;
  };
  ejemploPasoAPaso?: string[];
  llamadoAccion: string;
  preguntaDisparadora?: string;
  objetivosHoy?: string[];
  tipoGrafico?:
    | 'PIZZA_FRACCIONES'
    | 'RECTA_NUMERICA'
    | 'CELULA_VIVA'
    | 'ARBOL_GRAMATICAL'
    | 'COSMOS_CREACION'
    | 'BALANZA_ALGEBRAICA';
  insigniaGrafico?: string;
  colorInsignia?: string;
  guionVozEspecifico?: string;
  pasosExplicacion?: PasoExplicacionLeccion[];
}

export interface PasoExplicacionLeccion {
  indice: number;
  etiqueta: string;
  titulo: string;
  descripcionCorta: string;
  focoVisual: 'pregunta' | 'grafico' | 'objetivos' | 'versiculo';
  guionVoz: string;
  icono: string;
}

export interface PreguntaQuizMateria {
  id: number;
  enunciado: string;
  opciones: string[];
  indiceCorrecto: number;
  explicacionPedagogica: string;
}

export interface SimulacionMateria {
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

export interface RetoPblMateria {
  titulo: string;
  descripcion: string;
  criteriosMineduc: string[];
  entregableEsperado: string;
}

export interface LeccionMateriaCompleta {
  materia: string;
  grado: string;
  estudiante: string;
  libroTextoPrincipal: string;
  diapositivas: DiapositivaLeccion[];
  simulacion: SimulacionMateria;
  preguntasQuiz: PreguntaQuizMateria[];
  retoPbl: RetoPblMateria;
}

export interface IntervencionOpenMAIC {
  nombreProfesor: string;
  tituloProfesor: string;
  avatarProfesor: string;
  estadoProfesor: string;
  guionVoz: string;
  companero?: {
    nombre: string;
    edad: number;
    avatar: string;
    pregunta: string;
    respuestaProfesor: string;
  };
}

/**
 * Determina si una asignatura pertenece al espacio confesional. Solo en ese
 * caso se utiliza lenguaje bíblico y teológico en la lección.
 */
function esAsignaturaTeologica(asignatura: AsignaturaCurricular): boolean {
  return asignatura.area === 'TEOLOGIA';
}

/**
 * Devuelve el perfil según el indicador histórico de la UI.
 */
function obtenerPerfilPorIndicador(esGael: boolean): PerfilCurricular {
  return obtenerPerfilCurricular(esGael ? '04_Cuarto_EGB_Gael' : '08_Octavo_EGB_Avril');
}

/**
 * Construye el guion hablado de una diapositiva sin introducir referencias
 * religiosas en asignaturas académicas.
 */
function construirGuion(
  esGael: boolean,
  asignatura: AsignaturaCurricular,
  diapositiva: DiapositivaLeccion
): string {
  const saludo = esGael
    ? `¡Hola Gael! Te acompaño en ${asignatura.nombre}.`
    : `Avril, continuamos con ${asignatura.nombre}.`;

  return `${saludo} ${diapositiva.contenidoExplicativo} ${diapositiva.llamadoAccion}`;
}

export class CurriculumContentEngine {
  /**
   * Obtiene la lección completa para la materia y perfil seleccionados.
   * El tercer parámetro es opcional y permite alinear la lección con un tema
   * específico sin romper las llamadas existentes de dos argumentos.
   */
  public obtenerLeccion(
    materiaNombre: string,
    esGael: boolean,
    tema?: string,
    perfilCurricular?: PerfilCurricular
  ): LeccionMateriaCompleta {
    const perfil = perfilCurricular || obtenerPerfilPorIndicador(esGael);
    const asignatura = buscarAsignatura(perfil, materiaNombre);
    const unidad =
      (tema &&
        asignatura.unidades.find(
          (u) => normalizarNombreAsignatura(u.titulo).includes(normalizarNombreAsignatura(tema))
        )) ||
      asignatura.unidades[0];

    return this.construirLeccion(perfil, asignatura, unidad);
  }

  /**
   * Construye las cuatro diapositivas pedagógicas de la asignatura.
   */
  private construirLeccion(
    perfil: PerfilCurricular,
    asignatura: AsignaturaCurricular,
    unidad: UnidadCurricular
  ): LeccionMateriaCompleta {
    const esGael = perfil.edad <= 10;
    const esTeologia = esAsignaturaTeologica(asignatura);
    const refs = asignatura.bibliografia
      .slice(0, 3)
      .map((r) => r.titulo)
      .join(' • ');
    const libroTextoPrincipal = `${asignatura.textoPrincipal} • ${refs}`;
    const colorInsignia = esGael ? 'var(--brand-gold)' : 'var(--accent-study)';

    const diapositiva1: DiapositivaLeccion = {
      numero: 1,
      etiquetaFase: esTeologia ? 'Fundamento Bíblico' : 'Fundamento Académico',
      titulo: `${asignatura.nombre}: ${unidad.titulo}`,
      subtitulo: asignatura.nombreCorto,
      contenidoExplicativo: asignatura.enfoqueAcademico,
      referenciaLibroTexto: `${asignatura.textoPrincipal} — ${unidad.titulo}`,
      versiculoBiblico: asignatura.lema,
      llamadoAccion: 'Avanza a la diapositiva 2 para analizar el modelo y la evidencia.',
      preguntaDisparadora: asignatura.preguntaDisparadora,
      objetivosHoy: asignatura.objetivos,
      tipoGrafico: asignatura.tipoGrafico,
      insigniaGrafico: asignatura.insigniaGrafico,
      colorInsignia,
      guionVozEspecifico: '',
    };

    const diapositiva2: DiapositivaLeccion = {
      numero: 2,
      etiquetaFase: esTeologia ? 'Análisis Bíblico-Teológico' : 'Modelo y Evidencia',
      titulo: esTeologia ? 'Análisis doctrinal y contexto bíblico' : 'Cómo se organiza y se comprueba',
      subtitulo: esTeologia
        ? 'Exégesis, historia de la redención y formulación doctrinal'
        : 'Modelo explicativo, datos y evidencia',
      contenidoExplicativo: asignatura.analisisModelo,
      referenciaLibroTexto: `${asignatura.bibliografia[0]?.titulo || asignatura.textoPrincipal} — ${unidad.titulo}`,
      versiculoBiblico: asignatura.lema,
      llamadoAccion: 'Continúa a la diapositiva 3 para aplicar el procedimiento.',
      preguntaDisparadora: asignatura.preguntaDisparadora,
      objetivosHoy: asignatura.objetivos,
      insigniaGrafico: asignatura.insigniaGrafico,
      colorInsignia,
      guionVozEspecifico: '',
    };

    const diapositiva3: DiapositivaLeccion = {
      numero: 3,
      etiquetaFase: esTeologia ? 'Método de Estudio Bíblico' : 'Procedimiento y Práctica',
      titulo: esTeologia ? 'Lectura, interpretación y aplicación' : 'Método de trabajo paso a paso',
      subtitulo: unidad.conceptoClave,
      contenidoExplicativo: `${asignatura.aplicacionVida} Aplicación de esta jornada: ${unidad.aplicacion}`,
      referenciaLibroTexto: `${asignatura.textoPrincipal} — ${unidad.titulo}`,
      versiculoBiblico: asignatura.lema,
      ejemploPasoAPaso: asignatura.metodo,
      llamadoAccion: 'Resuelve la actividad interactiva y luego completa el cuestionario.',
      objetivosHoy: asignatura.objetivos,
      insigniaGrafico: asignatura.insigniaGrafico,
      colorInsignia,
      guionVozEspecifico: '',
    };

    const diapositiva4: DiapositivaLeccion = {
      numero: 4,
      etiquetaFase: esTeologia ? 'Aplicación Pastoral' : 'Síntesis y Aplicación',
      titulo: esTeologia ? 'Vivir la doctrina en lo cotidiano' : 'Idea clave y transferencia',
      subtitulo: unidad.conceptoClave,
      contenidoExplicativo: asignatura.sintesis,
      referenciaLibroTexto: `${asignatura.textoPrincipal} — ${unidad.titulo}`,
      versiculoBiblico: asignatura.lema,
      ejemploPasoAPaso: [
        `Concepto central: ${unidad.conceptoClave}`,
        `Aplicación: ${unidad.aplicacion}`,
        `Verificación: explica el concepto con tus propias palabras y un ejemplo.`,
      ],
      llamadoAccion: 'Completa el reto PBL y registra la evidencia en tu portafolio.',
      objetivosHoy: asignatura.objetivos,
      insigniaGrafico: asignatura.insigniaGrafico,
      colorInsignia,
      guionVozEspecifico: '',
    };

    const diapositivas = [diapositiva1, diapositiva2, diapositiva3, diapositiva4];
    diapositivas.forEach((diapo) => {
      diapo.guionVozEspecifico = construirGuion(esGael, asignatura, diapo);
    });

    return {
      materia: asignatura.nombre,
      grado: perfil.grado,
      estudiante: perfil.estudiante,
      libroTextoPrincipal,
      diapositivas,
      simulacion: {
        tipo: asignatura.simulacion.tipo,
        titulo: asignatura.simulacion.titulo,
        instrucciones: asignatura.simulacion.instrucciones,
        codigoOTextoInicial: asignatura.simulacion.codigoOTextoInicial,
        demostracionInteractiva: asignatura.simulacion.demostracionInteractiva,
      },
      preguntasQuiz: asignatura.preguntasQuiz.map((pregunta, indice) => ({
        id: indice + 1,
        enunciado: pregunta.enunciado,
        opciones: pregunta.opciones,
        indiceCorrecto: pregunta.indiceCorrecto,
        explicacionPedagogica: pregunta.explicacionPedagogica,
      })),
      retoPbl: {
        titulo: asignatura.retoPbl.titulo,
        descripcion: asignatura.retoPbl.descripcion,
        criteriosMineduc: asignatura.retoPbl.criteriosMineduc,
        entregableEsperado: asignatura.retoPbl.entregableEsperado,
      },
    };
  }

  /**
   * Genera la secuencia de cuatro pasos pedagógicos que el visor OpenMAIC
   * resalta en pantalla. Conserva los focos visuales históricos para no alterar
   * la lógica de animación del componente.
   */
  public obtenerPasosExplicacion(
    diapo: DiapositivaLeccion,
    esGael: boolean,
    materiaNombre: string
  ): PasoExplicacionLeccion[] {
    if (diapo.pasosExplicacion && diapo.pasosExplicacion.length > 0) {
      return diapo.pasosExplicacion;
    }

    const perfil = obtenerPerfilPorIndicador(esGael);
    const asignatura = buscarAsignatura(perfil, materiaNombre);
    const esTeologia = esAsignaturaTeologica(asignatura);

    const saludo = esGael
      ? `¡Hola Gael! Vamos a estudiar ${asignatura.nombre}.`
      : `Avril, analizamos ${asignatura.nombre} con rigor y evidencia.`;

    const paso1 = `${saludo} La pregunta que orienta esta diapositiva es: "${diapo.preguntaDisparadora || diapo.titulo}". Antes de responder, identifica qué datos necesitas y qué supuestos debes comprobar.`;

    const paso2 = `Observa el modelo visual: ${diapo.insigniaGrafico || 'esquema de la lección'}. ${diapo.contenidoExplicativo} Relaciona cada elemento con la evidencia o con el texto que lo sustenta.`;

    const paso3 = `Aplica el procedimiento de la asignatura: ${(diapo.ejemploPasoAPaso || asignatura.metodo).join(' ')} Registra cada paso y verifica el resultado antes de continuar.`;

    const paso4 = esTeologia
      ? `Cierra con la verdad central de esta lección: "${diapo.versiculoBiblico.texto}" (${diapo.versiculoBiblico.referencia}). Conecta esta doctrina con una acción concreta de fe, amor y servicio.`
      : `Cierra con esta idea de síntesis: "${diapo.versiculoBiblico.texto}" — ${diapo.versiculoBiblico.referencia}. Explica cómo la aplicarías en un problema nuevo y cómo comprobarías que tu respuesta es correcta.`;

    return [
      {
        indice: 0,
        etiqueta: 'Paso 1: Enfoque',
        titulo: esTeologia ? 'Pregunta de indagación bíblica' : 'Pregunta de indagación',
        descripcionCorta: diapo.preguntaDisparadora || 'Pregunta inicial',
        focoVisual: 'pregunta',
        guionVoz: paso1,
        icono: '🎯',
      },
      {
        indice: 1,
        etiqueta: 'Paso 2: Modelo',
        titulo: esTeologia ? 'Análisis del texto y del contexto' : 'Análisis del modelo y la evidencia',
        descripcionCorta: diapo.insigniaGrafico || 'Modelo visual de la lección',
        focoVisual: 'grafico',
        guionVoz: paso2,
        icono: '🔍',
      },
      {
        indice: 2,
        etiqueta: 'Paso 3: Procedimiento',
        titulo: esTeologia ? 'Método de interpretación y aplicación' : 'Procedimiento metódico',
        descripcionCorta: 'Objetivos y método ordenado',
        focoVisual: 'objetivos',
        guionVoz: paso3,
        icono: '📐',
      },
      {
        indice: 3,
        etiqueta: esTeologia ? 'Paso 4: Aplicación' : 'Paso 4: Síntesis',
        titulo: esTeologia ? 'Fundamento bíblico y respuesta de fe' : 'Idea clave y transferencia',
        descripcionCorta: diapo.versiculoBiblico.referencia,
        focoVisual: 'versiculo',
        guionVoz: paso4,
        icono: esTeologia ? '✝' : '🧭',
      },
    ];
  }

  /**
   * Expone el contexto curricular real de la clase para el sistema de recursos
   * audiovisuales. No incluye el nombre del estudiante: la recomendación debe
   * depender del tema, el nivel y los objetivos, no de datos personales.
   */
  public obtenerContextoAprendizaje(
    materiaNombre: string,
    esGael: boolean,
    temaUnidad?: string,
    numeroDiapositiva = 1
  ): ContextoAcademico {
    return this.obtenerContextoAprendizajeDesdePerfil(
      obtenerPerfilPorIndicador(esGael),
      materiaNombre,
      temaUnidad,
      numeroDiapositiva
    );
  }

  /**
   * Variante escalable para cualquier perfil curricular. Permite que el sistema
   * de recursos funcione en años lectivos futuros sin depender del indicador
   * histórico Gael/Avril.
   */
  public obtenerContextoAprendizajeDesdePerfil(
    perfil: PerfilCurricular,
    materiaNombre: string,
    temaUnidad?: string,
    numeroDiapositiva = 1
  ): ContextoAcademico {
    const asignatura = buscarAsignatura(perfil, materiaNombre);
    const normalizadoTema = temaUnidad ? normalizarNombreAsignatura(temaUnidad) : '';
    const unidad =
      (normalizadoTema &&
        asignatura.unidades.find((u) =>
          normalizarNombreAsignatura(u.titulo).includes(normalizadoTema)
        )) ||
      asignatura.unidades[0];
    const leccion = this.construirLeccion(perfil, asignatura, unidad);
    const indice = Math.max(0, Math.min(leccion.diapositivas.length - 1, numeroDiapositiva - 1));
    const diapositiva = leccion.diapositivas[indice];

    return {
      edad: perfil.edad,
      nivel: perfil.subnivelMineduc,
      curso: perfil.grado,
      asignatura: asignatura.nombre,
      area: asignatura.area,
      unidad: unidad.titulo,
      tema: unidad.titulo,
      subtema: unidad.conceptoClave,
      objetivos: asignatura.objetivos.slice(0, 6),
      conceptos: [
        unidad.conceptoClave,
        ...asignatura.conceptosFundamentales
          .map((concepto) => concepto.termino)
          .slice(0, 5),
      ],
      idioma: asignatura.area === 'LENGUA_EXTRANJERA' ? 'en' : 'es',
      diapositiva: indice + 1,
      fase: diapositiva.etiquetaFase,
      contenidoDiapositiva: `${diapositiva.titulo}. ${diapositiva.contenidoExplicativo}`.slice(
        0,
        800
      ),
    };
  }

  /**
   * Obtiene la intervención hablada del Profesor IA y el diálogo del compañero.
   * En asignaturas académicas no se introducen versículos ni exhortaciones
   * religiosas; en teología sí se usa lenguaje bíblico de forma explícita.
   */
  public obtenerIntervencionProfesor(
    materiaNombre: string,
    esGael: boolean,
    escena: 'slides' | 'interactive' | 'quiz' | 'pbl',
    diapositivaNumero: number,
    temaUnidad?: string,
    perfilCurricular?: PerfilCurricular
  ): IntervencionOpenMAIC {
    const perfil = perfilCurricular || obtenerPerfilPorIndicador(esGael);
    const asignatura = buscarAsignatura(perfil, materiaNombre);
    const leccion = this.obtenerLeccion(
      materiaNombre,
      esGael,
      temaUnidad,
      perfil
    );
    const diapo = leccion.diapositivas[diapositivaNumero - 1] || leccion.diapositivas[0];
    const esTeologia = esAsignaturaTeologica(asignatura);

    const nombreProfesor = esGael ? 'Prof. Mateo' : 'Dra. Sofía de Valenzuela';
    const tituloProfesor = esGael
      ? esTeologia
        ? 'Pedagogo de Primaria y Mentor Bíblico'
        : 'Pedagogo de Primaria y Explorador Académico'
      : esTeologia
      ? 'Catedrática de Teología y Cosmovisión'
      : 'Catedrática de Ciencias y Humanidades';

    const avatarProfesor = esGael
      ? '/brand/teachers/profesor-mateo.jpg'
      : '/brand/teachers/profesora-sofia.jpg';

    const companero = {
      nombre: esGael ? 'Lucas' : 'Daniel',
      edad: esGael ? 8 : 13,
      avatar: esGael
        ? '/brand/teachers/lucas-classmate.jpg'
        : '/brand/teachers/daniel-classmate.jpg',
    };

    if (escena === 'slides') {
      return {
        nombreProfesor,
        tituloProfesor,
        avatarProfesor,
        estadoProfesor: `Explicando diapositiva ${diapositivaNumero}`,
        guionVoz: `${diapo.contenidoExplicativo} ${diapo.llamadoAccion}`,
        companero: {
          ...companero,
          pregunta: esTeologia
            ? '¿Cómo podemos distinguir una interpretación fiel del texto de una opinión personal?'
            : `¿Cómo comprobamos que esta explicación de ${asignatura.nombre} es correcta?`,
          respuestaProfesor: esTeologia
            ? 'Volviendo al contexto del pasaje, comparando traducciones y sometiendo la interpretación a la enseñanza global de la Escritura.'
            : 'Contrastando la explicación con la evidencia, aplicando el procedimiento y verificando el resultado con un caso nuevo.',
        },
      };
    }

    if (escena === 'interactive') {
      return {
        nombreProfesor,
        tituloProfesor,
        avatarProfesor,
        estadoProfesor: 'Guiando la pizarra interactiva',
        guionVoz: `En esta actividad pondrás en práctica: "${leccion.simulacion.titulo}". ${leccion.simulacion.instrucciones}`,
        companero: {
          ...companero,
          pregunta: '¿Puedo probar varios valores y comparar los resultados antes de concluir?',
          respuestaProfesor: esTeologia
            ? 'Sí. Contrasta el texto con su contexto y registra cómo cambia tu comprensión al ampliar la información.'
            : 'Sí. Probar casos, comparar resultados y registrar lo observado es exactamente el método de trabajo.',
        },
      };
    }

    if (escena === 'quiz') {
      return {
        nombreProfesor,
        tituloProfesor,
        avatarProfesor,
        estadoProfesor: 'Acompañando el cuestionario formativo',
        guionVoz: `Revisa cada alternativa con calma. No busques adivinar: identifica la opción que se sostiene en la evidencia y en el procedimiento estudiado.`,
        companero: {
          ...companero,
          pregunta: '¿Qué hago si dos opciones me parecen correctas?',
          respuestaProfesor: esTeologia
            ? 'Vuelve al texto bíblico y examina cuál opción es más fiel al contexto y a la doctrina.'
            : 'Descarta la opción que no se pueda justificar con los datos o con el procedimiento de la lección.',
        },
      };
    }

    return {
      nombreProfesor,
      tituloProfesor,
      avatarProfesor,
      estadoProfesor: 'Orientando el reto de aprendizaje activo',
      guionVoz: `Tu reto es: "${leccion.retoPbl.titulo}". ${leccion.retoPbl.descripcion}`,
      companero: {
        ...companero,
        pregunta: '¿El entregable debe incluir la explicación del proceso o solo el resultado final?',
        respuestaProfesor: esTeologia
          ? 'Incluye el proceso de estudio, las fuentes consultadas y una aplicación personal honesta.'
          : 'Incluye el proceso, las fuentes consultadas y una verificación de tu resultado. El razonamiento es tan importante como la respuesta.',
      },
    };
  }
}

export const curriculumContentEngine = new CurriculumContentEngine();
