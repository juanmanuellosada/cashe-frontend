import { useState, useEffect, useRef, useCallback } from 'react';
import { getViewPreferences, saveViewPreferences } from '../services/supabaseApi';

const DEBOUNCE_MS = 1200;

/**
 * Persiste filtros, ordenamiento y formato de fecha de una sección en Supabase.
 * localStorage actúa como cache para carga inmediata en el mismo dispositivo.
 *
 * @param {string} type  - 'gasto' | 'ingreso' | 'transferencia'
 * @param {string} uid   - user id (puede ser vacío mientras carga)
 */
export function useViewPreferences(type, uid) {
  const localKey = uid ? `cashe-viewprefs-${type}_${uid}` : null;

  const [prefs, setPrefs] = useState(null); // null = todavía cargando
  const [loaded, setLoaded] = useState(false);

  const debounceRef = useRef(null);
  const isFirstRender = useRef(true);

  // Carga inicial: localStorage (inmediato) + Supabase (authoritative)
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    // 1. Cargar localStorage para respuesta inmediata
    let localPrefs = null;
    if (localKey) {
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) localPrefs = JSON.parse(raw);
      } catch (_) {}
    }
    if (localPrefs) {
      setPrefs(localPrefs);
      setLoaded(true);
    }

    // 2. Cargar Supabase (autoritativo, sobreescribe local)
    getViewPreferences(type)
      .then((remotePrefs) => {
        if (cancelled) return;
        if (remotePrefs) {
          setPrefs(remotePrefs);
          // Sincronizar localStorage con lo que viene de Supabase
          if (localKey) {
            try { localStorage.setItem(localKey, JSON.stringify(remotePrefs)); } catch (_) {}
          }
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, type]);

  // Guardar con debounce cada vez que prefs cambia (excepto carga inicial)
  const savePrefs = useCallback((newPrefs) => {
    setPrefs(newPrefs);

    // Guardar en localStorage de inmediato
    if (localKey) {
      try { localStorage.setItem(localKey, JSON.stringify(newPrefs)); } catch (_) {}
    }

    // Debounce para Supabase
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveViewPreferences(type, newPrefs).catch(console.error);
    }, DEBOUNCE_MS);
  }, [type, localKey]);

  // Cleanup debounce
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { prefs, loaded, savePrefs };
}
