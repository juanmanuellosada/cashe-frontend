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

const ACTUAL_COLOR = "#f59e0b";   // Amber - cálido, destaca
const PROMEDIO_COLOR = "#22d3ee"; // Cyan - contrasta con naranja y fondo oscuro

const chartConfig = {
  actual: {
    label: "Este período",
    color: ACTUAL_COLOR,
  },
  promedio: {
    label: "Promedio",
    color: PROMEDIO_COLOR,
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
          <div className="h-80 flex items-center justify-center">
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
  const percentageDiff = totalPromedio > 0
    ? ((totalActual - totalPromedio) / totalPromedio) * 100
    : 0;
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
            <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: ACTUAL_COLOR }} />
            <span className="text-[var(--text-muted)]">Este período</span>
          </div>
          <span className="font-mono font-medium" style={{ color: ACTUAL_COLOR }}>
            {formatCurrency(actual, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: PROMEDIO_COLOR }} />
            <span className="text-[var(--text-muted)]">Promedio</span>
          </div>
          <span className="font-mono font-medium" style={{ color: PROMEDIO_COLOR }}>
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
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <RadarChart data={data}>
              <defs>
                <filter id="radar-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <PolarGrid
                stroke="var(--text-secondary)"
                strokeOpacity={0.25}
              />

              <PolarAngleAxis
                dataKey="category"
                tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 500 }}
              />

              <PolarRadiusAxis
                angle={90}
                tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                stroke="var(--text-secondary)"
                strokeOpacity={0.15}
                tickFormatter={(value) => {
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value.toFixed(0);
                }}
              />

              <ChartTooltip
                cursor={false}
                content={<CustomTooltipContent />}
              />

              {/* Promedio (background - referencia) */}
              <Radar
                name="Promedio"
                dataKey="promedio"
                stroke={PROMEDIO_COLOR}
                fill={PROMEDIO_COLOR}
                fillOpacity={0.15}
                strokeWidth={2}
                strokeDasharray="6 3"
                strokeOpacity={0.8}
              />

              {/* Actual (foreground - destaca) */}
              <Radar
                name="Este período"
                dataKey="actual"
                stroke={ACTUAL_COLOR}
                fill={ACTUAL_COLOR}
                fillOpacity={0.3}
                strokeWidth={2.5}
                strokeOpacity={1}
                filter="url(#radar-glow)"
                dot={{ r: 3.5, fill: ACTUAL_COLOR, strokeWidth: 0 }}
              />
            </RadarChart>
          </ChartContainer>

          {/* Legend */}
          <div className="flex items-center justify-center gap-8 mt-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-[3px] rounded-full" style={{ backgroundColor: ACTUAL_COLOR }} />
              <span className="text-xs font-medium text-[var(--text-primary)]">Este período</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-[3px] rounded-full opacity-80" style={{ backgroundColor: PROMEDIO_COLOR, backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 3px, var(--bg-card) 3px, var(--bg-card) 5px)' }} />
              <span className="text-xs font-medium text-[var(--text-primary)]">Promedio histórico</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </AnimatedChart>
  );
}

export default CategoryRadarChart;
