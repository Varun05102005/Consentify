import {RISK_LABEL} from '../../lib/ui';
import {Card} from '../ui/Card';
import {EmptyState} from '../ui/EmptyState';
import {SectionHeader} from '../ui/SectionHeader';

export function RiskDistribution({
  highRiskApps,
  mediumRiskApps,
  safeApps,
  totalApps,
}: {
  highRiskApps: number;
  mediumRiskApps: number;
  safeApps: number;
  totalApps: number;
}) {
  const segments = [
    {level: 'High' as const, count: highRiskApps, bar: 'bg-risk-high'},
    {level: 'Medium' as const, count: mediumRiskApps, bar: 'bg-risk-medium'},
    {level: 'Safe' as const, count: safeApps, bar: 'bg-risk-safe'},
  ];

  return (
    <section>
      <SectionHeader
        title="Risk Distribution"
        subtitle="How your connected applications are currently classified."
      />

      {totalApps === 0 ? (
        <div className="mt-3">
          <EmptyState headingLevel={3} title="No connected applications yet" />
        </div>
      ) : (
        <Card className="mt-3">
          <div
            className="flex h-3 w-full overflow-hidden rounded-cf-pill bg-canvas-subtle"
            role="img"
            aria-label={`High ${highRiskApps}, Medium ${mediumRiskApps}, Safe ${safeApps}`}
          >
            {segments.map((segment) => (
              segment.count > 0 ? (
                <div
                  key={segment.level}
                  className={segment.bar}
                  style={{flexGrow: segment.count, flexBasis: 0}}
                  title={`${RISK_LABEL[segment.level]} ${segment.count}`}
                />
              ) : null
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {segments.map((segment) => (
              <div key={segment.level} className="text-center min-w-0">
                <p className="cf-caption flex items-center justify-center gap-1.5">
                  <span className={`inline-block h-2 w-2 rounded-full ${segment.bar}`} aria-hidden="true" />
                  {RISK_LABEL[segment.level]}
                </p>
                <p className="cf-metric mt-2 text-lg">{segment.count}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}
