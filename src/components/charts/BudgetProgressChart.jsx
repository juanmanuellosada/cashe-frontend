import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
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
import AnimatedChart, { AnimatedNumber } from "./AnimatedChart";
import { formatCurrency } from "../../utils/format";

/**
 * RadialBarChart para mostrar progreso de presupuestos
 * Ideal para metas y límites de gasto por categoría
 */
function BudgetProgressChart({ data, loading, currency = 'ARS' }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-4 w-36 skeleton rounded mb-2" />
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
          <CardTitle>Progreso de Presupuestos</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-[var(--text-secondary)]">
            <p>Sin presupuestos configurados</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data with colors based on percentage
  const chartData = data.map((item, index) => {
    const percentage = (item.gastado / item.presupuesto) * 100;
    let fill;

    if (percentage >= 100) {
      fill = 'var(--accent-red)'; // Over budget
    } else if (percentage >= 80) {
      fill = 'var(--accent-yellow)'; // Warning
    } else {
      fill = 'var(--accent-green)'; // Good
    }

    return {
      ...item,
      percentage: Math.min(percentage, 100),
      fill,
      fullPercentage: percentage, // Store real percentage for tooltip
    };
  });

  // Calculate overall progress
  const totalGastado = data.reduce((sum, item) => sum + item.gastado, 0);
  const totalPresupuesto = data.reduce((sum, item) => sum + item.presupuesto, 0);
  const overallPercentage = (totalGastado / totalPresupuesto) * 100;
  const isOverBudget = overallPercentage > 100;
  const isNearLimit = overallPercentage >= 80 && overallPercentage < 100;

  // Find category with highest percentage
  const categoryNearLimit = chartData
    .filter(item => item.fullPercentage >= 80)
    .sort((a, b) => b.fullPercentage - a.fullPercentage)[0];

  const chartConfig = chartData.reduce((config, item, index) => {
    config[item.category] = {
      label: item.category,
      color: item.fill,
    };
    return config;
  }, {});

  const CustomTooltipContent = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    const remaining = data.presupuesto - data.gastado;

    return (
      <div className="grid min-w-[10rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
        <div className="font-medium text-[var(--text-primary)] mb-1">{data.category}</div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--text-muted)]">Gastado</span>
          <span className="font-mono font-medium text-[var(--text-primary)]">
            {formatCurrency(data.gastado, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--text-muted)]">Presupuesto</span>
          <span className="font-mono font-medium text-[var(--text-primary)]">
            {formatCurrency(data.presupuesto, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-[var(--border-subtle)]">
          <span className="text-[var(--text-muted)]">Restante</span>
          <span
            className="font-mono font-medium"
            style={{ color: remaining >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {formatCurrency(remaining, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--text-muted)]">Progreso</span>
          <span
            className="font-medium"
            style={{ color: data.fill }}
          >
            {data.fullPercentage.toFixed(0)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <AnimatedChart delay={0.3}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Progreso de Presupuestos
            {isOverBudget ? (
              <Badge variant="outline" className="text-red-500 bg-red-500/10 border-none">
                <AlertCircle className="h-3 w-3" />
                <span>Excedido</span>
              </Badge>
            ) : isNearLimit ? (
              <Badge variant="outline" className="text-yellow-500 bg-yellow-500/10 border-none">
                <AlertCircle className="h-3 w-3" />
                <span>Cerca del límite</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="text-green-500 bg-green-500/10 border-none">
                <TrendingUp className="h-3 w-3" />
                <span>En control</span>
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {categoryNearLimit
              ? `${categoryNearLimit.category}: ${categoryNearLimit.fullPercentage.toFixed(0)}% usado`
              : 'Todos los presupuestos bajo control'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
            <RadialBarChart
              data={chartData}
              innerRadius={30}
              outerRadius={140}
              startAngle={90}
              endAngle={-270}
            >
              <defs>
                {/* Glow effect for bars */}
                <filter id="radial-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />

              <ChartTooltip
                cursor={false}
                content={<CustomTooltipContent />}
              />

              <RadialBar
                dataKey="percentage"
                background
                cornerRadius={8}
                filter="url(#radial-glow)"
              />
            </RadialBarChart>
          </ChartContainer>

          {/* Center Stats */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              <AnimatedNumber value={`${overallPercentage.toFixed(0)}%`} />
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Usado en total
            </div>
          </div>

          {/* Legend with categories */}
          <div className="grid grid-cols-2 gap-2 mt-6">
            {chartData.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {item.category}
                  </span>
                </div>
                <span
                  className="text-xs font-medium flex-shrink-0 ml-2"
                  style={{ color: item.fill }}
                >
                  {item.fullPercentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AnimatedChart>
  );
}

export default BudgetProgressChart;
