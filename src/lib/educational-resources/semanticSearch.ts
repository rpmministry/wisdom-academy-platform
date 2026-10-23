/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Motor de Búsqueda Semántica Curricular
 * ARCHIVO: src/lib/educational-resources/semanticSearch.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Sustituye la búsqueda basada únicamente en el título de la materia por un
 * perfil semántico de la lección. El motor:
 * 1. Analiza el tema, subtema, conceptos, objetivos y el contenido textual de
 *    la diapositiva/material educativo.
 * 2. Extrae términos ponderados y frases clave del tema puntual.
 * 3. Compara esos elementos con título, descripción, canal y temas curados de
 *    cada video, usando cobertura ponderada, sinónimos controlados y
 *    coincidencia de frases completas.
 * 4. Genera varias consultas específicas para el proveedor, priorizando la
 *    lección sobre la asignatura.
 *
 * El motor es determinista, no depende de servicios externos y no inventa
 * evidencia: solo calcula similitud entre el material real de la clase y los
 * metadatos disponibles del video.
 * ==============================================================================
 */

import type { CandidatoVideo, ContextoAcademico } from '@/types/educationalResources';
import {
  extraerTituloDesdeContenido,
  normalizarComparacion,
  sanitizarTexto,
  tokenizarSecuencia,
} from './text';

/**
 * Términos que describen el envoltorio pedagógico, no el tema. Se excluyen del
 * núcleo semántico para que "clase", "video" o "primaria" no hagan parecer
 * pertinente un video que no explica el contenido de la lección.
 */
const TERMINOS_GENERICOS = new Set<string>([
  'asignatura', 'area', 'curso', 'grado', 'nivel', 'clase', 'clases', 'leccion',
  'unidad', 'tema', 'contenido', 'material', 'diapositiva', 'fase', 'video',
  'videos', 'educativo', 'educativa', 'explicacion', 'explicar', 'aprender',
  'aprende', 'paso', 'pasos', 'primaria', 'secundaria', 'bachillerato',
  'colegio', 'escuela', 'profesor', 'profesora', 'docente', 'estudiante',
  'alumno', 'alumna', 'nino', 'nina', 'ninos', 'ninas', 'ejemplo', 'ejemplos',
  'ejercicio', 'ejercicios', 'actividad', 'actividades', 'matematicas',
  'lengua', 'literatura', 'ciencias', 'ingles', 'english', 'sociales',
  'estudios',
]);

/**
 * Expansión semántica conservadora. Las claves son raíces normalizadas y los
 * valores son raíces equivalentes o variantes de uso frecuente en el aula.
 * No se usa como prueba de pertinencia: solo permite reconocer la misma idea
 * expresada con otro término (por ejemplo, "recta" y "línea" numérica).
 */
const SINONIMOS: Record<string, string[]> = {
  fraccion: ['quebrado', 'quebrada'],
  equivalente: ['equivalencia', 'igual', 'igualdad'],
  comparar: ['comparacion', 'compara', 'contrastar', 'ordenar', 'orden'],
  comparacion: ['comparar', 'contrastar', 'ordenar', 'orden'],
  denominador: ['divisor'],
  numerador: ['dividendo'],
  recta: ['linea'],
  linea: ['recta'],
  numerico: ['numero', 'numerica'],
  numerica: ['numero', 'numerico'],
  numero: ['numerico', 'numerica', 'cantidad'],
  entero: ['integro', 'integral'],
  valor: ['valores'],
  absoluto: ['absoluta'],
  distancia: ['lejania', 'separacion'],
  suma: ['sumar', 'adicion', 'agregar'],
  adicion: ['suma', 'sumar'],
  resta: ['restar', 'sustraccion', 'sustraer', 'quitar'],
  sustraccion: ['resta', 'restar'],
  multiplicacion: ['multiplicar', 'producto'],
  producto: ['multiplicacion', 'multiplicar'],
  division: ['dividir', 'cociente'],
  cociente: ['division', 'dividir'],
  area: ['superficie'],
  superficie: ['area'],
  perimetro: ['contorno'],
  contorno: ['perimetro'],
  sustantivo: ['nombre', 'nombres'],
  verbo: ['verbos', 'accion'],
  oracion: ['frase', 'enunciado'],
  enunciado: ['oracion', 'frase'],
  parrafo: ['texto'],
  lectura: ['leer', 'comprension'],
  comprension: ['entender', 'lectura'],
  escritura: ['escribir', 'redaccion'],
  redaccion: ['escribir', 'escritura'],
  mitosi: ['division'],
  ecosistema: ['ambiente'],
  sustancia: ['materia'],
  materia: ['sustancia'],
  energia: ['energetico'],
  fuerza: ['energia'],
  movimiento: ['desplazamiento'],
  celula: ['celular'],
  atomo: ['atomico'],
  molecula: ['molecular'],
  democracia: ['democratico'],
  constitucion: ['constitucional'],
  mapa: ['cartografia'],
  clima: ['climatico'],
};

/** Origen de una frase clave; permite explicar la evidencia al estudiante. */
export type OrigenFraseClave =
  | 'tema'
  | 'unidad'
  | 'diapositiva'
  | 'subtema'
  | 'concepto'
  | 'objetivo'
  | 'material';

export interface FraseClaveSemantica {
  /** Texto legible de la frase. */
  texto: string;
  /** Secuencia de raíces usada para reconocerla en los metadatos. */
  raices: string[];
  /** Peso relativo dentro de la lección. */
  peso: number;
  origen: OrigenFraseClave;
}

export interface PerfilSemanticoLeccion {
  tema: string;
  temaNormalizado: string;
  tituloDiapositiva: string;
  /** Términos del título del tema, usados para la cobertura principal. */
  tokensTema: Map<string, number>;
  /** Términos del subtema, conceptos y título de la diapositiva. */
  tokensConcepto: Map<string, number>;
  /** Términos del contenido textual y los objetivos. */
  tokensContenido: Map<string, number>;
  /** Unión de tema y concepto; define la coincidencia nuclear. */
  tokensNucleo: Map<string, number>;
  frasesClave: FraseClaveSemantica[];
  terminosGenericos: Set<string>;
}

export interface TextoVideoAnalizable {
  titulo: string;
  descripcion?: string;
  canal?: string;
  /** Temas declarados por el catálogo curado. */
  temas?: string[];
}

export interface CoincidenciaSemantica {
  /** Cobertura de los términos del tema en el título y temas curados. */
  coberturaTitulo: number;
  /** Cobertura de los términos del tema en título + descripción + canal. */
  coberturaTema: number;
  /** Cobertura de subtema, conceptos y título de diapositiva. */
  coberturaConcepto: number;
  /** Cobertura de objetivos y contenido textual del material. */
  coberturaContenido: number;
  /** Cobertura conjunta de tema + concepto. */
  coberturaNucleo: number;
  /** Proporción ponderada de frases clave encontradas. */
  coberturaFrases: number;
  /** El tema completo aparece literalmente en los metadatos. */
  fraseTemaExacta: boolean;
  /** Existe evidencia suficiente de que el video trata el tema puntual. */
  coincidenciaNucleo: boolean;
  /** Solo coinciden asignatura, nivel o palabras pedagógicas genéricas. */
  soloCoincideAsignatura: boolean;
  frasesCoincidentes: string[];
  terminosCoincidentes: string[];
  /** Puntuación semántica de 0 a 100, útil para ordenar candidatos. */
  puntuacion: number;
}

export interface ConsultaBusquedaSemantica {
  consulta: string;
  enfoque: 'leccion' | 'palabras_clave' | 'unidad';
}

/** Reduce una palabra a una raíz estable para comparar plurales y variantes. */
export function raizSemantica(token: string): string {
  let raiz = token;
  if (raiz.length > 5 && raiz.endsWith('ciones')) {
    raiz = `${raiz.slice(0, -6)}cion`;
  } else if (raiz.length > 4 && raiz.endsWith('es')) {
    raiz = raiz.slice(0, -2);
  } else if (raiz.length > 3 && raiz.endsWith('s')) {
    raiz = raiz.slice(0, -1);
  }
  if (raiz.length > 6 && raiz.endsWith('mente')) {
    raiz = raiz.slice(0, -6);
  }
  return raiz;
}

function esTerminoGenerico(raiz: string, genericos: Set<string>): boolean {
  return genericos.has(raiz) || TERMINOS_GENERICOS.has(raiz);
}

function sumarTokens(
  mapa: Map<string, number>,
  texto: string,
  peso: number,
  genericos: Set<string>
): void {
  for (const token of tokenizarSecuencia(texto)) {
    const raiz = raizSemantica(token);
    if (raiz.length < 3 || esTerminoGenerico(raiz, genericos)) continue;
    mapa.set(raiz, Math.max(mapa.get(raiz) || 0, peso));
  }
}

function sumarGenericos(destino: Set<string>, texto: string): void {
  for (const token of tokenizarSecuencia(texto)) {
    destino.add(raizSemantica(token));
  }
}

/** Divide un texto en frases cortas para extraer conceptos reutilizables. */
function dividirEnunciados(texto: string): string[] {
  return sanitizarTexto(texto, 800)
    .split(/[.;:\n]+/)
    .map((parte) => parte.trim())
    .filter((parte) => parte.length >= 8);
}

/** Indica si un texto comparte al menos una raíz con el conjunto dado. */
function comparteAlguno(texto: string, raices: Set<string>): boolean {
  if (raices.size === 0) return false;
  return tokenizarSecuencia(texto).some((token) =>
    coincideRaizConConjunto(raizSemantica(token), raices)
  );
}

/**
 * Conserva solo las oraciones que comparten algún término con el núcleo del
 * tema. El material de una unidad puede repasar varios contenidos; sin este
 * filtro, frases ajenas diluirían la búsqueda y volveríamos a un promedio
 * genérico de la materia.
 */
function filtrarOracionesRelevantes(
  texto: string,
  raicesNucleo: Set<string>
): string[] {
  return dividirEnunciados(texto).filter((oracion) =>
    comparteAlguno(oracion, raicesNucleo)
  );
}

/**
 * Extrae n-gramas frecuentes del material. No pretende sustituir un modelo de
 * lenguaje: identifica expresiones que se repiten en el contenido real de la
 * lección y que suelen aparecer en el título de un video educativo.
 */
function extraerFrasesDelMaterial(texto: string, limite = 6): string[] {
  const frecuencia = new Map<string, number>();
  for (const oracion of dividirEnunciados(texto)) {
    const tokens = tokenizarSecuencia(oracion);
    for (let tamano = 2; tamano <= 4; tamano += 1) {
      for (let inicio = 0; inicio + tamano <= tokens.length; inicio += 1) {
        const gramo = tokens.slice(inicio, inicio + tamano);
        const frase = gramo.join(' ');
        if (frase.length < 8) continue;
        frecuencia.set(frase, (frecuencia.get(frase) || 0) + 1);
      }
    }
  }
  return Array.from(frecuencia.entries())
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([frase]) => frase)
    .slice(0, limite);
}

function agregarFrase(
  frases: Map<string, FraseClaveSemantica>,
  texto: string,
  peso: number,
  origen: OrigenFraseClave,
  genericos: Set<string>
): void {
  const legible = sanitizarTexto(texto, 160);
  if (!legible) return;
  const tokens = tokenizarSecuencia(legible);
  if (tokens.length < 2 || tokens.length > 8) return;
  const raices = tokens.map(raizSemantica);
  if (raices.every((raiz) => esTerminoGenerico(raiz, genericos))) return;

  const clave = raices.join(' ');
  const previa = frases.get(clave);
  if (previa && previa.peso >= peso) return;
  frases.set(clave, { texto: legible, raices, peso, origen });
}

/**
 * Construye el perfil semántico de la lección usando todo el material
 * disponible. Es la pieza que reemplaza la búsqueda por el título de materia.
 */
export function construirPerfilSemantico(
  contexto: ContextoAcademico
): PerfilSemanticoLeccion {
  const tema = sanitizarTexto(contexto.tema || contexto.unidad, 200);
  const unidad = sanitizarTexto(contexto.unidad, 200);
  const subtema = sanitizarTexto(contexto.subtema, 180);
  const contenido = sanitizarTexto(contexto.contenidoDiapositiva, 800);
  const tituloDiapositiva = extraerTituloDesdeContenido(contenido);
  const conceptos = (contexto.conceptos || [])
    .map((concepto) => sanitizarTexto(concepto, 160))
    .filter(Boolean);
  const objetivos = (contexto.objetivos || [])
    .map((objetivo) => sanitizarTexto(objetivo, 240))
    .filter(Boolean);

  const genericos = new Set<string>();
  sumarGenericos(
    genericos,
    `${contexto.asignatura} ${contexto.area || ''} ${contexto.curso} ${
      contexto.nivel
    }`
  );
  for (const termino of TERMINOS_GENERICOS) genericos.add(termino);

  const tokensTema = new Map<string, number>();
  sumarTokens(tokensTema, tema, 5, genericos);
  if (tokensTema.size === 0) {
    sumarTokens(tokensTema, unidad, 5, genericos);
  }
  const raicesTema = new Set(tokensTema.keys());

  // El título de la diapositiva y el subtema solo se usan si están conectados
  // con el tema. En unidades que repasan varios contenidos, esto evita que una
  // frase de otra lección se cuele como si fuera el tema puntual.
  const tituloRelevante =
    tituloDiapositiva && comparteAlguno(tituloDiapositiva, raicesTema)
      ? tituloDiapositiva
      : '';

  const raicesSubtema = new Set(
    tokenizarSecuencia(subtema).map(raizSemantica)
  );
  const subtemaRelevante =
    subtema && (raicesTema.size === 0 || comparteAlguno(subtema, raicesTema))
      ? subtema
      : '';

  const tokensConcepto = new Map<string, number>();
  if (tituloRelevante) {
    sumarTokens(tokensConcepto, tituloRelevante, 3.5, genericos);
  }
  if (subtemaRelevante) {
    sumarTokens(tokensConcepto, subtemaRelevante, 3, genericos);
  }
  const conceptosRelevantes = conceptos.filter(
    (concepto) =>
      comparteAlguno(concepto, raicesTema) ||
      comparteAlguno(concepto, raicesSubtema)
  );
  for (const concepto of conceptosRelevantes) {
    sumarTokens(tokensConcepto, concepto, 2.5, genericos);
  }

  const tokensNucleo = new Map<string, number>(tokensTema);
  for (const [raiz, peso] of tokensConcepto) {
    tokensNucleo.set(raiz, Math.max(tokensNucleo.get(raiz) || 0, peso));
  }
  const raicesNucleo = new Set(tokensNucleo.keys());

  // Del material completo solo se analizan las oraciones que tratan el tema
  // puntual. Los objetivos también se filtran: un objetivo general del grado
  // no debe diluir la búsqueda de esta clase.
  const oracionesRelevantes = filtrarOracionesRelevantes(contenido, raicesNucleo);
  const contenidoRelevante = oracionesRelevantes.join('. ');
  const objetivosRelevantes = objetivos.filter((objetivo) =>
    comparteAlguno(objetivo, raicesNucleo)
  );

  const tokensContenido = new Map<string, number>();
  if (contenidoRelevante) {
    sumarTokens(tokensContenido, contenidoRelevante, 1, genericos);
  }
  for (const objetivo of objetivosRelevantes) {
    sumarTokens(tokensContenido, objetivo, 1.5, genericos);
  }

  const frases = new Map<string, FraseClaveSemantica>();
  agregarFrase(frases, tema, 3.2, 'tema', genericos);
  if (unidad && (raicesTema.size === 0 || comparteAlguno(unidad, raicesTema))) {
    agregarFrase(frases, unidad, 1.4, 'unidad', genericos);
  }
  if (tituloRelevante) {
    agregarFrase(frases, tituloRelevante, 2.6, 'diapositiva', genericos);
  }
  if (subtemaRelevante) {
    for (const enunciado of dividirEnunciados(subtemaRelevante)) {
      agregarFrase(frases, enunciado, 2.2, 'subtema', genericos);
    }
  }
  for (const concepto of conceptosRelevantes) {
    agregarFrase(frases, concepto, 2, 'concepto', genericos);
  }
  for (const objetivo of objetivosRelevantes) {
    for (const enunciado of dividirEnunciados(objetivo)) {
      agregarFrase(frases, enunciado, 1.1, 'objetivo', genericos);
    }
  }
  for (const frase of extraerFrasesDelMaterial(contenidoRelevante)) {
    agregarFrase(frases, frase, 0.9, 'material', genericos);
  }

  return {
    tema,
    temaNormalizado: normalizarComparacion(tema),
    tituloDiapositiva: tituloRelevante,
    tokensTema,
    tokensConcepto,
    tokensContenido,
    tokensNucleo,
    frasesClave: Array.from(frases.values()).slice(0, 12),
    terminosGenericos: genericos,
  };
}

function variantesDeRaiz(raiz: string): string[] {
  const variantes = SINONIMOS[raiz] || [];
  return variantes.map((variante) => raizSemantica(variante));
}

function coincideRaizConConjunto(raiz: string, conjunto: Set<string>): boolean {
  if (conjunto.has(raiz)) return true;
  return variantesDeRaiz(raiz).some((variante) => conjunto.has(variante));
}

function coincideRaizConToken(raiz: string, token: string): boolean {
  if (raiz === token) return true;
  return variantesDeRaiz(raiz).some((variante) => variante === token);
}

function coberturaPonderada(
  pesos: Map<string, number>,
  encontrados: Set<string>
): number {
  let total = 0;
  let cubierto = 0;
  for (const [raiz, peso] of pesos) {
    total += peso;
    if (coincideRaizConConjunto(raiz, encontrados)) cubierto += peso;
  }
  return total > 0 ? cubierto / total : 0;
}

function coincideFrase(raices: string[], secuencia: string[]): boolean {
  if (raices.length === 0 || secuencia.length < raices.length) return false;
  for (let inicio = 0; inicio + raices.length <= secuencia.length; inicio += 1) {
    let coincide = true;
    for (let indice = 0; indice < raices.length; indice += 1) {
      if (!coincideRaizConToken(raices[indice], secuencia[inicio + indice])) {
        coincide = false;
        break;
      }
    }
    if (coincide) return true;
  }
  return false;
}

function raicesDe(texto: string): string[] {
  return tokenizarSecuencia(texto).map(raizSemantica);
}

/**
 * Compara los metadatos de un video con el perfil semántico de la lección.
 * No evalúa el contenido audiovisual completo; la interfaz declara esa
 * limitación. La coincidencia se apoya en título, descripción, canal y temas
 * curados, pero exige que el tema puntual esté presente, no solo la materia.
 */
export function evaluarCoincidenciaSemantica(
  video: TextoVideoAnalizable | CandidatoVideo,
  perfil: PerfilSemanticoLeccion
): CoincidenciaSemantica {
  const temasCurados =
    'curado' in video && video.curado?.temas
      ? video.curado.temas
      : 'temas' in video && Array.isArray(video.temas)
      ? video.temas
      : [];
  const tituloTexto = [video.titulo || '', ...temasCurados].filter(Boolean).join(' ');
  const textoCompleto = [
    tituloTexto,
    video.descripcion || '',
    video.canal || '',
  ]
    .filter(Boolean)
    .join(' ');

  const raicesTitulo = new Set(raicesDe(tituloTexto));
  const secuenciaCompleta = raicesDe(textoCompleto);
  const raicesCompleto = new Set(secuenciaCompleta);

  const coberturaTitulo = coberturaPonderada(perfil.tokensTema, raicesTitulo);
  const coberturaTema = coberturaPonderada(perfil.tokensTema, raicesCompleto);
  const coberturaConcepto = coberturaPonderada(
    perfil.tokensConcepto,
    raicesCompleto
  );
  const coberturaContenido = coberturaPonderada(
    perfil.tokensContenido,
    raicesCompleto
  );
  const coberturaNucleo = coberturaPonderada(perfil.tokensNucleo, raicesCompleto);

  let pesoFrases = 0;
  let pesoFrasesCubierto = 0;
  const frasesCoincidentes: string[] = [];
  for (const frase of perfil.frasesClave) {
    pesoFrases += frase.peso;
    const exacta = coincideFrase(frase.raices, secuenciaCompleta);
    if (exacta) {
      pesoFrasesCubierto += frase.peso;
      frasesCoincidentes.push(frase.texto);
      continue;
    }
    // Una frase puede aparecer con otro orden o con palabras intermedias.
    // Si casi todos sus términos están presentes, se reconoce como evidencia
    // parcial en lugar de descartarla por no ser una cadena literal.
    const cubiertos = frase.raices.filter((raiz) =>
      coincideRaizConConjunto(raiz, raicesCompleto)
    ).length;
    if (frase.raices.length > 0 && cubiertos / frase.raices.length >= 0.8) {
      pesoFrasesCubierto += frase.peso * 0.65;
    }
  }
  const coberturaFrases = pesoFrases > 0 ? pesoFrasesCubierto / pesoFrases : 0;

  const textoNormalizado = normalizarComparacion(textoCompleto);
  const fraseTemaExacta =
    perfil.temaNormalizado.length >= 6 &&
    textoNormalizado.includes(perfil.temaNormalizado);

  const terminosCoincidentes: string[] = [];
  for (const raiz of perfil.tokensNucleo.keys()) {
    if (coincideRaizConConjunto(raiz, raicesCompleto)) {
      terminosCoincidentes.push(raiz);
    }
  }

  const coincidenciaNucleo =
    fraseTemaExacta ||
    coberturaNucleo >= 0.45 ||
    (coberturaTema >= 0.75 && coberturaConcepto >= 0.2);

  const soloCoincideAsignatura =
    !coincidenciaNucleo &&
    Array.from(perfil.terminosGenericos).some((termino) =>
      raicesCompleto.has(termino)
    );

  const puntuacion = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        100 *
          (0.25 * coberturaTitulo +
            0.25 * coberturaTema +
            0.15 * coberturaConcepto +
            0.1 * coberturaContenido +
            0.15 * coberturaFrases) +
          (fraseTemaExacta ? 10 : 0)
      )
    )
  );

  return {
    coberturaTitulo,
    coberturaTema,
    coberturaConcepto,
    coberturaContenido,
    coberturaNucleo,
    coberturaFrases,
    fraseTemaExacta,
    coincidenciaNucleo,
    soloCoincideAsignatura,
    frasesCoincidentes,
    terminosCoincidentes,
    puntuacion,
  };
}

/** Etiqueta de nivel usada en consultas en español. */
function etiquetaNivel(contexto: ContextoAcademico): string {
  const nivel = normalizarComparacion(`${contexto.nivel} ${contexto.curso}`);
  if (contexto.edad <= 10 || nivel.includes('elemental') || nivel.includes('media')) {
    return 'primaria';
  }
  if (nivel.includes('superior') || contexto.edad <= 15) return 'secundaria';
  if (nivel.includes('bachillerato') || contexto.edad >= 16) return 'bachillerato';
  return '';
}

/** Etiqueta de nivel usada en consultas en inglés. */
function etiquetaNivelIngles(contexto: ContextoAcademico): string {
  if (contexto.edad <= 10) return 'elementary school';
  if (contexto.edad <= 15) return 'middle school';
  return 'high school';
}

function recortarConsulta(partes: string[], maximo = 200): string {
  const unicas: string[] = [];
  const normalizadas: string[] = [];
  const vistos = new Set<string>();

  for (const parte of partes) {
    const limpio = sanitizarTexto(parte, 120);
    if (!limpio) continue;
    const normalizado = normalizarComparacion(limpio);
    if (!normalizado || vistos.has(normalizado)) continue;
    if (
      normalizadas.some(
        (existente) =>
          existente.includes(normalizado) || normalizado.includes(existente)
      )
    ) {
      continue;
    }
    const candidato = [...unicas, limpio].join(' ');
    if (candidato.length > maximo) continue;
    vistos.add(normalizado);
    normalizadas.push(normalizado);
    unicas.push(limpio);
  }

  return unicas.join(' ').slice(0, maximo);
}

/**
 * Genera consultas específicas. La primera prioriza el tema puntual y las
 * frases del material; la segunda usa palabras clave; la tercera conserva una
 * consulta de unidad como respaldo. La asignatura queda siempre al final para
 * que no domine la búsqueda.
 */
export function construirConsultasBusquedaSemantica(
  contexto: ContextoAcademico
): ConsultaBusquedaSemantica[] {
  const perfil = construirPerfilSemantico(contexto);
  const tema = sanitizarTexto(contexto.tema || contexto.unidad, 120);
  const unidad = sanitizarTexto(contexto.unidad, 120);
  const curso = sanitizarTexto(contexto.curso.split('(')[0], 40);
  const asignatura = sanitizarTexto(contexto.asignatura, 80);
  const nivel =
    contexto.idioma === 'en'
      ? etiquetaNivelIngles(contexto)
      : etiquetaNivel(contexto);
  const sufijo =
    contexto.idioma === 'en' ? 'explained step by step' : 'explicación paso a paso';
  const idioma = contexto.idioma === 'en' ? 'English' : 'español';

  const frasesEspecificas = perfil.frasesClave
    .filter((frase) => frase.origen === 'diapositiva' || frase.origen === 'subtema')
    .slice(0, 2)
    .map((frase) => frase.texto);

  const consultaLeccion = recortarConsulta([
    tema,
    unidad,
    ...frasesEspecificas,
    sufijo,
    curso,
    nivel,
    idioma,
    asignatura,
  ]);

  const palabrasClave = Array.from(perfil.tokensNucleo.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([raiz]) => raiz);

  const consultaPalabras = recortarConsulta([
    tema,
    palabrasClave.join(' '),
    sufijo,
    curso,
    idioma,
    asignatura,
  ]);

  const consultaUnidad = recortarConsulta([
    unidad || tema,
    sufijo,
    curso,
    nivel,
    idioma,
    asignatura,
  ]);

  const consultas: ConsultaBusquedaSemantica[] = [];
  const vistos = new Set<string>();
  for (const [enfoque, consulta] of [
    ['leccion', consultaLeccion],
    ['palabras_clave', consultaPalabras],
    ['unidad', consultaUnidad],
  ] as Array<[ConsultaBusquedaSemantica['enfoque'], string]>) {
    const normalizada = normalizarComparacion(consulta);
    if (!normalizada || vistos.has(normalizada)) continue;
    vistos.add(normalizada);
    consultas.push({ consulta, enfoque });
  }
  return consultas;
}
