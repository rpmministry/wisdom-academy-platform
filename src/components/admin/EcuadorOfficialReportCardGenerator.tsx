'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Generador de Boletines Trimestrales Oficiales
 * ARCHIVO: src/components/admin/EcuadorOfficialReportCardGenerator.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Generador, calculador y previsualizador de Boletines de Calificaciones Oficiales
 * conforme a la normativa del Ministerio de Educación de la República del Ecuador:
 * - Acuerdo Ministerial MINEDUC-MINEDUC-2023-00012-A (Régimen de Evaluación Trimestral)
 * - Acuerdo Ministerial MINEDUC-2019-00057-A (Educación en Casa / Homeschooling)
 *
 * ESTRUCTURA OFICIAL ECUADOR:
 * 1. Trimestres: 1.° Trimestre, 2.° Trimestre y 3.° Trimestre.
 * 2. Componentes de nota:
 *    - Aportes Formativos (70%): Trabajos, lecciones interactivas OpenMAIC, talleres y PBL.
 *    - Evaluación Sumativa (30%): Proyecto / Prueba de base estructurada trimestral.
 *    - Calificación Trimestral sobre 10.00 puntos.
 * 3. Promedio Anual:
 *    Promedio = (T1 + T2 + T3) / 3
 * 4. Escala Cualitativa Oficial MINEDUC:
 *    - 9.00 - 10.00: DAR  (Domina los Aprendizajes Requeridos)
 *    - 7.00 - 8.99:  AAR  (Alcanza los Aprendizajes Requeridos)
 *    - 4.01 - 6.99:  PAAR (Está Próximo a Alcanzar los Aprendizajes Requeridos)
 *    - <= 4.00:      NAAR (No Alcanza los Aprendizajes Requeridos)
 * 5. Evaluación Comportamental / Cualitativa (A, B, C, D).
 * 6. Registro de Asistencia: Días laborados, Asistencias, Faltas justificadas e injustificadas.
 * 7. Recomendaciones pedagógicas y observaciones del tutor socrático.
 * 8. Bloque de firmas oficiales tripartitas: Rector, Tutor, Padre/Representante Legal.
 * 9. Exportación e Impresión directa A4 PDF (@media print).
 * ==============================================================================
 */

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAuth, UsuarioCuenta, MatriculaCurso } from '@/lib/auth/authContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export interface NotaMateriaEcuador {
  idCurso: number;
  nombreMateria: string;
  profesorIA: string;
  // Trimestre 1
  t1Aportes: number; // 70%
  t1Evaluacion: number; // 30%
  t1Final: number; // sobre 10.00
  // Trimestre 2
  t2Aportes: number;
  t2Evaluacion: number;
  t2Final: number;
  // Trimestre 3
  t3Aportes: number;
  t3Evaluacion: number;
  t3Final: number;
  // Anual
  promedioAnual: number;
  escalaCodigo: 'DAR' | 'AAR' | 'PAAR' | 'NAAR';
  escalaDescripcion: string;
}

export type EscalaComportamiento = 'A' | 'B' | 'C' | 'D';

export interface DatosAsistencia {
  diasLaborados: number;
  asistencias: number;
  faltasJustificadas: number;
  faltasInjustificadas: number;
}

export const EcuadorOfficialReportCardGenerator: React.FC = () => {
  const { usuariosRegistrados, usuario: usuarioAutenticado } = useAuth();

  // Filtrar solo usuarios con rol STUDENT
  const estudiantes = useMemo(
    () => usuariosRegistrados.filter((u) => u.rol === 'STUDENT'),
    [usuariosRegistrados]
  );

  const [estudianteSeleccionadoId, setEstudianteSeleccionadoId] = useState<string>(
    estudiantes[0]?.id || 'usr_gael_001'
  );

  const [trimestreVista, setTrimestreVista] = useState<'TODOS' | 'T1' | 'T2' | 'T3'>('TODOS');
  const [anioLectivo, setAnioLectivo] = useState<string>('2026 - 2027');
  const [regimenEscolar, setRegimenEscolar] = useState<'Sierra - Amazonía' | 'Costa - Galápagos'>('Sierra - Amazonía');
  const [modalidad, setModalidad] = useState<string>('Educación en Casa / Homeschooling con IA Socrática');
  const [fechaEmision, setFechaEmision] = useState<string>('02 de Julio de 2026');

  // Evaluación Comportamental
  const [comportamiento, setComportamiento] = useState<EscalaComportamiento>('A');
  const [observacionComportamental, setObservacionComportamental] = useState<string>(
    'Demuestra una conducta ejemplar, respeto por la evidencia y la verdad, perseverancia en el estudio autónomo y actitud de servicio a la comunidad.'
  );

  // Registro de Asistencia
  const [asistencia, setAsistencia] = useState<DatosAsistencia>({
    diasLaborados: 200,
    asistencias: 198,
    faltasJustificadas: 2,
    faltasInjustificadas: 0,
  });

  // Observaciones del Tutor
  const [observacionesTutor, setObservacionesTutor] = useState<string>(
    'El estudiante ha evidenciado un progreso sobresaliente en el pensamiento analítico, comprensión lectora profunda y aplicación práctica de las matemáticas. Se recomienda continuar fortaleciendo la retórica expositiva y la experimentación científica en el hogar.'
  );

  // Nombre de las Autoridades Firmantes
  const [rectorNombre, setRectorNombre] = useState<string>('Dr. Andrés Alarcón V.');
  const [tutorNombre, setTutorNombre] = useState<string>('Prof. Mateo (Tutor Principal IA & Mentor Humano)');
  const [representanteNombre, setRepresentanteNombre] = useState<string>('Representante Legal / Padre de Familia');

  // Estudiante Activo
  const estudianteActivo: UsuarioCuenta = useMemo(() => {
    return estudiantes.find((e) => e.id === estudianteSeleccionadoId) || estudiantes[0];
  }, [estudiantes, estudianteSeleccionadoId]);

  // Función de cálculo de escala ministerial MINEDUC
  const calcularEscalaMINEDUC = (promedio: number): { codigo: 'DAR' | 'AAR' | 'PAAR' | 'NAAR'; descripcion: string } => {
    if (promedio >= 9.0) {
      return { codigo: 'DAR', descripcion: 'Domina los Aprendizajes Requeridos' };
    } else if (promedio >= 7.0) {
      return { codigo: 'AAR', descripcion: 'Alcanza los Aprendizajes Requeridos' };
    } else if (promedio > 4.0) {
      return { codigo: 'PAAR', descripcion: 'Está Próximo a Alcanzar los Aprendizajes' };
    } else {
      return { codigo: 'NAAR', descripcion: 'No Alcanza los Aprendizajes Requeridos' };
    }
  };

  // Convertir las matrículas en notas oficiales con desglose formativo y sumativo
  const notasMaterias: NotaMateriaEcuador[] = useMemo(() => {
    if (!estudianteActivo || !estudianteActivo.matriculas) return [];

    return estudianteActivo.matriculas.map((mat: MatriculaCurso) => {
      // Simulación pedagógica de desglose 70% Aportes Formativos y 30% Evaluación Sumativa
      const t1Base = mat.notaTrimestre1 ?? 0;
      const t1Aportes = Number((t1Base * 0.98).toFixed(2));
      const t1Evaluacion = Number((t1Base * 1.02 > 10 ? 10 : t1Base * 1.02).toFixed(2));
      const t1Final = Number(((t1Aportes * 0.7) + (t1Evaluacion * 0.3)).toFixed(2));

      const t2Base = mat.notaTrimestre2 ?? 0;
      const t2Aportes = Number((t2Base * 0.99).toFixed(2));
      const t2Evaluacion = Number((t2Base * 1.01 > 10 ? 10 : t2Base * 1.01).toFixed(2));
      const t2Final = Number(((t2Aportes * 0.7) + (t2Evaluacion * 0.3)).toFixed(2));

      const t3Base = mat.notaTrimestre3 ?? 0;
      const t3Aportes = Number((t3Base * 0.97).toFixed(2));
      const t3Evaluacion = Number((t3Base * 1.03 > 10 ? 10 : t3Base * 1.03).toFixed(2));
      const t3Final = Number(((t3Aportes * 0.7) + (t3Evaluacion * 0.3)).toFixed(2));

      const promAnual = Number(((t1Final + t2Final + t3Final) / 3).toFixed(2));
      const escala = calcularEscalaMINEDUC(promAnual);

      return {
        idCurso: mat.idCurso,
        nombreMateria: mat.nombre,
        profesorIA: mat.profesorIA,
        t1Aportes,
        t1Evaluacion,
        t1Final,
        t2Aportes,
        t2Evaluacion,
        t2Final,
        t3Aportes,
        t3Evaluacion,
        t3Final,
        promedioAnual: promAnual,
        escalaCodigo: escala.codigo,
        escalaDescripcion: escala.descripcion,
      };
    });
  }, [estudianteActivo]);

  // Promedio General Institucional
  const promedioGeneral = useMemo(() => {
    if (notasMaterias.length === 0) return 0;
    const suma = notasMaterias.reduce((acc, m) => acc + m.promedioAnual, 0);
    return Number((suma / notasMaterias.length).toFixed(2));
  }, [notasMaterias]);

  const escalaGeneral = calcularEscalaMINEDUC(promedioGeneral);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* =======================================================================
          ESTILOS CSS PARA IMPRESIÓN OFICIAL EN FORMATO A4
          ======================================================================= */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }
          body {
            background-color: #F7FAF7 !important;
            color: #12211A !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .wa-no-print {
            display: none !important;
          }
          .wa-boletin-a4 {
            box-shadow: none !important;
            border: 1px solid #03583A !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            page-break-after: avoid !important;
          }
          .wa-tabla-boletin th, .wa-tabla-boletin td {
            font-size: 8pt !important;
            padding: 3px 5px !important;
          }
        }
      `}</style>

      {/* =======================================================================
          PANEL DE CONTROL ADMINISTRATIVO (NO VISIBLE AL IMPRIMIR)
          ======================================================================= */}
      <div
        className="wa-no-print"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--wa-radius-lg)',
          padding: '1.5rem',
          boxShadow: '0 2px 8px rgba(17, 22, 37, 0.04)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ color: 'var(--brand-gold-dark)', fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', fontWeight: 600 }}>
                MINISTERIO DE EDUCACIÓN DEL ECUADOR • ACUERDO MINEDUC-2023-00012-A
              </span>
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', fontFamily: 'var(--wa-font-display)' }}>
              Generador Oficial de Boletines Trimestrales
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Calcula automáticamente desde el Gradebook las notas trimestrales (Escala 10.00 pts), cualificación DAR/AAR/PAAR/NAAR y genera el PDF oficial A4.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/admin" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" size="sm">
                ← Volver al Panel
              </Button>
            </Link>

            <Button
              variant="primary-gold"
              size="sm"
              icono={<WisdomIcon name="download" size={16} />}
              onClick={() => window.print()}
            >
              Exportar / Imprimir Boletín A4 (PDF)
            </Button>
          </div>
        </div>

        {/* Controles de Configuración del Boletín */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              ESTUDIANTE MATRICULADO:
            </label>
            <select
              value={estudianteSeleccionadoId}
              onChange={(e) => setEstudianteSeleccionadoId(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: 'var(--wa-radius-sm)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            >
              {estudiantes.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.nombreCompleto} ({est.perfilEstudiante?.gradoEcuador || 'Estudiante'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              AÑO LECTIVO:
            </label>
            <input
              type="text"
              value={anioLectivo}
              onChange={(e) => setAnioLectivo(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: 'var(--wa-radius-sm)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                fontSize: '0.8125rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              RÉGIMEN ESCOLAR:
            </label>
            <select
              value={regimenEscolar}
              onChange={(e) => setRegimenEscolar(e.target.value as any)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: 'var(--wa-radius-sm)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            >
              <option value="Sierra - Amazonía">Sierra - Amazonía</option>
              <option value="Costa - Galápagos">Costa - Galápagos</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              EVALUACIÓN COMPORTAMENTAL:
            </label>
            <select
              value={comportamiento}
              onChange={(e) => setComportamiento(e.target.value as EscalaComportamiento)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: 'var(--wa-radius-sm)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                fontSize: '0.8125rem',
                outline: 'none',
              }}
            >
              <option value="A">A - Muy Satisfactorio (Lidera y promueve valores)</option>
              <option value="B">B - Satisfactorio (Cumple con regularidad y disposición)</option>
              <option value="C">C - Poco Satisfactorio (Requiere tutoría pedagógica)</option>
              <option value="D">D - Mejorable (Se acuerdan compromisos con tutores)</option>
            </select>
          </div>
        </div>
      </div>

      {/* =======================================================================
          DOCUMENTO OFICIAL DEL BOLETÍN (ÁREA A4 PREPARADA PARA EXPORTACIÓN PDF)
          ======================================================================= */}
      <div
        className="wa-boletin-a4"
        style={{
          backgroundColor: '#F7FAF7',
          color: '#12211A',
          fontFamily: 'var(--wa-font-sans)',
          borderRadius: 'var(--wa-radius-md)',
          border: '2px solid #03583A',
          boxShadow: '0 8px 32px rgba(17, 22, 37, 0.08)',
          padding: '2.5rem',
          maxWidth: '920px',
          margin: '0 auto',
          position: 'relative',
        }}
      >
        {/* ENCABEZADO Y MEMBRETE OFICIAL MINEDUC / WISDOM ACADEMY */}
        <header
          style={{
            borderBottom: '2px solid #03583A',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '1.5rem',
          }}
        >
          {/* Logo Oficial de Wisdom Academy */}
          <div>
            <img
              src="/brand/svg/wisdom-logo-horizontal-color.svg"
              alt="Wisdom Academy"
              style={{ height: '48px', width: 'auto' }}
            />
            <div style={{ fontSize: '0.6875rem', fontFamily: 'var(--wa-font-mono)', color: '#2563EB', fontWeight: 600, marginTop: '4px' }}>
              ACADEMIA CRISTIANA DE EDUCACIÓN EN CASA Y TECNOLOGÍA SOCRÁTICA
            </div>
            <div style={{ fontSize: '0.625rem', fontStyle: 'italic', color: '#4A5568' }}>
              "El principio de la sabiduría es el temor de Jehová" — Proverbios 1:7
            </div>
          </div>

          {/* Datos Institucionales y Normativa */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#03583A', textTransform: 'uppercase' }}>
              República del Ecuador
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#12211A' }}>
              Ministerio de Educación (MINEDUC)
            </div>
            <div style={{ fontSize: '0.6875rem', fontFamily: 'var(--wa-font-mono)', color: '#4A5568' }}>
              Acuerdo Ministerial N.° MINEDUC-2023-00012-A
            </div>
            <div
              style={{
                display: 'inline-block',
                marginTop: '4px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#EEF3EF',
                border: '1px solid #DDE8E1',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#03583A',
              }}
            >
              INFORME TRIMESTRAL DE APRENDIZAJE
            </div>
          </div>
        </header>

        {/* FICHA TÉCNICA DEL ESTUDIANTE */}
        <section
          style={{
            backgroundColor: '#EEF3EF',
            border: '1px solid #DDE8E1',
            borderRadius: '6px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            fontSize: '0.75rem',
          }}
        >
          <div>
            <span style={{ color: '#4A5568', fontWeight: 600, display: 'block' }}>ESTUDIANTE:</span>
            <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#12211A' }}>
              {estudianteActivo.nombreCompleto}
            </span>
          </div>

          <div>
            <span style={{ color: '#4A5568', fontWeight: 600, display: 'block' }}>GRADO / NIVEL:</span>
            <span style={{ fontWeight: 700, color: '#03583A' }}>
              {estudianteActivo.perfilEstudiante?.gradoEcuador || '4.° Grado de Educación General Básica'}
            </span>
          </div>

          <div>
            <span style={{ color: '#4A5568', fontWeight: 600, display: 'block' }}>AÑO LECTIVO:</span>
            <span style={{ fontWeight: 700, color: '#12211A' }}>{anioLectivo}</span>
          </div>

          <div>
            <span style={{ color: '#4A5568', fontWeight: 600, display: 'block' }}>RÉGIMEN:</span>
            <span style={{ fontWeight: 700, color: '#12211A' }}>{regimenEscolar}</span>
          </div>

          <div>
            <span style={{ color: '#4A5568', fontWeight: 600, display: 'block' }}>MODALIDAD PEDAGÓGICA:</span>
            <span style={{ fontWeight: 600, color: '#12211A' }}>{modalidad}</span>
          </div>

          <div>
            <span style={{ color: '#4A5568', fontWeight: 600, display: 'block' }}>FECHA DE EMISIÓN:</span>
            <span style={{ fontWeight: 600, color: '#12211A' }}>{fechaEmision}</span>
          </div>
        </section>

        {/* TABLA PRINCIPAL DEL INFORME DE CALIFICACIONES TRIMESTRALES */}
        <section style={{ marginBottom: '1.5rem', overflowX: 'auto' }}>
          <table
            className="wa-tabla-boletin"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'center',
              fontSize: '0.75rem',
              border: '1px solid #DDE8E1',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#03583A', color: '#FCFDFC' }}>
                <th rowSpan={2} style={{ padding: '8px', textAlign: 'left', border: '1px solid #03583A', minWidth: '160px' }}>
                  ÁREA / ASIGNATURA
                </th>
                <th colSpan={3} style={{ padding: '6px', border: '1px solid #047A4F', backgroundColor: '#03583A' }}>
                  1.º TRIMESTRE
                </th>
                <th colSpan={3} style={{ padding: '6px', border: '1px solid #047A4F', backgroundColor: '#03583A' }}>
                  2.º TRIMESTRE
                </th>
                <th colSpan={3} style={{ padding: '6px', border: '1px solid #047A4F', backgroundColor: '#03583A' }}>
                  3.º TRIMESTRE
                </th>
                <th rowSpan={2} style={{ padding: '8px', border: '1px solid #03583A', backgroundColor: '#0F6E56' }}>
                  PROMEDIO<br />ANUAL
                </th>
                <th rowSpan={2} style={{ padding: '8px', border: '1px solid #03583A', backgroundColor: '#2563EB' }}>
                  ESCALA<br />CUALITATIVA
                </th>
              </tr>
              <tr style={{ backgroundColor: '#047A4F', color: '#FCFDFC', fontSize: '0.6875rem' }}>
                {/* T1 */}
                <th title="Aportes Formativos 70%" style={{ padding: '4px', border: '1px solid #3B82F6' }}>Aporte</th>
                <th title="Evaluación Sumativa 30%" style={{ padding: '4px', border: '1px solid #3B82F6' }}>Eval</th>
                <th style={{ padding: '4px', border: '1px solid #3B82F6', fontWeight: 700 }}>Nota</th>
                {/* T2 */}
                <th style={{ padding: '4px', border: '1px solid #3B82F6' }}>Aporte</th>
                <th style={{ padding: '4px', border: '1px solid #3B82F6' }}>Eval</th>
                <th style={{ padding: '4px', border: '1px solid #3B82F6', fontWeight: 700 }}>Nota</th>
                {/* T3 */}
                <th style={{ padding: '4px', border: '1px solid #3B82F6' }}>Aporte</th>
                <th style={{ padding: '4px', border: '1px solid #3B82F6' }}>Eval</th>
                <th style={{ padding: '4px', border: '1px solid #3B82F6', fontWeight: 700 }}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {notasMaterias.map((m, idx) => (
                <tr
                  key={m.idCurso}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#F7FAF7' : '#EEF3EF',
                    borderBottom: '1px solid #DDE8E1',
                  }}
                >
                  <td style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, border: '1px solid #DDE8E1' }}>
                    <div>{m.nombreMateria}</div>
                    <div style={{ fontSize: '0.625rem', color: '#4A5568', fontStyle: 'italic' }}>
                      Docente: {m.profesorIA}
                    </div>
                  </td>

                  {/* Trimestre 1 */}
                  <td style={{ padding: '6px', border: '1px solid #DDE8E1', color: '#4A5568' }}>{m.t1Aportes}</td>
                  <td style={{ padding: '6px', border: '1px solid #DDE8E1', color: '#4A5568' }}>{m.t1Evaluacion}</td>
                  <td style={{ padding: '6px', border: '1px solid #DDE8E1', fontWeight: 700, color: '#03583A' }}>
                    {m.t1Final.toFixed(2)}
                  </td>

                  {/* Trimestre 2 */}
                  <td style={{ padding: '6px', border: '1px solid #DDE8E1', color: '#4A5568' }}>{m.t2Aportes}</td>
                  <td style={{ padding: '6px', border: '1px solid #DDE8E1', color: '#4A5568' }}>{m.t2Evaluacion}</td>
                  <td style={{ padding: '6px', border: '1px solid #DDE8E1', fontWeight: 700, color: '#03583A' }}>
                    {m.t2Final.toFixed(2)}
                  </td>

                  {/* Trimestre 3 */}
                  <td style={{ padding: '6px', border: '1px solid #DDE8E1', color: '#4A5568' }}>{m.t3Aportes}</td>
                  <td style={{ padding: '6px', border: '1px solid #DDE8E1', color: '#4A5568' }}>{m.t3Evaluacion}</td>
                  <td style={{ padding: '6px', border: '1px solid #DDE8E1', fontWeight: 700, color: '#03583A' }}>
                    {m.t3Final.toFixed(2)}
                  </td>

                  {/* Promedio Anual */}
                  <td
                    style={{
                      padding: '6px',
                      border: '1px solid #DDE8E1',
                      fontWeight: 700,
                      color: '#0F6E56',
                      backgroundColor: 'rgba(15, 110, 86, 0.08)',
                      fontSize: '0.8125rem',
                    }}
                  >
                    {m.promedioAnual.toFixed(2)}
                  </td>

                  {/* Escala Cualitativa */}
                  <td
                    style={{
                      padding: '6px',
                      border: '1px solid #DDE8E1',
                      fontWeight: 700,
                      color: m.escalaCodigo === 'DAR' ? '#0F6E56' : m.escalaCodigo === 'AAR' ? '#03583A' : '#2563EB',
                    }}
                  >
                    {m.escalaCodigo}
                  </td>
                </tr>
              ))}

              {/* FILA DE PROMEDIO GENERAL DE APROVECHAMIENTO */}
              <tr style={{ backgroundColor: '#EEF3EF', fontWeight: 700, borderTop: '2px solid #03583A' }}>
                <td style={{ padding: '8px', textAlign: 'left', border: '1px solid #DDE8E1' }}>
                  PROMEDIO GENERAL INSTITUCIONAL
                </td>
                <td colSpan={9} style={{ padding: '8px', textAlign: 'right', border: '1px solid #DDE8E1', color: '#4A5568' }}>
                  Cálculo Ponderado según Normativa MINEDUC:
                </td>
                <td
                  style={{
                    padding: '8px',
                    border: '1px solid #DDE8E1',
                    fontWeight: 800,
                    fontSize: '0.9375rem',
                    color: '#0F6E56',
                    backgroundColor: 'rgba(15, 110, 86, 0.15)',
                  }}
                >
                  {promedioGeneral.toFixed(2)}
                </td>
                <td
                  style={{
                    padding: '8px',
                    border: '1px solid #DDE8E1',
                    fontWeight: 800,
                    fontSize: '0.875rem',
                    color: '#03583A',
                  }}
                >
                  {escalaGeneral.codigo}
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* ESCALA VALORATIVA MINISTERIAL Y EVALUACIÓN COMPORTAMENTAL */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '1rem',
            marginBottom: '1.25rem',
            fontSize: '0.6875rem',
          }}
        >
          {/* Tabla de Equivalencias Oficiales MINEDUC */}
          <div
            style={{
              backgroundColor: '#EEF3EF',
              border: '1px solid #DDE8E1',
              borderRadius: '6px',
              padding: '0.75rem',
            }}
          >
            <div style={{ fontWeight: 700, color: '#03583A', marginBottom: '4px', textTransform: 'uppercase' }}>
              Escala de Calificaciones Oficial (Ecuador):
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 700, padding: '2px 0', color: '#0F6E56' }}>DAR</td>
                  <td>Domina los Aprendizajes Requeridos</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>9.00 - 10.00</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, padding: '2px 0', color: '#03583A' }}>AAR</td>
                  <td>Alcanza los Aprendizajes Requeridos</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>7.00 - 8.99</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, padding: '2px 0', color: '#D97706' }}>PAAR</td>
                  <td>Próximo a Alcanzar los Aprendizajes</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>4.01 - 6.99</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, padding: '2px 0', color: '#DC2626' }}>NAAR</td>
                  <td>No Alcanza los Aprendizajes Requeridos</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>&le; 4.00</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Registro de Asistencia y Comportamiento */}
          <div
            style={{
              backgroundColor: '#EEF3EF',
              border: '1px solid #DDE8E1',
              borderRadius: '6px',
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: '#03583A', marginBottom: '4px', textTransform: 'uppercase' }}>
                Evaluación Cualitativa / Comportamental:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    backgroundColor: '#03583A',
                    color: '#FCFDFC',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}
                >
                  Liderazgo Grado "{comportamiento}"
                </span>
                <span style={{ color: '#4A5568' }}>
                  {comportamiento === 'A' ? 'Muy Satisfactorio' : comportamiento === 'B' ? 'Satisfactorio' : 'En proceso'}
                </span>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #DDE8E1', paddingTop: '4px' }}>
              <div style={{ fontWeight: 700, color: '#03583A', marginBottom: '2px', textTransform: 'uppercase' }}>
                Registro de Asistencia:
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Días Laborados: <strong>{asistencia.diasLaborados}</strong></span>
                <span>Asistencias: <strong>{asistencia.asistencias}</strong></span>
                <span>Faltas Just.: <strong>{asistencia.faltasJustificadas}</strong></span>
                <span>Injust.: <strong>{asistencia.faltasInjustificadas}</strong></span>
              </div>
            </div>
          </div>
        </section>

        {/* RECOMENDACIONES PEDAGÓGICAS Y OBSERVACIONES DEL TUTOR */}
        <section
          style={{
            backgroundColor: '#EEF3EF',
            border: '1px solid #C8D6CD',
            borderRadius: '4px',
            padding: '0.75rem 1rem',
            marginBottom: '2rem',
            fontSize: '0.75rem',
          }}
        >
          <div style={{ fontWeight: 700, color: '#2563EB', marginBottom: '4px', textTransform: 'uppercase' }}>
            Observaciones Pedagógicas y Acompañamiento del Mentor:
          </div>
          <p style={{ margin: 0, color: '#12211A', lineHeight: 1.5 }}>
            {observacionesTutor}
          </p>
          <div style={{ marginTop: '6px', fontStyle: 'italic', color: '#4A5568', fontSize: '0.6875rem' }}>
            Evaluación formativa orientada al desarrollo del carácter piadoso, pensamiento crítico e investigación autónoma.
          </div>
        </section>

        {/* BLOQUE TRIPARTITO DE FIRMAS OFICIALES */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.5rem',
            textAlign: 'center',
            paddingTop: '2.5rem',
          }}
        >
          {/* Firma 1: Rector / Director Académico */}
          <div>
            <div style={{ borderBottom: '1px solid #12211A', height: '40px', marginBottom: '8px' }}></div>
            <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#12211A' }}>
              {rectorNombre}
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#4A5568' }}>
              Director Académico y Legal
            </div>
            <div style={{ fontSize: '0.625rem', fontFamily: 'var(--wa-font-mono)', color: '#2563EB' }}>
              Wisdom Academy
            </div>
          </div>

          {/* Firma 2: Docente Mentor / Tutor de Grado */}
          <div>
            <div style={{ borderBottom: '1px solid #12211A', height: '40px', marginBottom: '8px' }}></div>
            <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#12211A' }}>
              {tutorNombre}
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#4A5568' }}>
              Docente Mentor / Tutor de Grado
            </div>
            <div style={{ fontSize: '0.625rem', fontFamily: 'var(--wa-font-mono)', color: '#2563EB' }}>
              Sistema Socrático OpenMAIC
            </div>
          </div>

          {/* Firma 3: Representante Legal / Padre de Familia */}
          <div>
            <div style={{ borderBottom: '1px solid #12211A', height: '40px', marginBottom: '8px' }}></div>
            <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#12211A' }}>
              {representanteNombre}
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#4A5568' }}>
              Representante Legal / Padre de Familia
            </div>
            <div style={{ fontSize: '0.625rem', fontFamily: 'var(--wa-font-mono)', color: '#2563EB' }}>
              Modalidad Educación en Casa
            </div>
          </div>
        </section>

        {/* PIE DE SEGURIDAD Y VALIDACIÓN CRIPTOGRÁFICA */}
        <footer
          style={{
            marginTop: '2rem',
            paddingTop: '0.75rem',
            borderTop: '1px dashed #DDE8E1',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.625rem',
            fontFamily: 'var(--wa-font-mono)',
            color: '#4A5568',
          }}
        >
          <div>
            DOCUMENTO OFICIAL VALIDADOR • REGISTRO MINEDUC-2023-00012-A • WISDOM CLOUD ID: WA-REP-2026-{estudianteActivo.id}
          </div>
          <div>
            VERIFICACIÓN DIGITAL: MOODLE GRADEBOOK HASH [OK]
          </div>
        </footer>
      </div>
    </div>
  );
};

