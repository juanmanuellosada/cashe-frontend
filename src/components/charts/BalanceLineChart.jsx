import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
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
  ChartTooltipContent,
} from "../ui/Chart";
import { Badge } from "../ui/Badge";
import AnimatedChart, { AnimatedBadge } from "./AnimatedChart";
import { formatCurrency } from "../../utils/format";

const chartConfig = {
  balance: {
    label: "Balance",
    color: "var(--chart-1)",
  },
};

function BalanceLineChart({ data, loading, currency = 'ARS' }) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-4 w-36 skeleton rounded mb-2" />
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
          <CardTitle>Evolución del balance</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-60 flex items-center justify-center text-[var(--text-secondary)]">
            <p>Sin movimientos para mostrar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate trend
  const firstBalance = data[0]?.balance || 0;
  const lastBalance = data[data.length - 1]?.balance || 0;
  const rawPercentage = firstBalance !== 0
    ? ((lastBalance - firstBalance) / Math.abs(firstBalance)) * 100
    : 0;
  // Cap at ±999% to avoid astronomical values when firstBalance is near 0
  const percentageChange = Math.abs(rawPercentage) > 999 ? 0 : rawPercentage;
  const isPositiveTrend = percentageChange >= 0;

  // Calculate min/max for better Y axis
  const values = data.map(d => d.balance);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.1 || 1000;

  const formatYAxis = (value) => {
    const rounded = Math.round(value * 100) / 100;
    if (Math.abs(rounded) < 0.01) return '0';
    if (rounded >= 1000000 || rounded <= -1000000) return `${(rounded / 1000000).toFixed(1)}M`;
    if (rounded >= 1000 || rounded <= -1000) return `${(rounded / 1000).toFixed(0)}K`;
    return rounded.toFixed(0);
  };

  const CustomTooltipContent = ({ active, payload }) => {
    if (!active || !payload?.length) return null;

    const balance = payload[0].value;
    const label = payload[0].payload.month;

    return (
      <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
        <div className="font-medium text-[var(--text-primary)]">{label}</div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--text-muted)]">Balance</span>
          <span
            className="font-mono font-medium tabular-nums"
            style={{ color: balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {formatCurrency(balance)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <AnimatedChart>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Evolución del balance
            {percentageChange !== 0 && (
              <AnimatedBadge delay={0.3}>
                <Badge
                  variant="outline"
                  className={`border-none ${
                    isPositiveTrend
                      ? 'text-green-500 bg-green-500/10'
                      : 'text-red-500 bg-red-500/10'
                  }`}
                >
                  {isPositiveTrend ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(percentageChange).toFixed(1)}%</span>
                </Badge>
              </AnimatedBadge>
            )}
          </CardTitle>
        <CardDescription>Últimos meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-60 w-full">
          <LineChart
            data={data}
            margin={{ left: -10, right: 8, top: 8, bottom: 0 }}
          >
            {/* Background pattern */}
            <defs>
              <pattern
                id="balance-pattern-dots"
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

              {/* Glow effect */}
              <filter
                id="balance-line-glow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>

              {/* Gradient for positive balance */}
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>

            <rect
              x="0"
              y="0"
              width="100%"
              height="85%"
              fill="url(#balance-pattern-dots)"
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
              domain={[minValue - padding, maxValue + padding]}
            />

            <ChartTooltip
              cursor={false}
              content={<CustomTooltipContent />}
            />

            <ReferenceLine
              y={0}
              stroke="var(--text-muted)"
              strokeDasharray="3 3"
              strokeOpacity={0.3}
            />

            <Line
              type="monotone"
              dataKey="balance"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 5,
                fill: "var(--chart-1)",
                stroke: "var(--bg-secondary)",
                strokeWidth: 2,
              }}
              filter="url(#balance-line-glow)"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
    </AnimatedChart>
  );
}

export default BalanceLineChart;
