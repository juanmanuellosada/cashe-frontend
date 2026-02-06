import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ZoomContext = createContext({});

// Rango de zoom: 50% a 150%, pasos de 10%
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;
const DEFAULT_ZOOM = 1;

export const useZoom = () => {
  const context = useContext(ZoomContext);
  if (!context) {
    throw new Error('useZoom must be used within a ZoomProvider');
  }
  return context;
};

export const ZoomProvider = ({ children }) => {
  const [zoom, setZoom] = useState(() => {
    try {
      const saved = localStorage.getItem('cashe_zoom_level');
      if (saved) {
        const parsed = parseFloat(saved);
        // Permitir valores por debajo del mínimo si el usuario los guardó
        if (!isNaN(parsed) && parsed > 0 && parsed <= MAX_ZOOM) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error loading zoom level:', e);
    }
    return DEFAULT_ZOOM;
  });

  // Guardar en localStorage cuando cambia
  useEffect(() => {
    try {
      localStorage.setItem('cashe_zoom_level', zoom.toString());
    } catch (e) {
      console.warn('Error saving zoom level:', e);
    }
  }, [zoom]);

  const zoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const zoomOut = useCallback(() => {
    // Permitir ir por debajo del mínimo normal (hasta 0.3)
    setZoom(prev => Math.max(prev - ZOOM_STEP, 0.3));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
  }, []);

  const setZoomLevel = useCallback((level) => {
    if (level > 0 && level <= MAX_ZOOM) {
      setZoom(level);
    }
  }, []);

  const value = {
    zoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoomLevel,
    zoomPercent: Math.round(zoom * 100),
    canZoomIn: zoom < MAX_ZOOM,
    canZoomOut: zoom > 0.3,
    isDefaultZoom: zoom === DEFAULT_ZOOM,
  };

  return (
    <ZoomContext.Provider value={value}>
      {children}
    </ZoomContext.Provider>
  );
};
