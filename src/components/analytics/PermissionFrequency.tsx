import type {ConsentifyMetrics} from '../../types';
import {Card} from '../ui/Card';
import {EmptyState} from '../ui/EmptyState';
import {SectionHeader} from '../ui/SectionHeader';

export function PermissionFrequency({
  permissionUsage,
}: {
  permissionUsage: ConsentifyMetrics['permissionUsage'];
}) {
  return (
    <section>
      <SectionHeader
        title="Top Permissions Granted"
        subtitle="Permissions currently recorded as granted across active applications."
      />
      <div className="mt-3">
        {permissionUsage.length === 0 ? (
          <EmptyState
            headingLevel={3}
            title="No granted permissions"
            description="No permissions are currently recorded as granted."
          />
        ) : (
          <Card>
            <ul className="space-y-3">
              {permissionUsage.map((item) => (
                <li key={item.type} className="flex items-center justify-between gap-3 min-w-0">
                  <span className="cf-body truncate">{item.label}</span>
                  <span className="cf-card-title tabular-nums shrink-0">{item.appCount}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </section>
  );
}
