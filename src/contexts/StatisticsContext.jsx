import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { startOfMonth, endOfMonth, subMonths, format, parseISO } from 'date-fns';
import { getRecentMovements, getAccounts, getCategories } from '../services/supabaseApi';
import { useDataEvent, DataEvents } from '../services/dataEvents';
import { useAuth } from './AuthContext';

const StatisticsContext = createContext(null);

const STORAGE_KEY_BASE = 'cashe_stats_filters';

const DEFAULT_DATE_RANGE = {
  from: startOfMonth(subMonths(new Date(), 5)),
  to: endOfMonth(new Date()),
};

function loadFiltersFromStorage(userId) {
  try {
    const key = userId ? `${STORAGE_KEY_BASE}_${userId}` : STORAGE_KEY_BASE;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return {
      dateRange: parsed.dateRange
        ? {
            from: parseISO(parsed.dateRange.from),
            to: parseISO(parsed.dateRange.to),
          }
        : null,
      currency: parsed.currency || 'ARS',
      selectedAccounts: parsed.selectedAccounts || [],
    };
  } catch {
    return null;
  }
}

function saveFiltersToStorage(dateRange, currency, selectedAccounts, userId) {
  try {
    const key = userId ? `${STORAGE_KEY_BASE}_${userId}` : STORAGE_KEY_BASE;
    const data = {
      dateRange: dateRange.from && dateRange.to
        ? {
            from: format(dateRange.from, 'yyyy-MM-dd'),
            to: format(dateRange.to, 'yyyy-MM-dd'),
          }
        : null,
      currency,
      selectedAccounts,
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Silently fail on storage errors
  }
}

export function StatisticsProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const stored = useMemo(() => loadFiltersFromStorage(userId), [userId]);

  const [dateRange, setDateRange] = useState(
    stored?.dateRange || DEFAULT_DATE_RANGE
  );
  const [currency, setCurrency] = useState(stored?.currency || 'ARS');
  const [selectedAccounts, setSelectedAccounts] = useState(
    stored?.selectedAccounts || []
  );
  const [movements, setMovements] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categoryIconMap, setCategoryIconMap] = useState({});
  const [loading, setLoading] = useState(true);

  // Persist filters to localStorage
  useEffect(() => {
    saveFiltersToStorage(dateRange, currency, selectedAccounts, userId);
  }, [dateRange, currency, selectedAccounts, userId]);

  // Load data — server-side date filter so we don't download years of history
  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      // Extend the from-date to cover the previous period (for sparklines/variación)
      // The UI compares current period vs a prior window of the same length.
      const fromRaw = dateRange?.from || DEFAULT_DATE_RANGE.from;
      const toRaw = dateRange?.to || DEFAULT_DATE_RANGE.to;
      const windowMs = Math.max(0, new Date(toRaw).getTime() - new Date(fromRaw).getTime());
      const extendedFrom = new Date(new Date(fromRaw).getTime() - windowMs - 86400000);
      const [movementsData, accountsData, categoriesData] = await Promise.all([
        getRecentMovements(5000, {
          fromDate: format(extendedFrom, 'yyyy-MM-dd'),
          toDate: format(toRaw, 'yyyy-MM-dd'),
        }),
        getAccounts(),
        getCategories(),
      ]);
      setMovements(movementsData.movimientos || []);
      setAccounts(accountsData.accounts || []);

      // Build category name → icon map
      const iconMap = {};
      const stripEmoji = (s) => s.replace(/^[\p{Emoji}\p{Emoji_Presentation}\u200d\uFE0F]+\s*/u, '').trim();
      const allCats = [
        ...(categoriesData.categorias?.ingresos || []),
        ...(categoriesData.categorias?.gastos || []),
      ];
      allCats.forEach(cat => {
        if (cat.icon) {
          iconMap[cat.value] = cat.icon;
          iconMap[cat.label] = cat.icon;
          // Also map the emoji-stripped version of the name for reliable lookups
          const cleaned = stripEmoji(cat.value);
          if (cleaned && cleaned !== cat.value) {
            iconMap[cleaned] = cat.icon;
          }
        }
      });
      setCategoryIconMap(iconMap);
    } catch (err) {
      console.error('Error loading statistics data:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh on data changes
  useDataEvent(DataEvents.ALL_DATA_CHANGED, () => loadData(false));

  // Filter movements by date range
  const movimientosEnRango = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];

    const startDate = new Date(dateRange.from);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateRange.to);
    endDate.setHours(23, 59, 59, 999);

    return movements.filter(m => {
      const fecha = new Date(m.fecha);
      return fecha >= startDate && fecha <= endDate;
    });
  }, [movements, dateRange]);

  // Filter by selected accounts
  const filteredMovements = useMemo(() => {
    if (selectedAccounts.length === 0) return movimientosEnRango;
    return movimientosEnRango.filter(m => selectedAccounts.includes(m.cuenta));
  }, [movimientosEnRango, selectedAccounts]);

  const refetch = useCallback(() => loadData(true), [loadData]);

  const value = useMemo(
    () => ({
      dateRange,
      setDateRange,
      currency,
      setCurrency,
      selectedAccounts,
      setSelectedAccounts,
      movements: movimientosEnRango,
      filteredMovements,
      accounts,
      categoryIconMap,
      loading,
      refetch,
    }),
    [
      dateRange,
      currency,
      selectedAccounts,
      movimientosEnRango,
      filteredMovements,
      accounts,
      categoryIconMap,
      loading,
      refetch,
    ]
  );

  return (
    <StatisticsContext.Provider value={value}>
      {children}
    </StatisticsContext.Provider>
  );
}

export function useStatistics() {
  const context = useContext(StatisticsContext);
  if (!context) {
    throw new Error('useStatistics must be used within a StatisticsProvider');
  }
  return context;
}
