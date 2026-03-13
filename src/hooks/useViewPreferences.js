import { useState, useEffect, useRef, useCallback } from 'react';
import { getViewPreferences, saveViewPreferences } from '../services/supabaseApi';

const DEBOUNCE_MS = 800;

/**
 * Persiste filtros, ordenamiento y formato de fecha de una sección en Supabase.
 * localStorage actúa como cache para carga inmediata en el mismo dispositivo.
 *
 * @param {string} type  - 'gasto' | 'ingreso' | 'transferencia'
 * @param {string} uid   - user id (puede ser vacío mientras carga)
 */
export function useViewPreferences(type, uid) {
  const [prefs, setPrefs] = useState(null); // null = todavía cargando
  const [loaded, setLoaded] = useState(false);

  const debounceRef = useRef(null);
  const pendingPrefsRef = useRef(null); // para flush en unmount
  const typeRef = useRef(type);
  const uidRef = useRef(uid);
  typeRef.current = type;
  uidRef.current = uid;

  const localKey = uid ? `cashe-viewprefs-${type}_${uid}` : null;
  const localKeyRef = useRef(localKey);
  localKeyRef.current = localKey;

  // Carga inicial: localStorage (inmediato) + Supabase (autoritativo)
  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    // 1. Cargar localStorage para respuesta inmediata
    let localPrefs = null;
    const key = `cashe-viewprefs-${type}_${uid}`;
    try {
      const raw = localStorage.getItem(key);
      if (raw) localPrefs = JSON.parse(raw);
    } catch (_) {}

    if (localPrefs) {
      setPrefs(localPrefs);
      setLoaded(true);
    }

    // 2. Cargar Supabase (autoritativo)
    getViewPreferences(type)
      .then((remotePrefs) => {
        if (cancelled) return;
        if (remotePrefs) {
          setPrefs(remotePrefs);
          try { localStorage.setItem(key, JSON.stringify(remotePrefs)); } catch (_) {}
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, type]);

  const savePrefs = useCallback((newPrefs) => {
    // Guardar en localStorage de inmediato (usa ref para tener localKey actualizado)
    const key = localKeyRef.current;
    if (key) {
      try { localStorage.setItem(key, JSON.stringify(newPrefs)); } catch (_) {}
    }

    // Guardar pending para posible flush en unmount
    pendingPrefsRef.current = newPrefs;

    // Debounce para Supabase
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      pendingPrefsRef.current = null;
      saveViewPreferences(typeRef.current, newPrefs).catch(console.error);
    }, DEBOUNCE_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al desmontar: flush inmediato si hay save pendiente
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (pendingPrefsRef.current && uidRef.current) {
        saveViewPreferences(typeRef.current, pendingPrefsRef.current).catch(console.error);
        pendingPrefsRef.current = null;
      }
    };
  }, []);

  return { prefs, loaded, savePrefs };
}
