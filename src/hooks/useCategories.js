import { useEffect } from 'react';
import { useAppStore } from './useStore';

export function useCategories() {
  const categories = useAppStore(state => state.categories);
  const categoriesWithId = useAppStore(state => state.categoriesWithId);
  const loading = useAppStore(state => state.loading.categories);
  const error = useAppStore(state => state.errors.categories);
  const fetchCategories = useAppStore(state => state.fetchCategories);
  const initialized = useAppStore(state => state._initialized.categories);

  useEffect(() => {
    if (!initialized) {
      fetchCategories();
    }
  }, [initialized, fetchCategories]);

  return { categories, categoriesWithId, loading, error, refetch: fetchCategories };
}
