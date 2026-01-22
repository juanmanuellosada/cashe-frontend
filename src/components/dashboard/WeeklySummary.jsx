import { useMemo } from 'react';
import { startOfWeek, endOfWeek, format, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../../utils/format';

function WeeklySummary({ movements, loading }) {
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
        maxDay: null,
        topCategory: null,
        totalWeek: 0,
        daysWithExpenses: 0
      };
    }

    // Total expenses this week
    const totalWeek = weekExpenses.reduce((sum, m) => sum + (m.montoPesos || m.monto || 0), 0);

    // Calculate days with expenses
    const daysWithExpenses = new Set(
      weekExpenses.map(m => format(new Date(m.fecha), 'yyyy-MM-dd'))
    ).size;

    // Average daily expense
    const avgDaily = totalWeek / 7;

    // Group by day to find max day
    const byDay = {};
    weekExpenses.forEach(m => {
      const dayKey = format(new Date(m.fecha), 'yyyy-MM-dd');
      const dayName = format(new Date(m.fecha), 'EEEE', { locale: es });
      if (!byDay[dayKey]) {
        byDay[dayKey] = { name: dayName, amount: 0, date: dayKey };
      }
      byDay[dayKey].amount += m.montoPesos || m.monto || 0;
    });
    const sortedDays = Object.values(byDay).sort((a, b) => b.amount - a.amount);
    const maxDay = sortedDays[0] || null;

    // Group by category to find top category
    const byCategory = {};
    weekExpenses.forEach(m => {
      const cat = m.categoria || 'Sin categoría';
      if (!byCategory[cat]) {
        byCategory[cat] = { name: cat, amount: 0 };
      }
      byCategory[cat].amount += m.montoPesos || m.monto || 0;
    });
    const sortedCategories = Object.values(byCategory).sort((a, b) => b.amount - a.amount);
    const topCategory = sortedCategories[0] || null;

    return {
      avgDaily,
      maxDay,
      topCategory,
      totalWeek,
      daysWithExpenses
    };
  }, [movements]);

  // Skeleton loading
  if (loading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Esta semana
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="rounded-xl p-3"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="h-3 w-16 skeleton-shimmer rounded mb-2" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
              <div className="h-5 w-20 skeleton-shimmer rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No data
  if (!stats || stats.totalWeek === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Esta semana
        </h3>
        <div
          className="rounded-xl p-4 text-center"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
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
    <div className="space-y-2">
      <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        Esta semana
      </h3>
      <div className="grid grid-cols-3 gap-2">
        {/* Average daily expense */}
        <div
          className="rounded-xl p-3 relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div
            className="absolute inset-0 opacity-50"
            style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, transparent 70%)' }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-1 mb-1">
              <svg className="w-3 h-3" style={{ color: 'var(--accent-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Promedio/día
              </span>
            </div>
            <p className="text-base font-bold" style={{ color: 'var(--accent-blue)' }}>
              {formatCurrency(stats.avgDaily)}
            </p>
          </div>
        </div>

        {/* Day with most expenses */}
        <div
          className="rounded-xl p-3 relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div
            className="absolute inset-0 opacity-50"
            style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, transparent 70%)' }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-1 mb-1">
              <svg className="w-3 h-3" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Día pico
              </span>
            </div>
            <p className="text-sm font-bold capitalize truncate" style={{ color: 'var(--accent-red)' }}>
              {stats.maxDay?.name || '-'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {stats.maxDay ? formatCurrency(stats.maxDay.amount) : '-'}
            </p>
          </div>
        </div>

        {/* Top category */}
        <div
          className="rounded-xl p-3 relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div
            className="absolute inset-0 opacity-50"
            style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, transparent 70%)' }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-xs">{getCategoryEmoji(stats.topCategory?.name)}</span>
              <span className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Top gasto
              </span>
            </div>
            <p className="text-sm font-bold truncate" style={{ color: 'var(--accent-purple)' }}>
              {stats.topCategory?.name?.replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim() || '-'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {stats.topCategory ? formatCurrency(stats.topCategory.amount) : '-'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WeeklySummary;
