import {useCallback, useEffect, useMemo, useState} from 'react';
import {calculateAppRisk, permissionsByRisk} from '../lib/riskEngine';
import {getUserApp} from '../services/apps';
import type {PermissionRiskResult, UserApp} from '../types';
import {useAuth} from './useAuth';

export function useUserApp(appId: string) {
  const {user} = useAuth();
  const uid = user?.uid ?? null;
  const [app, setApp] = useState<UserApp | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!uid || !appId.trim()) {
      setApp(null);
      setError(null);
      setNotFound(Boolean(uid));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const document = await getUserApp(uid, appId);
      if (!document || document.status === 'removed') {
        setApp(null);
        setNotFound(true);
        return;
      }

      setApp(document);
    } catch (loadError) {
      setApp(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load this app. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [uid, appId]);

  useEffect(() => {
    setApp(null);
    setError(null);
    setNotFound(false);
    setIsLoading(Boolean(uid));
    void load();
  }, [uid, appId, load]);

  const appRisk = useMemo(() => (app ? calculateAppRisk(app) : null), [app]);
  const rankedPermissions = useMemo<PermissionRiskResult[]>(
    () => (appRisk ? permissionsByRisk(appRisk.permissionBreakdown) : []),
    [appRisk],
  );

  return {
    app,
    appRisk,
    rankedPermissions,
    isLoading,
    error,
    notFound,
    refresh: load,
  };
}
