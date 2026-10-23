import React from 'react';
import Image from 'next/image';
import { requirePageGlobalContent } from '@/server/auth/pageAuth';
import { accessibleResources } from '@/server/domain/access';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export const dynamic = 'force-dynamic';

const TYPE_LABEL: Record<string, string> = {
  course: 'Curso',
  workshop: 'Taller',
  grade: 'Grado',
  homeschool_program: 'Programa Homeschool',
  material: 'Material digital',
  collection: 'Colección',
};

export default async function GlobalContentPage() {
  const user = await requirePageGlobalContent();
  const resources = accessibleResources(user);

  return (
    <main className="wa-portal-page">
      <PageHeader
        breadcrumbs={[
          { label: 'Mi portal', href: '/dashboard' },
          { label: 'Contenidos' },
        ]}
        eyebrow="Explorador de contenidos"
        title="Espacios formativos habilitados"
        description="Tu autorización global concede acceso a los contenidos publicados, pero no al CRM, a la administración ni a expedientes privados de estudiantes. El servidor vuelve a comprobar el derecho en cada recurso."
        banner
        icon={<Image src="/brand/svg/wisdom-icon-color.svg" alt="Wisdom Academy" width={56} height={56} priority />}
        actions={
          <>
            <ButtonLink href="/catalogo#programas" variant="secondary" size="sm">Catálogo</ButtonLink>
            <ButtonLink href="/dashboard" variant="ghost" size="sm">Mi portal</ButtonLink>
          </>
        }
      />

      <div className="wa-stat-strip" aria-label="Resumen de contenidos">
        <div>
          <strong>{resources.length}</strong>
          <span>recursos habilitados</span>
        </div>
        <div>
          <strong>{new Set(resources.map((resource) => resource.type)).size}</strong>
          <span>tipos de contenido</span>
        </div>
      </div>

      {resources.length > 0 ? (
        <div className="wa-program-grid">
          {resources.map((resource) => (
            <article key={resource.id} className="wa-program-card">
              <div className="wa-program-card-top">
                <span className="wa-program-card-icon">
                  <WisdomIcon
                    name={resource.type === 'material' ? 'file-text' : resource.type === 'workshop' ? 'sparkles' : 'book'}
                    size={18}
                  />
                </span>
                <Badge variant="navy" size="sm">
                  {TYPE_LABEL[resource.type] || resource.type}
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
                variant="primary-gold"
                size="sm"
                className="wa-program-card-action"
                icono={<WisdomIcon name="arrow-right" size={14} />}
              >
                Abrir recurso
              </ButtonLink>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Sin contenidos publicados"
          description="No hay contenidos publicados disponibles para tu autorización actual."
          action={<ButtonLink href="/catalogo#programas" variant="secondary" size="sm">Explorar catálogo</ButtonLink>}
        />
      )}
    </main>
  );
}
