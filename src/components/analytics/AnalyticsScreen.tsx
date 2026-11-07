import {ChartNoAxesCombined} from 'lucide-react';
import {useAnalyticsData} from '../../hooks/useAnalyticsData';
import type {AppRiskResult, ConsentifyMetrics, UserApp} from '../../types';
import {EmptyState} from '../ui/EmptyState';
import {ErrorState} from '../ui/ErrorState';
import {LoadingState} from '../ui/LoadingState';
import {AnalyticsScoreCard} from './AnalyticsScoreCard';
import {ApplicationRiskList} from './ApplicationRiskList';
import {PermissionFrequency} from './PermissionFrequency';
import {RiskContributors} from './RiskContributors';
import {RiskMethodology} from './RiskMethodology';
import {RiskOverview} from './RiskOverview';

export function AnalyticsScreenView({
  metrics,
  apps,
  appRiskById,
  isLoading,
  error,
  onRetry,
}: {
  metrics: ConsentifyMetrics | null;
  apps: UserApp[] | null;
  appRiskById: Map<string, AppRiskResult> | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  const hasApps = (apps?.length ?? 0) > 0;
  const appRisks = appRiskById ? [...appRiskById.values()] : [];

  return (
    <div className="cf-screen">
      <header>
        <p className="cf-caption">Analytics</p>
        <h1 className="cf-page-title mt-1">Privacy Analytics</h1>
        <p className="cf-secondary mt-2">
          Understand how your connected applications contribute to your current privacy score.
        </p>
      </header>

      {isLoading && !metrics ? (
        <LoadingState message="Loading your privacy analytics..." />
      ) : null}

      {error && !metrics ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : null}

      {metrics ? (
        <>
          {error ? (
            <ErrorState message={error} onRetry={onRetry} />
          ) : null}

          <AnalyticsScoreCard score={metrics.privacyScore} />

          {hasApps && apps && appRiskById ? (
            <>
              <RiskOverview
                highRiskApps={metrics.highRiskApps}
                mediumRiskApps={metrics.mediumRiskApps}
                safeApps={metrics.safeApps}
                totalApps={metrics.totalApps}
              />
              <ApplicationRiskList apps={apps} appRiskById={appRiskById} />
              <PermissionFrequency permissionUsage={metrics.permissionUsage} />
              <RiskContributors appRisks={appRisks} />
            </>
          ) : (
            <EmptyState
              icon={<ChartNoAxesCombined size={28} aria-hidden="true" />}
              title="No application data yet"
              description="Connect application permission data to begin analyzing privacy risk."
            />
          )}

          <RiskMethodology />
        </>
      ) : null}
    </div>
  );
}

export const AnalyticsScreen = () => {
  const {metrics, apps, appRiskById, isLoading, error, refresh} = useAnalyticsData();

  return (
    <AnalyticsScreenView
      metrics={metrics}
      apps={apps}
      appRiskById={appRiskById}
      isLoading={isLoading}
      error={error}
      onRetry={() => { void refresh(); }}
    />
  );
};
