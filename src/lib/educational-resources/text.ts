/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Utilidades de Texto y YouTube
 * ARCHIVO: src/lib/educational-resources/text.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Centraliza funciones puras y reutilizables en cliente y servidor para:
 * 1. Construir consultas contextualizadas en español/inglés.
 * 2. Normalizar y comparar títulos, objetivos y conceptos curriculares.
 * 3. Extraer y validar identificadores de YouTube sin confiar en URLs externas.
 * 4. Generar URLs oficiales de búsqueda, reproducción y miniatura.
 * 5. Producir una clave estable de caché basada en el contexto académico.
 *
 * No contiene secretos, llamadas de red ni dependencias del DOM.
 * ==============================================================================
 */

import type {
  ContextoAcademico,
  IdiomaContenido,
  RecursoVideo,
} from '@/types/educationalResources';

/**
 * Palabras vacías que no aportan significado curricular. Se excluyen del
 * cálculo de coincidencia para evitar que "para", "desde" o "clase" inflen
 * artificialmente la pertinencia de un video.
 */
const PALABRAS_VACIAS = new Set<string>([
  'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'como', 'con',
  'contra', 'cual', 'cuando', 'de', 'del', 'desde', 'donde', 'durante', 'e',
  'el', 'ella', 'ellas', 'ellos', 'en', 'entre', 'era', 'es', 'esa', 'ese',
  'eso', 'esta', 'estas', 'este', 'esto', 'estos', 'fue', 'ha', 'hacia',
  'hasta', 'hay', 'la', 'las', 'le', 'les', 'lo', 'los', 'mas', 'me', 'mi',
  'mis', 'mucho', 'muy', 'nada', 'ni', 'no', 'nos', 'o', 'otra', 'otro',
  'para', 'pero', 'poco', 'por', 'porque', 'que', 'quien', 'se', 'sin',
  'sobre', 'son', 'su', 'sus', 'te', 'tiene', 'todo', 'todos', 'tu', 'tus',
  'un', 'una', 'uno', 'unos', 'y', 'ya', 'yo',
  'the', 'and', 'for', 'from', 'with', 'that', 'this', 'these', 'those',
  'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'will',
  'would', 'can', 'could', 'should', 'into', 'about', 'your', 'you', 'our',
  'their', 'his', 'her', 'its', 'how', 'what', 'when', 'where', 'why',
  'step', 'steps', 'paso', 'pasos', 'video', 'videos', 'clase', 'clases',
  'explicacion', 'explicación', 'explicar', 'explica', 'aprender', 'aprende',
]);

/** Marcadores lingüísticos usados para una heurística conservadora. */
const MARCADORES_ESPANOL = [
  'el', 'la', 'los', 'las', 'de', 'del', 'que', 'y', 'en', 'para', 'con',
  'por', 'una', 'un', 'es', 'son', 'como', 'mas', 'pero', 'sus', 'esta',
  'este', 'estos', 'estas', 'desde', 'hasta', 'sobre', 'entre', 'cuando',
  'donde', 'porque', 'tambien', 'también', 'muy', 'sin', 'nos', 'les',
  'puede', 'pueden', 'vamos', 'hola', 'gracias', 'ejemplo', 'explicación',
  'explicacion', 'aprende', 'clase', 'primaria', 'secundaria', 'niños',
  'ninos', 'fracciones', 'matematicas', 'matemáticas',
];

const MARCADORES_INGLES = [
  'the', 'and', 'of', 'to', 'in', 'for', 'with', 'that', 'this', 'these',
  'those', 'are', 'is', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
  'will', 'would', 'can', 'could', 'should', 'from', 'about', 'your', 'you',
  'our', 'their', 'how', 'what', 'when', 'where', 'why', 'learn', 'lesson',
  'class', 'explained', 'explanation', 'fractions', 'math', 'mathematics',
  'grade', 'school', 'step', 'steps', 'example', 'examples', 'kids',
];

/**
 * Limpia un texto de control y lo recorta a un máximo razonable. Se usa en
 * entradas del cliente para evitar cargas excesivas o caracteres invisibles.
 */
export function sanitizarTexto(valor: unknown, maximo = 240): string {
  if (typeof valor !== 'string') return '';
  return valor
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximo);
}

/** Normaliza para comparaciones sin tildes, mayúsculas ni puntuación. */
export function normalizarComparacion(valor: string): string {
  return valor
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Tokeniza un texto y elimina palabras vacías y tokens demasiado cortos. */
export function tokenizar(valor: string): string[] {
  if (!valor) return [];
  return Array.from(new Set(tokenizarSecuencia(valor)));
}

/**
 * Tokeniza conservando orden y repeticiones. Es necesario para reconocer
 * frases completas ("fracciones equivalentes") sin que el deduplicado rompa
 * la secuencia.
 */
export function tokenizarSecuencia(valor: string): string[] {
  if (!valor) return [];
  return normalizarComparacion(valor)
    .split(' ')
    .filter((token) => token.length >= 3)
    .filter((token) => !PALABRAS_VACIAS.has(token));
}

/**
 * Extrae el título de la diapositiva desde el contenido educativo. El motor
 * curricular construye `contenidoDiapositiva` como "Título. Explicación...".
 * Solo se devuelve una primera frase corta y informativa; si el material no
 * tiene esa forma, se devuelve cadena vacía para no contaminar la búsqueda.
 */
export function extraerTituloDesdeContenido(
  contenido: string | undefined,
  maximo = 90
): string {
  const limpio = sanitizarTexto(contenido, 800);
  if (!limpio) return '';
  const primera = limpio.split(/[.!?]\s/)[0]?.trim() || '';
  if (!primera || primera.length > maximo) return '';
  if (tokenizarSecuencia(primera).length > 12) return '';
  return primera;
}

/** Indica si un texto contiene una frase normalizada. */
export function contieneTexto(contenedor: string, buscado: string): boolean {
  if (!buscado) return false;
  return normalizarComparacion(contenedor).includes(normalizarComparacion(buscado));
}

/**
 * Calcula la fracción de tokens del tema presentes en un texto. Los tokens
 * únicos evitan que repetir una palabra aumente la puntuación.
 */
export function calcularCobertura(tokensBuscados: string[], texto: string): number {
  if (tokensBuscados.length === 0) return 0;
  const tokensTexto = new Set(tokenizar(texto));
  const encontrados = tokensBuscados.filter((token) => tokensTexto.has(token)).length;
  return encontrados / tokensBuscados.length;
}

/**
 * Deduplica una lista de recursos conservando el de mayor puntuación. Es
 * importante cuando la búsqueda oficial devuelve el mismo video en categorías
 * distintas o cuando el catálogo curado coincide con la API.
 */
export function deduplicarRecursos(recursos: RecursoVideo[]): RecursoVideo[] {
  const mapa = new Map<string, RecursoVideo>();
  for (const recurso of recursos) {
    const previo = mapa.get(recurso.id);
    if (!previo || recurso.puntuacion > previo.puntuacion) {
      mapa.set(recurso.id, recurso);
    }
  }
  return Array.from(mapa.values());
}

/** Devuelve la etiqueta de nivel adecuada para una consulta pedagógica. */
function etiquetaNivel(contexto: ContextoAcademico): string {
  const nivel = normalizarComparacion(`${contexto.nivel} ${contexto.curso}`);
  if (contexto.edad <= 10 || nivel.includes('elemental') || nivel.includes('media')) {
    return 'primaria';
  }
  if (nivel.includes('superior') || contexto.edad <= 15) return 'secundaria';
  if (nivel.includes('bachillerato') || contexto.edad >= 16) return 'bachillerato';
  return '';
}

/** Etiqueta de nivel en inglés para la asignatura de lengua extranjera. */
function etiquetaNivelIngles(contexto: ContextoAcademico): string {
  if (contexto.edad <= 10) return 'elementary school';
  if (contexto.edad <= 15) return 'middle school';
  return 'high school';
}

/**
 * Construye una búsqueda específica, no genérica. Ejemplo:
 * "Fracciones equivalentes comparación explicación paso a paso 4° de EGB
 *  primaria español".
 */
export function construirConsultaContextual(contexto: ContextoAcademico): string {
  const tema = sanitizarTexto(contexto.tema || contexto.unidad, 120);
  const unidad = sanitizarTexto(contexto.unidad, 120);
  const subtema = sanitizarTexto(contexto.subtema, 100);
  const asignatura = sanitizarTexto(contexto.asignatura, 80);
  // El curso curricular incluye el subnivel entre paréntesis; para YouTube
  // basta la parte corta ("8.° de EGB" en lugar de "8.° de EGB (Básica...)").
  const curso = sanitizarTexto(contexto.curso.split('(')[0], 40);

  // El título de la diapositiva es el anclaje más específico del tema puntual
  // de la lección. Solo se incorpora si aporta algún término del tema; así se
  // evita convertir la consulta en una frase pedagógica genérica.
  const tituloDiapositiva = extraerTituloDesdeContenido(
    contexto.contenidoDiapositiva
  );
  const tokensTema = new Set(tokenizar(tema));
  const tituloAporta =
    tituloDiapositiva.length > 0 &&
    tokenizar(tituloDiapositiva).some((token) => tokensTema.has(token));

  // Un concepto clave puede ser una frase completa. Incluirla entera diluye
  // la búsqueda y consume el límite de 200 caracteres de YouTube, por eso se
  // usa sólo cuando es una frase corta y sin puntuación de cierre.
  const conceptoCorto =
    subtema && subtema.length <= 70 && !/[.!?]/.test(subtema) ? subtema : '';

  const partes: string[] = [];
  if (tema) partes.push(tema);
  if (unidad && !contieneTexto(tema, unidad) && !contieneTexto(unidad, tema)) {
    partes.push(unidad);
  }
  if (
    tituloAporta &&
    !contieneTexto(partes.join(' '), tituloDiapositiva) &&
    !contieneTexto(tituloDiapositiva, partes.join(' '))
  ) {
    partes.push(tituloDiapositiva);
  }
  if (conceptoCorto && !contieneTexto(partes.join(' '), conceptoCorto)) {
    partes.push(conceptoCorto);
  }

  if (contexto.idioma === 'en') {
    partes.push('explained step by step');
    if (curso) partes.push(curso);
    partes.push(etiquetaNivelIngles(contexto));
    partes.push('English');
  } else {
    partes.push('explicación paso a paso');
    if (curso) partes.push(curso);
    const nivel = etiquetaNivel(contexto);
    if (nivel) partes.push(nivel);
    partes.push('español');
  }

  // La asignatura se coloca al final para que el tema y el nivel tengan
  // prioridad si la consulta se aproxima al límite de 200 caracteres.
  if (asignatura && asignatura.length <= 40 && !contieneTexto(partes.join(' '), asignatura)) {
    partes.push(asignatura);
  }

  const unicas = Array.from(new Set(partes.map((parte) => parte.trim()).filter(Boolean)));
  return unicas.join(' ').slice(0, 200);
}

/** Construye la URL oficial de búsqueda de YouTube correctamente codificada. */
export function construirUrlBusquedaYouTube(consulta: string): string {
  const url = new URL('https://www.youtube.com/results');
  url.searchParams.set('search_query', sanitizarTexto(consulta, 200));
  return url.toString();
}

/** Construye la URL de reproducción integrada con dominio de privacidad. */
export function construirUrlEmbedYouTube(
  id: string,
  idioma: IdiomaContenido = 'es'
): string {
  const url = new URL(`https://www.youtube-nocookie.com/embed/${id}`);
  url.searchParams.set('rel', '0');
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('enablejsapi', '1');
  url.searchParams.set('hl', idioma);
  url.searchParams.set('cc_lang_pref', idioma);
  return url.toString();
}

/** Construye la URL canónica del video en YouTube. */
export function construirUrlVideoYouTube(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** Construye la miniatura oficial de YouTube para un identificador válido. */
export function construirMiniaturaYouTube(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Verifica estrictamente el formato de un identificador de YouTube. */
export function esIdYouTubeValido(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id);
}

/**
 * Extrae un identificador de YouTube desde una URL o desde un ID directo.
 * Solo acepta hosts oficiales de YouTube; rechaza esquemas peligrosos y
 * parámetros malformados. Devuelve `null` cuando no hay evidencia suficiente.
 */
export function extraerIdYouTube(entrada: unknown): string | null {
  if (typeof entrada !== 'string') return null;
  const limpio = entrada.trim();
  if (!limpio) return null;
  if (esIdYouTubeValido(limpio)) return limpio;

  let url: URL;
  try {
    url = new URL(limpio);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  const hostsPermitidos = new Set([
    'youtube.com',
    'm.youtube.com',
    'music.youtube.com',
    'youtu.be',
    'youtube-nocookie.com',
  ]);
  if (!hostsPermitidos.has(host)) return null;

  let candidato: string | null = null;

  if (host === 'youtu.be') {
    candidato = url.pathname.split('/').filter(Boolean)[0] || null;
  } else {
    const segmentos = url.pathname.split('/').filter(Boolean);
    if (segmentos[0] === 'watch') {
      candidato = url.searchParams.get('v');
    } else if (
      segmentos[0] === 'embed' ||
      segmentos[0] === 'shorts' ||
      segmentos[0] === 'live'
    ) {
      candidato = segmentos[1] || null;
    }
  }

  return esIdYouTubeValido(candidato) ? candidato : null;
}

/**
 * Parsea una duración ISO 8601 de YouTube (`PT1H2M3S`) y devuelve segundos.
 * Devuelve `undefined` si el formato no es verificable.
 */
export function parsearDuracionISO8601(duracion: unknown): number | undefined {
  if (typeof duracion !== 'string') return undefined;
  const coincidencia = duracion.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!coincidencia) return undefined;
  const horas = Number(coincidencia[1] || 0);
  const minutos = Number(coincidencia[2] || 0);
  const segundos = Number(coincidencia[3] || 0);
  const total = horas * 3600 + minutos * 60 + segundos;
  return Number.isFinite(total) && total > 0 ? total : undefined;
}

/** Formatea segundos como `mm:ss` o `h:mm:ss`. */
export function formatearDuracion(segundos?: number): string | undefined {
  if (!segundos || !Number.isFinite(segundos) || segundos <= 0) return undefined;
  const total = Math.round(segundos);
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const restantes = total % 60;
  if (horas > 0) {
    return `${horas}:${String(minutos).padStart(2, '0')}:${String(restantes).padStart(2, '0')}`;
  }
  return `${minutos}:${String(restantes).padStart(2, '0')}`;
}

/**
 * Detecta el idioma probable a partir de título y descripción. Es una
 * heurística de apoyo, nunca una prueba definitiva. Si no hay confianza
 * suficiente devuelve `desconocido` para impedir una validación falsa.
 */
export function detectarIdiomaHeuristico(
  titulo: string,
  descripcion = ''
): { idioma: IdiomaContenido | 'desconocido'; confianza: 'alta' | 'baja' } {
  const texto = normalizarComparacion(`${titulo} ${descripcion}`);
  const tokens = texto.split(' ').filter(Boolean);
  if (tokens.length === 0) return { idioma: 'desconocido', confianza: 'baja' };

  const setEspanol = new Set(MARCADORES_ESPANOL);
  const setIngles = new Set(MARCADORES_INGLES);
  let espanol = 0;
  let ingles = 0;
  for (const token of tokens) {
    if (setEspanol.has(token)) espanol += 1;
    if (setIngles.has(token)) ingles += 1;
  }

  const textoOriginal = `${titulo} ${descripcion}`.toLowerCase();
  if (/[áéíóúñ¿¡]/.test(textoOriginal)) espanol += 2;

  if (espanol >= 3 && espanol >= ingles * 1.6) {
    return { idioma: 'es', confianza: 'alta' };
  }
  if (ingles >= 3 && ingles >= espanol * 1.6) {
    return { idioma: 'en', confianza: 'alta' };
  }
  if (espanol >= 1 && ingles === 0) {
    return { idioma: 'es', confianza: 'baja' };
  }
  if (ingles >= 1 && espanol === 0) {
    return { idioma: 'en', confianza: 'baja' };
  }
  return { idioma: 'desconocido', confianza: 'baja' };
}

/**
 * Genera una clave determinista y estable para la caché. Incluye asignatura,
 * unidad, tema, concepto, curso, rango de edad e idioma. Excluye el número de
 * diapositiva para no ejecutar búsquedas repetitivas en cada avance.
 */
export function calcularClaveContexto(contexto: ContextoAcademico): string {
  const bandaEdad = contexto.edad <= 10 ? 'primaria' : contexto.edad <= 15 ? 'media' : 'superior';
  const base = [
    normalizarComparacion(contexto.asignatura),
    normalizarComparacion(contexto.unidad),
    normalizarComparacion(contexto.tema),
    normalizarComparacion(contexto.subtema || ''),
    normalizarComparacion(contexto.curso),
    normalizarComparacion(contexto.nivel),
    bandaEdad,
    contexto.idioma,
  ].join('|');

  let hash = 2166136261;
  for (let i = 0; i < base.length; i += 1) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `wa-rec-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
