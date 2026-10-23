/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Motor de Prompts y Schemas Pedagógicos
 * ARCHIVO: src/lib/pdf/study-guide-prompts.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Especificación formal del Prompt de Sistema, Schema JSON y Validador Instruccional
 * para la generación automatizada de Guías de Estudio en PDF con alta profundidad
 * académica, cumpliendo estrictamente con el estándar de 5 secciones obligatorias:
 *
 * 1. Introducción y Objetivo (¿Qué aprenderá y para qué sirve en la práctica?).
 * 2. Desarrollo Conceptual Completo (Teoría exhaustiva sin asumir conocimientos previos).
 * 3. Guía Paso a Paso (Algoritmo secuencial lógico y consejos profesionales).
 * 4. Ejemplos Prácticos Resueltos (Casos concretos detallados y comprobados).
 * 5. Puntos Clave / Resumen (Síntesis de repaso rápido).
 * ==============================================================================
 */

import { GuiaPedagogicaContenido } from '@/services/curriculumAuditorAndFiller';

/**
 * Parámetros de entrada para solicitar la generación de una guía de estudio a la IA.
 */
export interface ParametrosGeneracionGuia {
  estudiante: string;
  edad: number;
  grado: string; // e.g. "4° EGB (Básica Elemental)" o "8° EGB (Básica Superior)"
  materia: string;
  temaDelDia: string;
  codigoMineduc: string;
  diaLectivo: number;
  libroTextoReferencia?: string;
  /**
   * Determina el tratamiento epistemológico. Solo TEOLOGIA admite contenido
   * confesional; ACADEMICA exige neutralidad y método científico.
   */
  areaEpistemologica?: 'TEOLOGIA' | 'ACADEMICA';
}

/**
 * PROMPT DE SISTEMA: DISEÑADOR INSTRUCCIONAL SENIOR Y CATEDRÁTICO
 * Diseñado para forzar profundidad académica, rigor expositivo y autonomía total
 * en modelos LLM (Google Gemini 2.0/3.8 Flash, Claude 3.5 Sonnet, GPT-4o).
 */
export const PROMPT_SISTEMA_DISENADOR_INSTRUCCIONAL = `
ERES UN ARQUITECTO DE CONTENIDO EDUCATIVO, CATEDRÁTICO UNIVERSITARIO Y DISEÑADOR INSTRUCCIONAL SENIOR EN WISDOM ACADEMY.

TU MISIÓN:
Generar una GUÍA DE ESTUDIO OFICIAL AUTÓNOMA, RIGUROSA Y DE ALTA CALIDAD ACADÉMICA para imprimir en PDF.

⚠️ REGLA DE ORO CONTRA CONTENIDO SUPERFICIAL:
La guía NO ES una bitácora de clase, NI un diario de actividades, NI un resumen escolar genérico.
- PROHIBIDO usar frases como "Hoy en clase vimos...", "El profesor explicó...", "Vimos un video sobre...".
- DEBE SER un texto didáctico completo, autosuficiente y exhaustivo, redactado con elegancia académica y pedagogía socrática.
- Un estudiante que nunca asistió a la clase presencial debe ser capaz de DOMINAR EL TEMA AL 100% leyendo únicamente esta guía.

ESTRUCTURA OBLIGATORIA (DEBES GENERAR EXACTAMENTE ESTAS 5 SECCIONES EN EL FORMATO JSON SOLICITADO):

1. INTRODUCCIÓN Y OBJETIVO:
   - "queAprenderas": Explicación diáfana de los conceptos, leyes o fenómenos que se estudiarán.
   - "paraQueSirvePractica": Aplicabilidad directa en la vida real, ciencia, tecnología o resolución de problemas cotidianos.
   - "objetivoOperativo": Meta pedagógica redactada con verbos de la Taxonomía de Bloom (e.g. Analizar, Formular, Deducir, Calcular, Sintetizar).

2. DESARROLLO CONCEPTUAL COMPLETO:
   - "marcoTeorico": Explicación profunda y detallada de la teoría. NO asumas que el estudiante ya lo sabe. Desglosa los axiomas, leyes o reglas subyacentes con precisión y claridad conceptual.
   - "conceptosClave": Mínimo 3 definiciones formales de términos técnicos esenciales.
   - "fundamentoProfundo": Explicación del marco epistemológico de la disciplina, sus criterios de evidencia y el valor del conocimiento riguroso. No introduzcas contenido confesional en asignaturas académicas.

3. GUÍA PASO A PASO:
   - Mínimo 4 pasos secuenciales y lógicos que expliquen el método o algoritmo para resolver problemas o redactar análisis del tema.
   - Cada paso debe incluir un "consejoPro" (alerta de error frecuente o técnica de verificación).

4. EJEMPLOS PRÁCTICOS RESUELTOS:
   - Mínimo 1 caso concreto completo (para Básica Elemental: problema cotidiano numérico/textual; para Básica Superior: modelado algebraico/científico o análisis argumentativo).
   - Debe incluir: planteamiento explícito, desglose paso a paso de la resolución (sin saltarse pasos intermedios) y comprobación final explicada.

5. PUNTOS CLAVE / RESUMEN:
   - Mínimo 4 viñetas de síntesis de alto impacto (takeaways) diseñadas para repaso mental rápido y consolidación nemotécnica.

ADAPTACIÓN POR NIVEL:
- Para Básica Elemental (4° EGB - 8 a 9 años): Lenguaje accesible, analogías visuales vívidas, precisión numérica y calidez pedagógica formativa.
- Para Básica Superior (8° EGB - 12 a 14 años): Rigor formal, vocabulario disciplinar preciso, formalización matemática/simbólica y argumentación lógica libre de falacias.
`.trim();

/**
 * Construye el prompt de usuario con las variables específicas de la lección y el esquema JSON exacto.
 */
export function construirPromptUsuarioGuia(params: ParametrosGeneracionGuia): string {
  return `
${params.areaEpistemologica === 'TEOLOGIA'
  ? 'Esta es la asignatura confesional Relación con Dios. Desarrolla el contenido bíblico y teológico con profundidad, fidelidad exegética y aplicación pastoral.'
  : 'Esta es una asignatura académica. Mantén un enfoque neutral, objetivo y basado en evidencia. No incluyas versículos, exhortaciones religiosas ni referencias confesionales.'}

Por favor, genera la Guía de Estudio Oficial para la siguiente jornada académica:

DATOS DE LA LECCIÓN:
- Estudiante: ${params.estudiante} (${params.edad} años)
- Nivel Académico: ${params.grado}
- Asignatura: ${params.materia} [Código MINEDUC: ${params.codigoMineduc}]
- Día Lectivo: Día ${params.diaLectivo} de 200
- Tema del Día: ${params.temaDelDia}
${params.libroTextoReferencia ? `- Libro de Referencia: ${params.libroTextoReferencia}` : ''}

RESPONDE EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO (sin bloques markdown de código envolventes ni texto conversacional) con esta estructura:

{
  "introduccionYObjetivo": {
    "queAprenderas": "string detallado",
    "paraQueSirvePractica": "string detallado",
    "objetivoOperativo": "string de meta observable"
  },
  "desarrolloConceptual": {
    "marcoTeorico": "string con explicación teórica profunda, completa y exhaustiva",
    "conceptosClave": [
      { "termino": "Término 1", "definicion": "Definición formal y clara" },
      { "termino": "Término 2", "definicion": "Definición formal y clara" },
      { "termino": "Término 3", "definicion": "Definición formal y clara" }
    ],
    "fundamentoProfundo": "string con el marco epistemológico, los criterios de evidencia y el valor del conocimiento riguroso"
  },
  "guiaPasoAPaso": [
    {
      "pasoNumero": 1,
      "titulo": "Título del Paso",
      "instruccionDetallada": "Instrucción minuciosa del procedimiento",
      "consejoPro": "Consejo técnico para evitar errores comunes"
    }
  ],
  "ejemplosResueltos": [
    {
      "tituloCaso": "Caso de Aplicación Concreto",
      "planteamiento": "Enunciado del problema o pregunta",
      "desarrolloPasoAPaso": [
        "Paso 1: ...",
        "Paso 2: ...",
        "Paso 3: ..."
      ],
      "resultadoExplicado": "Explicación de la solución y comprobación"
    }
  ],
  "puntosClaveResumen": [
    "Punto clave 1...",
    "Punto clave 2...",
    "Punto clave 3...",
    "Punto clave 4..."
  ]
}
`.trim();
}

/**
 * Validador de calidad pedagógica para asegurar que la respuesta de la IA no sea un simple resumen.
 */
export function validarCalidadPedagogicaGuia(contenido: Partial<GuiaPedagogicaContenido>): {
  valido: boolean;
  errores: string[];
} {
  const errores: string[] = [];

  // Validación 1: Introducción y objetivo
  if (!contenido.introduccionYObjetivo?.queAprenderas || contenido.introduccionYObjetivo.queAprenderas.length < 30) {
    errores.push('La sección 1 (Introducción: queAprenderas) es demasiado breve o está vacía.');
  }
  if (!contenido.introduccionYObjetivo?.paraQueSirvePractica || contenido.introduccionYObjetivo.paraQueSirvePractica.length < 30) {
    errores.push('La sección 1 (paraQueSirvePractica) carece de profundidad contextual.');
  }

  // Validación 2: Desarrollo conceptual
  if (!contenido.desarrolloConceptual?.marcoTeorico || contenido.desarrolloConceptual.marcoTeorico.length < 100) {
    errores.push('La sección 2 (Desarrollo Conceptual: marcoTeorico) no cumple con el estándar de profundidad mínima (100 caracteres).');
  }
  if (!contenido.desarrolloConceptual?.conceptosClave || contenido.desarrolloConceptual.conceptosClave.length < 2) {
    errores.push('La sección 2 debe contener al menos 2 conceptos clave definidos.');
  }

  // Validación 3: Guía paso a paso
  if (!contenido.guiaPasoAPaso || contenido.guiaPasoAPaso.length < 3) {
    errores.push('La sección 3 (Guía Paso a Paso) debe contener un mínimo de 3 pasos metodológicos secuenciales.');
  }

  // Validación 4: Ejemplos prácticos resueltos
  if (!contenido.ejemplosResueltos || contenido.ejemplosResueltos.length < 1) {
    errores.push('La sección 4 (Ejemplos Resueltos) debe contener al menos 1 ejemplo completamente desarrollado.');
  } else {
    const primerEjemplo = contenido.ejemplosResueltos[0];
    if (!primerEjemplo.desarrolloPasoAPaso || primerEjemplo.desarrolloPasoAPaso.length < 2) {
      errores.push('El ejemplo práctico de la sección 4 debe incluir un desarrollo paso a paso explícito.');
    }
  }

  // Validación 5: Puntos clave / Resumen
  if (!contenido.puntosClaveResumen || contenido.puntosClaveResumen.length < 3) {
    errores.push('La sección 5 (Puntos Clave / Resumen) debe contener al menos 3 viñetas de síntesis rápida.');
  }

  return {
    valido: errores.length === 0,
    errores,
  };
}

