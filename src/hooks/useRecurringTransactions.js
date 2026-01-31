import { useState, useEffect, useCallback } from 'react';
import { getRecurringWithStats, getPendingOccurrences } from '../services/supabaseApi';

export function useRecurringTransactions() {
  const [recurring, setRecurring] = useState([]);
  const [pendingOccurrences, setPendingOccurrences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecurring = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [recurringData, pendingData] = await Promise.all([
        getRecurringWithStats(),
        getPendingOccurrences()
      ]);
      setRecurring(recurringData.recurring || []);
      setPendingOccurrences(pendingData.occurrences || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching recurring transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const [recurringData, pendingData] = await Promise.all([
        getRecurringWithStats(),
        getPendingOccurrences()
      ]);
      setRecurring(recurringData.recurring || []);
      setPendingOccurrences(pendingData.occurrences || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter helpers
  const activeRecurring = recurring.filter(r => r.isActive && !r.isPaused);
  const pausedRecurring = recurring.filter(r => r.isActive && r.isPaused);
  const inactiveRecurring = recurring.filter(r => !r.isActive);

  // By type
  const expenseRecurring = recurring.filter(r => r.type === 'expense');
  const incomeRecurring = recurring.filter(r => r.type === 'income');
  const transferRecurring = recurring.filter(r => r.type === 'transfer');

  // Calculate monthly totals (approximate)
  const calculateMonthlyAmount = (r) => {
    const freq = r.frequency;
    const amount = r.amount;

    switch (freq?.type) {
      case 'daily':
        return amount * 30;
      case 'weekly':
        return amount * 4;
      case 'biweekly':
        return amount * 2;
      case 'monthly':
        return amount;
      case 'bimonthly':
        return amount / 2;
      case 'quarterly':
        return amount / 3;
      case 'biannual':
        return amount / 6;
      case 'yearly':
        return amount / 12;
      case 'custom_days':
        return amount * (30 / (freq.interval || 30));
      default:
        return amount;
    }
  };

  const monthlyExpenseTotal = activeRecurring
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => sum + calculateMonthlyAmount(r), 0);

  const monthlyIncomeTotal = activeRecurring
    .filter(r => r.type === 'income')
    .reduce((sum, r) => sum + calculateMonthlyAmount(r), 0);

  const monthlyBalance = monthlyIncomeTotal - monthlyExpenseTotal;

  // Get upcoming occurrences (next 7 days)
  const getUpcomingOccurrences = () => {
    const today = new Date();
    const sevenDaysLater = new Date(today);
    sevenDaysLater.setDate(today.getDate() + 7);

    return activeRecurring
      .filter(r => {
        if (!r.nextExecutionDate) return false;
        const nextDate = new Date(r.nextExecutionDate);
        return nextDate >= today && nextDate <= sevenDaysLater;
      })
      .sort((a, b) => new Date(a.nextExecutionDate) - new Date(b.nextExecutionDate));
  };

  return {
    recurring,
    activeRecurring,
    pausedRecurring,
    inactiveRecurring,
    expenseRecurring,
    incomeRecurring,
    transferRecurring,
    pendingOccurrences,
    monthlyExpenseTotal,
    monthlyIncomeTotal,
    monthlyBalance,
    getUpcomingOccurrences,
    loading,
    error,
    refetch,
  };
}
