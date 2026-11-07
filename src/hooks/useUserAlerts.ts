import {useCallback, useEffect, useState} from 'react';
import {getUserAlerts} from '../services/alerts';
import type {UserAlert} from '../types';
import {useAuth} from './useAuth';

export function useUserAlerts() {
  const {user} = useAuth();
  const uid = user?.uid ?? null;
  const [alerts, setAlerts] = useState<UserAlert[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) {
      setAlerts(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setAlerts(await getUserAlerts(uid));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load your alerts. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    setAlerts(null);
    setError(null);
    setIsLoading(Boolean(uid));
    void load();
  }, [uid, load]);

  return {
    alerts,
    isLoading,
    error,
    refresh: load,
  };
}
