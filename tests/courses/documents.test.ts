import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { extractDocument, extractDocxText, extractPdfText, readZipEntry } from '../../src/lib/courses/documents';

function buildStoredZip(files: Array<{ name: string; content: string }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const data = Buffer.from(file.content, 'utf8');
    const crc = 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc >>> 0, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc >>> 0, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirectory.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, eocd]);
}

test('extrae texto de TXT y Markdown', () => {
  const txt = extractDocument({ filename: 'notas.txt', buffer: Buffer.from('Hola\r\n\r\nMundo') });
  assert.equal(txt.text, 'Hola\n\nMundo');
  assert.equal(txt.confidence, 'high');

  const md = extractDocument({ filename: 'lectura.md', buffer: Buffer.from('# Título\n\nContenido') });
  assert.match(md.text, /# Título/);
});

test('extrae el XML de un DOCX mínimo', () => {
  const documentXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Primer párrafo</w:t></w:r></w:p>
    <w:p><w:r><w:t>Segundo</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>párrafo</w:t></w:r></w:p>
  </w:body>
</w:document>`;
  const zip = buildStoredZip([{ name: 'word/document.xml', content: documentXml }]);
  const entry = readZipEntry(zip, 'word/document.xml');
  assert.ok(entry);
  assert.match(entry.toString('utf8'), /Primer párrafo/);
  const result = extractDocxText(zip);
  assert.match(result.text, /Primer párrafo/);
  assert.match(result.text, /Segundo\tpárrafo/);
});

test('extrae texto de un PDF con flujo FlateDecode y marca baja confianza si es escaso', () => {
  const stream = zlib.deflateSync(
    Buffer.from('BT /F1 12 Tf 72 720 Td (Contenido teológico de prueba con suficiente longitud para el análisis del documento.) Tj ET')
  );
  const pdf = Buffer.concat([
    Buffer.from('%PDF-1.4\n1 0 obj << /Type /Page >> endobj\n2 0 obj << /Length ', 'latin1'),
    Buffer.from(String(stream.length), 'latin1'),
    Buffer.from(' >>\nstream\n', 'latin1'),
    stream,
    Buffer.from('\nendstream\nendobj\n%%EOF', 'latin1'),
  ]);
  const result = extractPdfText(pdf);
  assert.match(result.text, /Contenido teológico de prueba/);
  assert.equal(result.pageCount, 1);
});

test('rechaza formatos no admitidos y documentos vacíos sin inventar texto', () => {
  assert.throws(
    () => extractDocument({ filename: 'archivo.exe', buffer: Buffer.from('MZ') }),
    /Formato no admitido/
  );
  const emptyPdf = Buffer.from('%PDF-1.4\n%%EOF');
  const result = extractPdfText(emptyPdf);
  assert.equal(result.text, '');
  assert.equal(result.confidence, 'none');
  assert.ok(result.warnings.some((warning) => warning.includes('OCR')));
});
