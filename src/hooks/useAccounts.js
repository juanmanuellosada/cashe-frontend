import { useEffect } from 'react';
import { useAppStore } from './useStore';

export function useAccounts() {
  const accounts = useAppStore(state => state.accounts);
  const loading = useAppStore(state => state.loading.accounts);
  const error = useAppStore(state => state.errors.accounts);
  const fetchAccounts = useAppStore(state => state.fetchAccounts);
  const initialized = useAppStore(state => state._initialized.accounts);

  useEffect(() => {
    if (!initialized) {
      fetchAccounts();
    }
  }, [initialized, fetchAccounts]);

  return { accounts, loading, error, refetch: fetchAccounts };
}
