import React from 'react';
import Link from 'next/link';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  icon?: React.ReactNode;
  banner?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  actions,
  meta,
  breadcrumbs,
  icon,
  banner = false,
}) => (
  <div>
    {breadcrumbs && breadcrumbs.length > 0 && (
      <nav className="wa-breadcrumbs" aria-label="Migas de pan">
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && <WisdomIcon name="chevron-right" size={11} color="current" />}
            {item.href ? <Link href={item.href}>{item.label}</Link> : <strong>{item.label}</strong>}
          </React.Fragment>
        ))}
      </nav>
    )}
    <header className={`wa-page-head${banner ? ' has-banner' : ''}`}>
      <div className="wa-page-head-layout">
        {icon && <span className="wa-page-head-icon">{icon}</span>}
        <div className="wa-page-head-main">
          {eyebrow && <span className="wa-eyebrow">{eyebrow}</span>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>
      {(actions || meta) && (
        <div className="wa-page-head-actions">
          {meta}
          {actions}
        </div>
      )}
    </header>
  </div>
);
