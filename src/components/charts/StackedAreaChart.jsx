import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { eachMonthOfInterval, startOfMonth, endOfMonth, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/Card";
import {
  ChartContainer,
  ChartTooltip,
} from "../ui/Chart";
import { Badge } from "../ui/Badge";
import AnimatedChart, { AnimatedBadge } from "./AnimatedChart";
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

  const { chartData, categorias, chartConfig, topCategory } = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to || !movements?.length) {
      return { chartData: [], categorias: [], chartConfig: {}, topCategory: null };
    }

    const gastos = movements.filter(m => m.tipo === 'gasto');
    if (gastos.length === 0) return { chartData: [], categorias: [], chartConfig: {}, topCategory: null };

    // Find top 8 categories by total
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
    const topCat = sortedCats[0] ? { name: sortedCats[0][0], value: sortedCats[0][1] } : null;

    // Build chart config
    const config = allCats.reduce((acc, cat, i) => {
      acc[cat] = {
        label: cat,
        color: COLORS[i % COLORS.length],
        icon: categoryIconMap[cat],
      };
      return acc;
    }, {});

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

    // Trim leading empty months (keep max 1 empty month before first data)
    const hasData = (entry) => allCats.some(cat => entry[cat] > 0);
    const firstDataIndex = data.findIndex(hasData);
    const trimmedData = firstDataIndex > 1
      ? data.slice(firstDataIndex - 1)
      : data;

    return {
      chartData: trimmedData,
      categorias: allCats,
      chartConfig: config,
      topCategory: topCat
    };
  }, [movements, dateRange, currency, categoryIconMap]);

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

  const CustomTooltipContent = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const total = payload.reduce((sum, p) => sum + (p.value || 0), 0);
    const validPayload = payload.filter(p => p.value > 0).sort((a, b) => b.value - a.value);

    return (
      <div className="grid min-w-[14rem] items-start gap-1.5 rounded-lg border px-3 py-2 text-xs shadow-xl bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
        <div className="font-medium text-[var(--text-primary)] mb-1">{label}</div>

        {validPayload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 min-w-0">
              {categoryIconMap[entry.name] ? (
                <CategoryIcon icon={categoryIconMap[entry.name]} size={12} />
              ) : (
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
              )}
              <span className="truncate text-[var(--text-muted)]">
                {stripEmoji(entry.name)}
              </span>
            </div>
            <span className="font-medium flex-shrink-0 text-[var(--text-primary)]">
              {formatCurrency(entry.value, currency)}
            </span>
          </div>
        ))}

        <div className="mt-1 pt-1.5 flex items-center justify-between border-t border-[var(--border-subtle)]">
          <span className="font-medium text-[var(--text-muted)]">Total</span>
          <span className="font-bold text-[var(--accent-red)]">
            {formatCurrency(total, currency)}
          </span>
        </div>
      </div>
    );
  };

  if (chartData.length === 0) {
    return null;
  }

  const totalGastos = Object.values(chartData.reduce((acc, month) => {
    categorias.forEach(cat => {
      if (!hiddenCategories.has(cat)) {
        acc[cat] = (acc[cat] || 0) + (month[cat] || 0);
      }
    });
    return acc;
  }, {})).reduce((sum, val) => sum + val, 0);

  return (
    <AnimatedChart delay={0.15}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Composición de gastos
            {topCategory && (
              <AnimatedBadge delay={0.45}>
                <Badge
                  variant="outline"
                  className="text-red-500 bg-red-500/10 border-none"
                >
                  <TrendingUp className="h-3 w-3" />
                  <span>{((topCategory.value / totalGastos) * 100).toFixed(0)}%</span>
                </Badge>
              </AnimatedBadge>
            )}
          </CardTitle>
        <CardDescription>
          {topCategory ? `Mayor categoría: ${stripEmoji(topCategory.name)}` : 'Distribución mensual por categoría'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <AreaChart
            data={chartData}
            margin={{ left: -20, right: 12, top: 12, bottom: 0 }}
          >
            <defs>
              {/* Gradients for each category */}
              {categorias.map((cat, i) => (
                <linearGradient key={cat} id={`gradient-${cat}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.8} />
                  <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.2} />
                </linearGradient>
              ))}
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--text-secondary)"
              strokeOpacity={0.2}
            />

            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            />

            <YAxis
              tickFormatter={formatYAxis}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            />

            <ChartTooltip
              cursor={{ strokeDasharray: '3 3', stroke: 'var(--text-secondary)', strokeOpacity: 0.4 }}
              content={<CustomTooltipContent />}
            />

            {categorias.map((cat, i) => (
              <Area
                key={cat}
                type="monotone"
                dataKey={cat}
                stackId="1"
                stroke={COLORS[i % COLORS.length]}
                fill={`url(#gradient-${cat})`}
                fillOpacity={hiddenCategories.has(cat) ? 0 : 1}
                strokeOpacity={hiddenCategories.has(cat) ? 0 : 1}
                strokeWidth={hiddenCategories.has(cat) ? 0 : 2}
                hide={hiddenCategories.has(cat)}
              />
            ))}
          </AreaChart>
        </ChartContainer>

        {/* Clickable legend */}
        <div className="flex flex-wrap gap-1.5 justify-center mt-4">
          {categorias.map((cat, i) => {
            const isHidden = hiddenCategories.has(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  opacity: isHidden ? 0.35 : 1,
                  cursor: 'pointer',
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                {categoryIconMap[cat] && (
                  <CategoryIcon icon={categoryIconMap[cat]} size={12} />
                )}
                <span style={{ color: 'var(--text-primary)' }}>
                  {(() => {
                    const c = stripEmoji(cat);
                    return c.length > 14 ? c.substring(0, 14) + '...' : c;
                  })()}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
    </AnimatedChart>
  );
}

export default StackedAreaChart;
