import {RISK_TEXT_CLASS} from '../apps/riskVisual';

export function AlertSummary({
  openCount,
  highCount,
  mediumCount,
  resolvedCount,
}: {
  openCount: number;
  highCount: number;
  mediumCount: number;
  resolvedCount: number;
}) {
  const items = [
    {label: 'Open', value: openCount, className: 'text-fg'},
    {label: 'High', value: highCount, className: RISK_TEXT_CLASS.High},
    {label: 'Medium', value: mediumCount, className: RISK_TEXT_CLASS.Medium},
    {label: 'Resolved', value: resolvedCount, className: RISK_TEXT_CLASS.Safe},
  ];

  return (
    <section aria-label="Alert summary">
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
