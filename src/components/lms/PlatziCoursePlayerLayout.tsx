'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Reproductor de Clases Estilo Platzi con OpenMAIC
 * ARCHIVO: src/components/lms/PlatziCoursePlayerLayout.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Layout principal del aula virtual estilo Platzi:
 * 1. Barra Superior Neuro-Ergonómica:
 *    - Logotipo oficial de Wisdom Academy y migas de pan (Breadcrumb curricular).
 *    - Conmutador de perfil de estudiante (Gael 4° EGB / Avril 8° EGB).
 *    - Indicador de progreso Moodle, alternador de tema claro/oscuro y retorno al dashboard.
 * 2. Lienzo Central Dividido (Estilo Platzi Canónico):
 *    - Escenario Central (70% en Desktop / 100% en Modo Teatro / Móvil):
 *      Lienzo Interactivo de OpenMAIC con controles de ritmo pedagógico (0.85x, 1.0x, 1.25x),
 *      modo teatro/enfoque, y banner de Completion Tracking al culminar la sesión.
 *    - Panel Lateral Derecho (30% en Desktop / Pestañas en Móvil):
 *      Panel Platzi con 4 pestañas:
 *      * Tab 1: Ruta y Módulos del Curso (Moodle).
 *      * Tab 2: Interacción con el Profesor IA (OpenMAIC Chat socrático).
 *      * Tab 3: Actividades y Recursos Moodle (Quizzes autoevaluables, tareas y guías).
 *      * Tab 4: Mis Apuntes (Notas con marcas de tiempo sincronizadas con la lección).
 * 3. Modales Integrados:
 *    - Consulta IA en ventana flotante, Hub de videollamadas y Guía didáctica oficial PDF.
 * ==============================================================================
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/authContext';
import { OpenMAICClassroomViewer } from '@/components/openmaic/OpenMAICClassroomViewer';
import { OpenMAICChatModal } from '@/components/openmaic/OpenMAICChatModal';
import { PlatziClassroomRightPanel } from '@/components/lms/PlatziClassroomRightPanel';
import { VideoTutoringModal } from '@/components/lms/VideoTutoringModal';
import { EducationalResourcesPanel } from '@/components/lms/EducationalResourcesPanel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import {
  curriculumContentEngine,
  DiapositivaLeccion,
  IntervencionOpenMAIC,
} from '@/services/curriculumContentEngine';
import { printableGuideGenerator } from '@/services/printableGuideGenerator';
import { teacherSpeechManager } from '@/utils/speechSynthesis';
import { moodleDomainEngine } from '@/lib/lms-moodle/moodleDomain';
import { obtenerPerfilCurricular } from '@/data/curriculum';

function normalizarClave(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Respeta la preferencia del estudiante de reducir el movimiento. */
function comportamientoScrollPreferido(): ScrollBehavior {
  if (typeof window === 'undefined') return 'auto';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

interface PlatziCoursePlayerLayoutProps {
  resource?: { slug: string; title: string } | null;
}

export const PlatziCoursePlayerLayout: React.FC<PlatziCoursePlayerLayoutProps> = ({
  resource = null,
}) => {
  const { estudianteActivo } = useAuth();

  const esGael = estudianteActivo.edad <= 10;
  const materiaInicial = esGael ? 'Matemáticas' : 'Matemáticas y Pre-Álgebra';
  const [nombreMateria, setNombreMateria] = useState<string>(materiaInicial);
  const [unidadActivaId, setUnidadActivaId] = useState<number>(1);
  const [diapositivaActual, setDiapositivaActual] = useState<number>(1);
  const [hablandoProfesor, setHablandoProfesor] = useState<boolean>(false);
  const [sidebarColapsado, setSidebarColapsado] = useState<boolean>(false);
  const [modoTeatro, setModoTeatro] = useState<boolean>(false);
  const [ritmoAprendizaje, setRitmoAprendizaje] = useState<'lento' | 'normal' | 'acelerado'>('normal');
  const [pasoPedagogicoActivo, setPasoPedagogicoActivo] = useState<number>(0);
  const [panelRecursosExpandido, setPanelRecursosExpandido] = useState<boolean>(false);
  const [notificacionCompletado, setNotificacionCompletado] = useState<{
    mostrar: boolean;
    leccionId: number;
    nota: number;
  } | null>(null);
  const estudiantePrevioRef = useRef<number>(estudianteActivo.idMoodle);
  const resourceAppliedRef = useRef<string | null>(null);

  // Modales
  const [modalIAConsulta, setModalIAConsulta] = useState<boolean>(false);
  const [modalVideollamada, setModalVideollamada] = useState<boolean>(false);
  const [modalGuiaPdf, setModalGuiaPdf] = useState<boolean>(false);
  const [modalGuias, setModalGuias] = useState<boolean>(false);
  const [guiaGeneradaHtml, setGuiaGeneradaHtml] = useState<string>('');

  // Malla curricular real del estudiante y estructura Moodle de la asignatura.
  const perfilCurricular = useMemo(
    () => obtenerPerfilCurricular(estudianteActivo.codigoCarpetaAnioDrive),
    [estudianteActivo.codigoCarpetaAnioDrive]
  );
  const asignaturasDisponibles = perfilCurricular.asignaturas;

  useEffect(() => {
    if (!resource) {
      resourceAppliedRef.current = null;
      return;
    }
    if (resourceAppliedRef.current === resource.slug) return;
    resourceAppliedRef.current = resource.slug;
    const rawTitle = resource.title.split('·')[0]?.split('|')[0]?.trim() || resource.title;
    const target = normalizarClave(rawTitle);
    if (!target) return;
    const match = asignaturasDisponibles.find((asignatura) => {
      const name = normalizarClave(asignatura.nombre);
      const shortName = normalizarClave(asignatura.nombreCorto);
      return (
        name === target ||
        shortName === target ||
        name.includes(target) ||
        target.includes(name) ||
        shortName.includes(target)
      );
    });
    if (!match) return;
    setNombreMateria(match.nombre);
    setUnidadActivaId(1);
    setDiapositivaActual(1);
    setPasoPedagogicoActivo(0);
    setNotificacionCompletado(null);
  }, [resource, asignaturasDisponibles]);

  const materiaMoodle = useMemo(
    () =>
      moodleDomainEngine.obtenerMateriaEstructurada(
        nombreMateria,
        esGael,
        perfilCurricular
      ),
    [nombreMateria, esGael, perfilCurricular]
  );
  const unidadActiva =
    materiaMoodle.lecciones.find((leccion) => leccion.id === unidadActivaId) ||
    materiaMoodle.lecciones[0];

  // Obtener datos curriculares de la unidad y fase activas.
  const leccionBase = useMemo(
    () =>
      curriculumContentEngine.obtenerLeccion(
        nombreMateria,
        esGael,
        unidadActiva?.titulo,
        perfilCurricular
      ),
    [nombreMateria, esGael, unidadActiva?.titulo, perfilCurricular]
  );
  const totalDiapositivas = leccionBase.diapositivas.length || 4;
  const diapositivaActiva: DiapositivaLeccion =
    leccionBase.diapositivas[diapositivaActual - 1] || leccionBase.diapositivas[0];

  const intervencionActiva: IntervencionOpenMAIC = curriculumContentEngine.obtenerIntervencionProfesor(
    nombreMateria,
    esGael,
    'slides',
    diapositivaActual,
    unidadActiva?.titulo,
    perfilCurricular
  );

  // Contexto no personal para el panel de recursos audiovisuales.
  const contextoRecursos = useMemo(
    () =>
      curriculumContentEngine.obtenerContextoAprendizajeDesdePerfil(
        perfilCurricular,
        nombreMateria,
        unidadActiva?.titulo,
        diapositivaActual
      ),
    [perfilCurricular, nombreMateria, unidadActiva?.titulo, diapositivaActual]
  );

  // Al cambiar de estudiante, reiniciar asignatura, unidad y fase.
  useEffect(() => {
    if (estudiantePrevioRef.current === estudianteActivo.idMoodle) return;
    estudiantePrevioRef.current = estudianteActivo.idMoodle;
    teacherSpeechManager.detener();
    setHablandoProfesor(false);
    setNombreMateria(estudianteActivo.edad <= 10 ? 'Matemáticas' : 'Matemáticas y Pre-Álgebra');
    setUnidadActivaId(1);
    setDiapositivaActual(1);
    setPasoPedagogicoActivo(0);
    setNotificacionCompletado(null);
    setModoTeatro(false);
  }, [estudianteActivo.idMoodle, estudianteActivo.edad]);

  // Restaurar el estado del panel durante la sesión de estudio.
  useEffect(() => {
    try {
      const guardado = sessionStorage.getItem('wa_recursos_panel_expandido');
      if (guardado === 'true' || guardado === 'false') {
        setPanelRecursosExpandido(guardado === 'true');
        return;
      }
    } catch {}
    setPanelRecursosExpandido(window.matchMedia('(min-width: 1280px)').matches);
  }, []);

  const alternarPanelRecursos = useCallback(() => {
    setPanelRecursosExpandido((previo) => {
      const nuevo = !previo;
      try {
        sessionStorage.setItem('wa_recursos_panel_expandido', String(nuevo));
      } catch {}
      return nuevo;
    });
  }, []);

  // Al pasar de escritorio a tablet/móvil, el panel se contrae para no tapar
  // la clase como cajón inesperado. El estudiante puede reabrirlo cuando quiera.
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1279px)');
    let estabaSuperpuesto = media.matches;
    const manejarCambio = () => {
      const ahoraSuperpuesto = media.matches;
      if (ahoraSuperpuesto && !estabaSuperpuesto) {
        setPanelRecursosExpandido(false);
        try {
          sessionStorage.setItem('wa_recursos_panel_expandido', 'false');
        } catch {}
      }
      estabaSuperpuesto = ahoraSuperpuesto;
    };
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', manejarCambio);
      return () => media.removeEventListener('change', manejarCambio);
    }
    media.addListener(manejarCambio);
    return () => media.removeListener(manejarCambio);
  }, []);

  const handleCambiarMateria = (evento: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevaMateria = evento.target.value;
    if (nuevaMateria === nombreMateria) return;
    teacherSpeechManager.detener();
    setHablandoProfesor(false);
    setNombreMateria(nuevaMateria);
    setUnidadActivaId(1);
    setDiapositivaActual(1);
    setPasoPedagogicoActivo(0);
    setNotificacionCompletado(null);
  };

  const handleSeleccionarUnidad = (id: number) => {
    setUnidadActivaId(id);
    setDiapositivaActual(1);
    setPasoPedagogicoActivo(0);
    setNotificacionCompletado(null);
  };

  const handleToggleVoz = (velocidad: number = 1) => {
    if (hablandoProfesor) {
      teacherSpeechManager.detener();
      setHablandoProfesor(false);
    } else {
      setHablandoProfesor(true);
      const pasos = curriculumContentEngine.obtenerPasosExplicacion(
        diapositivaActiva,
        esGael,
        nombreMateria
      );
      const guion = pasos[0]?.guionVoz || diapositivaActiva.contenidoExplicativo;
      teacherSpeechManager.hablar(
        guion,
        {
          idioma: 'es',
          velocidad,
          perfil: esGael ? 'mateo' : 'sofia',
        },
        {
          onStart: () => setHablandoProfesor(true),
          onEnd: () => setHablandoProfesor(false),
          onError: () => setHablandoProfesor(false),
        }
      );
    }
  };

  const handleAbrirGuiaPdf = () => {
    const bloqueDemo = {
      id: 'bloque_01',
      numeroBloque: 1,
      horaInicio: '08:45',
      horaFin: '09:30',
      nombreMateria,
      modalidad: 'AGENTE_IA_OPENMAIC' as const,
    };
    const html = printableGuideGenerator.generarHtmlGuia(
      estudianteActivo,
      bloqueDemo,
      leccionBase
    );
    setGuiaGeneradaHtml(html);
    setModalGuiaPdf(true);
  };

  const handleLeccionCompletada = async () => {
    const nota = 9.8;
    setNotificacionCompletado({
      mostrar: true,
      leccionId: unidadActivaId,
      nota,
    });

    try {
      await moodleDomainEngine.registrarFinalizacionLeccion(
        materiaMoodle.idCursoMoodle,
        esGael ? 101 : 202,
        unidadActivaId,
        nota,
        `Completitud de las 4 fases pedagógicas de OpenMAIC (fase ${diapositivaActual}).`
      );
    } catch {}
  };

  return (
    <div
      className="wa-platzi-classroom"
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--wa-font-sans)',
      }}
    >
      {/* ---------------------------------------------------------------------- */}
      {/* 1. BARRA SUPERIOR CANÓNICA (UI SHELL HEADER)                            */}
      {/* ---------------------------------------------------------------------- */}
      <header className="wa-classroom-header">
        <div className="wa-classroom-header-left">
          <div className="wa-classroom-breadcrumb">
            <span>{estudianteActivo.gradoEcuador}</span>
            <span aria-hidden="true">›</span>
            <span>{nombreMateria}</span>
            <span aria-hidden="true">›</span>
            <strong>Lección {unidadActivaId}</strong>
          </div>

          <label className="wa-classroom-subject-picker">
            <span className="wa-sr-only">Asignatura de la clase</span>
            <select
              value={nombreMateria}
              onChange={handleCambiarMateria}
              aria-label="Asignatura de la clase"
              data-testid="classroom-subject-select"
            >
              {asignaturasDisponibles.map((asignatura) => (
                <option key={asignatura.codigo} value={asignatura.nombre}>
                  {asignatura.nombre}
                </option>
              ))}
            </select>
          </label>
          {resource && (
            <Link href={`/recurso/${resource.slug}`} className="wa-classroom-resource-link">
              <WisdomIcon name="book" size={13} />
              <span>{resource.title}</span>
            </Link>
          )}
        </div>

        <div className="wa-classroom-actions">
          <span className="wa-classroom-session">
            <WisdomIcon name="user" size={14} />
            {estudianteActivo.nombreCompleto}
          </span>
          <Button
            variant="secondary"
            size="sm"
            className="wa-header-guides"
            icono={<WisdomIcon name="file-text" size={16} />}
            aria-label="Abrir el centro de guías de estudio"
            title="Abrir el centro de guías de estudio"
            onClick={() => setModalGuias(true)}
          >
            Guías
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="wa-header-tutoring"
            icono={<WisdomIcon name="video" size={16} />}
            aria-label="Abrir tutoría en vivo"
            title="Abrir tutoría en vivo"
            onClick={() => setModalVideollamada(true)}
          >
            Tutoría en Vivo
          </Button>
        </div>
      </header>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. CONTENEDOR PRINCIPAL ESTILO PLATZI: OPENMAIC + PANEL 4 TABS        */}
      {/* ---------------------------------------------------------------------- */}
      <div
        className="wa-classroom-content"
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
          position: 'relative',
        }}
      >
        {/* Columna Izquierda: Recursos de apoyo (retráctil, no tapa el visor). */}
        <EducationalResourcesPanel
          contexto={contextoRecursos}
          expandido={panelRecursosExpandido}
          onToggle={alternarPanelRecursos}
        />

        {/* Columna Central: Escenario OpenMAIC (Flexible con minWidth: 0 para evitar desbordes) */}
        <main
          className="wa-classroom-main"
          style={{
            flex: modoTeatro ? '1 1 100%' : '1 1 auto',
            minWidth: 0,
            minHeight: 0,
            overflowY: 'auto',
            padding: 'var(--carbon-space-3x)',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--carbon-space-2x)',
          }}
        >
          {/* Banner de Notificación de Completion Tracking */}
          {notificacionCompletado?.mostrar && (
            <div
              style={{
                backgroundColor: 'rgba(15, 110, 86, 0.12)',
                border: '1px solid var(--accent-study)',
                borderRadius: 'var(--wa-radius-md)',
                padding: '0.875rem 1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: 'var(--accent-study)',
                animation: 'fadeIn 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>🎉</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                    ¡Lección {notificacionCompletado.leccionId} Completada con Éxito!
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    Las 4 fases pedagógicas fueron superadas. Calificación asentada en Moodle: {notificacionCompletado.nota}/10.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setNotificacionCompletado(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Lienzo Interactivo de OpenMAIC (Preservado 100% y enriquecido) */}
          <div
            className="wa-classroom-stage"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--wa-radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-card)',
              overflow: 'hidden',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <OpenMAICClassroomViewer
              diapositiva={diapositivaActiva}
              diapositivaActual={diapositivaActual}
              totalDiapositivas={totalDiapositivas}
              nombreMateria={nombreMateria}
              nombreEstudiante={estudianteActivo.nombreCompleto}
              esGael={esGael}
              intervencion={intervencionActiva}
              hablandoProfesor={hablandoProfesor}
              ritmoAprendizaje={ritmoAprendizaje}
              modoTeatro={modoTeatro}
              onToggleTeatro={() => setModoTeatro(!modoTeatro)}
              onCambiarRitmo={(r) => setRitmoAprendizaje(r)}
              onPasoCambiado={(p) => setPasoPedagogicoActivo(p)}
              onLeccionCompletada={handleLeccionCompletada}
              onToggleVoz={handleToggleVoz}
              onCambiarDiapositiva={(nueva) => setDiapositivaActual(nueva)}
              onAbrirModalIA={() => setModalIAConsulta(true)}
            />
          </div>
        </main>

        {/* Columna Derecha: Panel Platzi 4 Tabs (30% ancho / oculto en Modo Teatro) */}
        {!modoTeatro && (
          <PlatziClassroomRightPanel
            nombreMateria={nombreMateria}
            esGael={esGael}
            perfilCurricular={perfilCurricular}
            estudianteNombre={estudianteActivo.nombreCompleto}
            edad={estudianteActivo.edad}
            grado={estudianteActivo.gradoEcuador}
            leccionActivaId={unidadActivaId}
            onSeleccionarLeccion={handleSeleccionarUnidad}
            pasoPedagogicoActivo={pasoPedagogicoActivo}
            totalPasosPedagogicos={4}
            colapsado={sidebarColapsado}
            onToggleColapsar={() => setSidebarColapsado(!sidebarColapsado)}
            onCompletarLeccion={(leccionId, nota) => {
              setNotificacionCompletado({
                mostrar: true,
                leccionId,
                nota,
              });
            }}
          />
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 2.5. DOCK INFERIOR MÓVIL (ZONA DEL PULGAR)                             */}
      {/* ---------------------------------------------------------------------- */}
      <nav className="wa-mobile-dock" aria-label="Acciones principales de la clase">
        <button
          type="button"
          className="wa-mobile-dock-item"
          onClick={() => window.scrollTo({ top: 0, behavior: comportamientoScrollPreferido() })}
          aria-label="Volver al inicio de la clase"
        >
          <WisdomIcon name="book" size={20} />
          <span>Clase</span>
        </button>
        <button
          type="button"
          className="wa-mobile-dock-item"
          onClick={() =>
            document
              .getElementById('wa-ruta-academica')
              ?.scrollIntoView({ behavior: comportamientoScrollPreferido(), block: 'start' })
          }
          aria-label="Abrir la ruta académica y el temario"
        >
          <WisdomIcon name="graduation-cap" size={20} />
          <span>Ruta</span>
        </button>
        <button
          type="button"
          className="wa-mobile-dock-item"
          onClick={alternarPanelRecursos}
          aria-label="Abrir los recursos de apoyo de la clase"
          aria-expanded={panelRecursosExpandido}
          aria-controls="wa-recursos-apoyo"
          data-testid="educational-dock-toggle"
        >
          <WisdomIcon name="video" size={20} />
          <span>Recursos</span>
        </button>
        <button
          type="button"
          className="wa-mobile-dock-item"
          onClick={() => setModalIAConsulta(true)}
          aria-label="Preguntar al profesor de inteligencia artificial"
        >
          <WisdomIcon name="sparkles" size={20} />
          <span>Preguntar</span>
        </button>
        <button
          type="button"
          className="wa-mobile-dock-item"
          onClick={() => setModalGuias(true)}
          aria-label="Abrir el centro de guías de estudio"
        >
          <WisdomIcon name="file-text" size={20} />
          <span>Guías</span>
        </button>
      </nav>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. MODALES INTEGRADOS (IA, VIDEOLLAMADAS, GUÍA IMPRIMIBLE PDF)         */}
      {/* ---------------------------------------------------------------------- */}
      <OpenMAICChatModal
        abierto={modalIAConsulta}
        onCerrar={() => setModalIAConsulta(false)}
        estudianteNombre={estudianteActivo.nombreCompleto}
        edad={estudianteActivo.edad}
        grado={estudianteActivo.gradoEcuador}
        materia={nombreMateria}
        temaActual={diapositivaActiva.titulo}
        diapositivaNumero={diapositivaActual}
      />

      <VideoTutoringModal
        abierto={modalVideollamada}
        onCerrar={() => setModalVideollamada(false)}
        estudianteNombre={estudianteActivo.nombreCompleto}
        materia={nombreMateria}
        esGael={esGael}
      />

      <Modal
        abierto={modalGuias}
        onCerrar={() => setModalGuias(false)}
        titulo="Centro de guías de estudio"
        subtitulo={`${nombreMateria} • ${estudianteActivo.gradoEcuador}`}
        anchoMaximo="720px"
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: '0.875rem' }}>
          <button
            type="button"
            onClick={() => {
              setModalGuias(false);
              handleAbrirGuiaPdf();
            }}
            style={{
              textAlign: 'left',
              padding: '1.125rem',
              borderRadius: 'var(--wa-radius-md)',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-surface)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <WisdomIcon name="book" size={24} color="primary" />
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>Guía de esta materia</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.45 }}>
              Contenido de la clase actual, objetivos, actividad y espacio de trabajo para imprimir o guardar en PDF.
            </span>
            <span style={{ color: 'var(--brand-primary)', fontSize: '0.8125rem', fontWeight: 700, marginTop: '0.25rem' }}>
              Abrir guía de la materia →
            </span>
          </button>

          <a
            href={`/api/curriculum/daily-guide?estudiante=${encodeURIComponent(estudianteActivo.nombreCompleto)}&dia=1`}
            target="_blank"
            rel="noreferrer"
            style={{
              textAlign: 'left',
              padding: '1.125rem',
              borderRadius: 'var(--wa-radius-md)',
              border: '1px solid var(--border-gold)',
              background: 'var(--bg-surface)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              textDecoration: 'none',
            }}
          >
            <WisdomIcon name="calendar" size={24} color="gold" />
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.9375rem' }}>Guía general del día</strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.45 }}>
              Las cinco asignaturas de la jornada, horario, objetivos y talleres en un solo documento.
            </span>
            <span style={{ color: 'var(--brand-gold-dark)', fontSize: '0.8125rem', fontWeight: 700, marginTop: '0.25rem' }}>
              Abrir guía general →
            </span>
          </a>
        </div>
        <p style={{ margin: '0.875rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Este es el único acceso a las guías del aula. La guía de la materia se genera desde la lección activa; la general reúne la jornada completa.
        </p>
      </Modal>

      <Modal
        abierto={modalGuiaPdf}
        onCerrar={() => setModalGuiaPdf(false)}
        titulo="Guía Didáctica Imprimible Oficial (PDF)"
        subtitulo={`${nombreMateria} • ${estudianteActivo.gradoEcuador}`}
        anchoMaximo="860px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <Button
              variant="primary-gold"
              icono={<WisdomIcon name="download" size={16} />}
              onClick={() => window.print()}
            >
              Imprimir o Guardar como PDF
            </Button>
          </div>
          <div
            style={{
              padding: '1.5rem',
              backgroundColor: '#FCFAF7',
              color: '#111625',
              borderRadius: 'var(--wa-radius-md)',
              border: '1px solid var(--border-default)',
            }}
            dangerouslySetInnerHTML={{ __html: guiaGeneradaHtml }}
          />
        </div>
      </Modal>
    </div>
  );
};
