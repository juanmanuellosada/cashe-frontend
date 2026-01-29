import { useState, useEffect } from 'react';
import { getCategories, getCategoriesWithId } from '../services/supabaseApi';

export function useCategories() {
  const [categories, setCategories] = useState({ ingresos: [], gastos: [] });
  const [categoriesWithId, setCategoriesWithId] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, dataWithId] = await Promise.all([
        getCategories(),
        getCategoriesWithId()
      ]);
      setCategories(data.categorias || { ingresos: [], gastos: [] });
      setCategoriesWithId(dataWithId.categorias || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { categories, categoriesWithId, loading, error, refetch };
}
