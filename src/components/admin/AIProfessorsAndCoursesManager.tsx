'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Gestión de Profesores IA (OpenMAIC + Moodle)
 * ARCHIVO: src/components/admin/AIProfessorsAndCoursesManager.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Centro de configuración curricular y pedagógica para los Profesores IA de OpenMAIC:
 * - Asignación y personalización de perfiles docentes:
 *   * Prof. Mateo (Tutor Lúdico K-12 para Básica Elemental).
 *   * Dra. Sofía de Valenzuela (Catedrática de Ciencias para Básica Superior).
 * - Calibración del tono pedagógico, personalidad y lema orientador.
 * - Creación y administración del Banco de Preguntas formativas para Quizzes.
 * - Definición y revisión de Tareas para el Portafolio Ministerial del Ecuador.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth, ConfiguracionProfesorIA, PreguntaBanco, TareaRevision } from '@/lib/auth/authContext';
import { wisdomAIOrchestrator, MetricasProveedor } from '@/lib/ai/orchestrator';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export const AIProfessorsAndCoursesManager: React.FC = () => {
  const { profesoresIAConfiguracion, actualizarProfesorIA } = useAuth();
  const [profesorSeleccionadoId, setProfesorSeleccionadoId] = useState<string>('mateo');
  const [metricasProveedores, setMetricasProveedores] = useState<MetricasProveedor[]>(() =>
    wisdomAIOrchestrator.obtenerEstadoProveedores()
  );

  useEffect(() => {
    // Actualizar métricas cada 5 segundos
    const timer = setInterval(() => {
      setMetricasProveedores(wisdomAIOrchestrator.obtenerEstadoProveedores());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const profesorActivo =
    profesoresIAConfiguracion.find((p) => p.id === profesorSeleccionadoId) ||
    profesoresIAConfiguracion[0];

  // Estados de edición del profesor
  const [personalidad, setPersonalidad] = useState(profesorActivo?.personalidad || 'Lúdico y Cercano');
  const [tonoPedagogico, setTonoPedagogico] = useState(profesorActivo?.tonoPedagogico || '');
  const [versiculoRef, setVersiculoRef] = useState(profesorActivo?.versiculoRector.referencia || '');
  const [versiculoTexto, setVersiculoTexto] = useState(profesorActivo?.versiculoRector.texto || '');

  // Estados para agregar preguntas al banco
  const [mostrarNuevaPregunta, setMostrarNuevaPregunta] = useState(false);
  const [nuevaPreguntaEnunciado, setNuevaPreguntaEnunciado] = useState('');
  const [nuevaOpA, setNuevaOpA] = useState('');
  const [nuevaOpB, setNuevaOpB] = useState('');
  const [nuevaOpC, setNuevaOpC] = useState('');
  const [nuevaOpD, setNuevaOpD] = useState('');
  const [opcionCorrectaIdx, setOpcionCorrectaIdx] = useState(0);
  const [explicacionSocratica, setExplicacionSocratica] = useState('');

  // Estados para agregar tarea
  const [mostrarNuevaTarea, setMostrarNuevaTarea] = useState(false);
  const [tareaTitulo, setTareaTitulo] = useState('');
  const [tareaDescripcion, setTareaDescripcion] = useState('');
  const [tareaRubrica, setTareaRubrica] = useState('');
  const [tareaPonderacion, setTareaPonderacion] = useState(50);

  const [notificacion, setNotificacion] = useState<string | null>(null);

  // Sincronizar inputs al cambiar de profesor
  const handleCambiarProfesor = (id: string) => {
    setProfesorSeleccionadoId(id);
    const p = profesoresIAConfiguracion.find((item) => item.id === id);
    if (p) {
      setPersonalidad(p.personalidad);
      setTonoPedagogico(p.tonoPedagogico);
      setVersiculoRef(p.versiculoRector.referencia);
      setVersiculoTexto(p.versiculoRector.texto);
    }
  };

  const handleGuardarConfiguracion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profesorActivo) return;

    actualizarProfesorIA(profesorActivo.id, {
      personalidad: personalidad as any,
      tonoPedagogico,
      versiculoRector: {
        referencia: versiculoRef,
        texto: versiculoTexto,
      },
    });

    setNotificacion(`Parámetros de enseñanza para ${profesorActivo.nombre} actualizados con éxito en OpenMAIC.`);
    setTimeout(() => setNotificacion(null), 3000);
  };

  const handleAgregarPregunta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profesorActivo || !nuevaPreguntaEnunciado.trim()) return;

    const nueva: PreguntaBanco = {
      id: `bp_${Date.now()}`,
      enunciado: nuevaPreguntaEnunciado.trim(),
      opciones: [nuevaOpA, nuevaOpB, nuevaOpC, nuevaOpD].filter(Boolean),
      respuestaCorrecta: opcionCorrectaIdx,
      explicacionSocratica: explicacionSocratica.trim(),
    };

    const actualizadas = [...profesorActivo.bancoPreguntas, nueva];
    actualizarProfesorIA(profesorActivo.id, { bancoPreguntas: actualizadas });

    setNuevaPreguntaEnunciado('');
    setNuevaOpA('');
    setNuevaOpB('');
    setNuevaOpC('');
    setNuevaOpD('');
    setExplicacionSocratica('');
    setMostrarNuevaPregunta(false);
    setNotificacion(`Pregunta formativa agregada al banco de ${profesorActivo.nombre}.`);
    setTimeout(() => setNotificacion(null), 3000);
  };

  const handleAgregarTarea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profesorActivo || !tareaTitulo.trim()) return;

    const nuevaTarea: TareaRevision = {
      id: `tar_${Date.now()}`,
      titulo: tareaTitulo.trim(),
      descripcion: tareaDescripcion.trim(),
      rubricaMINEDUC: tareaRubrica.trim(),
      ponderacion: Number(tareaPonderacion),
    };

    const actualizadas = [...profesorActivo.tareasAsignadas, nuevaTarea];
    actualizarProfesorIA(profesorActivo.id, { tareasAsignadas: actualizadas });

    setTareaTitulo('');
    setTareaDescripcion('');
    setTareaRubrica('');
    setMostrarNuevaTarea(false);
    setNotificacion(`Tarea ministerial creada para el portafolio de ${profesorActivo.nombre}.`);
    setTimeout(() => setNotificacion(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Profesores IA y Curriculares de OpenMAIC
          </h2>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Personaliza el tono socrático, criterios académicos, bancos de preguntas y tareas asignadas.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {profesoresIAConfiguracion.map((p) => {
            const esActivo = p.id === profesorSeleccionadoId;
            return (
              <Button
                key={p.id}
                variant={esActivo ? 'primary-gold' : 'secondary'}
                size="sm"
                onClick={() => handleCambiarProfesor(p.id)}
              >
                {p.nombre}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Notificación */}
      {notificacion && (
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
          {notificacion}
        </div>
      )}

      {/* Monitor en Vivo de Alta Disponibilidad 24/7 (Circuit Breaker & Pool) */}
      <Card variant="surface" padding="md">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', fontWeight: 600, color: 'var(--brand-gold-dark)' }}>
                ORQUESTADOR DE IAS GRATUITAS (WISDOM AI ORCHESTRATOR)
              </span>
              <Badge variant="emerald" size="sm">Costo $0 USD • 24/7</Badge>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0.25rem 0 0 0', color: 'var(--text-primary)' }}>
              Pool de Proveedores Gratuitos y Circuit Breaker Anti-429
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Caché de Conceptos:</span>
            <Badge variant="gold" size="sm">⚡ Activa (&lt; 1ms)</Badge>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {metricasProveedores.map((prov) => {
            const esSaludable = prov.estado === 'HEALTHY';
            const esDegradado = prov.estado === 'DEGRADED';
            return (
              <div
                key={prov.id}
                style={{
                  padding: '0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: `1px solid ${esSaludable ? 'var(--border-subtle)' : esDegradado ? 'var(--brand-gold)' : 'var(--brand-primary)'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.375rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                    {prov.nombre}
                  </span>
                  <Badge variant={esSaludable ? 'emerald' : esDegradado ? 'gold' : 'ruby'} size="sm">
                    {prov.estado}
                  </Badge>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                  <span>Latencia:</span>
                  <span style={{ fontFamily: 'var(--wa-font-mono)', fontWeight: 600 }}>
                    {prov.latenciaPromedioMs > 0 ? `${prov.latenciaPromedioMs} ms` : 'Standby'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                  <span>Peticiones:</span>
                  <span style={{ fontFamily: 'var(--wa-font-mono)' }}>
                    {prov.peticionesExitosas} ok / {prov.peticionesFallidas} fail
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Perfil del Profesor Seleccionado */}
      {profesorActivo && (
        <Card variant="gold-border" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                position: 'relative',
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--brand-gold)',
                backgroundColor: 'var(--bg-subtle)',
                flexShrink: 0,
              }}
            >
              {profesorActivo.avatar ? (
                <Image
                  src={profesorActivo.avatar}
                  alt={profesorActivo.nombre}
                  fill
                  sizes="64px"
                  style={{ objectFit: 'cover' }}
                />
              ) : (
                <span style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--brand-primary)' }}>
                  {profesorActivo.nombre.charAt(0)}
                </span>
              )}
            </div>

            <div>
              <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {profesorActivo.nombre}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--brand-primary)', fontWeight: 600 }}>
                {profesorActivo.titulo}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {profesorActivo.materiaAsignada}
              </div>
            </div>
          </div>

          <form onSubmit={handleGuardarConfiguracion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Personalidad Pedagógica OpenMAIC
                </label>
                <select
                  value={personalidad}
                  onChange={(e) => setPersonalidad(e.target.value as any)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--wa-radius-md)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <option value="Lúdico y Cercano">Lúdico y Cercano (K-12 Elemental)</option>
                  <option value="Científico y Socrático">Científico y Socrático (Básica Superior & Bachillerato)</option>
                  <option value="Humanista y Reflexivo">Humanista y Reflexivo (Teología y Letras)</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Referencia del Lema Orientador
                </label>
                <input
                  type="text"
                  value={versiculoRef}
                  onChange={(e) => setVersiculoRef(e.target.value)}
                  placeholder="ej: Proverbios 2:6"
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
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Texto del Lema Orientador
              </label>
              <textarea
                value={versiculoTexto}
                onChange={(e) => setVersiculoTexto(e.target.value)}
                rows={2}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                  fontFamily: 'var(--wa-font-sans)',
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Tono Pedagógico e Instrucciones del Agente (OpenMAIC System Prompt)
              </label>
              <textarea
                value={tonoPedagogico}
                onChange={(e) => setTonoPedagogico(e.target.value)}
                rows={3}
                style={{
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '0.8125rem',
                  fontFamily: 'var(--wa-font-sans)',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="primary-navy" size="sm">
                Guardar Configuración Pedagógica
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Banco de Preguntas Formativas */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--wa-radius-lg)',
          border: '1px solid var(--border-default)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Banco de Preguntas Formativas (Quizzes OpenMAIC)
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Preguntas de autoevaluación activadas en el Tab 3 del aula virtual de {profesorActivo?.nombre}.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMostrarNuevaPregunta(!mostrarNuevaPregunta)}
          >
            {mostrarNuevaPregunta ? 'Cancelar' : '+ Agregar Pregunta'}
          </Button>
        </div>

        {mostrarNuevaPregunta && (
          <form
            onSubmit={handleAgregarPregunta}
            style={{
              padding: '1rem',
              borderRadius: 'var(--wa-radius-md)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Enunciado de la Pregunta *</label>
              <input
                type="text"
                value={nuevaPreguntaEnunciado}
                onChange={(e) => setNuevaPreguntaEnunciado(e.target.value)}
                placeholder="ej: ¿Cuántos cuartos forman un medio?"
                required
                style={{ padding: '0.5rem', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-default)', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <input
                type="text"
                value={nuevaOpA}
                onChange={(e) => setNuevaOpA(e.target.value)}
                placeholder="Opción A"
                required
                style={{ padding: '0.5rem', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-default)', fontSize: '0.8125rem' }}
              />
              <input
                type="text"
                value={nuevaOpB}
                onChange={(e) => setNuevaOpB(e.target.value)}
                placeholder="Opción B"
                required
                style={{ padding: '0.5rem', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-default)', fontSize: '0.8125rem' }}
              />
              <input
                type="text"
                value={nuevaOpC}
                onChange={(e) => setNuevaOpC(e.target.value)}
                placeholder="Opción C"
                style={{ padding: '0.5rem', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-default)', fontSize: '0.8125rem' }}
              />
              <input
                type="text"
                value={nuevaOpD}
                onChange={(e) => setNuevaOpD(e.target.value)}
                placeholder="Opción D"
                style={{ padding: '0.5rem', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-default)', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Opción Correcta:</label>
              <select
                value={opcionCorrectaIdx}
                onChange={(e) => setOpcionCorrectaIdx(Number(e.target.value))}
                style={{ padding: '0.375rem 0.5rem', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-default)', fontSize: '0.8125rem' }}
              >
                <option value={0}>Opción A</option>
                <option value={1}>Opción B</option>
                <option value={2}>Opción C</option>
                <option value={3}>Opción D</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Explicación Socrática (Retroalimentación inmediata)</label>
              <input
                type="text"
                value={explicacionSocratica}
                onChange={(e) => setExplicacionSocratica(e.target.value)}
                placeholder="Explicación pedagógica cuando el alumno acierta o falla"
                style={{ padding: '0.5rem', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-default)', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="primary-navy" size="sm">
                Guardar en Banco
              </Button>
            </div>
          </form>
        )}

        {/* Lista de preguntas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {profesorActivo?.bancoPreguntas.map((p, idx) => (
            <div
              key={p.id}
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--wa-radius-md)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                  {idx + 1}. {p.enunciado}
                </span>
                <Badge variant="emerald" size="sm">
                  Correcta: Opción {String.fromCharCode(65 + p.respuestaCorrecta)}
                </Badge>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.375rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {p.opciones.map((op, oIdx) => (
                  <span
                    key={oIdx}
                    style={{
                      padding: '2px 6px',
                      borderRadius: 'var(--wa-radius-xs, 4px)',
                      backgroundColor: oIdx === p.respuestaCorrecta ? 'rgba(15, 110, 86, 0.15)' : 'var(--bg-surface)',
                      border: oIdx === p.respuestaCorrecta ? '1px solid var(--accent-study)' : '1px solid var(--border-subtle)',
                    }}
                  >
                    {String.fromCharCode(65 + oIdx)}. {op}
                  </span>
                ))}
              </div>

              {p.explicacionSocratica && (
                <div style={{ fontSize: '0.6875rem', color: 'var(--brand-primary)', fontStyle: 'italic', marginTop: '0.375rem' }}>
                  💡 Explicación: {p.explicacionSocratica}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tareas del Portafolio Ministerial */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--wa-radius-lg)',
          border: '1px solid var(--border-default)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Tareas Asignadas y Rúbricas MINEDUC
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Proyectos prácticos (PBL) revisados y ponderados para el portafolio escolar.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMostrarNuevaTarea(!mostrarNuevaTarea)}
          >
            {mostrarNuevaTarea ? 'Cancelar' : '+ Nueva Tarea PBL'}
          </Button>
        </div>

        {mostrarNuevaTarea && (
          <form
            onSubmit={handleAgregarTarea}
            style={{
              padding: '1rem',
              borderRadius: 'var(--wa-radius-md)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Título de la Tarea *</label>
                <input
                  type="text"
                  value={tareaTitulo}
                  onChange={(e) => setTareaTitulo(e.target.value)}
                  placeholder="ej: Desafío de Fracciones en Cocina"
                  required
                  style={{ padding: '0.5rem', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-default)', fontSize: '0.8125rem' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Ponderación (% de la nota)</label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={tareaPonderacion}
                  onChange={(e) => setTareaPonderacion(Number(e.target.value))}
                  style={{ padding: '0.5rem', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-default)', fontSize: '0.8125rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Descripción de la Evidencia Requerida</label>
              <textarea
                value={tareaDescripcion}
                onChange={(e) => setTareaDescripcion(e.target.value)}
                rows={2}
                placeholder="Instrucciones para la fotografía, bitácora o reporte escrito..."
                style={{ padding: '0.5rem', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-default)', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Criterio de Evaluación / Rúbrica MINEDUC</label>
              <input
                type="text"
                value={tareaRubrica}
                onChange={(e) => setTareaRubrica(e.target.value)}
                placeholder="ej: Demostración clara del principio con aplicación en el hogar."
                style={{ padding: '0.5rem', borderRadius: 'var(--wa-radius-sm)', border: '1px solid var(--border-default)', fontSize: '0.8125rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" variant="primary-navy" size="sm">
                Publicar Tarea en Moodle
              </Button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {profesorActivo?.tareasAsignadas.map((t) => (
            <div
              key={t.id}
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--wa-radius-md)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
                  {t.titulo}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.125rem' }}>
                  {t.descripcion}
                </div>
                {t.rubricaMINEDUC && (
                  <div style={{ fontSize: '0.6875rem', color: 'var(--brand-gold-dark)', marginTop: '0.25rem' }}>
                    📋 Rúbrica: {t.rubricaMINEDUC}
                  </div>
                )}
              </div>

              <Badge variant="gold" size="sm">
                {t.ponderacion}% Ponderación
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

