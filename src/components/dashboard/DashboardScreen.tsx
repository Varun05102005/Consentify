import {useState} from 'react';
import {Grid2X2, Loader2} from 'lucide-react';
import {useDashboardData} from '../../hooks/useDashboardData';
import type {ActiveTab} from '../../types';
import {Button} from '../ui/Button';
import {Divider} from '../ui/Divider';
import {EmptyState} from '../ui/EmptyState';
import {ErrorState} from '../ui/ErrorState';
import {LoadingState} from '../ui/LoadingState';
import {DashboardHeader} from './DashboardHeader';
import {PrivacyScoreCard} from './PrivacyScoreCard';
import {QuickActions} from './QuickActions';
import {RecentSecurityActivity} from './RecentSecurityActivity';
import {RiskDistribution} from './RiskDistribution';
import {SecurityOverview} from './SecurityOverview';

export const DashboardScreen = ({onNavigate}: {onNavigate: (tab: ActiveTab) => void}) => {
  const {
    greetingName,
    metrics,
    recentAlerts,
    isLoading,
    isCheckingAlerts,
    error,
    refresh,
    checkRiskAlerts,
  } = useDashboardData();
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  const handleScan = async () => {
    setScanMessage(null);
    const result = await checkRiskAlerts();
    if (result) {
      setScanMessage(
        result.createdCount > 0
          ? `Privacy-risk check complete. ${result.createdCount} new alert${result.createdCount === 1 ? '' : 's'} created.`
          : 'Privacy-risk check complete. No new alerts.',
      );
    }
  };

  if (isLoading && !metrics) {
    return (
      <div className="cf-screen">
        <DashboardHeader greetingName={greetingName} />
        <LoadingState message="Loading your privacy data..." />
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="cf-screen">
        <DashboardHeader greetingName={greetingName} />
        <ErrorState message={error} onRetry={() => { void refresh(); }} />
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const hasApps = metrics.totalApps > 0;

  return (
    <div className="cf-screen">
      <DashboardHeader greetingName={greetingName} />

      {error ? (
        <ErrorState message={error} onRetry={() => { void refresh(); }} />
      ) : null}

      {isCheckingAlerts ? (
        <p className="cf-secondary" role="status" aria-live="polite">
          Checking stored application permissions for privacy-risk conditions…
        </p>
      ) : null}

      {scanMessage && !error && !isCheckingAlerts ? (
        <p className="cf-secondary" role="status" aria-live="polite">{scanMessage}</p>
      ) : null}

      <PrivacyScoreCard score={metrics.privacyScore} totalApps={metrics.totalApps} />

      {hasApps ? (
        <>
          <SecurityOverview
            totalApps={metrics.totalApps}
            highRiskApps={metrics.highRiskApps}
            mediumRiskApps={metrics.mediumRiskApps}
            openAlerts={metrics.openAlerts}
          />
          <RiskDistribution
            highRiskApps={metrics.highRiskApps}
            mediumRiskApps={metrics.mediumRiskApps}
            safeApps={metrics.safeApps}
            totalApps={metrics.totalApps}
          />
        </>
      ) : (
        <EmptyState
          icon={<Grid2X2 size={28} aria-hidden="true" />}
          title="Connect your first application"
          description="Start by checking your stored application data to understand which permissions may require attention. This reviews recorded permission metadata — it does not scan an Android device from this web app."
          action={
            <Button
              className="w-full min-h-11"
              onClick={() => { void handleScan(); }}
              disabled={isCheckingAlerts}
              aria-busy={isCheckingAlerts}
            >
              {isCheckingAlerts ? (
                <Loader2 size={18} className="motion-safe:animate-spin" aria-hidden="true" />
              ) : null}
              {isCheckingAlerts ? 'Checking permissions…' : 'Scan Applications'}
            </Button>
          }
        />
      )}

      <RecentSecurityActivity
        alerts={recentAlerts}
        onViewAll={() => onNavigate('alerts')}
      />

      <QuickActions
        onScan={() => { void handleScan(); }}
        onViewApps={() => onNavigate('apps')}
        onViewAnalytics={() => onNavigate('analytics')}
        isScanning={isCheckingAlerts}
      />

      <Divider />
      <p className="cf-secondary">
        Consentify calculates privacy risk from recorded permission status, grant state, background access, and available usage recency. It does not observe live device behavior.
      </p>
    </div>
  );
};
