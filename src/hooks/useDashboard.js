import { useState, useEffect, useCallback } from 'react';
import { getDashboard, getRecentMovements, processFutureTransactions } from '../services/supabaseApi';

export function useDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Procesar transacciones futuras cuya fecha ya llegó
      // Esto convierte is_future = true a false para que afecten el balance
      await processFutureTransactions();

      const [dashboardData, movementsData] = await Promise.all([
        getDashboard(),
        getRecentMovements(5),
      ]);

      setDashboard(dashboardData.dashboard);
      setMovements(movementsData.movimientos || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { dashboard, movements, loading, error, refetch: fetchData };
}
