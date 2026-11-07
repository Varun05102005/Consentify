
import {useCallback, useEffect, useMemo, useState} from 'react';
import {calculateAppRisk} from '../lib/riskEngine';
import {getUserApps, subscribeUserApps} from '../services/apps';
import type {AppRiskResult, UserApp} from '../types';
import {useAuth} from './useAuth';

export function useUserApps() {
  const {user} = useAuth();
  const uid = user?.uid ?? null;

  const [apps, setApps] = useState<UserApp[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!uid) {
      setApps(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setError(null);

    try {
      const documents = await getUserApps(uid);

      setApps(
        documents
          .filter((app) => app.status !== 'removed')
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load your apps. Please try again.',
      );
    }
  }, [uid]);

  useEffect(() => {
    setApps(null);
    setError(null);

    if (!uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = subscribeUserApps(
      uid,
      (documents) => {
        setApps(
          documents
            .filter((app) => app.status !== 'removed')
            .sort((left, right) => left.name.localeCompare(right.name)),
        );

        setError(null);
        setIsLoading(false);
      },
      (listenerError) => {
        setError(listenerError.message);
        setIsLoading(false);
      },
    );

    return unsubscribe;
  }, [uid]);

  const appRiskById = useMemo(() => {
    if (!apps) {
      return null;
    }

    return new Map<string, AppRiskResult>(
      apps.map((app) => [app.id, calculateAppRisk(app)]),
    );
  }, [apps]);

  return {
    apps,
    appRiskById,
    isLoading,
    error,
    refresh,
  };
}
