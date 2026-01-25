import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/format';

const COLORS = [
  '#f43f5e', '#f97316', '#eab308', '#10b981', '#14b8a6',
  '#0ea5e9', '#8b5cf6', '#ec4899', '#6366f1', '#84cc16'
];

function ExpensePieChart({ data, loading, currency = 'ARS' }) {
  if (loading) {
    return (
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="h-4 w-32 skeleton-shimmer rounded mb-4" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
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
          Gastos por Categoria
        </h3>
        <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
          <p>No hay datos disponibles</p>
        </div>
      </div>
    );
  }



  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="px-3 py-2 rounded-lg shadow-lg"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
            {data.name}
          </p>
          <p style={{ color: 'var(--accent-red)' }}>
            {formatCurrency(data.value)}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap gap-2 justify-center mt-4">
        {payload.slice(0, 6).map((entry, index) => (
          <div
            key={`legend-${index}`}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>
              {entry.value.length > 12 ? entry.value.substring(0, 12) + '...' : entry.value}
            </span>
          </div>
        ))}
        {payload.length > 6 && (
          <div
            className="px-2 py-1 rounded-lg text-xs"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            +{payload.length - 6} mas
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
    >
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
        Gastos por categoría
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={45}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ExpensePieChart;
