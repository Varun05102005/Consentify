import {useCallback, useEffect, useMemo, useState} from 'react';
import {calculateConsentifyMetrics} from '../lib/metrics';
import {getUserAlerts} from '../services/alerts';
import {getUserApps} from '../services/apps';
import {getUserProfile} from '../services/firestore';
import {syncMissingRiskAlerts} from '../services/riskAlerts';
import type {ConsentifyMetrics, UserAlert, UserProfile} from '../types';
import {useAuth} from './useAuth';

function greetingFromUser(profile: UserProfile | null, email: string | null): string {
  const displayName = profile?.displayName?.trim();
  if (displayName) {
    return displayName;
  }

  const localPart = email?.split('@')[0]?.trim();
  if (localPart) {
    return localPart;
  }

  return 'there';
}

export function useDashboardData() {
  const {user} = useAuth();
  const uid = user?.uid ?? null;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [metrics, setMetrics] = useState<ConsentifyMetrics | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<UserAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAlerts, setIsCheckingAlerts] = useState(false);

  const load = useCallback(async () => {
    if (!uid) {
      setProfile(null);
      setMetrics(null);
      setRecentAlerts([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [nextProfile, apps, alerts] = await Promise.all([
        getUserProfile(uid),
        getUserApps(uid),
        getUserAlerts(uid),
      ]);

      setProfile(nextProfile);
      setMetrics(calculateConsentifyMetrics(apps, alerts));
      setRecentAlerts(alerts.slice(0, 4));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load your privacy data. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    setProfile(null);
    setMetrics(null);
    setRecentAlerts([]);
    setError(null);
    setIsLoading(Boolean(uid));
    void load();
  }, [uid, load]);

  const greetingName = useMemo(
    () => greetingFromUser(profile, user?.email ?? null),
    [profile, user?.email],
  );

  const checkRiskAlerts = useCallback(async (): Promise<{createdCount: number} | null> => {
    if (!uid) {
      return null;
    }

    setIsCheckingAlerts(true);
    setError(null);

    try {
      const result = await syncMissingRiskAlerts(uid);
      const [nextProfile, apps, alerts] = await Promise.all([
        getUserProfile(uid),
        getUserApps(uid),
        getUserAlerts(uid),
      ]);
      setProfile(nextProfile);
      setMetrics(calculateConsentifyMetrics(apps, alerts));
      setRecentAlerts(alerts.slice(0, 4));
      return result;
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : 'Unable to check privacy-risk alerts. Please try again.',
      );
      return null;
    } finally {
      setIsCheckingAlerts(false);
    }
  }, [uid]);

  return {
    greetingName,
    metrics,
    recentAlerts,
    isLoading,
    isCheckingAlerts,
    error,
    refresh: load,
    checkRiskAlerts,
  };
}
