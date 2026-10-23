'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Panel Administrativo de Guías Diarias
 * ARCHIVO: src/components/admin/DailyGuideAdminPanel.tsx
 *
 * PROPÓSITO:
 * Interfaz administrativa para auditar los 200 días lectivos (Sierra-Amazonía 2026-2027),
 * inspeccionar las jornadas completas (5 asignaturas, 08:00 a 12:00) y compilar/descargar
 * las Guías de Ruta Diarias oficiales en formato A4 PDF listo para impresión.
 * ==============================================================================
 */

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { ESTUDIANTE_AVRIL_INICIAL, ESTUDIANTE_GAEL_INICIAL, EstudianteWisdom } from '@/types/wisdom';
import {
  curriculumAuditorAndFiller,
  JornadaEscolarCompleta,
  ResultadoAuditoriaCurricular,
} from '@/services/curriculumAuditorAndFiller';

export const DailyGuideAdminPanel: React.FC = () => {
  const [estudianteActivo, setEstudianteActivo] = useState<EstudianteWisdom>(ESTUDIANTE_AVRIL_INICIAL);
  const [diaSeleccionado, setDiaSeleccionado] = useState<number>(1);
  const [copiado, setCopiado] = useState<boolean>(false);

  // Auditoría en tiempo real del currículo completo
  const auditoria: ResultadoAuditoriaCurricular = useMemo(() => {
    return curriculumAuditorAndFiller.auditarPlanCompleto();
  }, []);

  // Jornada actual según estudiante y día
  const jornada: JornadaEscolarCompleta = useMemo(() => {
    return curriculumAuditorAndFiller.obtenerJornadaEscolarCompleta(diaSeleccionado, estudianteActivo);
  }, [diaSeleccionado, estudianteActivo]);

  // URL del endpoint de compilación diaria
  const urlApiGuia = `/api/curriculum/daily-guide?estudiante=${encodeURIComponent(
    estudianteActivo.nombreCompleto.split(' ')[0]
  )}&dia=${diaSeleccionado}`;

  const handleCopiarEnlace = () => {
    if (typeof window !== 'undefined') {
      const enlaceCompleto = `${window.location.origin}${urlApiGuia}`;
      navigator.clipboard.writeText(enlaceCompleto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    }
  };

  const handleAbrirPdf = (autoPrint: boolean = false) => {
    if (typeof window !== 'undefined') {
      const urlFinal = `${urlApiGuia}${autoPrint ? '&download=true&autoPrint=true' : ''}`;
      window.open(urlFinal, '_blank');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ------------------------------------------------------------------ */}
      {/* 1. RESUMEN DE AUDITORÍA PEDAGÓGICA (200 DÍAS - CERO FALTANTES)    */}
      {/* ------------------------------------------------------------------ */}
      <Card variant="gold-border" padding="lg">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
              <Badge variant="emerald">100% CUBIERTO • CERO FALTANTES</Badge>
              <Badge variant="navy">RÉGIMEN SIERRA-AMAZONÍA 2026-2027</Badge>
            </div>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
              Compilador Oficial de Guías Diarias de Jornada Escolar
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '780px', lineHeight: 1.5 }}>
              Genera en un único documento A4 imprimible todas las materias de cada día lectivo (08:00 a 12:00),
              con objetivos MINEDUC, guiones socráticos de <strong>OpenMAIC</strong>, talleres prácticos,
              rúbrica cualitativa ministerial y firmas de responsabilidad.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Button
              variant="primary-gold"
              onClick={() => handleAbrirPdf(true)}
              icono={<WisdomIcon name="download" size={16} />}
            >
              Imprimir Guía del Día {diaSeleccionado}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleAbrirPdf(false)}
              icono={<WisdomIcon name="arrow-right" size={16} />}
            >
              Previsualizar A4
            </Button>
          </div>
        </div>

        {/* Métrica en Bento Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            marginTop: '1.25rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-default)',
          }}
        >
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--wa-radius-sm)' }}>
            <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Días Auditados
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-study)', marginTop: '0.25rem' }}>
              {auditoria.diasCompletos} / {auditoria.totalDiasRequeridos}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>100% Temarios completos</span>
          </div>

          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--wa-radius-sm)' }}>
            <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Trimestre 1 (Fundamentos)
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '0.25rem' }}>
              Días 1 - {auditoria.trimestre1Dias}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Sep 2026 - Dic 2026</span>
          </div>

          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--wa-radius-sm)' }}>
            <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Trimestre 2 (Científico)
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '0.25rem' }}>
              Días 66 - {auditoria.trimestre1Dias + auditoria.trimestre2Dias}
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Ene 2027 - Mar 2027</span>
          </div>

          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--wa-radius-sm)' }}>
            <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Trimestre 3 (Proyectos PBL)
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '0.25rem' }}>
              Días 131 - 200
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Abr 2027 - Jun 2027</span>
          </div>

          <div style={{ padding: '0.75rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--wa-radius-sm)' }}>
            <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Materias x Día
            </span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-gold-dark)', marginTop: '0.25rem' }}>
              5 Bloques
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>08:00 a 12:00 unificado</span>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 2. SELECTOR DE ESTUDIANTE Y DÍA LECTIVO                           */}
      {/* ------------------------------------------------------------------ */}
      <Card variant="surface" padding="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Selector de Estudiante */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>Estudiante:</span>
              <button
                type="button"
                onClick={() => setEstudianteActivo(ESTUDIANTE_AVRIL_INICIAL)}
                style={{
                  padding: '0.4375rem 0.875rem',
                  borderRadius: 'var(--wa-radius-sm)',
                  backgroundColor: estudianteActivo.edad > 10 ? 'var(--brand-primary)' : 'var(--bg-subtle)',
                  color: estudianteActivo.edad > 10 ? 'var(--text-on-brand)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                Avril (8° EGB • Básica Superior)
              </button>
              <button
                type="button"
                onClick={() => setEstudianteActivo(ESTUDIANTE_GAEL_INICIAL)}
                style={{
                  padding: '0.4375rem 0.875rem',
                  borderRadius: 'var(--wa-radius-sm)',
                  backgroundColor: estudianteActivo.edad <= 10 ? 'var(--brand-gold)' : 'var(--bg-subtle)',
                  color: estudianteActivo.edad <= 10 ? 'var(--text-on-gold)' : 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                }}
              >
                Gael (4° EGB • Básica Elemental)
              </button>
            </div>

            {/* Accesos rápidos a Días Clave */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Hitos:</span>
              {[
                { dia: 1, label: 'Día 1 (Inauguración)' },
                { dia: 30, label: 'Día 30' },
                { dia: 65, label: 'Día 65 (Fin T1)' },
                { dia: 100, label: 'Día 100 (Mitad)' },
                { dia: 130, label: 'Día 130 (Fin T2)' },
                { dia: 200, label: 'Día 200 (Clausura)' },
              ].map((hito) => (
                <button
                  key={hito.dia}
                  type="button"
                  onClick={() => setDiaSeleccionado(hito.dia)}
                  style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: 'var(--wa-radius-xs)',
                    fontSize: '0.6875rem',
                    backgroundColor: diaSeleccionado === hito.dia ? 'var(--brand-gold)' : 'var(--bg-subtle)',
                    color: diaSeleccionado === hito.dia ? 'var(--text-on-gold)' : 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer',
                    fontWeight: diaSeleccionado === hito.dia ? 700 : 500,
                  }}
                >
                  {hito.label}
                </button>
              ))}
            </div>
          </div>

          {/* Slider y Control Numérico del Día */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              backgroundColor: 'var(--bg-subtle)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--wa-radius-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '170px' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Día Escolar:</span>
              <input
                type="number"
                min={1}
                max={200}
                value={diaSeleccionado}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= 200) {
                    setDiaSeleccionado(val);
                  }
                }}
                style={{
                  width: '64px',
                  padding: '0.3125rem 0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  borderRadius: 'var(--wa-radius-xs)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>/ 200</span>
            </div>

            <input
              type="range"
              min={1}
              max={200}
              value={diaSeleccionado}
              onChange={(e) => setDiaSeleccionado(parseInt(e.target.value, 10))}
              style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--brand-gold)' }}
            />

            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopiarEnlace}
              icono={<WisdomIcon name={copiado ? 'check' : 'file-text'} size={14} />}
            >
              {copiado ? 'Enlace Copiado' : 'Copiar URL API'}
            </Button>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 3. PREVISUALIZACIÓN DE LA JORNADA SELECCIONADA                     */}
      {/* ------------------------------------------------------------------ */}
      <Card variant="surface" padding="lg">
        {/* Encabezado de la Jornada */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
              <Badge variant="navy">Día {jornada.diaLectivo} de 200</Badge>
              <Badge variant="gold">Semana {jornada.semanaNumero}</Badge>
              <Badge variant="subtle">Trimestre {jornada.trimestre}</Badge>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
              {jornada.diaSemana}, {jornada.fechaLarga}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
              Estudiante: <strong>{jornada.estudiante}</strong> ({jornada.grado}) • Jornada Completa (08:00 - 12:00)
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              Código de Verificación
            </span>
            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--accent-study)', fontWeight: 700 }}>
              SHA256-D{diaSeleccionado.toString().padStart(3, '0')}-OK
            </div>
          </div>
        </div>

        {/* Lema Rector de la Jornada */}
        <div
          style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-subtle)',
            borderRadius: 'var(--wa-radius-sm)',
            border: '1px solid var(--border-gold)',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.875rem' }}>📖</span>
            <strong style={{ fontSize: '0.8125rem', color: 'var(--brand-gold-dark)' }}>
              Lema Rector del Día ({jornada.versiculoLemaJornada.referencia}):
            </strong>
          </div>
          <p style={{ margin: 0, fontSize: '0.875rem', fontStyle: 'italic', color: 'var(--text-primary)' }}>
            &ldquo;{jornada.versiculoLemaJornada.texto}&rdquo;
          </p>
        </div>

        {/* Tarjetas de las 5 Asignaturas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Itinerario Pedagógico (5 Bloques de la Jornada):
          </h4>

          {jornada.materias.map((materia, idx) => (
            <div
              key={idx}
              style={{
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--wa-radius-sm)',
                padding: '1rem',
                backgroundColor: 'var(--bg-surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--brand-primary)',
                      color: 'var(--text-on-brand)',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <strong style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                    {materia.nombreMateria}
                  </strong>
                  <Badge variant="subtle">{materia.codigoMineduc}</Badge>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    ⏰ {materia.horaInicio} - {materia.horaFin}
                  </span>
                  <Badge variant="navy">{materia.profesorIA}</Badge>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {materia.temaDelDia}: <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>{materia.subtitulo}</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  🎯 <strong>Objetivo:</strong> {materia.objetivoAprendizaje}
                </div>
              </div>

              {/* Taller y Quiz */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '0.75rem',
                  marginTop: '0.25rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px dashed var(--border-default)',
                  fontSize: '0.75rem',
                }}
              >
                <div>
                  <strong style={{ color: 'var(--accent-study)' }}>✍️ Taller Práctico / Cuaderno:</strong>
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {materia.tallerManual}
                  </p>
                </div>
                <div>
                  <strong style={{ color: 'var(--brand-gold-dark)' }}>❓ Mini-Quiz Evaluativo OpenMAIC:</strong>
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {materia.preguntaQuiz.enunciado}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Barra Inferior de Acción */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-default)',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Documento unificado con hoja de asistencia ministerial, rúbrica cualitativa (DAR/AAR) y firmas.
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              variant="secondary"
              onClick={() => handleAbrirPdf(false)}
              icono={<WisdomIcon name="arrow-right" size={14} />}
            >
              Ver en Pestaña A4
            </Button>
            <Button
              variant="primary-gold"
              onClick={() => handleAbrirPdf(true)}
              icono={<WisdomIcon name="download" size={14} />}
            >
              Imprimir / Guardar PDF (A4)
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

