import {useCallback, useEffect, useMemo, useState} from 'react';
import {getUserProfile} from '../services/firestore';
import type {UserProfile} from '../types';
import {useAuth} from './useAuth';

export function useSettingsData() {
  const {user} = useAuth();
  const uid = user?.uid ?? null;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!uid) {
      setProfile(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setProfile(await getUserProfile(uid));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load your account. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    setProfile(null);
    setError(null);
    setIsLoading(Boolean(uid));
    void load();
  }, [uid, load]);

  const email = profile?.email?.trim() || user?.email || null;
  const displayName = useMemo(() => {
    const fromProfile = profile?.displayName?.trim();
    if (fromProfile) {
      return fromProfile;
    }

    const fromAuth = user?.displayName?.trim();
    return fromAuth || null;
  }, [profile?.displayName, user?.displayName]);

  return {
    email,
    displayName,
    isLoading,
    error,
    refresh: load,
  };
}
