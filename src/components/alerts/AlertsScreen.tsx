import {useMemo, useState} from 'react';
import {Shield} from 'lucide-react';
import {useUserAlerts} from '../../hooks/useUserAlerts';
import type {UserAlert} from '../../types';
import {EmptyState} from '../ui/EmptyState';
import {ErrorState} from '../ui/ErrorState';
import {LoadingState} from '../ui/LoadingState';
import {AlertCard} from './AlertCard';
import {AlertFilters, type AlertFilter} from './AlertFilters';
import {AlertSummary} from './AlertSummary';

function matchesFilter(alert: UserAlert, filter: AlertFilter): boolean {
  if (filter === 'All') {
    return true;
  }
  if (filter === 'Open') {
    return alert.status === 'open';
  }
  if (filter === 'Resolved') {
    return alert.status === 'resolved';
  }
  if (filter === 'High') {
    return alert.severity === 'High';
  }
  return alert.severity === 'Medium';
}

function AlertListSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {[0, 1].map((item) => (
        <div key={item} className="bg-surface border border-line-subtle rounded-cf-lg p-[var(--cf-card-pad)] flex gap-3">
          <div className="w-11 h-11 rounded-cf-md bg-canvas-subtle motion-safe:animate-pulse" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-1/3 rounded-cf-pill bg-canvas-subtle motion-safe:animate-pulse" />
            <div className="h-3 w-2/3 rounded-cf-pill bg-canvas-subtle motion-safe:animate-pulse" />
            <div className="h-3 w-1/2 rounded-cf-pill bg-canvas-subtle motion-safe:animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AlertsScreenView({
  alerts,
  isLoading,
  error,
  onRetry,
  onSelectApp,
}: {
  alerts: UserAlert[] | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onSelectApp: (appId: string) => void;
}) {
  const [filter, setFilter] = useState<AlertFilter>('All');

  const summary = useMemo(() => {
    const counts = {openCount: 0, highCount: 0, mediumCount: 0, resolvedCount: 0};
    if (!alerts) {
      return counts;
    }
    for (const alert of alerts) {
      if (alert.status === 'open') {
        counts.openCount += 1;
      }
      if (alert.status === 'resolved') {
        counts.resolvedCount += 1;
      }
      if (alert.severity === 'High') {
        counts.highCount += 1;
      }
      if (alert.severity === 'Medium') {
        counts.mediumCount += 1;
      }
    }
    return counts;
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (!alerts) {
      return [];
    }
    return alerts.filter((alert) => matchesFilter(alert, filter));
  }, [alerts, filter]);

  const hasLoaded = Boolean(alerts);
  const hasAny = (alerts?.length ?? 0) > 0;

  return (
    <div className="cf-screen">
      <header>
        <p className="cf-caption">Security Center</p>
        <h1 className="cf-page-title mt-1">Security Alerts</h1>
        <p className="cf-secondary mt-2">
          Review permission-risk findings generated from your connected applications.
        </p>
      </header>

      {isLoading && !hasLoaded ? (
        <>
          <LoadingState message="Loading your security alerts..." />
          <AlertListSkeleton />
        </>
      ) : null}

      {error && !hasLoaded ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : null}

      {hasLoaded ? (
        <>
          {error ? (
            <ErrorState message={error} onRetry={onRetry} />
          ) : null}

          {hasAny ? (
            <>
              <AlertSummary
                openCount={summary.openCount}
                highCount={summary.highCount}
                mediumCount={summary.mediumCount}
                resolvedCount={summary.resolvedCount}
              />
              <AlertFilters value={filter} onChange={setFilter} />
            </>
          ) : null}

          {!hasAny ? (
            <EmptyState
              icon={<Shield size={28} aria-hidden="true" />}
              title="No security alerts"
              description="No permission-risk alerts have been generated for your connected applications."
            />
          ) : filteredAlerts.length === 0 ? (
            <EmptyState
              title="No matching alerts"
              description="Try another filter."
            />
          ) : (
            <ul className="space-y-2">
              {filteredAlerts.map((alert) => {
                const appId = alert.appId.trim();
                return (
                  <li key={alert.id}>
                    <AlertCard
                      alert={alert}
                      onViewApplication={appId ? () => onSelectApp(appId) : undefined}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}

export const AlertsScreen = ({onSelectApp}: {onSelectApp: (appId: string) => void}) => {
  const {alerts, isLoading, error, refresh} = useUserAlerts();

  return (
    <AlertsScreenView
      alerts={alerts}
      isLoading={isLoading}
      error={error}
      onRetry={() => { void refresh(); }}
      onSelectApp={onSelectApp}
    />
  );
};
