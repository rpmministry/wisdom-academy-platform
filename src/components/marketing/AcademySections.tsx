import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

const METRICS = [
  { value: '200', label: 'días de referencia adaptables', detail: 'Calendario configurable por proyecto' },
  { value: '2.000', label: 'clases modulares', detail: 'Rutas personalizadas por estudiante' },
  { value: '400', label: 'guías de estudio', detail: 'Objetivos, práctica y evidencia' },
  { value: '248', label: 'unidades curriculares', detail: 'Itinerarios flexibles, no un temario fijo' },
];

const FAQS = [
  {
    question: '¿Wisdom Academy es solo para familias homeschool?',
    answer:
      'No. La academia integra dos rutas: itinerarios homeschool flexibles y una escuela abierta de cursos y talleres para jóvenes y adultos en tecnología, liderazgo, finanzas, música y familia. Ambas comparten estándares altos y acompañamiento personalizado.',
  },
  {
    question: '¿Qué respaldo académico tiene el programa?',
    answer:
      'El diseño curricular propio se contrasta con referentes internacionales y se adapta a marcos locales cuando la familia o el país lo requieren. Se organiza en unidades, rúbricas y evidencias de portafolio; no dependemos de un único currículo ni de una ubicación fija.',
  },
  {
    question: '¿Los estudiantes aprenden solos con inteligencia artificial?',
    answer:
      'No. La IA se usa para acompañar la práctica, generar explicaciones y dar retroalimentación inmediata. El diseño pedagógico, la evaluación y las tutorías humanas siguen siendo responsabilidad de la academia y de la familia.',
  },
  {
    question: '¿Cómo se accede a los cursos y talleres?',
    answer:
      'Cada producto enumera los recursos que incluye. Puedes comprar con PayPal, recibir un acceso por regalo o invitación, o ser matriculado por administración. El servidor verifica el derecho antes de entregar cualquier contenido.',
  },
  {
    question: '¿Se puede estudiar desde otro país?',
    answer:
      'Sí. La plataforma es bilingüe español/inglés, funciona en modalidad remota y permite adaptar calendario, ritmo y referencias curriculares al proyecto familiar o al país de residencia. Las guías pueden imprimirse o descargarse para estudiar sin conexión.',
  },
  {
    question: '¿Qué hace diferente a Wisdom Academy?',
    answer:
      'Integra identidad cristiana, rigor académico y tecnología adaptativa: rutas personalizadas, docentes IA, tutores humanos, portafolio y control de acceso verificable. Los talleres profesionales están diseñados para servir a la sociedad mediante tecnología avanzada. No es un aula virtual aislada; es una academia integral.',
  },
];

export function AcademySections() {
  return (
    <>
      <section className="wa-home-section" id="academia">
        <div className="wa-home-container">
          <div className="wa-home-head">
            <span className="wa-catalog-kicker">
              <WisdomIcon name="award" size={13} /> Una academia, múltiples caminos
            </span>
            <h2>Educación integral para la vida escolar y profesional</h2>
            <p>
              Acompañamos a familias que educan en casa y formamos a jóvenes y adultos que quieren
              dominar habilidades concretas. La misma exigencia académica, la misma trazabilidad y
              la misma obsesión por enseñar a pensar.
            </p>
          </div>
          <div className="wa-home-split">
            <article className="wa-home-route wa-home-route--school">
              <div className="wa-home-route-icon">
                <WisdomIcon name="graduation-cap" size={24} color="#2563eb" />
              </div>
              <Badge variant="navy" size="sm" style={{ alignSelf: 'flex-start' }}>Homeschool K-12</Badge>
              <h3>Un itinerario personal, con estándares verificables</h3>
              <p>
                Itinerarios K-12 flexibles, con currículo propio contrastado con referentes
                internacionales, docentes IA y tutorías humanas. Cada estudiante recibe su
                calendario, su ruta diaria y su portafolio.
              </p>
              <ul>
                <li>Rutas de 9 a 11 áreas con profundización progresiva.</li>
                <li>Calendario de referencia adaptable a distintos países.</li>
                <li>Boletines, rúbricas y evidencias para la familia.</li>
                <li>Protección de expedientes y datos de menores.</li>
              </ul>
              <Link href="/login"><Button variant="primary-navy" size="sm">Acceder al portal escolar</Button></Link>
            </article>

            <article className="wa-home-route wa-home-route--pro">
              <div className="wa-home-route-icon">
                <WisdomIcon name="sparkles" size={24} color="#b45309" />
              </div>
              <Badge variant="gold" size="sm" style={{ alignSelf: 'flex-start' }}>Cursos y talleres</Badge>
              <h3>Formación aplicada para el mundo real</h3>
              <p>
                Tecnología avanzada, liderazgo, finanzas, música y familia. Talleres diseñados
                para servir a la sociedad, con proyectos reales y una comunidad que aprende
                haciendo.
              </p>
              <ul>
                <li>Rutas por curso, taller o programa integral.</li>
                <li>Compra segura, regalos, invitaciones y becas.</li>
                <li>Contenido descargable y aprendizaje a tu ritmo.</li>
                <li>Certificados y recursos con trazabilidad.</li>
              </ul>
              <a href="#programas"><Button variant="primary-gold" size="sm">Explorar la oferta</Button></a>
            </article>
          </div>
        </div>
      </section>

      <section className="wa-home-section wa-home-section--surface" id="metodo">
        <div className="wa-home-container">
          <div className="wa-home-head">
            <span className="wa-catalog-kicker">
              <WisdomIcon name="chalkboard" size={13} /> Método Wisdom
            </span>
            <h2>Enseñamos a pensar, no solo a aprobar</h2>
            <p>
              Cada clase sigue un ciclo de cuatro fases que combina claridad conceptual, práctica
              guiada y evidencia de aprendizaje. El mismo método se adapta a un niño de 8 años y a
              un profesional que quiere dominar una nueva habilidad.
            </p>
          </div>
          <div className="wa-home-method">
            {[
              ['01', 'Enfoque', 'Una pregunta guía conecta el tema con la vida real y activa la curiosidad.'],
              ['02', 'Modelo', 'Esquemas visuales y ejemplos resueltos hacen visible el razonamiento.'],
              ['03', 'Práctica', 'El estudiante aplica, se equivoca, recibe retroalimentación y corrige.'],
              ['04', 'Evidencia', 'Una síntesis, un proyecto o una evaluación demuestran lo aprendido.'],
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

      <section className="wa-home-section" id="docentes">
        <div className="wa-home-container">
          <div className="wa-home-head">
            <span className="wa-catalog-kicker">
              <WisdomIcon name="user" size={13} /> Acompañamiento humano y pedagógico
            </span>
            <h2>Profesores que conocen el camino</h2>
            <p>
              La tecnología amplifica la enseñanza, no la reemplaza. Los profesores IA están
              diseñados por el equipo académico y trabajan junto a tutores humanos y familias.
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
                  Pedagogía lúdica, asombro y analogías concretas. Acompaña a los más pequeños a
                  construir bases sólidas con alegría y disciplina.
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
                  Rigor académico, pensamiento socrático y argumentación con evidencia. Prepara a
                  los adolescentes para la universidad y para la vida.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="wa-home-metrics" aria-label="Capacidad académica">
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

      <section className="wa-home-section" id="preguntas">
        <div className="wa-home-container wa-home-faq-layout">
          <div className="wa-home-faq-intro">
            <span className="wa-catalog-kicker">
              <WisdomIcon name="book" size={13} /> Preguntas frecuentes
            </span>
            <h2>Decisiones informadas, familias tranquilas</h2>
            <p>
              Si estás evaluando una educación diferente para tu familia o una formación seria para
              tu carrera, estas respuestas te ayudan a decidir.
            </p>
            <Link href="/login"><Button variant="secondary" size="sm">Hablar con el equipo</Button></Link>
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

      <section className="wa-home-cta">
        <div className="wa-home-container">
          <div>
            <span className="wa-catalog-kicker">
              <WisdomIcon name="sparkles" size={13} color="current" /> El siguiente paso
            </span>
            <h2>Tu formación no debería elegir entre excelencia y propósito.</h2>
            <p>
              Explora los programas, conoce el método y accede a una academia que combina fe,
              razón, tecnología y estándares internacionales.
            </p>
          </div>
          <div className="wa-home-cta-actions">
            <a href="#programas"><Button variant="primary-gold" size="lg">Explorar programas</Button></a>
            <Link href="/login"><Button variant="secondary" size="lg">Ingresar al portal</Button></Link>
          </div>
        </div>
      </section>
    </>
  );
}
