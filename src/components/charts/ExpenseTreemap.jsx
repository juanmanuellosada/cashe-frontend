import { Treemap } from 'recharts';
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
import AnimatedChart from "./AnimatedChart";
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
      <Card>
        <CardHeader>
          <CardTitle>Gastos por categoría</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-[var(--text-secondary)]">
            <p>Sin gastos para mostrar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data with color info for Recharts Treemap
  const treemapData = data.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length],
  }));

  const chartConfig = treemapData.reduce((config, item, index) => {
    config[item.name] = {
      label: item.name,
      color: COLORS[index % COLORS.length],
    };
    return config;
  }, {});

  const CustomTooltipContent = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
        <div className="flex items-center gap-1.5">
          {d.icon && (
            isEmoji(d.icon)
              ? <span style={{ fontSize: '14px', lineHeight: 1 }}>{d.icon}</span>
              : <img src={resolveIconPath(d.icon)} alt="" className="w-3.5 h-3.5 rounded-sm" />
          )}
          <span className="font-medium text-[var(--text-primary)]">{d.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--text-secondary)]">Monto</span>
          <span className="font-mono font-medium tabular-nums text-[var(--accent-red)]">
            {formatCurrency(d.value, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-0.5 border-t border-[var(--border-subtle)]">
          <span className="text-[var(--text-secondary)]">Porcentaje</span>
          <span className="font-medium text-[var(--text-primary)]">
            {d.percentage?.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <AnimatedChart delay={0.15}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Gastos por categoría</CardTitle>
          <CardDescription>Vista treemap</CardDescription>
        </CardHeader>
        <CardContent className="pb-4">
          <ChartContainer config={chartConfig} className="w-full h-[280px]">
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
              <ChartTooltip
                cursor={false}
                content={<CustomTooltipContent />}
              />
            </Treemap>
          </ChartContainer>
        </CardContent>
      </Card>
    </AnimatedChart>
  );
}

export default ExpenseTreemap;
