import { renderPrintableHtml, renderSafeMarkdown, escapeHtml } from './markdown';

export interface ReviewDocumentInput {
  review: {
    id: string;
    title: string;
    weekLabel: string;
    contentMd: string;
    sourceRefsJson: string;
    isAiGenerated: boolean;
    publishedAt: string | null;
  };
  program: { title: string; institution: string | null; level: string | null };
  moduleTitle: string | null;
  downloadName: string;
  backHref: string;
}

function parseSourceRefs(value: string): Array<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      : [];
  } catch {
    return [];
  }
}

export function renderReviewHtml(input: ReviewDocumentInput): string {
  const refs = parseSourceRefs(input.review.sourceRefsJson);
  const refsHtml = refs.length
    ? `<h2>Trazabilidad de fuentes</h2><div class="table-wrap"><table><thead><tr><th>Fuente</th><th>Página / clase</th><th>Detalle</th></tr></thead><tbody>${refs
        .map((ref) => {
          const source = escapeHtml(String(ref.source ?? ref.archivo ?? ref.file ?? '—'));
          const page = escapeHtml(String(ref.page ?? ref.pagina ?? ref.lesson ?? ref.clase ?? '—'));
          const detail = escapeHtml(String(ref.detail ?? ref.detalle ?? ref.note ?? ''));
          return `<tr><td>${source}</td><td>${page}</td><td>${detail}</td></tr>`;
        })
        .join('')}</tbody></table></div>`
    : '';

  const subtitle = [
    input.program.title,
    input.program.institution,
    input.moduleTitle,
    `Semana / periodo: ${input.review.weekLabel}`,
  ]
    .filter(Boolean)
    .map((value) => escapeHtml(String(value)))
    .join(' · ');

  const aiNote = input.review.isAiGenerated
    ? 'Este repaso es material de apoyo elaborado con asistencia de IA a partir de las fuentes indicadas. No sustituye los documentos oficiales del programa ni constituye texto oficial de la institución.'
    : 'Documento de repaso elaborado por el equipo académico.';

  const body = `
    ${renderSafeMarkdown(input.review.contentMd)}
    ${refsHtml}
  `;

  return renderPrintableHtml({
    title: escapeHtml(input.review.title),
    subtitle,
    bodyHtml: body,
    footerNote: aiNote,
    downloadName: input.downloadName,
    backHref: input.backHref,
  });
}

export interface GradeReportInput {
  programTitle: string;
  institution: string | null;
  assessmentTitle: string;
  assessmentKind: string;
  semesterLabel: string | null;
  studentName: string;
  attemptNumber: number;
  assessmentVersion: number;
  percentage: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  submittedAt: string | null;
  recordedAt: string;
  passPercentage: number | null;
  backHref: string;
  downloadName: string;
}

function formatDate(value: string | null): string {
  if (!value) return 'No registrada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Guayaquil',
  }).format(date);
}

const KIND_LABEL: Record<string, string> = {
  midterm: 'Examen parcial',
  final: 'Examen final',
  practice: 'Práctica',
};

/**
 * Informe individual de calificación. No incluye claves, respuestas correctas,
 * explicaciones ni indicadores por pregunta.
 */
export function renderGradeReportHtml(input: GradeReportInput): string {
  const percentage =
    input.percentage === null ? '—' : `${input.percentage.toFixed(2)} %`;
  const attempts = input.totalQuestions
    ? `${input.correctCount ?? 0} de ${input.totalQuestions} respuestas correctas`
    : '—';
  const status = input.passPercentage !== null
    ? `Registrado (referencia configurada: ${input.passPercentage.toFixed(2)} %; no se declara aprobación sin norma oficial)`
    : 'Registrado';

  const body = `
    <h2>Datos de la evaluación</h2>
    <div class="table-wrap"><table>
      <tbody>
        <tr><th>Programa</th><td>${escapeHtml(input.programTitle)}</td></tr>
        ${input.institution ? `<tr><th>Institución</th><td>${escapeHtml(input.institution)}</td></tr>` : ''}
        <tr><th>Semestre / módulo</th><td>${escapeHtml(input.semesterLabel || 'No especificado')}</td></tr>
        <tr><th>Evaluación</th><td>${escapeHtml(input.assessmentTitle)} (${escapeHtml(
          KIND_LABEL[input.assessmentKind] || input.assessmentKind
        )})</td></tr>
        <tr><th>Estudiante</th><td>${escapeHtml(input.studentName)}</td></tr>
        <tr><th>Intento</th><td>${input.attemptNumber}</td></tr>
        <tr><th>Versión del examen</th><td>${input.assessmentVersion}</td></tr>
        <tr><th>Fecha de presentación</th><td>${formatDate(input.submittedAt)}</td></tr>
        <tr><th>Fecha de registro</th><td>${formatDate(input.recordedAt)}</td></tr>
      </tbody>
    </table></div>

    <h2>Resultado</h2>
    <div class="table-wrap"><table>
      <tbody>
        <tr><th>Calificación</th><td><strong>${percentage}</strong> sobre 100</td></tr>
        <tr><th>Aciertos</th><td>${escapeHtml(attempts)}</td></tr>
        <tr><th>Escala</th><td>Porcentaje de 0 a 100</td></tr>
        <tr><th>Estado del registro</th><td>${escapeHtml(status)}</td></tr>
      </tbody>
    </table></div>

    <p>Este informe acredita únicamente el resultado registrado en Wisdom Academy para el intento indicado. No reproduce preguntas, claves ni respuestas correctas.</p>
  `;

  return renderPrintableHtml({
    title: 'Informe de calificación',
    subtitle: escapeHtml(`${input.programTitle} · ${input.assessmentTitle}`),
    bodyHtml: body,
    footerNote:
      'Documento generado automáticamente por Wisdom Academy. Consérvalo en tu expediente privado. La revisión detallada de respuestas está reservada al personal académico autorizado.',
    downloadName: input.downloadName,
    backHref: input.backHref,
  });
}
