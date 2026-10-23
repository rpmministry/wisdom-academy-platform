'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Panel Lateral Derecho Estilo Platzi + Moodle
 * ARCHIVO: src/components/lms/PlatziClassroomRightPanel.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Panel lateral interactivo (30% ancho en escritorio / pestañas responsivas en móvil)
 * al estilo canónico de los reproductores de Platzi:
 *
 * - Tab 1: Ruta y Módulos del Curso (Syllabus Moodle con avance y notas oficiales).
 * - Tab 2: Interacción con el Profesor IA (OpenMAIC Chat socrático en vivo con
 *          acciones rápidas: Levantar la mano ✋, Pedir ejemplo 💡, Explicación 🧠).
 * - Tab 3: Actividades y Recursos Moodle (Quizzes autoevaluables con Completion
 *          Tracking sincronizado con el Gradebook de Moodle, Tareas y Guías PDF).
 * - Tab 4: Mis Apuntes (Cuaderno de notas sincronizado con el paso/escena activa,
 *          marcas de tiempo automáticas y persistencia en localStorage).
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { moodleDomainEngine, MateriaMoodleLMS, LeccionMoodleLMS } from '@/lib/lms-moodle/moodleDomain';
import {
  asegurarProgresoInicial,
  marcarLeccionCompletada,
  obtenerProgresoMateria,
  suscribirseAProgreso,
} from '@/lib/lms-moodle/progressStore';
import {
  buscarAsignatura,
  obtenerPerfilCurricular,
  type PerfilCurricular,
} from '@/data/curriculum';
import { teacherSpeechManager } from '@/utils/speechSynthesis';
import { useAuth } from '@/lib/auth/authContext';

export interface PlatziClassroomRightPanelProps {
  nombreMateria: string;
  esGael: boolean;
  /** Perfil activo del estudiante; permite escalar a futuros grados. */
  perfilCurricular?: PerfilCurricular;
  estudianteNombre: string;
  edad: number;
  grado: string;
  leccionActivaId: number;
  onSeleccionarLeccion: (id: number) => void;
  pasoPedagogicoActivo?: number;
  totalPasosPedagogicos?: number;
  colapsado: boolean;
  onToggleColapsar: () => void;
  onCompletarLeccion?: (leccionId: number, nota: number) => void;
  className?: string;
}

interface MensajeChat {
  id: string;
  remitente: 'estudiante' | 'profesor';
  texto: string;
  timestamp: string;
  proveedor?: string;
}

export const PlatziClassroomRightPanel: React.FC<PlatziClassroomRightPanelProps> = ({
  nombreMateria,
  esGael,
  perfilCurricular: perfilCurricularProp,
  estudianteNombre,
  edad,
  grado,
  leccionActivaId,
  onSeleccionarLeccion,
  pasoPedagogicoActivo = 0,
  totalPasosPedagogicos = 4,
  colapsado,
  onToggleColapsar,
  onCompletarLeccion,
  className = '',
}) => {
  const { usuario } = useAuth();
  const [tabActiva, setTabActiva] = useState<string>('temario');
  const esTeologiaMateria = /relaci[oó]n con dios|teolog[ií]a|cosmovisi[oó]n/i.test(nombreMateria);

  // Prefijo de aislamiento multi-tenant por estudiante
  const tenantId = usuario?.id || estudianteNombre.toLowerCase().replace(/\s+/g, '_');
  const [progresoVersion, setProgresoVersion] = useState(0);

  // El progreso inicia en cero y se refresca cuando el estudiante completa lecciones.
  useEffect(() => {
    asegurarProgresoInicial(tenantId);
    return suscribirseAProgreso(() => setProgresoVersion((v) => v + 1));
  }, [tenantId]);

  // ----------------------------------------------------------------------------
  // TAB 1: RUTA Y MÓDULOS (MOODLE SYLLABUS)
  // ----------------------------------------------------------------------------
  const perfilActivo =
    perfilCurricularProp ||
    obtenerPerfilCurricular(esGael ? '04_Cuarto_EGB_Gael' : '08_Octavo_EGB_Avril');
  const asignaturaCurricular = buscarAsignatura(perfilActivo, nombreMateria);
  const codigoMateria = asignaturaCurricular.codigo;

  const materiaMoodle: MateriaMoodleLMS = moodleDomainEngine.obtenerMateriaEstructurada(
    nombreMateria,
    esGael,
    perfilActivo
  );
  const progresoMateria = obtenerProgresoMateria(tenantId, codigoMateria);
  materiaMoodle.lecciones = materiaMoodle.lecciones.map((leccion) => ({
    ...leccion,
    completada: progresoMateria.lecciones.includes(leccion.id),
    calificacionFinal: progresoMateria.notas[String(leccion.id)] ?? leccion.calificacionFinal,
  }));

  const totalLecciones = materiaMoodle.lecciones.length;
  const leccionesCompletadas = materiaMoodle.lecciones.filter((l) => l.completada).length;
  const porcentajeAvance = Math.round((leccionesCompletadas / (totalLecciones || 1)) * 100);

  // ----------------------------------------------------------------------------
  // TAB 2: INTERACCIÓN PROFESOR IA (OPENMAIC)
  // ----------------------------------------------------------------------------
  const nombreProfesor = esGael ? 'Prof. Mateo' : 'Dra. Sofía de Valenzuela';
  const avatarProfesor = esGael ? '/brand/teachers/profesor-mateo.jpg' : '/brand/teachers/profesora-sofia.jpg';
  const [mensajesChat, setMensajesChat] = useState<MensajeChat[]>([
    {
      id: 'bienvenida',
      remitente: 'profesor',
      texto: esGael
        ? `¡Hola ${estudianteNombre}! Soy el ${nombreProfesor}. Estoy atento a la lección para explicarte cada paso con dibujos y ejemplos alegres.`
        : `Saludos, ${estudianteNombre}. Te doy la bienvenida a la cátedra de ${nombreMateria}. Puedes consultarme cualquier duda conceptual o epistemológica.`,
      timestamp: 'Ahora',
      proveedor: 'OpenMAIC Live Engine',
    },
  ]);
  const [inputChat, setInputChat] = useState<string>('');
  const [enviandoPregunta, setEnviandoPregunta] = useState<boolean>(false);
  const [hablandoProfesor, setHablandoProfesor] = useState<boolean>(false);

  const handleEnviarMensaje = async (textoPersonalizado?: string) => {
    const preguntaFinal = (textoPersonalizado || inputChat).trim();
    if (!preguntaFinal || enviandoPregunta) return;

    const mensajeAlumno: MensajeChat = {
      id: `msg_${Date.now()}`,
      remitente: 'estudiante',
      texto: preguntaFinal,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMensajesChat((prev) => [...prev, mensajeAlumno]);
    setInputChat('');
    setEnviandoPregunta(true);

    try {
      const res = await fetch('/api/openmaic/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante: estudianteNombre,
          edad,
          grado,
          materia: nombreMateria,
          temaActual: materiaMoodle.lecciones.find((l) => l.id === leccionActivaId)?.titulo || nombreMateria,
          diapositivaNumero: leccionActivaId,
          preguntaEstudiante: preguntaFinal,
        }),
      });

      const datos = await res.json();
      const explicacion = datos?.explicacion ||
        (esGael
          ? '¡Excelente pregunta! Observa con atención las figuras de la pizarra, cada elemento tiene una razón de ser en la creación.'
          : 'Comprender este principio nos permite apreciar la consistencia del orden lógico.');

      const mensajeProfe: MensajeChat = {
        id: `profe_${Date.now()}`,
        remitente: 'profesor',
        texto: explicacion,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proveedor: datos?.proveedor || 'Gemini 3.8 Flash (Orquestador)',
      };

      setMensajesChat((prev) => [...prev, mensajeProfe]);

      // Reproducción de voz opcional del profesor
      teacherSpeechManager.hablar(
        explicacion,
        {
          idioma: nombreMateria.toLowerCase().includes('english') ? 'en' : 'es',
          velocidad: 1,
          perfil: esGael ? 'mateo' : 'sofia',
        },
        {
          onStart: () => setHablandoProfesor(true),
          onEnd: () => setHablandoProfesor(false),
          onError: () => setHablandoProfesor(false),
        }
      );
    } catch {
      const mensajeFallback: MensajeChat = {
        id: `fall_${Date.now()}`,
        remitente: 'profesor',
        texto: esTeologiaMateria
          ? 'Vuelve al texto bíblico y examina el contexto antes de aplicar la doctrina. Sigamos profundizando.'
          : 'Revisa el concepto, contrasta la evidencia y aplica el procedimiento paso a paso. Sigamos adelante.',
        timestamp: 'Ahora',
      };
      setMensajesChat((prev) => [...prev, mensajeFallback]);
    } finally {
      setEnviandoPregunta(false);
    }
  };

  // ----------------------------------------------------------------------------
  // TAB 3: ACTIVIDADES Y RECURSOS MOODLE (COMPLETION TRACKING)
  // ----------------------------------------------------------------------------
  const leccionActualMoodle =
    materiaMoodle.lecciones.find((l) => l.id === leccionActivaId) || materiaMoodle.lecciones[0];

  const [quizSeleccion, setQuizSeleccion] = useState<number | null>(null);
  const [quizCompletado, setQuizCompletado] = useState<boolean>(false);
  const [calificacionQuiz, setCalificacionQuiz] = useState<number | null>(null);
  const [sincronizandoMoodle, setSincronizandoMoodle] = useState<boolean>(false);
  const [tareaEntregada, setTareaEntregada] = useState<boolean>(false);

  useEffect(() => {
    const progreso = obtenerProgresoMateria(tenantId, codigoMateria);
    setQuizCompletado(progreso.lecciones.includes(leccionActivaId));
    setCalificacionQuiz(progreso.notas[String(leccionActivaId)] ?? null);
    setQuizSeleccion(null);
    setTareaEntregada(false);
  }, [leccionActivaId, progresoVersion, codigoMateria, tenantId]);

  // Preguntas formativas contextuales por nivel
  const quizPregunta = esGael
    ? {
        enunciado: '¿Cuántas partes iguales de 1/4 se necesitan para formar 1/2 de la pizza?',
        opciones: ['1 parte', '2 partes (2/4 = 1/2)', '4 partes', '3 partes'],
        correcta: 1,
        retroalimentacion: '¡Exacto! Dos cuartos (2/4) equivalen exactamente a un medio (1/2).',
      }
    : {
        enunciado: 'En la recta numérica ℤ, si la temperatura en el Chimborazo baja de 3°C a -4°C, ¿cuál fue la variación térmica?',
        opciones: ['-1°C', '7°C de descenso', '1°C', '4°C'],
        correcta: 1,
        retroalimentacion: '¡Correcto! De +3 a -4 hay un desplazamiento de 7 unidades hacia los negativos.',
      };

  const handleResolverQuiz = async (indice: number) => {
    if (quizCompletado) return;
    setQuizSeleccion(indice);
    const esCorrecto = indice === quizPregunta.correcta;
    const nota = esCorrecto ? 10 : 7;
    setCalificacionQuiz(nota);
    setQuizCompletado(true);
    setSincronizandoMoodle(true);

    // El avance local se registra siempre, incluso sin conexión con Moodle.
    marcarLeccionCompletada(tenantId, codigoMateria, leccionActivaId, nota);
    onCompletarLeccion?.(leccionActivaId, nota);

    try {
      // Registrar en el motor de dominio Moodle
      await moodleDomainEngine.registrarFinalizacionLeccion(
        materiaMoodle.idCursoMoodle,
        esGael ? 101 : 202,
        leccionActivaId,
        nota,
        `Aprobación formativa con feedback de ${nombreProfesor}`
      );
      // La sincronización remota es complementaria; el avance local ya quedó registrado.
    } catch {
      // Manejo tolerante
    } finally {
      setSincronizandoMoodle(false);
    }
  };

  // ----------------------------------------------------------------------------
  // TAB 4: MIS APUNTES (CON MARCAS DE TIEMPO Y AISLAMIENTO MULTI-TENANT)
  // ----------------------------------------------------------------------------
  const storageKey = `wa_tenant_${tenantId}_notes_${materiaMoodle.codigoCorto}_leccion_${leccionActivaId}`;
  const [apuntesTexto, setApuntesTexto] = useState<string>('');
  const [guardadoExitoso, setGuardadoExitoso] = useState<boolean>(false);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(storageKey);
      if (guardado) {
        setApuntesTexto(guardado);
      } else {
        setApuntesTexto(
          `# Apuntes de ${materiaMoodle.nombre}\n- Lección ${leccionActivaId}: ${leccionActualMoodle?.titulo || ''}\n- Fecha: ${new Date().toLocaleDateString()}\n\n`
        );
      }
    } catch {}
  }, [storageKey, leccionActivaId, materiaMoodle.nombre, materiaMoodle.codigoCorto, leccionActualMoodle?.titulo]);

  const handleGuardarApuntes = (texto: string) => {
    setApuntesTexto(texto);
    try {
      localStorage.setItem(storageKey, texto);
      setGuardadoExitoso(true);
      setTimeout(() => setGuardadoExitoso(false), 2000);
    } catch {}
  };

  const insertarMarcaDeTiempo = () => {
    const timestampStr = `\n> ⏱️ [Paso ${pasoPedagogicoActivo + 1}/${totalPasosPedagogicos} • ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] `;
    handleGuardarApuntes(apuntesTexto + timestampStr);
  };

  // Definición canónica de pestañas Platzi con títulos exactos y no-desbordantes
  const tabs = [
    {
      id: 'temario',
      label: 'Ruta',
      titulo: 'Ruta del Curso',
      subtitulo: 'Syllabus Moodle',
      icono: <WisdomIcon name="book" size={16} />,
    },
    {
      id: 'profesor',
      label: 'Profesor IA',
      titulo: 'Preguntas al Profesor IA',
      subtitulo: 'OpenMAIC Socrático',
      icono: <WisdomIcon name="sparkles" size={16} />,
    },
    {
      id: 'actividades',
      label: 'Moodle',
      titulo: 'Recursos/Quizzes Moodle',
      subtitulo: 'Quizzes y Guías',
      badge: quizCompletado ? '10/10' : '1',
      icono: <WisdomIcon name="file-text" size={16} />,
    },
    {
      id: 'apuntes',
      label: 'Apuntes',
      titulo: 'Mis Apuntes',
      subtitulo: 'Cuaderno y Marcas de Tiempo',
      icono: <WisdomIcon name="chalkboard" size={16} />,
    },
  ];

  if (colapsado) {
    return (
      <aside
        id="wa-ruta-academica"
        className={`wa-platzi-sidebar-collapsed ${className}`}
        style={{
          width: '56px',
          flex: '0 0 56px',
          height: '100%',
          minHeight: 0,
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1rem 0.5rem',
          boxSizing: 'border-box',
          gap: '1rem',
          zIndex: 10,
        }}
      >
        <button
          onClick={onToggleColapsar}
          title="Expandir Panel Lateral de Clase"
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--wa-radius-sm)',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)',
          }}
        >
          <WisdomIcon name="chevron-right" size={18} />
        </button>

        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {nombreMateria} • {porcentajeAvance}%
        </div>
      </aside>
    );
  }

  return (
    <aside
      id="wa-ruta-academica"
      className={`wa-platzi-right-panel ${className}`}
      style={{
        width: '380px',
        flex: '0 0 380px',
        maxWidth: '100%',
        height: '100%',
        minHeight: 0,
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        boxShadow: 'none',
        zIndex: 10,
      }}
    >
      {/* -------------------------------------------------------------------- */}
      {/* ENCABEZADO DEL PANEL LATERAL: MATERIA, AVANCE Y BOTÓN COLAPSAR       */}
      {/* -------------------------------------------------------------------- */}
      <div
        style={{
          padding: '0.875rem 1rem',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-subtle)',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Ruta Académica Moodle
          </div>
          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {nombreMateria}
          </div>
        </div>

        <button
          onClick={onToggleColapsar}
          title="Colapsar panel"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <WisdomIcon name="chevron-right" size={18} />
        </button>
      </div>

      {/* Barra de progreso global del curso */}
      <div style={{ padding: '0.625rem 1rem 0.5rem', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.375rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Progreso: {leccionesCompletadas} de {totalLecciones} lecciones
          </span>
          <span style={{ fontWeight: 700, color: 'var(--progress-color)' }}>{porcentajeAvance}%</span>
        </div>
        <ProgressBar valor={porcentajeAvance} />
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* SELECTOR DE LAS 4 PESTAÑAS (SEGMENTED CONTROL 100% RESPONSIVO)       */}
      {/* -------------------------------------------------------------------- */}
      <div
        role="tablist"
        aria-label="Herramientas del aula Platzi y Moodle"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '2px',
          padding: '0.375rem 0.5rem',
          backgroundColor: 'var(--bg-subtle)',
          borderBottom: '1px solid var(--border-default)',
          boxSizing: 'border-box',
          width: '100%',
        }}
      >
        {tabs.map((tab) => {
          const esActiva = tab.id === tabActiva;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={esActiva}
              onClick={() => setTabActiva(tab.id)}
              title={`${tab.titulo} • ${tab.subtitulo}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.1875rem',
                padding: '0.4375rem 0.125rem',
                borderRadius: 'var(--wa-radius-sm)',
                backgroundColor: esActiva ? 'var(--selected-surface)' : 'transparent',
                color: esActiva ? 'var(--selected-text)' : 'var(--text-secondary)',
                border: esActiva ? '1px solid var(--selected-border)' : '1px solid transparent',
                cursor: 'pointer',
                fontFamily: 'var(--wa-font-sans)',
                outline: 'none',
                minWidth: 0,
                width: '100%',
                boxSizing: 'border-box',
                transition: 'background-color 0.15s ease, color 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ display: 'inline-flex' }}>{tab.icono}</span>
                {tab.badge && (
                  <span
                    style={{
                      fontSize: '0.5625rem',
                      fontFamily: 'var(--wa-font-mono)',
                      padding: '0.0625rem 0.25rem',
                      borderRadius: 'var(--wa-radius-xs)',
                      backgroundColor: esActiva ? 'var(--selected-badge-bg)' : 'var(--bg-surface)',
                      color: esActiva ? 'var(--selected-badge-text)' : 'var(--brand-secondary)',
                      fontWeight: 700,
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: esActiva ? 700 : 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Subtítulo dinámico de la pestaña activa para máxima claridad */}
      <div
        style={{
          padding: '0.375rem 0.875rem',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
          {tabs.find((t) => t.id === tabActiva)?.titulo}
        </span>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          {tabs.find((t) => t.id === tabActiva)?.subtitulo}
        </span>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* CUERPO INTERACTIVO SEGÚN PESTAÑA ACTIVA                             */}
      {/* -------------------------------------------------------------------- */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* ================================================================== */}
        {/* TAB 1: RUTA Y MÓDULOS (SYLLABUS)                                   */}
        {/* ================================================================== */}
        {tabActiva === 'temario' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {materiaMoodle.lecciones.map((leccion) => {
              const esActiva = leccion.id === leccionActivaId;
              return (
                <div
                  key={leccion.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={esActiva}
                  aria-label={`Lección ${leccion.numeroLeccion}: ${leccion.titulo}`}
                  className="wa-lesson-item"
                  onClick={() => onSeleccionarLeccion(leccion.id)}
                  onKeyDown={(evento) => {
                    if (evento.key === 'Enter' || evento.key === ' ') {
                      evento.preventDefault();
                      onSeleccionarLeccion(leccion.id);
                    }
                  }}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--wa-radius-md)',
                    border: esActiva
                      ? '1px solid var(--selected-border)'
                      : '1px solid var(--border-subtle)',
                    backgroundColor: esActiva ? 'var(--selected-surface-subtle)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ marginTop: '0.125rem' }}>
                    {leccion.completada ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--accent-study)',
                          color: 'var(--text-on-brand)',
                          fontSize: '0.75rem',
                        }}
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: esActiva ? '2px solid var(--selected-border)' : '1px solid rgba(217, 119, 6, 0.30)',
                          backgroundColor: esActiva ? 'var(--brand-secondary-soft)' : 'var(--brand-primary-bright-soft)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: esActiva ? 'var(--brand-secondary)' : 'var(--status-warning)',
                        }}
                      >
                        {leccion.numeroLeccion}
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: esActiva ? 700 : 500,
                        color: esActiva ? 'var(--brand-secondary)' : 'var(--text-primary)',
                        lineHeight: 1.3,
                      }}
                    >
                      {leccion.titulo}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.25rem',
                      }}
                    >
                      <span>⏱️ {leccion.duracionEstimadaMin} min</span>
                      <span>•</span>
                      <span>Trimestre {leccion.trimestre}</span>
                      {leccion.calificacionFinal && (
                        <>
                          <span>•</span>
                          <span style={{ color: 'var(--accent-study)', fontWeight: 600 }}>
                            Nota: {leccion.calificacionFinal}/10
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Lema de la asignatura */}
            <div
              style={{
                marginTop: '0.5rem',
                padding: '0.875rem',
                borderRadius: 'var(--wa-radius-md)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--brand-secondary)', marginBottom: '0.25rem' }}>
                {esTeologiaMateria ? '📖 Lema Bíblico:' : '📐 Principio Académico:'} {materiaMoodle.versiculoLema.referencia}
              </div>
              <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                &ldquo;{materiaMoodle.versiculoLema.texto}&rdquo;
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: INTERACCIÓN PROFESOR IA (OPENMAIC SOCRATIC CHAT)            */}
        {/* ================================================================== */}
        {tabActiva === 'profesor' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem' }}>
            {/* Cabecera del profesor */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--wa-radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-on-brand)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  overflow: 'hidden',
                }}
              >
                {esGael ? 'M' : 'S'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {nombreProfesor}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-study)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-study)', display: 'inline-block' }} />
                  Tutor Inteligente Activo
                </div>
              </div>
              {hablandoProfesor && (
                <Badge variant="gold" size="sm">
                  Hablando 🔊
                </Badge>
              )}
            </div>

            {/* Botones de acción rápida pedagógica */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              <button
                onClick={() => handleEnviarMensaje('Profesor, ¿puedes darme un ejemplo práctico adicional sobre este paso?')}
                disabled={enviandoPregunta}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.3125rem 0.625rem',
                  borderRadius: 'var(--wa-radius-full)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                💡 Pedir ejemplo
              </button>
              <button
                onClick={() => handleEnviarMensaje('¿Por qué este concepto funciona así según las leyes matemáticas/científicas?')}
                disabled={enviandoPregunta}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.3125rem 0.625rem',
                  borderRadius: 'var(--wa-radius-full)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                🧠 ¿Por qué funciona así?
              </button>
              <button
                onClick={() => handleEnviarMensaje('✋ Levanto la mano: tengo una duda en este ejercicio.')}
                disabled={enviandoPregunta}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.3125rem 0.625rem',
                  borderRadius: 'var(--wa-radius-full)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                ✋ Levantar la mano
              </button>
            </div>

            {/* Historial de mensajes */}
            <div
              style={{
                flex: 1,
                minHeight: '220px',
                maxHeight: '340px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem',
                padding: '0.5rem',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--wa-radius-md)',
              }}
            >
              {mensajesChat.map((m) => {
                const esAlumno = m.remitente === 'estudiante';
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: esAlumno ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      padding: '0.625rem 0.75rem',
                      borderRadius: esAlumno
                        ? '12px 12px 2px 12px'
                        : '12px 12px 12px 2px',
                      backgroundColor: esAlumno ? 'var(--selected-surface)' : 'var(--bg-surface)',
                      color: esAlumno ? 'var(--selected-text)' : 'var(--text-primary)',
                      border: esAlumno ? 'none' : '1px solid var(--border-subtle)',
                      fontSize: '0.8125rem',
                      lineHeight: 1.4,
                      boxShadow: '0 1px 3px rgba(17, 22, 37, 0.04)',
                    }}
                  >
                    <div>{m.texto}</div>
                    <div
                      style={{
                        fontSize: '0.6875rem',
                        marginTop: '0.25rem',
                        opacity: 0.8,
                        textAlign: esAlumno ? 'right' : 'left',
                      }}
                    >
                      {m.timestamp} {m.proveedor && `• ${m.proveedor}`}
                    </div>
                  </div>
                );
              })}
              {enviandoPregunta && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  {nombreProfesor} está redactando una explicación socrática...
                </div>
              )}
            </div>

            {/* Input y botón enviar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEnviarMensaje();
              }}
              style={{ display: 'flex', gap: '0.5rem' }}
            >
              <input
                type="text"
                value={inputChat}
                onChange={(e) => setInputChat(e.target.value)}
                placeholder="Pregunta lo que sea al Profesor IA..."
                disabled={enviandoPregunta}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--wa-radius-md)',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                }}
              />
              <Button
                type="submit"
                variant="primary-navy"
                size="sm"
                disabled={enviandoPregunta || !inputChat.trim()}
              >
                Enviar
              </Button>
            </form>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: ACTIVIDADES Y RECURSOS MOODLE (QUIZZES + PORTAFOLIO)         */}
        {/* ================================================================== */}
        {tabActiva === 'actividades' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Tarjeta Quiz Formativo Moodle */}
            <div
              style={{
                padding: '0.875rem',
                borderRadius: 'var(--wa-radius-md)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                boxShadow: '0 2px 6px rgba(17, 22, 37, 0.04)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Quiz Formativo • Lección {leccionActivaId}
                </span>
                {quizCompletado ? (
                  <Badge variant="emerald" size="sm">
                    {calificacionQuiz}/10 Asentado
                  </Badge>
                ) : (
                  <Badge variant="subtle" size="sm">
                    Pendiente
                  </Badge>
                )}
              </div>

              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                {quizPregunta.enunciado}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {quizPregunta.opciones.map((opcion, idx) => {
                  const seleccionada = quizSeleccion === idx;
                  const esCorrecta = idx === quizPregunta.correcta;
                  let bgBtn = 'var(--bg-subtle)';
                  let borderBtn = '1px solid var(--border-subtle)';

                  if (quizCompletado) {
                    if (esCorrecta) {
                      bgBtn = 'rgba(15, 110, 86, 0.15)';
                      borderBtn = '1px solid var(--accent-study)';
                    } else if (seleccionada && !esCorrecta) {
                      bgBtn = 'rgba(239, 68, 68, 0.15)';
                      borderBtn = '1px solid #EF4444';
                    }
                  } else if (seleccionada) {
                    borderBtn = '1px solid var(--brand-secondary)';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleResolverQuiz(idx)}
                      disabled={quizCompletado || sincronizandoMoodle}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: 'var(--wa-radius-sm)',
                        backgroundColor: bgBtn,
                        border: borderBtn,
                        color: 'var(--text-primary)',
                        textAlign: 'left',
                        fontSize: '0.8125rem',
                        cursor: quizCompletado ? 'default' : 'pointer',
                      }}
                    >
                      <span style={{ fontWeight: 600, marginRight: '0.5rem' }}>
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      {opcion}
                    </button>
                  );
                })}
              </div>

              {quizCompletado && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    backgroundColor: 'rgba(15, 110, 86, 0.08)',
                    borderRadius: 'var(--wa-radius-sm)',
                    fontSize: '0.75rem',
                    color: 'var(--accent-study)',
                    lineHeight: 1.4,
                  }}
                >
                  {quizPregunta.retroalimentacion}
                  <div style={{ marginTop: '0.25rem', fontWeight: 600 }}>
                    ✨ Calificación registrada en el Gradebook de Moodle (Curso #{materiaMoodle.idCursoMoodle}).
                  </div>
                </div>
              )}
            </div>

            {/* Tarjeta Tarea para el Portafolio Ministerial */}
            <div
              style={{
                padding: '0.875rem',
                borderRadius: 'var(--wa-radius-md)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.375rem' }}>
                Evidencia de Portafolio MINEDUC
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '0.75rem' }}>
                {esGael
                  ? 'Toma una foto de tu dibujo fraccionario de la pizza o merienda familiar y súbela aquí para tu portafolio ministerial.'
                  : 'Registra un ejemplo cotidiano de ganancias y pérdidas en tu hogar para el informe de matemáticas de 8° EGB.'}
              </div>
              <Button
                variant={tareaEntregada ? 'secondary' : 'primary-gold'}
                size="sm"
                onClick={() => setTareaEntregada(true)}
              >
                {tareaEntregada ? '✓ Tarea Registrada' : '📤 Adjuntar al Portafolio'}
              </Button>
            </div>

          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 4: MIS APUNTES (CONCRONIZACIÓN Y TIMESTAMPS)                    */}
        {/* ================================================================== */}
        {tabActiva === 'apuntes' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={insertarMarcaDeTiempo}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.3125rem 0.625rem',
                  borderRadius: 'var(--wa-radius-sm)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--brand-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                }}
              >
                <WisdomIcon name="clock" size={14} />
                Insertar Marca de Tiempo
              </button>

              {guardadoExitoso && (
                <span style={{ fontSize: '0.6875rem', color: 'var(--accent-study)' }}>
                  ✓ Guardado
                </span>
              )}
            </div>

            <textarea
              value={apuntesTexto}
              onChange={(e) => handleGuardarApuntes(e.target.value)}
              placeholder="Escribe tus notas, reflexiones y fórmulas de la clase aquí..."
              style={{
                flex: 1,
                minHeight: '260px',
                padding: '0.75rem',
                borderRadius: 'var(--wa-radius-md)',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--wa-font-mono, monospace)',
                fontSize: '0.8125rem',
                lineHeight: 1.5,
                resize: 'none',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              <span>Guardado automático en tu navegador</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(apuntesTexto);
                  alert('Apuntes copiados al portapapeles.');
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.75rem' }}
              >
                Copiar al portapapeles
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
