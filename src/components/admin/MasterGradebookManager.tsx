'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Libro Maestro de Calificaciones (Gradebook)
 * ARCHIVO: src/components/admin/MasterGradebookManager.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Centro de supervisión y asentamiento académico de calificaciones:
 * - Supervisión unificada de las notas generadas por el Completion Tracking
 *   de OpenMAIC y los cuestionarios de Moodle LMS.
 * - Registro trimestral (Trimestre 1, 2 y 3) según la escala del MINEDUC (0 a 10).
 * - Edición y corrección manual con recálculo dinámico de promedios ponderados.
 * - Estado ministerial: Aprobado (>= 7.0), Supletorio o En Curso.
 * ==============================================================================
 */

import React, { useState } from 'react';
import { useAuth, UsuarioCuenta, MatriculaCurso } from '@/lib/auth/authContext';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export const MasterGradebookManager: React.FC = () => {
  const { usuariosRegistrados, actualizarCalificacionMatricula } = useAuth();

  const estudiantes = usuariosRegistrados.filter((u) => u.rol === 'STUDENT');
  const [filtroEstudianteId, setFiltroEstudianteId] = useState<string>('todos');
  const [edicionActiva, setEdicionActiva] = useState<{
    usuarioId: string;
    idCurso: number;
    trimestre: 1 | 2 | 3;
    valorActual: number;
  } | null>(null);
  const [nuevoValorNota, setNuevoValorNota] = useState<string>('');
  const [mensajeAuditoria, setMensajeAuditoria] = useState<string | null>(null);

  const estudiantesFiltrados = filtroEstudianteId === 'todos'
    ? estudiantes
    : estudiantes.filter((e) => e.id === filtroEstudianteId);

  const iniciarEdicion = (usuarioId: string, idCurso: number, trimestre: 1 | 2 | 3, valorActual: number) => {
    setEdicionActiva({ usuarioId, idCurso, trimestre, valorActual });
    setNuevoValorNota(String(valorActual || ''));
  };

  const guardarEdicion = () => {
    if (!edicionActiva) return;
    const notaNum = Number(nuevoValorNota);
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 10) {
      alert('La calificación debe ser un valor numérico entre 0 y 10 según la escala MINEDUC.');
      return;
    }

    actualizarCalificacionMatricula(
      edicionActiva.usuarioId,
      edicionActiva.idCurso,
      edicionActiva.trimestre,
      Number(notaNum.toFixed(2))
    );

    setMensajeAuditoria(
      `Calificación del Trimestre ${edicionActiva.trimestre} actualizada a ${notaNum.toFixed(2)}/10 en el Libro Maestro.`
    );
    setEdicionActiva(null);
    setTimeout(() => setMensajeAuditoria(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabecera y Filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Libro Maestro de Calificaciones (Gradebook Oficial)
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Consolida las notas obtenidas con los Profesores IA de OpenMAIC y permite ajustes auditados.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            value={filtroEstudianteId}
            onChange={(e) => setFiltroEstudianteId(e.target.value)}
            style={{
              padding: '0.375rem 0.625rem',
              borderRadius: 'var(--wa-radius-sm)',
              backgroundColor: 'var(--bg-subtle)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)',
              fontSize: '0.8125rem',
              outline: 'none',
            }}
          >
            <option value="todos">Todos los Estudiantes</option>
            {estudiantes.map((e) => (
              <option key={e.id} value={e.id}>{e.nombreCompleto}</option>
            ))}
          </select>

          <Button
            variant="secondary"
            size="sm"
            icono={<WisdomIcon name="download" size={16} />}
            onClick={() => window.print()}
          >
            Imprimir Sábana
          </Button>
        </div>
      </div>

      {/* Banner de Auditoría */}
      {mensajeAuditoria && (
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
          ✓ {mensajeAuditoria}
        </div>
      )}

      {/* Tabla Matriz del Libro Maestro */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--wa-radius-lg)',
          border: '1px solid var(--border-default)',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(17, 22, 37, 0.04)',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Estudiante</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Materia / Tutor IA</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Trimestre 1</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Trimestre 2</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Trimestre 3</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Promedio Final</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {estudiantesFiltrados.flatMap((est) =>
                est.matriculas.map((mat) => {
                  const t1 = mat.notaTrimestre1;
                  const t2 = mat.notaTrimestre2;
                  const t3 = mat.notaTrimestre3;
                  const prom = mat.promedioFinal || t1 || 0;
                  const aprobado = prom >= 7.0;

                  return (
                    <tr key={`${est.id}_${mat.idCurso}`} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{est.nombreCompleto}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {est.perfilEstudiante?.gradoEcuador || 'Estudiante'}
                        </div>
                      </td>

                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{mat.nombre}</div>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--brand-primary)' }}>
                          Tutor: {mat.profesorIA}
                        </div>
                      </td>

                      {/* Celda Trimestre 1 */}
                      <td
                        onClick={() => iniciarEdicion(est.id, mat.idCurso, 1, t1 || 0)}
                        style={{ padding: '0.75rem 1rem', textAlign: 'center', cursor: 'pointer' }}
                        title="Clic para editar nota Trimestre 1"
                      >
                        <span style={{ fontWeight: 600, color: t1 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {t1 ? `${t1}/10` : '—'}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)' }}>✎ editar</div>
                      </td>

                      {/* Celda Trimestre 2 */}
                      <td
                        onClick={() => iniciarEdicion(est.id, mat.idCurso, 2, t2 || 0)}
                        style={{ padding: '0.75rem 1rem', textAlign: 'center', cursor: 'pointer' }}
                        title="Clic para editar nota Trimestre 2"
                      >
                        <span style={{ fontWeight: 600, color: t2 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {t2 ? `${t2}/10` : '—'}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)' }}>✎ editar</div>
                      </td>

                      {/* Celda Trimestre 3 */}
                      <td
                        onClick={() => iniciarEdicion(est.id, mat.idCurso, 3, t3 || 0)}
                        style={{ padding: '0.75rem 1rem', textAlign: 'center', cursor: 'pointer' }}
                        title="Clic para editar nota Trimestre 3"
                      >
                        <span style={{ fontWeight: 600, color: t3 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {t3 ? `${t3}/10` : '—'}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)' }}>✎ editar</div>
                      </td>

                      {/* Promedio Final */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: aprobado ? 'var(--accent-study)' : '#EF4444' }}>
                          {prom > 0 ? `${prom}/10` : '—'}
                        </span>
                      </td>

                      {/* Estado MINEDUC */}
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <Badge variant={aprobado ? 'emerald' : 'subtle'} size="sm">
                          {aprobado ? 'Aprobado' : 'En Curso'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Asentamiento de Calificación */}
      {edicionActiva && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 14, 23, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--wa-radius-lg)',
              border: '1px solid var(--border-default)',
              padding: '1.5rem',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(17, 22, 37, 0.16)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Asentar Calificación (Trimestre {edicionActiva.trimestre})
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Ingresa la calificación sobre 10 (con decimales si aplica). Esta nota se registrará en Moodle LMS.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Calificación (0 a 10):
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                max={10}
                value={nuevoValorNota}
                onChange={(e) => setNuevoValorNota(e.target.value)}
                autoFocus
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button variant="secondary" size="sm" onClick={() => setEdicionActiva(null)}>
                Cancelar
              </Button>
              <Button variant="primary-gold" size="sm" onClick={guardarEdicion}>
                Guardar Nota
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


