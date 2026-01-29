import { useState, useEffect, useCallback } from 'react';
import { getBudgetsWithProgress } from '../services/supabaseApi';

export function useBudgets() {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBudgetsWithProgress();
      setBudgets(data.budgets || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching budgets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getBudgetsWithProgress();
      setBudgets(data.budgets || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter helpers
  const activeBudgets = budgets.filter(b => b.is_active && !b.is_paused);
  const pausedBudgets = budgets.filter(b => b.is_active && b.is_paused);
  const exceededBudgets = budgets.filter(b => b.is_active && !b.is_paused && b.percentageUsed > 100);

  return {
    budgets,
    activeBudgets,
    pausedBudgets,
    exceededBudgets,
    loading,
    error,
    refetch
  };
}
