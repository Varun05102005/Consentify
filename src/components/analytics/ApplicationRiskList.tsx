import {formatScore} from '../../lib/ui';
import type {AppRiskResult, UserApp} from '../../types';
import {RiskBadge} from '../common/RiskBadge';
import {Card} from '../ui/Card';
import {EmptyState} from '../ui/EmptyState';
import {SectionHeader} from '../ui/SectionHeader';
import {AppIcon} from '../apps/AppIcon';
import {RISK_TEXT_CLASS, RiskGlyph} from '../apps/riskVisual';

export function ApplicationRiskList({
  apps,
  appRiskById,
}: {
  apps: UserApp[];
  appRiskById: Map<string, AppRiskResult>;
}) {
  const ranked = [...apps]
    .map((app) => ({app, appRisk: appRiskById.get(app.id)}))
    .filter((item): item is {app: UserApp; appRisk: AppRiskResult} => Boolean(item.appRisk))
    .sort((left, right) => right.appRisk.riskScore - left.appRisk.riskScore);

  return (
    <section>
      <SectionHeader
        title="Application Risk"
        subtitle="Calculated risk for each active connected application."
      />
      <div className="mt-3 space-y-2">
        {ranked.length === 0 ? (
          <EmptyState headingLevel={3} title="No application risk to display" />
        ) : (
          ranked.map(({app, appRisk}) => {
            const contributor = appRisk.topContributorLabel?.trim() || '';
            return (
              <div key={app.id}>
                <Card padding="sm" className="flex items-start gap-3">
                  <AppIcon icon={app.icon} name={app.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="cf-card-title truncate">{app.name}</h3>
                      <RiskBadge risk={appRisk.riskLevel} />
                    </div>
                    <p className={`cf-secondary mt-1 flex items-center gap-1 ${RISK_TEXT_CLASS[appRisk.riskLevel]}`}>
                      <RiskGlyph level={appRisk.riskLevel} size={14} />
                      Privacy Risk {formatScore(appRisk.riskScore)}
                    </p>
                    <p className="cf-secondary mt-0.5 truncate">
                      {contributor ? `Top risk: ${contributor}` : 'Risk contributors unavailable'}
                    </p>
                  </div>
                </Card>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
