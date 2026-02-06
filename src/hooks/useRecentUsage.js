import { useState, useEffect } from 'react';
import { getRecentUsage } from '../services/supabaseApi';

/**
 * Hook para obtener los IDs de cuentas y categorías ordenados por frecuencia de uso.
 * Se usa para mostrar las más usadas primero en los selectores de los formularios.
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
