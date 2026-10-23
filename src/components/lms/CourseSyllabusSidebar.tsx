'use client';

/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Componente LMS: Temario Estilo Platzi
 * ARCHIVO: src/components/lms/CourseSyllabusSidebar.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Barra lateral de navegación del temario y contenidos del curso al estilo Platzi:
 * - Lista de módulos y lecciones sincronizadas con la estructura de Moodle LMS.
 * - Indicador de lección activa, lecciones completadas con casillas de verificación.
 * - Tiempo estimado de clase, versículo lema por módulo y modo colapsable.
 * - Barra de progreso acumulada del curso con animación GPU (scaleX).
 * ==============================================================================
 */

import React, { useState } from 'react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';

export interface LeccionTemario {
  id: number;
  titulo: string;
  duracionMin: number;
  completada: boolean;
  activa: boolean;
  modulo: string;
}

export interface CourseSyllabusSidebarProps {
  nombreMateria: string;
  esGael: boolean;
  leccionActivaId: number;
  onSeleccionarLeccion: (id: number) => void;
  colapsado: boolean;
  onToggleColapsar: () => void;
  className?: string;
}

export const CourseSyllabusSidebar: React.FC<CourseSyllabusSidebarProps> = ({
  nombreMateria,
  esGael,
  leccionActivaId,
  onSeleccionarLeccion,
  colapsado,
  onToggleColapsar,
  className = '',
}) => {
  // Lista de lecciones demostrativas alineadas al currículo oficial MINEDUC y bíblico
  const leccionesGael: LeccionTemario[] = [
    { id: 1, titulo: '1. Introducción: El orden de la creación', duracionMin: 20, completada: true, activa: leccionActivaId === 1, modulo: 'Módulo 1: Fundamentos y Creación' },
    { id: 2, titulo: '2. Pizza de Fracciones: Medios y Cuartos', duracionMin: 25, completada: false, activa: leccionActivaId === 2, modulo: 'Módulo 1: Fundamentos y Creación' },
    { id: 3, titulo: '3. Repartiendo con Amor: Tercios y Sextos', duracionMin: 25, completada: false, activa: leccionActivaId === 3, modulo: 'Módulo 2: Operaciones y Aplicación' },
    { id: 4, titulo: '4. Suma de Fracciones con Figuras', duracionMin: 30, completada: false, activa: leccionActivaId === 4, modulo: 'Módulo 2: Operaciones y Aplicación' },
    { id: 5, titulo: '5. Reto Final: La Receta de Pan de Vida', duracionMin: 30, completada: false, activa: leccionActivaId === 5, modulo: 'Módulo 2: Operaciones y Aplicación' },
  ];

  const leccionesAvril: LeccionTemario[] = [
    { id: 1, titulo: '1. Los Números Enteros ℤ y el Termómetro', duracionMin: 30, completada: true, activa: leccionActivaId === 1, modulo: 'Módulo 1: Sistemas Numéricos y Orden' },
    { id: 2, titulo: '2. Suma y Resta en la Recta Numérica', duracionMin: 35, completada: false, activa: leccionActivaId === 2, modulo: 'Módulo 1: Sistemas Numéricos y Orden' },
    { id: 3, titulo: '3. Multiplicación de Signos y Leyes', duracionMin: 35, completada: false, activa: leccionActivaId === 3, modulo: 'Módulo 2: Operaciones Avanzadas' },
    { id: 4, titulo: '4. Problemas de Altitud y Temperatura', duracionMin: 40, completada: false, activa: leccionActivaId === 4, modulo: 'Módulo 2: Operaciones Avanzadas' },
    { id: 5, titulo: '5. Proyecto: Finanzas Sabias y Balanza', duracionMin: 40, completada: false, activa: leccionActivaId === 5, modulo: 'Módulo 2: Operaciones Avanzadas' },
  ];

  const lecciones = esGael ? leccionesGael : leccionesAvril;
  const leccionesCompletadas = lecciones.filter((l) => l.completada).length;
  const porcentaje = Math.round((leccionesCompletadas / lecciones.length) * 100);

  if (colapsado) {
    return (
      <aside
        className={`wa-syllabus-collapsed ${className}`}
        style={{
          width: '56px',
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1rem 0.5rem',
          boxSizing: 'border-box',
          gap: '1rem',
        }}
      >
        <button
          onClick={onToggleColapsar}
          title="Expandir Temario del Curso"
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
          📖
        </button>
        <div
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontFamily: 'var(--wa-font-sans)',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            letterSpacing: '0.05em',
          }}
        >
          TEMARIO ({porcentaje}%)
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`wa-syllabus-sidebar ${className}`}
      style={{
        width: '320px',
        backgroundColor: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto',
      }}
    >
      {/* Cabecera del temario */}
      <div
        style={{
          padding: 'var(--carbon-space-2x)',
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-elevated)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <h3
            style={{
              margin: 0,
              fontFamily: 'var(--wa-font-display)',
              fontSize: '1rem',
              color: 'var(--text-primary)',
            }}
          >
            Temario del Curso
          </h3>
          <button
            onClick={onToggleColapsar}
            title="Colapsar panel lateral"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontSize: '0.875rem',
              padding: '0.25rem',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <Badge variant="navy" size="sm">
            {nombreMateria}
          </Badge>
          <span style={{ fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', color: 'var(--text-secondary)' }}>
            {leccionesCompletadas}/{lecciones.length} clases
          </span>
        </div>

        <ProgressBar valor={porcentaje} altura={6} color="emerald" />
      </div>

      {/* Lista de lecciones */}
      <div style={{ flex: 1, padding: '0.5rem 0', display: 'flex', flexDirection: 'column' }}>
        {lecciones.map((leccion) => {
          const esActiva = leccion.id === leccionActivaId;
          return (
            <div
              key={leccion.id}
              onClick={() => onSeleccionarLeccion(leccion.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                backgroundColor: esActiva
                  ? 'var(--brand-primary-soft)'
                  : 'transparent',
                borderLeft: esActiva
                  ? '3px solid var(--brand-primary)'
                  : '3px solid transparent',
                transition: 'background-color 150ms ease',
              }}
            >
              {/* Checkbox de completado */}
              <div
                style={{
                  marginTop: '0.125rem',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: leccion.completada
                    ? 'var(--accent-study)'
                    : 'var(--bg-subtle)',
                  border: leccion.completada
                    ? '1px solid var(--accent-study-hover)'
                    : '1px solid var(--border-default)',
                  color: 'var(--text-on-brand)',
                  fontSize: '0.625rem',
                  flexShrink: 0,
                }}
              >
                {leccion.completada ? '✓' : ''}
              </div>

              {/* Título y metadatos */}
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.8125rem',
                    fontWeight: esActiva ? 600 : 500,
                    color: esActiva
                      ? 'var(--brand-primary)'
                      : 'var(--text-primary)',
                    fontFamily: 'var(--wa-font-sans)',
                    lineHeight: 1.35,
                  }}
                >
                  {leccion.titulo}
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.25rem',
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--wa-font-mono)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>⏱ {leccion.duracionMin} min</span>
                  <span>•</span>
                  <span>OpenMAIC IA</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

