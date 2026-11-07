import type {ReactNode} from 'react';

export function EmptyState({
  title,
  description,
  action,
  icon,
  headingLevel = 2,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  headingLevel?: 2 | 3;
}) {
  const TitleTag = headingLevel === 3 ? 'h3' : 'h2';

  return (
    <div className="bg-surface border border-line-subtle rounded-cf-lg shadow-cf-card p-[var(--cf-card-pad)] cf-fade-in">
      {icon ? <div className="text-brand mb-3">{icon}</div> : null}
      <TitleTag className="cf-card-title">{title}</TitleTag>
      {description ? <p className="cf-secondary mt-2">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
