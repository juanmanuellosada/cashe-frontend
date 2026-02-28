import { useState, useCallback, useRef } from "react";
import { Pie, PieChart, LabelList, Cell, Sector } from "recharts";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
import { formatCurrency } from "../../utils/format";
import { isEmoji, resolveIconPath } from "../../services/iconStorage";

const COLORS = [
  '#10b981', // Green
  '#14b8a6', // Teal
  '#0ea5e9', // Sky
  '#6366f1', // Indigo
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#84cc16', // Lime
  '#ec4899', // Pink
  '#f97316', // Orange
  '#22d3ee', // Cyan
];

const CategoryIcon = ({ icon, size = 14 }) => {
  if (!icon) return null;
  if (isEmoji(icon)) {
    return <span style={{ fontSize: `${size}px`, lineHeight: 1 }}>{icon}</span>;
  }
  return (
    <img
      src={resolveIconPath(icon)}
      alt=""
      style={{ width: `${size}px`, height: `${size}px`, borderRadius: '3px' }}
      className="flex-shrink-0"
    />
  );
};

function IncomePieChart({ data, loading, currency = 'ARS', dateRange }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const [chartPercent, setChartPercent] = useState(65);
  const [legendExpanded, setLegendExpanded] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const dragging = useRef(false);
  const containerRef = useRef(null);

  const onPieEnter = useCallback((_, index) => setActiveIndex(index), []);
  const onPieLeave = useCallback(() => setActiveIndex(null), []);

  const handleDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    const onMove = (ev) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (ev.clientX || ev.touches?.[0]?.clientX) - rect.left;
      const pct = Math.round((x / rect.width) * 100);
      setChartPercent(Math.max(35, Math.min(75, pct)));
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onUp);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-4 w-32 skeleton rounded mb-2" />
          <div className="h-3 w-24 skeleton rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-60 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ingresos por categoría</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-60 flex items-center justify-center text-[var(--text-secondary)]">
            <p>Sin ingresos para mostrar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const topCategory = data[0];
  const topPercentage = topCategory ? (topCategory.value / total) * 100 : 0;

  const chartConfig = data.reduce((config, item, index) => {
    config[item.name] = {
      label: item.name,
      color: COLORS[index % COLORS.length],
      icon: item.icon,
    };
    return config;
  }, {});

  const chartData = data.map((item, index) => ({
    ...item,
    fill: COLORS[index % COLORS.length],
  }));

  const CustomTooltipContent = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
        <div className="flex items-center gap-1.5">
          {data.icon && <CategoryIcon icon={data.icon} size={14} />}
          <span className="font-medium text-[var(--text-primary)]">{data.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--text-secondary)]">Monto</span>
          <span className="font-mono font-medium tabular-nums text-[var(--accent-green)]">
            {formatCurrency(data.value)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-0.5 border-t border-[var(--border-subtle)]">
          <span className="text-[var(--text-secondary)]">Porcentaje</span>
          <span className="font-medium text-[var(--text-primary)]">
            {data.percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  const VISIBLE_COUNT = 6;
  const needsExpand = chartData.length > VISIBLE_COUNT;
  const visibleData = legendExpanded ? chartData : chartData.slice(0, VISIBLE_COUNT);
  const hiddenCount = chartData.length - VISIBLE_COUNT;

  const LegendPanel = () => {
    return (
      <div className="flex flex-col gap-0.5">
        {visibleData.map((entry) => {
          const realIndex = chartData.indexOf(entry);
          const percentage = ((entry.value / total) * 100).toFixed(1);
          const isActive = activeIndex === realIndex;
          return (
            <div
              key={`legend-${realIndex}`}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-all duration-200 ${
                isActive ? 'bg-[var(--bg-tertiary)] scale-[1.02] shadow-sm' : 'hover:bg-[var(--bg-tertiary)]'
              }`}
              onMouseEnter={() => setActiveIndex(realIndex)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              <div
                className={`w-3 h-3 rounded-full flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-125' : ''}`}
                style={{ backgroundColor: entry.fill }}
              />
              {entry.icon && (
                <CategoryIcon icon={entry.icon} size={14} />
              )}
              <div className="flex-1 min-w-0">
                <span className={`block truncate transition-colors duration-200 ${isActive ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-primary)]'}`}>
                  {entry.name}
                </span>
                <span className="block text-[10px] text-[var(--text-secondary)] tabular-nums">
                  {formatCurrency(entry.value, currency)}
                </span>
              </div>
              <span className={`tabular-nums font-medium flex-shrink-0 transition-colors duration-200 ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                {percentage}%
              </span>
            </div>
          );
        })}
        {needsExpand && (
          <button
            onClick={() => setLegendExpanded(!legendExpanded)}
            className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--accent-primary)' }}
          >
            <span>{legendExpanded ? 'Ver menos' : `Ver todas (${hiddenCount} más)`}</span>
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${legendExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  return (
    <AnimatedChart delay={0.15}>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2">
            Ingresos por categoría
            {topCategory && topPercentage > 0 && (
              <AnimatedBadge delay={0.4}>
                <Badge
                  variant="outline"
                  className="text-green-500 bg-green-500/10 border-none"
                >
                  <TrendingUp className="h-3 w-3" />
                  <span>{topPercentage.toFixed(0)}%</span>
                </Badge>
              </AnimatedBadge>
            )}
          </CardTitle>
        <div className="flex items-center justify-between">
          <div>
            <CardDescription className="flex items-center gap-1">
              {topCategory ? (
                <>
                  Mayor ingreso: {topCategory.icon && <CategoryIcon icon={topCategory.icon} size={13} />} {topCategory.name}
                </>
              ) : 'Distribución de ingresos'}
            </CardDescription>
            {dateRange?.from && dateRange?.to && (
              <span className="text-[11px] text-[var(--text-muted)]">
                {format(new Date(dateRange.from), "d MMM yyyy", { locale: es })} — {format(new Date(dateRange.to), "d MMM yyyy", { locale: es })}
              </span>
            )}
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-[var(--accent-primary)] cursor-pointer"
            />
            <span className="text-[11px] text-[var(--text-muted)]">%</span>
          </label>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-4">
        <div className="flex flex-col lg:flex-row lg:items-start" ref={containerRef}>
          <div className="flex-shrink-0" style={{ width: `${chartPercent}%` }}>
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square h-[300px] lg:h-[380px]"
            >
              <PieChart>
                <defs>
                  <filter id="income-pie-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                <ChartTooltip
                  cursor={false}
                  content={<CustomTooltipContent />}
                />

                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={75}
                  outerRadius={145}
                  strokeWidth={2}
                  paddingAngle={3}
                  cornerRadius={6}
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  activeIndex={activeIndex}
                  activeShape={({ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }) => (
                    <Sector
                      cx={cx}
                      cy={cy}
                      innerRadius={innerRadius - 2}
                      outerRadius={outerRadius + 6}
                      startAngle={startAngle}
                      endAngle={endAngle}
                      fill={fill}
                      stroke="var(--bg-secondary)"
                      strokeWidth={2}
                    />
                  )}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.fill}
                      stroke="var(--bg-secondary)"
                      filter="url(#income-pie-glow)"
                    />
                  ))}

                  <LabelList
                    dataKey="percentage"
                    position="inside"
                    stroke="none"
                    fontSize={13}
                    fontWeight={600}
                    fill={showLabels ? 'white' : 'transparent'}
                    formatter={(value) => showLabels && value >= 4 ? `${value.toFixed(0)}%` : ''}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>

          <div
            className="hidden lg:flex items-center justify-center cursor-col-resize select-none flex-shrink-0 group"
            style={{ width: '12px' }}
            onMouseDown={handleDividerMouseDown}
            onTouchStart={handleDividerMouseDown}
          >
            <div
              className="w-1 h-12 rounded-full transition-colors group-hover:bg-[var(--text-muted)]"
              style={{ backgroundColor: 'var(--border-subtle)' }}
            />
          </div>

          <div className="min-w-0 mt-2 lg:mt-0" style={{ flex: `0 0 ${100 - chartPercent - 2}%` }}>
            <LegendPanel />
          </div>
        </div>
      </CardContent>
    </Card>
    </AnimatedChart>
  );
}

export default IncomePieChart;
