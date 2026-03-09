import { useEffect } from 'react';
import { useAppStore } from './useStore';

export function useDashboard() {
  const dashboard = useAppStore(state => state.dashboard);
  const movements = useAppStore(state => state.movements);
  const loading = useAppStore(state => state.loading.dashboard);
  const error = useAppStore(state => state.errors.dashboard);
  const fetchDashboard = useAppStore(state => state.fetchDashboard);
  const initialized = useAppStore(state => state._initialized.dashboard);

  useEffect(() => {
    if (!initialized) {
      fetchDashboard();
    }
  }, [initialized, fetchDashboard]);

  return { dashboard, movements, loading, error, refetch: fetchDashboard };
}
