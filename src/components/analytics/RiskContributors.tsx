import type {AppRiskResult} from '../../types';
import {Card} from '../ui/Card';
import {SectionHeader} from '../ui/SectionHeader';

export function contributorCounts(appRisks: AppRiskResult[]): Array<{label: string; count: number}> {
  const counts = new Map<string, number>();

  for (const result of appRisks) {
    const label = result.topContributorLabel?.trim();
    if (!label) {
      continue;
    }
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({label, count}))
    .sort((left, right) => right.count - left.count);
}

export function RiskContributors({appRisks}: {appRisks: AppRiskResult[]}) {
  const items = contributorCounts(appRisks);
  if (items.length === 0) {
    return null;
  }

  return (
    <section>
      <SectionHeader
        title="Risk Contributors"
        subtitle="Permissions that are currently the top calculated contributor for one or more applications."
      />
      <Card className="mt-3">
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-3 min-w-0">
              <span className="cf-body truncate">{item.label}</span>
              <span className="cf-secondary shrink-0">
                {item.count} {item.count === 1 ? 'app' : 'apps'}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
