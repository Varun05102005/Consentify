import {ChevronRight} from 'lucide-react';
import {formatAppStatus, permissionStatusSummary} from '../../lib/appView';
import {formatScore} from '../../lib/ui';
import type {AppRiskResult, UserApp} from '../../types';
import {RiskBadge} from '../common/RiskBadge';
import {AppIcon} from './AppIcon';
import {RiskGlyph, RISK_TEXT_CLASS} from './riskVisual';

export function AppCard({
  app,
  appRisk,
  onSelect,
}: {
  app: UserApp;
  appRisk: AppRiskResult;
  onSelect: () => void;
}) {
  const packageName = app.packageName?.trim() || '';
  const contributor = appRisk.topContributorLabel?.trim() || '';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`${app.name}, ${appRisk.riskLevel} risk, privacy risk ${appRisk.riskScore}`}
      className="cf-app-card w-full text-left bg-surface border border-line-subtle rounded-cf-lg shadow-cf-card p-[var(--cf-card-pad)]"
    >
      <div className="flex items-start gap-3">
        <AppIcon icon={app.icon} name={app.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="cf-card-title truncate">{app.name}</h3>
              {packageName ? (
                <p className="cf-secondary truncate">{packageName}</p>
              ) : null}
            </div>
            <ChevronRight size={18} className="shrink-0 text-fg-muted mt-0.5" aria-hidden="true" />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RiskBadge risk={appRisk.riskLevel} />
            <span className={`cf-secondary flex items-center gap-1 ${RISK_TEXT_CLASS[appRisk.riskLevel]}`}>
              <RiskGlyph level={appRisk.riskLevel} size={14} />
              Privacy Risk {formatScore(appRisk.riskScore)}
            </span>
            {app.status !== 'connected' ? (
              <span className="cf-caption">{formatAppStatus(app.status)}</span>
            ) : null}
          </div>

          <p className="cf-secondary mt-2">
            {contributor ? `Top risk: ${contributor}` : 'Risk contributors unavailable'}
          </p>
          <p className="cf-secondary mt-1">{permissionStatusSummary(app.permissions)}</p>
        </div>
      </div>
    </button>
  );
}
