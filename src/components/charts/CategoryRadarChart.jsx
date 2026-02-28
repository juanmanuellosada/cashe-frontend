import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "recharts";
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
import AnimatedChart from "./AnimatedChart";
import { formatCurrency } from "../../utils/format";

const chartConfig = {
  actual: {
    label: "Actual",
    color: "#14b8a6", // Teal más brillante para mejor contraste
  },
  promedio: {
    label: "Promedio",
    color: "#60a5fa", // Blue más brillante para mejor contraste
  },
};

/**
 * RadarChart para comparar gastos por categoría
 * Muestra gastos actuales vs promedio histórico
 */
function CategoryRadarChart({ data, loading, currency = 'ARS', period = 'mes' }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-4 w-40 skeleton rounded mb-2" />
          <div className="h-3 w-24 skeleton rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[260px] sm:h-[300px] flex items-center justify-center">
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
          <CardTitle>Comparación por Categoría</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-[var(--text-secondary)]">
            <p>Sin datos para comparar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate if current spending is higher than average
  const totalActual = data.reduce((sum, item) => sum + item.actual, 0);
  const totalPromedio = data.reduce((sum, item) => sum + item.promedio, 0);
  const rawPercentageDiff = totalPromedio > 0
    ? ((totalActual - totalPromedio) / totalPromedio) * 100
    : 0;
  // Cap at ±999% to avoid astronomical values when promedio is near 0
  const percentageDiff = Math.abs(rawPercentageDiff) > 999 ? 0 : rawPercentageDiff;
  const isHigher = percentageDiff > 0;

  // Find category with highest variance
  const categoryWithHighestVar = data.reduce((max, item) => {
    const variance = Math.abs(item.actual - item.promedio);
    return variance > (max.variance || 0) ? { ...item, variance } : max;
  }, {});

  const CustomTooltipContent = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const category = payload[0].payload.category;
    const actual = payload.find(p => p.dataKey === 'actual')?.value || 0;
    const promedio = payload.find(p => p.dataKey === 'promedio')?.value || 0;
    const diff = actual - promedio;

    return (
      <div className="grid min-w-[10rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
        <div className="font-medium text-[var(--text-primary)] mb-1">{category}</div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: '#14b8a6' }} />
            <span className="text-[var(--text-muted)]">Actual</span>
          </div>
          <span className="font-mono font-medium text-[var(--text-primary)]">
            {formatCurrency(actual, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: '#60a5fa' }} />
            <span className="text-[var(--text-muted)]">Promedio</span>
          </div>
          <span className="font-mono font-medium text-[var(--text-primary)]">
            {formatCurrency(promedio, currency)}
          </span>
        </div>

        {diff !== 0 && (
          <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)]">Diferencia</span>
            <span
              className="font-mono font-medium"
              style={{ color: diff > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}
            >
              {diff > 0 ? '+' : ''}{formatCurrency(diff, currency)}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <AnimatedChart delay={0.2}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Comparación por Categoría
            {percentageDiff !== 0 && (
              <Badge
                variant="outline"
                className={`border-none ${
                  isHigher
                    ? 'text-red-500 bg-red-500/10'
                    : 'text-green-500 bg-green-500/10'
                }`}
              >
                <TrendingUp className="h-3 w-3" />
                <span>{Math.abs(percentageDiff).toFixed(0)}%</span>
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {categoryWithHighestVar.category
              ? `Mayor variación: ${categoryWithHighestVar.category}`
              : `Gastos del ${period} vs promedio`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[260px] sm:h-[300px] w-full">
            <RadarChart data={data}>
              <defs>
                {/* Glow effect */}
                <filter id="radar-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Pattern */}
                <pattern
                  id="radar-pattern"
                  x="0"
                  y="0"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="10" cy="10" r="1" fill="var(--border-subtle)" opacity="0.3" />
                </pattern>
              </defs>

              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="url(#radar-pattern)"
                opacity="0.5"
              />

              <PolarGrid
                stroke="var(--border-subtle)"
                strokeDasharray="3 3"
              />

              <PolarAngleAxis
                dataKey="category"
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              />

              <PolarRadiusAxis
                angle={90}
                tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toFixed(0);
                }}
              />

              <ChartTooltip
                cursor={false}
                content={<CustomTooltipContent />}
              />

              {/* Promedio (background) */}
              <Radar
                name="Promedio"
                dataKey="promedio"
                stroke="#60a5fa"
                fill="#60a5fa"
                fillOpacity={0.25}
                strokeWidth={2}
              />

              {/* Actual (foreground) */}
              <Radar
                name="Actual"
                dataKey="actual"
                stroke="#14b8a6"
                fill="#14b8a6"
                fillOpacity={0.5}
                strokeWidth={2.5}
                filter="url(#radar-glow)"
              />
            </RadarChart>
          </ChartContainer>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: '#14b8a6', opacity: 0.6 }}
              />
              <span className="text-xs text-[var(--text-secondary)]">Actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: '#60a5fa', opacity: 0.6 }}
              />
              <span className="text-xs text-[var(--text-secondary)]">Promedio</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedChart>
  );
}

export default CategoryRadarChart;
