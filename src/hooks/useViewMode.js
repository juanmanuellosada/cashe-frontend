import { useState, useEffect } from 'react';

/**
 * Persiste el modo de vista (cards | table) por tipo y usuario.
 */
export function useViewMode(type, uid) {
  const key = uid ? `cashe-view-${type}_${uid}` : `cashe-view-${type}`;
  const [viewMode, setViewModeState] = useState('cards');

  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved === 'table' || saved === 'cards') setViewModeState(saved);
  }, [key]);

  const setViewMode = (mode) => {
    setViewModeState(mode);
    localStorage.setItem(key, mode);
  };

  return [viewMode, setViewMode];
}
