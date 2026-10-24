import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { GuidePrintButton } from '@/components/guide/GuidePrintButton';
import {
  HOMESCHOOL_GUIDE_PDF_PATH,
} from '@/lib/catalog/homeschoolOffer';
import '@/styles/guide.css';

export const metadata: Metadata = {
  title: 'Guía de bienvenida Homeschool | Wisdom Academy',
  description:
    'Guía institucional para familias y estudiantes: Portal Escolar, aulas Homeschool, recursos de apoyo, cursos, talleres y solución de problemas frecuentes.',
};

const INDICE = [
  ['bienvenida', 'Bienvenida a Wisdom Academy'],
  ['plataforma', 'Conoce tu plataforma'],
  ['comenzar', 'Cómo comenzar tus clases'],
  ['estudiar', 'Cómo estudiar una materia'],
  ['recursos', 'Cómo utilizar Recursos de apoyo'],
  ['cursos', 'Cómo utilizar cursos y talleres'],
  ['consejos', 'Consejos para una experiencia organizada'],
  ['problemas', 'Solución de problemas frecuentes'],
  ['preguntas', 'Preguntas frecuentes'],
  ['cierre', 'Cierre y bienvenida'],
] as const;

export default function GuiaBienvenidaHomeschoolPage() {
  return (
    <main className="wa-guide">
      <header className="wa-guide-bar">
        <Link href="/#programas" className="wa-guide-brand" aria-label="Volver al Portal Escolar de Wisdom Academy">
          <Image
            src="/brand/svg/wisdom-logo-horizontal-color.svg"
            alt="Wisdom Academy"
            width={220}
            height={26}
            priority
            className="wa-guide-brand-logo wa-guide-brand-logo--light"
          />
          <Image
            src="/brand/svg/wisdom-logo-horizontal-on-dark.svg"
            alt="Wisdom Academy"
            width={220}
            height={26}
            priority
            className="wa-guide-brand-logo wa-guide-brand-logo--dark"
          />
        </Link>
        <div className="wa-guide-actions">
          <Link href="/#programas" className="wa-guide-action wa-guide-action--secondary">
            Volver al Portal Escolar
          </Link>
          <a
            href={HOMESCHOOL_GUIDE_PDF_PATH}
            download
            className="wa-guide-action wa-guide-action--primary"
          >
            Descargar PDF
          </a>
          <GuidePrintButton />
        </div>
      </header>

      <article className="wa-guide-doc" id="inicio">
        <section className="wa-guide-cover" aria-labelledby="wa-guide-title">
          <div className="wa-guide-cover-mark">
            <Image
              src="/brand/svg/wisdom-logo-vertical-white.svg"
              alt="Logotipo institucional de Wisdom Academy"
              width={240}
              height={250}
              priority
            />
          </div>
          <div className="wa-guide-cover-copy">
            <span className="wa-guide-kicker">Portal Escolar · Homeschool</span>
            <h1 id="wa-guide-title">Guía de bienvenida Homeschool</h1>
            <p className="wa-guide-subtitle">
              Tu guía para aprender, explorar y avanzar en Wisdom Academy
            </p>
            <p className="wa-guide-welcome">
              Bienvenido a una forma de aprender que acompaña a tu familia, respeta
              tu ritmo y pone el aprendizaje al centro. Esta guía reúne lo esencial
              para que tus primeros días en la plataforma sean claros y tranquilos.
            </p>
            <dl className="wa-guide-cover-meta">
              <div>
                <dt>Edición</dt>
                <dd>2026–2027</dd>
              </div>
              <div>
                <dt>Dirigida a</dt>
                <dd>Familias y estudiantes</dd>
              </div>
              <div>
                <dt>Modalidad</dt>
                <dd>Homeschool con acompañamiento</dd>
              </div>
            </dl>
          </div>
          <p className="wa-guide-cover-note">
            Documento institucional de Wisdom Academy. Las capturas corresponden a
            la plataforma real.
          </p>
        </section>

        <div className="wa-guide-layout">
          <nav className="wa-guide-toc" aria-label="Índice de la guía">
            <p className="wa-guide-toc-title">Contenido</p>
            <ol>
              {INDICE.map(([id, titulo]) => (
                <li key={id}>
                  <a href={`#${id}`}>{titulo}</a>
                </li>
              ))}
            </ol>
            <div className="wa-guide-toc-actions">
              <a href={HOMESCHOOL_GUIDE_PDF_PATH} download>
                Descargar PDF
              </a>
              <Link href="/#programas">Volver al Portal Escolar</Link>
            </div>
          </nav>

          <div className="wa-guide-content">
            <section id="bienvenida" aria-labelledby="titulo-bienvenida">
              <span className="wa-guide-section-number">01</span>
              <h2 id="titulo-bienvenida">Bienvenida a Wisdom Academy</h2>
              <p>
                Wisdom Academy es una plataforma educativa que reúne el itinerario
                académico, las clases guiadas, los recursos de apoyo y la formación
                complementaria en un mismo lugar. En Homeschool, la plataforma está
                pensada para que el estudiante avance con autonomía y para que la
                familia pueda acompañar el proceso con información clara.
              </p>
              <p>
                Cada jornada combina explicaciones paso a paso, práctica, recursos
                audiovisuales y herramientas de seguimiento. No necesitas instalar
                programas: basta con un navegador actualizado y tu acceso
                institucional.
              </p>
              <div className="wa-guide-callout">
                <strong>Una idea importante</strong>
                <p>
                  La plataforma no sustituye el acompañamiento de la familia ni la
                  labor del docente. Es el espacio donde el estudiante encuentra su
                  ruta, sus materiales y las herramientas para aprender con orden.
                </p>
              </div>
            </section>

            <section id="plataforma" aria-labelledby="titulo-plataforma">
              <span className="wa-guide-section-number">02</span>
              <h2 id="titulo-plataforma">Conoce tu plataforma</h2>
              <p>
                El catálogo público presenta dos portales. El <strong>Portal Escolar</strong>{' '}
                reúne los itinerarios de educación básica y Homeschool; el{' '}
                <strong>Portal de Cursos y Talleres</strong> ofrece formación
                complementaria. Puedes cambiar de portal sin salir del catálogo.
              </p>
              <p>
                Después de iniciar sesión, el menú principal te acompaña en todo
                momento:
              </p>
              <dl className="wa-guide-definitions">
                <div>
                  <dt>Mi portal</dt>
                  <dd>Página de inicio con calendario, ruta diaria y materias.</dd>
                </div>
                <div>
                  <dt>Cursos y talleres</dt>
                  <dd>Programas complementarios con acceso vigente para tu cuenta.</dd>
                </div>
                <div>
                  <dt>Aula virtual</dt>
                  <dd>Clases guiadas de Homeschool con diapositivas y acompañamiento.</dd>
                </div>
                <div>
                  <dt>Mi acceso</dt>
                  <dd>Derechos de acceso, vigencia y órdenes registradas en tu cuenta.</dd>
                </div>
                <div>
                  <dt>Catálogo</dt>
                  <dd>Oferta completa de programas, cursos, talleres y recursos gratuitos.</dd>
                </div>
                <div>
                  <dt>Contenidos</dt>
                  <dd>Biblioteca global; aparece cuando tu cuenta tiene ese permiso.</dd>
                </div>
              </dl>
              <figure className="wa-guide-figure">
                <Image
                  src="/images/guide/mi-portal.png"
                  alt="Página Mi portal de Wisdom Academy con los accesos a la ruta diaria, las materias y el aula virtual."
                  width={1440}
                  height={900}
                  loading="eager"
                  sizes="(max-width: 900px) 100vw, 880px"
                />
                <figcaption>
                  Mi portal reúne el acceso al aula, la ruta diaria y las materias
                  del estudiante.
                </figcaption>
              </figure>
            </section>

            <section id="comenzar" aria-labelledby="titulo-comenzar">
              <span className="wa-guide-section-number">03</span>
              <h2 id="titulo-comenzar">Cómo comenzar tus clases</h2>
              <ol className="wa-guide-steps">
                <li>
                  Abre <strong>/login</strong> o selecciona <strong>Ingresar al portal</strong>{' '}
                  en la página principal.
                </li>
                <li>
                  Escribe tu <strong>Usuario o correo institucional</strong> y tu{' '}
                  <strong>Contraseña</strong>. Si la institución habilitó el acceso con
                  Google, puedes usar <strong>Continuar con Google</strong>.
                </li>
                <li>
                  Pulsa <strong>Ingresar a la plataforma</strong>. Llegarás a{' '}
                  <strong>Mi portal</strong>.
                </li>
                <li>
                  Revisa la pestaña <strong>Ruta diaria</strong> para conocer el trabajo
                  del día y abre <strong>Materias</strong> para ver tus asignaturas.
                </li>
                <li>
                  En una materia, selecciona <strong>Abrir aula</strong>. También puedes
                  usar <strong>Aula virtual</strong> en el menú principal.
                </li>
              </ol>
              <div className="wa-guide-callout wa-guide-callout--attention">
                <strong>Si no recuerdas tu contraseña</strong>
                <p>
                  La plataforma no muestra un formulario automático de recuperación.
                  Solicita el restablecimiento a la institución o a la persona que te
                  entregó las credenciales, por el canal habitual de comunicación.
                </p>
              </div>
              <figure className="wa-guide-figure">
                <Image
                  src="/images/guide/portal-escolar.png"
                  alt="Portal Escolar con la Guía de bienvenida Homeschool, los programas de 4.º y 8.º EGB y la oferta anual."
                  width={1440}
                  height={900}
                  loading="eager"
                  sizes="(max-width: 900px) 100vw, 880px"
                />
                <figcaption>
                  En el Portal Escolar encontrarás la guía de bienvenida y los
                  programas Homeschool disponibles.
                </figcaption>
              </figure>
            </section>

            <section id="estudiar" aria-labelledby="titulo-estudiar">
              <span className="wa-guide-section-number">04</span>
              <h2 id="titulo-estudiar">Cómo estudiar una materia</h2>
              <p>
                El aula combina una explicación visual con recursos y herramientas de
                consulta. Sigue este recorrido:
              </p>
              <ol className="wa-guide-steps">
                <li>
                  En la parte superior del aula, elige la asignatura en{' '}
                  <strong>Asignatura de la clase</strong>.
                </li>
                <li>
                  Lee la diapositiva activa y usa <strong>Reproducir paso a paso</strong>{' '}
                  si quieres escuchar la explicación. También puedes avanzar con{' '}
                  <strong>Diapositiva anterior</strong> y{' '}
                  <strong>Siguiente diapositiva</strong>.
                </li>
                <li>
                  Abre <strong>Guías</strong> para descargar o imprimir la{' '}
                  <strong>Guía de esta materia</strong> o la{' '}
                  <strong>Guía general del día</strong>. Se abren en una pestaña nueva y
                  puedes guardarlas como PDF desde el navegador.
                </li>
                <li>
                  Consulta el panel derecho: <strong>Ruta</strong> para el temario,{' '}
                  <strong>Profesor IA</strong> para preguntas, <strong>Moodle</strong>{' '}
                  para quizzes y recursos, y <strong>Apuntes</strong> para tus notas.
                </li>
                <li>
                  En móvil, usa la barra inferior: <strong>Clase</strong>,{' '}
                  <strong>Ruta</strong>, <strong>Recursos</strong>,{' '}
                  <strong>Preguntar</strong> y <strong>Guías</strong>.
                </li>
              </ol>
              <div className="wa-guide-callout">
                <strong>Tu avance se conserva</strong>
                <p>
                  Las lecciones completadas y tus apuntes quedan asociados a tu
                  cuenta o a este navegador, según la herramienta. Al volver a una
                  materia, retoma la ruta donde la dejaste.
                </p>
              </div>
            </section>

            <section id="recursos" aria-labelledby="titulo-recursos">
              <span className="wa-guide-section-number">05</span>
              <h2 id="titulo-recursos">Cómo utilizar Recursos de apoyo</h2>
              <p>
                En el aula Homeschool, la columna izquierda contiene{' '}
                <strong>Recursos de apoyo</strong>. Allí encontrarás explicaciones
                audiovisuales relacionadas con la asignatura y la lección actual.
              </p>
              <ol className="wa-guide-steps">
                <li>
                  Abre <strong>Recursos de apoyo</strong> desde la columna izquierda o
                  desde el botón <strong>Recursos</strong> de la barra móvil.
                </li>
                <li>
                  En <strong>Para esta clase</strong> verás el video recomendado y otros
                  recursos disponibles. Puedes cambiar entre ellos con un clic.
                </li>
                <li>
                  Al seleccionar un video, se abre el visor dentro de Wisdom Academy.
                  Usa los controles de YouTube para reproducir, pausar, ajustar el
                  volumen, activar subtítulos o entrar en pantalla completa.
                </li>
                <li>
                  Pulsa <strong>Buscar otros videos</strong> para revisar otras
                  explicaciones sin perder el video actual. El video que estabas viendo
                  queda fijado en la parte superior.
                </li>
                <li>
                  Usa <strong>Volver al video</strong> para recuperar el recurso actual,{' '}
                  <strong>Volver al video anterior</strong> para regresar al anterior y{' '}
                  <strong>Volver al aula</strong> para cerrar el visor y continuar la
                  clase.
                </li>
              </ol>
              <p>
                Si un video no permite la reproducción integrada, el visor conserva su
                título y te ofrece <strong>Reintentar reproducción</strong>,{' '}
                <strong>Abrir en YouTube</strong> o elegir otro recurso. La clase no se
                cierra en ningún caso.
              </p>
              <figure className="wa-guide-figure">
                <Image
                  src="/images/guide/aula-homeschool.png"
                  alt="Aula Homeschool de Wisdom Academy con diapositiva, recursos de apoyo y panel de herramientas."
                  width={1440}
                  height={900}
                  loading="eager"
                  sizes="(max-width: 900px) 100vw, 880px"
                />
                <figcaption>
                  La clase conserva la asignatura, la lección y los recursos mientras
                  el estudiante cambia de video.
                </figcaption>
              </figure>
            </section>

            <section id="cursos" aria-labelledby="titulo-cursos">
              <span className="wa-guide-section-number">06</span>
              <h2 id="titulo-cursos">Cómo utilizar cursos y talleres</h2>
              <p>
                La oferta complementaria se consulta en el{' '}
                <strong>Portal de Cursos y Talleres</strong> del catálogo. Cada tarjeta
                indica el tipo de programa, la modalidad y los recursos incluidos.
              </p>
              <ul className="wa-guide-list">
                <li>
                  <strong>Disponible:</strong> el programa tiene materiales publicados
                  y puedes acceder a ellos si tu cuenta tiene el acceso.
                </li>
                <li>
                  <strong>PRÓXIMAMENTE DISPONIBLE:</strong> el programa ya forma parte
                  del catálogo, pero sus materiales educativos todavía están en
                  preparación. No se muestra una acción para entrar a un aula vacía.
                </li>
                <li>
                  <strong>Error de carga:</strong> si el catálogo no puede recuperar la
                  información, verás un mensaje con <strong>Reintentar</strong>. Un
                  error técnico no significa que el programa esté en preparación.
                </li>
              </ul>
              <p>
                Si ya tienes acceso a un curso o taller, entra desde{' '}
                <strong>Cursos y talleres</strong> en el menú principal. Dentro del
                programa encontrarás <strong>Ruta semanal</strong>,{' '}
                <strong>Materias</strong>, <strong>Cuerpo docente</strong>,{' '}
                <strong>Recursos</strong>, <strong>Evaluaciones</strong> y{' '}
                <strong>Mi progreso</strong>.
              </p>
              <figure className="wa-guide-figure">
                <Image
                  src="/images/guide/cursos-talleres.png"
                  alt="Portal de Cursos y Talleres con tarjetas de programas y avisos de próxima disponibilidad."
                  width={1440}
                  height={900}
                  loading="eager"
                  sizes="(max-width: 900px) 100vw, 880px"
                />
                <figcaption>
                  Las tarjetas distinguen los programas disponibles de los que
                  todavía están en preparación.
                </figcaption>
              </figure>
            </section>

            <section id="consejos" aria-labelledby="titulo-consejos">
              <span className="wa-guide-section-number">07</span>
              <h2 id="titulo-consejos">Consejos para una experiencia organizada</h2>
              <ul className="wa-guide-list">
                <li>
                  Dedica un horario estable al estudio y revisa la{' '}
                  <strong>Ruta diaria</strong> antes de comenzar.
                </li>
                <li>
                  Abre las guías de la materia o del día y tenlas a mano para seguir
                  la secuencia de la clase.
                </li>
                <li>
                  Usa <strong>Apuntes</strong> para registrar ideas, preguntas y
                  ejemplos mientras avanzas en la clase.
                </li>
                <li>
                  Consulta al <strong>Profesor IA</strong> cuando necesites otra
                  explicación y pide apoyo a tu tutor en las sesiones programadas.
                </li>
                <li>
                  Para videos, usa audífonos y la pantalla completa; en móvil, gira el
                  dispositivo a horizontal para una mejor visualización.
                </li>
                <li>
                  Cierra la sesión al terminar si usas un equipo compartido.
                </li>
              </ul>
            </section>

            <section id="problemas" aria-labelledby="titulo-problemas">
              <span className="wa-guide-section-number">08</span>
              <h2 id="titulo-problemas">Solución de problemas frecuentes</h2>
              <dl className="wa-guide-troubleshooting">
                <div>
                  <dt>No puedo ingresar</dt>
                  <dd>
                    Revisa que el usuario o correo y la contraseña estén escritos
                    exactamente como te los entregaron. Si el problema continúa,
                    solicita el restablecimiento a la institución por el canal
                    habitual. La plataforma no ofrece recuperación automática.
                  </dd>
                </div>
                <div>
                  <dt>Una página no carga o se queda cargando</dt>
                  <dd>
                    Comprueba tu conexión y actualiza la página. La experiencia se
                    validó en Microsoft Edge; si usas otro navegador, elige una
                    versión actual. Si el catálogo muestra un error, usa{' '}
                    <strong>Reintentar</strong>.
                  </dd>
                </div>
                <div>
                  <dt>Un video no se reproduce</dt>
                  <dd>
                    Pulsa el botón de reproducción del visor. Si YouTube muestra un
                    mensaje de error, usa <strong>Reintentar reproducción</strong> o{' '}
                    <strong>Abrir en YouTube</strong>. Si el propietario no permite la
                    inserción, elige otro recurso de la clase.
                  </dd>
                </div>
                <div>
                  <dt>No veo Recursos de apoyo</dt>
                  <dd>
                    Abre el botón <strong>Recursos</strong> de la columna izquierda o
                    de la barra móvil. Si el panel estaba contraído, se abrirá sin
                    salir de la clase.
                  </dd>
                </div>
                <div>
                  <dt>Un curso aparece como PRÓXIMAMENTE DISPONIBLE</dt>
                  <dd>
                    Significa que sus materiales todavía no están publicados. No es un
                    error de tu cuenta. Puedes consultar otros programas disponibles
                    en el catálogo.
                  </dd>
                </div>
                <div>
                  <dt>La guía PDF no se descarga</dt>
                  <dd>
                    Usa el enlace <strong>Descargar PDF</strong> de esta página o
                    pulsa <strong>Imprimir guía</strong> y elige «Guardar como PDF» en
                    el navegador.
                  </dd>
                </div>
              </dl>
            </section>

            <section id="preguntas" aria-labelledby="titulo-preguntas">
              <span className="wa-guide-section-number">09</span>
              <h2 id="titulo-preguntas">Preguntas frecuentes</h2>
              <div className="wa-guide-faq">
                <details open>
                  <summary>¿Necesito instalar algún programa?</summary>
                  <p>
                    No. Wisdom Academy funciona en el navegador. Necesitas conexión a
                    internet para cargar las clases y los videos.
                  </p>
                </details>
                <details open>
                  <summary>¿Puedo estudiar desde el teléfono o la tableta?</summary>
                  <p>
                    Sí. La plataforma se adapta a computadora, tableta y teléfono. Para
                    los videos, la pantalla completa y la orientación horizontal
                    facilitan la lectura de los controles.
                  </p>
                </details>
                <details open>
                  <summary>¿Dónde encuentro los materiales de mi grado?</summary>
                  <p>
                    En <strong>Mi portal</strong>, abre la pestaña <strong>Materias</strong>{' '}
                    y selecciona <strong>Abrir aula</strong>. Dentro de la clase, usa{' '}
                    <strong>Guías</strong>, <strong>Recursos de apoyo</strong> y el panel
                    derecho para acceder a los materiales.
                  </p>
                </details>
                <details open>
                  <summary>¿Las clases son en vivo?</summary>
                  <p>
                    El aula incluye <strong>Tutoría en Vivo</strong> cuando la sesión
                    está configurada para tu programa. Si no aparece o no está
                    habilitada, consulta las sesiones programadas con tu tutor.
                  </p>
                </details>
                <details open>
                  <summary>¿Dónde veo mis evaluaciones y avances?</summary>
                  <p>
                    En el aula, abre la pestaña <strong>Moodle</strong> para quizzes y
                    recursos de evaluación. En un curso o taller, revisa{' '}
                    <strong>Evaluaciones</strong> y <strong>Mi progreso</strong>.
                  </p>
                </details>
                <details open>
                  <summary>¿Puedo volver a un video que ya vi?</summary>
                  <p>
                    Sí. En Recursos de apoyo, abre <strong>Buscar otros videos</strong> y
                    revisa <strong>Videos que ya viste</strong>, o usa{' '}
                    <strong>Volver al video anterior</strong> desde el visor.
                  </p>
                </details>
                <details open>
                  <summary>¿Qué significa que un programa esté en preparación?</summary>
                  <p>
                    Que forma parte de la oferta, pero sus materiales todavía no se han
                    publicado. La tarjeta muestra <strong>PRÓXIMAMENTE DISPONIBLE</strong>{' '}
                    y no habilita el acceso a un aula vacía.
                  </p>
                </details>
              </div>
            </section>

            <section id="cierre" aria-labelledby="titulo-cierre">
              <span className="wa-guide-section-number">10</span>
              <h2 id="titulo-cierre">Cierre y bienvenida</h2>
              <p>
                Este es el inicio de un recorrido que se construye día a día. En
                Wisdom Academy encontrarás una ruta, materiales y personas dispuestas
                a acompañarte, pero el aprendizaje también se nutre de tu curiosidad,
                tu constancia y las preguntas que te atrevas a hacer.
              </p>
              <p>
                Empieza por una materia, abre una guía, explora un recurso y anota lo
                que descubras. No necesitas recorrer todo el primer día: avanzar con
                claridad es parte de aprender.
              </p>
              <div className="wa-guide-closing">
                <Image
                  src="/brand/svg/wisdom-icon-color.svg"
                  alt=""
                  width={40}
                  height={40}
                  className="wa-guide-closing-icon wa-guide-closing-icon--light"
                />
                <Image
                  src="/brand/svg/wisdom-icon-on-dark.svg"
                  alt=""
                  width={40}
                  height={40}
                  className="wa-guide-closing-icon wa-guide-closing-icon--dark"
                />
                <div>
                  <strong>Bienvenido a Wisdom Academy.</strong>
                  <p>Tu año escolar empieza aquí, con propósito y acompañamiento.</p>
                </div>
              </div>
              <div className="wa-guide-final-actions">
                <Link href="/#programas" className="wa-guide-action wa-guide-action--primary">
                  Volver al Portal Escolar
                </Link>
                <a
                  href={HOMESCHOOL_GUIDE_PDF_PATH}
                  download
                  className="wa-guide-action wa-guide-action--secondary"
                >
                  Descargar PDF
                </a>
              </div>
            </section>
          </div>
        </div>

        <footer className="wa-guide-footer">
          <Image
            src="/brand/svg/wisdom-logo-horizontal-on-dark.svg"
            alt="Wisdom Academy"
            width={170}
            height={22}
          />
          <p>
            Guía de bienvenida Homeschool · Edición 2026–2027 · Documento
            institucional
          </p>
        </footer>
      </article>
    </main>
  );
}
