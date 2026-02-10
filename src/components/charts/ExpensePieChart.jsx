import { Pie, PieChart, LabelList, Cell } from "recharts";
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
  ChartLegend,
  ChartLegendContent,
} from "../ui/Chart";
import { Badge } from "../ui/Badge";
import AnimatedChart, { AnimatedBadge } from "./AnimatedChart";
import { formatCurrency } from "../../utils/format";
import { isEmoji, resolveIconPath } from "../../services/iconStorage";

const COLORS = [
  '#f43f5e', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#10b981', // Green
  '#14b8a6', // Teal
  '#0ea5e9', // Sky
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#84cc16', // Lime
  '#8b5cf6', // Purple
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

function ExpensePieChart({ data, loading, currency = 'ARS', onSliceClick }) {
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
          <CardTitle>Gastos por categoría</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-60 flex items-center justify-center text-[var(--text-secondary)]">
            <p>Sin gastos para mostrar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total for percentage in badge
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const topCategory = data[0];
  const topPercentage = topCategory ? (topCategory.value / total) * 100 : 0;

  // Build chart config dynamically
  const chartConfig = data.reduce((config, item, index) => {
    config[item.name] = {
      label: item.name,
      color: COLORS[index % COLORS.length],
      icon: item.icon,
    };
    return config;
  }, {});

  // Prepare data for recharts
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
          <span className="text-[var(--text-muted)]">Monto</span>
          <span className="font-mono font-medium tabular-nums text-[var(--accent-red)]">
            {formatCurrency(data.value)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-0.5 border-t border-[var(--border-subtle)]">
          <span className="text-[var(--text-muted)]">Porcentaje</span>
          <span className="font-medium text-[var(--text-primary)]">
            {data.percentage.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  const CustomLegend = ({ payload }) => {
    if (!payload?.length) return null;

    const displayItems = payload.slice(0, 6);
    const hasMore = payload.length > 6;

    return (
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {displayItems.map((entry, index) => {
          const config = chartConfig[entry.value];
          return (
            <div
              key={`legend-${index}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-[var(--bg-tertiary)]"
            >
              {config?.icon ? (
                <CategoryIcon icon={config.icon} size={12} />
              ) : (
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
              )}
              <span className="text-[var(--text-secondary)]">
                {entry.value.length > 12 ? entry.value.substring(0, 12) + '...' : entry.value}
              </span>
            </div>
          );
        })}
        {hasMore && (
          <div className="px-2 py-1 rounded-lg text-xs bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
            +{payload.length - 6} más
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatedChart delay={0.1}>
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2">
            Gastos por categoría
            {topCategory && topPercentage > 0 && (
              <AnimatedBadge delay={0.4}>
                <Badge
                  variant="outline"
                  className="text-red-500 bg-red-500/10 border-none"
                >
                  <TrendingUp className="h-3 w-3" />
                  <span>{topPercentage.toFixed(0)}%</span>
                </Badge>
              </AnimatedBadge>
            )}
          </CardTitle>
        <CardDescription>
          {topCategory ? `Mayor gasto: ${topCategory.name}` : 'Distribución de gastos'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[350px]"
        >
          <PieChart>
            <defs>
              {/* Glow effect */}
              <filter id="pie-glow" x="-50%" y="-50%" width="200%" height="200%">
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
              innerRadius={45}
              outerRadius={80}
              strokeWidth={2}
              paddingAngle={3}
              cornerRadius={6}
              style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
              onClick={(data) => onSliceClick?.(data.name)}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  stroke="var(--bg-secondary)"
                  filter="url(#pie-glow)"
                />
              ))}

              <LabelList
                dataKey="percentage"
                position="inside"
                stroke="none"
                fontSize={11}
                fontWeight={500}
                fill="white"
                formatter={(value) => `${value.toFixed(0)}%`}
              />
            </Pie>

            <ChartLegend content={<CustomLegend />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
    </AnimatedChart>
  );
}

export default ExpensePieChart;
