import { useState, useEffect, useCallback } from 'react';
import { getGoalsWithProgress } from '../services/supabaseApi';
import { DataEvents, useDataEvent } from '../services/dataEvents';

export function useGoals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGoalsWithProgress();
      setGoals(data.goals || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Re-fetch when movements change (goal progress depends on income/expenses/savings)
  useDataEvent(
    [DataEvents.EXPENSES_CHANGED, DataEvents.INCOMES_CHANGED, DataEvents.TRANSFERS_CHANGED],
    fetchGoals
  );

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGoalsWithProgress();
      setGoals(data.goals || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter helpers
  const activeGoals = goals.filter(g => g.is_active && !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);
  const incomeGoals = goals.filter(g => g.goal_type === 'income' && g.is_active);
  const savingsGoals = goals.filter(g => g.goal_type === 'savings' && g.is_active);
  const reductionGoals = goals.filter(g => g.goal_type === 'spending_reduction' && g.is_active);

  // Calculate success rate
  const successRate = completedGoals.length > 0
    ? (completedGoals.filter(g => g.percentageAchieved >= 100).length / completedGoals.length) * 100
    : 0;

  return {
    goals,
    activeGoals,
    completedGoals,
    incomeGoals,
    savingsGoals,
    reductionGoals,
    successRate,
    loading,
    error,
    refetch
  };
}
