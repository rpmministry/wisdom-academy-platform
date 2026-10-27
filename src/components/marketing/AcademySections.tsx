'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WisdomIcon } from '@/components/ui/WisdomIcon';
import type { CatalogProduct } from '@/components/catalog/CatalogExperience';

const METRICS = [
  { value: '200', label: 'días de referencia adaptables', detail: 'Calendario escolar configurable' },
  { value: '2.000', label: 'clases modulares', detail: 'Rutas personalizadas por estudiante' },
  { value: '400', label: 'guías de estudio', detail: 'Objetivos, práctica y evidencia descargable' },
  { value: '100%', label: 'acceso verificado', detail: 'Derechos protegidos en servidor' },
];

const FAQS = [
  {
    question: '¿Wisdom Academy es solo una escuela o también una plataforma de cursos?',
    answer:
      'Wisdom Academy integra ambas líneas de formación: el Portal Escolar ofrece itinerarios académicos estructurados para educación básica y familias que educan en casa; mientras que Cursos y Talleres es una plataforma abierta de formación continua para jóvenes y adultos que desean dominar habilidades prácticas en tecnología, liderazgo, finanzas y artes.',
  },
  {
    question: '¿Qué diferencia existe entre el Portal Escolar y Cursos y Talleres?',
    answer:
      'El Portal Escolar está diseñado como una trayectoria escolar completa (K-12): cuenta con calendario de 200 días de referencia, materias integradas, planificación diaria, rúbricas de evaluación, boletines y portafolio de evidencias. Cursos y Talleres son experiencias formativas modulares e independientes que se cursan al propio ritmo, orientadas a desarrollar competencias profesionales y personales concretas.',
  },
  {
    question: '¿Cómo se combina el acompañamiento humano con la inteligencia artificial?',
    answer:
      'La inteligencia artificial pedagógica de Wisdom Academy actúa como tutor de apoyo continuo: explica conceptos con analogías, asiste en la práctica guiada y resuelve dudas al instante. El diseño pedagógico, la evaluación de evidencias, la supervisión ética y las tutorías sincrónicas corresponden siempre a los docentes y al equipo directivo de la academia.',
  },
  {
    question: '¿Cómo se accede a los cursos y talleres?',
    answer:
      'Cada curso o taller enumera con total transparencia sus recursos, horas estimadas y modalidad. Puedes adquirir acceso de forma individual con pago seguro vía PayPal, recibir una invitación o beca, o ser matriculado administrativamente. El backend verifica criptográficamente el derecho de acceso antes de habilitar el contenido.',
  },
  {
    question: '¿Se puede estudiar desde cualquier país?',
    answer:
      'Sí. La plataforma funciona 100% en línea con soporte bilingüe (español e inglés) y permite adaptar calendario, horarios y ritmo de estudio al país de residencia o al proyecto de vida de cada estudiante. Las guías de clase pueden descargarse en PDF e imprimirse para estudiar sin conexión.',
  },
  {
    question: '¿Qué certificación y respaldo ofrece la plataforma?',
    answer:
      'En el Portal Escolar se genera un expediente académico completo con boletines oficiales, rúbricas y portafolio digital de evidencias. En Cursos y Talleres se otorgan certificados digitales de finalización verificables que detallan las competencias adquiridas y la carga horaria completada.',
  },
];

const FALLBACK_WORKSHOPS = [
  {
    id: 'wk-python-ia',
    slug: 'curso-python-ia-jovenes',
    name: 'Programación con IA y Python para Jóvenes',
    description:
      'Domina el lenguaje de programación de mayor demanda y aprende a integrar modelos de inteligencia artificial en aplicaciones y proyectos reales.',
    category: 'Talleres',
    coverImage: '/images/courses/python-ia.svg',
    hours: 10,
    modality: 'Online flexible',
    tag: 'Tecnología & IA',
    priceText: '$10 USD',
    upcoming: true,
  },
  {
    id: 'wk-mayordomia',
    slug: 'taller-mayordomia-financiera',
    name: 'Mayordomía Financiera Cristiana',
    description:
      'Principios bíblicos y prácticos para la administración del dinero, presupuesto personal y familiar, ahorro e inversión con propósito.',
    category: 'Talleres',
    coverImage: '/images/courses/mayordomia.svg',
    hours: 15,
    modality: 'Online flexible',
    tag: 'Finanzas con propósito',
    priceText: '$15 USD',
    upcoming: true,
  },
  {
    id: 'wk-liderazgo',
    slug: 'taller-liderazgo-cristiano',
    name: 'Liderazgo y Cosmovisión Bíblica',
    description:
      'Formación en liderazgo ético, pensamiento crítico, comunicación asertiva y toma de decisiones orientadas a transformar la sociedad.',
    category: 'Talleres',
    coverImage: '/images/courses/liderazgo.svg',
    hours: 25,
    modality: 'Online flexible',
    tag: 'Liderazgo & Ética',
    priceText: '$25 USD',
    upcoming: true,
  },
  {
    id: 'wk-musica',
    slug: 'taller-musica-adoracion',
    name: 'Música para la Adoración',
    description:
      'Técnica instrumental y vocal, teoría musical aplicada, armonía y dinámicas de ensamble para el servicio en comunidades y congregaciones.',
    category: 'Talleres',
    coverImage: '/images/courses/musica.svg',
    hours: 30,
    modality: 'Online flexible',
    tag: 'Música & Artes',
    priceText: '$30 USD',
    upcoming: true,
  },
  {
    id: 'wk-padres',
    slug: 'taller-escuela-padres-homeschoolers',
    name: 'Escuela para Padres Homeschoolers',
    description:
      'Herramientas pedagógicas, organización del tiempo, manejo de rutinas y acompañamiento emocional para familias que educan en el hogar.',
    category: 'Talleres',
    coverImage: '/images/courses/padres.svg',
    hours: 20,
    modality: 'Online flexible',
    tag: 'Familia & Pedagogía',
    priceText: '$20 USD',
    upcoming: true,
  },
];

interface PathwayGatewayProps {
  onOpenSchoolModal?: () => void;
  onSelectPortal?: (portal: 'school' | 'pro') => void;
}

/**
 * Sección de entrada estratégica: distingue con claridad las dos grandes
 * líneas de formación de Wisdom Academy (Portal Escolar vs Cursos y Talleres).
 */
export function PathwayGatewaySection({
  onOpenSchoolModal,
  onSelectPortal,
}: PathwayGatewayProps) {
  const handleSelect = (portal: 'school' | 'pro', targetId: string) => {
    if (onSelectPortal) onSelectPortal(portal);
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="wa-home-section wa-pathway-gateway-section" id="academia">
      <div id="dos-caminos" style={{ position: 'relative', top: '-70px' }} />
      <div className="wa-home-container">
        <div className="wa-home-head">
          <span className="wa-catalog-kicker">
            <WisdomIcon name="award" size={13} /> Dos caminos de formación
          </span>
          <h2>Una misma academia, dos opciones adaptadas a tu meta</h2>
          <p>
            Wisdom Academy articula una educación escolar estructurada con una amplia propuesta de cursos
            y talleres de alta calidad, uniendo el rigor académico y práctico con la formación del carácter.
          </p>
        </div>

        <div className="wa-pathway-cards-grid">
          {/* LÍNEA B: CURSOS Y TALLERES (PROTAGONISMO COMERCIAL Y VISUAL) */}
          <article className="wa-pathway-card wa-pathway-card--pro" id="gateway-cursos">
            <div className="wa-pathway-card-badge">
              <Badge variant="gold" size="sm">
                <WisdomIcon name="sparkles" size={13} /> Cursos y Talleres de Especialización
              </Badge>
              <span className="wa-pathway-card-tag">Jóvenes y Adultos</span>
            </div>

            <div className="wa-pathway-card-icon wa-pathway-card-icon--pro">
              <WisdomIcon name="sparkles" size={26} color="#B45309" />
            </div>

            <h3>Cursos y Talleres de alta calidad y aplicación real</h3>
            <p className="wa-pathway-card-lead">
              Desarrollo de conocimientos, habilidades y nuevas oportunidades formativas en múltiples
              áreas, oficios y campos de especialización, con enfoque práctico, rigor y valores éticos.
            </p>

            <ul className="wa-pathway-card-list">
              <li>
                <strong>Aprendizaje práctico y riguroso:</strong> proyectos aplicados y resolución de problemas reales.
              </li>
              <li>
                <strong>A tu propio ritmo:</strong> contenidos modulares, clases en video y recursos descargables.
              </li>
              <li>
                <strong>Certificación verificable:</strong> diplomas digitales con carga horaria y trazabilidad.
              </li>
              <li>
                <strong>Oferta en constante expansión:</strong> nuevos campos de formación, disciplinas y talleres periódicos.
              </li>
            </ul>

            <div className="wa-pathway-card-actions">
              <a
                href="#cursos-talleres"
                onClick={(e) => {
                  e.preventDefault();
                  handleSelect('pro', 'cursos-talleres');
                }}
                style={{ textDecoration: 'none' }}
              >
                <Button variant="primary-gold" size="md">
                  <WisdomIcon name="sparkles" size={15} /> Explorar Cursos y Talleres
                </Button>
              </a>
              <Link href="/catalogo#programas" style={{ textDecoration: 'none' }}>
                <Button variant="secondary" size="md">
                  Ver catálogo completo →
                </Button>
              </Link>
            </div>
          </article>

          {/* LÍNEA A: PORTAL ESCOLAR (ESTRUCTURADO Y PROFESIONAL) */}
          <article className="wa-pathway-card wa-pathway-card--school" id="gateway-escolar">
            <div className="wa-pathway-card-badge">
              <Badge variant="navy" size="sm">
                <WisdomIcon name="graduation-cap" size={13} /> Educación Escolar y Homeschool
              </Badge>
              <span className="wa-pathway-card-tag">Familias y Estudiantes K-12</span>
            </div>

            <div className="wa-pathway-card-icon wa-pathway-card-icon--school">
              <WisdomIcon name="graduation-cap" size={26} color="#2563EB" />
            </div>

            <h3>Portal Escolar con trayectoria organizada</h3>
            <p className="wa-pathway-card-lead">
              Educación académica escolar estructurada para cada etapa, uniendo excelencia
              formativa, acompañamiento continuo y formación del carácter inspirada en principios y valores cristianos.
            </p>

            <ul className="wa-pathway-card-list">
              <li>
                <strong>Planificación diaria:</strong> calendario escolar de 200 días de referencia adaptable a tu país.
              </li>
              <li>
                <strong>Acompañamiento docente:</strong> profesores IA de apoyo continuo y tutores humanos especializados.
              </li>
              <li>
                <strong>Evidencias y reportes:</strong> boletines oficiales, rúbricas de evaluación y portafolio de aprendizaje.
              </li>
              <li>
                <strong>Protección integral:</strong> entorno seguro y confidencialidad de expedientes para menores.
              </li>
            </ul>

            <div className="wa-pathway-card-actions">
              <a
                href="#portal-escolar"
                onClick={(e) => {
                  e.preventDefault();
                  handleSelect('school', 'portal-escolar');
                }}
                style={{ textDecoration: 'none' }}
              >
                <Button variant="primary-navy" size="md">
                  <WisdomIcon name="graduation-cap" size={15} /> Conocer programas escolares
                </Button>
              </a>
              {onOpenSchoolModal && (
                <Button variant="secondary" size="md" onClick={onOpenSchoolModal}>
                  Vista previa del portal
                </Button>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

interface WorkshopsFeaturedProps {
  productos?: CatalogProduct[];
  onOpenPurchase?: (producto: CatalogProduct) => void;
  onSelectPortal?: (portal: 'school' | 'pro') => void;
}

/**
 * Escaparate destacado de Cursos y Talleres: otorga protagonismo visual
 * y comercial a la formación continua, mostrando disciplinas reales.
 */
export function WorkshopsFeaturedSection({
  productos = [],
  onOpenPurchase,
  onSelectPortal,
}: WorkshopsFeaturedProps) {
  const workshopProducts = productos.filter(
    (p) => p.category === 'Talleres' || p.category === 'Cursos'
  );

  const items = workshopProducts.length > 0 ? workshopProducts : null;

  return (
    <section className="wa-home-section wa-home-section--surface wa-workshops-section" id="cursos-talleres">
      <div className="wa-home-container">
        <div className="wa-home-head">
          <span className="wa-catalog-kicker">
            <WisdomIcon name="sparkles" size={13} /> Cursos y Talleres de Alta Calidad
          </span>
          <h2>Aprende habilidades prácticas para liderar y servir</h2>
          <p>
            Propuesta formativa orientada al desarrollo de competencias prácticas en múltiples áreas,
            oficios y campos de especialización. Experiencias diseñadas para aprender, crecer y servir con excelencia.
          </p>
        </div>

        <div className="wa-workshops-grid">
          {items
            ? items.map((product) => {
                const upcoming = product.contentStatus === 'upcoming';
                return (
                  <article
                    className="wa-workshop-card"
                    key={product.id}
                    data-testid={`featured-workshop-${product.slug}`}
                  >
                    <div className="wa-workshop-card-cover">
                      <Image
                        src={product.coverImage || '/images/courses/python-ia.svg'}
                        alt={product.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                      <div className="wa-workshop-card-overlay" />
                      <span className="wa-workshop-card-category">{product.category}</span>
                      {upcoming && (
                        <span className="wa-workshop-card-status">Próximamente disponible</span>
                      )}
                    </div>

                    <div className="wa-workshop-card-body">
                      <div className="wa-workshop-card-meta">
                        <span>{product.metadata.modality || 'Online flexible'}</span>
                        {product.metadata.hours && (
                          <>
                            <span>·</span>
                            <span>{product.metadata.hours} horas estimadas</span>
                          </>
                        )}
                      </div>

                      <h3 className="wa-workshop-card-title">{product.name}</h3>
                      <p className="wa-workshop-card-description">{product.description}</p>

                      <div className="wa-workshop-card-footer">
                        <div className="wa-workshop-card-price">
                          {upcoming ? (
                            <>
                              <span>Inscripción abierta pronto</span>
                              <small>Materiales en preparación</small>
                            </>
                          ) : (
                            <>
                              <span>${(product.priceCents / 100).toFixed(2)} USD</span>
                              <small>Acceso verificado y certificado</small>
                            </>
                          )}
                        </div>

                        {upcoming ? (
                          <Link href="/catalogo#programas" style={{ textDecoration: 'none' }}>
                            <Button variant="secondary" size="sm">
                              Ver en catálogo
                            </Button>
                          </Link>
                        ) : onOpenPurchase ? (
                          <Button
                            variant="primary-gold"
                            size="sm"
                            onClick={() => onOpenPurchase(product)}
                          >
                            Inscribirse
                          </Button>
                        ) : (
                          <Link href="/catalogo#programas" style={{ textDecoration: 'none' }}>
                            <Button variant="primary-gold" size="sm">
                              Inscribirse
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })
            : FALLBACK_WORKSHOPS.map((workshop) => (
                <article className="wa-workshop-card" key={workshop.id}>
                  <div className="wa-workshop-card-cover">
                    <Image
                      src={workshop.coverImage}
                      alt={workshop.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="wa-workshop-card-overlay" />
                    <span className="wa-workshop-card-category">{workshop.tag}</span>
                    <span className="wa-workshop-card-status">Próximamente disponible</span>
                  </div>

                  <div className="wa-workshop-card-body">
                    <div className="wa-workshop-card-meta">
                      <span>{workshop.modality}</span>
                      <span>·</span>
                      <span>{workshop.hours} horas</span>
                    </div>

                    <h3 className="wa-workshop-card-title">{workshop.name}</h3>
                    <p className="wa-workshop-card-description">{workshop.description}</p>

                    <div className="wa-workshop-card-footer">
                      <div className="wa-workshop-card-price">
                        <span>Inscripción abierta pronto</span>
                        <small>Materiales en preparación</small>
                      </div>

                      <Link href="/catalogo#programas" style={{ textDecoration: 'none' }}>
                        <Button variant="secondary" size="sm">
                          Ver en catálogo
                        </Button>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
        </div>

        {/* NOTA DE EXPANSIÓN Y DESCUBRIMIENTO CONTINUO */}
        <div className="wa-workshops-expansion-banner">
          <div className="wa-workshops-expansion-content">
            <div className="wa-workshops-expansion-icon">
              <WisdomIcon name="book" size={24} color="#0BAA5E" />
            </div>
            <div>
              <strong>Propuesta formativa en constante crecimiento</strong>
              <p>
                Diseñamos e incorporamos continuamente nuevos cursos, talleres y especializaciones en diversas
                disciplinas y oficios, brindando nuevas oportunidades de formación en cada etapa de la vida.
              </p>
            </div>
          </div>
          <Link href="/catalogo#programas" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => onSelectPortal && onSelectPortal('pro')}
            >
              Explorar todos los cursos →
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Secciones institucionales complementarias:
 * Método pedagógico, docentes, métricas, FAQ y llamada a la acción final.
 */
export function AcademySections() {
  return (
    <>
      {/* MÉTODO PEDAGÓGICO */}
      <section className="wa-home-section" id="metodo">
        <div className="wa-home-container">
          <div className="wa-home-head">
            <span className="wa-catalog-kicker">
              <WisdomIcon name="chalkboard" size={13} /> Método Wisdom
            </span>
            <h2>Enseñamos a pensar, razonar y aplicar</h2>
            <p>
              Nuestra metodología activa combina cuatro etapas esenciales para transformar la
              curiosidad en comprensión sólida y aplicación práctica:
            </p>
          </div>
          <div className="wa-home-method">
            {[
              ['01', 'Enfoque', 'Una pregunta desafiante conecta el tema con situaciones de la vida real y activa la curiosidad.'],
              ['02', 'Modelo', 'Esquemas visuales y demostraciones paso a paso hacen visible el razonamiento.'],
              ['03', 'Práctica', 'El estudiante aplica lo aprendido, resuelve problemas y recibe retroalimentación inmediata.'],
              ['04', 'Evidencia', 'Un proyecto aplicado, rúbrica o síntesis certifica el dominio real de los objetivos.'],
            ].map(([number, title, description]) => (
              <div className="wa-home-method-step" key={number}>
                <span className="wa-home-method-number">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOCENTES Y ACOMPAÑAMIENTO */}
      <section className="wa-home-section wa-home-section--surface" id="docentes">
        <div className="wa-home-container">
          <div className="wa-home-head">
            <span className="wa-catalog-kicker">
              <WisdomIcon name="user" size={13} /> Acompañamiento pedagógico integral
            </span>
            <h2>Docentes comprometidos y tecnología que potencia el aprendizaje</h2>
            <p>
              La tecnología amplifica la enseñanza pero no reemplaza el criterio docente. Nuestros
              profesores IA asisten la práctica diaria en estrecha colaboración con tutores humanos y familias.
            </p>
          </div>
          <div className="wa-home-teachers">
            <article className="wa-home-teacher">
              <div className="wa-home-teacher-photo">
                <Image src="/brand/teachers/profesor-mateo.jpg" alt="Profesor Mateo" fill sizes="120px" />
              </div>
              <div>
                <Badge variant="gold" size="sm">Básica Elemental</Badge>
                <h3>Prof. Mateo</h3>
                <p>
                  Pedagogía lúdica, asombro y analogías concretas. Acompaña a los estudiantes de
                  primaria a construir fundamentos conceptuales con entusiasmo, disciplina y afecto.
                </p>
              </div>
            </article>
            <article className="wa-home-teacher">
              <div className="wa-home-teacher-photo">
                <Image src="/brand/teachers/profesora-sofia.jpg" alt="Dra. Sofía de Valenzuela" fill sizes="120px" />
              </div>
              <div>
                <Badge variant="navy" size="sm">Básica Superior</Badge>
                <h3>Dra. Sofía de Valenzuela</h3>
                <p>
                  Rigor académico, diálogo socrático y argumentación basada en evidencia. Prepara a
                  los jóvenes para desafíos intelectuales avanzados y para la vida universitaria.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* MÉTRICAS DE CAPACIDAD */}
      <section className="wa-home-metrics" aria-label="Capacidad y respaldo académico">
        <div className="wa-home-container wa-home-metrics-grid">
          {METRICS.map((metric) => (
            <div key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
              <small>{metric.detail}</small>
            </div>
          ))}
        </div>
      </section>

      {/* PREGUNTAS FRECUENTES */}
      <section className="wa-home-section" id="preguntas">
        <div className="wa-home-container wa-home-faq-layout">
          <div className="wa-home-faq-intro">
            <span className="wa-catalog-kicker">
              <WisdomIcon name="book" size={13} /> Preguntas frecuentes
            </span>
            <h2>Claridad para tomar la mejor decisión educativa</h2>
            <p>
              Respondemos a las dudas más comunes sobre nuestras dos líneas de formación, el acceso a
              la plataforma y el respaldo pedagógico.
            </p>
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Hablar con el equipo
              </Button>
            </Link>
          </div>
          <div className="wa-home-faq">
            {FAQS.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CIERRE Y LLAMADA A LA ACCIÓN FINAL */}
      <section className="wa-home-cta">
        <div className="wa-home-container">
          <div>
            <span className="wa-catalog-kicker">
              <WisdomIcon name="sparkles" size={13} color="current" /> El siguiente paso
            </span>
            <h2>Educación integral, excelencia y propósito en cada etapa.</h2>
            <p>
              Ya sea que busques un itinerario escolar estructurado para tu familia o cursos y talleres
              de alta calidad orientados a tu crecimiento profesional y personal, Wisdom Academy tiene una ruta para ti.
            </p>
          </div>
          <div className="wa-home-cta-actions">
            <a href="#cursos-talleres" style={{ textDecoration: 'none' }}>
              <Button variant="primary-gold" size="lg">
                <WisdomIcon name="sparkles" size={16} /> Explorar Cursos y Talleres
              </Button>
            </a>
            <a href="#portal-escolar" style={{ textDecoration: 'none' }}>
              <Button variant="secondary" size="lg">
                <WisdomIcon name="graduation-cap" size={16} /> Conocer Portal Escolar
              </Button>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

export default AcademySections;
