import zlib from 'node:zlib';

/**
 * Extracción de texto de documentos para importación.
 *
 * - TXT/MD/CSV/JSON: lectura directa con límite de tamaño.
 * - DOCX: lectura del ZIP y de `word/document.xml` sin dependencias externas.
 * - PDF: extracción best-effort de flujos FlateDecode. Si el PDF está escaneado
 *   o no se puede leer con confianza, se marca explícitamente para OCR.
 *
 * Ningún contenido se ejecuta: solo se interpreta texto y se eliminan controles.
 */

export const MAX_DOCUMENT_BYTES = 12 * 1024 * 1024;

export interface ExtractedDocument {
  filename: string;
  extension: string;
  mimeType: string;
  text: string;
  pageCount: number | null;
  confidence: 'high' | 'low' | 'none';
  warnings: string[];
  truncated: boolean;
}

const TEXT_LIMIT = 2_000_000;

export function detectDocumentExtension(filename: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(filename.trim());
  return match ? match[1].toLowerCase() : '';
}

function sanitizeText(input: string): string {
  return input
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&');
}

/** Lector mínimo de archivos ZIP (DOCX) sin dependencias externas. */
export function readZipEntry(buffer: Buffer, wantedName: string): Buffer | null {
  let eocd = -1;
  for (let index = buffer.length - 22; index >= Math.max(0, buffer.length - 66_000); index -= 1) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) return null;

  const totalEntries = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  if (totalEntries > 10_000) return null;

  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) return null;
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const filenameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const filename = buffer
      .subarray(offset + 46, offset + 46 + filenameLength)
      .toString('utf8')
      .replace(/\\/g, '/');

    if (filename === wantedName) {
      if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
        return null;
      }
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + localNameLength + localExtraLength;
      const dataEnd = dataStart + compressedSize;
      if (dataEnd > buffer.length || compressedSize > MAX_DOCUMENT_BYTES) return null;
      const data = buffer.subarray(dataStart, dataEnd);
      if (method === 0) return data;
      if (method === 8) {
        try {
          return zlib.inflateRawSync(data, { maxOutputLength: MAX_DOCUMENT_BYTES });
        } catch {
          return null;
        }
      }
      return null;
    }
    offset += 46 + filenameLength + extraLength + commentLength;
  }
  return null;
}

export function extractDocxText(buffer: Buffer): { text: string; warnings: string[] } {
  const xmlBuffer = readZipEntry(buffer, 'word/document.xml');
  if (!xmlBuffer) {
    return { text: '', warnings: ['No se pudo leer word/document.xml del archivo DOCX.'] };
  }
  const xml = xmlBuffer.toString('utf8');
  const warnings: string[] = [];
  const paragraphs: string[] = [];

  const paragraphMatches = xml.match(/<w:p[\s>][\s\S]*?<\/w:p>/g) || [];
  for (const paragraph of paragraphMatches) {
    const pieces: string[] = [];
    const tokenRegex = /<w:tab\s*\/>|<w:br\s*\/>|<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(paragraph)) !== null) {
      if (match[1] !== undefined) pieces.push(decodeEntities(match[1]));
      else if (match[0].startsWith('<w:tab')) pieces.push('\t');
      else pieces.push('\n');
    }
    const text = pieces.join('').trim();
    if (text) paragraphs.push(text);
  }

  if (!paragraphs.length) {
    warnings.push('El DOCX no contiene texto legible; podría ser un documento escaneado o vacío.');
  }
  return { text: sanitizeText(paragraphs.join('\n\n')), warnings };
}

function decodePdfString(raw: string): string {
  return raw
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_match, octal: string) => String.fromCharCode(parseInt(octal, 8)));
}

function decodeStreamText(buffer: Buffer): string {
  const utf8 = buffer.toString('utf8');
  if (!utf8.includes('\uFFFD')) return utf8;
  return buffer.toString('latin1');
}

function extractPdfStreamText(content: string): string {
  const pieces: string[] = [];
  const textRegex = /\((?:\\.|[^\\()])*\)|<[0-9A-Fa-f\s]+>/g;
  let match: RegExpExecArray | null;
  while ((match = textRegex.exec(content)) !== null) {
    const token = match[0];
    if (token.startsWith('<')) {
      const hex = token.slice(1, -1).replace(/\s+/g, '');
      let decoded = '';
      for (let index = 0; index + 1 < hex.length; index += 2) {
        decoded += String.fromCharCode(parseInt(hex.slice(index, index + 2), 16));
      }
      pieces.push(decoded);
    } else {
      pieces.push(decodePdfString(token.slice(1, -1)));
    }
    if (/T\*|Td|TD|TJ|Tj/.test(content.slice(match.index + token.length, match.index + token.length + 6))) {
      pieces.push(' ');
    }
  }
  return pieces.join('');
}

export function extractPdfText(buffer: Buffer): {
  text: string;
  warnings: string[];
  confidence: 'high' | 'low' | 'none';
  pageCount: number;
} {
  const warnings: string[] = [];
  const raw = buffer.toString('latin1');
  const pageCount = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;
  const streams: string[] = [];
  const streamRegex = /stream\r?\n([\s\S]*?)endstream/g;
  let match: RegExpExecArray | null;
  let streamCount = 0;

  while ((match = streamRegex.exec(raw)) !== null) {
    streamCount += 1;
    if (streamCount > 5000) {
      warnings.push('El PDF tiene demasiados flujos; se limitó el análisis.');
      break;
    }
    const data = Buffer.from(match[1], 'latin1');
    let decoded: Buffer | null = null;
    try {
      decoded = zlib.inflateSync(data, { maxOutputLength: MAX_DOCUMENT_BYTES });
    } catch {
      try {
        decoded = zlib.inflateRawSync(data, { maxOutputLength: MAX_DOCUMENT_BYTES });
      } catch {
        decoded = null;
      }
    }
    if (!decoded) continue;
    const text = extractPdfStreamText(decodeStreamText(decoded));
    if (text.trim()) streams.push(text);
  }

  const text = sanitizeText(streams.join('\n\n'));
  const printableRatio = text.length
    ? [...text].filter((char) => {
        const code = char.charCodeAt(0);
        return code === 9 || code === 10 || (code >= 32 && code !== 127);
      }).length / text.length
    : 0;

  let confidence: 'high' | 'low' | 'none' = 'high';
  if (!text || text.length < 40) {
    confidence = 'none';
    warnings.push(
      'No se pudo extraer texto suficiente. El PDF podría ser escaneado; se requiere OCR antes de importar contenido.'
    );
  } else if (printableRatio < 0.85 || text.length < 200) {
    confidence = 'low';
    warnings.push('La extracción del PDF es parcial o de baja confianza. Revisa el texto antes de usarlo.');
  }
  if (pageCount === 0) {
    warnings.push('No se pudo determinar el número de páginas del PDF.');
  }
  return { text, warnings, confidence, pageCount: pageCount || 0 };
}

export function extractDocument(input: {
  filename: string;
  mimeType?: string;
  buffer: Buffer;
}): ExtractedDocument {
  const filename = input.filename.trim().slice(0, 250);
  const extension = detectDocumentExtension(filename);
  if (input.buffer.length > MAX_DOCUMENT_BYTES) {
    throw new Error('El archivo supera el límite de 12 MB permitido para importación.');
  }
  const warnings: string[] = [];
  let text = '';
  let pageCount: number | null = null;
  let confidence: 'high' | 'low' | 'none' = 'high';
  let truncated = false;

  if (['txt', 'md', 'markdown', 'csv', 'json', 'yaml', 'yml'].includes(extension)) {
    text = sanitizeText(input.buffer.toString('utf8'));
  } else if (extension === 'docx') {
    const result = extractDocxText(input.buffer);
    text = result.text;
    warnings.push(...result.warnings);
    confidence = text.length >= 40 ? 'high' : 'none';
  } else if (extension === 'pdf') {
    const result = extractPdfText(input.buffer);
    text = result.text;
    warnings.push(...result.warnings);
    confidence = result.confidence;
    pageCount = result.pageCount;
  } else {
    throw new Error(`Formato no admitido: .${extension || 'desconocido'}. Usa TXT, MD, PDF o DOCX.`);
  }

  if (text.length > TEXT_LIMIT) {
    text = text.slice(0, TEXT_LIMIT);
    truncated = true;
    warnings.push('El texto extraído se truncó al límite de 2 000 000 de caracteres.');
  }

  return {
    filename,
    extension,
    mimeType: input.mimeType || mimeTypeForExtension(extension),
    text,
    pageCount,
    confidence,
    warnings,
    truncated,
  };
}

export function mimeTypeForExtension(extension: string): string {
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'md':
    case 'markdown':
      return 'text/markdown';
    case 'csv':
      return 'text/csv';
    case 'json':
      return 'application/json';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}
