import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
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

const chartConfig = {
  ingresos: {
    label: "Ingresos",
    color: "var(--accent-green)",
  },
  gastos: {
    label: "Gastos",
    color: "var(--accent-red)",
  },
};

function IncomeExpenseBarChart({ data, loading, currency = 'ARS' }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-4 w-40 skeleton rounded mb-2" />
          <div className="h-3 w-24 skeleton rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-80 flex items-center justify-center">
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
          <CardTitle>Ingresos vs Gastos</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-80 flex items-center justify-center text-[var(--text-secondary)]">
            <p>Sin movimientos para mostrar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate total income and expenses
  const totalIngresos = data.reduce((sum, item) => sum + (item.ingresos || 0), 0);
  const totalGastos = data.reduce((sum, item) => sum + (item.gastos || 0), 0);
  const balance = totalIngresos - totalGastos;
  const isPositive = balance >= 0;

  // Calculate percentage change
  const percentageChange = totalGastos > 0
    ? ((totalIngresos - totalGastos) / totalGastos) * 100
    : 0;

  const formatYAxis = (value) => {
    const rounded = Math.round(value * 100) / 100;
    if (Math.abs(rounded) < 0.01) return '0';
    if (rounded >= 1000000) return `${(rounded / 1000000).toFixed(1)}M`;
    if (rounded >= 1000) return `${(rounded / 1000).toFixed(0)}K`;
    return rounded.toFixed(0);
  };

  const CustomTooltipContent = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const ingresos = payload.find(p => p.dataKey === 'ingresos')?.value || 0;
    const gastos = payload.find(p => p.dataKey === 'gastos')?.value || 0;
    const monthBalance = ingresos - gastos;

    return (
      <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
        <div className="font-medium text-[var(--text-primary)] mb-1">{label}</div>

        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2 h-2 rounded-[2px]"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[var(--text-muted)]">{entry.name}</span>
            </div>
            <span
              className="font-mono font-medium tabular-nums"
              style={{ color: entry.color }}
            >
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}

        {payload.length === 2 && (
          <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)] font-medium">Balance</span>
            <span
              className="font-mono font-medium tabular-nums"
              style={{ color: monthBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
            >
              {formatCurrency(monthBalance)}
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
            Ingresos vs Gastos
            {percentageChange !== 0 && (
              <AnimatedBadge delay={0.5}>
                <Badge
                  variant="outline"
                  className={`border-none ${
                    isPositive
                      ? 'text-green-500 bg-green-500/10'
                      : 'text-red-500 bg-red-500/10'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(percentageChange).toFixed(1)}%</span>
                </Badge>
              </AnimatedBadge>
            )}
          </CardTitle>
        <CardDescription>
          Balance total: {' '}
          <span
            className="font-medium"
            style={{ color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {formatCurrency(balance)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 sm:h-80 w-full">
          <BarChart
            data={data}
            margin={{ left: -10, right: 8, top: 8, bottom: 0 }}
          >
            <defs>
              {/* Background pattern */}
              <pattern
                id="bar-pattern-dots"
                x="0"
                y="0"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <circle
                  cx="2"
                  cy="2"
                  r="1"
                  fill="var(--border-subtle)"
                  opacity="0.5"
                />
              </pattern>

              {/* Gradient for Ingresos */}
              <linearGradient id="ingresosGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-green)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="var(--accent-green)" stopOpacity={0.3} />
              </linearGradient>

              {/* Gradient for Gastos */}
              <linearGradient id="gastosGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-red)" stopOpacity={0.8} />
                <stop offset="100%" stopColor="var(--accent-red)" stopOpacity={0.3} />
              </linearGradient>

              {/* Glow effect */}
              <filter id="bar-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            <rect
              x="0"
              y="0"
              width="100%"
              height="85%"
              fill="url(#bar-pattern-dots)"
            />

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border-subtle)"
              strokeOpacity={0.5}
            />

            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />

            <YAxis
              tickFormatter={formatYAxis}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />

            <ChartTooltip
              cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.3 }}
              content={<CustomTooltipContent />}
            />

            <ChartLegend content={<ChartLegendContent />} />

            <Bar
              dataKey="ingresos"
              fill="url(#ingresosGradient)"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
              filter="url(#bar-glow)"
            />

            <Bar
              dataKey="gastos"
              fill="url(#gastosGradient)"
              radius={[6, 6, 0, 0]}
              maxBarSize={40}
              filter="url(#bar-glow)"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
    </AnimatedChart>
  );
}

export default IncomeExpenseBarChart;
