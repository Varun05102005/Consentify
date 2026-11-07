import type {ReactNode} from 'react';

const ICON_TONE = {
  default: 'bg-brand-soft text-brand',
  high: 'bg-risk-high-soft text-risk-high',
  medium: 'bg-risk-medium-soft text-risk-medium',
  safe: 'bg-risk-safe-soft text-risk-safe',
  info: 'bg-brand-soft text-brand-info',
} as const;

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  className = '',
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: keyof typeof ICON_TONE;
  className?: string;
}) {
  return (
    <div className={`cf-card-interactive bg-surface border border-line-subtle rounded-cf-lg shadow-cf-card p-[var(--cf-card-pad)] ${className}`}>
      {icon ? (
        <div className={`w-8 h-8 rounded-cf-md flex items-center justify-center mb-3 ${ICON_TONE[tone]}`}>
          {icon}
        </div>
      ) : null}
      <div className="cf-metric text-[1.5rem]">{value}</div>
      <div className="cf-caption mt-1">{label}</div>
      {hint ? <p className="cf-secondary mt-2">{hint}</p> : null}
    </div>
  );
}
