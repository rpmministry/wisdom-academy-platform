import React from 'react';
import { WisdomIcon } from '@/components/ui/WisdomIcon';

export interface EmptyStateProps {
  icon?: React.ComponentProps<typeof WisdomIcon>['name'];
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'book',
  title,
  description,
  action,
}) => (
  <div className="wa-empty-state" role="status">
    <span className="wa-empty-state-icon" aria-hidden="true">
      <WisdomIcon name={icon} size={20} />
    </span>
    <h2>{title}</h2>
    {description && <p>{description}</p>}
    {action}
  </div>
);
