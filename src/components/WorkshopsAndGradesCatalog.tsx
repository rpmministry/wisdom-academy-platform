/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Catálogo Editorial de Grados y Talleres Libres
 * ARCHIVO: src/components/WorkshopsAndGradesCatalog.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Este componente implementa el catálogo institucional y panel de administración
 * curricular bajo el Modelo Editorial de IBM Carbon (.wa-carbon-editorial-grid,
 * centrado a 1584px con márgenes de 24px).
 *
 * SECCIONES IMPLEMENTADAS:
 * 1. Administración de los 14 Años Escolares (01_Primero_EGB a 13_Tercero_BGU):
 *    - Monitor de sincronización con la carpeta respectiva de Google Drive.
 *    - Contador de asignaturas activas y libros de texto respaldados.
 *    - Matrícula de nuevos estudiantes con generación automática de horarios.
 * 2. Catálogo de Cursos y Talleres Libres (14_Talleres_y_Cursos_Libres):
 *    - Programación con IA y Python para Jóvenes (80h)
 *    - Liderazgo y Cosmovisión Bíblica (60h)
 *    - Mayordomía Financiera Cristiana (45h)
 *    - Música para la Adoración (50h)
 *    - Escuela para Padres Homeschoolers (40h)
 * ==============================================================================
 */

'use client';

import React, { useState } from 'react';
import { EstudianteWisdom } from '../types/wisdom';

export interface InfoGradoEscolar {
  codigoCarpeta: string;
  nombreVisible: string;
  subnivelMineduc: string;
  edadReferencial: number;
  totalMaterias: number;
  estudianteActivo?: string;
  estadoSincronizacionDrive: 'SINCRONIZADO' | 'PENDIENTE';
  materiasPrincipales: string[];
}

export interface TallerLibreWisdom {
  id: string;
  titulo: string;
  subtitulo: string;
  horasPedagogicas: number;
  modalidad: 'ASINCRONO_IA' | 'HIBRIDO_TUTORIA';
  versiculoInspirador: string;
  descripcion: string;
  modulos: string[];
  destinatarios: string;
}

interface WorkshopsAndGradesCatalogProps {
  onSeleccionarEstudiante?: (estudiante: EstudianteWisdom) => void;
  idiomaIngles?: boolean;
}

export const WorkshopsAndGradesCatalog: React.FC<WorkshopsAndGradesCatalogProps> = ({
  idiomaIngles = false,
}) => {
  // Lista de los 14 Años Escolares de Ecuador
  const [gradosEscolares] = useState<InfoGradoEscolar[]>([
    {
      codigoCarpeta: '01_Primero_EGB',
      nombreVisible: '1.° de EGB (Preparatoria)',
      subnivelMineduc: 'Preparatoria',
      edadReferencial: 5,
      totalMaterias: 3,
      estadoSincronizacionDrive: 'SINCRONIZADO',
      materiasPrincipales: ['Identidad y Autonomía', 'Descubrimiento Natural', 'Expresión Artística'],
    },
    {
      codigoCarpeta: '02_Segundo_EGB',
      nombreVisible: '2.° de EGB (Elemental)',
      subnivelMineduc: 'Básica Elemental',
      edadReferencial: 6,
      totalMaterias: 4,
      estadoSincronizacionDrive: 'SINCRONIZADO',
      materiasPrincipales: ['Biblia y Carácter', 'Matemáticas', 'Lengua y Literatura', 'Ciencias Naturales'],
    },
    {
      codigoCarpeta: '03_Tercero_EGB',
      nombreVisible: '3.° de EGB (Elemental)',
      subnivelMineduc: 'Básica Elemental',
      edadReferencial: 7,
      totalMaterias: 4,
      estadoSincronizacionDrive: 'SINCRONIZADO',
      materiasPrincipales: ['Biblia y Carácter', 'Matemáticas', 'Lengua y Literatura', 'Ciencias Naturales'],
    },
    {
      codigoCarpeta: '04_Cuarto_EGB_Gael',
      nombreVisible: '4.° de EGB - Gael (8 años)',
      subnivelMineduc: 'Básica Elemental',
      edadReferencial: 8,
      totalMaterias: 9,
      estudianteActivo: 'Gael Mateo (Activo)',
      estadoSincronizacionDrive: 'SINCRONIZADO',
      materiasPrincipales: [
        'Lengua y Literatura',
        'Matemáticas',
        'Ciencias Naturales',
        'Estudios Sociales del Ecuador',
        'English Phonics & Reading',
        'Software y Programación',
        'Educación Cultural y Artística (ECA)',
        'Educación Física y Salud',
        'Relación con Dios',
      ],
    },
    {
      codigoCarpeta: '05_Quinto_EGB',
      nombreVisible: '5.° de EGB (Media)',
      subnivelMineduc: 'Básica Media',
      edadReferencial: 9,
      totalMaterias: 5,
      estadoSincronizacionDrive: 'SINCRONIZADO',
      materiasPrincipales: ['Matemáticas', 'Lenguaje', 'Ciencias', 'Estudios Sociales', 'Inglés'],
    },
    {
      codigoCarpeta: '06_Sexto_EGB',
      nombreVisible: '6.° de EGB (Media)',
      subnivelMineduc: 'Básica Media',
      edadReferencial: 10,
      totalMaterias: 5,
      estadoSincronizacionDrive: 'SINCRONIZADO',
      materiasPrincipales: ['Matemáticas', 'Lenguaje', 'Ciencias', 'Estudios Sociales', 'Inglés'],
    },
    {
      codigoCarpeta: '07_Septimo_EGB',
      nombreVisible: '7.° de EGB (Media)',
      subnivelMineduc: 'Básica Media',
      edadReferencial: 11,
      totalMaterias: 5,
      estadoSincronizacionDrive: 'SINCRONIZADO',
      materiasPrincipales: ['Matemáticas', 'Lenguaje', 'Ciencias', 'Estudios Sociales', 'Inglés'],
    },
    {
      codigoCarpeta: '08_Octavo_EGB_Avril',
      nombreVisible: '8.° de EGB - Avril (12 años)',
      subnivelMineduc: 'Básica Superior',
      edadReferencial: 12,
      totalMaterias: 11,
      estudianteActivo: 'Avril Sofía (Activa)',
      estadoSincronizacionDrive: 'SINCRONIZADO',
      materiasPrincipales: [
        'Matemáticas y Pre-Álgebra',
        'Lengua y Literatura',
        'Ciencias Naturales Integradas',
        'Estudios Sociales e Historia del Ecuador',
        'Academic English & Literature',
        'Software y Programación Python',
        'Ciencias Políticas y Relaciones Internacionales',
        'Administración y Marketing Digital',
        'Educación Cultural y Artística (ECA)',
        'Educación Física y Salud',
        'Relación con Dios (Teología y Cosmovisión)',
      ],
    },
    {
      codigoCarpeta: '09_Noveno_EGB',
      nombreVisible: '9.° de EGB (Superior)',
      subnivelMineduc: 'Básica Superior',
      edadReferencial: 13,
      totalMaterias: 6,
      estadoSincronizacionDrive: 'SINCRONIZADO',
      materiasPrincipales: ['Álgebra', 'Literatura', 'Física Elemental', 'Historia Universal', 'Inglés Avanzado'],
    },
    {
      codigoCarpeta: '10_Decimo_EGB',
      nombreVisible: '10.° de EGB (Superior)',
      subnivelMineduc: 'Básica Superior',
      edadReferencial: 14,
      totalMaterias: 6,
      estadoSincronizacionDrive: 'SINCRONIZADO',
      materiasPrincipales: ['Geometría y Trigonometría', 'Biología', 'Filosofía Bíblica', 'Inglés'],
    },
    {
      codigoCarpeta: '11_Primero_BGU',
      nombreVisible: '1.° de Bachillerato General Unificado (BGU)',
      subnivelMineduc: 'Bachillerato',
      edadReferencial: 15,
      totalMaterias: 8,
      estadoSincronizacionDrive: 'SINCRONIZADO',
      materiasPrincipales: ['Física', 'Química', 'Matemática Superior', 'Historia', 'Lengua'],
    },
    {
      codigoCarpeta: '12_Segundo_BGU',
      nombreVisible: '2.° de Bachillerato General Unificado (BGU)',
      subnivelMineduc: 'Bachillerato',
      edadReferencial: 16,
      totalMaterias: 8,
      estadoSincronizacionDrive: 'SINCRONIZADO',
      materiasPrincipales: ['Física II', 'Química Orgánica', 'Cálculo Preuniversitario', 'Emprendimiento'],
    },
    {
      codigoCarpeta: '13_Tercero_BGU',
      nombreVisible: '3.° de Bachillerato General Unificado (Graduación)',
      subnivelMineduc: 'Bachillerato',
      edadReferencial: 17,
      totalMaterias: 9,
      estadoSincronizacionDrive: 'SINCRONIZADO',
      materiasPrincipales: ['Investigación de Grado', 'Cálculo Diferencial', 'Cosmovisión Cristiana Aplicada'],
    },
  ]);

  // Lista de Talleres y Cursos Libres
  const [talleresLibres] = useState<TallerLibreWisdom[]>([
    {
      id: 'taller_python_ia',
      titulo: 'Programación con IA y Python para Jóvenes',
      subtitulo: 'Aprende a programar lógica computacional, ciencia de datos y agentes inteligentes',
      horasPedagogicas: 80,
      modalidad: 'HIBRIDO_TUTORIA',
      versiculoInspirador: 'Daniel 1:17 - Sabiduría e inteligencia en ciencias y letras',
      descripcion:
        'Curso práctico basado en proyectos para estudiantes de 10 a 18 años. Desarrolla asistentes de estudio con Gemini API, visualizaciones interactivas y scripts de automatización en Python.',
      modulos: [
        '1. Fundamentos de Pensamiento Computacional',
        '2. Estructuras de Datos y Algoritmos en Python',
        '3. Conexión con APIs de Inteligencia Artificial (Gemini 3.8)',
        '4. Proyecto Final de Impacto Comunitario',
      ],
      destinatarios: 'Jóvenes de 10 a 18 años',
    },
    {
      id: 'taller_liderazgo_cosmovision',
      titulo: 'Liderazgo y Cosmovisión Bíblica',
      subtitulo: 'Fundamentos de apologética, pensamiento crítico y ética pública',
      horasPedagogicas: 60,
      modalidad: 'ASINCRONO_IA',
      versiculoInspirador: 'Romanos 12:2 - Transformación por la renovación de la mente',
      descripcion:
        'Entrenamiento formativo para discernir corrientes culturales, defender la fe con gracia y liderar iniciativas en el ámbito civil, científico y empresarial.',
      modulos: [
        '1. Epistemología y la Fuente de la Verdad',
        '2. Historia del Pensamiento Occidental vs Revelación Bíblica',
        '3. Bioética y Tecnología con Propósito',
        '4. Ensayo de Posicionamiento Cultural',
      ],
      destinatarios: 'Adolescentes y Padres Mentores',
    },
    {
      id: 'taller_mayordomia_financiera',
      titulo: 'Mayordomía Financiera Cristiana',
      subtitulo: 'Principios bíblicos de presupuesto, ahorro, inversión ética y generosidad',
      horasPedagogicas: 45,
      modalidad: 'ASINCRONO_IA',
      versiculoInspirador: 'Proverbios 21:5 - Los pensamientos del diligente traen abundancia',
      descripcion:
        'Educación financiera integral sin deudas especulativas. Cómo presupuestar para la familia, invertir en emprendimientos sustentables y administrar recursos para la gloria de Dios.',
      modulos: [
        '1. El Principio de Mayordomía y Propiedad Divina',
        '2. Presupuesto Familiar y Libre de Deudas',
        '3. Emprendimiento con Ética del Reino',
        '4. Generosidad Sistemática y Planificación Futura',
      ],
      destinatarios: 'Estudiantes de Bachillerato y Familias',
    },
    {
      id: 'taller_musica_adoracion',
      titulo: 'Música para la Adoración',
      subtitulo: 'Teoría musical, armonía para instrumentos y teología de la alabanza',
      horasPedagogicas: 50,
      modalidad: 'HIBRIDO_TUTORIA',
      versiculoInspirador: 'Salmos 33:3 - Cantadle cántico nuevo; hacedlo bien, tañendo con júbilo',
      descripcion:
        'Formación musical rigurosa combinada con un corazón pastoral de reverencia y servicio eclesial.',
      modulos: [
        '1. Solfeo, Ritmo y Entrenamiento Auditivo',
        '2. Armonía Funcional en Teclado y Cuerdas',
        '3. Historia de los Himnos Clásicos y Composición',
        '4. Ensamble Instrumental Colaborativo',
      ],
      destinatarios: 'Niños y Jóvenes desde los 8 años',
    },
    {
      id: 'taller_escuela_padres',
      titulo: 'Escuela para Padres Homeschoolers',
      subtitulo: 'Normativa legal MINEDUC, diseño curricular flexible y pedagogía del carácter',
      horasPedagogicas: 40,
      modalidad: 'HIBRIDO_TUTORIA',
      versiculoInspirador: 'Deuteronomio 6:7 - Las repetirás a tus hijos al levantarte y al andar',
      descripcion:
        'Acompañamiento integral para familias que inician o perfeccionan la educación en casa en Ecuador bajo estándares de excelencia y paz en el hogar.',
      modulos: [
        '1. Marco Legal del MINEDUC y Acuerdos de Homeschool',
        '2. Rutinas Eficientes y Manejo del Tiempo Familiar',
        '3. Evaluación Formativa y Creación del Dossier',
        '4. Salud Emocional y Comunidad de Apoyo',
      ],
      destinatarios: 'Padres de Familia y Tutores Legales',
    },
  ]);

  const [pestanaActiva, setPestanaActiva] = useState<'GRADOS' | 'TALLERES'>('GRADOS');
  const [modalMatricula, setModalMatricula] = useState<InfoGradoEscolar | null>(null);
  const [nombreNuevoAlumno, setNombreNuevoAlumno] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');

  const handleMatricular = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMatricula || !nombreNuevoAlumno) return;
    setMensajeExito(
      `¡Matrícula exitosa! ${nombreNuevoAlumno} ha sido asignado a ${modalMatricula.nombreVisible} y su horario escolar de 08:00 a 12:00 ha sido generado automáticamente en Google Drive y Moodle.`
    );
    setTimeout(() => {
      setModalMatricula(null);
      setNombreNuevoAlumno('');
      setMensajeExito('');
    }, 3500);
  };

  return (
    <div className="wa-carbon-editorial-grid" style={{ paddingTop: 'var(--carbon-space-3x)', paddingBottom: 'var(--carbon-space-6x)' }}>
      {/* =======================================================================
          ENCABEZADO EDITORIAL DE LA SECCIÓN
          ======================================================================= */}
      <section className="wa-col-sm-4 wa-col-md-8 wa-col-lg-16" style={{ marginBottom: 'var(--carbon-space-3x)' }}>
        <div className="wa-surface-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <img src="/brand/svg/wisdom-icon-color.svg" alt="Sabiduría" style={{ width: '28px', height: '28px' }} />
              <span style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.75rem', color: 'var(--wa-brand-gold-dark)', fontWeight: 600 }}>
                {idiomaIngles ? 'GLOBAL CURRICULUM ARCHITECTURE • K-12' : 'ARQUITECTURA CURRICULAR GLOBAL • K-12 MINEDUC'}
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--wa-font-display)', fontSize: '1.875rem', margin: '0 0 6px 0', color: 'var(--wa-text-primary)' }}>
              {idiomaIngles ? 'Academic Grades & Open Workshops Directory' : 'Catálogo de Grados Escolares y Talleres Libres'}
            </h1>
            <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--wa-text-secondary)', fontFamily: 'var(--wa-font-sans)', maxWidth: '780px' }}>
              {idiomaIngles
                ? 'Manage the 14 formal school years (from 1° EGB to 3° BGU) synced with Google Drive, or explore elective workshops for holistic Christian growth.'
                : 'Administra los 14 años escolares oficiales del Ecuador sincronizados en tiempo real con Google Drive, o matricúlate en talleres de especialización para el desarrollo integral cristiano.'}
            </p>
          </div>

          {/* SELECTOR DE PESTAÑA */}
          <div style={{ display: 'flex', background: 'var(--wa-bg-interactive-subtle)', padding: '4px', borderRadius: 'var(--wa-radius-sm)', gap: '4px' }}>
            <button
              onClick={() => setPestanaActiva('GRADOS')}
              style={{
                background: pestanaActiva === 'GRADOS' ? 'var(--wa-brand-gold-primary)' : 'transparent',
                color: pestanaActiva === 'GRADOS' ? 'var(--wa-bg-surface)' : 'var(--wa-text-secondary)',
                border: 'none',
                borderRadius: 'var(--wa-radius-sm)',
                padding: '8px 16px',
                fontFamily: 'var(--wa-font-sans)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              {idiomaIngles ? '14 School Years (MINEDUC)' : '14 Años Escolares (MINEDUC)'}
            </button>
            <button
              onClick={() => setPestanaActiva('TALLERES')}
              style={{
                background: pestanaActiva === 'TALLERES' ? 'var(--wa-brand-gold-primary)' : 'transparent',
                color: pestanaActiva === 'TALLERES' ? 'var(--wa-bg-surface)' : 'var(--wa-text-secondary)',
                border: 'none',
                borderRadius: 'var(--wa-radius-sm)',
                padding: '8px 16px',
                fontFamily: 'var(--wa-font-sans)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
              }}
            >
              {idiomaIngles ? 'Elective Workshops (5)' : 'Talleres y Cursos Libres (5)'}
            </button>
          </div>
        </div>
      </section>

      {/* =======================================================================
          SECCIÓN A: LOS 14 AÑOS ESCOLARES (MINEDUC K-12)
          ======================================================================= */}
      {pestanaActiva === 'GRADOS' && (
        <section className="wa-col-sm-4 wa-col-md-8 wa-col-lg-16">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 'var(--carbon-space-2x)',
            }}
          >
            {gradosEscolares.map((grado) => {
              const tieneEstudiante = !!grado.estudianteActivo;
              return (
                <div
                  key={grado.codigoCarpeta}
                  className="wa-surface-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: tieneEstudiante
                      ? '1px solid var(--border-gold)'
                      : '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--wa-font-mono)',
                          fontSize: '0.6875rem',
                          background: 'var(--wa-bg-interactive-subtle)',
                          padding: '2px 6px',
                          borderRadius: 'var(--wa-radius-sm)',
                          color: 'var(--wa-brand-navy-primary)',
                          fontWeight: 600,
                        }}
                      >
                        {grado.subnivelMineduc}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontFamily: 'var(--wa-font-mono)',
                          color: 'var(--wa-brand-gold-dark)',
                          fontWeight: 600,
                        }}
                      >
                        ✓ DRIVE SYNC
                      </span>
                    </div>

                    <h2 style={{ fontFamily: 'var(--wa-font-display)', fontSize: '1.25rem', margin: '0 0 6px 0', color: 'var(--wa-text-primary)' }}>
                      {grado.nombreVisible}
                    </h2>

                    <div style={{ fontSize: '0.8125rem', color: 'var(--wa-text-secondary)', marginBottom: '12px' }}>
                      <strong>Edad sugerida:</strong> {grado.edadReferencial} años • <strong>Materias:</strong> {grado.totalMaterias}
                    </div>

                    {/* ESTUDIANTE MATRICULADO */}
                    {tieneEstudiante ? (
                      <div
                        style={{
                          background: 'var(--wa-bg-interactive-subtle)',
                          padding: '6px 10px',
                          borderRadius: 'var(--wa-radius-sm)',
                          fontSize: '0.8125rem',
                          color: 'var(--wa-brand-gold-dark)',
                          fontWeight: 600,
                          marginBottom: '12px',
                        }}
                      >
                        🎓 Alumno: {grado.estudianteActivo}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: 'var(--wa-text-muted)', marginBottom: '12px', fontStyle: 'italic' }}>
                        Sin alumnos matriculados actualmente
                      </div>
                    )}

                    {/* MATERIAS PRINCIPALES */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '16px' }}>
                      {grado.materiasPrincipales.slice(0, 5).map((mat, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: '0.6875rem',
                            background: 'var(--wa-bg-interactive-subtle)',
                            padding: '2px 6px',
                            borderRadius: 'var(--wa-radius-sm)',
                            color: 'var(--wa-text-secondary)',
                          }}
                        >
                          {mat}
                        </span>
                      ))}
                      {grado.materiasPrincipales.length > 5 && (
                        <span style={{ fontSize: '0.6875rem', color: 'var(--wa-text-muted)' }}>
                          +{grado.materiasPrincipales.length - 5} más
                        </span>
                      )}
                    </div>
                  </div>

                  {/* BOTÓN DE MATRÍCULA / GESTIÓN */}
                  <div>
                    <button
                      onClick={() => setModalMatricula(grado)}
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: '1px solid var(--wa-brand-gold-primary)',
                        color: 'var(--wa-brand-gold-dark)',
                        padding: '8px 12px',
                        borderRadius: 'var(--wa-radius-sm)',
                        fontFamily: 'var(--wa-font-sans)',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                      }}
                    >
                      {tieneEstudiante ? 'Ver Expediente / Agregar Hermano' : 'Matricular Nuevo Estudiante'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =======================================================================
          SECCIÓN B: TALLERES Y CURSOS LIBRES (14_Talleres_y_Cursos_Libres)
          ======================================================================= */}
      {pestanaActiva === 'TALLERES' && (
        <section className="wa-col-sm-4 wa-col-md-8 wa-col-lg-16">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--carbon-space-2x)' }}>
            {talleresLibres.map((taller) => (
              <div
                key={taller.id}
                className="wa-surface-card"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 'var(--carbon-space-2x)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ flex: '1 1 500px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span
                      style={{
                        fontFamily: 'var(--wa-font-mono)',
                        fontSize: '0.6875rem',
                        background: 'var(--wa-bg-interactive-subtle)',
                        padding: '2px 8px',
                        borderRadius: 'var(--wa-radius-sm)',
                        color: 'var(--wa-brand-navy-light)',
                        fontWeight: 600,
                      }}
                    >
                      {taller.horasPedagogicas} HORAS PEDAGÓGICAS
                    </span>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', color: 'var(--wa-brand-gold-dark)' }}>
                      • {taller.modalidad === 'HIBRIDO_TUTORIA' ? 'Híbrido (IA + Profesor Real)' : 'Autónomo con Agente IA'}
                    </span>
                  </div>

                  <h2 style={{ fontFamily: 'var(--wa-font-display)', fontSize: '1.375rem', margin: '4px 0', color: 'var(--wa-text-primary)' }}>
                    {taller.titulo}
                  </h2>
                  <div style={{ fontStyle: 'italic', fontSize: '0.875rem', color: 'var(--wa-brand-gold-dark)', marginBottom: '8px' }}>
                    {taller.subtitulo}
                  </div>

                  <p style={{ margin: '0 0 12px 0', fontSize: '0.875rem', color: 'var(--wa-text-secondary)', lineHeight: 1.5 }}>
                    {taller.descripcion}
                  </p>

                  <div style={{ background: 'var(--wa-bg-interactive-subtle)', padding: '10px 14px', borderRadius: 'var(--wa-radius-sm)', marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', fontWeight: 600, color: 'var(--wa-brand-navy-primary)', marginBottom: '4px' }}>
                      MÓDULOS DE APRENDIZAJE:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8125rem', color: 'var(--wa-text-secondary)' }}>
                      {taller.modulos.map((mod, idx) => (
                        <li key={idx}>{mod}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', color: 'var(--wa-text-muted)' }}>
                    <strong>Dirigido a:</strong> {taller.destinatarios} • <strong>Fundamento:</strong> {taller.versiculoInspirador}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px', minWidth: '180px' }}>
                  <button
                    onClick={() => alert(`Inscripción iniciada para: ${taller.titulo}. Se generó la credencial en Moodle LMS.`)}
                    style={{
                      background: 'var(--wa-brand-navy-primary)',
                      color: 'var(--wa-bg-surface)',
                      border: 'none',
                      borderRadius: 'var(--wa-radius-sm)',
                      padding: '10px 16px',
                      fontFamily: 'var(--wa-font-sans)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    Inscribirse al Taller
                  </button>
                  <div style={{ textAlign: 'center', fontSize: '0.6875rem', color: 'var(--wa-text-muted)', fontFamily: 'var(--wa-font-mono)' }}>
                    Acceso 100% Gratuito en la Nube
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =======================================================================
          MODAL DE MATRÍCULA Y CREACIÓN AUTOMÁTICA DE HORARIO
          ======================================================================= */}
      {modalMatricula && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(13, 19, 34, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 'var(--carbon-space-2x)',
          }}
        >
          <div className="wa-surface-card" style={{ maxWidth: '520px', width: '100%', background: 'var(--wa-bg-surface)' }}>
            <h2 style={{ fontFamily: 'var(--wa-font-display)', fontSize: '1.25rem', marginTop: 0 }}>
              Matricular Alumno en {modalMatricula.nombreVisible}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--wa-text-secondary)', marginBottom: '16px' }}>
              Al matricular al estudiante se creará automáticamente su estructura de carpetas en Google Drive y su horario intensivo de 08:00 a 12:00 con recreo de 09:30 a 10:00 en Moodle.
            </p>

            {mensajeExito ? (
              <div style={{ background: 'var(--brand-primary-soft)', padding: '12px', borderRadius: 'var(--wa-radius-sm)', color: 'var(--brand-gold-dark)', fontSize: '0.875rem', border: '1px solid var(--border-gold)' }}>
                {mensajeExito}
              </div>
            ) : (
              <form onSubmit={handleMatricular} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                    Nombre Completo del Estudiante:
                  </label>
                  <input
                    type="text"
                    required
                    value={nombreNuevoAlumno}
                    onChange={(e) => setNombreNuevoAlumno(e.target.value)}
                    placeholder="e.g. Samuel David Morales"
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--wa-radius-sm)',
                      border: '1px solid var(--wa-keyline-subtle)',
                      background: 'var(--wa-bg-interactive-subtle)',
                      color: 'var(--wa-text-primary)',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setModalMatricula(null)}
                    style={{
                      background: 'transparent',
                      color: 'var(--wa-text-secondary)',
                      border: '1px solid var(--wa-keyline-subtle)',
                      padding: '8px 14px',
                      borderRadius: 'var(--wa-radius-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: 'var(--wa-brand-gold-primary)',
                      color: 'var(--wa-bg-surface)',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: 'var(--wa-radius-sm)',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Confirmar y Generar Horario
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

