import {useCallback, useEffect, useMemo, useState} from 'react';
import {calculateAppRisk} from '../lib/riskEngine';
import {calculateConsentifyMetrics, countPermissionIssues} from '../lib/metrics';
import {getUserAlerts} from '../services/alerts';
import {getUserApps} from '../services/apps';
import type {AppRiskResult, ConsentifyMetrics, UserApp} from '../types';
import {useAuth} from './useAuth';

export function useAnalyticsData() {
  const {user} = useAuth();
  const uid = user?.uid ?? null;
  const [metrics, setMetrics] = useState<ConsentifyMetrics | null>(null);
  const [apps, setApps] = useState<UserApp[] | null>(null);
  const [permissionIssues, setPermissionIssues] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) {
      setMetrics(null);
      setApps(null);
      setPermissionIssues(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [documents, alerts] = await Promise.all([
        getUserApps(uid),
        getUserAlerts(uid),
      ]);

      setApps(documents.filter((app) => app.status !== 'removed'));
      setMetrics(calculateConsentifyMetrics(documents, alerts));
      setPermissionIssues(countPermissionIssues(documents));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load your analytics. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    setMetrics(null);
    setApps(null);
    setPermissionIssues(null);
    setError(null);
    setIsLoading(Boolean(uid));
    void load();
  }, [uid, load]);

  const appRiskById = useMemo(() => {
    if (!apps) {
      return null;
    }

    return new Map<string, AppRiskResult>(apps.map((app) => [app.id, calculateAppRisk(app)]));
  }, [apps]);

  return {
    metrics,
    apps,
    appRiskById,
    permissionIssues,
    isLoading,
    error,
    refresh: load,
  };
}
