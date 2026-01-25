import { useMemo, useState } from 'react';
import { startOfWeek, endOfWeek, format, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../../utils/format';

function WeeklySummary({ movements, loading }) {
  const [currency, setCurrency] = useState('ARS');

  // Calculate weekly stats
  const stats = useMemo(() => {
    if (!movements || movements.length === 0) {
      return null;
    }

    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // Filter expenses from current week
    const weekExpenses = movements.filter(m => {
      if (m.tipo !== 'gasto') return false;
      const fecha = new Date(m.fecha);
      return isWithinInterval(fecha, { start: weekStart, end: weekEnd });
    });

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
  }, [movements]);

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

  // No data
  if (!stats || stats.totalWeek === 0) {
    return (
      <div className="space-y-2 sm:space-y-3">
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
            Sin gastos esta semana
          </p>
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
    </div>
  );
}

export default WeeklySummary;
