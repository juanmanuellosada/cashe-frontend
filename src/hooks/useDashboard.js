import { useState, useEffect, useCallback } from 'react';
import { getDashboard, getRecentMovements } from '../services/sheetsApi';

export function useDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboardData, movementsData] = await Promise.all([
        getDashboard(),
        getRecentMovements(5),
      ]);

      setDashboard(dashboardData.dashboard);
      setMovements(movementsData.movements || []);
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
