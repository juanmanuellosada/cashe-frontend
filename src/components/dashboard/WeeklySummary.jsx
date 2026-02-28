import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
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

  // Filter out accounts hidden from balance
  const visibleAccounts = (accounts || []).filter(acc => !acc.ocultaDelBalance);

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

    // Get names of visible accounts (not hidden from balance)
    const visibleAccountNames = visibleAccounts.map(acc => acc.nombre);

    // Filter movements from visible accounts only
    const visibleMovements = movements.filter(m => visibleAccountNames.includes(m.cuenta));

    // Separate expenses and income
    let weekExpenses = visibleMovements.filter(m => m.tipo === 'gasto');
    let weekIncome = visibleMovements.filter(m => m.tipo === 'ingreso');

    // Apply account filter
    if (filters.cuentas?.length > 0) {
      weekExpenses = weekExpenses.filter(m => filters.cuentas.includes(m.cuenta));
      weekIncome = weekIncome.filter(m => filters.cuentas.includes(m.cuenta));
    }

    // Apply category filter (only to expenses since categories filter is for expenses)
    if (filters.categorias?.length > 0) {
      weekExpenses = weekExpenses.filter(m => filters.categorias.includes(m.categoria));
    }

    // Total expenses this week (pesos and dollars)
    const totalExpenses = weekExpenses.reduce((sum, m) => sum + (m.montoPesos || m.monto || 0), 0);
    const totalExpensesDolares = weekExpenses.reduce((sum, m) => sum + (m.montoDolares || 0), 0);

    // Total income this week (pesos and dollars)
    const totalIncome = weekIncome.reduce((sum, m) => sum + (m.montoPesos || m.monto || 0), 0);
    const totalIncomeDolares = weekIncome.reduce((sum, m) => sum + (m.montoDolares || 0), 0);

    // Average daily expense and income
    const avgDailyExpense = totalExpenses / 7;
    const avgDailyExpenseDolares = totalExpensesDolares / 7;
    const avgDailyIncome = totalIncome / 7;
    const avgDailyIncomeDolares = totalIncomeDolares / 7;

    // Calculate days with expenses
    const daysWithExpenses = new Set(weekExpenses.map(m => m.fecha)).size;

    // Helper para obtener nombre del día desde fecha yyyy-MM-dd
    const getDayName = (fecha) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const [year, month, day] = fecha.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return format(date, 'EEEE', { locale: es });
      }
      return format(new Date(fecha), 'EEEE', { locale: es });
    };

    // Group by day to find max day
    const byDay = {};
    weekExpenses.forEach(m => {
      const dayKey = m.fecha;
      const dayName = getDayName(m.fecha);
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
      avgDailyExpense,
      avgDailyExpenseDolares,
      avgDailyIncome,
      avgDailyIncomeDolares,
      maxDay,
      topCategory,
      totalExpenses,
      totalExpensesDolares,
      totalIncome,
      totalIncomeDolares,
      daysWithExpenses
    };
  }, [movements, filters, visibleAccounts]);

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
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md min-[400px]:rounded-lg skeleton-shimmer" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
          <div className="h-4 w-28 skeleton-shimmer rounded-md min-[400px]:rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
        </div>
        <div className="card-glass p-3 sm:p-4 rounded-lg min-[400px]:rounded-xl">
          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2 p-2.5">
                <div className="h-3 w-20 skeleton-shimmer rounded-md" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
                <div className="h-5 w-24 skeleton-shimmer rounded-md" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
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
    <div className="space-y-2 sm:space-y-3 overflow-hidden">
      {/* Header - stacks on <400px */}
      <div className="flex flex-col min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-primary-dim)' }}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-sm sm:text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            Resumen semanal
          </h3>
        </div>
        {/* Currency Selector */}
        <div
          className="inline-flex rounded-lg p-0.5 self-start min-[400px]:self-auto"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <button
            onClick={() => setCurrency('ARS')}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 flex items-center gap-1.5"
            style={{
              backgroundColor: currency === 'ARS' ? 'var(--bg-elevated)' : 'transparent',
              color: currency === 'ARS' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-4 h-4 rounded-sm" />
            ARS
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 flex items-center gap-1.5"
            style={{
              backgroundColor: currency === 'USD' ? 'var(--bg-elevated)' : 'transparent',
              color: currency === 'USD' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-4 h-4 rounded-sm" />
            USD
          </button>
        </div>
      </div>

      {/* Filters Toggle */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg min-[400px]:rounded-xl text-sm transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-[0.98]"
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
        <div className="p-4 rounded-lg min-[400px]:rounded-xl space-y-4 animate-scale-in card-glass">
          {/* Cuentas - show all accounts, indicate hidden ones */}
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
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
              {accounts.map((account) => {
                const selected = isSelected('cuentas', account.nombre);
                const isHidden = account.ocultaDelBalance;
                return (
                  <button
                    key={account.nombre}
                    onClick={() => toggleFilter('cuentas', account.nombre)}
                    className="px-3 py-2 min-h-[44px] rounded-md min-[400px]:rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95 flex items-center gap-1"
                    style={{
                      backgroundColor: selected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: selected ? 'white' : 'var(--text-secondary)',
                      boxShadow: selected ? '0 4px 16px var(--accent-primary-glow)' : 'none',
                      opacity: isHidden && !selected ? 0.6 : 1,
                    }}
                    title={isHidden ? 'Cuenta oculta del balance' : ''}
                  >
                    {account.nombre}
                    {isHidden && (
                      <svg className="w-3 h-3" style={{ color: selected ? 'white' : 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
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
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
              {expenseCategories.map((cat) => {
                const catValue = typeof cat === 'string' ? cat : cat.value;
                const catLabel = typeof cat === 'string' ? cat : cat.label;
                const selected = isSelected('categorias', catValue);
                return (
                  <button
                    key={catValue}
                    onClick={() => toggleFilter('categorias', catValue)}
                    className="px-3 py-2 min-h-[44px] rounded-md min-[400px]:rounded-lg text-xs font-semibold transition-all duration-200 active:scale-95"
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
      {(!stats || (stats.totalExpenses === 0 && stats.totalIncome === 0)) ? (
        <div className="card-glass p-4 sm:p-6 text-center rounded-lg min-[400px]:rounded-xl">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 rounded-md min-[400px]:rounded-lg sm:rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            {activeFiltersCount > 0 ? 'Sin movimientos con filtros' : 'Sin movimientos esta semana'}
          </p>
        </div>
      ) : (
        <div className="card-glass p-3 sm:p-4 rounded-lg min-[400px]:rounded-xl">
          {/* Grid responsivo: 2 cols en móvil, 4 cols en desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {/* Average daily income */}
            <div className="group p-2.5 sm:p-3 rounded-md min-[400px]:rounded-lg transition-all duration-200 hover:bg-[var(--bg-tertiary)]">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Prom. Ing.
              </p>
              <p className="text-sm sm:text-base font-bold truncate" style={{ color: 'var(--accent-green)' }}>
                +{formatCurrency(currency === 'ARS' ? stats.avgDailyIncome : stats.avgDailyIncomeDolares, currency)}
              </p>
            </div>

            {/* Average daily expense */}
            <div className="group p-2.5 sm:p-3 rounded-md min-[400px]:rounded-lg transition-all duration-200 hover:bg-[var(--bg-tertiary)]">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Prom. Gasto
              </p>
              <p className="text-sm sm:text-base font-bold truncate" style={{ color: 'var(--accent-red)' }}>
                -{formatCurrency(currency === 'ARS' ? stats.avgDailyExpense : stats.avgDailyExpenseDolares, currency)}
              </p>
            </div>

            {/* Day with most expenses */}
            <div className="group p-2.5 sm:p-3 rounded-md min-[400px]:rounded-lg transition-all duration-200 hover:bg-[var(--bg-tertiary)]">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Día pico
              </p>
              <p className="text-sm sm:text-base font-bold capitalize truncate" style={{ color: 'var(--accent-red)' }}>
                {stats.maxDay?.name || '-'}
              </p>
              <p className="text-[11px] sm:text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {stats.maxDay ? formatCurrency(currency === 'ARS' ? stats.maxDay.amount : stats.maxDay.amountDolares, currency) : '-'}
              </p>
            </div>

            {/* Top category */}
            <div className="group p-2.5 sm:p-3 rounded-md min-[400px]:rounded-lg transition-all duration-200 hover:bg-[var(--bg-tertiary)]">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-wider font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Top categoría
              </p>
              <p className="text-sm sm:text-base font-bold truncate" style={{ color: 'var(--accent-primary)' }}>
                {stats.topCategory?.name?.replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim() || '-'}
              </p>
              <p className="text-[11px] sm:text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
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
