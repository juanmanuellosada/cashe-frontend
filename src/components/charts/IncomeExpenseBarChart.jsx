import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatCurrency } from '../../utils/format';

function IncomeExpenseBarChart({ data, loading, currency = 'ARS' }) {
  if (loading) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="h-4 w-40 skeleton-shimmer rounded mb-4" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
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
          Ingresos vs Gastos
        </h3>
        <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
          <p>No hay datos disponibles</p>
        </div>
      </div>
    );
  }



  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="px-3 py-2 rounded-lg shadow-lg"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            {label}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          {payload.length === 2 && (
            <p
              className="mt-1 pt-1 text-sm"
              style={{
                borderTop: '1px solid var(--border-subtle)',
                color: payload[0].value - payload[1].value >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
              }}
            >
              Balance: {formatCurrency(payload[0].value - payload[1].value)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value) => {
    // Redondear para evitar errores de punto flotante
    const rounded = Math.round(value * 100) / 100;
    if (Math.abs(rounded) < 0.01) return '0';
    if (rounded >= 1000000) return `${(rounded / 1000000).toFixed(1)}M`;
    if (rounded >= 1000) return `${(rounded / 1000).toFixed(0)}K`;
    return rounded.toFixed(0);
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
    >
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
        Ingresos vs Gastos
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
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
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.3 }} />
          <Legend
            wrapperStyle={{ paddingTop: '8px' }}
            formatter={(value) => (
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{value}</span>
            )}
          />
          <Bar
            dataKey="ingresos"
            name="Ingresos"
            fill="var(--accent-green)"
            radius={[3, 3, 0, 0]}
            maxBarSize={32}
          />
          <Bar
            dataKey="gastos"
            name="Gastos"
            fill="var(--accent-red)"
            radius={[3, 3, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default IncomeExpenseBarChart;
