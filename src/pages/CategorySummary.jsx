import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { getRecentMovements } from '../services/sheetsApi';
import { formatCurrency } from '../utils/format';
import DateRangePicker from '../components/DateRangePicker';
import LoadingSpinner from '../components/LoadingSpinner';

// Presets para el selector de fechas
const PERIOD_PRESETS = [
  { label: 'Este mes', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Mes anterior', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: '3 meses', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
];

// Tipos de movimiento para tabs
const MOVEMENT_TABS = [
  { id: 'gasto', label: 'Gastos', color: 'var(--accent-red)', bgDim: 'rgba(239, 68, 68, 0.15)' },
  { id: 'ingreso', label: 'Ingresos', color: 'var(--accent-green)', bgDim: 'rgba(34, 197, 94, 0.15)' },
];

// Colores para el pie chart
const PIE_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#84cc16',
  '#f43f5e', '#0ea5e9', '#a855f7', '#10b981'
];

function CategorySummary() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('gasto');
  const [showChart, setShowChart] = useState(true);
  const [currency, setCurrency] = useState('ARS');
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Cargar movimientos
  useEffect(() => {
    async function loadMovements() {
      try {
        setLoading(true);
        setError(null);
        const data = await getRecentMovements(5000);
        setMovements(data.movements || []);
      } catch (err) {
        console.error('Error loading movements:', err);
        setError('Error al cargar los movimientos');
      } finally {
        setLoading(false);
      }
    }
    loadMovements();
  }, []);

  // Filtrar movimientos por tipo y rango de fechas
  const filteredMovements = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];

    const startDate = new Date(dateRange.from);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateRange.to);
    endDate.setHours(23, 59, 59, 999);

    return movements.filter(m => {
      if (m.tipo !== activeTab) return false;
      const fecha = new Date(m.fecha);
      return fecha >= startDate && fecha <= endDate;
    });
  }, [movements, activeTab, dateRange]);

  // Agrupar por categoria y calcular totales
  const categoryData = useMemo(() => {
    const byCategory = {};
    let totalPesos = 0;
    let totalDolares = 0;

    filteredMovements.forEach(m => {
      const cat = m.categoria || 'Sin categoria';
      const pesos = m.montoPesos || m.monto || 0;
      const dolares = m.montoDolares || 0;

      totalPesos += pesos;
      totalDolares += dolares;

      if (!byCategory[cat]) {
        byCategory[cat] = { pesos: 0, dolares: 0 };
      }
      byCategory[cat].pesos += pesos;
      byCategory[cat].dolares += dolares;
    });

    // Convertir a array y calcular porcentajes
    const categories = Object.entries(byCategory)
      .map(([name, data]) => ({
        name,
        pesos: data.pesos,
        dolares: data.dolares,
        percentage: totalPesos > 0 ? (data.pesos / totalPesos) * 100 : 0,
      }))
      .sort((a, b) => b.pesos - a.pesos);

    return {
      categories,
      totalPesos,
      totalDolares,
    };
  }, [filteredMovements]);

  // Datos para el gráfico de barras
  const chartData = useMemo(() => {
    const total = currency === 'ARS' ? categoryData.totalPesos : categoryData.totalDolares;
    return categoryData.categories.slice(0, 8).map(cat => {
      const value = currency === 'ARS' ? cat.pesos : cat.dolares;
      return {
        name: cat.name.length > 12 ? cat.name.substring(0, 12) + '...' : cat.name,
        fullName: cat.name,
        value: value,
        pesos: cat.pesos,
        dolares: cat.dolares,
        percentage: total > 0 ? (value / total) * 100 : 0,
      };
    });
  }, [categoryData, currency]);

  // Datos para el gráfico de torta
  const pieChartData = useMemo(() => {
    const total = currency === 'ARS' ? categoryData.totalPesos : categoryData.totalDolares;
    return categoryData.categories.map(cat => {
      const value = currency === 'ARS' ? cat.pesos : cat.dolares;
      return {
        name: cat.name,
        value: value,
        percentage: total > 0 ? (value / total) * 100 : 0,
        pesos: cat.pesos,
        dolares: cat.dolares,
      };
    });
  }, [categoryData, currency]);

  // Tooltip personalizado para el gráfico de barras
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="px-3 py-2 rounded-lg shadow-lg"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {data.fullName}
          </p>
          <p className="text-sm" style={{ color: activeTab === 'gasto' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
            {formatCurrency(data.pesos, 'ARS')}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {formatCurrency(data.dolares, 'USD')}
          </p>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
            {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  // Tooltip personalizado para el gráfico de torta
  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="px-3 py-2 rounded-lg shadow-lg"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
            {data.name}
          </p>
          <p className="text-sm" style={{ color: activeTab === 'gasto' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
            {formatCurrency(data.pesos, 'ARS')}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {formatCurrency(data.dolares, 'USD')}
          </p>
          <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>
            {data.percentage.toFixed(1)}% del total
          </p>
        </div>
      );
    }
    return null;
  };

  // Copiar datos al portapapeles
  const handleCopyData = () => {
    const header = 'Categoria\tPesos\tDolares\t%\n';
    const rows = categoryData.categories
      .map(cat => `${cat.name}\t${cat.pesos.toFixed(2)}\t${cat.dolares.toFixed(2)}\t${cat.percentage.toFixed(1)}%`)
      .join('\n');
    const total = `TOTAL\t${categoryData.totalPesos.toFixed(2)}\t${categoryData.totalDolares.toFixed(2)}\t100%`;

    navigator.clipboard.writeText(header + rows + '\n' + total);
    alert('Datos copiados al portapapeles');
  };

  const activeTabData = MOVEMENT_TABS.find(t => t.id === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p style={{ color: 'var(--accent-red)' }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Resumen por categoría
        </h2>
        <div className="flex items-center gap-3">
          {/* Selector de moneda global */}
          <div
            className="inline-flex rounded-lg p-0.5"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <button
              onClick={() => setCurrency('ARS')}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: currency === 'ARS' ? 'var(--accent-primary)' : 'transparent',
                color: currency === 'ARS' ? 'white' : 'var(--text-secondary)',
              }}
            >
              Pesos
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: currency === 'USD' ? 'var(--accent-primary)' : 'transparent',
                color: currency === 'USD' ? 'white' : 'var(--text-secondary)',
              }}
            >
              Dólares
            </button>
          </div>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            presets={PERIOD_PRESETS}
            defaultPreset="Este mes"
          />
        </div>
      </div>

      {/* Tabs */}
      <div
        className="inline-flex rounded-xl p-1"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        {MOVEMENT_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive ? 'shadow-md' : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: isActive ? tab.color : 'transparent',
                color: isActive ? 'white' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Indicador de tipo */}
      <div
        className="h-1 rounded-full transition-all duration-300"
        style={{
          backgroundColor: activeTabData?.bgDim,
          boxShadow: `0 0 20px ${activeTabData?.bgDim}`,
        }}
      />

      {/* Resumen Card */}
      <div
        className="rounded-2xl p-4"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
          Total {activeTab === 'gasto' ? 'Gastos' : 'Ingresos'}
        </p>
        <p
          className="text-2xl font-bold"
          style={{ color: activeTab === 'gasto' ? 'var(--accent-red)' : 'var(--accent-green)' }}
        >
          {formatCurrency(
            currency === 'ARS' ? categoryData.totalPesos : categoryData.totalDolares,
            currency
          )}
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {categoryData.categories.length} categorías
        </p>
      </div>

      {/* Toggle para gráfico en mobile */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Mostrar grafico
        </span>
        <button
          onClick={() => setShowChart(!showChart)}
          className="relative w-11 h-6 rounded-full transition-colors duration-200"
          style={{ backgroundColor: showChart ? 'var(--accent-primary)' : 'var(--bg-tertiary)' }}
        >
          <span
            className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
            style={{ transform: showChart ? 'translateX(20px)' : 'translateX(0)' }}
          />
        </button>
      </div>

      {/* Gráfico de barras horizontales */}
      {showChart && chartData.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Distribucion por Categoria
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis
                type="number"
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                  return value;
                }}
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--border-subtle)' }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={90}
                tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.5 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={30}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={activeTab === 'gasto' ? 'var(--accent-red)' : 'var(--accent-green)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Gráfico de torta */}
      {showChart && pieChartData.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            {activeTab === 'gasto' ? 'Gastos' : 'Ingresos'} por Categoria
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Pie Chart */}
            <div className="md:col-span-2">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell
                        key={`pie-cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Total en el centro (visual) */}
              <div className="text-center -mt-4">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total</p>
                <p
                  className="font-bold"
                  style={{ color: activeTab === 'gasto' ? 'var(--accent-red)' : 'var(--accent-green)' }}
                >
                  {formatCurrency(
                    currency === 'ARS' ? categoryData.totalPesos : categoryData.totalDolares,
                    currency
                  )}
                </p>
              </div>
            </div>

            {/* Leyenda con detalles */}
            <div className="md:col-span-3 flex flex-col justify-center gap-1.5 max-h-64 overflow-y-auto">
              {pieChartData.slice(0, 10).map((entry, index) => (
                <div
                  key={`legend-${index}`}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <span
                      className="text-sm truncate"
                      style={{ color: 'var(--text-primary)' }}
                      title={entry.name}
                    >
                      {entry.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {entry.percentage.toFixed(1)}%
                    </span>
                    <span
                      className="text-sm font-medium min-w-[80px] text-right"
                      style={{ color: activeTab === 'gasto' ? 'var(--accent-red)' : 'var(--accent-green)' }}
                    >
                      {formatCurrency(entry.value, currency)}
                    </span>
                  </div>
                </div>
              ))}
              {pieChartData.length > 10 && (
                <p className="text-xs text-center py-1" style={{ color: 'var(--text-secondary)' }}>
                  +{pieChartData.length - 10} categorias mas
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tabla de categorías */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Detalle por Categoria
          </h3>
          <button
            onClick={handleCopyData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copiar
          </button>
        </div>

        {categoryData.categories.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            No hay {activeTab === 'gasto' ? 'gastos' : 'ingresos'} en este periodo
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Categoria
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Monto
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryData.categories.map((cat, index) => (
                  <tr
                    key={cat.name}
                    className="transition-colors hover:bg-[var(--bg-tertiary)]"
                    style={{
                      backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--bg-tertiary)',
                      opacity: index % 2 === 0 ? 1 : 0.7,
                    }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {cat.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="font-medium text-sm"
                        style={{ color: activeTab === 'gasto' ? 'var(--accent-red)' : 'var(--accent-green)' }}
                      >
                        {formatCurrency(currency === 'ARS' ? cat.pesos : cat.dolares, currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {cat.percentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderTop: '2px solid var(--border-subtle)' }}>
                  <td className="px-4 py-3">
                    <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                      TOTAL
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className="font-bold text-sm"
                      style={{ color: activeTab === 'gasto' ? 'var(--accent-red)' : 'var(--accent-green)' }}
                    >
                      {formatCurrency(currency === 'ARS' ? categoryData.totalPesos : categoryData.totalDolares, currency)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>
                      100%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Info del periodo */}
      <div className="text-center py-2">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Mostrando {categoryData.categories.length} categorias con {filteredMovements.length} movimientos
        </p>
      </div>
    </div>
  );
}

export default CategorySummary;
