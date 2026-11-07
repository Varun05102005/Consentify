import type {RiskLevel} from '../../types';
import {RISK_TEXT_CLASS} from './riskVisual';

export function AppSummary({
  totalApps,
  highRiskApps,
  mediumRiskApps,
  safeApps,
}: {
  totalApps: number;
  highRiskApps: number;
  mediumRiskApps: number;
  safeApps: number;
}) {
  const items = [
    {label: 'Total Apps', value: totalApps, className: 'text-fg'},
    {label: 'High Risk', value: highRiskApps, className: RISK_TEXT_CLASS.High},
    {label: 'Needs Attention', value: mediumRiskApps, className: RISK_TEXT_CLASS.Medium},
    {label: 'Safe', value: safeApps, className: RISK_TEXT_CLASS.Safe},
  ];

  return (
    <section aria-label="Application risk summary">
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-cf-md border border-line-subtle bg-surface px-3 py-2.5"
          >
            <p className={`text-lg font-bold tabular-nums leading-none ${item.className}`}>{item.value}</p>
            <p className="cf-caption mt-1.5">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
