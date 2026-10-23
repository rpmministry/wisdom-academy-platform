'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Gestor de Matriculaciones (Moodle Enrolments)
 * ARCHIVO: src/components/admin/MoodleEnrolmentsManager.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Centro de gestión de matrículas estilo Moodle LMS para Wisdom Academy:
 * - Matricular estudiantes en cursos y asignaturas individuales o por cohortes.
 * - Asignación directa del Profesor IA de OpenMAIC para cada cátedra.
 * - Control de estados de matrícula: 'ACTIVA', 'SUSPENDIDA' o 'FINALIZADA'.
 * - Verificación de fechas de inicio y culminación del régimen escolar Sierra-Amazonía.
 * ==============================================================================
 */

import React, { useState } from 'react';
import {
  useAuth,
  MatriculaCurso,
  UsuarioCuenta,
  MATRICULAS_GAEL,
  MATRICULAS_AVRIL,
} from '@/lib/auth/authContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export const MoodleEnrolmentsManager: React.FC = () => {
  const { usuariosRegistrados, matricularEstudianteEnCurso, profesoresIAConfiguracion } = useAuth();

  // Filtrar solo usuarios con rol STUDENT
  const estudiantes = usuariosRegistrados.filter((u) => u.rol === 'STUDENT');
  const [estudianteSeleccionadoId, setEstudianteSeleccionadoId] = useState<string>(
    estudiantes[0]?.id || ''
  );

  const estudianteActual: UsuarioCuenta | undefined = estudiantes.find(
    (e) => e.id === estudianteSeleccionadoId
  );

  // Estados del formulario para agregar matrícula
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nombreMateria, setNombreMateria] = useState('');
  const [codigoCorto, setCodigoCorto] = useState('');
  const [profesorIA, setProfesorIA] = useState('Prof. Mateo');
  const [fechaInicio, setFechaInicio] = useState('2026-09-01');
  const [fechaFin, setFechaFin] = useState('2027-06-30');
  const [estadoMatricula, setEstadoMatricula] = useState<'ACTIVA' | 'SUSPENDIDA' | 'FINALIZADA'>('ACTIVA');
  const [mensaje, setMensaje] = useState<string | null>(null);

  const handleAgregarMatricula = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estudianteActual || !nombreMateria.trim() || !codigoCorto.trim()) return;

    const nuevaMatricula: MatriculaCurso = {
      idCurso: 500 + Math.floor(Math.random() * 400),
      nombre: nombreMateria.trim(),
      codigoCorto: codigoCorto.trim().toUpperCase(),
      profesorIA,
      estado: estadoMatricula,
      fechaInicio,
      fechaFin,
      porcentajeAvance: 0,
    };

    matricularEstudianteEnCurso(estudianteActual.id, nuevaMatricula);
    setMensaje(`Materia "${nuevaMatricula.nombre}" matriculada con éxito en Moodle.`);
    setNombreMateria('');
    setCodigoCorto('');
    setMostrarForm(false);
  };

  const handleMatricularCohorteCompleta = () => {
    if (!estudianteActual) return;
    const esPrimaria = (estudianteActual.perfilEstudiante?.edad || 10) <= 10;
    const cohorte: MatriculaCurso[] = (esPrimaria ? MATRICULAS_GAEL : MATRICULAS_AVRIL).map(
      (matricula) => ({ ...matricula, porcentajeAvance: 0 })
    );

    for (const c of cohorte) {
      matricularEstudianteEnCurso(estudianteActual.id, c);
    }
    setMensaje(`Cohorte completa de ${cohorte.length} materias matriculada para ${estudianteActual.nombreCompleto}.`);
  };

  const handleCambiarEstado = (matricula: MatriculaCurso, nuevoEstado: 'ACTIVA' | 'SUSPENDIDA' | 'FINALIZADA') => {
    if (!estudianteActual) return;
    matricularEstudianteEnCurso(estudianteActual.id, { ...matricula, estado: nuevoEstado });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Selector de Alumno y Acciones */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Matriculaciones Escolares (Moodle Enrolments)
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Gestiona la asignación de asignaturas, estados de cursado y tutores IA por estudiante.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMatricularCohorteCompleta}
            disabled={!estudianteActual}
          >
            Matricular Cohorte Completa
          </Button>

          <Button
            variant="primary-gold"
            size="sm"
            onClick={() => setMostrarForm(!mostrarForm)}
            disabled={!estudianteActual}
          >
            {mostrarForm ? 'Cerrar' : '+ Inscribir Materia'}
          </Button>
        </div>
      </div>

      {/* Selector de estudiante activo */}
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--wa-radius-md)',
          border: '1px solid var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Estudiante a gestionar:
        </span>

        <select
          value={estudianteSeleccionadoId}
          onChange={(e) => setEstudianteSeleccionadoId(e.target.value)}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--wa-radius-sm)',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)',
            fontSize: '0.875rem',
            fontWeight: 600,
            outline: 'none',
            minWidth: '240px',
          }}
        >
          {estudiantes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombreCompleto} ({e.perfilEstudiante?.gradoEcuador || 'Estudiante'})
            </option>
          ))}
        </select>

        {estudianteActual && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <span>•</span>
            <span>ID Moodle: #{estudianteActual.perfilEstudiante?.idMoodle || 'N/A'}</span>
            <span>•</span>
            <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
              {estudianteActual.matriculas.length} materias activas
            </span>
          </div>
        )}
      </div>

      {/* Banner de retroalimentación */}
      {mensaje && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--wa-radius-sm)',
            fontSize: '0.8125rem',
            backgroundColor: 'rgba(15, 110, 86, 0.12)',
            color: 'var(--accent-study)',
            border: '1px solid var(--accent-study)',
          }}
        >
          {mensaje}
        </div>
      )}

      {/* Formulario de Nueva Inscripción */}
      {mostrarForm && (
        <Card variant="gold-border" padding="lg">
          <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--brand-gold-dark)' }}>
            Inscribir en Nueva Materia a {estudianteActual?.nombreCompleto}
          </h3>

          <form onSubmit={handleAgregarMatricula} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Nombre de la Asignatura *</label>
              <input
                type="text"
                value={nombreMateria}
                onChange={(e) => setNombreMateria(e.target.value)}
                placeholder="ej: Robótica y Creación Digital"
                required
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Código Corto Moodle *</label>
              <input
                type="text"
                value={codigoCorto}
                onChange={(e) => setCodigoCorto(e.target.value)}
                placeholder="ej: ROB4"
                required
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Profesor IA de OpenMAIC *</label>
              <select
                value={profesorIA}
                onChange={(e) => setProfesorIA(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                }}
              >
                {profesoresIAConfiguracion.map((p) => (
                  <option key={p.id} value={p.nombre}>{p.nombre} ({p.personalidad})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Estado de Matrícula</label>
              <select
                value={estadoMatricula}
                onChange={(e) => setEstadoMatricula(e.target.value as any)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                }}
              >
                <option value="ACTIVA">ACTIVA (En Curso)</option>
                <option value="SUSPENDIDA">SUSPENDIDA</option>
                <option value="FINALIZADA">FINALIZADA (Aprobada)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button type="submit" variant="primary-navy" style={{ width: '100%' }}>
                Registrar Enrolment
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de Cursos Matriculados del Estudiante */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--wa-radius-lg)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(17, 22, 37, 0.04)',
        }}
      >
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Malla Curricular Matriculada • {estudianteActual?.nombreCompleto}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Período Sierra-Amazonía 2026-2027
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Asignatura / Código</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Profesor IA</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Avance</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Promedio</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Estado</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Gestión</th>
              </tr>
            </thead>
            <tbody>
              {estudianteActual?.matriculas.map((m) => {
                const esActiva = m.estado === 'ACTIVA';
                return (
                  <tr key={m.idCurso} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.nombre}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        Código: {m.codigoCorto} • ID Moodle: #{m.idCurso}
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>{m.profesorIA}</span>
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem 1rem', minWidth: '140px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', marginBottom: '0.25rem' }}>
                        <span>{m.porcentajeAvance}%</span>
                      </div>
                      <ProgressBar valor={m.porcentajeAvance} />
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--accent-study)' }}>
                        {m.promedioFinal || m.notaTrimestre1 ? `${m.promedioFinal || m.notaTrimestre1}/10` : 'Pendiente'}
                      </span>
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      <Badge
                        variant={esActiva ? 'emerald' : m.estado === 'FINALIZADA' ? 'navy' : 'subtle'}
                        size="sm"
                      >
                        {m.estado}
                      </Badge>
                    </td>

                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <select
                        value={m.estado}
                        onChange={(e) => handleCambiarEstado(m, e.target.value as any)}
                        style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: 'var(--wa-radius-sm)',
                          backgroundColor: 'var(--bg-subtle)',
                          border: '1px solid var(--border-subtle)',
                          fontSize: '0.75rem',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      >
                        <option value="ACTIVA">Activar</option>
                        <option value="SUSPENDIDA">Suspender</option>
                        <option value="FINALIZADA">Finalizar</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

