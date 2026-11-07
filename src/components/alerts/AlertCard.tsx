import {Clock3} from 'lucide-react';
import {alertDescription, formatAlertStatus, formatRelativeTime} from '../../lib/appView';
import type {AlertStatus, UserAlert} from '../../types';
import {RiskBadge} from '../common/RiskBadge';
import {Button} from '../ui/Button';
import {Card} from '../ui/Card';
import {RISK_ICON_SURFACE, RiskGlyph} from '../apps/riskVisual';

const STATUS_CLASS: Record<AlertStatus, string> = {
  open: 'bg-risk-high-soft text-risk-high border-risk-high-ring',
  read: 'bg-brand-soft text-brand-info border-line-subtle',
  resolved: 'bg-risk-safe-soft text-risk-safe border-risk-safe-ring',
};

export function AlertCard({
  alert,
  onViewApplication,
}: {
  alert: UserAlert;
  onViewApplication?: () => void;
}) {
  const timestamp = formatRelativeTime(alert.createdAt);
  const permission = alert.permissionLabel?.trim() || '';
  const description = alertDescription(alert);

  return (
    <Card className="cf-card-interactive">
      <div className="flex items-start gap-3">
        <div
          className={`w-11 h-11 shrink-0 rounded-cf-md flex items-center justify-center ${RISK_ICON_SURFACE[alert.severity]}`}
        >
          <RiskGlyph level={alert.severity} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge risk={alert.severity} />
            <span className={`cf-badge inline-flex rounded-cf-pill border px-2 py-0.5 ${STATUS_CLASS[alert.status]}`}>
              {formatAlertStatus(alert.status).toUpperCase()}
            </span>
          </div>
          <h3 className="cf-card-title mt-2 break-words">{alert.title}</h3>
        </div>
      </div>

      <dl className="mt-3 space-y-1.5">
        <div>
          <dt className="cf-caption">Application</dt>
          <dd className="cf-body mt-0.5 truncate" title={alert.appName}>{alert.appName}</dd>
        </div>
        {permission ? (
          <div>
            <dt className="cf-caption">Permission</dt>
            <dd className="cf-body mt-0.5">{permission}</dd>
          </div>
        ) : null}
      </dl>

      <p className="cf-secondary mt-3">{description}</p>

      {timestamp ? (
        <p className="cf-secondary mt-2 flex items-center gap-1">
          <Clock3 size={12} aria-hidden="true" />
          <time dateTime={alert.createdAt?.toISOString()}>{timestamp}</time>
        </p>
      ) : null}

      {onViewApplication ? (
        <Button
          variant="secondary"
          className="w-full mt-4"
          onClick={onViewApplication}
        >
          View application
        </Button>
      ) : null}
    </Card>
  );
}
