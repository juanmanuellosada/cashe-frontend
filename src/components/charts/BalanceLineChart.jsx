import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatCurrency } from '../../utils/format';

function BalanceLineChart({ data, loading }) {
  if (loading) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="h-4 w-36 skeleton-shimmer rounded mb-4" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          Evolucion del Balance
        </h3>
        <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
          <p>No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const balance = payload[0].value;
      return (
        <div
          className="px-3 py-2 rounded-lg shadow-lg"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {label}
          </p>
          <p style={{ color: balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            Balance: {formatCurrency(balance)}
          </p>
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    if (value <= -1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value <= -1000) return `${(value / 1000).toFixed(0)}K`;
    return value;
  };

  // Calculate min/max for better Y axis
  const values = data.map(d => d.balance);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.1 || 1000;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Evolucion del Balance
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--border-subtle)' }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            domain={[minValue - padding, maxValue + padding]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="var(--text-secondary)" strokeDasharray="3 3" strokeOpacity={0.5} />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="var(--accent-primary)"
            strokeWidth={3}
            dot={{ fill: 'var(--accent-primary)', strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: 'var(--accent-primary)', stroke: 'var(--bg-secondary)', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BalanceLineChart;
