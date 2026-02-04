import { useState, useEffect } from 'react';
import { getRecentUsage } from '../services/supabaseApi';

/**
 * Hook para obtener los IDs de cuentas y categorías usadas recientemente.
 * Se usa para ordenar los selectores en los formularios de movimientos.
 */
export const useRecentUsage = () => {
  const [recentAccountIds, setRecentAccountIds] = useState([]);
  const [recentCategoryIds, setRecentCategoryIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    getRecentUsage()
      .then(({ recentAccountIds, recentCategoryIds }) => {
        if (mounted) {
          setRecentAccountIds(recentAccountIds || []);
          setRecentCategoryIds(recentCategoryIds || []);
        }
      })
      .catch((err) => {
        console.error('Error fetching recent usage:', err);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { recentAccountIds, recentCategoryIds, loading };
};
