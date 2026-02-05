import { useState, useEffect, useCallback } from 'react';
import { getAutoRules } from '../services/supabaseApi';
import { useDataEvent, DataEvents } from '../services/dataEvents';

/**
 * Hook para gestionar las reglas automáticas de categorización
 * Sigue el patrón de useAccounts y useCategories
 */
export function useAutoRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRules = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const data = await getAutoRules();
      setRules(data.rules || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching auto rules:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Auto-refresh cuando cambian las reglas
  useDataEvent(DataEvents.RULES_CHANGED, () => fetchRules(false));

  const refetch = useCallback(async () => {
    await fetchRules(true);
  }, [fetchRules]);

  // Filtros útiles
  const activeRules = rules.filter(r => r.is_active);
  const inactiveRules = rules.filter(r => !r.is_active);

  return {
    rules,
    activeRules,
    inactiveRules,
    loading,
    error,
    refetch,
  };
}

export default useAutoRules;
