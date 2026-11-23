'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PazEnLaMesaLogo } from '@/components/paz/PazEnLaMesaLogo';
import { PazLaunchBanner } from '@/components/paz/PazLaunchBanner';
import { PazCountdown } from '@/components/paz/PazCountdown';
import { PazLeadForm } from '@/components/paz/PazLeadForm';
import { PazPastorsPortrait } from '@/components/paz/PazPastorsPortrait';
import { PazTrailerPlayer } from '@/components/paz/PazTrailerPlayer';
import { PazClassesShowcase } from '@/components/paz/PazClassesShowcase';
import { PazUnifiedEnrollment } from '@/components/paz/PazUnifiedEnrollment';
import {
  PAZ_BRAND,
  PAZ_CHALLENGE_DAYS,
  PAZ_DATES,
  PAZ_FAQ,
  PAZ_GLOBAL_RESOURCES,
  PAZ_LIVE_EVENTS,
  PAZ_MOVEMENTS,
  PAZ_PRICING,
  PAZ_SABBATH_REVIEW,
} from '@/lib/paz-en-la-mesa/content';
import {
  buildOfficialWhatsappChatUrl,
  formatPazUsd,
  pazNextMilestone,
  pazPhaseAt,
  pazPublicConfig,
} from '@/lib/paz-en-la-mesa/config';
import { pazBankDetails, pazPayphoneUrl, pazWhatsappUrl } from '@/lib/paz-en-la-mesa/server';

function ResourceIcon({ type }: { type: string }) {
  const name: 'file-text' | 'users' | 'award' | 'video' =
    type === 'pdf' ? 'file-text' : type === 'live' ? 'users' : type === 'challenge' ? 'award' : 'video';
  return <WisdomIcon name={name} size={18} />;
}

export function PazEnLaMesaLanding() {
  const now = new Date();
  const phase = pazPhaseAt(now);
  const milestone = pazNextMilestone(now);
  const currentPrice =
    phase === 'official' || phase === 'closed'
      ? PAZ_PRICING.officialCents
      : PAZ_PRICING.presaleCents;
  const bank = pazBankDetails();
  const payphoneUrl = pazPayphoneUrl() || pazPublicConfig.payphoneUrl;
  const whatsappUrl = pazPublicConfig.whatsappUrl || buildOfficialWhatsappChatUrl();

  const [selectedPlan, setSelectedPlan] = useState<'presale' | 'official' | 'scholarship'>('presale');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const planParam = urlParams.get('plan');
      if (planParam === 'official' || planParam === 'scholarship' || planParam === 'presale') {
        setSelectedPlan(planParam);
      }
    }
  }, []);

  const phaseLabel =
    phase === 'anticipation'
      ? 'Preventa abre el 3 de diciembre · 20:00'
      : phase === 'presale'
        ? 'Preventa Madrugador activa'
        : phase === 'official'
          ? 'Precio oficial activo'
          : 'Inscripciones cerradas';

  const courseJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: PAZ_BRAND.title,
    description: PAZ_BRAND.description,
    image: PAZ_BRAND.ogImage,
    provider: {
      '@type': 'Organization',
      name: 'Wisdom Academy',
      sameAs: 'https://wisdomacademy.alsiztech.com/',
    },
    offers: [
      {
        '@type': 'Offer',
        name: PAZ_PRICING.presaleLabel,
        price: (PAZ_PRICING.presaleCents / 100).toFixed(2),
        priceCurrency: PAZ_PRICING.currency,
        availability: 'https://schema.org/PreOrder',
        validFrom: PAZ_DATES.presaleStart,
      },
      {
        '@type': 'Offer',
        name: PAZ_PRICING.officialLabel,
        price: (PAZ_PRICING.officialCents / 100).toFixed(2),
        priceCurrency: PAZ_PRICING.currency,
        availability: 'https://schema.org/InStock',
        validFrom: PAZ_DATES.officialStarts,
      },
    ],
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      startDate: PAZ_DATES.launch,
      endDate: PAZ_DATES.enrollmentCloses,
    },
  };

  const scrollToEnrollment = (planToSelect?: 'presale' | 'official' | 'scholarship') => {
    if (planToSelect) setSelectedPlan(planToSelect);
    const element = document.getElementById('inscripcion');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="paz-world paz-landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <PazLaunchBanner now={now} />
      <PublicHeader />

      {/* HERO SECTION */}
      <section className="paz-hero" aria-labelledby="paz-title">
        <div className="paz-container paz-hero-grid">
          <div>
            <span className="paz-eyebrow">
              <WisdomIcon name="sparkles" size={13} /> {PAZ_BRAND.eyebrow}
            </span>
            <h1 className="paz-title" id="paz-title">
              Paz en la mesa,<br />
              <span className="paz-title-soft">Orden en el bolsillo</span><br />
              <em>y fuego en el corazón.</em>
            </h1>
            <p className="paz-subtitle">{PAZ_BRAND.subtitle}</p>
            <p className="paz-subtitle" style={{ marginTop: '0.55rem' }}>
              {PAZ_BRAND.promise}
            </p>

            <div className="paz-actions">
              <a
                href={pazPublicConfig.whatsappGroupUrl || buildOfficialWhatsappChatUrl('Hola Wisdom Academy, deseo más información sobre el taller Paz en la mesa.')}
                target="_blank"
                rel="noreferrer"
                className="paz-btn paz-btn--olive"
                data-testid="paz-hero-whatsapp"
              >
                <WisdomIcon name="users" size={16} /> Comunidad de WhatsApp
              </a>
              <button
                type="button"
                onClick={() => scrollToEnrollment('presale')}
                className="paz-btn paz-btn--primary"
              >
                <WisdomIcon name="credit-card" size={16} /> Reservar mi lugar
              </button>
              <a href="#clases" className="paz-btn paz-btn--ghost">
                <WisdomIcon name="book" size={16} /> Ver el temario
              </a>
            </div>

            <div className="paz-price-strip">
              <strong>{formatPazUsd(currentPrice)}</strong>
              <span>por hogar</span>
              {phase !== 'official' && phase !== 'closed' ? (
                <>
                  <span className="paz-price-badge">{PAZ_PRICING.presaleLabel}</span>
                  <span className="paz-price-old">{formatPazUsd(PAZ_PRICING.officialCents)}</span>
                </>
              ) : (
                <span className="paz-price-badge">{PAZ_PRICING.officialLabel}</span>
              )}
              <span>{phaseLabel}</span>
            </div>

            <PazCountdown targetIso={milestone.targetIso} label={milestone.label} />

            <div className="paz-hero-badges">
              <span className="paz-chip">
                <WisdomIcon name="video" size={13} /> 4 clases magistrales
              </span>
              <span className="paz-chip">
                <WisdomIcon name="file-text" size={13} /> Cuaderno de 24 páginas
              </span>
              <span className="paz-chip">
                <WisdomIcon name="award" size={13} /> Reto de 7 días
              </span>
              <span className="paz-chip">
                <WisdomIcon name="users" size={13} /> Sesión en vivo · 22 dic
              </span>
            </div>
          </div>

          <PazPastorsPortrait priority />
        </div>
      </section>

      {/* SECCIÓN DEL TRÁILER OFICIAL */}
      <section className="paz-section" style={{ paddingTop: '1rem', paddingBottom: '3rem' }}>
        <div className="paz-container">
          <div className="paz-section-head" style={{ marginBottom: '1.75rem' }}>
            <span className="paz-kicker">
              <WisdomIcon name="video" size={13} /> Tráiler del taller
            </span>
            <h2 className="paz-h2">
              Conoce la propuesta de <em>La Mesa Real</em>
            </h2>
            <p className="paz-lead">
              Reproduce el video oficial de presentación y descubre el camino pedagógico y espiritual que recorreremos juntos.
            </p>
          </div>
          <PazTrailerPlayer />
        </div>
      </section>

      {/* SECCIÓN: 4 MOVIMIENTOS */}
      <section className="paz-section" aria-labelledby="paz-movements-title">
        <div className="paz-container">
          <div className="paz-section-head">
            <span className="paz-kicker">
              <WisdomIcon name="home" size={13} /> El recorrido en 4 movimientos
            </span>
            <h2 className="paz-h2" id="paz-movements-title">
              Una mesa, cuatro decisiones, <em>un año nuevo</em>
            </h2>
            <p className="paz-lead">
              Cada clase abre una dimensión distinta del hogar. Juntas forman un camino
              completo: reconciliación, orden, escucha y fuego.
            </p>
          </div>
          <div className="paz-movements">
            {PAZ_MOVEMENTS.map((movement) => (
              <article
                className="paz-movement"
                key={movement.number}
                style={{ ['--movement-accent' as string]: movement.accent }}
              >
                <span>{movement.number}</span>
                <strong>{movement.title}</strong>
                <p>{movement.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN: LAS CUATRO CLASES */}
      <section className="paz-section paz-section--paper" id="clases" aria-labelledby="paz-classes-title">
        <div className="paz-container">
          <div className="paz-section-head">
            <span className="paz-kicker">
              <WisdomIcon name="book" size={13} /> Programa pedagógico
            </span>
            <h2 className="paz-h2" id="paz-classes-title">
              Cuatro clases magistrales, <em>cuatro herramientas prácticas</em>
            </h2>
            <p className="paz-lead">
              Cada clase dura entre 35 y 40 minutos y se organiza en cuatro bloques: principio eterno, mesa real, herramienta en mano y aterrizaje con oración guiada.
            </p>
          </div>

          <PazClassesShowcase />
        </div>
      </section>

      {/* SECCIÓN: RECURSOS INCLUIDOS Y CUADERNO DE TRABAJO */}
      <section className="paz-section" aria-labelledby="paz-resources-title">
        <div className="paz-container">
          <div className="paz-section-head">
            <span className="paz-kicker">
              <WisdomIcon name="download" size={13} /> Recursos incluidos
            </span>
            <h2 className="paz-h2" id="paz-resources-title">
              Todo lo que recibes <em>en tu mesa</em>
            </h2>
            <p className="paz-lead">
              El taller no termina en el video: se completa con el cuaderno de 24 páginas, la sesión en vivo y el reto diario que lleva la enseñanza a la práctica.
            </p>
          </div>
          <div className="paz-resources">
            {PAZ_GLOBAL_RESOURCES.map((resource) => (
              <article className="paz-resource" key={resource.id}>
                <div className="paz-resource-top">
                  <span className="paz-resource-icon">
                    <ResourceIcon type={resource.type} />
                  </span>
                  <span className="paz-resource-badge">{resource.badge}</span>
                </div>
                <h3>{resource.title}</h3>
                <p>{resource.description}</p>
                <small>{resource.meta}</small>
                {resource.id === 'cuaderno' && pazPublicConfig.notebookUrl ? (
                  <a
                    className="paz-btn paz-btn--ghost paz-btn--small"
                    href={pazPublicConfig.notebookUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <WisdomIcon name="download" size={15} /> Descargar cuaderno
                  </a>
                ) : null}
                {resource.id === 'bienvenida' && pazPublicConfig.welcomeVideoUrl ? (
                  <a
                    className="paz-btn paz-btn--ghost paz-btn--small"
                    href={pazPublicConfig.welcomeVideoUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <WisdomIcon name="play" size={15} /> Ver bienvenida
                  </a>
                ) : null}
                {resource.id === 'sesion-vivo' && pazPublicConfig.studentLiveUrl ? (
                  <a
                    className="paz-btn paz-btn--ghost paz-btn--small"
                    href={pazPublicConfig.studentLiveUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <WisdomIcon name="users" size={15} /> Entrar a la sala
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN: RETO DE 7 DÍAS */}
      <section
        className="paz-section paz-section--olive"
        id="reto"
        aria-labelledby="paz-challenge-title"
      >
        <div className="paz-container paz-challenge">
          <div className="paz-challenge-copy">
            <span className="paz-kicker">
              <WisdomIcon name="award" size={13} /> Reto de 7 días
            </span>
            <h2 className="paz-h2" id="paz-challenge-title">
              15 minutos diarios. <em>Siete días de altar.</em>
            </h2>
            <p className="paz-lead" style={{ marginLeft: 0 }}>
              Del 23 al 30 de diciembre. Cada día incluye un pasaje, un enfoque y una oración
              breve. Si el día se complica, la versión de emergencia de 5 minutos mantiene la
              racha. La consistencia vence a la intensidad.
            </p>
            <div className="paz-actions">
              <Link href="/cursos/paz-en-la-mesa/reto" className="paz-btn paz-btn--gold">
                <WisdomIcon name="award" size={16} /> Abrir mi checklist
              </Link>
              <button
                type="button"
                onClick={() => scrollToEnrollment('presale')}
                className="paz-btn paz-btn--ghost"
                style={{ color: '#faf8f5', borderColor: 'rgba(250,248,245,.35)' }}
              >
                <WisdomIcon name="calendar" size={16} /> Inscribirme al taller
              </button>
            </div>
          </div>
          <div className="paz-challenge-list">
            {PAZ_CHALLENGE_DAYS.map((day) => (
              <div className="paz-challenge-day" key={day.day}>
                <span>Día {day.day}</span>
                <strong>{day.title}</strong>
                <small>{day.passage}</small>
              </div>
            ))}
            <div className="paz-challenge-day" style={{ gridColumn: '1 / -1' }}>
              <span>Revisión final · 30 de diciembre</span>
              <strong>{PAZ_SABBATH_REVIEW.title}</strong>
              <small>
                {PAZ_SABBATH_REVIEW.passage} · Descanso, gratitud y horario sostenible para el 2027
              </small>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN: TARIFAS Y MODALIDADES */}
      <section className="paz-section paz-section--paper" id="precios" aria-labelledby="paz-pricing-title">
        <div className="paz-container">
          <div className="paz-section-head">
            <span className="paz-kicker">
              <WisdomIcon name="receipt" size={13} /> Tarifas transparentes
            </span>
            <h2 className="paz-h2" id="paz-pricing-title">
              Un precio por hogar, <em>sin sorpresas</em>
            </h2>
            <p className="paz-lead">
              El acceso es familiar: una sola inscripción reúne a todos los miembros de la casa.
              Elige preventa, precio oficial o la opción solidaria Beca un Hogar.
            </p>
          </div>
          <div className="paz-pricing">
            <article className="paz-price-card paz-price-card--featured">
              <span className="paz-price-flag">Del 3 al 8 de diciembre</span>
              <h3>{PAZ_PRICING.presaleLabel}</h3>
              <div className="paz-price-amount">
                <strong>{formatPazUsd(PAZ_PRICING.presaleCents)}</strong>
                <span>{PAZ_PRICING.unit}</span>
              </div>
              <p>
                Confirmación inmediata, video de bienvenida y entrada a la comunidad. Las
                clases y el cuaderno se desbloquean el 8 de diciembre.
              </p>
              <ul>
                {PAZ_PRICING.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => scrollToEnrollment('presale')}
                className="paz-btn paz-btn--primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Reservar en preventa
              </button>
            </article>

            <article className="paz-price-card">
              <span className="paz-price-flag">Del 9 al 20 de diciembre</span>
              <h3>{PAZ_PRICING.officialLabel}</h3>
              <div className="paz-price-amount">
                <strong>{formatPazUsd(PAZ_PRICING.officialCents)}</strong>
                <span>{PAZ_PRICING.unit}</span>
              </div>
              <p>
                Acceso completo al taller, cuaderno PDF, sesión en vivo y reto de 7 días.
                Inscripciones hasta el 20 de diciembre a las 23:59.
              </p>
              <ul>
                {PAZ_PRICING.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => scrollToEnrollment('official')}
                className="paz-btn paz-btn--olive"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Inscribirme al precio oficial
              </button>
            </article>

            <article className="paz-price-card paz-price-card--solidarity">
              <span className="paz-price-flag">Aporte solidario</span>
              <h3>{PAZ_PRICING.scholarshipLabel}</h3>
              <div className="paz-price-amount">
                <strong>{formatPazUsd(PAZ_PRICING.scholarshipCents)}</strong>
                <span>por matrimonio</span>
              </div>
              <p>{PAZ_PRICING.scholarshipDescription}</p>
              <ul>
                <li>Tu aporte se registra por separado de tu propia inscripción.</li>
                <li>Fundación Casa Main asigna los cupos a matrimonios vulnerables.</li>
                <li>Recibirás confirmación y constancia del aporte solidario.</li>
              </ul>
              <button
                type="button"
                onClick={() => scrollToEnrollment('scholarship')}
                className="paz-btn paz-btn--gold"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <WisdomIcon name="award" size={16} /> Beca un Hogar
              </button>
            </article>
          </div>
        </div>
      </section>

      {/* SECCIÓN PRINCIPAL DE INSCRIPCIÓN Y PAGO UNIFICADO */}
      <section className="paz-section" id="inscripcion" aria-labelledby="paz-unified-title">
        <div className="paz-container paz-container--narrow">
          <PazUnifiedEnrollment
            initialPlan={selectedPlan}
            bank={bank}
          />
        </div>
      </section>

      {/* SECCIÓN: MÉTODOS DE PAGO Y TRANSPARENCIA */}
      <section className="paz-section paz-section--paper" id="pagos" aria-labelledby="paz-payments-title">
        <div className="paz-container">
          <div className="paz-section-head">
            <span className="paz-kicker">
              <WisdomIcon name="credit-card" size={13} /> Información de pagos
            </span>
            <h2 className="paz-h2" id="paz-payments-title">
              Dos formas seguras <em>de procesar tu inscripción</em>
            </h2>
            <p className="paz-lead">
              Puedes transferir directamente a la cuenta de Fundación Casa Main (0% comisión) o pagar en línea con tarjeta de crédito/débito a través de PayPhone.
            </p>
          </div>
          <div className="paz-payments">
            <article className="paz-payment">
              <h3>Transferencia o depósito bancario · 0% comisión</h3>
              <p>
                Beneficiario: <strong>{bank.beneficiary}</strong>. RUC: {bank.ruc}. Realiza la transferencia y envía tu comprobante con el código de inscripción generado arriba.
              </p>
              <dl>
                <div>
                  <dt>Banco</dt>
                  <dd>{bank.bankName}</dd>
                </div>
                <div>
                  <dt>Tipo de cuenta</dt>
                  <dd>{bank.accountType}</dd>
                </div>
                <div>
                  <dt>Número de cuenta</dt>
                  <dd>{bank.accountNumber}</dd>
                </div>
                <div>
                  <dt>Titular</dt>
                  <dd>{bank.accountHolder}</dd>
                </div>
                <div>
                  <dt>RUC</dt>
                  <dd>{bank.ruc}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => scrollToEnrollment('presale')}
                className="paz-btn paz-btn--olive paz-btn--small"
                style={{ marginTop: '0.75rem' }}
              >
                Generar código de transferencia
              </button>
            </article>

            <article className="paz-payment">
              <h3>Tarjeta con PayPhone (Ecuador e internacional)</h3>
              <p>
                Pago seguro en línea con tarjetas Visa, Mastercard, Diners, Discover o saldo PayPhone. Procesamiento verificado por PayPhone Ecuador.
              </p>
              <dl>
                <div>
                  <dt>Procesador</dt>
                  <dd>PayPhone (Ecuador)</dd>
                </div>
                <div>
                  <dt>Tarjetas admitidas</dt>
                  <dd>Crédito y Débito nacionales e internacionales</dd>
                </div>
                <div>
                  <dt>Confirmación</dt>
                  <dd>Inmediata y validada en plataforma</dd>
                </div>
                <div>
                  <dt>Soporte oficial</dt>
                  <dd>{pazPublicConfig.officialWhatsappPhone}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => scrollToEnrollment('presale')}
                className="paz-btn paz-btn--primary paz-btn--small"
                style={{ marginTop: '0.75rem' }}
              >
                Inscribirme con tarjeta PayPhone
              </button>
            </article>
          </div>
        </div>
      </section>

      {/* CALENDARIO OFICIAL */}
      <section className="paz-section" aria-labelledby="paz-lives-title">
        <div className="paz-container">
          <div className="paz-section-head">
            <span className="paz-kicker">
              <WisdomIcon name="calendar" size={13} /> Calendario oficial
            </span>
            <h2 className="paz-h2" id="paz-lives-title">
              Encuentros y fechas clave <em>del taller</em>
            </h2>
            <p className="paz-lead">
              Todos los En Vivos se transmiten a las 20:00 (hora de Ecuador / UTC-5). La comunidad de WhatsApp recibe los enlaces de acceso y recordatorios.
            </p>
          </div>
          <div className="paz-lives">
            {PAZ_LIVE_EVENTS.map((event) => (
              <article className="paz-live" key={event.id}>
                <small>{event.dateLabel}</small>
                <strong>{event.title}</strong>
                <p>{event.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN COMUNIDAD Y TEMARIO */}
      <section className="paz-section paz-section--paper" id="comunidad" aria-labelledby="paz-community-title">
        <div className="paz-container paz-challenge">
          <div className="paz-challenge-copy">
            <span className="paz-kicker">
              <WisdomIcon name="users" size={13} /> Atención y comunidad oficial
            </span>
            <h2 className="paz-h2" id="paz-community-title">
              Atención directa en <em>WhatsApp oficial</em>
            </h2>
            <p className="paz-lead" style={{ marginLeft: 0 }}>
              ¿Tienes preguntas sobre el taller, las formas de pago o las fechas? Escríbenos directamente al WhatsApp oficial: <strong>{pazPublicConfig.officialWhatsappPhone}</strong>.
            </p>
            <a
              href={buildOfficialWhatsappChatUrl(
                'Hola Wisdom Academy, deseo hacer una consulta sobre el taller Paz en la mesa, orden en el bolsillo y fuego en el corazón.'
              )}
              target="_blank"
              rel="noreferrer"
              className="paz-btn paz-btn--olive"
              style={{ marginTop: '0.75rem' }}
            >
              <WisdomIcon name="users" size={16} /> Chatear al WhatsApp (+593 99 875 5759)
            </a>
            <div className="paz-alert paz-alert--info" style={{ marginTop: '1rem' }}>
              <strong>Fechas clave:</strong> Preventa desde el 3 de diciembre (20:00), estreno y liberación de clases el 8 de diciembre, precio oficial del 9 al 20 de diciembre y sesión en vivo para alumnos el 22 de diciembre.
            </div>
          </div>
          <PazLeadForm id="paz-lead-form" source="landing" title="Quiero recibir el temario" />
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES (FAQ) */}
      <section className="paz-section" aria-labelledby="paz-faq-title">
        <div className="paz-container paz-container--narrow">
          <div className="paz-section-head">
            <span className="paz-kicker">
              <WisdomIcon name="mail" size={13} /> Preguntas frecuentes
            </span>
            <h2 className="paz-h2" id="paz-faq-title">
              Lo que necesitas saber <em>antes de inscribirte</em>
            </h2>
          </div>
          <div className="paz-faq">
            {PAZ_FAQ.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="paz-footer">
        <div className="paz-footer-inner">
          <PazEnLaMesaLogo variant="compact" theme="dark" className="paz-footer-logo" />
          <div>
            <strong>Wisdom Academy</strong> · Samuel y Gabby Palacio
            <br />
            Atención oficial WhatsApp: {pazPublicConfig.officialWhatsappPhone} · © {now.getFullYear()}
          </div>
        </div>
      </footer>
    </main>
  );
}

export default PazEnLaMesaLanding;
