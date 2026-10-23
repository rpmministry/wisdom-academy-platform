import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export interface ProgramCardProps {
  title: string;
  description?: string | null;
  href: string;
  kind: 'course' | 'workshop';
  institution?: string | null;
  level?: string | null;
  durationLabel?: string | null;
  moduleCount: number;
  lessonCount: number;
  publishedReviews: number;
}

export const ProgramCard: React.FC<ProgramCardProps> = ({
  title,
  description,
  href,
  kind,
  institution,
  level,
  durationLabel,
  moduleCount,
  lessonCount,
  publishedReviews,
}) => {
  const isWorkshop = kind === 'workshop';
  return (
    <article className="wa-program-card">
      <div className="wa-program-card-top">
        <span className="wa-program-card-icon">
          <WisdomIcon name={isWorkshop ? 'sparkles' : 'book'} size={18} />
        </span>
        <Badge variant={isWorkshop ? 'gold' : 'emerald'} size="sm">
          {isWorkshop ? 'Taller' : 'Curso'}
        </Badge>
        {level && <span className="wa-chip">{level}</span>}
        {durationLabel && <span className="wa-chip">{durationLabel}</span>}
      </div>
      <h3>{title}</h3>
      {institution && <span className="wa-chip">{institution}</span>}
      <p>{description || (isWorkshop ? 'Consulta los objetivos y materiales del taller.' : 'Consulta la ficha completa del programa.')}</p>
      <div className="wa-program-card-meta">
        <span className="wa-chip">{moduleCount} {isWorkshop ? 'módulos' : 'semestres'}</span>
        <span className="wa-chip">{lessonCount} clases</span>
        <span className="wa-chip">{publishedReviews} repasos</span>
      </div>
      <ButtonLink
        href={href}
        variant={isWorkshop ? 'primary-navy' : 'primary-gold'}
        size="sm"
        className="wa-program-card-action"
      >
        {isWorkshop ? 'Abrir taller' : 'Abrir curso'}
      </ButtonLink>
    </article>
  );
};
