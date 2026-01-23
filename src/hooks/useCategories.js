import { useState, useEffect } from 'react';
import { getCategories } from '../services/supabaseApi';

export function useCategories() {
  const [categories, setCategories] = useState({ ingresos: [], gastos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        setError(null);
        const data = await getCategories();
        setCategories(data.categorias || { ingresos: [], gastos: [] });
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
      const data = await getCategories();
      setCategories(data.categorias || { ingresos: [], gastos: [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { categories, loading, error, refetch };
}
