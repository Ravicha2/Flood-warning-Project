/**
 * App context: API base URL and health status for banner.
 */
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getApiBaseUrl, setApiBaseUrl as persistApiBaseUrl, getHealth } from '../services/api';

interface AppState {
  apiBaseUrl: string;
  healthStatus: 'ok' | 'error' | 'loading' | null;
  setApiBaseUrl: (url: string) => Promise<void>;
  refreshHealth: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>('');
  const [healthStatus, setHealthStatus] = useState<AppState['healthStatus']>(null);

  const loadApiUrl = useCallback(async () => {
    const url = await getApiBaseUrl();
    setApiBaseUrlState(url);
  }, []);

  const setApiBaseUrl = useCallback(async (url: string) => {
    await persistApiBaseUrl(url);
    setApiBaseUrlState(url);
    setHealthStatus('loading');
    await refreshHealth();
  }, []);

  const refreshHealth = useCallback(async () => {
    setHealthStatus('loading');
    try {
      await getHealth();
      setHealthStatus('ok');
    } catch {
      setHealthStatus('error');
    }
  }, []);

  useEffect(() => {
    loadApiUrl();
  }, [loadApiUrl]);

  useEffect(() => {
    if (apiBaseUrl) refreshHealth();
  }, [apiBaseUrl]);

  const value: AppState = {
    apiBaseUrl,
    healthStatus,
    setApiBaseUrl,
    refreshHealth,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
