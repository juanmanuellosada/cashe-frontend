import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/format';
import { isEmoji, resolveIconPath } from '../../services/iconStorage';

const COLORS = [
  '#f43f5e', '#f97316', '#eab308', '#10b981', '#14b8a6',
  '#0ea5e9', '#8b5cf6', '#ec4899', '#6366f1', '#84cc16',
];

const CustomTreemapContent = ({ x, y, width, height, name, value, percentage, index, color, currency, onClick }) => {
  if (width < 4 || height < 4) return null;

  const isSmall = width < 60 || height < 40;
  const isMedium = !isSmall && (width < 120 || height < 60);
  const fillColor = color || COLORS[index % COLORS.length];

  return (
    <g onClick={() => onClick?.(name)} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        ry={4}
        fill={fillColor}
        stroke="var(--bg-secondary)"
        strokeWidth={2}
        style={{ transition: 'opacity 0.15s' }}
        className="hover:opacity-80"
      />
      {!isSmall && (
        <>
          <text
            x={x + width / 2}
            y={y + (isMedium ? height / 2 - 6 : height / 2 - 12)}
            textAnchor="middle"
            fill="white"
            fontSize={isMedium ? 11 : 12}
            fontWeight={600}
          >
            {name.length > Math.floor(width / 7) ? name.substring(0, Math.floor(width / 7)) + '...' : name}
          </text>
          {!isMedium && (
            <text
              x={x + width / 2}
              y={y + height / 2 + 4}
              textAnchor="middle"
              fill="rgba(255,255,255,0.8)"
              fontSize={11}
            >
              {formatCurrency(value, currency)}
            </text>
          )}
          <text
            x={x + width / 2}
            y={y + (isMedium ? height / 2 + 10 : height / 2 + 20)}
            textAnchor="middle"
            fill="rgba(255,255,255,0.6)"
            fontSize={10}
          >
            {percentage?.toFixed(1)}%
          </text>
        </>
      )}
    </g>
  );
};

function ExpenseTreemap({ data, currency = 'ARS', onCategoryClick }) {
  if (!data || data.length === 0) {
    return (
      <div
        className="rounded-xl p-4"
        style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
      >
        <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
          Gastos por categoria
        </h3>
        <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
          <p>No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  // Prepare data with color info for Recharts Treemap
  const treemapData = data.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div
          className="px-3 py-2 rounded-lg shadow-lg"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-1.5">
            {d.icon && (
              isEmoji(d.icon)
                ? <span style={{ fontSize: '14px', lineHeight: 1 }}>{d.icon}</span>
                : <img src={resolveIconPath(d.icon)} alt="" className="w-3.5 h-3.5 rounded-sm" />
            )}
            <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              {d.name}
            </p>
          </div>
          <p className="text-sm" style={{ color: 'var(--accent-red)' }}>
            {formatCurrency(d.value, currency)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {d.percentage?.toFixed(1)}% del total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
    >
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
        Gastos por categoria
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <Treemap
          data={treemapData}
          dataKey="value"
          nameKey="name"
          content={
            <CustomTreemapContent
              currency={currency}
              onClick={onCategoryClick}
            />
          }
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

export default ExpenseTreemap;
