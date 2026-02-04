import { useState, useEffect, useCallback } from 'react';
import { getCategories, getCategoriesWithId } from '../services/supabaseApi';
import { useDataEvent, DataEvents } from '../services/dataEvents';

export function useCategories() {
  const [categories, setCategories] = useState({ ingresos: [], gastos: [] });
  const [categoriesWithId, setCategoriesWithId] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const [data, dataWithId] = await Promise.all([
        getCategories(),
        getCategoriesWithId()
      ]);
      setCategories(data.categorias || { ingresos: [], gastos: [] });
      setCategoriesWithId(dataWithId.categorias || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching categories:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Suscribirse a cambios de datos para refrescar automáticamente
  useDataEvent(DataEvents.CATEGORIES_CHANGED, () => fetchCategories(false));

  const refetch = useCallback(async () => {
    await fetchCategories(true);
  }, [fetchCategories]);

  return { categories, categoriesWithId, loading, error, refetch };
}
