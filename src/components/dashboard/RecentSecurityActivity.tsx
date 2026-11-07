import {Clock3, ShieldAlert, ShieldCheck, TriangleAlert} from 'lucide-react';
import {alertDescription, formatRelativeTime} from '../../lib/appView';
import type {UserAlert} from '../../types';
import {RiskBadge} from '../common/RiskBadge';
import {Button} from '../ui/Button';
import {Card} from '../ui/Card';
import {EmptyState} from '../ui/EmptyState';
import {SectionHeader} from '../ui/SectionHeader';

function SeverityIcon({severity}: {severity: UserAlert['severity']}) {
  if (severity === 'High') {
    return <ShieldAlert size={18} aria-hidden="true" />;
  }
  if (severity === 'Medium') {
    return <TriangleAlert size={18} aria-hidden="true" />;
  }
  return <ShieldCheck size={18} aria-hidden="true" />;
}

function severityIconClass(severity: UserAlert['severity']): string {
  if (severity === 'High') {
    return 'bg-risk-high-soft text-risk-high';
  }
  if (severity === 'Medium') {
    return 'bg-risk-medium-soft text-risk-medium';
  }
  return 'bg-risk-safe-soft text-risk-safe';
}

export function RecentSecurityActivity({
  alerts,
  onViewAll,
}: {
  alerts: UserAlert[];
  onViewAll: () => void;
}) {
  return (
    <section>
      <SectionHeader
        title="Recent Security Activity"
        action={
          <Button variant="ghost" className="shrink-0" onClick={onViewAll}>
            View all alerts
          </Button>
        }
      />

      {alerts.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            headingLevel={3}
            icon={<ShieldAlert size={28} aria-hidden="true" />}
            title="No security alerts"
            description="Your connected applications currently have no generated risk alerts."
          />
        </div>
      ) : (
        <ul className="mt-3 space-y-2">
          {alerts.map((alert) => {
            const timestamp = formatRelativeTime(alert.createdAt);
            return (
              <li key={alert.id}>
                <Card className="flex items-start gap-3 cf-card-interactive">
                  <div
                    className={`w-11 h-11 shrink-0 rounded-cf-md flex items-center justify-center ${severityIconClass(alert.severity)}`}
                    aria-hidden="true"
                  >
                    <SeverityIcon severity={alert.severity} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="cf-card-title truncate">{alert.appName}</h3>
                      <RiskBadge risk={alert.severity} />
                    </div>
                    {alert.permissionLabel ? (
                      <p className="cf-caption mt-1 normal-case tracking-normal">
                        {alert.permissionLabel}
                      </p>
                    ) : null}
                    <p className="cf-secondary mt-1">{alertDescription(alert)}</p>
                    {timestamp ? (
                      <p className="cf-secondary mt-1 flex items-center gap-1">
                        <Clock3 size={12} aria-hidden="true" />
                        <time dateTime={alert.createdAt?.toISOString()}>{timestamp}</time>
                      </p>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
