import {Card} from '../ui/Card';
import {ProgressBar} from '../ui/ProgressBar';
import {RiskBadge} from '../common/RiskBadge';
import type {AppRiskResult} from '../../types';
import {progressTone, RiskGlyph, RISK_TEXT_CLASS} from './riskVisual';

export function AppRiskHero({appRisk}: {appRisk: AppRiskResult}) {
  const tone = progressTone(appRisk.riskLevel);
  const contributor = appRisk.topContributorLabel?.trim() || '';

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <p className="cf-caption">Privacy Risk</p>
        <RiskBadge risk={appRisk.riskLevel} />
      </div>

      <div className="mt-4 flex items-end gap-2">
        <span className={RISK_TEXT_CLASS[appRisk.riskLevel]}>
          <RiskGlyph level={appRisk.riskLevel} size={22} />
        </span>
        <span className={`text-[2.25rem] leading-none font-bold tracking-tight tabular-nums ${RISK_TEXT_CLASS[appRisk.riskLevel]}`}>
          {appRisk.riskScore}
        </span>
        <span className="cf-secondary mb-1">/ 100</span>
      </div>

      <div className="mt-4">
        <ProgressBar
          value={appRisk.riskScore}
          tone={tone}
          label={`Privacy risk ${appRisk.riskScore} out of 100, ${appRisk.riskLevel}`}
        />
      </div>

      <p className="cf-caption mt-4">Top risk contributor</p>
      <p className="cf-body mt-1">
        {contributor || 'Risk contributors unavailable'}
      </p>
    </Card>
  );
}
