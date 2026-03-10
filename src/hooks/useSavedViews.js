import { useState, useEffect, useCallback } from 'react';
import {
  getSavedViews,
  createSavedView,
  deleteSavedView,
  setDefaultSavedView,
  unsetDefaultSavedView,
} from '../services/supabaseApi';

export function useSavedViews(type, uid) {
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const data = await getSavedViews(type);
      setViews(data);
    } catch (err) {
      console.error('Error loading saved views:', err);
    } finally {
      setLoading(false);
    }
  }, [type, uid]);

  useEffect(() => {
    load();
  }, [load]);

  const saveView = useCallback(async (name, filters, sortConfig) => {
    try {
      const newView = await createSavedView({ type, name, filters, sortConfig });
      setViews((prev) => [...prev, newView]);
      return newView;
    } catch (err) {
      console.error('Error saving view:', err);
    }
  }, [type]);

  const deleteView = useCallback(async (id) => {
    try {
      await deleteSavedView(id);
      setViews((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      console.error('Error deleting view:', err);
    }
  }, []);

  const setDefault = useCallback(async (id) => {
    try {
      await setDefaultSavedView(id, type);
      setViews((prev) => prev.map((v) => ({ ...v, isDefault: v.id === id })));
    } catch (err) {
      console.error('Error setting default view:', err);
    }
  }, [type]);

  const unsetDefault = useCallback(async (id) => {
    try {
      await unsetDefaultSavedView(id);
      setViews((prev) => prev.map((v) => v.id === id ? { ...v, isDefault: false } : v));
    } catch (err) {
      console.error('Error unsetting default view:', err);
    }
  }, []);

  const defaultView = views.find((v) => v.isDefault) ?? null;

  return { views, loading, saveView, deleteView, setDefault, unsetDefault, defaultView };
}
