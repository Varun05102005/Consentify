import {ChartNoAxesCombined, Grid2X2, Loader2, ScanSearch} from 'lucide-react';
import {Button} from '../ui/Button';
import {SectionHeader} from '../ui/SectionHeader';

export function QuickActions({
  onScan,
  onViewApps,
  onViewAnalytics,
  isScanning,
}: {
  onScan: () => void;
  onViewApps: () => void;
  onViewAnalytics: () => void;
  isScanning: boolean;
}) {
  const actionClass =
    'w-full justify-start min-h-11 group hover:shadow-cf-elevated';
  const iconClass = 'shrink-0';

  return (
    <section>
      <SectionHeader title="Quick Actions" />
      <div className="mt-3 grid grid-cols-1 gap-2">
        <Button
          className={actionClass}
          onClick={onScan}
          disabled={isScanning}
          aria-busy={isScanning}
          aria-label="Scan stored application permissions for privacy-risk alerts"
        >
          {isScanning ? (
            <Loader2 size={18} className={`${iconClass} motion-safe:animate-spin`} aria-hidden="true" />
          ) : (
            <ScanSearch size={18} className={iconClass} aria-hidden="true" />
          )}
          {isScanning ? 'Checking permissions…' : 'Scan Applications'}
        </Button>
        <Button
          variant="secondary"
          className={actionClass}
          onClick={onViewApps}
        >
          <Grid2X2 size={18} className={iconClass} aria-hidden="true" />
          View Applications
        </Button>
        <Button
          variant="secondary"
          className={actionClass}
          onClick={onViewAnalytics}
        >
          <ChartNoAxesCombined size={18} className={iconClass} aria-hidden="true" />
          View Analytics
        </Button>
      </div>
    </section>
  );
}
