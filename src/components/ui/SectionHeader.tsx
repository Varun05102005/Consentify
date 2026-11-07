import type {ReactNode} from 'react';

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="cf-section-title">{title}</h2>
        {subtitle ? <p className="cf-secondary mt-1">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
