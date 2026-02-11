import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useStatistics } from '../contexts/StatisticsContext';
import { formatCurrency, formatDate } from '../utils/format';
import StatisticsFilterBar from '../components/StatisticsFilterBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { ChartContainer, ChartTooltip } from '../components/ui/Chart';
import { Badge } from '../components/ui/Badge';
import AnimatedChart, { AnimatedBadge } from '../components/charts/AnimatedChart';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#14b8a6', '#ec4899', '#6366f1', '#84cc16'
];

function Comparador() {
  const { filteredMovements: allFiltered, dateRange, currency, accounts, loading } = useStatistics();

  // Comparador has its own category filters (NOT shared via context)
  const [selectedExpenseCategories, setSelectedExpenseCategories] = useState([]);
  const [selectedIncomeCategories, setSelectedIncomeCategories] = useState([]);
  const [showCategoryFilters, setShowCategoryFilters] = useState(false);

  // Toggle para arrays
  const toggleArrayFilter = (array, setArray, value) => {
    if (array.includes(value)) {
      setArray(array.filter(v => v !== value));
    } else {
      setArray([...array, value]);
    }
  };

  // Split filtered movements by type
  const filteredMovements = useMemo(() => {
    return {
      gastos: allFiltered.filter(m => m.tipo === 'gasto'),
      ingresos: allFiltered.filter(m => m.tipo === 'ingreso'),
    };
  }, [allFiltered]);

  // Derive unique categories from current data
  const categories = useMemo(() => {
    const gastoCats = new Set();
    const ingresoCats = new Set();
    allFiltered.forEach(m => {
      if (m.tipo === 'gasto') gastoCats.add(m.categoria || 'Sin categoria');
      else if (m.tipo === 'ingreso') ingresoCats.add(m.categoria || 'Sin categoria');
    });
    return {
      gastos: [...gastoCats].sort(),
      ingresos: [...ingresoCats].sort(),
    };
  }, [allFiltered]);

  // Filtrar gastos por categorías
  const filteredGastos = useMemo(() => {
    if (selectedExpenseCategories.length === 0) return filteredMovements.gastos;
    return filteredMovements.gastos.filter(m => selectedExpenseCategories.includes(m.categoria));
  }, [filteredMovements.gastos, selectedExpenseCategories]);

  // Filtrar ingresos por categorías
  const filteredIngresos = useMemo(() => {
    if (selectedIncomeCategories.length === 0) return filteredMovements.ingresos;
    return filteredMovements.ingresos.filter(m => selectedIncomeCategories.includes(m.categoria));
  }, [filteredMovements.ingresos, selectedIncomeCategories]);

  // Calcular totales
  const totals = useMemo(() => {
    const totalIngresos = filteredMovements.ingresos.reduce((sum, m) =>
      sum + (currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0)), 0);
    const totalGastos = filteredMovements.gastos.reduce((sum, m) =>
      sum + (currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0)), 0);
    const balance = totalIngresos - totalGastos;
    const ratio = totalIngresos > 0 ? (totalGastos / totalIngresos) * 100 : 0;
    return { totalIngresos, totalGastos, balance, ratio };
  }, [filteredMovements, currency]);

  // Datos para bar chart
  const barChartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];

    const monthsInRange = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });

    return monthsInRange.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, 'MMM', { locale: es });

      let ingresos = 0;
      let gastos = 0;

      filteredMovements.ingresos.forEach(m => {
        const fecha = new Date(m.fecha);
        if (fecha >= monthStart && fecha <= monthEnd) {
          ingresos += currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0);
        }
      });

      filteredMovements.gastos.forEach(m => {
        const fecha = new Date(m.fecha);
        if (fecha >= monthStart && fecha <= monthEnd) {
          gastos += currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0);
        }
      });

      return {
        month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        ingresos,
        gastos,
      };
    });
  }, [dateRange, filteredMovements, currency]);

  // Datos para el pie chart de gastos
  const expensesPieData = useMemo(() => {
    const byCategory = {};
    let total = 0;

    filteredMovements.gastos.forEach(m => {
      const cat = m.categoria || 'Sin categoria';
      const cleanCat = cat.replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim() || cat;
      const amount = currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0);
      total += amount;

      if (!byCategory[cleanCat]) byCategory[cleanCat] = 0;
      byCategory[cleanCat] += amount;
    });

    return Object.entries(byCategory)
      .map(([name, value]) => ({ name, value, percentage: total > 0 ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredMovements.gastos, currency]);

  // Datos para el pie chart de ingresos
  const incomesPieData = useMemo(() => {
    const byCategory = {};
    let total = 0;

    filteredMovements.ingresos.forEach(m => {
      const cat = m.categoria || 'Sin categoria';
      const cleanCat = cat.replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim() || cat;
      const amount = currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0);
      total += amount;

      if (!byCategory[cleanCat]) byCategory[cleanCat] = 0;
      byCategory[cleanCat] += amount;
    });

    return Object.entries(byCategory)
      .map(([name, value]) => ({ name, value, percentage: total > 0 ? (value / total) * 100 : 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredMovements.ingresos, currency]);

  // Ordenar movimientos por fecha descendente
  const sortedGastos = useMemo(() => {
    return [...filteredGastos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [filteredGastos]);

  const sortedIngresos = useMemo(() => {
    return [...filteredIngresos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [filteredIngresos]);

  // Tooltip personalizado para pie charts
  const PieTooltipContent = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl bg-[var(--bg-tertiary)] border-[var(--border-subtle)]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.fill || payload[0].payload.color }} />
          <span className="font-medium text-[var(--text-primary)]">{data.name}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--text-secondary)]">Monto</span>
          <span className="font-mono font-medium tabular-nums text-[var(--text-primary)]">
            {formatCurrency(data.value, currency)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-0.5 border-t border-[var(--border-subtle)]">
          <span className="text-[var(--text-secondary)]">Porcentaje</span>
          <span className="font-medium text-[var(--text-primary)]">
            {data.percentage?.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  };

  const BarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="px-3 py-2 rounded-lg shadow-xl text-xs"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-[2px]" style={{ backgroundColor: entry.color }} />
                <span style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
              </div>
              <span className="font-mono font-medium" style={{ color: entry.color }}>
                {formatCurrency(entry.value, currency)}
              </span>
            </div>
          ))}
          {payload.length === 2 && (
            <div
              className="mt-1 pt-1 flex items-center justify-between gap-4"
              style={{
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>Balance</span>
              <span
                className="font-mono font-medium"
                style={{ color: payload[0].value - payload[1].value >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
              >
                {formatCurrency(payload[0].value - payload[1].value, currency)}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value;
  };

  // Skeleton loading
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-7 w-40 skeleton rounded" />
          <div className="h-10 w-48 skeleton rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-2xl p-4 h-24 skeleton" />
          ))}
        </div>
        <div className="h-64 skeleton rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Comparador
        </h2>
        <StatisticsFilterBar />
      </div>

      {/* Filtro de categorias (propio del Comparador, NO compartido) */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <button
          onClick={() => setShowCategoryFilters(!showCategoryFilters)}
          className="w-full p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Filtrar por categorias
            </span>
            {(selectedExpenseCategories.length + selectedIncomeCategories.length) > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
              >
                {selectedExpenseCategories.length + selectedIncomeCategories.length}
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 transition-transform ${showCategoryFilters ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-secondary)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showCategoryFilters && (
          <div className="px-4 pb-4 space-y-4">
            {/* Categorias de Gastos */}
            <div>
              <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--accent-red)' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Categorias de gastos
              </p>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {categories.gastos.map((cat, index) => {
                  const selected = selectedExpenseCategories.includes(cat);
                  return (
                    <button
                      key={cat || `expense-cat-${index}`}
                      onClick={() => toggleArrayFilter(selectedExpenseCategories, setSelectedExpenseCategories, cat)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: selected ? 'var(--accent-red)' : 'var(--bg-tertiary)',
                        color: selected ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {cat && cat.length > 20 ? cat.substring(0, 20) + '...' : cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categorias de Ingresos */}
            <div>
              <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--accent-green)' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Categorias de ingresos
              </p>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {categories.ingresos.map((cat, index) => {
                  const selected = selectedIncomeCategories.includes(cat);
                  return (
                    <button
                      key={cat || `income-cat-${index}`}
                      onClick={() => toggleArrayFilter(selectedIncomeCategories, setSelectedIncomeCategories, cat)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: selected ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                        color: selected ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {cat && cat.length > 20 ? cat.substring(0, 20) + '...' : cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {(selectedExpenseCategories.length + selectedIncomeCategories.length) > 0 && (
              <button
                onClick={() => {
                  setSelectedExpenseCategories([]);
                  setSelectedIncomeCategories([]);
                }}
                className="text-xs font-medium"
                style={{ color: 'var(--accent-primary)' }}
              >
                Limpiar filtros de categorias
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Ingresos */}
        <div className="rounded-2xl p-4 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, transparent 70%)' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}>
                <svg className="w-4 h-4" style={{ color: 'var(--accent-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Ingresos</p>
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--accent-green)' }}>
              {formatCurrency(totals.totalIngresos, currency)}
            </p>
          </div>
        </div>

        {/* Total Gastos */}
        <div className="rounded-2xl p-4 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, transparent 70%)' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}>
                <svg className="w-4 h-4" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Gastos</p>
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--accent-red)' }}>
              {formatCurrency(totals.totalGastos, currency)}
            </p>
          </div>
        </div>

        {/* Balance */}
        <div className="rounded-2xl p-4 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="absolute inset-0" style={{
            background: totals.balance >= 0
              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, transparent 70%)'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, transparent 70%)',
          }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                backgroundColor: totals.balance >= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              }}>
                {totals.balance >= 0 ? (
                  <svg className="w-4 h-4" style={{ color: 'var(--accent-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Balance</p>
            </div>
            <p className="text-xl font-bold" style={{ color: totals.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              {totals.balance >= 0 ? '+' : ''}{formatCurrency(totals.balance, currency)}
            </p>
          </div>
        </div>

        {/* Ratio */}
        <div className="rounded-2xl p-4 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, transparent 70%)' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)' }}>
                <svg className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Ratio</p>
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--accent-purple)' }}>{totals.ratio.toFixed(0)}%</p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>de tus ingresos</p>
          </div>
        </div>
      </div>

      {/* Bar Chart - Full width */}
      <AnimatedChart delay={0.1}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Ingresos vs Gastos
              <AnimatedBadge delay={0.4}>
                <Badge
                  variant="outline"
                  className={`border-none ${totals.balance >= 0 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}
                >
                  {totals.balance >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{totals.balance >= 0 ? '+' : ''}{formatCurrency(totals.balance, currency)}</span>
                </Badge>
              </AnimatedBadge>
            </CardTitle>
            <CardDescription>Comparación mensual del período</CardDescription>
          </CardHeader>
          <CardContent>
            {barChartData.length > 0 ? (
              <>
                <ChartContainer config={{ ingresos: { label: 'Ingresos', color: 'var(--accent-green)' }, gastos: { label: 'Gastos', color: 'var(--accent-red)' } }} className="h-60 w-full">
                  <BarChart data={barChartData} margin={{ left: -20, right: 12, top: 12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="comp-ingresosGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-green)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--accent-green)" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="comp-gastosGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent-red)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--accent-red)" stopOpacity={0.6} />
                      </linearGradient>
                      <filter id="comp-bar-glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--text-secondary)" strokeOpacity={0.2} vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <YAxis tickFormatter={formatYAxis} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <ChartTooltip cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.3 }} content={<BarTooltip />} />
                    <Bar dataKey="ingresos" name="Ingresos" fill="url(#comp-ingresosGrad)" radius={[6, 6, 0, 0]} maxBarSize={32} filter="url(#comp-bar-glow)" />
                    <Bar dataKey="gastos" name="Gastos" fill="url(#comp-gastosGrad)" radius={[6, 6, 0, 0]} maxBarSize={32} filter="url(#comp-bar-glow)" />
                  </BarChart>
                </ChartContainer>
                <div className="flex items-center justify-center gap-6 mt-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--accent-green)' }} />
                    <span className="text-xs font-medium text-[var(--text-primary)]">Ingresos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'var(--accent-red)' }} />
                    <span className="text-xs font-medium text-[var(--text-primary)]">Gastos</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-60 flex items-center justify-center text-[var(--text-secondary)]">No hay datos disponibles</div>
            )}
          </CardContent>
        </Card>
      </AnimatedChart>

      {/* Pie Charts - Side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart - Gastos */}
        <AnimatedChart delay={0.2}>
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2">
                Gastos por Categoria
                {expensesPieData[0] && (
                  <AnimatedBadge delay={0.5}>
                    <Badge variant="outline" className="text-red-500 bg-red-500/10 border-none">
                      <TrendingUp className="h-3 w-3" />
                      <span>{expensesPieData[0].percentage.toFixed(0)}%</span>
                    </Badge>
                  </AnimatedBadge>
                )}
              </CardTitle>
              <CardDescription>
                {expensesPieData[0] ? `Mayor gasto: ${expensesPieData[0].name}` : 'Distribución de gastos'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              {expensesPieData.length > 0 ? (
                <>
                  <ChartContainer config={expensesPieData.reduce((c, item, i) => { c[item.name] = { label: item.name, color: COLORS[i % COLORS.length] }; return c; }, {})} className="mx-auto aspect-square h-[240px]">
                    <PieChart>
                      <defs>
                        <filter id="comp-pie-glow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>
                      <ChartTooltip cursor={false} content={<PieTooltipContent />} />
                      <Pie data={expensesPieData.map((item, i) => ({ ...item, fill: COLORS[i % COLORS.length] }))} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3} cornerRadius={5} strokeWidth={2}>
                        {expensesPieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="var(--bg-secondary)" filter="url(#comp-pie-glow)" />
                        ))}
                        <LabelList dataKey="percentage" position="inside" stroke="none" fontSize={12} fontWeight={600} fill="white" formatter={(v) => v >= 5 ? `${v.toFixed(0)}%` : ''} />
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="flex flex-col gap-0.5">
                    {expensesPieData.map((entry, index) => (
                      <div key={`legend-${index}`} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-[var(--bg-tertiary)] transition-all duration-200">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <div className="flex-1 min-w-0">
                          <span className="block truncate text-[var(--text-primary)]">{entry.name}</span>
                          <span className="block text-[10px] text-[var(--text-secondary)] tabular-nums">{formatCurrency(entry.value, currency)}</span>
                        </div>
                        <span className="tabular-nums font-medium flex-shrink-0 text-[var(--text-secondary)]">{entry.percentage.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-[var(--text-secondary)]">No hay gastos en este periodo</div>
              )}
            </CardContent>
          </Card>
        </AnimatedChart>

        {/* Pie Chart - Ingresos */}
        <AnimatedChart delay={0.3}>
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="flex items-center gap-2">
                Ingresos por Categoria
                {incomesPieData[0] && (
                  <AnimatedBadge delay={0.6}>
                    <Badge variant="outline" className="text-green-500 bg-green-500/10 border-none">
                      <TrendingUp className="h-3 w-3" />
                      <span>{incomesPieData[0].percentage.toFixed(0)}%</span>
                    </Badge>
                  </AnimatedBadge>
                )}
              </CardTitle>
              <CardDescription>
                {incomesPieData[0] ? `Mayor ingreso: ${incomesPieData[0].name}` : 'Distribución de ingresos'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              {incomesPieData.length > 0 ? (
                <>
                  <ChartContainer config={incomesPieData.reduce((c, item, i) => { c[item.name] = { label: item.name, color: COLORS[(i + 3) % COLORS.length] }; return c; }, {})} className="mx-auto aspect-square h-[240px]">
                    <PieChart>
                      <ChartTooltip cursor={false} content={<PieTooltipContent />} />
                      <Pie data={incomesPieData.map((item, i) => ({ ...item, fill: COLORS[(i + 3) % COLORS.length] }))} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3} cornerRadius={5} strokeWidth={2}>
                        {incomesPieData.map((_, index) => (
                          <Cell key={`cell-income-${index}`} fill={COLORS[(index + 3) % COLORS.length]} stroke="var(--bg-secondary)" filter="url(#comp-pie-glow)" />
                        ))}
                        <LabelList dataKey="percentage" position="inside" stroke="none" fontSize={12} fontWeight={600} fill="white" formatter={(v) => v >= 5 ? `${v.toFixed(0)}%` : ''} />
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="flex flex-col gap-0.5">
                    {incomesPieData.map((entry, index) => (
                      <div key={`income-legend-${index}`} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs hover:bg-[var(--bg-tertiary)] transition-all duration-200">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[(index + 3) % COLORS.length] }} />
                        <div className="flex-1 min-w-0">
                          <span className="block truncate text-[var(--text-primary)]">{entry.name}</span>
                          <span className="block text-[10px] text-[var(--text-secondary)] tabular-nums">{formatCurrency(entry.value, currency)}</span>
                        </div>
                        <span className="tabular-nums font-medium flex-shrink-0 text-[var(--text-secondary)]">{entry.percentage.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[240px] flex items-center justify-center text-[var(--text-secondary)]">No hay ingresos en este periodo</div>
              )}
            </CardContent>
          </Card>
        </AnimatedChart>
      </div>

      {/* Listas de movimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lista de Gastos */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}>
                <svg className="w-3 h-3" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              Gastos
              <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>({sortedGastos.length})</span>
            </h3>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {sortedGastos.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>Sin gastos en este periodo</p>
            ) : (
              sortedGastos.map((gasto, index) => (
                <div key={gasto.rowIndex || index} className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)]">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{gasto.categoria || 'Sin categoria'}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{gasto.cuenta}</p>
                    {gasto.nota && <p className="text-xs truncate italic mt-0.5" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>"{gasto.nota}"</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold" style={{ color: 'var(--accent-red)' }}>
                      -{formatCurrency(currency === 'ARS' ? (gasto.montoPesos || gasto.monto) : (gasto.montoDolares || 0), currency)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(gasto.fecha, 'short')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          {sortedGastos.length > 0 && (
            <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Total</span>
              <span className="text-xl font-bold" style={{ color: 'var(--accent-red)' }}>
                {formatCurrency(sortedGastos.reduce((sum, g) => sum + (currency === 'ARS' ? (g.montoPesos || g.monto || 0) : (g.montoDolares || 0)), 0), currency)}
              </span>
            </div>
          )}
        </div>

        {/* Lista de Ingresos */}
        <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-secondary)' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}>
                <svg className="w-3 h-3" style={{ color: 'var(--accent-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              Ingresos
              <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>({sortedIngresos.length})</span>
            </h3>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {sortedIngresos.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>Sin ingresos en este periodo</p>
            ) : (
              sortedIngresos.map((ingreso, index) => (
                <div key={ingreso.rowIndex || index} className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)]">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{ingreso.categoria || 'Sin categoria'}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{ingreso.cuenta}</p>
                    {ingreso.nota && <p className="text-xs truncate italic mt-0.5" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>"{ingreso.nota}"</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold" style={{ color: 'var(--accent-green)' }}>
                      +{formatCurrency(currency === 'ARS' ? (ingreso.montoPesos || ingreso.monto) : (ingreso.montoDolares || 0), currency)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{formatDate(ingreso.fecha, 'short')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          {sortedIngresos.length > 0 && (
            <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Total</span>
              <span className="text-xl font-bold" style={{ color: 'var(--accent-green)' }}>
                {formatCurrency(sortedIngresos.reduce((sum, i) => sum + (currency === 'ARS' ? (i.montoPesos || i.monto || 0) : (i.montoDolares || 0)), 0), currency)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Comparador;
