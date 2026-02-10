import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis, ReferenceLine } from "recharts";
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
import AnimatedChart from "./AnimatedChart";
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
  balance: {
    label: "Balance",
    color: "var(--chart-1)",
  },
};

/**
 * ComposedChart que combina barras (ingresos/gastos) con línea (balance)
 * Ofrece una vista completa de la situación financiera
 */
function IncomeExpenseComposedChart({ data, loading, currency = 'ARS' }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-4 w-48 skeleton rounded mb-2" />
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
          <CardTitle>Vista Completa Financiera</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center text-[var(--text-secondary)]">
            <p>Sin movimientos para mostrar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate data with balance
  const enrichedData = data.map(item => ({
    ...item,
    balance: item.ingresos - item.gastos,
  }));

  // Calculate overall stats
  const totalIngresos = data.reduce((sum, item) => sum + (item.ingresos || 0), 0);
  const totalGastos = data.reduce((sum, item) => sum + (item.gastos || 0), 0);
  const totalBalance = totalIngresos - totalGastos;
  const isPositive = totalBalance >= 0;

  // Calculate trend (comparing first vs last month)
  const firstMonth = enrichedData[0];
  const lastMonth = enrichedData[enrichedData.length - 1];
  const balanceTrend = lastMonth.balance > firstMonth.balance;

  const formatYAxis = (value) => {
    const rounded = Math.round(value * 100) / 100;
    if (Math.abs(rounded) < 0.01) return '0';
    if (Math.abs(rounded) >= 1000000) return `${(rounded / 1000000).toFixed(1)}M`;
    if (Math.abs(rounded) >= 1000) return `${(rounded / 1000).toFixed(0)}K`;
    return rounded.toFixed(0);
  };

  const CustomTooltipContent = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const ingresos = payload.find(p => p.dataKey === 'ingresos')?.value || 0;
    const gastos = payload.find(p => p.dataKey === 'gastos')?.value || 0;
    const balance = payload.find(p => p.dataKey === 'balance')?.value || 0;

    return (
      <div className="grid min-w-[10rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
        <div className="font-medium text-[var(--text-primary)] mb-1">{label}</div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: 'var(--accent-green)' }} />
            <span className="text-[var(--text-muted)]">Ingresos</span>
          </div>
          <span className="font-mono font-medium text-[var(--accent-green)]">
            {formatCurrency(ingresos, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: 'var(--accent-red)' }} />
            <span className="text-[var(--text-muted)]">Gastos</span>
          </div>
          <span className="font-mono font-medium text-[var(--accent-red)]">
            {formatCurrency(gastos, currency)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: 'var(--chart-1)' }} />
            <span className="text-[var(--text-muted)] font-medium">Balance</span>
          </div>
          <span
            className="font-mono font-medium"
            style={{ color: balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {formatCurrency(balance, currency)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <AnimatedChart delay={0.4}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Vista Completa Financiera
            <Badge
              variant="outline"
              className={`border-none ${
                balanceTrend
                  ? 'text-green-500 bg-green-500/10'
                  : 'text-red-500 bg-red-500/10'
              }`}
            >
              {balanceTrend ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>Tendencia {balanceTrend ? 'positiva' : 'negativa'}</span>
            </Badge>
          </CardTitle>
          <CardDescription>
            Balance total: {' '}
            <span
              className="font-medium"
              style={{ color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)' }}
            >
              {formatCurrency(totalBalance, currency)}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-80">
            <ComposedChart
              data={enrichedData}
              margin={{ left: -20, right: 12, top: 12, bottom: 0 }}
            >
              <defs>
                {/* Background pattern */}
                <pattern
                  id="composed-pattern-dots"
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

                {/* Glow for bars */}
                <filter id="composed-bar-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Glow for line */}
                <filter id="composed-line-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              <rect
                x="0"
                y="0"
                width="100%"
                height="85%"
                fill="url(#composed-pattern-dots)"
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

              <ReferenceLine
                y={0}
                stroke="var(--text-muted)"
                strokeDasharray="3 3"
                strokeOpacity={0.3}
              />

              {/* Bars for income and expenses */}
              <Bar
                dataKey="ingresos"
                fill="url(#ingresosGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
                filter="url(#composed-bar-glow)"
              />

              <Bar
                dataKey="gastos"
                fill="url(#gastosGradient)"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
                filter="url(#composed-bar-glow)"
              />

              {/* Line for balance */}
              <Line
                type="monotone"
                dataKey="balance"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={{
                  fill: "var(--chart-1)",
                  strokeWidth: 0,
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                  fill: "var(--chart-1)",
                  stroke: "var(--bg-secondary)",
                  strokeWidth: 2,
                }}
                filter="url(#composed-line-glow)"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </AnimatedChart>
  );
}

export default IncomeExpenseComposedChart;
