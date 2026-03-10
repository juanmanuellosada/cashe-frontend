import { useState, useEffect, useRef, useCallback } from 'react';

const MIN_COL_WIDTH = 60;

/**
 * Maneja el resize de columnas con pointer events.
 * Persiste los anchos en localStorage.
 */
export function useColumnResize(columns, storageKey) {
  const getInitialWidths = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Validar que tenga las mismas columnas
        if (columns.every(c => !c.resizable || parsed[c.id] !== undefined)) {
          return parsed;
        }
      }
    } catch {}
    return Object.fromEntries(columns.filter(c => c.resizable).map(c => [c.id, c.defaultWidth]));
  };

  const [columnWidths, setColumnWidths] = useState(getInitialWidths);
  const resizeState = useRef(null); // { colId, startX, startWidth }

  // Guardar en localStorage cuando cambian
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnWidths));
    } catch {}
  }, [columnWidths, storageKey]);

  const onResizeStart = useCallback((colId, e) => {
    e.preventDefault();
    e.stopPropagation();
    resizeState.current = {
      colId,
      startX: e.clientX,
      startWidth: columnWidths[colId] ?? MIN_COL_WIDTH,
    };

    const onMove = (moveEvent) => {
      if (!resizeState.current) return;
      const { colId: id, startX, startWidth } = resizeState.current;
      const col = columns.find(c => c.id === id);
      const minW = col?.minWidth ?? MIN_COL_WIDTH;
      const maxW = col?.maxWidth ?? 600;
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(minW, Math.min(maxW, startWidth + delta));
      setColumnWidths(prev => ({ ...prev, [id]: newWidth }));
    };

    const onUp = () => {
      resizeState.current = null;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [columnWidths, columns]);

  const resetWidths = useCallback(() => {
    const defaults = Object.fromEntries(
      columns.filter(c => c.resizable).map(c => [c.id, c.defaultWidth])
    );
    setColumnWidths(defaults);
  }, [columns]);

  return { columnWidths, onResizeStart, resetWidths };
}
