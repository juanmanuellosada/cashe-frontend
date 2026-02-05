import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { eachMonthOfInterval, startOfMonth, endOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../../utils/format';
import { isEmoji, resolveIconPath } from '../../services/iconStorage';

const COLORS = [
  '#f43f5e', '#f97316', '#eab308', '#10b981', '#14b8a6',
  '#0ea5e9', '#8b5cf6', '#ec4899', '#6366f1', '#84cc16',
];

const CategoryIcon = ({ icon, size = 12 }) => {
  if (!icon) return null;
  if (isEmoji(icon)) {
    return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>{icon}</span>;
  }
  return (
    <img
      src={resolveIconPath(icon)}
      alt=""
      style={{ width: `${size}px`, height: `${size}px`, borderRadius: '2px' }}
      className="flex-shrink-0"
    />
  );
};

const stripEmoji = (name) => name.replace(/^[\p{Emoji}\p{Emoji_Presentation}\u200d\uFE0F]+\s*/u, '').trim() || name;

function StackedAreaChart({ movements, dateRange, currency = 'ARS', categoryIconMap = {} }) {
  const [hiddenCategories, setHiddenCategories] = useState(new Set());

  const { chartData, categorias } = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to || !movements?.length) {
      return { chartData: [], categorias: [] };
    }

    const gastos = movements.filter(m => m.tipo === 'gasto');
    if (gastos.length === 0) return { chartData: [], categorias: [] };

    // Find top 8 categories by total (strip emoji prefix from names)
    const totalPorCategoria = {};
    gastos.forEach(m => {
      const cat = stripEmoji(m.categoria || 'Sin categoria');
      const monto = currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0);
      totalPorCategoria[cat] = (totalPorCategoria[cat] || 0) + monto;
    });

    const sortedCats = Object.entries(totalPorCategoria)
      .sort(([, a], [, b]) => b - a);

    const topCats = sortedCats.slice(0, 8).map(([name]) => name);
    const hasOtros = sortedCats.length > 8;
    const allCats = hasOtros ? [...topCats, 'Otros'] : topCats;

    // Build monthly data
    const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });

    const data = months.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, 'MMM', { locale: es });

      const entry = {
        month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
      };

      // Initialize all categories to 0
      allCats.forEach(cat => { entry[cat] = 0; });

      // Sum expenses by category for this month
      gastos.forEach(m => {
        const fecha = new Date(m.fecha);
        if (fecha >= monthStart && fecha <= monthEnd) {
          const cat = stripEmoji(m.categoria || 'Sin categoria');
          const monto = currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0);

          if (topCats.includes(cat)) {
            entry[cat] += monto;
          } else if (hasOtros) {
            entry['Otros'] += monto;
          }
        }
      });

      return entry;
    });

    return { chartData: data, categorias: allCats };
  }, [movements, dateRange, currency]);

  const toggleCategory = (cat) => {
    setHiddenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const formatYAxis = (value) => {
    const rounded = Math.round(value * 100) / 100;
    if (Math.abs(rounded) < 0.01) return '0';
    if (rounded >= 1000000) return `${(rounded / 1000000).toFixed(1)}M`;
    if (rounded >= 1000) return `${(rounded / 1000).toFixed(0)}K`;
    return rounded.toFixed(0);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);
      return (
        <div
          className="px-3 py-2 rounded-lg shadow-lg max-w-[220px]"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="font-medium text-sm mb-1.5" style={{ color: 'var(--text-primary)' }}>{label}</p>
          {payload
            .filter(p => p.value > 0)
            .sort((a, b) => b.value - a.value)
            .map((entry, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  {categoryIconMap[entry.name] ? (
                    <CategoryIcon icon={categoryIconMap[entry.name]} size={12} />
                  ) : (
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                  )}
                  <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {stripEmoji(entry.name)}
                  </span>
                </div>
                <span className="text-xs font-medium flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                  {formatCurrency(entry.value, currency)}
                </span>
              </div>
            ))}
          <div
            className="mt-1.5 pt-1.5 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Total</span>
            <span className="text-xs font-bold" style={{ color: 'var(--accent-red)' }}>
              {formatCurrency(total, currency)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
    >
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
        Composicion de gastos por mes
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.5} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {categorias.map((cat, i) => (
            <Area
              key={cat}
              type="monotone"
              dataKey={cat}
              stackId="1"
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={hiddenCategories.has(cat) ? 0 : 0.6}
              strokeOpacity={hiddenCategories.has(cat) ? 0 : 1}
              strokeWidth={hiddenCategories.has(cat) ? 0 : 1}
              hide={hiddenCategories.has(cat)}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {/* Clickable legend */}
      <div className="flex flex-wrap gap-1.5 justify-center mt-3">
        {categorias.map((cat, i) => {
          const isHidden = hiddenCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-opacity"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                opacity: isHidden ? 0.4 : 1,
              }}
            >
              {categoryIconMap[cat] ? (
                <CategoryIcon icon={categoryIconMap[cat]} size={12} />
              ) : (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
              )}
              <span style={{ color: 'var(--text-secondary)' }}>
                {(() => { const c = stripEmoji(cat); return c.length > 12 ? c.substring(0, 12) + '...' : c; })()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default StackedAreaChart;
