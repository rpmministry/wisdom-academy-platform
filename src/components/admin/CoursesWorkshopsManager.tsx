'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch, errorMessage } from '@/lib/api/client';

interface ProgramSummary {
  id: string;
  slug: string;
  kind: 'course' | 'workshop';
  title: string;
  subtitle: string | null;
  description: string | null;
  institution: string | null;
  level: string | null;
  audience: string | null;
  durationLabel: string | null;
  objectives: string[];
  requirements: string[];
  coverImageUrl: string | null;
  status: 'draft' | 'published' | 'archived';
  driveFolderId: string | null;
  driveFolderUrl: string | null;
  moduleCount: number;
  lessonCount: number;
  publishedReviews: number;
  assessments: number;
}

interface LessonView {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  videoIds: string[];
  pagesLabel: string | null;
  durationLabel: string | null;
  materials: Array<{ id: string; kind: string; title: string; url: string | null; driveFileId: string | null }>;
}

interface ModuleView {
  id: string;
  title: string;
  kind: 'semester' | 'module' | 'unit';
  position: number;
  description: string | null;
  lessons: LessonView[];
}

interface ProgramDetailResponse {
  ok: boolean;
  programa: {
    program: ProgramSummary;
    modules: ModuleView[];
    materials: Array<{ id: string; kind: string; title: string; url: string | null; driveFileId: string | null; visibility: string }>;
    reviews: Array<{ id: string; title: string; weekLabel: string; status: string; isAiGenerated: boolean; moduleId: string | null }>;
    assessments: Array<{ id: string; title: string; kind: string; status: string; questionCount: number; attemptsAllowed: number }>;
    progress: { completedLessons: number; totalLessons: number; percent: number };
  };
  evaluaciones: Array<{
    id: string;
    title: string;
    kind: string;
    origin: string;
    status: string;
    questionCount: number;
    audit: { ok: boolean; issues: Array<{ code: string; message: string }>; counts: { total: number; trueFalse: number; multipleChoice: number } };
  }>;
  importaciones: Array<{ id: string; kind: string; filename: string; summary: Record<string, unknown>; createdAt: string }>;
}

interface PreviewResponse {
  ok: boolean;
  formato: string;
  resumen: { total: number; create: number; update: number; errors: number; warnings: number };
  filas: Array<{
    semester: number | null;
    lessonNumber: number | null;
    title: string | null;
    moduleTitle: string | null;
    action: 'create' | 'update' | 'error';
    videoIds: string[];
    message: string | null;
  }>;
  errores: string[];
  advertencias: string[];
}

const EMPTY_PROGRAM_FORM = {
  kind: 'course' as 'course' | 'workshop',
  title: '',
  subtitle: '',
  description: '',
  institution: '',
  level: '',
  audience: '',
  durationLabel: '',
  objectives: '',
  requirements: '',
  coverImageUrl: '',
  semesters: '0',
  n2nTemplate: false,
};

function linesToArray(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

export const CoursesWorkshopsManager: React.FC = () => {
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProgramDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(EMPTY_PROGRAM_FORM);
  const [metadataForm, setMetadataForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    institution: '',
    level: '',
    audience: '',
    durationLabel: '',
    objectives: '',
    requirements: '',
    coverImageUrl: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    driveFolderId: '',
    driveFolderUrl: '',
  });
  const [moduleForm, setModuleForm] = useState({ title: '', kind: 'semester' as 'semester' | 'module' | 'unit', description: '' });
  const [lessonForm, setLessonForm] = useState({
    moduleId: '',
    title: '',
    videoUrls: '',
    pagesLabel: '',
    durationLabel: '',
    description: '',
  });
  const [materialForm, setMaterialForm] = useState({ title: '', url: '', driveFileId: '', lessonId: '', kind: 'external_link' as 'external_link' | 'full_text' | 'drive_file' | 'text' });
  const [reviewForm, setReviewForm] = useState({
    title: '',
    weekLabel: '',
    moduleId: '',
    contentMd: '',
    isAiGenerated: true,
    publish: false,
  });
  const [assessmentForm, setAssessmentForm] = useState({
    title: '',
    kind: 'midterm' as 'midterm' | 'final' | 'practice',
    moduleId: '',
    origin: 'generated' as 'official' | 'generated',
    attemptsAllowed: '1',
    timeLimitMinutes: '',
    opensAt: '',
    closesAt: '',
    questionsJson: '',
  });
  const [editState, setEditState] = useState<
    | { kind: 'module'; id: string; title: string }
    | { kind: 'lesson'; id: string; title: string; videoUrls: string; pagesLabel: string; durationLabel: string }
    | null
  >(null);
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const [manifestContent, setManifestContent] = useState('');
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentStaffOnly, setDocumentStaffOnly] = useState(false);
  const [documentResult, setDocumentResult] = useState<Record<string, unknown> | null>(null);
  const [reports, setReports] = useState<{
    agregados: Array<{ assessmentId: string; title: string; attempts: number; average: number; min: number; max: number }>;
    intentos: Array<{ id: string; studentName: string; assessmentTitle: string; percentage: number | null; submittedAt: string | null; driveStatus: string }>;
  } | null>(null);
  const [assessmentReview, setAssessmentReview] = useState<null | {
    assessment: { id: string; title: string; status: string; version: number; origin: string };
    questions: Array<{
      id: string;
      type: string;
      prompt: string;
      options: Array<{ id: string; label: string }>;
      correct_key: string;
      source_ref: string | null;
      review_state: string;
    }>;
    audit: { ok: boolean; issues: Array<{ code: string; message: string }>; counts: { total: number; trueFalse: number; multipleChoice: number } };
  }>(null);

  const setNotice = (text: string) => {
    setMessage(text);
    setError(null);
  };
  const setFailure = (caught: unknown) => {
    setError(errorMessage(caught));
    setMessage(null);
  };

  const refreshPrograms = useCallback(async () => {
    const response = await apiFetch<{ ok: boolean; programas: ProgramSummary[] }>('/api/admin/courses');
    setPrograms(response.programas);
    if (!selectedId && response.programas.length) setSelectedId(response.programas[0].id);
  }, [selectedId]);

  const loadDetail = useCallback(async (id: string) => {
    const response = await apiFetch<ProgramDetailResponse>(`/api/admin/courses/${id}`);
    const program = response.programa?.program;
    if (!program) {
      throw new Error('La respuesta del programa no tiene la estructura esperada. Recarga la página.');
    }
    const modules = Array.isArray(response.programa.modules) ? response.programa.modules : [];
    const objectives = Array.isArray(program.objectives) ? program.objectives : [];
    const requirements = Array.isArray(program.requirements) ? program.requirements : [];
    setDetail(response);
    setMetadataForm({
      title: program.title,
      subtitle: program.subtitle || '',
      description: program.description || '',
      institution: program.institution || '',
      level: program.level || '',
      audience: program.audience || '',
      durationLabel: program.durationLabel || '',
      objectives: objectives.join('\n'),
      requirements: requirements.join('\n'),
      coverImageUrl: program.coverImageUrl || '',
      status: program.status,
      driveFolderId: program.driveFolderId || '',
      driveFolderUrl: program.driveFolderUrl || '',
    });
    setLessonForm((current) => ({
      ...current,
      moduleId: current.moduleId || modules[0]?.id || '',
    }));
    setReviewForm((current) => ({
      ...current,
      moduleId: current.moduleId || modules[0]?.id || '',
    }));
    setAssessmentForm((current) => ({
      ...current,
      moduleId: current.moduleId || modules[0]?.id || '',
    }));
    setReports(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshPrograms();
      } catch (caught) {
        if (!cancelled) setFailure(caught);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await loadDetail(selectedId);
      } catch (caught) {
        if (!cancelled) setFailure(caught);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId, loadDetail]);

  const selectedProgram = detail?.programa?.program || programs.find((program) => program.id === selectedId) || null;

  const run = async (action: () => Promise<void>, successMessage?: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      if (successMessage) setMessage(successMessage);
      if (selectedId) await loadDetail(selectedId);
      await refreshPrograms();
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  };

  const createProgram = async (event: React.FormEvent) => {
    event.preventDefault();
    await run(async () => {
      const response = await apiFetch<{ ok: boolean; programa: ProgramSummary }>('/api/admin/courses', {
        method: 'POST',
        body: {
          kind: createForm.kind,
          title: createForm.title,
          subtitle: createForm.subtitle || undefined,
          description: createForm.description || undefined,
          institution: createForm.institution || undefined,
          level: createForm.level || undefined,
          audience: createForm.audience || undefined,
          durationLabel: createForm.durationLabel || undefined,
          objectives: linesToArray(createForm.objectives),
          requirements: linesToArray(createForm.requirements),
          coverImageUrl: createForm.coverImageUrl || undefined,
          semesters: Number(createForm.semesters) || 0,
          n2nTemplate: createForm.n2nTemplate,
        },
      });
      setCreateForm(EMPTY_PROGRAM_FORM);
      setSelectedId(response.programa.id);
    }, 'Programa creado.');
  };

  const saveMetadata = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}`, {
        method: 'PATCH',
        body: {
          title: metadataForm.title,
          subtitle: metadataForm.subtitle || null,
          description: metadataForm.description || null,
          institution: metadataForm.institution || null,
          level: metadataForm.level || null,
          audience: metadataForm.audience || null,
          durationLabel: metadataForm.durationLabel || null,
          objectives: linesToArray(metadataForm.objectives),
          requirements: linesToArray(metadataForm.requirements),
          coverImageUrl: metadataForm.coverImageUrl || null,
          status: metadataForm.status,
          driveFolderId: metadataForm.driveFolderId || null,
          driveFolderUrl: metadataForm.driveFolderUrl || null,
        },
      });
    }, 'Ficha del programa actualizada.');
  };

  const changeStatus = async (status: 'draft' | 'published' | 'archived') => {
    if (!selectedId) return;
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}`, {
        method: 'PATCH',
        body: { status },
      });
    }, status === 'published' ? 'Programa publicado.' : `Estado cambiado a ${status}.`);
  };

  const ensureDrive = async (n2nTemplate: boolean) => {
    if (!selectedId) return;
    await run(async () => {
      const response = await apiFetch<{ ok: boolean; carpeta: { id: string; creadas: number; reutilizadas: number } }>(
        `/api/admin/courses/${selectedId}/drive`,
        { method: 'POST', body: { action: 'ensure', n2nTemplate } }
      );
      setMessage(
        `Carpeta de Drive verificada. Creadas: ${response.carpeta.creadas}, reutilizadas: ${response.carpeta.reutilizadas}.`
      );
    });
  };

  const linkDrive = async () => {
    if (!selectedId || !metadataForm.driveFolderId.trim()) return;
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}/drive`, {
        method: 'POST',
        body: {
          action: 'link',
          folderId: metadataForm.driveFolderId.trim(),
          folderUrl: metadataForm.driveFolderUrl.trim() || undefined,
        },
      });
    }, 'Carpeta de Drive vinculada.');
  };

  const addModule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}/modules`, {
        method: 'POST',
        body: moduleForm,
      });
      setModuleForm({ title: '', kind: 'semester', description: '' });
    }, 'Módulo añadido.');
  };

  const saveModuleEdit = async () => {
    if (!selectedId || !editState || editState.kind !== 'module') return;
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}/modules/${editState.id}`, {
        method: 'PATCH',
        body: { title: editState.title },
      });
      setEditState(null);
    }, 'Módulo actualizado.');
  };

  const deleteModule = async (moduleId: string) => {
    if (!selectedId) return;
    if (!window.confirm('¿Eliminar este módulo y sus clases? Esta acción no se puede deshacer.')) return;
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}/modules/${moduleId}`, { method: 'DELETE' });
    }, 'Módulo eliminado.');
  };

  const addLesson = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !lessonForm.moduleId) return;
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}/lessons`, {
        method: 'POST',
        body: {
          moduleId: lessonForm.moduleId,
          title: lessonForm.title,
          videoIds: lessonForm.videoUrls.split(/\s+/).filter(Boolean),
          pagesLabel: lessonForm.pagesLabel || undefined,
          durationLabel: lessonForm.durationLabel || undefined,
          description: lessonForm.description || undefined,
        },
      });
      setLessonForm({ moduleId: lessonForm.moduleId, title: '', videoUrls: '', pagesLabel: '', durationLabel: '', description: '' });
    }, 'Clase añadida.');
  };

  const saveLessonEdit = async () => {
    if (!selectedId || !editState || editState.kind !== 'lesson') return;
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}/lessons/${editState.id}`, {
        method: 'PATCH',
        body: {
          title: editState.title,
          videoIds: editState.videoUrls.split(/\s+/).filter(Boolean),
          pagesLabel: editState.pagesLabel || null,
          durationLabel: editState.durationLabel || null,
        },
      });
      setEditState(null);
    }, 'Clase actualizada.');
  };

  const deleteLesson = async (lessonId: string) => {
    if (!selectedId) return;
    if (!window.confirm('¿Eliminar esta clase y su progreso asociado?')) return;
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}/lessons/${lessonId}`, { method: 'DELETE' });
    }, 'Clase eliminada.');
  };

  const addMaterial = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}/materials`, {
        method: 'POST',
        body: {
          kind: materialForm.driveFileId ? 'drive_file' : materialForm.kind,
          title: materialForm.title,
          url: materialForm.url || (materialForm.driveFileId ? `https://drive.google.com/file/d/${materialForm.driveFileId}/view` : undefined),
          driveFileId: materialForm.driveFileId || undefined,
          lessonId: materialForm.lessonId || undefined,
        },
      });
      setMaterialForm({ title: '', url: '', driveFileId: '', lessonId: '', kind: 'external_link' });
    }, 'Material añadido.');
  };

  const deleteMaterial = async (materialId: string) => {
    if (!selectedId) return;
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}/materials/${materialId}`, { method: 'DELETE' });
    }, 'Material eliminado.');
  };

  const previewManifest = async () => {
    if (!selectedId || !manifestFile) {
      setFailure(new Error('Selecciona un manifiesto .md, .csv, .json o .txt.'));
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const content = await manifestFile.text();
      setManifestContent(content);
      const response = await apiFetch<PreviewResponse>(`/api/admin/courses/${selectedId}/import/preview`, {
        method: 'POST',
        body: { filename: manifestFile.name, content },
      });
      setPreview(response);
      setMessage('Previsualización generada. Revisa las filas antes de confirmar.');
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  };

  const confirmManifest = async () => {
    if (!selectedId || !manifestFile || !preview) return;
    if (!window.confirm(`¿Importar ${preview.resumen.create + preview.resumen.update} clase(s)? Los errores se omitirán.`)) {
      return;
    }
    await run(async () => {
      const response = await apiFetch<{
        ok: boolean;
        resultado: { imported: number; updated: number; skipped: number; runId: string };
      }>(`/api/admin/courses/${selectedId}/import/confirm`, {
        method: 'POST',
        body: { filename: manifestFile.name, content: manifestContent, confirm: true },
      });
      setPreview(null);
      setMessage(
        `Importación completada: ${response.resultado.imported} creadas, ${response.resultado.updated} actualizadas, ${response.resultado.skipped} omitidas.`
      );
    });
  };

  const importDocument = async () => {
    if (!selectedId || !documentFile) {
      setFailure(new Error('Selecciona un documento PDF, DOCX, TXT o MD.'));
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const base64 = await fileToBase64(documentFile);
      const response = await apiFetch<{ ok: boolean; documento: Record<string, unknown> }>(
        `/api/admin/courses/${selectedId}/import/document`,
        {
          method: 'POST',
          body: {
            filename: documentFile.name,
            base64,
            mimeType: documentFile.type || undefined,
            visibility: documentStaffOnly ? 'staff' : 'student',
          },
        }
      );
      setDocumentResult(response.documento);
      setMessage('Documento procesado. El texto quedó registrado como material del programa.');
      await loadDetail(selectedId);
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  };

  const createReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}/reviews`, {
        method: 'POST',
        body: {
          title: reviewForm.title,
          weekLabel: reviewForm.weekLabel,
          contentMd: reviewForm.contentMd,
          moduleId: reviewForm.moduleId || undefined,
          isAiGenerated: reviewForm.isAiGenerated,
          status: reviewForm.publish ? 'published' : 'draft',
        },
      });
      setReviewForm({ title: '', weekLabel: '', moduleId: reviewForm.moduleId, contentMd: '', isAiGenerated: true, publish: false });
    }, reviewForm.publish ? 'Repaso publicado.' : 'Repaso guardado como borrador.');
  };

  const publishReview = async (reviewId: string) => {
    if (!selectedId) return;
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}/reviews/${reviewId}`, {
        method: 'PATCH',
        body: { status: 'published' },
      });
    }, 'Repaso publicado.');
  };

  const createAssessment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId) return;
    let questions: unknown = [];
    if (assessmentForm.questionsJson.trim()) {
      try {
        questions = JSON.parse(assessmentForm.questionsJson);
      } catch {
        setFailure(new Error('El JSON de preguntas no es válido.'));
        return;
      }
    }
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}/assessments`, {
        method: 'POST',
        body: {
          title: assessmentForm.title,
          kind: assessmentForm.kind,
          moduleId: assessmentForm.moduleId || undefined,
          origin: assessmentForm.origin,
          attemptsAllowed: Number(assessmentForm.attemptsAllowed) || 1,
          timeLimitMinutes: assessmentForm.timeLimitMinutes ? Number(assessmentForm.timeLimitMinutes) : null,
          opensAt: assessmentForm.opensAt || null,
          closesAt: assessmentForm.closesAt || null,
          questions,
        },
      });
      setAssessmentForm({
        title: '',
        kind: 'midterm',
        moduleId: assessmentForm.moduleId,
        origin: 'generated',
        attemptsAllowed: '1',
        timeLimitMinutes: '',
        opensAt: '',
        closesAt: '',
        questionsJson: '',
      });
    }, 'Evaluación creada como borrador. Revisa la auditoría antes de publicar.');
  };

  const publishAssessment = async (assessmentId: string) => {
    if (!selectedId) return;
    await run(async () => {
      await apiFetch(`/api/admin/courses/${selectedId}/assessments/${assessmentId}/publish`, {
        method: 'POST',
      });
    }, 'Evaluación publicada después de aprobar la auditoría.');
  };

  const loadAssessmentReview = async (assessmentId: string) => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch<{
        ok: boolean;
        assessment: { id: string; title: string; status: string; version: number; origin: string };
        questions: Array<{
          id: string;
          type: string;
          prompt: string;
          options: Array<{ id: string; label: string }>;
          correct_key: string;
          source_ref: string | null;
          review_state: string;
        }>;
        audit: { ok: boolean; issues: Array<{ code: string; message: string }>; counts: { total: number; trueFalse: number; multipleChoice: number } };
      }>(`/api/admin/courses/${selectedId}/assessments/${assessmentId}`);
      setAssessmentReview({
        assessment: response.assessment,
        questions: response.questions,
        audit: response.audit,
      });
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  };

  const syncReports = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await apiFetch<{
        ok: boolean;
        resultado: { synced: number; failed: number; skipped: number; errors: string[] };
      }>(`/api/admin/courses/${selectedId}/reports/sync`, { method: 'POST' });
      setMessage(
        `Informes sincronizados con Drive: ${response.resultado.synced}, fallidos: ${response.resultado.failed}. ${
          response.resultado.errors[0] || ''
        }`
      );
      await loadReports();
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  };

  const loadReports = async () => {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch<{
        ok: boolean;
        agregados: Array<{ assessmentId: string; title: string; attempts: number; average: number; min: number; max: number }>;
        intentos: Array<{
          id: string;
          studentName: string;
          assessmentTitle: string;
          percentage: number | null;
          submittedAt: string | null;
          driveStatus: string;
        }>;
      }>(`/api/admin/courses/${selectedId}/reports`);
      setReports(response);
    } catch (caught) {
      setFailure(caught);
    } finally {
      setBusy(false);
    }
  };

  const modules = detail?.programa?.modules || [];
  const reviews = detail?.programa?.reviews || [];
  const materials = detail?.programa?.materials || [];
  const assessments = detail?.evaluaciones || [];
  const importaciones = detail?.importaciones || [];

  const assessmentQuestionSummary = useMemo(() => {
    if (!assessmentForm.questionsJson.trim()) return 'Sin preguntas todavía.';
    try {
      const parsed = JSON.parse(assessmentForm.questionsJson);
      if (!Array.isArray(parsed)) return 'El JSON debe ser una lista de preguntas.';
      return `${parsed.length} pregunta(s) detectada(s) en el JSON.`;
    } catch {
      return 'JSON inválido.';
    }
  }, [assessmentForm.questionsJson]);

  return (
    <div style={{ display: 'grid', gap: '1rem', fontFamily: 'var(--wa-font-sans)' }}>
      <div className="wa-cw-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <span className="wa-cw-eyebrow">Administración académica</span>
            <h2 style={{ fontFamily: 'var(--wa-font-display)', margin: '0.25rem 0 0.25rem' }}>Cursos y Talleres</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Fichas, semestres, clases, videos, materiales, repasos y evaluaciones con claves privadas.
            </p>
          </div>
          {selectedProgram && (
            <Link className="wa-cw-button secondary" href={`/cursos/${selectedProgram.slug}?from=crm`}>
              Vista previa del estudiante
            </Link>
          )}
        </div>
        {message && <div className="wa-cw-notice success" style={{ marginTop: '0.75rem' }}>{message}</div>}
        {error && <div className="wa-cw-notice danger" style={{ marginTop: '0.75rem' }}>{error}</div>}
        {loading && <div className="wa-cw-notice" style={{ marginTop: '0.75rem' }}>Cargando programas…</div>}
      </div>

      <div className="wa-cw-admin-grid">
        <section className="wa-cw-card">
          <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Programas existentes</h3>
          <div className="wa-cw-admin-list">
            {programs.map((program) => (
              <button
                key={program.id}
                type="button"
                className="wa-cw-admin-row"
                onClick={() => setSelectedId(program.id)}
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderColor: program.id === selectedId ? 'var(--brand-primary)' : 'var(--border-subtle)',
                }}
              >
                <span>
                  <strong>{program.title}</strong>
                  <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                    {program.kind === 'course' ? 'Curso' : 'Taller'} · {program.moduleCount} módulos · {program.lessonCount} clases
                  </span>
                </span>
                <span className={`wa-cw-pill ${program.status}`}>{program.status}</span>
              </button>
            ))}
            {!programs.length && !loading && (
              <div className="wa-cw-notice">Aún no hay cursos ni talleres creados.</div>
            )}
          </div>
        </section>

        <section className="wa-cw-card">
          <h3 style={{ marginTop: 0, fontSize: '1rem' }}>Crear curso o taller</h3>
          <form className="wa-cw-form" onSubmit={createProgram}>
            <label>
              Tipo
              <select
                value={createForm.kind}
                onChange={(event) => setCreateForm({ ...createForm, kind: event.target.value as 'course' | 'workshop' })}
              >
                <option value="course">Curso</option>
                <option value="workshop">Taller</option>
              </select>
            </label>
            <label>
              Título
              <input
                required
                value={createForm.title}
                onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })}
                placeholder="Título exacto respaldado por los materiales"
              />
            </label>
            <label>
              Institución o autor
              <input
                value={createForm.institution}
                onChange={(event) => setCreateForm({ ...createForm, institution: event.target.value })}
              />
            </label>
            <label>
              Descripción
              <textarea
                value={createForm.description}
                onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })}
              />
            </label>
            {createForm.kind === 'course' && (
              <>
                <label>
                  Semestres o módulos iniciales
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={createForm.semesters}
                    onChange={(event) => setCreateForm({ ...createForm, semesters: event.target.value })}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={createForm.n2nTemplate}
                    onChange={(event) => setCreateForm({ ...createForm, n2nTemplate: event.target.checked })}
                    style={{ width: 'auto' }}
                  />
                  Plantilla N2N de 10 semestres (solo estructura, sin contenidos inventados)
                </label>
              </>
            )}
            <button type="submit" className="wa-cw-button primary" disabled={busy}>
              Crear programa
            </button>
          </form>
        </section>
      </div>

      {selectedId && !detail && !loading && (
        <div className="wa-cw-notice">Cargando ficha del programa y sus materiales…</div>
      )}

      {selectedProgram && detail && (
        <>
          <section className="wa-cw-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>{selectedProgram.title}</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {selectedProgram.kind === 'course' ? 'Curso' : 'Taller'} · slug <code>{selectedProgram.slug}</code>
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {selectedProgram.status !== 'published' && (
                  <button type="button" className="wa-cw-button primary" onClick={() => changeStatus('published')} disabled={busy}>
                    Publicar
                  </button>
                )}
                {selectedProgram.status === 'published' && (
                  <button type="button" className="wa-cw-button secondary" onClick={() => changeStatus('draft')} disabled={busy}>
                    Despublicar
                  </button>
                )}
                {selectedProgram.status !== 'archived' && (
                  <button type="button" className="wa-cw-button danger" onClick={() => changeStatus('archived')} disabled={busy}>
                    Archivar
                  </button>
                )}
              </div>
            </div>

            <form className="wa-cw-form" onSubmit={saveMetadata} style={{ marginTop: '1rem' }}>
              <div className="wa-cw-admin-grid">
                <label>
                  Título
                  <input value={metadataForm.title} onChange={(event) => setMetadataForm({ ...metadataForm, title: event.target.value })} required />
                </label>
                <label>
                  Subtítulo
                  <input value={metadataForm.subtitle} onChange={(event) => setMetadataForm({ ...metadataForm, subtitle: event.target.value })} />
                </label>
                <label>
                  Institución / autor
                  <input value={metadataForm.institution} onChange={(event) => setMetadataForm({ ...metadataForm, institution: event.target.value })} />
                </label>
                <label>
                  Nivel
                  <input value={metadataForm.level} onChange={(event) => setMetadataForm({ ...metadataForm, level: event.target.value })} />
                </label>
                <label>
                  Duración estimada
                  <input value={metadataForm.durationLabel} onChange={(event) => setMetadataForm({ ...metadataForm, durationLabel: event.target.value })} />
                </label>
                <label>
                  Estado
                  <select
                    value={metadataForm.status}
                    onChange={(event) => setMetadataForm({ ...metadataForm, status: event.target.value as 'draft' | 'published' | 'archived' })}
                  >
                    <option value="draft">Borrador</option>
                    <option value="published">Publicado</option>
                    <option value="archived">Archivado</option>
                  </select>
                </label>
              </div>
              <label>
                Descripción
                <textarea value={metadataForm.description} onChange={(event) => setMetadataForm({ ...metadataForm, description: event.target.value })} />
              </label>
              <label>
                Destinatarios
                <textarea value={metadataForm.audience} onChange={(event) => setMetadataForm({ ...metadataForm, audience: event.target.value })} />
              </label>
              <div className="wa-cw-admin-grid">
                <label>
                  Objetivos de aprendizaje (uno por línea)
                  <textarea value={metadataForm.objectives} onChange={(event) => setMetadataForm({ ...metadataForm, objectives: event.target.value })} />
                </label>
                <label>
                  Requisitos previos (uno por línea)
                  <textarea value={metadataForm.requirements} onChange={(event) => setMetadataForm({ ...metadataForm, requirements: event.target.value })} />
                </label>
              </div>
              <label>
                URL de portada (opcional)
                <input value={metadataForm.coverImageUrl} onChange={(event) => setMetadataForm({ ...metadataForm, coverImageUrl: event.target.value })} />
              </label>
              <button type="submit" className="wa-cw-button primary" disabled={busy}>
                Guardar ficha
              </button>
            </form>
          </section>

          <section className="wa-cw-card">
            <h3 style={{ marginTop: 0 }}>Google Drive</h3>
            {selectedProgram.driveFolderUrl ? (
              <p style={{ fontSize: '0.85rem' }}>
                Carpeta vinculada:{' '}
                <a href={selectedProgram.driveFolderUrl} target="_blank" rel="noopener noreferrer">
                  {selectedProgram.driveFolderId}
                </a>
              </p>
            ) : (
              <p className="wa-cw-notice">Este programa todavía no tiene una carpeta de Drive vinculada.</p>
            )}
            <div className="wa-cw-actions">
              <button
                type="button"
                className="wa-cw-button primary"
                onClick={() => ensureDrive(selectedProgram.title.toLowerCase().includes('n2n'))}
                disabled={busy}
              >
                Crear / verificar estructura en Drive
              </button>
            </div>
            <div className="wa-cw-form" style={{ marginTop: '0.75rem' }}>
              <label>
                O vincular una carpeta existente por ID
                <input
                  value={metadataForm.driveFolderId}
                  onChange={(event) => setMetadataForm({ ...metadataForm, driveFolderId: event.target.value })}
                  placeholder="ID de carpeta de Google Drive"
                />
              </label>
              <label>
                URL de la carpeta
                <input
                  value={metadataForm.driveFolderUrl}
                  onChange={(event) => setMetadataForm({ ...metadataForm, driveFolderUrl: event.target.value })}
                  placeholder="https://drive.google.com/drive/folders/..."
                />
              </label>
              <button type="button" className="wa-cw-button secondary" onClick={linkDrive} disabled={busy}>
                Vincular carpeta
              </button>
            </div>
          </section>

          <section className="wa-cw-card">
            <h3 style={{ marginTop: 0 }}>Módulos y clases</h3>
            <form className="wa-cw-form" onSubmit={addModule} style={{ marginBottom: '0.75rem' }}>
              <div className="wa-cw-admin-grid">
                <label>
                  Título del módulo / semestre
                  <input value={moduleForm.title} onChange={(event) => setModuleForm({ ...moduleForm, title: event.target.value })} required />
                </label>
                <label>
                  Tipo
                  <select
                    value={moduleForm.kind}
                    onChange={(event) => setModuleForm({ ...moduleForm, kind: event.target.value as 'semester' | 'module' | 'unit' })}
                  >
                    <option value="semester">Semestre</option>
                    <option value="module">Módulo</option>
                    <option value="unit">Unidad / paso</option>
                  </select>
                </label>
              </div>
              <button type="submit" className="wa-cw-button secondary" disabled={busy}>
                Añadir módulo
              </button>
            </form>

            <div className="wa-cw-admin-list">
              {modules.map((module) => (
                <div key={module.id} className="wa-cw-card" style={{ padding: '0.75rem' }}>
                  <div className="wa-cw-admin-row" style={{ border: 0, padding: 0 }}>
                    {editState?.kind === 'module' && editState.id === module.id ? (
                      <div style={{ display: 'flex', gap: '0.4rem', flex: 1 }}>
                        <input
                          value={editState.title}
                          onChange={(event) => setEditState({ ...editState, title: event.target.value })}
                          style={{ flex: 1 }}
                        />
                        <button type="button" className="wa-cw-button primary" onClick={saveModuleEdit} disabled={busy}>
                          Guardar
                        </button>
                        <button type="button" className="wa-cw-button ghost" onClick={() => setEditState(null)}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <strong>
                          {module.title} <span className="wa-cw-pill">{module.kind}</span>
                        </strong>
                        <span style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            type="button"
                            className="wa-cw-button ghost"
                            onClick={() => setEditState({ kind: 'module', id: module.id, title: module.title })}
                          >
                            Editar
                          </button>
                          <button type="button" className="wa-cw-button danger" onClick={() => deleteModule(module.id)}>
                            Eliminar
                          </button>
                        </span>
                      </>
                    )}
                  </div>
                  <div className="wa-cw-admin-list" style={{ marginTop: '0.4rem' }}>
                    {module.lessons.map((lesson) => (
                      <div key={lesson.id}>
                        {editState?.kind === 'lesson' && editState.id === lesson.id ? (
                          <div className="wa-cw-form" style={{ border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '0.5rem' }}>
                            <input
                              value={editState.title}
                              onChange={(event) => setEditState({ ...editState, title: event.target.value })}
                              placeholder="Título"
                            />
                            <input
                              value={editState.videoUrls}
                              onChange={(event) => setEditState({ ...editState, videoUrls: event.target.value })}
                              placeholder="URLs de YouTube separadas por espacios"
                            />
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <input
                                value={editState.pagesLabel}
                                onChange={(event) => setEditState({ ...editState, pagesLabel: event.target.value })}
                                placeholder="Páginas"
                              />
                              <input
                                value={editState.durationLabel}
                                onChange={(event) => setEditState({ ...editState, durationLabel: event.target.value })}
                                placeholder="Duración"
                              />
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button type="button" className="wa-cw-button primary" onClick={saveLessonEdit} disabled={busy}>
                                Guardar
                              </button>
                              <button type="button" className="wa-cw-button ghost" onClick={() => setEditState(null)}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="wa-cw-admin-row">
                            <span>
                              {lesson.title}
                              <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {lesson.videoIds.length} video(s)
                                {lesson.pagesLabel ? ` · páginas ${lesson.pagesLabel}` : ''}
                                {lesson.materials.length ? ` · ${lesson.materials.length} material(es)` : ''}
                              </span>
                            </span>
                            <span style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                type="button"
                                className="wa-cw-button ghost"
                                onClick={() =>
                                  setEditState({
                                    kind: 'lesson',
                                    id: lesson.id,
                                    title: lesson.title,
                                    videoUrls: lesson.videoIds.join(' '),
                                    pagesLabel: lesson.pagesLabel || '',
                                    durationLabel: lesson.durationLabel || '',
                                  })
                                }
                              >
                                Editar
                              </button>
                              <button type="button" className="wa-cw-button danger" onClick={() => deleteLesson(lesson.id)}>
                                Eliminar
                              </button>
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                    {module.lessons.length === 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin clases todavía.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form className="wa-cw-form" onSubmit={addLesson} style={{ marginTop: '1rem' }}>
              <h4 style={{ margin: 0 }}>Añadir clase</h4>
              <div className="wa-cw-admin-grid">
                <label>
                  Módulo
                  <select
                    value={lessonForm.moduleId}
                    onChange={(event) => setLessonForm({ ...lessonForm, moduleId: event.target.value })}
                    required
                  >
                    <option value="">Selecciona un módulo</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Título de la clase
                  <input value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} required />
                </label>
              </div>
              <label>
                URLs de YouTube (una o varias, separadas por espacios)
                <input
                  value={lessonForm.videoUrls}
                  onChange={(event) => setLessonForm({ ...lessonForm, videoUrls: event.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </label>
              <div className="wa-cw-admin-grid">
                <label>
                  Páginas del texto
                  <input value={lessonForm.pagesLabel} onChange={(event) => setLessonForm({ ...lessonForm, pagesLabel: event.target.value })} />
                </label>
                <label>
                  Duración
                  <input value={lessonForm.durationLabel} onChange={(event) => setLessonForm({ ...lessonForm, durationLabel: event.target.value })} />
                </label>
              </div>
              <label>
                Descripción breve
                <textarea value={lessonForm.description} onChange={(event) => setLessonForm({ ...lessonForm, description: event.target.value })} />
              </label>
              <button type="submit" className="wa-cw-button secondary" disabled={busy || !modules.length}>
                Añadir clase
              </button>
            </form>
          </section>

          <section className="wa-cw-card">
            <h3 style={{ marginTop: 0 }}>Materiales generales</h3>
            <div className="wa-cw-admin-list">
              {materials.map((material) => (
                <div key={material.id} className="wa-cw-admin-row">
                  <span>
                    {material.title}{' '}
                    <span className="wa-cw-pill">{material.kind}</span>{' '}
                    {material.visibility === 'staff' && <span className="wa-cw-pill review">privado</span>}
                  </span>
                  <span style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    {material.url && (
                      <a href={material.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem' }}>
                        Abrir
                      </a>
                    )}
                    <button type="button" className="wa-cw-button danger" onClick={() => deleteMaterial(material.id)}>
                      Eliminar
                    </button>
                  </span>
                </div>
              ))}
              {!materials.length && <div className="wa-cw-notice">Sin materiales generales registrados.</div>}
            </div>
            <form className="wa-cw-form" onSubmit={addMaterial} style={{ marginTop: '0.75rem' }}>
              <div className="wa-cw-admin-grid">
                <label>
                  Tipo de material
                  <select
                    value={materialForm.kind}
                    onChange={(event) =>
                      setMaterialForm({
                        ...materialForm,
                        kind: event.target.value as 'external_link' | 'full_text' | 'drive_file' | 'text',
                      })
                    }
                  >
                    <option value="external_link">Enlace externo</option>
                    <option value="full_text">Texto completo oficial</option>
                    <option value="drive_file">Archivo de Drive</option>
                    <option value="text">Texto interno</option>
                  </select>
                </label>
                <label>
                  Título
                  <input value={materialForm.title} onChange={(event) => setMaterialForm({ ...materialForm, title: event.target.value })} required />
                </label>
                <label>
                  URL externa (opcional)
                  <input value={materialForm.url} onChange={(event) => setMaterialForm({ ...materialForm, url: event.target.value })} />
                </label>
                <label>
                  ID de archivo en Drive (opcional)
                  <input value={materialForm.driveFileId} onChange={(event) => setMaterialForm({ ...materialForm, driveFileId: event.target.value })} />
                </label>
              </div>
              <button type="submit" className="wa-cw-button secondary" disabled={busy}>
                Añadir material
              </button>
            </form>
          </section>

          <section className="wa-cw-card">
            <h3 style={{ marginTop: 0 }}>Importar manifiesto de videos</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Formatos: Markdown, CSV, JSON o TXT. La previsualización no modifica el programa; la
              confirmación explícita crea o actualiza clases sin duplicarlas.
            </p>
            <div className="wa-cw-actions" style={{ marginTop: 0 }}>
              <input
                type="file"
                accept=".md,.markdown,.csv,.json,.txt"
                onChange={(event) => {
                  setManifestFile(event.target.files?.[0] || null);
                  setPreview(null);
                }}
              />
              <button type="button" className="wa-cw-button secondary" onClick={previewManifest} disabled={busy || !manifestFile}>
                Previsualizar
              </button>
              <button type="button" className="wa-cw-button primary" onClick={confirmManifest} disabled={busy || !preview}>
                Confirmar importación
              </button>
            </div>
            {preview && (
              <div style={{ marginTop: '0.75rem', overflowX: 'auto' }}>
                <div className="wa-cw-notice">
                  Formato {preview.formato}: {preview.resumen.total} registros, {preview.resumen.create} por crear,{' '}
                  {preview.resumen.update} por actualizar, {preview.resumen.errors} error(es), {preview.resumen.warnings} advertencia(s).
                </div>
                <table className="wa-cw-table">
                  <thead>
                    <tr>
                      <th>Semestre</th>
                      <th>Clase</th>
                      <th>Título</th>
                      <th>Acción</th>
                      <th>Videos</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.filas.map((row, index) => (
                      <tr key={index}>
                        <td>{row.semester ?? '—'}</td>
                        <td>{row.lessonNumber ?? '—'}</td>
                        <td>{row.title || '—'}</td>
                        <td>
                          <span className={`wa-cw-pill ${row.action === 'error' ? 'review' : row.action === 'update' ? 'draft' : 'published'}`}>
                            {row.action}
                          </span>
                        </td>
                        <td>{row.videoIds.length}</td>
                        <td>{row.message || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.errores.length > 0 && (
                  <details style={{ marginTop: '0.5rem' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>Errores detectados ({preview.errores.length})</summary>
                    <ul style={{ fontSize: '0.78rem', color: '#991B1B' }}>
                      {preview.errores.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
            {importaciones.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>Importaciones recientes</h4>
                {importaciones.map((run) => (
                  <div key={run.id} className="wa-cw-admin-row">
                    <span>
                      {run.filename} <span className="wa-cw-pill">{run.kind}</span>
                    </span>
                    <a href={`/api/admin/courses/${selectedId}/import/runs/${run.id}/report?download=1`} style={{ fontSize: '0.72rem' }}>
                      Descargar informe
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="wa-cw-card">
            <h3 style={{ marginTop: 0 }}>Importar documento (PDF, DOCX, TXT, MD)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Se extrae el texto y se registra como material del programa. Si Drive está disponible, el
              original se sube a la carpeta de gestión documental; si falla, el texto importado no se pierde.
            </p>
            <div className="wa-cw-actions" style={{ marginTop: 0 }}>
              <input
                type="file"
                accept=".pdf,.docx,.txt,.md,.markdown"
                onChange={(event) => {
                  setDocumentFile(event.target.files?.[0] || null);
                  setDocumentResult(null);
                }}
              />
              <label style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', fontSize: '0.78rem' }}>
                <input
                  type="checkbox"
                  checked={documentStaffOnly}
                  onChange={(event) => setDocumentStaffOnly(event.target.checked)}
                  style={{ width: 'auto' }}
                />
                Documento oficial de examen: privado, no visible para estudiantes
              </label>
              <button type="button" className="wa-cw-button secondary" onClick={importDocument} disabled={busy || !documentFile}>
                Procesar documento
              </button>
            </div>
            {documentResult && (
              <div className="wa-cw-notice success" style={{ marginTop: '0.75rem' }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.72rem' }}>
                  {JSON.stringify(documentResult, null, 2)}
                </pre>
              </div>
            )}
          </section>

          <section className="wa-cw-card">
            <h3 style={{ marginTop: 0 }}>Repasos semanales</h3>
            <div className="wa-cw-admin-list">
              {reviews.map((review) => (
                <div key={review.id} className="wa-cw-admin-row">
                  <span>
                    <span className="wa-cw-chip" style={{ marginRight: '0.35rem' }}>{review.weekLabel}</span>
                    {review.title}
                    {review.isAiGenerated && <span className="wa-cw-pill" style={{ marginLeft: '0.35rem' }}>IA</span>}
                  </span>
                  <span style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    <span className={`wa-cw-pill ${review.status}`}>{review.status}</span>
                    {review.status !== 'published' && (
                      <button type="button" className="wa-cw-button secondary" onClick={() => publishReview(review.id)} disabled={busy}>
                        Publicar
                      </button>
                    )}
                  </span>
                </div>
              ))}
              {!reviews.length && <div className="wa-cw-notice">Sin repasos registrados.</div>}
            </div>
            <form className="wa-cw-form" onSubmit={createReview} style={{ marginTop: '0.75rem' }}>
              <div className="wa-cw-admin-grid">
                <label>
                  Semana o periodo
                  <input value={reviewForm.weekLabel} onChange={(event) => setReviewForm({ ...reviewForm, weekLabel: event.target.value })} required />
                </label>
                <label>
                  Título del repaso
                  <input value={reviewForm.title} onChange={(event) => setReviewForm({ ...reviewForm, title: event.target.value })} required />
                </label>
                <label>
                  Semestre / módulo
                  <select value={reviewForm.moduleId} onChange={(event) => setReviewForm({ ...reviewForm, moduleId: event.target.value })}>
                    <option value="">Sin módulo</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Contenido Markdown
                <textarea
                  value={reviewForm.contentMd}
                  onChange={(event) => setReviewForm({ ...reviewForm, contentMd: event.target.value })}
                  style={{ minHeight: 140 }}
                  required
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={reviewForm.isAiGenerated}
                  onChange={(event) => setReviewForm({ ...reviewForm, isAiGenerated: event.target.checked })}
                  style={{ width: 'auto' }}
                />
                Marcar como material de apoyo elaborado con IA
              </label>
              <label style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={reviewForm.publish}
                  onChange={(event) => setReviewForm({ ...reviewForm, publish: event.target.checked })}
                  style={{ width: 'auto' }}
                />
                Publicar inmediatamente
              </label>
              <button type="submit" className="wa-cw-button secondary" disabled={busy}>
                Guardar repaso
              </button>
            </form>
          </section>

          <section className="wa-cw-card">
            <h3 style={{ marginTop: 0 }}>Evaluaciones</h3>
            <div className="wa-cw-admin-list">
              {assessments.map((assessment) => (
                <div key={assessment.id} className="wa-cw-admin-row">
                  <span>
                    <strong>{assessment.title}</strong>{' '}
                    <span className="wa-cw-pill">{assessment.kind}</span>{' '}
                    <span className={`wa-cw-pill ${assessment.status}`}>{assessment.status}</span>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {assessment.questionCount} preguntas · {assessment.origin} · auditoría{' '}
                      {assessment.audit.ok ? 'aprobada' : `${assessment.audit.issues.length} incidencia(s)`}
                    </span>
                  </span>
                  <span style={{ display: 'flex', gap: '0.35rem' }}>
                    <button type="button" className="wa-cw-button secondary" onClick={() => loadAssessmentReview(assessment.id)} disabled={busy}>
                      Revisar preguntas
                    </button>
                    {assessment.status !== 'published' && assessment.audit.ok && (
                      <button type="button" className="wa-cw-button primary" onClick={() => publishAssessment(assessment.id)} disabled={busy}>
                        Publicar
                      </button>
                    )}
                    {!assessment.audit.ok && assessment.status !== 'published' && (
                      <span className="wa-cw-pill review">revisión pendiente</span>
                    )}
                  </span>
                </div>
              ))}
              {!assessments.length && <div className="wa-cw-notice">Sin evaluaciones registradas.</div>}
            </div>

            {assessmentReview && (
              <div className="wa-cw-card" style={{ marginTop: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div>
                    <h4 style={{ margin: 0 }}>
                      Revisión académica: {assessmentReview.assessment.title}
                    </h4>
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Versión {assessmentReview.assessment.version} · {assessmentReview.assessment.origin} ·{' '}
                      {assessmentReview.audit.counts.total} preguntas ({assessmentReview.audit.counts.trueFalse} V/F,{' '}
                      {assessmentReview.audit.counts.multipleChoice} selección múltiple)
                    </p>
                  </div>
                  <button type="button" className="wa-cw-button ghost" onClick={() => setAssessmentReview(null)}>
                    Cerrar revisión
                  </button>
                </div>
                <div className={`wa-cw-notice ${assessmentReview.audit.ok ? 'success' : 'danger'}`} style={{ marginTop: '0.6rem' }}>
                  {assessmentReview.audit.ok
                    ? 'Auditoría aprobada. Revisa las claves y la evidencia antes de publicar.'
                    : `Auditoría con ${assessmentReview.audit.issues.length} incidencia(s): ${assessmentReview.audit.issues
                        .map((issue) => issue.message)
                        .join(' · ')}`}
                </div>
                <div className="wa-cw-admin-list" style={{ marginTop: '0.6rem' }}>
                  {assessmentReview.questions.map((question, index) => (
                    <div key={question.id} className="wa-cw-card" style={{ padding: '0.7rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.82rem' }}>
                          {index + 1}. {question.prompt}
                        </strong>
                        <span className="wa-cw-pill">{question.type === 'true_false' ? 'V/F' : 'Selección'}</span>
                      </div>
                      <ul style={{ margin: '0.4rem 0', paddingLeft: '1.1rem', fontSize: '0.78rem' }}>
                        {question.options.map((option) => (
                          <li key={option.id} style={{ fontWeight: option.id === question.correct_key ? 800 : 400 }}>
                            {option.label}
                            {option.id === question.correct_key ? '  ← clave privada' : ''}
                          </li>
                        ))}
                      </ul>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Evidencia: {question.source_ref || 'sin fuente'} · Estado: {question.review_state}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form className="wa-cw-form" onSubmit={createAssessment} style={{ marginTop: '0.75rem' }}>
              <h4 style={{ margin: 0 }}>Crear evaluación</h4>
              <div className="wa-cw-admin-grid">
                <label>
                  Título
                  <input value={assessmentForm.title} onChange={(event) => setAssessmentForm({ ...assessmentForm, title: event.target.value })} required />
                </label>
                <label>
                  Tipo
                  <select
                    value={assessmentForm.kind}
                    onChange={(event) => setAssessmentForm({ ...assessmentForm, kind: event.target.value as 'midterm' | 'final' | 'practice' })}
                  >
                    <option value="midterm">Parcial</option>
                    <option value="final">Final</option>
                    <option value="practice">Práctica</option>
                  </select>
                </label>
                <label>
                  Origen
                  <select
                    value={assessmentForm.origin}
                    onChange={(event) => setAssessmentForm({ ...assessmentForm, origin: event.target.value as 'official' | 'generated' })}
                  >
                    <option value="generated">Generada (modelo 5 V/F + 10 selección múltiple)</option>
                    <option value="official">Oficial importada (conservar estructura)</option>
                  </select>
                </label>
                <label>
                  Semestre / módulo
                  <select value={assessmentForm.moduleId} onChange={(event) => setAssessmentForm({ ...assessmentForm, moduleId: event.target.value })}>
                    <option value="">Sin módulo</option>
                    {modules.map((module) => (
                      <option key={module.id} value={module.id}>
                        {module.title}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Intentos permitidos
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={assessmentForm.attemptsAllowed}
                    onChange={(event) => setAssessmentForm({ ...assessmentForm, attemptsAllowed: event.target.value })}
                  />
                </label>
                <label>
                  Tiempo máximo (min, opcional)
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={assessmentForm.timeLimitMinutes}
                    onChange={(event) => setAssessmentForm({ ...assessmentForm, timeLimitMinutes: event.target.value })}
                  />
                </label>
                <label>
                  Apertura (opcional)
                  <input
                    type="datetime-local"
                    value={assessmentForm.opensAt}
                    onChange={(event) => setAssessmentForm({ ...assessmentForm, opensAt: event.target.value })}
                  />
                </label>
                <label>
                  Cierre (opcional)
                  <input
                    type="datetime-local"
                    value={assessmentForm.closesAt}
                    onChange={(event) => setAssessmentForm({ ...assessmentForm, closesAt: event.target.value })}
                  />
                </label>
              </div>
              <label>
                Preguntas en JSON (sin publicar claves en ningún archivo del estudiante)
                <textarea
                  value={assessmentForm.questionsJson}
                  onChange={(event) => setAssessmentForm({ ...assessmentForm, questionsJson: event.target.value })}
                  style={{ minHeight: 160, fontFamily: 'var(--wa-font-mono, monospace)', fontSize: '0.75rem' }}
                  placeholder={`[
  {
    "type": "true_false",
    "prompt": "Enunciado verificable",
    "correctKey": "true",
    "sourceRef": "Archivo, página o clase que sustenta la clave"
  },
  {
    "type": "multiple_choice",
    "prompt": "Enunciado verificable",
    "options": [
      { "id": "a", "label": "Opción A" },
      { "id": "b", "label": "Opción B" },
      { "id": "c", "label": "Opción C" }
    ],
    "correctKey": "b",
    "sourceRef": "Archivo, página o clase que sustenta la clave"
  }
]`}
                />
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{assessmentQuestionSummary}</span>
              <button type="submit" className="wa-cw-button secondary" disabled={busy}>
                Crear evaluación como borrador
              </button>
            </form>
          </section>

          <section className="wa-cw-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Informes y agregados</h3>
              <button type="button" className="wa-cw-button secondary" onClick={loadReports} disabled={busy}>
                Cargar informes
              </button>
              <button type="button" className="wa-cw-button primary" onClick={syncReports} disabled={busy}>
                Sincronizar informes pendientes a Drive
              </button>
            </div>
            {reports && (
              <>
                <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
                  <table className="wa-cw-table">
                    <thead>
                      <tr>
                        <th>Evaluación</th>
                        <th>Intentos</th>
                        <th>Promedio</th>
                        <th>Mínimo</th>
                        <th>Máximo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.agregados.map((row) => (
                        <tr key={row.assessmentId}>
                          <td>{row.title}</td>
                          <td>{row.attempts}</td>
                          <td>{row.average.toFixed(2)}</td>
                          <td>{row.min.toFixed(2)}</td>
                          <td>{row.max.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
                  <table className="wa-cw-table">
                    <thead>
                      <tr>
                        <th>Estudiante</th>
                        <th>Evaluación</th>
                        <th>Calificación</th>
                        <th>Fecha</th>
                        <th>Copia Drive</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.intentos.map((row) => (
                        <tr key={row.id}>
                          <td>{row.studentName}</td>
                          <td>{row.assessmentTitle}</td>
                          <td>{row.percentage === null ? '—' : `${row.percentage.toFixed(2)} %`}</td>
                          <td>{row.submittedAt ? new Date(row.submittedAt).toLocaleString('es-EC') : '—'}</td>
                          <td>{row.driveStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
};

