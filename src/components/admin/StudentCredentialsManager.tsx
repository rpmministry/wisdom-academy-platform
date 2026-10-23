'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Gestión de Estudiantes y Credenciales
 * ARCHIVO: src/components/admin/StudentCredentialsManager.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Centro de gestión de identidades y credenciales de acceso para el Administrador:
 * - Alta de nuevos estudiantes con generación de usuario, correo y contraseña.
 * - Asignación de grado según la estructura ministerial del Ecuador (MINEDUC).
 * - Supervisión de cuentas activas, roles (ADMIN, TEACHER, STUDENT) y estados.
 * - Edición de contraseñas y reseteo seguro de credenciales escolares.
 * ==============================================================================
 */

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth, UsuarioCuenta } from '@/lib/auth/authContext';
import { apiFetch, errorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

interface StudentSpacePlan {
  id: string;
  fecha: string;
  titulo: string;
  semana: number;
  materias: Array<{ subject: string; topic: string }>;
}

interface StudentSpaceSubject {
  nombre: string;
  profesorIA: string;
  unidades: number;
  calificaciones: Array<{ trimestre: number; nota: number }>;
}

interface StudentSpaceData {
  estudiante: { id: string; nombre: string; correo: string };
  perfil: {
    grado: string;
    subnivel: string;
    edad: number;
    docente: string;
    anoLectivo: string;
    totalAsignaturas: number;
    totalUnidades: number;
  } | null;
  resumen: {
    planesGenerados: number;
    diasCompletados: number;
    progreso: number;
    asignaturas: number;
    unidades: number;
  } | null;
  planes: StudentSpacePlan[];
  asignaturas: StudentSpaceSubject[];
  eventos: Array<{ event_date: string; title: string; kind: string; description: string | null }>;
}

function fechaCorta(value: string | null): string {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: 'short' }).format(date);
}

function promedioNotas(calificaciones: Array<{ nota: number }>): string {
  if (!calificaciones.length) return 'Sin notas';
  const total = calificaciones.reduce((sum, item) => sum + item.nota, 0);
  return (total / calificaciones.length).toFixed(2);
}

export const StudentCredentialsManager: React.FC = () => {
  const {
    usuariosRegistrados,
    crearNuevoEstudiante,
    actualizarUsuario,
    eliminarUsuario,
    tienePermiso,
  } = useAuth();
  const [previewStudent, setPreviewStudent] = useState<UsuarioCuenta | null>(null);
  const [previewData, setPreviewData] = useState<StudentSpaceData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const cargarPreview = useCallback(async (student: UsuarioCuenta) => {
    setPreviewStudent(student);
    setPreviewData(null);
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      const response = await apiFetch<StudentSpaceData & { ok: boolean }>(
        `/api/admin/students/${encodeURIComponent(student.id)}/space`
      );
      setPreviewData(response);
    } catch (err) {
      setPreviewError(errorMessage(err));
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!previewStudent) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewStudent(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [previewStudent]);

  // Estados del formulario de nuevo alumno
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [usuario, setUsuario] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasenia, setContrasenia] = useState('');
  const [gradoEcuador, setGradoEcuador] = useState('4° de EGB');
  const [edad, setEdad] = useState(8);
  const [emailMentor, setEmailMentor] = useState('');
  const [mensajeEstado, setMensajeEstado] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Estados de reseteo de contraseña modal
  const [usuarioParaReset, setUsuarioParaReset] = useState<UsuarioCuenta | null>(null);
  const [nuevaClave, setNuevaClave] = useState('');

  const gradosDisponibles = [
    '1° de EGB (Preparatoria)',
    '2° de EGB (Básica Elemental)',
    '3° de EGB (Básica Elemental)',
    '4° de EGB (Básica Elemental)',
    '5° de EGB (Básica Media)',
    '6° de EGB (Básica Media)',
    '7° de EGB (Básica Media)',
    '8° de EGB (Básica Superior)',
    '9° de EGB (Básica Superior)',
    '10° de EGB (Básica Superior)',
    '1° de BGU (Bachillerato)',
    '2° de BGU (Bachillerato)',
    '3° de BGU (Bachillerato)',
  ];

  const handleCrearAlumno = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensajeEstado(null);

    if (!nombreCompleto.trim() || !usuario.trim() || !correo.trim() || !contrasenia.trim()) {
      setMensajeEstado({ tipo: 'error', texto: 'Todos los campos obligatorios deben ser completados.' });
      return;
    }

    const res = await crearNuevoEstudiante({
      nombreCompleto,
      usuario,
      correo,
      contrasenia,
      gradoEcuador,
      edad: Number(edad),
      emailMentorPadre: emailMentor || undefined,
    });

    if (res.exito) {
      setMensajeEstado({ tipo: 'exito', texto: res.mensaje });
      setNombreCompleto('');
      setUsuario('');
      setCorreo('');
      setContrasenia('');
      setEmailMentor('');
      setMostrarFormulario(false);
    } else {
      setMensajeEstado({ tipo: 'error', texto: res.mensaje });
    }
  };

  const handleResetPassword = async () => {
    if (!usuarioParaReset || !nuevaClave.trim()) return;
    await actualizarUsuario(usuarioParaReset.id, { contrasenia: nuevaClave.trim() });
    setMensajeEstado({ tipo: 'exito', texto: `Contraseña actualizada para ${usuarioParaReset.nombreCompleto}.` });
    setUsuarioParaReset(null);
    setNuevaClave('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabecera y botón de acción */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Directorio de Usuarios y Credenciales
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Administra cuentas de estudiantes, docentes y accesos institucionales con aislamiento multi-tenant.
          </p>
        </div>

        <Button
          variant={mostrarFormulario ? 'secondary' : 'primary-gold'}
          size="sm"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          icono={<WisdomIcon name={mostrarFormulario ? 'pause' : 'user'} size={16} />}
        >
          {mostrarFormulario ? 'Cancelar Registro' : '+ Matricular Nuevo Alumno'}
        </Button>
      </div>

      {/* Banner de retroalimentación */}
      {mensajeEstado && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--wa-radius-sm)',
            fontSize: '0.8125rem',
            backgroundColor: mensajeEstado.tipo === 'exito' ? 'rgba(15, 110, 86, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            color: mensajeEstado.tipo === 'exito' ? 'var(--accent-study)' : '#EF4444',
            border: `1px solid ${mensajeEstado.tipo === 'exito' ? 'var(--accent-study)' : '#EF4444'}`,
          }}
        >
          {mensajeEstado.texto}
        </div>
      )}

      {/* Formulario de Alta de Estudiante */}
      {mostrarFormulario && (
        <Card variant="gold-border" padding="lg">
          <div style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--brand-gold-dark)' }}>
              Formulario de Matrícula y Creación de Credenciales
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              El alumno dispondrá de su espacio virtual aislado con sus cursos y OpenMAIC configurado.
            </p>
          </div>

          <form onSubmit={handleCrearAlumno} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Nombre Completo del Alumno *
              </label>
              <input
                type="text"
                value={nombreCompleto}
                onChange={(e) => setNombreCompleto(e.target.value)}
                placeholder="ej: Mateo Alexander Valenzuela"
                required
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Usuario de Acceso *
              </label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="ej: mateov"
                required
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Correo Institucional *
              </label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="mateov@wisdomacademy.edu.ec"
                required
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Contraseña Inicial *
              </label>
              <input
                type="password"
                value={contrasenia}
                onChange={(e) => setContrasenia(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                required
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Grado Escolar MINEDUC *
              </label>
              <select
                value={gradoEcuador}
                onChange={(e) => setGradoEcuador(e.target.value)}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              >
                {gradosDisponibles.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Edad del Estudiante *
              </label>
              <input
                type="number"
                min={5}
                max={19}
                value={edad}
                onChange={(e) => setEdad(Number(e.target.value))}
                required
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Correo del Padre/Mentor Responsable
              </label>
              <input
                type="email"
                value={emailMentor}
                onChange={(e) => setEmailMentor(e.target.value)}
                placeholder="padres@ejemplo.com"
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <Button type="submit" variant="primary-navy" style={{ width: '100%' }}>
                Completar Matrícula
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tabla de Usuarios Registrados */}
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
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Usuario / Alumno</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Rol</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Grado MINEDUC</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Cursos Matriculados</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Estado</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosRegistrados.map((u) => {
                const esAdmin = u.rol === 'ADMIN';
                const esDocente = u.rol === 'TEACHER';
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <div
                          style={{
                            position: 'relative',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            backgroundColor: esAdmin ? 'var(--accent-study)' : esDocente ? 'var(--brand-primary)' : 'var(--brand-gold)',
                            color: 'var(--text-on-brand)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            flexShrink: 0,
                            border: '2px solid var(--border-subtle)',
                          }}
                        >
                          {u.avatarUrl ? (
                            <Image
                              src={u.avatarUrl}
                              alt={u.nombreCompleto}
                              fill
                              sizes="36px"
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            u.nombreCompleto.charAt(0)
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.nombreCompleto}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            @{u.usuario} • {u.correo}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      <Badge
                        variant={esAdmin ? 'emerald' : esDocente ? 'navy' : 'gold'}
                        size="sm"
                      >
                        {u.rol}
                      </Badge>
                    </td>

                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                      {u.perfilEstudiante?.gradoEcuador || 'No aplica (Personal)'}
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--brand-primary)' }}>
                        {u.matriculas.length} asignaturas
                      </span>
                    </td>

                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{ color: u.activo ? 'var(--accent-study)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {u.activo ? '● Activa' : '○ Inactiva'}
                      </span>
                    </td>

                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {tienePermiso('minors.read') && u.rol === 'STUDENT' && (
                          <button
                            type="button"
                            onClick={() => void cargarPreview(u)}
                            title="Ver el espacio y progreso del estudiante"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.25rem 0.5rem',
                              borderRadius: 'var(--wa-radius-sm)',
                              backgroundColor: 'var(--brand-gold-soft)',
                              border: '1px solid var(--border-gold)',
                              color: 'var(--brand-gold-dark)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <WisdomIcon name="chart" size={13} /> Ver espacio
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setUsuarioParaReset(u);
                            setNuevaClave('');
                          }}
                          title="Resetear contraseña"
                          style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--wa-radius-sm)',
                            backgroundColor: 'var(--bg-subtle)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--brand-primary)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Clave 🔑
                        </button>

                        {!esAdmin && (
                          <button
                            onClick={() => {
                              if (confirm(`¿Estás seguro de eliminar al usuario ${u.nombreCompleto}?`)) {
                                eliminarUsuario(u.id);
                              }
                            }}
                            title="Eliminar usuario"
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: 'var(--wa-radius-sm)',
                              backgroundColor: 'var(--bg-subtle)',
                              border: '1px solid var(--border-subtle)',
                              color: '#EF4444',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {previewStudent && (
        <div
          className="wa-student-preview-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewStudent(null);
          }}
        >
          <section
            className="wa-student-preview"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wa-student-preview-title"
          >
            <header className="wa-student-preview-head">
              <div className="wa-student-preview-identity">
                <span className="wa-student-preview-avatar">
                  {previewStudent.nombreCompleto
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part.charAt(0).toUpperCase())
                    .join('')}
                </span>
                <div>
                  <span className="wa-eyebrow">Espacio del estudiante</span>
                  <h2 id="wa-student-preview-title">{previewStudent.nombreCompleto}</h2>
                  <p>
                    @{previewStudent.usuario} · {previewStudent.correo} ·{' '}
                    {previewStudent.perfilEstudiante?.gradoEcuador || 'Sin grado'}
                  </p>
                </div>
              </div>
              <div className="wa-student-preview-actions">
                <Badge variant={previewStudent.activo ? 'emerald' : 'navy'} size="sm">
                  {previewStudent.activo ? 'Cuenta activa' : 'Cuenta inactiva'}
                </Badge>
                <button
                  type="button"
                  className="wa-student-preview-close"
                  onClick={() => setPreviewStudent(null)}
                  aria-label="Cerrar vista del estudiante"
                >
                  <WisdomIcon name="close" size={18} />
                </button>
              </div>
            </header>

            {previewLoading && (
              <p className="wa-student-preview-status" role="status">Cargando el espacio del estudiante…</p>
            )}

            {previewError && (
              <div className="wa-student-preview-error" role="alert">
                <WisdomIcon name="shield" size={17} />
                <span>{previewError}</span>
              </div>
            )}

            {previewData && !previewData.perfil && (
              <div className="wa-student-preview-empty">
                <WisdomIcon name="graduation-cap" size={24} />
                <strong>Sin perfil académico configurado</strong>
                <span>La cuenta existe, pero todavía no tiene un grado o plan asignado.</span>
              </div>
            )}

            {previewData?.perfil && (
              <>
                <div className="wa-student-preview-kpis">
                  <div>
                    <span>Progreso del año</span>
                    <strong>{previewData.resumen?.progreso || 0}%</strong>
                    <small>{previewData.resumen?.diasCompletados || 0} de {previewData.resumen?.planesGenerados || 0} jornadas</small>
                  </div>
                  <div>
                    <span>Asignaturas</span>
                    <strong>{previewData.resumen?.asignaturas || previewData.perfil.totalAsignaturas}</strong>
                    <small>{previewData.perfil.grado} · {previewData.perfil.subnivel}</small>
                  </div>
                  <div>
                    <span>Unidades</span>
                    <strong>{previewData.resumen?.unidades || previewData.perfil.totalUnidades}</strong>
                    <small>Acompañamiento: {previewData.perfil.docente}</small>
                  </div>
                  <div>
                    <span>Edad</span>
                    <strong>{previewData.perfil.edad}</strong>
                    <small>Año lectivo {previewData.perfil.anoLectivo}</small>
                  </div>
                </div>

                <div className="wa-student-preview-grid">
                  <section>
                    <div className="wa-student-preview-section-head">
                      <h3>Próximas jornadas</h3>
                      <span>{previewData.planes.length} visibles</span>
                    </div>
                    {previewData.planes.length > 0 ? (
                      <ul className="wa-student-preview-plans">
                        {previewData.planes.slice(0, 5).map((plan) => (
                          <li key={plan.id}>
                            <span className="wa-student-preview-date">{fechaCorta(plan.fecha)}</span>
                            <div>
                              <strong>{plan.titulo}</strong>
                              <small>
                                Semana {plan.semana} · {plan.materias.slice(0, 3).map((materia) => materia.subject).join(' · ') || 'Sin materias'}
                              </small>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="wa-student-preview-muted">Todavía no hay jornadas generadas para este estudiante.</p>
                    )}
                  </section>

                  <section>
                    <div className="wa-student-preview-section-head">
                      <h3>Asignaturas y notas</h3>
                      <span>Promedio</span>
                    </div>
                    {previewData.asignaturas.length > 0 ? (
                      <ul className="wa-student-preview-subjects">
                        {previewData.asignaturas.slice(0, 6).map((subject) => (
                          <li key={subject.nombre}>
                            <div>
                              <strong>{subject.nombre}</strong>
                              <small>{subject.unidades} unidades · {subject.profesorIA}</small>
                            </div>
                            <span>{promedioNotas(subject.calificaciones)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="wa-student-preview-muted">Sin asignaturas visibles en el perfil.</p>
                    )}
                  </section>
                </div>

                {previewData.eventos.length > 0 && (
                  <div className="wa-student-preview-events">
                    <div className="wa-student-preview-section-head">
                      <h3>Próximos eventos</h3>
                      <span>Calendario académico</span>
                    </div>
                    <div className="wa-student-preview-event-list">
                      {previewData.eventos.slice(0, 3).map((event) => (
                        <span key={`${event.event_date}-${event.title}`}>
                          <strong>{fechaCorta(event.event_date)}</strong> {event.title}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <footer className="wa-student-preview-foot">
                  <WisdomIcon name="shield" size={14} />
                  Vista de supervisión académica. No cambia la sesión ni el progreso del estudiante.
                </footer>
              </>
            )}
          </section>
        </div>
      )}

      {/* Modal de Reseteo de Contraseña */}
      {usuarioParaReset && (
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
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(17, 22, 37, 0.16)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Actualizar Contraseña
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Asigna una nueva clave de acceso para <strong>{usuarioParaReset.nombreCompleto}</strong> (@{usuarioParaReset.usuario}).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <input
                type="text"
                value={nuevaClave}
                onChange={(e) => setNuevaClave(e.target.value)}
                placeholder="Nueva contraseña segura"
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.875rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <Button variant="secondary" size="sm" onClick={() => setUsuarioParaReset(null)}>
                Cancelar
              </Button>
              <Button variant="primary-gold" size="sm" onClick={handleResetPassword}>
                Guardar Contraseña
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

