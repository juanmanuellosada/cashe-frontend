import { useMemo, useState, useEffect } from 'react';
import { startOfWeek, endOfWeek, format, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../../utils/format';

function WeeklySummary({ movements, accounts = [], categories = { ingresos: [], gastos: [] }, loading }) {
  const [currency, setCurrency] = useState('ARS');
  const [showFilters, setShowFilters] = useState(false);

  // Filters state with localStorage persistence
  const [filters, setFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('cashe_weekly_filters');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error loading weekly filters:', e);
    }
    return { cuentas: [], categorias: [] };
  });

  // Save filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cashe_weekly_filters', JSON.stringify(filters));
    } catch (e) {
      console.warn('Error saving weekly filters:', e);
    }
  }, [filters]);

  // Get expense categories only
  const expenseCategories = categories.gastos || [];

  // Count active filters
  const activeFiltersCount = [
    filters.cuentas?.length > 0,
    filters.categorias?.length > 0,
  ].filter(Boolean).length;

  // Calculate weekly stats with filters applied
  const stats = useMemo(() => {
    if (!movements || movements.length === 0) {
      return null;
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Filter expenses from current week
    let weekExpenses = movements.filter(m => {
      if (m.tipo !== 'gasto') return false;
      const fecha = new Date(m.fecha);
      return isWithinInterval(fecha, { start: weekStart, end: weekEnd });
    });

    // Apply account filter
    if (filters.cuentas?.length > 0) {
      weekExpenses = weekExpenses.filter(m => filters.cuentas.includes(m.cuenta));
    }

    // Apply category filter
    if (filters.categorias?.length > 0) {
      weekExpenses = weekExpenses.filter(m => filters.categorias.includes(m.categoria));
    }

    if (weekExpenses.length === 0) {
      return {
        avgDaily: 0,
        avgDailyDolares: 0,
        maxDay: null,
        topCategory: null,
        totalWeek: 0,
        totalWeekDolares: 0,
        daysWithExpenses: 0
      };
    }

    // Total expenses this week (pesos and dollars)
    const totalWeek = weekExpenses.reduce((sum, m) => sum + (m.montoPesos || m.monto || 0), 0);
    const totalWeekDolares = weekExpenses.reduce((sum, m) => sum + (m.montoDolares || 0), 0);

    // Calculate days with expenses
    const daysWithExpenses = new Set(
      weekExpenses.map(m => format(new Date(m.fecha), 'yyyy-MM-dd'))
    ).size;

    // Average daily expense
    const avgDaily = totalWeek / 7;
    const avgDailyDolares = totalWeekDolares / 7;

    // Group by day to find max day
    const byDay = {};
    weekExpenses.forEach(m => {
      const dayKey = format(new Date(m.fecha), 'yyyy-MM-dd');
      const dayName = format(new Date(m.fecha), 'EEEE', { locale: es });
      if (!byDay[dayKey]) {
        byDay[dayKey] = { name: dayName, amount: 0, amountDolares: 0, date: dayKey };
      }
      byDay[dayKey].amount += m.montoPesos || m.monto || 0;
      byDay[dayKey].amountDolares += m.montoDolares || 0;
    });
    const sortedDays = Object.values(byDay).sort((a, b) => b.amount - a.amount);
    const maxDay = sortedDays[0] || null;

    // Group by category to find top category
    const byCategory = {};
    weekExpenses.forEach(m => {
      const cat = m.categoria || 'Sin categoría';
      if (!byCategory[cat]) {
        byCategory[cat] = { name: cat, amount: 0, amountDolares: 0 };
      }
      byCategory[cat].amount += m.montoPesos || m.monto || 0;
      byCategory[cat].amountDolares += m.montoDolares || 0;
    });
    const sortedCategories = Object.values(byCategory).sort((a, b) => b.amount - a.amount);
    const topCategory = sortedCategories[0] || null;

    return {
      avgDaily,
      avgDailyDolares,
      maxDay,
      topCategory,
      totalWeek,
      totalWeekDolares,
      daysWithExpenses
    };
  }, [movements, filters]);

  // Toggle filter value
  const toggleFilter = (key, value) => {
    const current = filters[key] || [];
    let newValue;
    if (current.includes(value)) {
      newValue = current.filter(v => v !== value);
    } else {
      newValue = [...current, value];
    }
    setFilters(prev => ({ ...prev, [key]: newValue }));
  };

  // Check if value is selected
  const isSelected = (key, value) => {
    return (filters[key] || []).includes(value);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({ cuentas: [], categorias: [] });
  };

  // Skeleton loading
  if (loading) {
    return (
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg skeleton-shimmer" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
          <div className="h-4 w-24 sm:w-28 skeleton-shimmer rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
        </div>
        <div className="card-glass p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-1.5 sm:space-y-2">
                <div className="h-2.5 sm:h-3 w-12 sm:w-16 skeleton-shimmer rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                <div className="h-4 sm:h-5 w-16 sm:w-20 skeleton-shimmer rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Get emoji from category name
  const getCategoryEmoji = (categoryName) => {
    const emojiMatch = categoryName?.match(/^[\p{Emoji}\u200d]+/u);
    return emojiMatch ? emojiMatch[0] : '📊';
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-primary-dim)' }}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-sm sm:text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Esta semana
          </h3>
        </div>
        {/* Currency Selector */}
        <div
          className="inline-flex rounded-lg sm:rounded-xl p-0.5 sm:p-1"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <button
            onClick={() => setCurrency('ARS')}
            className="px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-300 active:scale-95 flex items-center gap-1 sm:gap-1.5"
            style={{
              backgroundColor: currency === 'ARS' ? 'var(--accent-primary)' : 'transparent',
              color: currency === 'ARS' ? 'white' : 'var(--text-secondary)',
              boxShadow: currency === 'ARS' ? '0 4px 12px var(--accent-primary-glow)' : 'none'
            }}
          >
            <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm" />
            ARS
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className="px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition-all duration-300 active:scale-95 flex items-center gap-1 sm:gap-1.5"
            style={{
              backgroundColor: currency === 'USD' ? 'var(--accent-green)' : 'transparent',
              color: currency === 'USD' ? 'white' : 'var(--text-secondary)',
              boxShadow: currency === 'USD' ? '0 4px 12px rgba(0, 217, 154, 0.3)' : 'none'
            }}
          >
            <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm" />
            USD
          </button>
        </div>
      </div>

      {/* Filters Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-[0.98]"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
      >
        <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="font-medium">Filtros</span>
        {activeFiltersCount > 0 && (
          <span
            className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'white',
              boxShadow: '0 2px 8px var(--accent-primary-glow)'
            }}
          >
            {activeFiltersCount}
          </span>
        )}
        <svg
          className={`w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filters Panel */}
      {showFilters && (
        <div className="p-4 rounded-2xl space-y-4 animate-scale-in card-glass">
          {/* Cuentas */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Cuentas
              </label>
              <button
                onClick={() => {
                  const allAccountNames = accounts.map(a => a.nombre);
                  const allSelected = allAccountNames.length > 0 && allAccountNames.every(name => filters.cuentas?.includes(name));
                  setFilters(prev => ({
                    ...prev,
                    cuentas: allSelected ? [] : allAccountNames
                  }));
                }}
                className="text-[10px] font-semibold transition-colors hover:opacity-80"
                style={{ color: 'var(--accent-primary)' }}
              >
                {accounts.length > 0 && accounts.every(a => filters.cuentas?.includes(a.nombre))
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto custom-scrollbar">
              {accounts.map((account) => {
                const selected = isSelected('cuentas', account.nombre);
                return (
                  <button
                    key={account.nombre}
                    onClick={() => toggleFilter('cuentas', account.nombre)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
                    style={{
                      backgroundColor: selected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: selected ? 'white' : 'var(--text-secondary)',
                      boxShadow: selected ? '0 4px 16px var(--accent-primary-glow)' : 'none',
                    }}
                  >
                    {account.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Categorías (solo gastos) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Categorías
              </label>
              {(() => {
                const allCatValues = expenseCategories.map(c => typeof c === 'string' ? c : c.value);
                const allSelected = allCatValues.length > 0 && allCatValues.every(v => filters.categorias?.includes(v));
                return (
                  <button
                    onClick={() => {
                      setFilters(prev => ({
                        ...prev,
                        categorias: allSelected ? [] : allCatValues
                      }));
                    }}
                    className="text-[10px] font-semibold transition-colors hover:opacity-80"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    {allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                );
              })()}
            </div>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto custom-scrollbar">
              {expenseCategories.map((cat) => {
                const catValue = typeof cat === 'string' ? cat : cat.value;
                const catLabel = typeof cat === 'string' ? cat : cat.label;
                const selected = isSelected('categorias', catValue);
                return (
                  <button
                    key={catValue}
                    onClick={() => toggleFilter('categorias', catValue)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
                    style={{
                      backgroundColor: selected ? 'var(--accent-red)' : 'var(--bg-secondary)',
                      color: selected ? 'white' : 'var(--text-secondary)',
                      boxShadow: selected ? '0 4px 16px rgba(255, 92, 114, 0.3)' : 'none',
                    }}
                  >
                    {catLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={clearFilters}
                className="text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 hover:opacity-80 active:scale-95"
                style={{ color: 'var(--accent-primary)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats Card */}
      {(!stats || stats.totalWeek === 0) ? (
        <div className="card-glass p-4 sm:p-6 text-center">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-lg sm:rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {activeFiltersCount > 0 ? 'Sin gastos con estos filtros' : 'Sin gastos esta semana'}
          </p>
        </div>
      ) : (
        <div className="card-glass p-3 sm:p-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* Average daily expense */}
            <div className="group p-2 sm:p-3 rounded-xl transition-all duration-200 hover:bg-[var(--bg-tertiary)]">
              <div className="flex items-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
                <div
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}
                >
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: 'var(--accent-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Prom/día
                </span>
              </div>
              <p className="text-xs sm:text-base font-bold truncate" style={{ color: 'var(--accent-blue)' }}>
                {formatCurrency(currency === 'ARS' ? stats.avgDaily : stats.avgDailyDolares, currency)}
              </p>
            </div>

            {/* Day with most expenses */}
            <div className="group p-2 sm:p-3 rounded-xl transition-all duration-200 hover:bg-[var(--bg-tertiary)]">
              <div className="flex items-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
                <div
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255, 92, 114, 0.15)' }}
                >
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Día pico
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold capitalize truncate" style={{ color: 'var(--accent-red)' }}>
                {stats.maxDay?.name || '-'}
              </p>
              <p className="text-[10px] sm:text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                {stats.maxDay ? formatCurrency(currency === 'ARS' ? stats.maxDay.amount : stats.maxDay.amountDolares, currency) : '-'}
              </p>
            </div>

            {/* Top category */}
            <div className="group p-2 sm:p-3 rounded-xl transition-all duration-200 hover:bg-[var(--bg-tertiary)]">
              <div className="flex items-center gap-1 sm:gap-1.5 mb-1.5 sm:mb-2">
                <div
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg flex items-center justify-center text-[10px] sm:text-xs"
                  style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)' }}
                >
                  {getCategoryEmoji(stats.topCategory?.name)}
                </div>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Top
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold truncate" style={{ color: 'var(--accent-primary)' }}>
                {stats.topCategory?.name?.replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim() || '-'}
              </p>
              <p className="text-[10px] sm:text-[11px] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                {stats.topCategory ? formatCurrency(currency === 'ARS' ? stats.topCategory.amount : stats.topCategory.amountDolares, currency) : '-'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WeeklySummary;
