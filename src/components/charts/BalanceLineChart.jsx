import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatCurrency } from '../../utils/format';

function BalanceLineChart({ data, loading, currency = 'ARS' }) {
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
    // Redondear para evitar errores de punto flotante
    const rounded = Math.round(value * 100) / 100;
    if (Math.abs(rounded) < 0.01) return '0';
    if (rounded >= 1000000 || rounded <= -1000000) return `${(rounded / 1000000).toFixed(1)}M`;
    if (rounded >= 1000 || rounded <= -1000) return `${(rounded / 1000).toFixed(0)}K`;
    return rounded.toFixed(0);
  };

  // Calculate min/max for better Y axis
  const values = data.map(d => d.balance);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = (maxValue - minValue) * 0.1 || 1000;

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
    >
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
        Evolución del balance
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.5} vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            domain={[minValue - padding, maxValue + padding]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={0} stroke="var(--text-muted)" strokeDasharray="3 3" strokeOpacity={0.3} />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="var(--accent-primary)"
            strokeWidth={2}
            dot={{ fill: 'var(--accent-primary)', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5, fill: 'var(--accent-primary)', stroke: 'var(--bg-secondary)', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default BalanceLineChart;
