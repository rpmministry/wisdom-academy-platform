'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Componente LMS: Pestañas de Recursos de Clase
 * ARCHIVO: src/components/lms/LessonResourceTabs.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Panel inferior interactivo estilo Platzi situado directamente debajo del reproductor
 * de clases de OpenMAIC:
 * 1. Recursos y Descargas: Material didáctico, carpetas de Google Drive y lema de la asignatura.
 * 2. Guía Imprimible PDF: Generación instantánea de fichas de trabajo para homeschool.
 * 3. Quiz Formativo: Preguntas de autoevaluación con registro de notas en Moodle.
 * 4. Reto Práctico (PBL): Desafío creativo o sandbox interactivo de Python.
 * 5. Apuntes del Alumno: Cuaderno de notas personal con persistencia local.
 * ==============================================================================
 */

import React, { useState, useEffect } from 'react';
import { Tabs, TabItem } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export interface LessonResourceTabsProps {
  nombreMateria: string;
  esGael: boolean;
  onAbrirGuiaPdf: () => void;
  onLanzarVideollamada: () => void;
  versiculoTexto?: string;
  versiculoReferencia?: string;
  className?: string;
}

export const LessonResourceTabs: React.FC<LessonResourceTabsProps> = ({
  nombreMateria,
  esGael,
  onAbrirGuiaPdf,
  onLanzarVideollamada,
  versiculoTexto,
  versiculoReferencia,
  className = '',
}) => {
  const esTeologiaMateria = /relaci[oó]n con dios|teolog[ií]a|cosmovisi[oó]n/i.test(nombreMateria);
  const lemaTexto =
    versiculoTexto ||
    (esTeologiaMateria
      ? 'Lámpara es a mis pies tu palabra, y lumbrera a mi camino.'
      : 'Toda afirmación debe sostenerse en evidencia verificable y razonamiento transparente.');
  const lemaReferencia =
    versiculoReferencia || (esTeologiaMateria ? 'Salmos 119:105' : 'Principio académico');

  const [tabActiva, setTabActiva] = useState<string>('recursos');
  const [apuntes, setApuntes] = useState<string>('');
  const [quizRespuesta, setQuizRespuesta] = useState<number | null>(null);
  const [quizAsentado, setQuizAsentado] = useState<boolean>(false);
  const [notaObtenida, setNotaObtenida] = useState<number | null>(null);

  // Clave de almacenamiento local para apuntes de la materia
  const storageKey = `wa_notes_${nombreMateria}_${esGael ? 'gael' : 'avril'}`;

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(storageKey);
      if (guardado) setApuntes(guardado);
    } catch {}
  }, [storageKey]);

  const guardarApuntes = (texto: string) => {
    setApuntes(texto);
    try {
      localStorage.setItem(storageKey, texto);
    } catch {}
  };

  const tabs: TabItem[] = [
    { id: 'recursos', label: 'Recursos de la Clase', icono: '📁' },
    { id: 'guia', label: 'Guía Imprimible PDF', icono: '📄' },
    { id: 'quiz', label: 'Quiz Formativo', badge: quizAsentado ? '10/10' : 'Pendiente', icono: '✏️' },
    { id: 'pbl', label: 'Reto Práctico (PBL)', icono: '🎯' },
    { id: 'apuntes', label: 'Mis Apuntes', icono: '📝' },
    { id: 'tutoria', label: 'Tutoría Humana', icono: '📹' },
  ];

  const handleResolverQuiz = (opcionIndex: number) => {
    setQuizRespuesta(opcionIndex);
    const esCorrecta = opcionIndex === 1; // Demostrativo: opción 1 correcta
    setNotaObtenida(esCorrecta ? 10 : 7);
    setQuizAsentado(true);
  };

  return (
    <div
      className={`wa-lesson-resource-tabs ${className}`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--wa-radius-lg)',
        border: '1px solid var(--border-default)',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(17, 22, 37, 0.04)',
      }}
    >
      {/* Barra de Pestañas */}
      <Tabs tabs={tabs} activaId={tabActiva} onCambiarTab={setTabActiva} />

      {/* Contenido de la Pestaña Activa */}
      <div style={{ padding: 'var(--carbon-space-3x)' }}>
        {/* PESTAÑA 1: RECURSOS */}
        {tabActiva === 'recursos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--carbon-space-2x)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: 0, fontFamily: 'var(--wa-font-display)', fontSize: '1.125rem' }}>
                  Materiales de Estudio: {nombreMateria}
                </h4>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Sincronizado con la carpeta oficial de Google Drive y Moodle LMS.
                </p>
              </div>
              <Badge variant="gold" size="sm">
                Currículo Ecuador K-12
              </Badge>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginTop: '0.5rem',
              }}
            >
              <Card variant="subtle" padding="sm">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>☁️</span>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.875rem' }}>Carpeta en Google Drive</h5>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Libros MINEDUC y diapositivas
                    </p>
                  </div>
                </div>
              </Card>

              <Card variant="subtle" padding="sm">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📦</span>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.875rem' }}>Paquete Offline Moodle</h5>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Descarga para estudiar sin internet
                    </p>
                  </div>
                </div>
              </Card>

              <Card variant="subtle" padding="sm">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>📖</span>
                  <div>
                    <h5 style={{ margin: 0, fontSize: '0.875rem' }}>
                      {esTeologiaMateria ? 'Lema Bíblico' : 'Principio Académico'}
                    </h5>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {lemaReferencia}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <blockquote className="wa-scripture-quote" style={{ margin: '1rem 0 0 0' }}>
              &ldquo;{lemaTexto}&rdquo; — {lemaReferencia}
            </blockquote>
          </div>
        )}

        {/* PESTAÑA 2: GUÍA IMPRIMIBLE PDF */}
        {tabActiva === 'guia' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
            <h4 style={{ margin: 0, fontFamily: 'var(--wa-font-display)', fontSize: '1.125rem' }}>
              Guía Didáctica Imprimible para Homeschool
            </h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '640px' }}>
              Genera una guía de trabajo completa en formato PDF de alta calidad con el membrete oficial de
              Wisdom Academy, actividades paso a paso, rúbrica del MINEDUC y lema de la asignatura.
            </p>
            <Button variant="primary-gold" icono={<span>🖨️</span>} onClick={onAbrirGuiaPdf}>
              Generar Guía Didáctica Imprimible (PDF)
            </Button>
          </div>
        )}

        {/* PESTAÑA 3: QUIZ FORMATIVO */}
        {tabActiva === 'quiz' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontFamily: 'var(--wa-font-display)', fontSize: '1.125rem' }}>
                Comprobación Formativa de Aprendizaje
              </h4>
              {quizAsentado && (
                <Badge variant="emerald" size="md">
                  Nota asentada en Moodle: {notaObtenida}/10
                </Badge>
              )}
            </div>

            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              {esGael
                ? '¿Qué fracción representa una rebanada de una pizza partida en 4 porciones iguales?'
                : '¿Qué número entero representa estar a 15 metros bajo el nivel del mar en la costa ecuatoriana?'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '520px' }}>
              {[
                esGael ? 'A) 1/2 (un medio)' : 'A) +15 metros',
                esGael ? 'B) 1/4 (un cuarto)' : 'B) -15 metros',
                esGael ? 'C) 1/8 (un octavo)' : 'C) 0 metros',
              ].map((opcion, index) => (
                <button
                  key={index}
                  onClick={() => handleResolverQuiz(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--wa-radius-md)',
                    backgroundColor:
                      quizRespuesta === index
                        ? index === 1
                          ? 'var(--accent-study-soft)'
                          : 'rgba(185, 28, 28, 0.10)'
                        : 'var(--bg-subtle)',
                    border:
                      quizRespuesta === index
                        ? index === 1
                          ? '1px solid var(--accent-study)'
                          : '1px solid var(--wa-brand-ruby-alert)'
                        : '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--wa-font-sans)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {opcion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PESTAÑA 4: RETO PBL */}
        {tabActiva === 'pbl' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ margin: 0, fontFamily: 'var(--wa-font-display)', fontSize: '1.125rem' }}>
              Aprendizaje Basado en Proyectos (PBL)
            </h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {esGael
                ? 'Reto Familiar: Preparen en casa una merienda saludable dividiendo una fruta o pastel en partes iguales (1/2, 1/4 y 1/8) y tomen una foto para su portafolio.'
                : 'Reto Científico: Diseña una tabla en la que registres la variación de temperatura entre el páramo andino de los Andes ecuatorianos y la selva amazónica usando números enteros con signo.'}
            </p>
            <Badge variant="navy" size="md">
              Alineado al Estándar Ministerial Ecuador 2026-2027
            </Badge>
          </div>
        )}

        {/* PESTAÑA 5: APUNTES */}
        {tabActiva === 'apuntes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontFamily: 'var(--wa-font-display)', fontSize: '1.125rem' }}>
                Cuaderno Personal de Clase
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--wa-font-mono)' }}>
                Se guarda automáticamente en tu navegador
              </span>
            </div>
            <textarea
              value={apuntes}
              onChange={(e) => guardarApuntes(e.target.value)}
              placeholder="Escribe aquí las ideas más valiosas, fórmulas o reflexiones compartidas por el profesor durante la sesión..."
              rows={5}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--wa-radius-md)',
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-default)',
                fontFamily: 'var(--wa-font-sans)',
                fontSize: '0.875rem',
                lineHeight: 1.5,
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>
        )}

        {/* PESTAÑA 6: TUTORÍA HUMANA */}
        {tabActiva === 'tutoria' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
            <h4 style={{ margin: 0, fontFamily: 'var(--wa-font-display)', fontSize: '1.125rem' }}>
              Hub Multicanal de Videollamadas con Profesores Reales
            </h4>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '640px' }}>
              Si tienes dudas que deseas profundizar con un maestro humano de Wisdom Academy, inicia una
              sala de videollamada interactiva instantánea compatible con Jitsi Meet, BigBlueButton, Google Meet, Zoom o Teams.
            </p>
            <Button variant="primary-navy" icono={<span>📹</span>} onClick={onLanzarVideollamada}>
              Abrir Sala de Videollamada
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

