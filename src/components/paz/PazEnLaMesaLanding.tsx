import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import { PazEnLaMesaLogo } from '@/components/paz/PazEnLaMesaLogo';
import { PazLaunchBanner } from '@/components/paz/PazLaunchBanner';
import { PazCountdown } from '@/components/paz/PazCountdown';
import { PazLeadForm } from '@/components/paz/PazLeadForm';
import { PazPastorsPortrait } from '@/components/paz/PazPastorsPortrait';
import {
  PAZ_BRAND,
  PAZ_CHALLENGE_DAYS,
  PAZ_CLASSES,
  PAZ_DATES,
  PAZ_FAQ,
  PAZ_GLOBAL_RESOURCES,
  PAZ_LIVE_EVENTS,
  PAZ_MOVEMENTS,
  PAZ_PRICING,
  PAZ_SABBATH_REVIEW,
} from '@/lib/paz-en-la-mesa/content';
import {
  formatPazUsd,
  pazNextMilestone,
  pazPhaseAt,
  pazPublicConfig,
} from '@/lib/paz-en-la-mesa/config';
import { pazBankDetails, pazPayphoneUrl, pazWhatsappUrl } from '@/lib/paz-en-la-mesa/server';

export const pazLandingMetadata: Metadata = {
  title: 'Paz en la mesa, Orden en el bolsillo y fuego en el corazón | Wisdom Academy',
  description:
    'Taller de fin de año con los Pastores Samuel y Gabby Palacio: 4 clases para sanar tu mesa, ordenar tu economía, oír a Dios y encender tu hogar. Preventa USD 27 por hogar.',
  openGraph: {
    title: 'Paz en la mesa, Orden en el bolsillo y fuego en el corazón',
    description:
      '4 clases, cuaderno de 24 páginas, sesión en vivo y reto de 7 días. Estreno el 8 de diciembre de 2026.',
    images: [{ url: PAZ_BRAND.ogImage }],
  },
};

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
  const whatsappUrl = pazWhatsappUrl() || pazPublicConfig.whatsappUrl;
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
      name: PAZ_BRAND.institution,
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

  return (
    <main className="paz-world paz-landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <PazLaunchBanner now={now} />
      <PublicHeader />

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
                href={whatsappUrl || '#comunidad'}
                {...(whatsappUrl ? { target: '_blank', rel: 'noreferrer' } : {})}
                className="paz-btn paz-btn--olive"
                data-testid="paz-hero-whatsapp"
              >
                <WisdomIcon name="users" size={16} /> Comunidad oficial de WhatsApp
              </a>
              <Link href="/paz-en-la-mesa/inscripcion" className="paz-btn paz-btn--primary">
                <WisdomIcon name="credit-card" size={16} /> Reservar mi lugar
              </Link>
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

      <section className="paz-section paz-section--paper" id="clases" aria-labelledby="paz-classes-title">
        <div className="paz-container">
          <div className="paz-section-head">
            <span className="paz-kicker">
              <WisdomIcon name="book" size={13} /> Las cuatro clases
            </span>
            <h2 className="paz-h2" id="paz-classes-title">
              Cuatro clases, <em>cuatro herramientas</em>
            </h2>
            <p className="paz-lead">
              Cada clase dura entre 35 y 40 minutos y se estructura en cuatro bloques:
              principio eterno, mesa real, herramienta en mano y aterrizaje Q&A con oración.
              Abre cada clase para ver su contenido completo.
            </p>
          </div>

          <div className="paz-classes">
            {PAZ_CLASSES.map((item) => (
              <details
                className="paz-class"
                key={item.key}
                style={{
                  ['--class-accent' as string]: item.accent,
                  ['--class-soft' as string]: item.soft,
                }}
              >
                <summary>
                  <span className="paz-class-number">
                    <small>Clase</small>
                    <strong>{String(item.number).padStart(2, '0')}</strong>
                  </span>
                  <span className="paz-class-main">
                    <h3>
                      {item.title}: {item.headline}
                    </h3>
                    <p>{item.summary}</p>
                    <span className="paz-class-meta">
                      <span>
                        <WisdomIcon name="clock" size={12} /> {item.durationLabel}
                      </span>
                      <span>
                        <WisdomIcon name="user" size={12} /> {item.leader}
                      </span>
                      <span>
                        <WisdomIcon name="file-text" size={12} /> {item.pages}
                      </span>
                    </span>
                  </span>
                  <span className="paz-class-arrow" aria-hidden="true">
                    <WisdomIcon name="chevron-down" size={16} />
                  </span>
                </summary>
                <div className="paz-class-body">
                  <p className="paz-class-summary">{item.leaderDetail}</p>
                  <div className="paz-class-tool">
                    <WisdomIcon name="sparkles" size={15} />
                    <span>
                      <strong>Herramienta del cuaderno:</strong> {item.tool} · {item.toolPages}
                    </span>
                  </div>
                  <div className="paz-blocks">
                    {item.blocks.map((block) => (
                      <article className="paz-block" key={block.number}>
                        <div className="paz-block-head">
                          <strong>
                            Bloque {block.number} · {block.title}
                          </strong>
                          <span>{block.timeRange}</span>
                        </div>
                        <p>{block.summary}</p>
                        <div className="paz-scriptures">
                          {block.scriptures.map((scripture) => (
                            <span key={scripture}>{scripture}</span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="paz-scriptures" aria-label={`Pasajes de la clase ${item.number}`}>
                    {item.scriptures.map((scripture) => (
                      <span key={scripture}>{scripture}</span>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

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
              El taller no termina en el video: se completa con el cuaderno, la sesión en vivo
              y el reto que lleva la enseñanza a la práctica diaria.
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
              <a href="#inscripcion" className="paz-btn paz-btn--ghost" style={{ color: '#faf8f5', borderColor: 'rgba(250,248,245,.35)' }}>
                <WisdomIcon name="calendar" size={16} /> Ver fechas
              </a>
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
              El acceso es familiar: una inscripción reúne a todos los miembros de la casa.
              Elige preventa o precio oficial y paga por transferencia o tarjeta.
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
              <Link href="/paz-en-la-mesa/inscripcion?plan=presale" className="paz-btn paz-btn--primary">
                Reservar en preventa
              </Link>
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
              <Link href="/paz-en-la-mesa/inscripcion?plan=official" className="paz-btn paz-btn--olive">
                Inscribirme al precio oficial
              </Link>
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
              <Link href="/paz-en-la-mesa/inscripcion?plan=scholarship" className="paz-btn paz-btn--gold">
                <WisdomIcon name="award" size={16} /> Beca un Hogar
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="paz-section" id="pagos" aria-labelledby="paz-payments-title">
        <div className="paz-container">
          <div className="paz-section-head">
            <span className="paz-kicker">
              <WisdomIcon name="credit-card" size={13} /> Métodos de pago
            </span>
            <h2 className="paz-h2" id="paz-payments-title">
              Dos formas simples <em>de asegurar tu lugar</em>
            </h2>
            <p className="paz-lead">
              Puedes transferir a la cuenta de Fundación Casa Main o pagar con tarjeta
              mediante PayPhone. Cada pago se valida antes de activar el acceso.
            </p>
          </div>
          <div className="paz-payments">
            <article className="paz-payment">
              <h3>Transferencia o depósito · 0% comisión</h3>
              <p>
                Beneficiario: <strong>{bank.beneficiary}</strong>. RUC {bank.ruc}. Envía tu
                comprobante y el código de inscripción para validar el pago.
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
              {!bank.configured && (
                <div className="paz-payment-warning">
                  La cuenta bancaria definitiva se comparte al iniciar la preventa y en la
                  comunidad oficial. El RUC y el beneficiario ya son los datos oficiales.
                </div>
              )}
              <Link
                href="/paz-en-la-mesa/inscripcion?plan=presale&method=bank_transfer"
                className="paz-btn paz-btn--olive paz-btn--small"
                style={{ marginTop: '0.75rem' }}
              >
                Registrar mi transferencia
              </Link>
            </article>

            <article className="paz-payment">
              <h3>Tarjeta con PayPhone · 5% + IVA</h3>
              <p>
                Pago seguro con tarjeta mediante el enlace oficial de PayPhone. La comisión
                efectiva estimada es 5,75% y se informa antes de confirmar.
              </p>
              <dl>
                <div>
                  <dt>Procesador</dt>
                  <dd>PayPhone</dd>
                </div>
                <div>
                  <dt>Comisión</dt>
                  <dd>5% + IVA (5,75% efectivo)</dd>
                </div>
                <div>
                  <dt>Confirmación</dt>
                  <dd>Validación administrativa</dd>
                </div>
                <div>
                  <dt>Soporte</dt>
                  <dd>{bank.email}</dd>
                </div>
              </dl>
              {payphoneUrl ? (
                <a
                  href={payphoneUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="paz-btn paz-btn--primary paz-btn--small"
                  style={{ marginTop: '0.75rem' }}
                >
                  Pagar con tarjeta
                </a>
              ) : (
                <Link
                  href="/paz-en-la-mesa/inscripcion?plan=presale&method=payphone"
                  className="paz-btn paz-btn--primary paz-btn--small"
                  style={{ marginTop: '0.75rem' }}
                >
                  Solicitar enlace de PayPhone
                </Link>
              )}
            </article>
          </div>
        </div>
      </section>

      <section className="paz-section paz-section--paper" aria-labelledby="paz-lives-title">
        <div className="paz-container">
          <div className="paz-section-head">
            <span className="paz-kicker">
              <WisdomIcon name="calendar" size={13} /> Calendario oficial
            </span>
            <h2 className="paz-h2" id="paz-lives-title">
              Nueve encuentros <em>para no caminar solo</em>
            </h2>
            <p className="paz-lead">
              Todos los En Vivos son a las 20:00, hora de Ecuador. La comunidad de WhatsApp
              recibe el resumen y los recordatorios.
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

      <section className="paz-section" id="comunidad" aria-labelledby="paz-community-title">
        <div className="paz-container paz-challenge">
          <div className="paz-challenge-copy">
            <span className="paz-kicker">
              <WisdomIcon name="users" size={13} /> Comunidad oficial
            </span>
            <h2 className="paz-h2" id="paz-community-title">
              Recibe el temario y <em>reserva tu lugar</em>
            </h2>
            <p className="paz-lead" style={{ marginLeft: 0 }}>
              Déjanos tus datos para enviarte el temario completo, el recordatorio de la
              apertura de preventa y los enlaces de los En Vivos. Si ya tienes el enlace de
              WhatsApp, puedes entrar directamente.
            </p>
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="paz-btn paz-btn--olive"
                style={{ marginTop: '0.75rem' }}
              >
                <WisdomIcon name="users" size={16} /> Entrar a la comunidad de WhatsApp
              </a>
            )}
            <div className="paz-alert paz-alert--info" style={{ marginTop: '1rem' }}>
              <strong>Fechas clave:</strong> preventa desde el 3 de diciembre (20:00),
              estreno y liberación el 8 de diciembre, precio oficial del 9 al 20 de
              diciembre y sesión de alumnos el 22 de diciembre.
            </div>
          </div>
          <PazLeadForm id="paz-lead-form" source="landing" title="Quiero recibir el temario" />
        </div>
      </section>

      <section className="paz-section paz-section--paper" aria-labelledby="paz-inscription-title" id="inscripcion">
        <div className="paz-container paz-final" style={{ color: '#faf8f5' }}>
          <div>
            <span className="paz-kicker" style={{ color: '#e6c78c' }}>
              <WisdomIcon name="sparkles" size={13} /> Tu mesa está lista
            </span>
            <h2 id="paz-inscription-title">
              Cierra el 2026 con paz, orden y fuego.
            </h2>
            <p>
              Reserva tu lugar en preventa por {formatPazUsd(PAZ_PRICING.presaleCents)} por
              hogar o aporta una {PAZ_PRICING.scholarshipLabel} para un matrimonio vulnerable.
            </p>
          </div>
          <div className="paz-final-actions">
            <Link href="/paz-en-la-mesa/inscripcion" className="paz-btn paz-btn--gold">
              <WisdomIcon name="credit-card" size={16} /> Ir a inscripción
            </Link>
            <Link href="/paz-en-la-mesa/inscripcion?plan=scholarship" className="paz-btn paz-btn--ghost" style={{ color: '#faf8f5', borderColor: 'rgba(250,248,245,.4)' }}>
              <WisdomIcon name="award" size={16} /> Beca un Hogar
            </Link>
            <span className="paz-final-note">
              Pago por transferencia o tarjeta · Validación antes de activar el acceso
            </span>
          </div>
        </div>
      </section>

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

      <footer className="paz-footer">
        <div className="paz-footer-inner">
          <PazEnLaMesaLogo variant="compact" theme="dark" className="paz-footer-logo" />
          <div>
            <strong>{PAZ_BRAND.institution}</strong> · Pastores Samuel y Gabby Palacio
            <br />
            Desarrollado por {PAZ_BRAND.agency} · © {now.getFullYear()}
          </div>
        </div>
      </footer>
    </main>
  );
}

export default PazEnLaMesaLanding;

