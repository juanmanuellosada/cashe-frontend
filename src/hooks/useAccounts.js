import { useState, useEffect, useCallback } from 'react';
import { getAccounts } from '../services/supabaseApi';
import { useDataEvent, DataEvents } from '../services/dataEvents';

export function useAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAccounts = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const data = await getAccounts();
      setAccounts(data.accounts || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching accounts:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Suscribirse a cambios de datos para refrescar automáticamente
  useDataEvent(
    [DataEvents.ACCOUNTS_CHANGED, DataEvents.EXPENSES_CHANGED, DataEvents.INCOMES_CHANGED, DataEvents.TRANSFERS_CHANGED],
    () => fetchAccounts(false)
  );

  const refetch = useCallback(async () => {
    await fetchAccounts(true);
  }, [fetchAccounts]);

  return { accounts, loading, error, refetch };
}
