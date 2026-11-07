import {useMemo, useState} from 'react';
import {Grid2X2, Search} from 'lucide-react';
import {useUserApps} from '../../hooks/useUserApps';
import type {AppRiskResult, RiskLevel, UserApp} from '../../types';
import {EmptyState} from '../ui/EmptyState';
import {ErrorState} from '../ui/ErrorState';
import {LoadingState} from '../ui/LoadingState';
import {AppCard} from './AppCard';
import {AppFilters, type RiskFilter} from './AppFilters';
import {AppSummary} from './AppSummary';

function matchesQuery(app: UserApp, query: string): boolean {
  if (!query) {
    return true;
  }

  const name = app.name.toLowerCase();
  const packageName = (app.packageName ?? '').toLowerCase();
  return name.includes(query) || packageName.includes(query);
}

function matchesRisk(appRisk: AppRiskResult | undefined, filter: RiskFilter): boolean {
  if (filter === 'All') {
    return true;
  }
  return appRisk?.riskLevel === filter;
}

function AppListSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="bg-surface border border-line-subtle rounded-cf-lg p-[var(--cf-card-pad)] flex gap-3"
        >
          <div className="w-12 h-12 rounded-cf-md bg-canvas-subtle motion-safe:animate-pulse" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-1/2 rounded-cf-pill bg-canvas-subtle motion-safe:animate-pulse" />
            <div className="h-3 w-2/3 rounded-cf-pill bg-canvas-subtle motion-safe:animate-pulse" />
            <div className="h-3 w-1/3 rounded-cf-pill bg-canvas-subtle motion-safe:animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export const AppsScreen = ({onSelectApp}: {onSelectApp: (appId: string) => void}) => {
  const {apps, appRiskById, isLoading, error, refresh} = useUserApps();
  const [query, setQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('All');

  const summary = useMemo(() => {
    const counts = {totalApps: 0, highRiskApps: 0, mediumRiskApps: 0, safeApps: 0};
    if (!apps || !appRiskById) {
      return counts;
    }

    counts.totalApps = apps.length;
    for (const app of apps) {
      const level: RiskLevel | undefined = appRiskById.get(app.id)?.riskLevel;
      if (level === 'High') {
        counts.highRiskApps += 1;
      } else if (level === 'Medium') {
        counts.mediumRiskApps += 1;
      } else if (level === 'Safe') {
        counts.safeApps += 1;
      }
    }
    return counts;
  }, [apps, appRiskById]);

  const filteredApps = useMemo(() => {
    if (!apps || !appRiskById) {
      return [];
    }

    const normalized = query.trim().toLowerCase();
    return apps.filter((app) => {
      const appRisk = appRiskById.get(app.id);
      return matchesQuery(app, normalized) && matchesRisk(appRisk, riskFilter);
    });
  }, [apps, appRiskById, query, riskFilter]);

  const hasLoadedApps = Boolean(apps);
  const hasAnyApps = (apps?.length ?? 0) > 0;
  const hasActiveFilters = query.trim().length > 0 || riskFilter !== 'All';

  return (
    <div className="cf-screen">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="cf-caption">Applications</p>
          <h1 className="cf-page-title mt-1">Connected Apps</h1>
          <p className="cf-secondary mt-2">
            Review permissions and privacy risk across your connected applications.
          </p>
        </div>
        <div
          className="w-11 h-11 shrink-0 rounded-full bg-surface border border-line-subtle shadow-cf-subtle flex items-center justify-center text-brand"
          aria-hidden="true"
        >
          <Grid2X2 size={20} />
        </div>
      </header>

      {isLoading && !hasLoadedApps ? (
        <>
          <LoadingState message="Loading your applications..." />
          <AppListSkeleton />
        </>
      ) : null}

      {error && !hasLoadedApps ? (
        <ErrorState message={error} onRetry={() => { void refresh(); }} />
      ) : null}

      {hasLoadedApps ? (
        <>
          {error ? (
            <ErrorState message={error} onRetry={() => { void refresh(); }} />
          ) : null}

          {hasAnyApps ? (
            <>
              <AppSummary
                totalApps={summary.totalApps}
                highRiskApps={summary.highRiskApps}
                mediumRiskApps={summary.mediumRiskApps}
                safeApps={summary.safeApps}
              />
              <AppFilters
                query={query}
                onQueryChange={setQuery}
                riskFilter={riskFilter}
                onRiskFilterChange={setRiskFilter}
              />
            </>
          ) : null}

          {!hasAnyApps ? (
            <EmptyState
              icon={<Grid2X2 size={28} aria-hidden="true" />}
              title="No applications connected"
              description="Connect application permission data to start analyzing privacy risk."
            />
          ) : filteredApps.length === 0 ? (
            <EmptyState
              icon={<Search size={28} aria-hidden="true" />}
              title="No matching applications"
              description="Try a different name, package, or risk filter."
            />
          ) : (
            <ul className="space-y-2">
              {filteredApps.map((app) => {
                const appRisk = appRiskById?.get(app.id);
                if (!appRisk) {
                  return null;
                }

                return (
                  <li key={app.id}>
                    <AppCard app={app} appRisk={appRisk} onSelect={() => onSelectApp(app.id)} />
                  </li>
                );
              })}
            </ul>
          )}

          {hasAnyApps && hasActiveFilters && filteredApps.length > 0 ? (
            <p className="cf-secondary">
              Showing {filteredApps.length} of {apps?.length} application{apps?.length === 1 ? '' : 's'}.
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
