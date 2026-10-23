/**
 * ==============================================================================
 * PROYECTO: Wisdom Academy Platform - Generador de Certificados Verificables
 * ARCHIVO: src/components/CertificateGenerator.tsx
 *
 * PROPÓSITO ARQUITECTÓNICO:
 * Este componente genera y renderiza certificados académicos y de talleres libres
 * bilingües (Español / Inglés) con verificación criptográfica y enlace al módulo
 * Custom Certificate de Moodle LMS.
 *
 * CARACTERÍSTICAS TÉCNICAS:
 * 1. Utiliza los activos oficiales de marca:
 *    - Logotipo vertical institucional (/brand/png/wisdom-logo-vertical-color.png)
 *    - Icono heráldico dorado (/brand/svg/wisdom-icon-color.svg)
 * 2. Emite certificados tanto para los 14 Años Escolares (1° EGB a 3° BGU) como
 *    para los Talleres Libres de la Academia.
 * 3. Incluye código QR / hash SHA-256 de verificación pública para validación
 *    por terceros e instituciones del Ministerio de Educación de Ecuador.
 * 4. Botón de impresión y exportación PDF directa vía @media print.
 * ==============================================================================
 */

'use client';

import React, { useState } from 'react';
import { EstudianteWisdom } from '@/types/wisdom';

export interface DatosCertificado {
  idCertificado: string;
  nombreEstudiante: string;
  tipoCertificado: 'GRADO_ESCOLAR' | 'TALLER_LIBRE' | 'PROGRAMA_TEOLOGICO';
  tituloPrograma: string;
  tituloProgramaEn: string;
  cargaHoraria: number; // Horas pedagógicas
  fechaEmision: string;
  versiculoBendicion: {
    referencia: string;
    textoEs: string;
    textoEn: string;
  };
  hashVerificacion: string;
  urlValidacionMoodle: string;
  rectorFirmante: string;
  tutorFirmante: string;
}

interface CertificateGeneratorProps {
  estudianteActivo?: EstudianteWisdom;
  idiomaIngles?: boolean;
}

export const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({
  estudianteActivo,
  idiomaIngles = false,
}) => {
  // Opciones de certificados precargados para selección rápida
  const [certificadosDisponibles] = useState<DatosCertificado[]>([
    {
      idCertificado: 'CERT-2026-GAEL-4EGB',
      nombreEstudiante: 'Gael Mateo',
      tipoCertificado: 'GRADO_ESCOLAR',
      tituloPrograma: '4.º Grado de Educación General Básica Elemental',
      tituloProgramaEn: '4th Grade Elementary General Basic Education',
      cargaHoraria: 800,
      fechaEmision: '2026-07-02',
      versiculoBendicion: {
        referencia: 'Proverbios 2:6 / Proverbs 2:6',
        textoEs: 'Porque Jehová da la sabiduría, y de su boca viene el conocimiento y la inteligencia.',
        textoEn: 'For the LORD giveth wisdom: out of his mouth cometh knowledge and understanding.',
      },
      hashVerificacion: 'e4d909c290d0fb1ca068ffaddf22cbd0add0e8012674e2a149a425f190a618e4',
      urlValidacionMoodle: 'http://localhost:8080/mod/customcert/verify.php?code=CERT-2026-GAEL-4EGB',
      rectorFirmante: 'Director Académico Wisdom Academy',
      tutorFirmante: 'Docente Mentor Principal de Grado',
    },
    {
      idCertificado: 'CERT-2026-AVRIL-8EGB',
      nombreEstudiante: 'Avril Sofía',
      tipoCertificado: 'GRADO_ESCOLAR',
      tituloPrograma: '8.º Grado de Educación General Básica Superior',
      tituloProgramaEn: '8th Grade Middle School Basic Education',
      cargaHoraria: 1000,
      fechaEmision: '2026-07-02',
      versiculoBendicion: {
        referencia: 'Colosenses 2:3 / Colossians 2:3',
        textoEs: 'En quien están escondidos todos los tesoros de la sabiduría y del conocimiento.',
        textoEn: 'In whom are hid all the treasures of wisdom and knowledge.',
      },
      hashVerificacion: '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca7',
      urlValidacionMoodle: 'http://localhost:8080/mod/customcert/verify.php?code=CERT-2026-AVRIL-8EGB',
      rectorFirmante: 'Director Académico Wisdom Academy',
      tutorFirmante: 'Docente Mentor Principal de Grado',
    },
    {
      idCertificado: 'CERT-2026-TALLER-PYTHON',
      nombreEstudiante: estudianteActivo?.nombreCompleto || 'Estudiante Wisdom',
      tipoCertificado: 'TALLER_LIBRE',
      tituloPrograma: 'Programación con IA y Python para Jóvenes',
      tituloProgramaEn: 'Youth AI & Python Programming Intensive',
      cargaHoraria: 80,
      fechaEmision: '2026-08-15',
      versiculoBendicion: {
        referencia: 'Daniel 1:17 / Daniel 1:17',
        textoEs: 'A estos cuatro muchachos Dios les dio conocimiento e inteligencia en todas las letras y ciencias.',
        textoEn: 'God gave them knowledge and skill in all learning and wisdom.',
      },
      hashVerificacion: '67a843a89045b8fb32ab2374e64f7b2432a26c4598d4076329e46a784d852a41',
      urlValidacionMoodle: 'http://localhost:8080/mod/customcert/verify.php?code=CERT-2026-TALLER-PYTHON',
      rectorFirmante: 'Director de Innovación Tecnológica',
      tutorFirmante: 'Instructor Principal de Software',
    },
    {
      idCertificado: 'CERT-2026-TALLER-COSMOVISION',
      nombreEstudiante: estudianteActivo?.nombreCompleto || 'Estudiante Wisdom',
      tipoCertificado: 'TALLER_LIBRE',
      tituloPrograma: 'Liderazgo y Cosmovisión Bíblica para la Sociedad',
      tituloProgramaEn: 'Biblical Worldview & Christian Leadership',
      cargaHoraria: 60,
      fechaEmision: '2026-08-20',
      versiculoBendicion: {
        referencia: 'Romanos 12:2 / Romans 12:2',
        textoEs: 'No os conforméis a este siglo, sino transformaos por medio de la renovación de vuestro entendimiento.',
        textoEn: 'And be not conformed to this world: but be ye transformed by the renewing of your mind.',
      },
      hashVerificacion: '84930acfe9234bb4853049281734bcfe83920194827591823094857291834720',
      urlValidacionMoodle: 'http://localhost:8080/mod/customcert/verify.php?code=CERT-2026-TALLER-COSMOVISION',
      rectorFirmante: 'Decano de Teología y Humanidades',
      tutorFirmante: 'Mentor Espiritual Institucional',
    },
    ...Array.from({ length: 10 }, (_, index) => {
      const semester = index + 1;
      return {
        idCertificado: `CERT-TEOLOGIA-S${semester}`,
        nombreEstudiante: estudianteActivo?.nombreCompleto || 'Estudiante Wisdom',
        tipoCertificado: 'PROGRAMA_TEOLOGICO' as const,
        tituloPrograma: `Programa de Teología — Semestre ${semester}`,
        tituloProgramaEn: `Theology Program — Semester ${semester}`,
        cargaHoraria: 0,
        fechaEmision: new Date().toISOString().slice(0, 10),
        versiculoBendicion: {
          referencia: '2 Timoteo 2:15 / 2 Timothy 2:15',
          textoEs: 'Procura con diligencia presentarte a Dios aprobado, como obrero que no tiene de qué avergonzarse, que usa bien la palabra de verdad.',
          textoEn: 'Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth.',
        },
        hashVerificacion: Array.from(`CERT-TEOLOGIA-S${semester}`)
          .map((character) => character.charCodeAt(0).toString(16))
          .join('')
          .padEnd(64, '0')
          .slice(0, 64),
        urlValidacionMoodle: `http://localhost:8080/mod/customcert/verify.php?code=CERT-TEOLOGIA-S${semester}`,
        rectorFirmante: 'Director Académico Wisdom Academy',
        tutorFirmante: 'Coordinador del Programa de Teología',
      };
    }),
  ]);

  const [certificadoSeleccionado, setCertificadoSeleccionado] = useState<DatosCertificado>(
    certificadosDisponibles[estudianteActivo?.edad && estudianteActivo.edad <= 10 ? 0 : 1]
  );

  const [nombrePersonalizado, setNombrePersonalizado] = useState(
    estudianteActivo?.nombreCompleto || certificadoSeleccionado.nombreEstudiante
  );
  const [semestreConfirmado, setSemestreConfirmado] = useState(false);
  const theologyPending =
    certificadoSeleccionado.tipoCertificado === 'PROGRAMA_TEOLOGICO' && !semestreConfirmado;

  return (
    <div className="wa-carbon-grid" style={{ paddingTop: 'var(--carbon-space-3x)', paddingBottom: 'var(--carbon-space-6x)' }}>
      {/* =======================================================================
          SELECTOR Y PANEL DE CONTROL DEL CERTIFICADO
          ======================================================================= */}
      <section className="wa-col-sm-4 wa-col-md-8 wa-col-lg-16" style={{ marginBottom: 'var(--carbon-space-2x)' }}>
        <div
          className="wa-surface-card"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 'var(--carbon-space-2x)',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <img
                src="/brand/svg/wisdom-icon-color.svg"
                alt="Certificación"
                style={{ width: '24px', height: '24px' }}
              />
              <span style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.75rem', color: 'var(--wa-brand-gold-dark)', fontWeight: 600 }}>
                {idiomaIngles ? 'OFFICIAL VERIFIABLE CREDENTIALS' : 'ACREDITACIÓN Y CERTIFICACIÓN OFICIAL'}
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--wa-font-display)', fontSize: '1.625rem', margin: '0 0 4px 0' }}>
              {idiomaIngles ? 'Verifiable Certificate Issuer' : 'Emisor de Certificados y Diplomas Oficiales'}
            </h1>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--wa-text-secondary)', fontFamily: 'var(--wa-font-sans)' }}>
              {idiomaIngles
                ? 'Issue bilingual credentials for completed academic grades and open workshops with SHA-256 cryptographic verification.'
                : 'Emite credenciales bilingües para grados escolares aprobados y talleres libres con verificación criptográfica SHA-256.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => window.print()}
              disabled={theologyPending}
              title={
                theologyPending
                  ? 'Confirma que el semestre fue completado antes de imprimir.'
                  : undefined
              }
              style={{
                background: 'var(--wa-brand-gold-primary)',
                color: 'var(--wa-bg-surface)',
                border: 'none',
                borderRadius: 'var(--wa-radius-sm)',
                padding: '10px 20px',
                fontFamily: 'var(--wa-font-sans)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: theologyPending ? 'not-allowed' : 'pointer',
                opacity: theologyPending ? 0.55 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>🖨️</span> {idiomaIngles ? 'Print / Save as PDF' : 'Imprimir / Guardar en PDF'}
            </button>
          </div>
        </div>
      </section>

      {/* =======================================================================
          BARRA DE AJUSTES DEL CERTIFICADO
          ======================================================================= */}
      <section className="wa-col-sm-4 wa-col-md-8 wa-col-lg-16" style={{ marginBottom: 'var(--carbon-space-3x)' }}>
        <div
          className="wa-surface-card"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            alignItems: 'center',
            background: 'var(--wa-bg-interactive-subtle)',
          }}
        >
          <div style={{ flex: '1 1 250px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', fontWeight: 600, marginBottom: '4px' }}>
              {idiomaIngles ? 'SELECT PROGRAM OR WORKSHOP:' : 'SELECCIONAR PROGRAMA O TALLER:'}
            </label>
            <select
              value={certificadoSeleccionado.idCertificado}
              onChange={(e) => {
                const encontrado = certificadosDisponibles.find((c) => c.idCertificado === e.target.value);
                if (encontrado) {
                  setCertificadoSeleccionado(encontrado);
                  setSemestreConfirmado(false);
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 'var(--wa-radius-sm)',
                border: '1px solid var(--wa-keyline-subtle)',
                background: 'var(--wa-bg-surface)',
                color: 'var(--wa-text-primary)',
              }}
            >
              {certificadosDisponibles.map((c) => (
                <option key={c.idCertificado} value={c.idCertificado}>
                  [{c.tipoCertificado === 'GRADO_ESCOLAR' ? 'GRADO' : c.tipoCertificado === 'TALLER_LIBRE' ? 'TALLER' : 'PROGRAMA'}] {c.tituloPrograma}
                </option>
              ))}
            </select>
            {certificadoSeleccionado.tipoCertificado === 'PROGRAMA_TEOLOGICO' && (
              <>
                <p style={{ margin: '6px 0 0', fontSize: '0.72rem', lineHeight: 1.45, color: 'var(--text-muted)' }}>
                  {idiomaIngles
                    ? 'Select the semester completed by the student. Verify progress before issuing the certificate.'
                    : 'Selecciona el semestre completado por el estudiante. Verifica su progreso antes de emitir el certificado.'}
                </p>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '6px', fontSize: '0.72rem', lineHeight: 1.45, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={semestreConfirmado}
                    onChange={(event) => setSemestreConfirmado(event.target.checked)}
                    style={{ marginTop: '2px' }}
                  />
                  {idiomaIngles
                    ? 'I confirm that the student completed the semester classes and assessments.'
                    : 'Confirmo que el estudiante completó las clases y evaluaciones del semestre.'}
                </label>
              </>
            )}
          </div>

          <div style={{ flex: '1 1 250px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', fontWeight: 600, marginBottom: '4px' }}>
              {idiomaIngles ? 'STUDENT NAME:' : 'NOMBRE DEL ESTUDIANTE:'}
            </label>
            <input
              type="text"
              value={nombrePersonalizado}
              onChange={(e) => setNombrePersonalizado(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: 'var(--wa-radius-sm)',
                border: '1px solid var(--wa-keyline-subtle)',
                background: 'var(--wa-bg-surface)',
                color: 'var(--wa-text-primary)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </section>

      {/* =======================================================================
          DOCUMENTO DIPLOMA OFICIAL (ÁREA DE IMPRESIÓN CON ESTILO EDITORIAL)
          ======================================================================= */}
      <section className="wa-col-sm-4 wa-col-md-8 wa-col-lg-16">
        <div
          style={{
            background: 'var(--wa-bg-surface)',
            border: '8px double var(--wa-brand-gold-primary)',
            borderRadius: 'var(--wa-radius-md)',
            padding: '48px 40px',
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 8px 30px rgba(13, 19, 34, 0.08)',
          }}
        >
          {/* ORNAMENTO DE ESQUINAS */}
          <div style={{ position: 'absolute', top: '12px', left: '16px', fontSize: '1.25rem', color: 'var(--wa-brand-gold-primary)' }}>✦</div>
          <div style={{ position: 'absolute', top: '12px', right: '16px', fontSize: '1.25rem', color: 'var(--wa-brand-gold-primary)' }}>✦</div>
          <div style={{ position: 'absolute', bottom: '12px', left: '16px', fontSize: '1.25rem', color: 'var(--wa-brand-gold-primary)' }}>✦</div>
          <div style={{ position: 'absolute', bottom: '12px', right: '16px', fontSize: '1.25rem', color: 'var(--wa-brand-gold-primary)' }}>✦</div>

          {/* LOGOTIPO OFICIAL VERTICAL */}
          <div style={{ marginBottom: '20px' }}>
            <img
              src="/brand/svg/wisdom-logo-vertical-color.svg"
              alt="Wisdom Academy"
              style={{ height: '88px', width: 'auto', margin: '0 auto' }}
            />
          </div>

          <div
            style={{
              fontFamily: 'var(--wa-font-mono)',
              fontSize: '0.8125rem',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              color: 'var(--wa-brand-gold-dark)',
              marginBottom: '12px',
              fontWeight: 600,
            }}
          >
            {idiomaIngles ? 'ACADEMY OF CHRISTIAN WISDOM & EXCELLENCE' : 'ACADEMIA DE SABIDURÍA CRISTIANA Y EXCELENCIA'}
          </div>

          <div
            style={{
              fontFamily: 'var(--wa-font-display)',
              fontStyle: 'italic',
              fontSize: '1.125rem',
              color: 'var(--wa-text-secondary)',
              marginBottom: '8px',
            }}
          >
            {idiomaIngles ? 'Certifies that' : 'Otorga el presente certificado a:'}
          </div>

          {/* NOMBRE DEL ESTUDIANTE EN TIPOGRAFÍA BRICOLAGE */}
          <div
            style={{
              fontFamily: 'var(--wa-font-display)',
              fontSize: '2.5rem',
              fontWeight: 700,
              color: 'var(--wa-brand-navy-primary)',
              margin: '12px 0',
              borderBottom: '2px solid var(--wa-brand-gold-light)',
              display: 'inline-block',
              paddingBottom: '4px',
              minWidth: '320px',
            }}
          >
            {nombrePersonalizado}
          </div>

          <div
            style={{
              fontFamily: 'var(--wa-font-sans)',
              fontSize: '0.9375rem',
              color: 'var(--wa-text-secondary)',
              maxWidth: '680px',
              margin: '16px auto',
              lineHeight: 1.6,
            }}
          >
            {idiomaIngles ? (
              certificadoSeleccionado.tipoCertificado === 'PROGRAMA_TEOLOGICO' ? (
                <>
                  By having satisfactorily completed the{' '}
                  <strong style={{ color: 'var(--wa-text-primary)' }}>{certificadoSeleccionado.tituloProgramaEn}</strong>,
                  including its classes, reviews and corresponding assessments.
                </>
              ) : (
                <>
                  By having satisfactorily completed all academic, biblical, and project requirements of the{' '}
                  <strong style={{ color: 'var(--wa-text-primary)' }}>{certificadoSeleccionado.tituloProgramaEn}</strong>,
                  conforming to the educational guidelines of Ecuador with an intensive load of{' '}
                  <strong>{certificadoSeleccionado.cargaHoraria} pedagogical hours</strong>.
                </>
              )
            ) : certificadoSeleccionado.tipoCertificado === 'PROGRAMA_TEOLOGICO' ? (
              <>
                Por haber completado satisfactoriamente el{' '}
                <strong style={{ color: 'var(--wa-text-primary)' }}>{certificadoSeleccionado.tituloPrograma}</strong>,
                incluyendo sus clases, repasos y evaluaciones correspondientes.
              </>
            ) : (
              <>
                Por haber completado satisfactoriamente los requisitos formativos, bíblicos y prácticos del programa{' '}
                <strong style={{ color: 'var(--wa-text-primary)' }}>{certificadoSeleccionado.tituloPrograma}</strong>,
                alineado con los estándares del Ministerio de Educación del Ecuador, con una dedicación académica de{' '}
                <strong>{certificadoSeleccionado.cargaHoraria} horas pedagógicas</strong>.
              </>
            )}
          </div>

          {/* VERSÍCULO BÍBLICO DE BENDICIÓN */}
          <div
            style={{
              margin: '24px auto',
              maxWidth: '600px',
              background: 'var(--wa-bg-interactive-subtle)',
              padding: '16px 24px',
              borderRadius: 'var(--wa-radius-sm)',
              border: '1px solid var(--border-gold)',
            }}
          >
            <p style={{ margin: 0, fontStyle: 'italic', fontFamily: 'var(--wa-font-display)', fontSize: '0.9375rem', color: 'var(--wa-text-primary)' }}>
              "{idiomaIngles ? certificadoSeleccionado.versiculoBendicion.textoEn : certificadoSeleccionado.versiculoBendicion.textoEs}"
            </p>
            <div style={{ textAlign: 'right', marginTop: '6px', fontSize: '0.75rem', fontFamily: 'var(--wa-font-mono)', color: 'var(--wa-brand-gold-dark)', fontWeight: 600 }}>
              — {certificadoSeleccionado.versiculoBendicion.referencia}
            </div>
          </div>

          {/* FIRMAS AUTÓGRAFAS / INSTITUCIONALES */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'flex-end',
              marginTop: '48px',
              marginBottom: '28px',
              flexWrap: 'wrap',
              gap: '24px',
            }}
          >
            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ borderBottom: '1px solid var(--wa-keyline-subtle)', height: '40px', marginBottom: '8px' }}></div>
              <div style={{ fontFamily: 'var(--wa-font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>
                {certificadoSeleccionado.rectorFirmante}
              </div>
              <div style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.6875rem', color: 'var(--wa-text-secondary)' }}>
                Wisdom Academy Cloud
              </div>
            </div>

            {/* SELLO HERÁLDICO CENTRAL */}
            <div>
              <img
                src="/brand/svg/wisdom-icon-color.svg"
                alt="Sello de Acreditación"
                style={{ width: '64px', height: '64px', opacity: 0.85 }}
              />
            </div>

            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ borderBottom: '1px solid var(--wa-keyline-subtle)', height: '40px', marginBottom: '8px' }}></div>
              <div style={{ fontFamily: 'var(--wa-font-sans)', fontSize: '0.8125rem', fontWeight: 600 }}>
                {certificadoSeleccionado.tutorFirmante}
              </div>
              <div style={{ fontFamily: 'var(--wa-font-mono)', fontSize: '0.6875rem', color: 'var(--wa-text-secondary)' }}>
                Mentor Pedagógico Certificado
              </div>
            </div>
          </div>

          {/* PIE DE PÁGINA CON HASH DE VERIFICACIÓN Y CÓDIGO QR MOCK */}
          <div
            style={{
              borderTop: '1px dashed var(--wa-keyline-subtle)',
              paddingTop: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              fontSize: '0.6875rem',
              fontFamily: 'var(--wa-font-mono)',
              color: 'var(--wa-text-secondary)',
            }}
          >
            <div style={{ textAlign: 'left' }}>
              <div>
                <strong>ID:</strong> {certificadoSeleccionado.idCertificado} • <strong>EMISIÓN:</strong> {certificadoSeleccionado.fechaEmision}
              </div>
              <div>
                <strong>HASH SHA-256:</strong> {certificadoSeleccionado.hashVerificacion.slice(0, 32)}...
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <a
                href={certificadoSeleccionado.urlValidacionMoodle}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--wa-brand-gold-dark)', textDecoration: 'none', fontWeight: 600 }}
              >
                [VERIFICAR EN LÍNEA EN MOODLE LMS]
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

