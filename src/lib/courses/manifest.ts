import { extractYouTubeVideoId, normalizeYouTubeVideoIds } from './youtube';

/**
 * Parser de manifiestos de clases y videos.
 *
 * Admite Markdown (formato recomendado), CSV y JSON. No ejecuta contenido,
 * no inventa títulos y conserva los errores por fila para que el administrador
 * los corrija antes de confirmar la importación.
 */

export type ManifestFormat = 'markdown' | 'csv' | 'json';

export interface ManifestEntry {
  key: string;
  program: string | null;
  semester: number | null;
  lessonNumber: number | null;
  title: string | null;
  videoIds: string[];
  invalidVideoUrls: string[];
  pages: string | null;
  duration: string | null;
  description: string | null;
  material: string | null;
  sourceLine: number;
}

export interface ManifestParseResult {
  format: ManifestFormat;
  entries: ManifestEntry[];
  errors: string[];
  warnings: string[];
  stats: {
    total: number;
    ready: number;
    missingTitle: number;
    missingSemester: number;
    missingLesson: number;
    withoutVideo: number;
    invalidUrls: number;
    duplicateVideos: number;
    duplicateClasses: number;
  };
}

const KEY_ALIASES: Record<string, string> = {
  programa: 'program',
  'programa académico': 'program',
  'programa academico': 'program',
  semestre: 'semester',
  semester: 'semester',
  clase: 'lesson',
  'clase número': 'lesson',
  'clase numero': 'lesson',
  'número de clase': 'lesson',
  'numero de clase': 'lesson',
  'clase n': 'lesson',
  'lesson number': 'lesson',
  leccion: 'lesson',
  lección: 'lesson',
  'título de la clase': 'title',
  'titulo de la clase': 'title',
  título: 'title',
  titulo: 'title',
  title: 'title',
  'url de youtube': 'video',
  youtube: 'video',
  'enlace de youtube': 'video',
  'video de youtube': 'video',
  videos: 'video',
  'url del video': 'video',
  'urls de youtube': 'video',
  'páginas del texto': 'pages',
  'paginas del texto': 'pages',
  páginas: 'pages',
  paginas: 'pages',
  pages: 'pages',
  duración: 'duration',
  duracion: 'duration',
  duration: 'duration',
  descripción: 'description',
  descripcion: 'description',
  description: 'description',
  'material complementario': 'material',
  material: 'material',
  recursos: 'material',
};

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function splitVideos(value: string): { ids: string[]; invalid: string[] } {
  const candidates = value
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const ids: string[] = [];
  const invalid: string[] = [];
  for (const candidate of candidates) {
    const id = extractYouTubeVideoId(candidate);
    if (id) {
      if (!ids.includes(id)) ids.push(id);
    } else if (/https?:\/\//i.test(candidate) || candidate.length > 5) {
      invalid.push(candidate);
    }
  }
  return { ids, invalid };
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : null;
  if (typeof value !== 'string') return null;
  const match = /\d+/.exec(value);
  if (!match) return null;
  return Number(match[0]);
}

function clean(value: unknown, max = 1000): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function createEntry(sourceLine: number, program: string | null): ManifestEntry {
  return {
    key: `row_${sourceLine}`,
    program,
    semester: null,
    lessonNumber: null,
    title: null,
    videoIds: [],
    invalidVideoUrls: [],
    pages: null,
    duration: null,
    description: null,
    material: null,
    sourceLine,
  };
}

function applyField(entry: ManifestEntry, field: string, value: string): void {
  switch (field) {
    case 'program':
      entry.program = clean(value, 250);
      break;
    case 'semester':
      entry.semester = toNumber(value);
      break;
    case 'lesson':
      entry.lessonNumber = toNumber(value);
      break;
    case 'title':
      entry.title = clean(value, 250);
      break;
    case 'video': {
      const parsed = splitVideos(value);
      for (const id of parsed.ids) if (!entry.videoIds.includes(id)) entry.videoIds.push(id);
      entry.invalidVideoUrls.push(...parsed.invalid);
      break;
    }
    case 'pages':
      entry.pages = clean(value, 120);
      break;
    case 'duration':
      entry.duration = clean(value, 120);
      break;
    case 'description':
      entry.description = clean(value, 4000);
      break;
    case 'material':
      entry.material = clean(value, 1000);
      break;
    default:
      break;
  }
}

export function parseMarkdownManifest(content: string): { entries: ManifestEntry[]; warnings: string[] } {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const entries: ManifestEntry[] = [];
  const warnings: string[] = [];
  let current = createEntry(1, null);

  const pushCurrent = () => {
    if (
      current.program ||
      current.semester !== null ||
      current.lessonNumber !== null ||
      current.title ||
      current.videoIds.length ||
      current.invalidVideoUrls.length
    ) {
      entries.push(current);
    }
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (/^\s*---+\s*$/.test(line)) {
      pushCurrent();
      current = createEntry(lineNumber + 1, null);
      return;
    }
    const match = /^\s*([^:：]{2,60})\s*[:：]\s*(.*)$/.exec(line);
    if (!match) {
      if (line.trim() && /^https?:\/\//i.test(line.trim()) && current.lessonNumber !== null) {
        applyField(current, 'video', line);
      }
      return;
    }
    const field = KEY_ALIASES[normalizeKey(match[1])];
    if (!field) return;

    if (field === 'program' && (current.program || current.lessonNumber !== null || current.title)) {
      pushCurrent();
      current = createEntry(lineNumber, null);
    }
    if (field === 'semester' && current.lessonNumber !== null) {
      pushCurrent();
      current = createEntry(lineNumber, current.program);
    }
    if (field === 'lesson' && current.lessonNumber !== null) {
      pushCurrent();
      current = createEntry(lineNumber, current.program);
    }
    if (current.sourceLine === 1 && entries.length === 0 && lineNumber > 1) {
      current.sourceLine = lineNumber;
    }
    applyField(current, field, match[2]);
  });
  pushCurrent();

  if (!entries.length) warnings.push('No se detectaron registros con el formato "Campo: valor".');
  return { entries, warnings };
}

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const text = content.replace(/\r\n/g, '\n');
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function parseCsvManifest(content: string): { entries: ManifestEntry[]; warnings: string[] } {
  const rows = parseCsvRows(content);
  const warnings: string[] = [];
  if (!rows.length) return { entries: [], warnings: ['El CSV está vacío.'] };
  const header = rows[0].map((value) => normalizeKey(value));
  const fieldMap = header.map((value) => KEY_ALIASES[value]);
  const entries: ManifestEntry[] = [];

  rows.slice(1).forEach((row, index) => {
    const entry = createEntry(index + 2, null);
    row.forEach((value, cellIndex) => {
      const field = fieldMap[cellIndex];
      if (field && value.trim()) applyField(entry, field, value);
    });
    if (entry.title || entry.lessonNumber !== null || entry.videoIds.length) entries.push(entry);
  });
  if (!fieldMap.some(Boolean)) {
    warnings.push('No se reconoció ninguna columna del CSV. Revisa la plantilla.');
  }
  return { entries, warnings };
}

function fromJsonRecord(record: Record<string, unknown>, index: number, inherited: {
  program?: string | null;
  semester?: number | null;
} = {}): ManifestEntry {
  const entry = createEntry(index + 1, inherited.program ?? null);
  entry.semester = inherited.semester ?? toNumber(record.semester ?? record.semestre ?? record.semesterNumber ?? null);
  entry.lessonNumber = toNumber(
    record.lessonNumber ?? record.lesson ?? record.clase ?? record.numero ?? record.number ?? null
  );
  entry.title = clean(record.title ?? record.titulo ?? record['título'] ?? null, 250);
  entry.pages = clean(record.pages ?? record.paginas ?? record['páginas'] ?? null, 120);
  entry.duration = clean(record.duration ?? record.duracion ?? record['duración'] ?? null, 120);
  entry.description = clean(record.description ?? record.descripcion ?? record['descripción'] ?? null, 4000);
  entry.material = clean(record.material ?? record.materials ?? record.complementaryMaterial ?? null, 1000);
  const videos = normalizeYouTubeVideoIds(
    record.videoIds ?? record.videos ?? record.youtube ?? record.video ?? record.urls ?? []
  );
  entry.videoIds = videos.ids;
  entry.invalidVideoUrls = videos.invalid;
  return entry;
}

export function parseJsonManifest(content: string): { entries: ManifestEntry[]; warnings: string[] } {
  const warnings: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { entries: [], warnings: ['El archivo JSON no es válido.'] };
  }
  const entries: ManifestEntry[] = [];
  const programDefault =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? clean((parsed as Record<string, unknown>).program ?? (parsed as Record<string, unknown>).programa, 250)
      : null;

  const addList = (list: unknown[], inherited: { program?: string | null; semester?: number | null }) => {
    list.forEach((item, index) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        const semesterFromItem = toNumber(record.semestre ?? record.semester ?? null);
        if (Array.isArray(record.clases) || Array.isArray(record.lessons)) {
          const nested = (record.clases || record.lessons) as unknown[];
          addList(nested, {
            program: inherited.program ?? programDefault,
            semester: semesterFromItem ?? inherited.semester ?? null,
          });
          return;
        }
        entries.push(fromJsonRecord(record, index, inherited));
      }
    });
  };

  if (Array.isArray(parsed)) {
    addList(parsed, { program: programDefault, semester: null });
  } else if (parsed && typeof parsed === 'object') {
    const root = parsed as Record<string, unknown>;
    if (Array.isArray(root.semesters) || Array.isArray(root.semestres)) {
      addList((root.semesters || root.semestres) as unknown[], { program: programDefault, semester: null });
    } else if (Array.isArray(root.entries) || Array.isArray(root.lessons) || Array.isArray(root.clases)) {
      addList((root.entries || root.lessons || root.clases) as unknown[], {
        program: programDefault,
        semester: null,
      });
    } else {
      entries.push(fromJsonRecord(root, 0, { program: programDefault, semester: null }));
    }
  }
  if (!entries.length) warnings.push('El JSON no contiene registros de clases reconocibles.');
  return { entries, warnings };
}

export function detectManifestFormat(filename: string, content: string): ManifestFormat {
  const extension = filename.toLowerCase().split('.').pop() || '';
  if (extension === 'json') return 'json';
  if (extension === 'csv') return 'csv';
  if (extension === 'md' || extension === 'markdown' || extension === 'txt') return 'markdown';
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (/^[^\n]*,[^\n]*\n/.test(trimmed) && /clase|t[ií]tulo|semestre|youtube/i.test(trimmed.split('\n')[0])) {
    return 'csv';
  }
  return 'markdown';
}

export function validateManifest(entries: ManifestEntry[]): Omit<ManifestParseResult, 'format' | 'entries'> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const classKeys = new Set<string>();
  const videoOwners = new Map<string, string>();
  const titlesBySemester = new Map<string, Set<string>>();
  let missingTitle = 0;
  let missingSemester = 0;
  let missingLesson = 0;
  let withoutVideo = 0;
  let invalidUrls = 0;
  let duplicateVideos = 0;
  let duplicateClasses = 0;
  let ready = 0;

  entries.forEach((entry, index) => {
    const label = `Fila ${index + 1}${entry.title ? ` («${entry.title}»)` : ''}`;
    let hasError = false;
    if (entry.semester === null || entry.semester < 1 || entry.semester > 99) {
      errors.push(`${label}: semestre ausente o fuera de rango.`);
      missingSemester += 1;
      hasError = true;
    }
    if (entry.lessonNumber === null || entry.lessonNumber < 1) {
      errors.push(`${label}: número de clase ausente o inválido.`);
      missingLesson += 1;
      hasError = true;
    }
    if (!entry.title) {
      errors.push(`${label}: falta el título exacto de la clase; no se inventará automáticamente.`);
      missingTitle += 1;
      hasError = true;
    }
    if (entry.invalidVideoUrls.length) {
      errors.push(`${label}: enlaces de YouTube inválidos (${entry.invalidVideoUrls.join(', ')}).`);
      invalidUrls += entry.invalidVideoUrls.length;
      hasError = true;
    }
    if (entry.videoIds.length === 0) {
      warnings.push(`${label}: clase sin video asociado.`);
      withoutVideo += 1;
    }

    if (entry.semester !== null && entry.lessonNumber !== null) {
      const classKey = `${entry.semester}-${entry.lessonNumber}`;
      if (classKeys.has(classKey)) {
        errors.push(`${label}: la clase ${entry.lessonNumber} del semestre ${entry.semester} está repetida.`);
        duplicateClasses += 1;
        hasError = true;
      } else {
        classKeys.add(classKey);
      }
    }

    for (const videoId of entry.videoIds) {
      const previous = videoOwners.get(videoId);
      const owner = `S${entry.semester ?? '?'}C${entry.lessonNumber ?? '?'}`;
      if (previous && previous !== owner) {
        errors.push(`${label}: el video ${videoId} ya está asociado a ${previous}.`);
        duplicateVideos += 1;
        hasError = true;
      } else {
        videoOwners.set(videoId, owner);
      }
    }

    if (entry.semester !== null && entry.title) {
      const key = String(entry.semester);
      if (!titlesBySemester.has(key)) titlesBySemester.set(key, new Set());
      const set = titlesBySemester.get(key) as Set<string>;
      const normalized = entry.title.toLowerCase();
      if (set.has(normalized)) {
        warnings.push(`${label}: título repetido dentro del semestre ${entry.semester}.`);
      }
      set.add(normalized);
    }

    if (!hasError) ready += 1;
  });

  const programs = new Set(entries.map((entry) => entry.program).filter(Boolean));
  if (programs.size > 1) {
    warnings.push('El manifiesto menciona más de un programa. Se importará cada registro en el programa seleccionado.');
  }

  return {
    errors,
    warnings,
    stats: {
      total: entries.length,
      ready,
      missingTitle,
      missingSemester,
      missingLesson,
      withoutVideo,
      invalidUrls,
      duplicateVideos,
      duplicateClasses,
    },
  };
}

export function parseManifest(filename: string, content: string): ManifestParseResult {
  if (content.length > 4_000_000) {
    throw new Error('El manifiesto supera el límite de 4 MB.');
  }
  const format = detectManifestFormat(filename, content);
  const parsed =
    format === 'json'
      ? parseJsonManifest(content)
      : format === 'csv'
        ? parseCsvManifest(content)
        : parseMarkdownManifest(content);
  const validated = validateManifest(parsed.entries);
  return {
    format,
    entries: parsed.entries,
    errors: validated.errors,
    warnings: [...parsed.warnings, ...validated.warnings],
    stats: validated.stats,
  };
}

export function mergeManifestEntries(entries: ManifestEntry[]): ManifestEntry[] {
  const byClass = new Map<string, ManifestEntry>();
  for (const entry of entries) {
    if (entry.semester === null || entry.lessonNumber === null) continue;
    const key = `${entry.semester}-${entry.lessonNumber}`;
    const existing = byClass.get(key);
    if (!existing) {
      byClass.set(key, { ...entry, videoIds: [...entry.videoIds] });
      continue;
    }
    for (const videoId of entry.videoIds) {
      if (!existing.videoIds.includes(videoId)) existing.videoIds.push(videoId);
    }
    existing.pages = existing.pages || entry.pages;
    existing.duration = existing.duration || entry.duration;
    existing.description = existing.description || entry.description;
    existing.material = existing.material || entry.material;
    existing.title = existing.title || entry.title;
  }
  return [...byClass.values()];
}
