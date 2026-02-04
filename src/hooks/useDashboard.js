import { useState, useEffect, useCallback } from 'react';
import { getDashboard, getRecentMovements, processFutureTransactions } from '../services/supabaseApi';
import { useDataEvent, DataEvents } from '../services/dataEvents';

export function useDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
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
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Suscribirse a cambios de datos para refrescar automáticamente
  useDataEvent(DataEvents.ALL_DATA_CHANGED, () => fetchData(false));

  return { dashboard, movements, loading, error, refetch: fetchData };
}
