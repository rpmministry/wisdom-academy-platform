import React from 'react';
import { requirePageUser } from '@/server/auth/pageAuth';
import { listAccessiblePrograms } from '@/server/domain/coursePrograms';
import { accessibleResources } from '@/server/domain/access';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { ProgramCard } from '@/components/courses/ProgramCard';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const user = await requirePageUser();
  const programs = listAccessiblePrograms(user);
  const courses = programs.filter((program) => program.kind === 'course');
  const workshops = programs.filter((program) => program.kind === 'workshop');
  const lessons = programs.reduce((total, program) => total + program.lessonCount, 0);
  const reviews = programs.reduce((total, program) => total + program.publishedReviews, 0);
  const schoolPrograms = accessibleResources(user).filter(
    (resource) => resource.type === 'homeschool_program' || resource.type === 'grade'
  );

  return (
    <main className="wa-portal-page">
      <PageHeader
        breadcrumbs={[
          { label: 'Mi portal', href: '/dashboard' },
          { label: 'Cursos y talleres' },
        ]}
        eyebrow="Ruta de aprendizaje"
        title="Cursos y talleres habilitados"
        description="Los cursos avanzan por semestres o módulos con clases, repasos y evaluaciones. Los talleres son experiencias intensivas orientadas a un resultado concreto. El acceso se verifica en el servidor para cada programa."
        actions={
          <>
            <ButtonLink
              href="/dashboard"
              variant="secondary"
              size="sm"
              icono={<WisdomIcon name="home" size={14} />}
            >
              Mi portal
            </ButtonLink>
            <ButtonLink href="/catalogo#programas" variant="ghost" size="sm">
              Explorar catálogo
            </ButtonLink>
          </>
        }
      />

      <div className="wa-stat-strip" aria-label="Resumen de programas habilitados">
        <div>
          <strong>{courses.length}</strong>
          <span>cursos habilitados</span>
        </div>
        <div>
          <strong>{workshops.length}</strong>
          <span>talleres habilitados</span>
        </div>
        <div>
          <strong>{schoolPrograms.length}</strong>
          <span>programas escolares</span>
        </div>
        <div>
          <strong>{lessons}</strong>
          <span>clases disponibles</span>
        </div>
        <div>
          <strong>{reviews}</strong>
          <span>repasos publicados</span>
        </div>
      </div>

      <section aria-labelledby="courses-heading">
        <div className="wa-section-head">
          <div>
            <h2 id="courses-heading">Cursos</h2>
            <p>Itinerarios completos con clases, repasos y evaluaciones por semestre.</p>
          </div>
          <span className="wa-count">{courses.length} programa(s)</span>
        </div>
        {courses.length > 0 ? (
          <div className="wa-program-grid">
            {courses.map((program) => (
              <ProgramCard
                key={program.id}
                title={program.title}
                description={program.description}
                href={`/cursos/${program.slug}`}
                kind="course"
                institution={program.institution}
                level={program.level}
                durationLabel={program.durationLabel}
                moduleCount={program.moduleCount}
                lessonCount={program.lessonCount}
                publishedReviews={program.publishedReviews}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sin cursos habilitados"
            description="No hay cursos publicados con acceso vigente para tu cuenta. Puedes revisar tus derechos o explorar el catálogo."
            action={<ButtonLink href="/mi-acceso" variant="secondary" size="sm">Revisar mi acceso</ButtonLink>}
          />
        )}
      </section>

      <section aria-labelledby="workshops-heading">
        <div className="wa-section-head">
          <div>
            <h2 id="workshops-heading">Talleres</h2>
            <p>Experiencias intensivas con objetivos, materiales y entregables concretos.</p>
          </div>
          <span className="wa-count">{workshops.length} programa(s)</span>
        </div>
        {workshops.length > 0 ? (
          <div className="wa-program-grid">
            {workshops.map((program) => (
              <ProgramCard
                key={program.id}
                title={program.title}
                description={program.description}
                href={`/cursos/${program.slug}`}
                kind="workshop"
                institution={program.institution}
                level={program.level}
                durationLabel={program.durationLabel}
                moduleCount={program.moduleCount}
                lessonCount={program.lessonCount}
                publishedReviews={program.publishedReviews}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Sin talleres habilitados"
            description="No hay talleres publicados con acceso vigente para tu cuenta."
            icon="sparkles"
            action={<ButtonLink href="/catalogo#programas" variant="secondary" size="sm">Ver catálogo</ButtonLink>}
          />
        )}
      </section>

      {schoolPrograms.length > 0 && (
        <section id="programas-escolares" aria-labelledby="school-programs-heading">
          <div className="wa-section-head">
            <div>
              <h2 id="school-programs-heading">Programas escolares</h2>
              <p>Rutas de grado y homeschool con acceso vigente, separadas de los cursos y talleres.</p>
            </div>
            <span className="wa-count">{schoolPrograms.length} programa(s)</span>
          </div>
          <div className="wa-program-grid">
            {schoolPrograms.map((resource) => (
              <article key={resource.id} className="wa-program-card">
                <div className="wa-program-card-top">
                  <span className="wa-program-card-icon">
                    <WisdomIcon
                      name={resource.type === 'grade' ? 'layout' : 'graduation-cap'}
                      size={18}
                    />
                  </span>
                  <Badge variant="navy" size="sm">
                    {resource.type === 'grade' ? 'Grado' : 'Programa Homeschool'}
                  </Badge>
                </div>
                <h3>{resource.title}</h3>
                <p>{resource.description}</p>
                <div className="wa-program-card-meta">
                  <span className="wa-chip is-study">
                    <WisdomIcon name="shield" size={12} /> Acceso verificado
                  </span>
                </div>
                <ButtonLink
                  href={`/recurso/${resource.slug}`}
                  variant="primary-navy"
                  size="sm"
                  className="wa-program-card-action"
                >
                  Abrir programa
                </ButtonLink>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

