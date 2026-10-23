/**
 * Renderizado seguro de Markdown para materiales importados y repasos.
 *
 * Todo el texto se escapa primero. Solo se permite un subconjunto de Markdown:
 * encabezados, párrafos, listas, citas, código, énfasis, enlaces http(s) y
 * tablas simples. Nunca se interpreta HTML en bruto.
 */

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(raw: string): string | null {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return null;
}

function inline(value: string): string {
  let output = value;
  output = output.replace(/`([^`]+)`/g, (_match, code: string) => `<code>${code}</code>`);
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  output = output.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) => {
    const safe = safeHref(href);
    if (!safe) return match;
    return `<a href="${safe}" rel="noopener noreferrer nofollow" target="_blank">${label}</a>`;
  });
  return output;
}

export function renderSafeMarkdown(markdown: string): string {
  const escaped = escapeHtml(String(markdown || '').replace(/\r\n/g, '\n'));
  const lines = escaped.split('\n');
  const output: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let paragraph: string[] = [];
  let tableRows: string[][] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (!listType) return;
    output.push(`</${listType}>`);
    listType = null;
  };
  const flushTable = () => {
    if (!tableRows.length) return;
    const [header, ...body] = tableRows;
    output.push('<div class="table-wrap"><table><thead><tr>');
    output.push(header.map((cell) => `<th>${inline(cell.trim())}</th>`).join(''));
    output.push('</tr></thead><tbody>');
    for (const row of body) {
      output.push('<tr>');
      output.push(row.map((cell) => `<td>${inline(cell.trim())}</td>`).join(''));
      output.push('</tr>');
    }
    output.push('</tbody></table></div>');
    tableRows = [];
  };

  for (const rawLine of lines) {
    const line = rawLine;
    if (line.trim().startsWith('```')) {
      if (inCode) {
        output.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        flushParagraph();
        closeList();
        flushTable();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      closeList();
      flushTable();
      continue;
    }

    if (/^\|.*\|$/.test(line.trim())) {
      flushParagraph();
      closeList();
      const cells = line.trim().slice(1, -1).split('|');
      if (cells.every((cell) => /^:?-{2,}:?$/.test(cell.trim()))) {
        continue;
      }
      tableRows.push(cells);
      continue;
    } else {
      flushTable();
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1].length;
      output.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      continue;
    }

    if (/^(\s*[-*_]\s*){3,}$/.test(line.trim())) {
      flushParagraph();
      closeList();
      output.push('<hr />');
      continue;
    }

    const unordered = line.match(/^\s*[-*+]\s+(.*)$/);
    if (unordered) {
      flushParagraph();
      if (listType !== 'ul') {
        closeList();
        output.push('<ul>');
        listType = 'ul';
      }
      output.push(`<li>${inline(unordered[1])}</li>`);
      continue;
    }
    const ordered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ordered) {
      flushParagraph();
      if (listType !== 'ol') {
        closeList();
        output.push('<ol>');
        listType = 'ol';
      }
      output.push(`<li>${inline(ordered[1])}</li>`);
      continue;
    }

    const quote = line.match(/^\s*&gt;\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeList();
      output.push(`<blockquote>${inline(quote[1])}</blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  if (inCode) output.push(`<pre><code>${codeLines.join('\n')}</code></pre>`);
  flushParagraph();
  closeList();
  flushTable();
  return output.join('\n');
}

export function renderPrintableHtml(options: {
  title: string;
  subtitle?: string;
  bodyHtml: string;
  footerNote?: string;
  downloadName?: string;
  backHref?: string;
}): string {
  const { title, subtitle, bodyHtml, footerNote, downloadName, backHref } = options;
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #F8FAFC; color: #0F172A; font-family: "Schibsted Grotesk", "Segoe UI", sans-serif; line-height: 1.65; }
  .toolbar { position: sticky; top: 0; z-index: 20; display: flex; gap: .75rem; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: .75rem 1.25rem; background: #043D2A; color: #F0FDF6; }
  .toolbar a, .toolbar button { color: #F0FDF6; background: transparent; border: 1px solid rgba(240,253,246,.35); border-radius: 999px; padding: .4rem .9rem; font: inherit; cursor: pointer; text-decoration: none; }
  .sheet { max-width: 880px; margin: 2rem auto; background: #fff; padding: clamp(1.5rem, 4vw, 3rem); border: 1px solid #E2E8F0; border-radius: 16px; }
  h1 { font-family: "Bricolage Grotesque", "Segoe UI", sans-serif; font-size: clamp(1.6rem, 3.5vw, 2.2rem); margin: 0 0 .25rem; color: #043D2A; }
  .subtitle { color: #475569; margin: 0 0 1.5rem; }
  h2 { font-size: 1.25rem; margin-top: 2rem; color: #043D2A; border-bottom: 1px solid #E2E8F0; padding-bottom: .35rem; }
  h3 { font-size: 1.05rem; margin-top: 1.5rem; color: #0F172A; }
  p, li { font-size: .975rem; }
  blockquote { margin: 1rem 0; padding: .75rem 1rem; border-left: 4px solid #0BAA5E; background: #F0FDF6; color: #1E293B; }
  code { font-family: "IBM Plex Mono", monospace; background: #F1F5F9; padding: .1rem .3rem; border-radius: 4px; font-size: .9em; }
  pre { background: #0F172A; color: #E2E8F0; padding: 1rem; border-radius: 10px; overflow-x: auto; }
  .table-wrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: .9rem; }
  th, td { border: 1px solid #E2E8F0; padding: .5rem .6rem; text-align: left; vertical-align: top; }
  th { background: #F1F5F9; }
  .note { margin-top: 2rem; padding: .9rem 1rem; border-radius: 10px; background: #FFFBEB; border: 1px solid #FDE68A; color: #713F12; font-size: .85rem; }
  .brand { display: flex; align-items: center; gap: .6rem; margin-bottom: 1.25rem; font-weight: 700; letter-spacing: .02em; color: #043D2A; }
  .brand span { display: inline-block; width: .7rem; height: .7rem; border-radius: 50%; background: #0BAA5E; }
  @media print { .toolbar { display: none; } body { background: #fff; } .sheet { border: 0; margin: 0; padding: 0; max-width: none; } h2 { page-break-after: avoid; } table { page-break-inside: auto; } tr { page-break-inside: avoid; } }
</style>
</head>
<body>
<div class="toolbar">
  <span>Wisdom Academy · Documento imprimible</span>
  <span>
    ${backHref ? `<a href="${backHref}">Volver</a>` : ''}
    ${downloadName ? `<a href="?download=1">Descargar</a>` : ''}
    <a href="#" onclick="event.preventDefault(); window.print();">Imprimir / Guardar PDF</a>
  </span>
</div>
<div class="sheet">
  <div class="brand"><span></span> WISDOM ACADEMY</div>
  <h1>${title}</h1>
  ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
  ${bodyHtml}
  ${footerNote ? `<div class="note">${footerNote}</div>` : ''}
</div>
</body>
</html>`;
}
