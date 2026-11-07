import {BellRing, ShieldAlert, Smartphone, TriangleAlert} from 'lucide-react';
import {MetricCard} from '../ui/MetricCard';

export function SecurityOverview({
  totalApps,
  highRiskApps,
  mediumRiskApps,
  openAlerts,
}: {
  totalApps: number;
  highRiskApps: number;
  mediumRiskApps: number;
  openAlerts: number;
}) {
  return (
    <section aria-labelledby="security-overview-heading">
      <h2 id="security-overview-heading" className="cf-section-title mb-3">
        Security Overview
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          label="Connected Apps"
          value={totalApps}
          hint="In your account"
          icon={<Smartphone size={16} />}
        />
        <MetricCard
          label="High Risk"
          value={highRiskApps}
          hint="Needs review"
          tone="high"
          icon={<ShieldAlert size={16} />}
        />
        <MetricCard
          label="Medium Risk"
          value={mediumRiskApps}
          hint="Worth a look"
          tone="medium"
          icon={<TriangleAlert size={16} />}
        />
        <MetricCard
          label="Open Alerts"
          value={openAlerts}
          hint="Still open"
          tone={openAlerts > 0 ? 'high' : 'default'}
          icon={<BellRing size={16} />}
        />
      </div>
    </section>
  );
}
