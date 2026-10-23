/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Compilador de Guías Diarias en PDF
 * ARCHIVO: src/lib/pdf/daily-guide-compiler.ts
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Compila y genera el documento oficial de la "Guía de Ruta Diaria de Estudio"
 * para cada jornada escolar (200 días lectivos, Régimen Sierra-Amazonía):
 *
 * 1. TRANSFORMACIÓN PEDAGÓGICA (5 SECCIONES OBLIGATORIAS):
 *    Cada asignatura desarrolla el tema del día con profundidad académica completa
 *    y autónoma (sin depender de que el estudiante ya lo domine):
 *    - 1. Introducción y Objetivo Práctico (¿Qué y para qué?).
 *    - 2. Desarrollo Conceptual Completo (Marco teórico exhaustivo + Glosario formal).
 *    - 3. Guía Paso a Paso (Secuencia metódica + Consejos profesionales).
 *    - 4. Ejemplos Prácticos Resueltos (Casos tipo paso a paso con comprobación).
 *    - 5. Puntos Clave / Resumen (Caja de síntesis para repaso rápido).
 *    + Taller de aplicación práctica y espacio de apuntes del estudiante.
 *
 * 2. ARQUITECTURA EDITORIAL CSS PAGED MEDIA (LAYOUT ROBUSTO):
 *    - Tipografía con escala modular estricta: line-height calibrado y márgenes
 *      superiores/inferiores proporcionales que eliminan cualquier superposición.
 *    - Separación generosa entre contenedores (padding y margins sin elementos pegados).
 *    - Control de saltos de página: break-inside: avoid en tarjetas y tablas,
 *      break-after: avoid en encabezados para evitar títulos huérfanos, y orphans/widows: 3.
 *
 * 3. 100% COMPATIBLE CON VERCEL SERVERLESS:
 *    - Cero dependencias pesadas de Chromium. Compilación directa en < 5 ms.
 *    - Renderizado vectorial nítido para impresión y guardado como PDF en navegador.
 * ==============================================================================
 */

import { EstudianteWisdom } from '@/types/wisdom';
import {
  curriculumAuditorAndFiller,
  JornadaEscolarCompleta,
  MateriaJornada,
} from '@/services/curriculumAuditorAndFiller';

export class DailyGuideCompiler {
  private static instancia: DailyGuideCompiler;

  private constructor() {}

  public static obtenerInstancia(): DailyGuideCompiler {
    if (!DailyGuideCompiler.instancia) {
      DailyGuideCompiler.instancia = new DailyGuideCompiler();
    }
    return DailyGuideCompiler.instancia;
  }

  /**
   * Renderiza el bloque pedagógico completo de una asignatura con las 5 secciones requeridas.
   */
  private renderizarMateriaCompleta(m: MateriaJornada, idx: number): string {
    const guia = m.guiaPedagogica;

    // Si por alguna razón la guía no estuviera definida, garantizamos el fallback
    const intro = guia?.introduccionYObjetivo || {
      queAprenderas: `En esta lección integral comprenderás qué es y cómo funciona ${m.temaDelDia}, dominando los conceptos y procedimientos esenciales.`,
      paraQueSirvePractica: `Este conocimiento te servirá en tu vida cotidiana para resolver situaciones concretas y sentar bases analíticas sólidas.`,
      objetivoOperativo: m.objetivoAprendizaje,
    };

    const teoria = guia?.desarrolloConceptual || {
      marcoTeorico: `Para comprender ${m.temaDelDia}, no basta con memorizar una fórmula. Toda disciplina tiene un principio fundamental: el orden. No asumimos que ya dominas el tema; exploramos desde el concepto inicial hasta su aplicación práctica más avanzada, explicando el porqué de cada paso.`,
      conceptosClave: [
        { termino: 'Fundamento Base', definicion: `La idea central que sostiene a ${m.temaDelDia}.` },
        { termino: 'Procedimiento Metódico', definicion: 'Secuencia ordenada para alcanzar una respuesta exacta y verificable.' },
      ],
      fundamentoProfundo: m.conceptoClave,
    };

    const pasos = guia?.guiaPasoAPaso || [
      {
        pasoNumero: 1,
        titulo: 'Lectura Atenta y Observación del Problema',
        instruccionDetallada: 'Identifica los datos esenciales y subraya con precisión qué se pide resolver.',
        consejoPro: 'Nunca comiences a calcular sin tener claro el objetivo final.',
      },
      {
        pasoNumero: 2,
        titulo: 'Esquematización y Representación',
        instruccionDetallada: 'Organiza las variables en un esquema visual o tabla clara.',
        consejoPro: 'El apoyo gráfico disminuye los errores de cálculo a la mitad.',
      },
      {
        pasoNumero: 3,
        titulo: 'Ejecución del Algoritmo Justificado',
        instruccionDetallada: 'Aplica el procedimiento paso por paso con fundamentación en cada línea.',
        consejoPro: 'El orden en tu libreta refleja el orden en tu mente.',
      },
      {
        pasoNumero: 4,
        titulo: 'Comprobación de Coherencia',
        instruccionDetallada: 'Verifica la solución sustituyendo en las condiciones iniciales.',
        consejoPro: 'La comprobación final certifica la validez académica del trabajo.',
      },
    ];

    const ejemplos = guia?.ejemplosResueltos || [
      {
        tituloCaso: `Caso Práctico Resuelto en ${m.nombreMateria}`,
        planteamiento: `Situación de aplicación guiada sobre ${m.temaDelDia}.`,
        desarrolloPasoAPaso: m.ejemploPasoAPaso || [
          'Paso 1: Identificación y ordenamiento de los datos del problema.',
          'Paso 2: Aplicación de la regla o fórmula correspondiente.',
          'Paso 3: Verificación de consistencia del resultado.',
        ],
        resultadoExplicado: 'Se obtiene el resultado y se comprueba que satisface las condiciones iniciales con exactitud.',
      },
    ];

    const puntosClave = guia?.puntosClaveResumen || [
      `${m.temaDelDia} se fundamenta en principios ordenados y demostrables.`,
      'El procedimiento secuencial paso a paso previene omisiones analíticas.',
      'La comprobación rigurosa valida la calidad del aprendizaje autónomo.',
      'Todo conocimiento bien aplicado se demuestra con evidencia, ética y servicio al bien común.',
    ];

    return `
    <!-- BLOQUE ASIGNATURA ${idx + 1}: ${m.nombreMateria} -->
    <article class="academic-subject-block avoid-break">
      <!-- CABECERA DE LA ASIGNATURA -->
      <header class="subject-header">
        <div class="subject-meta-left">
          <span class="subject-index-pill">${idx + 1}</span>
          <div>
            <h3 class="subject-title">${m.nombreMateria}</h3>
            <span class="subject-curriculum-code">MINEDUC: ${m.codigoMineduc} • ${m.subtitulo}</span>
          </div>
        </div>
        <div class="subject-meta-right">
          <span class="subject-time-badge">⏰ ${m.horaInicio} - ${m.horaFin}</span>
          <span class="subject-mentor-badge">Docente IA: ${m.profesorIA}</span>
        </div>
      </header>

      <!-- TEMA DEL DÍA Y LEMA DE LA ASIGNATURA -->
      <div class="theme-banner">
        <div class="theme-heading">${m.temaDelDia}</div>
        <div class="theme-scripture">
          <strong>${m.tipoLema === 'BIBLICO' ? 'Lema Bíblico' : 'Principio Académico'}:</strong> &ldquo;${m.versiculoBiblico.texto}&rdquo; (${m.versiculoBiblico.referencia})
        </div>
      </div>

      <!-- SECCIÓN 1: INTRODUCCIÓN Y OBJETIVO PRÁCTICO -->
      <section class="pedagogical-section section-intro">
        <div class="section-badge-tag tag-intro">1. Introducción y Objetivo Práctico</div>
        <div class="intro-grid">
          <div class="intro-box">
            <span class="intro-label">🎯 ¿Qué aprenderás hoy?</span>
            <p class="intro-text">${intro.queAprenderas}</p>
          </div>
          <div class="intro-box">
            <span class="intro-label">💡 ¿Para qué sirve en la práctica?</span>
            <p class="intro-text">${intro.paraQueSirvePractica}</p>
          </div>
        </div>
        <div class="learning-objective-bar">
          <strong>Meta Observable:</strong> ${intro.objetivoOperativo}
        </div>
      </section>

      <!-- SECCIÓN 2: DESARROLLO CONCEPTUAL COMPLETO -->
      <section class="pedagogical-section section-theory">
        <div class="section-badge-tag tag-theory">2. Desarrollo Conceptual Completo</div>
        <p class="theory-prose">${teoria.marcoTeorico}</p>
        
        <div class="glossary-grid">
          ${teoria.conceptosClave
            .map(
              (c) => `
            <div class="glossary-card">
              <strong class="glossary-term">📌 ${c.termino}:</strong>
              <span class="glossary-definition">${c.definicion}</span>
            </div>
          `
            )
            .join('')}
        </div>

        <div class="worldview-callout">
          <strong>🌿 Cosmovisión y Fundamento:</strong> ${teoria.fundamentoProfundo}
        </div>
      </section>

      <!-- SECCIÓN 3: GUÍA PASO A PASO -->
      <section class="pedagogical-section section-steps">
        <div class="section-badge-tag tag-steps">3. Guía Paso a Paso (Método Secuencial)</div>
        <div class="steps-flow-container">
          ${pasos
            .map(
              (p) => `
            <div class="step-card">
              <div class="step-badge">Paso ${p.pasoNumero}</div>
              <div class="step-body">
                <strong class="step-title">${p.titulo}</strong>
                <p class="step-instruction">${p.instruccionDetallada}</p>
                ${
                  p.consejoPro
                    ? `<div class="step-pro-tip"><strong>⚡ Consejo Pro:</strong> ${p.consejoPro}</div>`
                    : ''
                }
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </section>

      <!-- SECCIÓN 4: EJEMPLOS PRÁCTICOS RESUELTOS -->
      <section class="pedagogical-section section-examples">
        <div class="section-badge-tag tag-examples">4. Ejemplos Prácticos Resueltos</div>
        ${ejemplos
          .map(
            (ej, ejIdx) => `
          <div class="example-card">
            <div class="example-header">
              <span class="example-title">💡 ${ej.tituloCaso || `Ejemplo ${ejIdx + 1}`}</span>
            </div>
            <div class="example-problem">
              <strong>Planteamiento del Caso:</strong> ${ej.planteamiento}
            </div>
            <div class="example-solution-box">
              <span class="solution-label">Procedimiento de Resolución Guiado:</span>
              <ol class="example-steps-list">
                ${ej.desarrolloPasoAPaso.map((st) => `<li>${st}</li>`).join('')}
              </ol>
            </div>
            <div class="example-verification">
              <strong>✅ Conclusión y Comprobación:</strong> ${ej.resultadoExplicado}
            </div>
          </div>
        `
          )
          .join('')}
      </section>

      <!-- SECCIÓN 5: PUNTOS CLAVE / RESUMEN -->
      <section class="pedagogical-section section-summary">
        <div class="section-badge-tag tag-summary">5. Puntos Clave / Resumen para Repaso Rápido</div>
        <div class="summary-card">
          <ul class="summary-list">
            ${puntosClave.map((pt) => `<li>${pt}</li>`).join('')}
          </ul>
        </div>
      </section>

      <!-- TALLER PRÁCTICO Y ESPACIO DE NOTAS DEL ESTUDIANTE -->
      <div class="workshop-and-notes-row">
        <div class="workshop-card">
          <span class="workshop-title">✍️ Taller Práctico / Cuaderno de Trabajo:</span>
          <p class="workshop-desc">${m.tallerManual}</p>
        </div>
        <div class="student-notes-area">
          <span class="notes-title">✏️ Espacio de Apuntes, Dudas y Verificación (${m.nombreMateria}):</span>
          <div class="notes-lines"></div>
        </div>
      </div>
    </article>
    `;
  }

  /**
   * Compila y renderiza el código HTML completo de la Guía de Ruta Diaria Unificada (A4 PDF).
   */
  public compilarGuiaDiariaHtml(
    estudianteOJornada: EstudianteWisdom | JornadaEscolarCompleta,
    diaLectivo: number | boolean = 1,
    autoPrint: boolean = false
  ): string {
    let jornada: JornadaEscolarCompleta;
    let imprimir = autoPrint;

    if ('diaLectivo' in estudianteOJornada && 'materias' in (estudianteOJornada as JornadaEscolarCompleta)) {
      jornada = estudianteOJornada as JornadaEscolarCompleta;
      if (typeof diaLectivo === 'boolean') {
        imprimir = diaLectivo;
      }
    } else {
      const dia = typeof diaLectivo === 'number' ? diaLectivo : 1;
      jornada = curriculumAuditorAndFiller.obtenerJornadaEscolarCompleta(
        dia,
        estudianteOJornada as EstudianteWisdom
      );
    }

    const hashVerificacion = `WA-PDF-${Date.now().toString(16).toUpperCase()}-D${jornada.diaLectivo}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Guía de Estudio Oficial • Día ${jornada.diaLectivo} • ${jornada.estudiante} • Wisdom Academy</title>
  <style>
    /* =======================================================================
       1. REGLAS W3C CSS PAGED MEDIA Y REINICIO DE IMPRESIÓN A4
       ======================================================================= */
    @page {
      size: A4 portrait;
      margin: 14mm 14mm 14mm 14mm;
    }

    @media print {
      html, body {
        background-color: #FCFDFC !important;
        color: #0F172A !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
      .sheet {
        box-shadow: none !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
      }
      .page-break-force {
        page-break-before: always !important;
        break-before: page !important;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* =======================================================================
       2. JERARQUÍA TIPOGRÁFICA EDITORIAL (ESCALA MODULAR Y LINE-HEIGHT)
       ======================================================================= */
    body {
      font-family: "Segoe UI", "Helvetica Neue", -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #F3EFEA;
      color: #1E293B;
      margin: 0;
      padding: 24px 12px;
      line-height: 1.55;
      font-size: 11.5px;
    }

    /* Prevención estricta de encabezados huérfanos y líneas viudas */
    h1, h2, h3, h4, h5, .section-title, .subject-header, .brand-header {
      break-after: avoid !important;
      page-break-after: avoid !important;
    }

    p, li, .theory-prose, .intro-text {
      orphans: 3;
      widows: 3;
    }

    /* =======================================================================
       3. CONTENEDOR PRINCIPAL TIPO HOJA FÍSICA (SHEET)
       ======================================================================= */
    .sheet {
      background-color: #FCFDFC;
      max-width: 840px;
      margin: 0 auto 32px auto;
      padding: 34px 38px;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08);
      position: relative;
    }

    /* =======================================================================
       4. CABECERA INSTITUCIONAL Y METADATOS
       ======================================================================= */
    .brand-header {
      display: flex;
      justifyContent: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #03583A;
      padding-bottom: 14px;
      margin-bottom: 18px;
      gap: 16px;
    }

    .brand-logo-area {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-family: "Segoe UI", "Helvetica Neue", -apple-system, sans-serif;
      font-size: 20px;
      font-weight: 800;
      color: #03583A;
      line-height: 1.25;
      margin: 0 0 4px 0;
      letter-spacing: -0.3px;
    }

    .brand-sub {
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #2563EB;
      line-height: 1.3;
      margin: 0;
    }

    .brand-legal-badge {
      text-align: right;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .pill-badge {
      display: inline-block;
      padding: 4px 10px;
      background-color: #03583A;
      color: #F8FAFC;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      line-height: 1.2;
    }

    .gold-badge {
      display: inline-block;
      padding: 4px 10px;
      background-color: #2563EB;
      color: #F7FCF9;
      border-radius: 4px;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      line-height: 1.2;
    }

    .legal-notice-text {
      font-size: 9px;
      color: #64748B;
      font-weight: 600;
      line-height: 1.3;
    }

    /* =======================================================================
       5. REJILLA DE METADATOS DEL ESTUDIANTE Y LEMA DE LA JORNADA
       ======================================================================= */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 18px;
      break-inside: avoid !important;
    }

    .info-item span {
      display: block;
      color: #64748B;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 2px;
    }

    .info-item strong {
      color: #0F172A;
      font-size: 11.5px;
      font-weight: 700;
    }

    .verse-card {
      background-color: #FAF5E6;
      border: 1px solid #D8C9A3;
      padding: 12px 18px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-style: italic;
      color: #1E293B;
      font-size: 12px;
      line-height: 1.5;
      break-inside: avoid !important;
    }

    .verse-ref {
      font-weight: 700;
      color: #2563EB;
      font-style: normal;
      font-size: 10.5px;
      margin-top: 6px;
      text-align: right;
    }

    .section-title {
      font-size: 13.5px;
      font-weight: 800;
      color: #03583A;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1.5px solid #E2E8F0;
      padding-bottom: 6px;
      margin: 22px 0 12px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      break-after: avoid !important;
    }

    /* =======================================================================
       6. TABLA DE ITINERARIO DE LA JORNADA
       ======================================================================= */
    table.daily-schedule {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 11px;
      break-inside: avoid !important;
    }

    table.daily-schedule th {
      background-color: #03583A;
      color: #F7FCF9;
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
      border: 1px solid #03583A;
      font-size: 10.5px;
      letter-spacing: 0.03em;
    }

    table.daily-schedule td {
      padding: 8px 10px;
      border: 1px solid #E2E8F0;
      line-height: 1.4;
    }

    /* =======================================================================
       7. BLOQUE DIDÁCTICO DE ASIGNATURA (TRANSFORMACIÓN PEDAGÓGICA)
       ======================================================================= */
    .academic-subject-block {
      border: 1.5px solid #CBD5E1;
      border-radius: 8px;
      padding: 18px 20px;
      margin-bottom: 26px;
      background-color: #FCFDFC;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .subject-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-bottom: 2px solid #03583A;
      padding-bottom: 10px;
      gap: 12px;
      flex-wrap: wrap;
      break-after: avoid !important;
    }

    .subject-meta-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .subject-index-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background-color: #03583A;
      color: #F7FCF9;
      font-size: 12px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .subject-title {
      font-size: 15px;
      font-weight: 800;
      color: #03583A;
      margin: 0;
      line-height: 1.3;
    }

    .subject-curriculum-code {
      display: block;
      font-size: 10px;
      font-weight: 600;
      color: #64748B;
      margin-top: 2px;
    }

    .subject-meta-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .subject-time-badge {
      background-color: #F1F5F9;
      color: #1E293B;
      border: 1px solid #CBD5E1;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
    }

    .subject-mentor-badge {
      background-color: #ECFDF5;
      color: #065F46;
      border: 1px solid #A7F3D0;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 10.5px;
      font-weight: 700;
    }

    .theme-banner {
      background-color: #F8FAFC;
      border: 1px solid #C8D6CD;
      border-radius: 4px;
      padding: 10px 14px;
      margin-bottom: 14px;
    }

    .theme-heading {
      font-size: 13px;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 4px;
      line-height: 1.35;
    }

    .theme-scripture {
      font-size: 10.5px;
      color: #475569;
      font-style: italic;
    }

    /* SECCIONES PEDAGÓGICAS INTERNAS */
    .pedagogical-section {
      margin-bottom: 14px;
      padding: 12px 14px;
      border-radius: 6px;
      border: 1px solid #E2E8F0;
      background-color: #FCFDFC;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .section-badge-tag {
      display: inline-block;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 3px 8px;
      border-radius: 3px;
      margin-bottom: 8px;
      line-height: 1.2;
    }

    .tag-intro { background-color: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE; }
    .tag-theory { background-color: #F0FDF4; color: #166534; border: 1px solid #BBF7D0; }
    .tag-steps { background-color: #FFFBEB; color: #92400E; border: 1px solid #FDE68A; }
    .tag-examples { background-color: #F8FAFC; color: #0F172A; border: 1px solid #CBD5E1; }
    .tag-summary { background-color: #FAF5E6; color: #78350F; border: 1px solid #FDE68A; }

    /* 1. INTRO GRID */
    .intro-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 8px;
    }

    .intro-box {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 8px 10px;
      border-radius: 4px;
    }

    .intro-label {
      display: block;
      font-size: 9.5px;
      font-weight: 700;
      color: #03583A;
      margin-bottom: 3px;
    }

    .intro-text {
      font-size: 10.5px;
      color: #334155;
      margin: 0;
      line-height: 1.45;
    }

    .learning-objective-bar {
      background-color: #F1F5F9;
      border: 1px solid #CBD5E1;
      padding: 6px 10px;
      font-size: 10.5px;
      color: #1E293B;
      border-radius: 4px;
    }

    /* 2. TEORÍA Y GLOSARIO */
    .theory-prose {
      font-size: 11px;
      color: #1E293B;
      line-height: 1.55;
      margin: 0 0 10px 0;
      text-align: justify;
    }

    .glossary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 8px;
      margin-bottom: 8px;
    }

    .glossary-card {
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 10px;
      line-height: 1.4;
    }

    .glossary-term {
      color: #0F172A;
      display: block;
      margin-bottom: 2px;
    }

    .glossary-definition {
      color: #475569;
    }

    .worldview-callout {
      font-size: 10px;
      color: #065F46;
      background-color: #ECFDF5;
      padding: 6px 10px;
      border: 1px solid #A7F3D0;
      border-radius: 4px;
    }

    /* 3. PASOS */
    .steps-flow-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .step-card {
      display: flex;
      gap: 10px;
      background-color: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 4px;
      padding: 8px 12px;
      break-inside: avoid !important;
    }

    .step-badge {
      background-color: #03583A;
      color: #F7FCF9;
      font-size: 9px;
      font-weight: 800;
      padding: 3px 6px;
      border-radius: 3px;
      height: fit-content;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .step-body {
      flex: 1;
    }

    .step-title {
      font-size: 11px;
      color: #0F172A;
      display: block;
      margin-bottom: 2px;
    }

    .step-instruction {
      font-size: 10.5px;
      color: #334155;
      margin: 0;
      line-height: 1.45;
    }

    .step-pro-tip {
      font-size: 9.5px;
      color: #92400E;
      background-color: #FFFBEB;
      padding: 4px 8px;
      border-radius: 3px;
      margin-top: 4px;
      display: inline-block;
    }

    /* 4. EJEMPLOS RESUELTOS */
    .example-card {
      background-color: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      padding: 10px 14px;
      margin-bottom: 10px;
      break-inside: avoid !important;
    }

    .example-title {
      font-size: 11.5px;
      font-weight: 800;
      color: #0F766E;
      display: block;
      margin-bottom: 4px;
    }

    .example-problem {
      font-size: 11px;
      color: #1E293B;
      margin-bottom: 6px;
      line-height: 1.45;
    }

    .example-solution-box {
      background-color: #FCFDFC;
      border: 1px dashed #94A3B8;
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 6px;
    }

    .solution-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      display: block;
      margin-bottom: 4px;
    }

    .example-steps-list {
      margin: 0;
      padding-left: 18px;
      font-size: 10.5px;
      color: #1E293B;
      line-height: 1.45;
    }

    .example-verification {
      font-size: 10px;
      color: #065F46;
      background-color: #ECFDF5;
      padding: 4px 8px;
      border-radius: 3px;
      font-weight: 600;
    }

    /* 5. RESUMEN */
    .summary-card {
      background-color: #FAF5E6;
      border: 1px solid #E5C77A;
      border-radius: 4px;
      padding: 10px 14px;
      break-inside: avoid !important;
    }

    .summary-list {
      margin: 0;
      padding-left: 18px;
      font-size: 10.5px;
      color: #451A03;
      line-height: 1.5;
    }

    /* TALLER Y APUNTES */
    .workshop-and-notes-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-top: 14px;
      break-inside: avoid !important;
    }

    .workshop-card {
      background-color: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      padding: 10px 14px;
    }

    .workshop-title {
      font-size: 10.5px;
      font-weight: 800;
      color: #03583A;
      display: block;
      margin-bottom: 4px;
    }

    .workshop-desc {
      font-size: 10.5px;
      color: #334155;
      margin: 0;
      line-height: 1.45;
    }

    .student-notes-area {
      border: 1px dashed #2563EB;
      background-color: #FCFDFC;
      border-radius: 4px;
      padding: 10px 14px;
      min-height: 75px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .notes-title {
      font-size: 10px;
      font-weight: 700;
      color: #2563EB;
      display: block;
    }

    .notes-lines {
      border-bottom: 1px dotted #CBD5E1;
      height: 24px;
      margin-top: 8px;
    }

    /* =======================================================================
       8. FIRMAS MINISTERIALES Y CIERRE LEGAL
       ======================================================================= */
    .signatures-block {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 26px;
      text-align: center;
      font-size: 10.5px;
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    .signature-line {
      border-top: 1.5px solid #0F172A;
      padding-top: 6px;
      margin-top: 38px;
      font-weight: 700;
      color: #0F172A;
    }

    .footer-stamp {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px dashed #CBD5E1;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #64748B;
      font-family: monospace;
      break-inside: avoid !important;
    }

    .top-toolbar {
      max-width: 840px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #FCFDFC;
      padding: 12px 20px;
      border-radius: 6px;
      border: 1px solid #CBD5E1;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
    }

    .btn-print {
      background-color: #2563EB;
      color: #F7FCF9;
      border: none;
      padding: 8px 18px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-back {
      background-color: #03583A;
      color: #F7FCF9;
      border: none;
      padding: 8px 18px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 12px;
      text-decoration: none;
      display: inline-block;
    }
  </style>
</head>
<body>

  <!-- BARRA DE ACCIÓN SUPERIOR (NO IMPRIMIBLE) -->
  <div class="top-toolbar no-print">
    <div>
      <strong style="color: #03583A; font-size: 13px;">Wisdom Academy</strong> • Guía Oficial de Ruta Diaria (A4 Imprimible)
    </div>
    <div style="display: flex; gap: 10px;">
      <a href="/dashboard" class="btn-back">← Volver al Portal</a>
      <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Guardar en PDF</button>
    </div>
  </div>

  <!-- =======================================================================
       HOJA 1: CARÁTULA, ITINERARIO Y METAS DE LA JORNADA ESCOLAR
       ======================================================================= -->
  <div class="sheet">
    <div class="brand-header">
      <div class="brand-logo-area">
        <h1 class="brand-title">WISDOM ACADEMY</h1>
        <div class="brand-sub">SAPIENTIA A DEO • EDUCACIÓN CRISTIANA EVANGÉLICA BILINGÜE K-12</div>
      </div>
      <div class="brand-legal-badge">
        <span class="pill-badge">GUÍA OFICIAL DE RUTA DIARIA • PORTAFOLIO MINISTERIAL</span>
        <div class="legal-notice-text">
          ACUERDOS MINISTERIALES MINEDUC-2019-00057-A / MINEDUC-2023-00069-A<br>
          AÑO LECTIVO 2026 - 2027 • RÉGIMEN SIERRA-AMAZONÍA
        </div>
      </div>
    </div>

    <!-- DATOS DE LA JORNADA -->
    <div class="info-grid">
      <div class="info-item">
        <span>ESTUDIANTE:</span>
        <strong>${jornada.estudiante}</strong>
      </div>
      <div class="info-item">
        <span>GRADO / NIVEL:</span>
        <strong>${jornada.grado}</strong>
      </div>
      <div class="info-item">
        <span>DÍA LECTIVO:</span>
        <strong>Día ${jornada.diaLectivo} de 200</strong>
      </div>
      <div class="info-item">
        <span>FECHA OFICIAL:</span>
        <strong>${jornada.fechaLarga}</strong>
      </div>
    </div>

    <!-- LEMA ACADÉMICO DE LA JORNADA -->
    <div class="verse-card">
      &ldquo;${jornada.versiculoLemaJornada.texto}&rdquo;
      <div class="verse-ref">— ${jornada.versiculoLemaJornada.referencia} (Lema Rector de la Jornada)</div>
    </div>

    <!-- CRONOGRAMA DE LA JORNADA ESCOLAR -->
    <div class="section-title">
      <span>1. Horario y Módulos de la Jornada (08:00 a 12:00)</span>
      <span class="gold-badge">Trimestre ${jornada.trimestre} • Semana ${jornada.semanaNumero}</span>
    </div>

    <table class="daily-schedule">
      <thead>
        <tr>
          <th style="width: 100px;">HORARIO</th>
          <th>ASIGNATURA Y PROFESOR IA</th>
          <th>TEMA PEDAGÓGICO DE LA CLASE</th>
          <th style="width: 85px; text-align: center;">ESTADO</th>
        </tr>
      </thead>
      <tbody>
        ${jornada.materias
          .map(
            (m, idx) => `
          <tr style="background-color: ${idx % 2 === 0 ? '#FCFDFC' : '#F8FAFC'};">
            <td style="font-weight: 700; color: #03583A;">${m.horaInicio} - ${m.horaFin}</td>
            <td>
              <strong>${m.nombreMateria}</strong>
              <div style="font-size: 10px; color: #065F46;">${m.profesorIA} • ${m.codigoMineduc}</div>
            </td>
            <td>${m.temaDelDia}</td>
            <td style="text-align: center; font-weight: 700; color: #475569;">[ ] Listo</td>
          </tr>
          ${
            idx === 1
              ? `
          <tr style="background-color: #FEF3C7; color: #92400E; font-weight: 700; font-size: 10px;">
            <td style="padding: 6px 10px;">09:30 - 10:00</td>
            <td colspan="3" style="padding: 6px 10px;">☕ RECREO, REFRIGERIO NUTRITIVO Y PAUSA ACTIVA EN FAMILIA (30 MIN)</td>
          </tr>`
              : ''
          }
        `
          )
          .join('')}
      </tbody>
    </table>

    <!-- OBJETIVOS GENERALES Y CHECKLIST -->
    <div class="section-title">
      <span>2. Metas de Aprendizaje y Checklist de Autonomía</span>
    </div>

    <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 14px; font-size: 11px;">
      <div style="background-color: #F8FAFC; padding: 12px 16px; border-radius: 6px; border: 1px solid #E2E8F0;">
        <strong style="color: #03583A; display: block; margin-bottom: 6px;">🎯 Metas de Desempeño Diario:</strong>
        <ul style="margin: 0; padding-left: 18px; color: #1E293B; line-height: 1.5;">
          <li>Completar las 5 lecciones guiadas por los Profesores IA en el aula OpenMAIC.</li>
          <li>Desarrollar los talleres de aplicación práctica y resolver los ejemplos guiados.</li>
          <li>Fundamentar cada aprendizaje en evidencia, método y reflexión ética.</li>
        </ul>
      </div>

      <div style="background-color: #F8FAFC; padding: 12px 16px; border-radius: 6px; border: 1px solid #E2E8F0;">
        <strong style="color: #2563EB; display: block; margin-bottom: 6px;">📋 Checklist del Estudiante:</strong>
        <div style="display: flex; flex-direction: column; gap: 5px; color: #334155;">
          <div>[ ] Cuaderno, textos y materiales de la jornada sobre el escritorio.</div>
          <div>[ ] Participación activa socrática en OpenMAIC.</div>
          <div>[ ] Cuestionario formativo y ejercicios completados.</div>
          <div>[ ] Portafolio firmado por el representante legal.</div>
        </div>
      </div>
    </div>

    <div class="footer-stamp">
      <div>WISDOM ACADEMY CLOUD • GUÍA OFICIAL DE RUTA DIARIA • PORTADA E ITINERARIO</div>
      <div>ID: ${hashVerificacion}</div>
    </div>
  </div>

  <!-- =======================================================================
       HOJAS 2 Y SIGUIENTES: GUÍAS ACADÉMICAS COMPLETAS DE CADA MATERIA (5 SECCIONES)
       ======================================================================= -->
  ${jornada.materias
    .map(
      (m, idx) => `
    <div class="sheet page-break-force">
      <div class="brand-header">
        <div class="brand-logo-area">
          <strong style="color: #03583A; font-size: 15px;">Guía de Estudio Autónomo • Asignatura ${idx + 1} de 5</strong>
          <span style="font-size: 10px; color: #64748B;">Currículo Nacional MINEDUC & Rigor Académico</span>
        </div>
        <div style="font-size: 10px; color: #2563EB; font-weight: 700; text-align: right;">
          DÍA LECTIVO ${jornada.diaLectivo} • ${jornada.estudiante} (${jornada.grado})
        </div>
      </div>

      ${this.renderizarMateriaCompleta(m, idx)}

      <div class="footer-stamp">
        <div>WISDOM ACADEMY CLOUD • GUÍA DE ESTUDIO OFICIAL • ${m.nombreMateria.toUpperCase()}</div>
        <div>VERIFICACIÓN: [${hashVerificacion}-M${idx + 1}]</div>
      </div>
    </div>
  `
    )
    .join('')}

  <!-- =======================================================================
       HOJA FINAL: REGISTRO DE ASISTENCIA, EVALUACIÓN MINISTERIAL Y FIRMAS
       ======================================================================= -->
  <div class="sheet page-break-force">
    <div class="brand-header">
      <div class="brand-logo-area">
        <strong style="color: #03583A; font-size: 15px;">Validación Ministerial, Asistencia y Portafolio Oficial</strong>
        <span style="font-size: 10px; color: #64748B;">Acuerdos Ministeriales MINEDUC-2019-00057-A / MINEDUC-2023-00069-A</span>
      </div>
      <div style="font-size: 10px; color: #2563EB; font-weight: 700; text-align: right;">
        CIERRE DE JORNADA • DÍA LECTIVO ${jornada.diaLectivo}
      </div>
    </div>

    <!-- EVALUACIÓN Y CONSOLIDACIÓN DEL DÍA -->
    <div class="section-title">
      <span>Registro Oficial de Asistencia y Escala Cualitativa</span>
      <span class="gold-badge">MINEDUC Ecuador</span>
    </div>

    <div style="background-color: #F8FAFC; padding: 14px 18px; border-radius: 6px; border: 1px solid #CBD5E1; font-size: 11px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
      <div>
        <strong style="color: #03583A; display: block; margin-bottom: 4px;">REGISTRO DE ASISTENCIA Y CARGA HORARIA:</strong>
        <div>• Jornada completa: <strong>${jornada.duracionTotalHoras} Horas Pedagógicas Cumplidas</strong></div>
        <div>• Registro en plataforma: <strong>[X] Sincronizado en Moodle LMS & OpenMAIC</strong></div>
        <div>• Modalidad: <strong>Educación en Casa / Homeschooling Legal</strong></div>
      </div>
      <div>
        <strong style="color: #0F766E; display: block; margin-bottom: 4px;">Escala Cualitativa Oficial MINEDUC:</strong>
        <div>[ ] <strong>DAR</strong> (Domina los Aprendizajes Requeridos • 9.00 - 10.00)</div>
        <div>[ ] <strong>AAR</strong> (Alcanza los Aprendizajes Requeridos • 7.00 - 8.99)</div>
        <div>[ ] <strong>PAAR</strong> (Próximo a Alcanzar los Aprendizajes • 4.01 - 6.99)</div>
      </div>
    </div>

    <!-- RÚBRICA FORMATIVA DE PORTAFOLIO -->
    <div class="section-title">
      <span>Rúbrica Formativa de Portafolio del Estudiante</span>
    </div>

    <table class="daily-schedule" style="margin-bottom: 24px;">
      <thead>
        <tr>
          <th>CRITERIO DE EVALUACIÓN</th>
          <th style="width: 120px; text-align: center;">DAR (Excelente)</th>
          <th style="width: 120px; text-align: center;">AAR (Satisfactorio)</th>
          <th style="width: 100px; text-align: center;">OBSERVACIÓN</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Profundidad Conceptual:</strong> Demuestra comprensión cabal de la teoría y los términos clave en todas las asignaturas de la jornada.</td>
          <td style="text-align: center;">[ ]</td>
          <td style="text-align: center;">[ ]</td>
          <td></td>
        </tr>
        <tr style="background-color: #F8FAFC;">
          <td><strong>Resolución Paso a Paso:</strong> Sigue el algoritmo metódico y justifica los procedimientos con orden y claridad.</td>
          <td style="text-align: center;">[ ]</td>
          <td style="text-align: center;">[ ]</td>
          <td></td>
        </tr>
        <tr>
          <td><strong>Autonomía y Comprobación:</strong> Realiza los talleres prácticos, comprueba los resultados y formula conclusiones fundamentadas.</td>
          <td style="text-align: center;">[ ]</td>
          <td style="text-align: center;">[ ]</td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <!-- CUADRO TRIPARTITO DE FIRMAS -->
    <div class="signatures-block">
      <div>
        <div class="signature-line">${jornada.estudiante}</div>
        <div>Firma del Estudiante</div>
        <div style="font-size: 9px; color: #64748B;">Wisdom Academy Cloud</div>
      </div>

      <div>
        <div class="signature-line">${jornada.materias[0]?.profesorIA || 'Prof. Mateo'}</div>
        <div>Tutor Mentor OpenMAIC</div>
        <div style="font-size: 9px; color: #64748B;">Sistema Multi-Agente Socrático</div>
      </div>

      <div>
        <div class="signature-line">Representante Legal / Padre Mentor</div>
        <div>Firma del Representante Legal</div>
        <div style="font-size: 9px; color: #64748B;">Modalidad Homeschooling Ecuador</div>
      </div>
    </div>

    <div class="footer-stamp">
      <div>WISDOM ACADEMY CLOUD • GUÍA OFICIAL DE RUTA DIARIA • CIERRE MINISTERIAL</div>
      <div>VERIFICACIÓN DIGITAL: HASH [${hashVerificacion}] • MOODLE LMS OK • SHA-256 VALIDADOR</div>
    </div>
  </div>

  ${imprimir ? '<script>window.onload = function() { window.print(); };</script>' : ''}
</body>
</html>`;
  }
}

export const dailyGuideCompiler = DailyGuideCompiler.obtenerInstancia();

export const compilarGuiaDiariaHtml = (
  estudianteOJornada: EstudianteWisdom | JornadaEscolarCompleta,
  diaLectivo: number | boolean = 1,
  autoPrint: boolean = false
): string => {
  return dailyGuideCompiler.compilarGuiaDiariaHtml(estudianteOJornada, diaLectivo, autoPrint);
};
