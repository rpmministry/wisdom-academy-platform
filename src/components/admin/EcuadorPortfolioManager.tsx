/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Gestor Normativo del Portafolio MINEDUC Ecuador
 * ARCHIVO: src/components/EcuadorPortfolioManager.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Este componente implementa el módulo legal y pedagógico de Portafolio de Evidencias
 * exigido por la normativa ecuatoriana para educación en modalidad Homeschool / no presencial:
 *   - Acuerdo Ministerial MINEDUC-2019-00057-A (Normativa de Educación en Casa)
 *   - Acuerdo Ministerial MINEDUC-MINEDUC-2023-00069-A (Evaluación Formativa Cualitativa)
 *
 * REGLA DE RESPONSABILIDAD DIFERENCIADA POR EDAD:
 *   a) Básica Elemental / Media (Gael, 8 años - 4° de EGB):
 *      Interfaz de "Estructuración por el Mentor Principal (Padre/Madre)", diseñada para
 *      que los tutores legales certifiquen lectura en voz alta bilingüe, evidencias de
 *      investigación, formación espiritual cristiana, arte, motricidad y actas de tutoría.
 *   b) Básica Superior (Avril, 12 años - 8° de EGB):
 *      Interfaz de "Autogestión del Estudiante con Acompañamiento Paterno", permitiendo
 *      a la estudiante subir sus entregables de Aprendizaje Basado en Proyectos (PBL) de
 *      OpenMAIC, reflexiones teológicas bíblicas, reportes de laboratorio y programación.
 *
 * EXPORTACIÓN LEGAL:
 * Incluye generación y descarga del Dossier Oficial para presentación ante la institución
 * educativa evaluadora del Distrito Educativo del Ecuador.
 * ==============================================================================
 */

'use client';

import React, { useState } from 'react';
import { EstudianteWisdom } from '@/types/wisdom';

export interface EvidenciaPortafolio {
  id: string;
  titulo: string;
  materia: string;
  categoria:
    | 'INVESTIGACION'
    | 'LECTURA_BILINGUE'
    | 'FORMACION_ESPIRITUAL'
    | 'PROYECTO_PBL'
    | 'ARTE_DEPORTE'
    | 'ACTA_TUTORIA';
  descripcion: string;
  fechaRegistro: string;
  calificacionCualitativa: 'DA' | 'EP' | 'DI'; // DA: Destreza Alcanzada, EP: En Proceso, DI: Destreza Iniciada
  archivoAdjunto?: string;
  comentarioMentor: string;
  validadoMineduc: boolean;
}

interface EcuadorPortfolioManagerProps {
  estudiante: EstudianteWisdom;
  idiomaIngles?: boolean;
}

export const EcuadorPortfolioManager: React.FC<EcuadorPortfolioManagerProps> = ({
  estudiante,
  idiomaIngles = false,
}) => {
  const esGael = estudiante.edad <= 10;

  // Lista inicial de evidencias según el nivel y grado del estudiante
  const [evidencias, setEvidencias] = useState<EvidenciaPortafolio[]>(
    esGael
      ? [
          {
            id: 'ev_gael_1',
            titulo: 'Proyecto Trimestre 1: Mi Entorno Natural y Digital',
            materia: 'Ciencias Naturales y Lengua',
            categoria: 'PROYECTO_PBL',
            descripcion:
              'Cuento ilustrado sobre los animales de los Andes ecuatorianos y animación de la historia en Scratch.',
            fechaRegistro: '2026-10-12',
            calificacionCualitativa: 'DA',
            archivoAdjunto: 'Gael_Cuento_Animales_Ecuador.pdf',
            comentarioMentor:
              'Gael demostró gran entusiasmo, lectura fluida y comprensión integral del hábitat del oso de anteojos.',
            validadoMineduc: true,
          },
          {
            id: 'ev_gael_2',
            titulo: 'Lectura Bíblica en Voz Alta Bilingüe (Salmo 23 / Psalm 23)',
            materia: 'Inglés y Relación con Dios',
            categoria: 'LECTURA_BILINGUE',
            descripcion:
              'Grabación de audio y transcripción fonética de los versículos 1 al 6 con pronunciación clara.',
            fechaRegistro: '2026-10-15',
            calificacionCualitativa: 'DA',
            archivoAdjunto: 'Audio_Psalm23_Gael.mp3',
            comentarioMentor:
              'Excelente dicción en inglés británico y memorización piadosa del texto sagrado.',
            validadoMineduc: true,
          },
          {
            id: 'ev_gael_3',
            titulo: 'Maqueta Geométrica: La Ciudad Solidaria',
            materia: 'Matemáticas y Arte (ECA)',
            categoria: 'ARTE_DEPORTE',
            descripcion:
              'Construcción tridimensional con cuerpos geométricos (cubos, prismas y pirámides) y decálogo comunitario.',
            fechaRegistro: '2026-10-18',
            calificacionCualitativa: 'DA',
            archivoAdjunto: 'Foto_Maqueta_Ciudad_Gael.jpg',
            comentarioMentor:
              'Identificó aristas y vértices en cada edificio público creado con material reciclado.',
            validadoMineduc: false,
          },
        ]
      : [
          {
            id: 'ev_avril_1',
            titulo: 'PBL Trimestre 1: Plan de Emprendimiento Social Sostenible',
            materia: 'Administración y Marketing Digital',
            categoria: 'PROYECTO_PBL',
            descripcion:
              'Modelo Canvas, cotización financiera, prototipo web y política de ética de negocios bíblica.',
            fechaRegistro: '2026-10-14',
            calificacionCualitativa: 'DA',
            archivoAdjunto: 'Avril_Business_Plan_Wisdom.pdf',
            comentarioMentor:
              'Análisis riguroso de mercado y redacción corporativa bilingüe de estándar pre-universitario.',
            validadoMineduc: true,
          },
          {
            id: 'ev_avril_2',
            titulo: 'Ensayo Crítico: Cosmovisión Cristiana vs Posmodernismo',
            materia: 'Relación con Dios (Teología)',
            categoria: 'FORMACION_ESPIRITUAL',
            descripcion:
              'Defensa argumentativa de la verdad absoluta fundamentada en Colosenses 2:8 y Juan 14:6.',
            fechaRegistro: '2026-10-16',
            calificacionCualitativa: 'DA',
            archivoAdjunto: 'Ensayo_Apologetica_Avril.pdf',
            comentarioMentor:
              'Profundidad exegética notable y aplicación contemporánea para jóvenes líderes.',
            validadoMineduc: true,
          },
          {
            id: 'ev_avril_3',
            titulo: 'Simulador Geopolítico: Tratados de Paz y Diplomacia',
            materia: 'Ciencias Políticas y RR.II.',
            categoria: 'INVESTIGACION',
            descripcion:
              'Análisis comparativo de los Acuerdos de Ginebra con reporte de postura diplomática en idioma inglés.',
            fechaRegistro: '2026-10-18',
            calificacionCualitativa: 'DA',
            archivoAdjunto: 'UN_Simulation_Report_Avril.pdf',
            comentarioMentor:
              'Destreza argumentativa sobresaliente y dominio de terminología multilateral.',
            validadoMineduc: false,
          },
        ]
  );

  const [modalNuevaEvidencia, setModalNuevaEvidencia] = useState(false);
  const [nuevaEvidencia, setNuevaEvidencia] = useState<Partial<EvidenciaPortafolio>>({
    titulo: '',
    materia: esGael ? 'Lengua y Literatura' : 'Matemáticas y Pre-Álgebra',
    categoria: esGael ? 'LECTURA_BILINGUE' : 'PROYECTO_PBL',
    descripcion: '',
    calificacionCualitativa: 'DA',
    comentarioMentor: '',
  });

  const [vistaImpresionDossier, setVistaImpresionDossier] = useState(false);

  /**
   * Agrega una nueva evidencia al portafolio formativo.
   */
  const handleGuardarEvidencia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaEvidencia.titulo || !nuevaEvidencia.descripcion) return;

    const creada: EvidenciaPortafolio = {
      id: `ev_${Date.now()}`,
      titulo: nuevaEvidencia.titulo || 'Nueva Evidencia',
      materia: nuevaEvidencia.materia || 'Formación General',
      categoria: nuevaEvidencia.categoria || 'INVESTIGACION',
      descripcion: nuevaEvidencia.descripcion || '',
      fechaRegistro: new Date().toISOString().split('T')[0],
      calificacionCualitativa: nuevaEvidencia.calificacionCualitativa || 'DA',
      archivoAdjunto: `${nuevaEvidencia.titulo?.replace(/\s+/g, '_')}.pdf`,
      comentarioMentor: nuevaEvidencia.comentarioMentor || 'Aprobado y registrado en el expediente pedagógico.',
      validadoMineduc: true,
    };

    setEvidencias([creada, ...evidencias]);
    setModalNuevaEvidencia(false);
    setNuevaEvidencia({
      titulo: '',
      materia: esGael ? 'Lengua y Literatura' : 'Matemáticas y Pre-Álgebra',
      categoria: esGael ? 'LECTURA_BILINGUE' : 'PROYECTO_PBL',
      descripcion: '',
      calificacionCualitativa: 'DA',
      comentarioMentor: '',
    });
  };

  return (
    <div className="wa-carbon-grid" style={{ paddingTop: 'var(--carbon-space-3x)', paddingBottom: 'var(--carbon-space-6x)' }}>
      {/* =======================================================================
          ENCABEZADO LEGAL DEL PORTAFOLIO MINEDUC
          ======================================================================= */}
      <section className="wa-col-sm-4 wa-col-md-8 wa-col-lg-16" style={{ marginBottom: 'var(--carbon-space-3x)' }}>
        <div
          className="wa-surface-card"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--carbon-space-2x)',
            background: 'var(--wa-bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <img
                src="/brand/svg/wisdom-icon-color.svg"
                alt="Escudo"
                style={{ width: '28px', height: '28px' }}
              />
              <span
                style={{
                  fontFamily: 'var(--wa-font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--wa-brand-gold-dark)',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {idiomaIngles
                  ? 'ECUADOR MINISTRY OF EDUCATION • MINEDUC-2019-00057-A'
                  : 'MINISTERIO DE EDUCACIÓN DEL ECUADOR • ACUERDOS MINEDUC-2019-00057-A / 2023-00069-A'}
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--wa-font-display)',
                fontSize: '1.75rem',
                margin: '0 0 4px 0',
                color: 'var(--wa-text-primary)',
              }}
            >
              {idiomaIngles
                ? `Official Legal Portfolio: ${estudiante.nombreCompleto}`
                : `Portafolio Normativo de Evidencias: ${estudiante.nombreCompleto}`}
            </h1>

            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--wa-text-secondary)', fontFamily: 'var(--wa-font-sans)' }}>
              <strong>{idiomaIngles ? 'Academic Level:' : 'Nivel Oficial:'}</strong> {estudiante.gradoEcuador} ({estudiante.edad} {idiomaIngles ? 'years old' : 'años'}) •{' '}
              <strong>{idiomaIngles ? 'Responsibility Model:' : 'Modelo de Responsabilidad:'}</strong>{' '}
              <span style={{ color: 'var(--wa-brand-navy-light)', fontWeight: 600 }}>
                {esGael
                  ? (idiomaIngles ? 'Structured by Main Mentor (Parents)' : 'Estructurado por el Mentor Principal (Padres)')
                  : (idiomaIngles ? 'Student Self-Management with Parental Guidance' : 'Autogestión del Estudiante con Acompañamiento Paterno')}
              </span>
            </p>
          </div>

          {/* BOTONES DE ACCIÓN: NUEVA EVIDENCIA Y EXPORTAR DOSSIER */}
          <div style={{ display: 'flex', gap: 'var(--carbon-space-1x)', flexWrap: 'wrap' }}>
            <button
              onClick={() => setModalNuevaEvidencia(true)}
              style={{
                background: 'var(--wa-brand-navy-primary)',
                color: 'var(--wa-bg-surface)',
                border: 'none',
                borderRadius: 'var(--wa-radius-sm)',
                padding: '10px 18px',
                fontFamily: 'var(--wa-font-sans)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>+</span> {idiomaIngles ? 'Register Evidence' : 'Registrar Evidencia'}
            </button>

            <button
              onClick={() => {
                setVistaImpresionDossier(true);
                setTimeout(() => window.print(), 300);
              }}
              style={{
                background: 'var(--wa-brand-gold-primary)',
                color: 'var(--wa-bg-surface)',
                border: 'none',
                borderRadius: 'var(--wa-radius-sm)',
                padding: '10px 18px',
                fontFamily: 'var(--wa-font-sans)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>📄</span> {idiomaIngles ? 'Export Official MINEDUC Dossier' : 'Exportar Dossier Oficial MINEDUC'}
            </button>
          </div>
        </div>
      </section>

      {/* =======================================================================
          METADATOS LEGALES Y RÚBRICA CUALITATIVA DEL ECUADOR
          ======================================================================= */}
      <section className="wa-col-sm-4 wa-col-md-4 wa-col-lg-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--carbon-space-2x)' }}>
        <div className="wa-surface-card">
          <h3 style={{ fontFamily: 'var(--wa-font-display)', fontSize: '1.0625rem', marginTop: 0, marginBottom: '12px' }}>
            {idiomaIngles ? 'Scale & Assessment' : 'Escala Cualitativa MINEDUC'}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8125rem', fontFamily: 'var(--wa-font-sans)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'var(--wa-bg-interactive-subtle)', borderRadius: 'var(--wa-radius-sm)' }}>
              <span style={{ fontWeight: 600, color: 'var(--wa-brand-gold-dark)' }}>DA: Destreza Alcanzada</span>
              <span style={{ fontFamily: 'var(--wa-font-mono)' }}>9.00 - 10.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'var(--wa-bg-interactive-subtle)', borderRadius: 'var(--wa-radius-sm)' }}>
              <span style={{ fontWeight: 600, color: 'var(--wa-brand-navy-light)' }}>EP: En Proceso</span>
              <span style={{ fontFamily: 'var(--wa-font-mono)' }}>7.00 - 8.99</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px', background: 'var(--wa-bg-interactive-subtle)', borderRadius: 'var(--wa-radius-sm)' }}>
              <span style={{ fontWeight: 600, color: 'var(--wa-text-secondary)' }}>DI: Destreza Iniciada</span>
              <span style={{ fontFamily: 'var(--wa-font-mono)' }}>&lt; 7.00</span>
            </div>
          </div>

          <div style={{ marginTop: '16px', borderTop: '1px solid var(--wa-keyline-subtle)', paddingTop: '12px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--wa-text-secondary)', fontFamily: 'var(--wa-font-mono)' }}>
              {idiomaIngles ? 'VERIFICATION HASH:' : 'CÓDIGO DE VALIDACIÓN:'}
            </div>
            <div style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.8125rem', color: 'var(--wa-brand-gold-dark)', wordBreak: 'break-all' }}>
              EC-MINEDUC-2026-{estudiante.idMoodle}-SHA256
            </div>
          </div>
        </div>

        {/* COMPONENTE DE SEGUIMIENTO ESPIRITUAL */}
        <div className="wa-surface-card" style={{ background: 'var(--wa-bg-interactive-subtle)' }}>
          <h4 style={{ fontFamily: 'var(--wa-font-display)', margin: '0 0 8px 0', fontSize: '0.9375rem' }}>
            {idiomaIngles ? 'Spiritual & Character Anchor' : 'Ancla Bíblica de Formación'}
          </h4>
          <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--wa-text-primary)' }}>
            "{estudiante.versiculoBiblicoLema.texto}"
          </p>
          <div style={{ textAlign: 'right', marginTop: '6px', fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', color: 'var(--wa-brand-gold-dark)' }}>
            — {estudiante.versiculoBiblicoLema.referencia}
          </div>
        </div>
      </section>

      {/* =======================================================================
          LISTA DE EVIDENCIAS AUDITABLES
          ======================================================================= */}
      <section className="wa-col-sm-4 wa-col-md-4 wa-col-lg-12">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--carbon-space-2x)' }}>
          {evidencias.map((item) => (
            <article
              key={item.id}
              className="wa-surface-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'opacity var(--wa-duration-fast) var(--wa-ease-decelerate)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span
                    style={{
                      fontFamily: 'var(--wa-font-mono)',
                      fontSize: '0.6875rem',
                      background: 'var(--wa-bg-interactive-subtle)',
                      padding: '2px 6px',
                      borderRadius: 'var(--wa-radius-sm)',
                      color: 'var(--wa-brand-gold-dark)',
                      fontWeight: 600,
                      marginRight: '8px',
                    }}
                  >
                    {item.categoria}
                  </span>
                  <span style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.75rem', color: 'var(--wa-text-secondary)' }}>
                    {item.materia} • {item.fechaRegistro}
                  </span>
                  <h2 style={{ fontFamily: 'var(--wa-font-display)', fontSize: '1.1875rem', margin: '4px 0', color: 'var(--wa-text-primary)' }}>
                    {item.titulo}
                  </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      fontFamily: 'var(--wa-font-mono)',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 'var(--wa-radius-sm)',
                      background:
                        item.calificacionCualitativa === 'DA'
                          ? 'var(--wa-brand-gold-primary)'
                          : 'var(--wa-bg-interactive-subtle)',
                      color:
                        item.calificacionCualitativa === 'DA'
                          ? 'var(--wa-bg-surface)'
                          : 'var(--wa-text-primary)',
                    }}
                  >
                    {item.calificacionCualitativa} (Destreza Alcanzada)
                  </span>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--wa-text-secondary)', lineHeight: 1.5 }}>
                {item.descripcion}
              </p>

              {/* RETROALIMENTACIÓN PEDAGÓGICA DEL MENTOR */}
              <div
                style={{
                  background: 'var(--wa-bg-interactive-subtle)',
                  padding: '8px 12px',
                  borderRadius: 'var(--wa-radius-sm)',
                  fontSize: '0.8125rem',
                  border: '1px solid var(--border-subtle)',
                  marginTop: '4px',
                }}
              >
                <strong style={{ color: 'var(--wa-brand-navy-primary)' }}>
                  {idiomaIngles ? 'Mentor Evaluation & Feedback:' : 'Dictamen Pedagógico del Mentor:'}
                </strong>{' '}
                <span style={{ color: 'var(--wa-text-primary)' }}>{item.comentarioMentor}</span>
              </div>

              {/* ARCHIVO ADJUNTO DE PRUEBA */}
              {item.archivoAdjunto && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--wa-brand-gold-dark)', fontFamily: 'var(--wa-font-mono)' }}>
                  <span>📎 Archivo:</span>
                  <span style={{ textDecoration: 'underline' }}>{item.archivoAdjunto}</span>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* =======================================================================
          MODAL DE REGISTRO DE NUEVA EVIDENCIA
          ======================================================================= */}
      {modalNuevaEvidencia && (
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
          <div
            className="wa-surface-card"
            style={{
              maxWidth: '600px',
              width: '100%',
              background: 'var(--wa-bg-surface)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h2 style={{ fontFamily: 'var(--wa-font-display)', fontSize: '1.375rem', marginTop: 0 }}>
              {idiomaIngles ? 'Register New Evidence for MINEDUC' : 'Registrar Nueva Evidencia para MINEDUC'}
            </h2>

            <form onSubmit={handleGuardarEvidencia} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  {idiomaIngles ? 'Evidence Title:' : 'Título de la Evidencia o Proyecto:'}
                </label>
                <input
                  type="text"
                  required
                  value={nuevaEvidencia.titulo || ''}
                  onChange={(e) => setNuevaEvidencia({ ...nuevaEvidencia, titulo: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--wa-radius-sm)',
                    border: '1px solid var(--wa-keyline-subtle)',
                    background: 'var(--wa-bg-interactive-subtle)',
                    color: 'var(--wa-text-primary)',
                    boxSizing: 'border-box',
                  }}
                  placeholder="e.g. Investigación del Ecosistema Andino"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                    {idiomaIngles ? 'Subject:' : 'Materia Oficial:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={nuevaEvidencia.materia || ''}
                    onChange={(e) => setNuevaEvidencia({ ...nuevaEvidencia, materia: e.target.value })}
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

                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                    {idiomaIngles ? 'Category:' : 'Categoría Normativa:'}
                  </label>
                  <select
                    value={nuevaEvidencia.categoria || 'INVESTIGACION'}
                    onChange={(e) => setNuevaEvidencia({ ...nuevaEvidencia, categoria: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--wa-radius-sm)',
                      border: '1px solid var(--wa-keyline-subtle)',
                      background: 'var(--wa-bg-interactive-subtle)',
                      color: 'var(--wa-text-primary)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <option value="INVESTIGACION">Investigación y Curiosidad</option>
                    <option value="LECTURA_BILINGUE">Lectura en Voz Alta Bilingüe</option>
                    <option value="FORMACION_ESPIRITUAL">Formación Espiritual Bíblica</option>
                    <option value="PROYECTO_PBL">Proyecto Integrador PBL</option>
                    <option value="ARTE_DEPORTE">Arte / Psicomotricidad</option>
                    <option value="ACTA_TUTORIA">Acta con Docente-Tutor</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  {idiomaIngles ? 'Description of Activity & Learning:' : 'Descripción del Aprendizaje y Destreza Desarrollada:'}
                </label>
                <textarea
                  required
                  rows={3}
                  value={nuevaEvidencia.descripcion || ''}
                  onChange={(e) => setNuevaEvidencia({ ...nuevaEvidencia, descripcion: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--wa-radius-sm)',
                    border: '1px solid var(--wa-keyline-subtle)',
                    background: 'var(--wa-bg-interactive-subtle)',
                    color: 'var(--wa-text-primary)',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Detalla qué aprendió el estudiante y cómo se verificó..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '4px' }}>
                  {idiomaIngles ? 'Mentor Feedback & Observation:' : 'Observación y Dictamen del Padre/Mentor:'}
                </label>
                <textarea
                  rows={2}
                  value={nuevaEvidencia.comentarioMentor || ''}
                  onChange={(e) => setNuevaEvidencia({ ...nuevaEvidencia, comentarioMentor: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--wa-radius-sm)',
                    border: '1px solid var(--wa-keyline-subtle)',
                    background: 'var(--wa-bg-interactive-subtle)',
                    color: 'var(--wa-text-primary)',
                    boxSizing: 'border-box',
                  }}
                  placeholder="Logros observados, nivel de autonomía, etc."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalNuevaEvidencia(false)}
                  style={{
                    background: 'transparent',
                    color: 'var(--wa-text-secondary)',
                    border: '1px solid var(--wa-keyline-subtle)',
                    padding: '8px 16px',
                    borderRadius: 'var(--wa-radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  {idiomaIngles ? 'Cancel' : 'Cancelar'}
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
                  {idiomaIngles ? 'Save Evidence' : 'Guardar Evidencia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

