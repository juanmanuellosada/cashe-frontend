import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../config/supabase';

// --- Cache ---
const STORAGE_KEY = 'cashe-icon-catalog';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours (localStorage)
const MEMORY_DURATION = 10 * 60 * 1000; // 10 minutes (in-memory)

let memoryCache = null;
let memoryCacheTimestamp = 0;

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_DURATION) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data,
    }));
  } catch {
    // localStorage full or unavailable, ignore
  }
}

// --- Category priority order ---
// Most commonly used categories first for a finance app
const CATEGORY_PRIORITY = [
  '🛒 Supermercados Argentina',
  '🍔 Comida Rápida',
  '🛵 Delivery',
  '🚕 Movilidad',
  '🚗 Combustible',
  '🎬 Streaming Video',
  '🎵 Streaming Música',
  '🎮 Gaming',
  '📱 Telefonía & Internet',
  '💰 Billeteras Virtuales Argentina',
  '💳 Pagos Internacionales',
  '🛒 E-commerce',
  '👕 Ropa Internacional',
  '👔 Ropa Argentina',
  '💄 Belleza & Perfumería',
  '🏥 Prepagas & Obras Sociales',
  '💊 Farmacias Argentina',
  '🛡️ Seguros Argentina',
  '📈 Inversiones Argentina',
  '🪙 Crypto Argentina',
  '🌐 Crypto Internacional',
  '🔌 Electro & Tech Argentina',
  '💻 Software & Productividad',
  '🔐 Suscripciones Tech',
  '👨‍💻 Developer Tools',
  '💬 Mensajería',
  '📱 Redes Sociales',
  '📚 Cursos Online',
  '🎓 Educación Argentina',
  '🎓 Universidades Privadas Argentina',
  '🎓 Universidades Públicas Argentina',
  '✈️ Viajes & Aerolíneas',
  '🎬 Cines Argentina',
  '🏋️ Gimnasios & Fitness',
  '🏠 Hogar & Construcción',
  '⚡ Electricidad',
  '🔥 Gas',
  '💧 Agua',
  '📺 TV Cable & Satélite',
  '📰 Medios Argentina',
  '🛣️ Peajes Argentina',
  '🏛️ Gobierno Argentina',
  '🎁 Otros Servicios',
  '☕ Cafeterías Argentina',
];

function sortCategories(categoryNames) {
  return [...categoryNames].sort((a, b) => {
    const idxA = CATEGORY_PRIORITY.indexOf(a);
    const idxB = CATEGORY_PRIORITY.indexOf(b);
    // Both in priority list: use their order
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    // Only one in list: it goes first
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    // Neither: alphabetical
    return a.localeCompare(b, 'es');
  });
}

/**
 * Construye la URL pública de un ícono del catálogo.
 * Si el valor ya es una URL completa, la devuelve tal cual.
 * Si es un nombre de archivo, construye la URL del bucket icons/catalog/.
 */
export const getIconCatalogUrl = (filenameOrUrl) => {
  if (!filenameOrUrl) return '';
  if (filenameOrUrl.startsWith('http://') || filenameOrUrl.startsWith('https://')) {
    return filenameOrUrl;
  }
  const { data } = supabase.storage.from('icons').getPublicUrl(`catalog/${filenameOrUrl}`);
  return data?.publicUrl || '';
};

/**
 * Hook para consultar la tabla icon_catalog de Supabase
 */
export function useIconCatalog() {
  const [icons, setIcons] = useState(() => memoryCache || loadFromStorage() || []);
  const [loading, setLoading] = useState(() => !memoryCache && !loadFromStorage());
  const [error, setError] = useState(null);

  useEffect(() => {
    // Memory cache is still valid
    if (memoryCache && (Date.now() - memoryCacheTimestamp < MEMORY_DURATION)) {
      setIcons(memoryCache);
      setLoading(false);
      return;
    }

    // localStorage cache might be valid (already loaded in useState init)
    const stored = loadFromStorage();
    if (stored && stored.length > 0 && !memoryCache) {
      memoryCache = stored;
      memoryCacheTimestamp = Date.now();
      setIcons(stored);
      setLoading(false);
      // Still fetch in background to update if stale
    }

    let cancelled = false;

    const fetchIcons = async () => {
      try {
        if (!stored || stored.length === 0) setLoading(true);

        const { data, error: fetchError } = await supabase
          .from('icon_catalog')
          .select('id, name, filename, category, keywords, domain')
          .order('name');

        if (fetchError) throw fetchError;
        if (cancelled) return;

        const fetched = data || [];
        memoryCache = fetched;
        memoryCacheTimestamp = Date.now();
        saveToStorage(fetched);
        setIcons(fetched);
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching icon catalog:', err);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchIcons();
    return () => { cancelled = true; };
  }, []);

  // Group icons by category
  const groupedIcons = useMemo(() => {
    const groups = {};
    icons.forEach(icon => {
      const cat = icon.category || 'Otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(icon);
    });
    return groups;
  }, [icons]);

  // Get sorted list of categories (by priority)
  const categories = useMemo(() => {
    return sortCategories(Object.keys(groupedIcons));
  }, [groupedIcons]);

  // Search function
  const searchIcons = useCallback((term) => {
    if (!term) return icons;
    const lower = term.toLowerCase().trim();
    return icons.filter(icon =>
      icon.name?.toLowerCase().includes(lower) ||
      icon.domain?.toLowerCase().includes(lower) ||
      icon.keywords?.some(k => k.toLowerCase().includes(lower))
    );
  }, [icons]);

  // Get icon by ID
  const getIconById = useCallback((id) => {
    if (!id) return null;
    return icons.find(icon => icon.id === id) || null;
  }, [icons]);

  return {
    icons,
    loading,
    error,
    groupedIcons,
    categories,
    searchIcons,
    getIconById,
    getIconUrl: getIconCatalogUrl,
  };
}

export default useIconCatalog;
