import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { getRecentMovements, getAccounts, getCategories } from '../services/supabaseApi';
import { formatCurrency, formatDate } from '../utils/format';
import DateRangePicker from '../components/DateRangePicker';

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#14b8a6', '#ec4899', '#6366f1', '#84cc16'
];

// Presets para el comparador
const COMPARADOR_PRESETS = [
  { label: 'Este mes', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Mes anterior', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: '3 meses', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
  { label: 'Este anio', getValue: () => ({ from: startOfYear(new Date()), to: endOfMonth(new Date()) }) },
];

function Comparador() {
  const [movements, setMovements] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ ingresos: [], gastos: [] });
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('ARS');

  // Filtros (ahora son arrays para multi-selección)
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [selectedExpenseCategories, setSelectedExpenseCategories] = useState([]);
  const [selectedIncomeCategories, setSelectedIncomeCategories] = useState([]);
  const [showAccountFilters, setShowAccountFilters] = useState(false);
  const [showCategoryFilters, setShowCategoryFilters] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [movementsData, accountsData, categoriesData] = await Promise.all([
          getRecentMovements(2000),
          getAccounts(),
          getCategories(),
        ]);
        setMovements(movementsData.movimientos || []);
        setAccounts(accountsData.accounts || []);
        setCategories(categoriesData.categorias || { ingresos: [], gastos: [] });
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Toggle para arrays
  const toggleArrayFilter = (array, setArray, value) => {
    if (array.includes(value)) {
      setArray(array.filter(v => v !== value));
    } else {
      setArray([...array, value]);
    }
  };

  // Filtrar movimientos por rango de fechas y cuentas
  const filteredMovements = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return { gastos: [], ingresos: [] };

    const startDate = new Date(dateRange.from);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateRange.to);
    endDate.setHours(23, 59, 59, 999);

    const filtered = movements.filter(m => {
      const fecha = new Date(m.fecha);
      if (fecha < startDate || fecha > endDate) return false;
      if (selectedAccounts.length > 0 && !selectedAccounts.includes(m.cuenta)) return false;
      return true;
    });

    return {
      gastos: filtered.filter(m => m.tipo === 'gasto'),
      ingresos: filtered.filter(m => m.tipo === 'ingreso'),
    };
  }, [movements, dateRange, selectedAccounts]);

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

  // Calcular totales (usando todos los movimientos del período, sin filtro de categoría)
  const totals = useMemo(() => {
    const totalIngresosPesos = filteredMovements.ingresos.reduce((sum, m) => sum + (m.montoPesos || m.monto || 0), 0);
    const totalGastosPesos = filteredMovements.gastos.reduce((sum, m) => sum + (m.montoPesos || m.monto || 0), 0);
    const totalIngresosDolares = filteredMovements.ingresos.reduce((sum, m) => sum + (m.montoDolares || 0), 0);
    const totalGastosDolares = filteredMovements.gastos.reduce((sum, m) => sum + (m.montoDolares || 0), 0);
    
    const totalIngresos = currency === 'ARS' ? totalIngresosPesos : totalIngresosDolares;
    const totalGastos = currency === 'ARS' ? totalGastosPesos : totalGastosDolares;
    const balance = totalIngresos - totalGastos;
    const ratio = totalIngresos > 0 ? (totalGastos / totalIngresos) * 100 : 0;

    return { totalIngresos, totalGastos, balance, ratio };
  }, [filteredMovements, currency]);

  // Datos para el gráfico de barras (agrupado por mes si el rango es mayor a 1 mes)
  const barChartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];

    const monthsInRange = eachMonthOfInterval({
      start: dateRange.from,
      end: dateRange.to
    });

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

      if (!byCategory[cleanCat]) {
        byCategory[cleanCat] = 0;
      }
      byCategory[cleanCat] += amount;
    });

    return Object.entries(byCategory)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
      }))
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

      if (!byCategory[cleanCat]) {
        byCategory[cleanCat] = 0;
      }
      byCategory[cleanCat] += amount;
    });

    return Object.entries(byCategory)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
      }))
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

  // Tooltip personalizado para gráficos
  const CustomTooltip = ({ active, payload, color }) => {
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
          <p style={{ color: color || 'var(--accent-primary)' }}>
            {formatCurrency(data.value, currency)}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {data.percentage?.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const BarTooltip = ({ active, payload, label }) => {
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
              {entry.name}: {formatCurrency(entry.value, currency)}
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
              Balance: {formatCurrency(payload[0].value - payload[1].value, currency)}
            </p>
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
        <div className="flex items-center gap-2">
          {/* Currency Selector - Premium design */}
          <div
            className="inline-flex rounded-xl p-1"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <button
              onClick={() => setCurrency('ARS')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 active:scale-95 flex items-center gap-1.5"
              style={{
                backgroundColor: currency === 'ARS' ? 'var(--accent-primary)' : 'transparent',
                color: currency === 'ARS' ? 'white' : 'var(--text-secondary)',
                boxShadow: currency === 'ARS' ? '0 4px 12px var(--accent-primary-glow)' : 'none',
              }}
            >
              <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-4 h-4 rounded-sm" />
              ARS
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 active:scale-95 flex items-center gap-1.5"
              style={{
                backgroundColor: currency === 'USD' ? 'var(--accent-green)' : 'transparent',
                color: currency === 'USD' ? 'white' : 'var(--text-secondary)',
                boxShadow: currency === 'USD' ? '0 4px 12px rgba(0, 217, 154, 0.3)' : 'none',
              }}
            >
              <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-4 h-4 rounded-sm" />
              USD
            </button>
          </div>
          <div className="flex items-center gap-1">
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              presets={COMPARADOR_PRESETS}
              defaultPreset="Este mes"
            />
            {(dateRange.from || dateRange.to) && (
              <button
                onClick={() => setDateRange({ from: null, to: null })}
                className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                title="Limpiar fechas"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filtro de cuentas (multi-selección) */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <button
          onClick={() => setShowAccountFilters(!showAccountFilters)}
          className="w-full p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Filtrar por cuentas
            </span>
            {selectedAccounts.length > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
              >
                {selectedAccounts.length}
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 transition-transform ${showAccountFilters ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-secondary)' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAccountFilters && (
          <div className="px-4 pb-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {accounts.map((account) => {
                const selected = selectedAccounts.includes(account.nombre);
                return (
                  <button
                    key={account.nombre}
                    onClick={() => toggleArrayFilter(selectedAccounts, setSelectedAccounts, account.nombre)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: selected ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      color: selected ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    {account.nombre}
                  </button>
                );
              })}
            </div>
            {selectedAccounts.length > 0 && (
              <button
                onClick={() => setSelectedAccounts([])}
                className="text-xs font-medium"
                style={{ color: 'var(--accent-primary)' }}
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Filtro de categorías (multi-selección) */}
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
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showCategoryFilters && (
          <div className="px-4 pb-4 space-y-4">
            {/* Categorías de Gastos */}
            <div>
              <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--accent-red)' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                Categorias de gastos
              </p>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {categories.gastos?.map((cat, index) => {
                  const catValue = typeof cat === 'object' ? (cat.value || cat.label || cat.name) : cat;
                  const catLabel = typeof cat === 'object' ? (cat.label || cat.name || cat.value) : cat;
                  const selected = selectedExpenseCategories.includes(catValue);
                  return (
                    <button
                      key={catValue || `expense-cat-${index}`}
                      onClick={() => toggleArrayFilter(selectedExpenseCategories, setSelectedExpenseCategories, catValue)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: selected ? 'var(--accent-red)' : 'var(--bg-tertiary)',
                        color: selected ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {catLabel && catLabel.length > 20 ? catLabel.substring(0, 20) + '...' : catLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Categorías de Ingresos */}
            <div>
              <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--accent-green)' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Categorias de ingresos
              </p>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {categories.ingresos?.map((cat, index) => {
                  const catValue = typeof cat === 'object' ? (cat.value || cat.label || cat.name) : cat;
                  const catLabel = typeof cat === 'object' ? (cat.label || cat.name || cat.value) : cat;
                  const selected = selectedIncomeCategories.includes(catValue);
                  return (
                    <button
                      key={catValue || `income-cat-${index}`}
                      onClick={() => toggleArrayFilter(selectedIncomeCategories, setSelectedIncomeCategories, catValue)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: selected ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                        color: selected ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {catLabel && catLabel.length > 20 ? catLabel.substring(0, 20) + '...' : catLabel}
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
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, transparent 70%)' }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}
              >
                <svg className="w-4 h-4" style={{ color: 'var(--accent-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Ingresos
              </p>
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--accent-green)' }}>
              {formatCurrency(totals.totalIngresos, currency)}
            </p>
          </div>
        </div>

        {/* Total Gastos */}
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, transparent 70%)' }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
              >
                <svg className="w-4 h-4" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Gastos
              </p>
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--accent-red)' }}>
              {formatCurrency(totals.totalGastos, currency)}
            </p>
          </div>
        </div>

        {/* Balance */}
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: totals.balance >= 0
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, transparent 70%)'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, transparent 70%)'
            }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: totals.balance >= 0
                    ? 'rgba(34, 197, 94, 0.15)'
                    : 'rgba(239, 68, 68, 0.15)'
                }}
              >
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
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Balance
              </p>
            </div>
            <p
              className="text-xl font-bold"
              style={{ color: totals.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
            >
              {totals.balance >= 0 ? '+' : ''}{formatCurrency(totals.balance, currency)}
            </p>
          </div>
        </div>

        {/* Ratio */}
        <div
          className="rounded-2xl p-4 relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.1) 0%, transparent 70%)' }}
          />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)' }}
              >
                <svg className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                Ratio
              </p>
            </div>
            <p className="text-lg font-bold" style={{ color: 'var(--accent-purple)' }}>
              {totals.ratio.toFixed(0)}%
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              de tus ingresos
            </p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bar Chart - Ingresos vs Gastos */}
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Ingresos vs Gastos
          </h3>
          {barChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.5 }} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px' }}
                  formatter={(value) => (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value}</span>
                  )}
                />
                <Bar dataKey="ingresos" name="Ingresos" fill="var(--accent-green)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                <Bar dataKey="gastos" name="Gastos" fill="var(--accent-red)" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
              No hay datos disponibles
            </div>
          )}
        </div>

        {/* Pie Chart - Gastos por Categoría */}
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Gastos por Categoria
          </h3>
          {expensesPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={expensesPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {expensesPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip color="var(--accent-red)" />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
              No hay gastos en este periodo
            </div>
          )}
          {/* Legend */}
          {expensesPieData.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {expensesPieData.slice(0, 4).map((entry, index) => (
                <div
                  key={`legend-${index}`}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {entry.name.length > 10 ? entry.name.substring(0, 10) + '...' : entry.name}
                  </span>
                </div>
              ))}
              {expensesPieData.length > 4 && (
                <div className="px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                  +{expensesPieData.length - 4} mas
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Pie Chart de Ingresos - Con leyenda más ancha */}
      {incomesPieData.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Ingresos por Categoria
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={incomesPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {incomesPieData.map((entry, index) => (
                      <Cell key={`cell-income-${index}`} fill={COLORS[(index + 3) % COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip color="var(--accent-green)" />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="md:col-span-3 flex flex-col justify-center gap-2">
              {incomesPieData.map((entry, index) => (
                <div key={`income-legend-${index}`} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[(index + 3) % COLORS.length] }} />
                    <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }} title={entry.name}>
                      {entry.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {entry.percentage.toFixed(1)}%
                    </span>
                    <span className="text-sm font-medium" style={{ color: 'var(--accent-green)' }}>
                      {formatCurrency(entry.value, currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Listas de movimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lista de Gastos */}
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
              >
                <svg className="w-3 h-3" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              Gastos
              <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
                ({sortedGastos.length})
              </span>
            </h3>
          </div>

          {/* Filtros de gastos */}
          <div className="mb-4 space-y-3">
            {/* Filtro por cuentas */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Filtrar por cuenta:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {accounts.map(account => {
                  const selected = selectedAccounts.includes(account.nombre);
                  return (
                    <button
                      key={account.nombre}
                      onClick={() => toggleArrayFilter(selectedAccounts, setSelectedAccounts, account.nombre)}
                      className="px-2 py-1 rounded-full text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: selected ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        color: selected ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {account.nombre.length > 15 ? account.nombre.substring(0, 15) + '...' : account.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtro por categoría */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Filtrar por categoria:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {categories.gastos?.map((cat, index) => {
                  const catValue = typeof cat === 'object' ? (cat.value || cat.label || cat.name) : cat;
                  const catLabel = typeof cat === 'object' ? (cat.label || cat.name || cat.value) : cat;
                  const selected = selectedExpenseCategories.includes(catValue);
                  return (
                    <button
                      key={catValue || `expense-filter-${index}`}
                      onClick={() => toggleArrayFilter(selectedExpenseCategories, setSelectedExpenseCategories, catValue)}
                      className="px-2 py-1 rounded-full text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: selected ? 'var(--accent-red)' : 'var(--bg-tertiary)',
                        color: selected ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {catLabel && catLabel.length > 15 ? catLabel.substring(0, 15) + '...' : catLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {(selectedAccounts.length > 0 || selectedExpenseCategories.length > 0) && (
              <button
                onClick={() => {
                  setSelectedAccounts([]);
                  setSelectedExpenseCategories([]);
                }}
                className="text-xs font-medium"
                style={{ color: 'var(--accent-red)' }}
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {sortedGastos.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Sin gastos en este periodo
              </p>
            ) : (
              sortedGastos.map((gasto, index) => (
                <div
                  key={gasto.rowIndex || index}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {gasto.categoria || 'Sin categoria'}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {gasto.cuenta}
                    </p>
                    {gasto.nota && (
                      <p className="text-xs truncate italic mt-0.5" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                        "{gasto.nota}"
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold" style={{ color: 'var(--accent-red)' }}>
                      -{formatCurrency(currency === 'ARS' ? (gasto.montoPesos || gasto.monto) : (gasto.montoDolares || 0), currency)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(gasto.fecha, 'short')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total */}
          {sortedGastos.length > 0 && (
            <div
              className="mt-4 pt-4 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Total</span>
              <span className="text-xl font-bold" style={{ color: 'var(--accent-red)' }}>
                {formatCurrency(sortedGastos.reduce((sum, g) => sum + (currency === 'ARS' ? (g.montoPesos || g.monto || 0) : (g.montoDolares || 0)), 0), currency)}
              </span>
            </div>
          )}
        </div>

        {/* Lista de Ingresos */}
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}
              >
                <svg className="w-3 h-3" style={{ color: 'var(--accent-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              Ingresos
              <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
                ({sortedIngresos.length})
              </span>
            </h3>
          </div>

          {/* Filtros de ingresos */}
          <div className="mb-4 space-y-3">
            {/* Filtro por cuentas */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Filtrar por cuenta:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {accounts.map(account => {
                  const selected = selectedAccounts.includes(account.nombre);
                  return (
                    <button
                      key={account.nombre}
                      onClick={() => toggleArrayFilter(selectedAccounts, setSelectedAccounts, account.nombre)}
                      className="px-2 py-1 rounded-full text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: selected ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                        color: selected ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {account.nombre.length > 15 ? account.nombre.substring(0, 15) + '...' : account.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtro por categoría */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Filtrar por categoria:
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {categories.ingresos?.map((cat, index) => {
                  const catValue = typeof cat === 'object' ? (cat.value || cat.label || cat.name) : cat;
                  const catLabel = typeof cat === 'object' ? (cat.label || cat.name || cat.value) : cat;
                  const selected = selectedIncomeCategories.includes(catValue);
                  return (
                    <button
                      key={catValue || `income-filter-${index}`}
                      onClick={() => toggleArrayFilter(selectedIncomeCategories, setSelectedIncomeCategories, catValue)}
                      className="px-2 py-1 rounded-full text-xs font-medium transition-colors"
                      style={{
                        backgroundColor: selected ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                        color: selected ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {catLabel && catLabel.length > 15 ? catLabel.substring(0, 15) + '...' : catLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {(selectedAccounts.length > 0 || selectedIncomeCategories.length > 0) && (
              <button
                onClick={() => {
                  setSelectedAccounts([]);
                  setSelectedIncomeCategories([]);
                }}
                className="text-xs font-medium"
                style={{ color: 'var(--accent-green)' }}
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {sortedIngresos.length === 0 ? (
              <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Sin ingresos en este periodo
              </p>
            ) : (
              sortedIngresos.map((ingreso, index) => (
                <div
                  key={ingreso.rowIndex || index}
                  className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {ingreso.categoria || 'Sin categoria'}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {ingreso.cuenta}
                    </p>
                    {ingreso.nota && (
                      <p className="text-xs truncate italic mt-0.5" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                        "{ingreso.nota}"
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold" style={{ color: 'var(--accent-green)' }}>
                      +{formatCurrency(currency === 'ARS' ? (ingreso.montoPesos || ingreso.monto) : (ingreso.montoDolares || 0), currency)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(ingreso.fecha, 'short')}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total */}
          {sortedIngresos.length > 0 && (
            <div
              className="mt-4 pt-4 flex items-center justify-between"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
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
