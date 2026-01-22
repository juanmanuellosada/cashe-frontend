import { useState, useEffect, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { getRecentMovements } from '../services/sheetsApi';
import { formatCurrency } from '../utils/format';
import DateRangePicker from '../components/DateRangePicker';
import ExpensePieChart from '../components/charts/ExpensePieChart';
import IncomeExpenseBarChart from '../components/charts/IncomeExpenseBarChart';
import BalanceLineChart from '../components/charts/BalanceLineChart';

// Presets específicos para estadísticas
const STATS_PRESETS = [
  { label: 'Este mes', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: '3 meses', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
  { label: '6 meses', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 5)), to: endOfMonth(new Date()) }) },
  { label: '12 meses', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 11)), to: endOfMonth(new Date()) }) },
];

function Statistics() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date())
  });
  // Estado global de moneda para toda la sección
  const [currency, setCurrency] = useState('ARS');

  useEffect(() => {
    async function loadMovements() {
      try {
        setLoading(true);
        const data = await getRecentMovements(1000);
        setMovements(data.movements || []);
      } catch (err) {
        console.error('Error loading movements:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMovements();
  }, []);

  // Process data for pie chart (expenses by category)
  const pieChartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];

    const startDate = new Date(dateRange.from);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateRange.to);
    endDate.setHours(23, 59, 59, 999);

    const expenses = movements.filter(m => {
      if (m.tipo !== 'gasto') return false;
      const fecha = new Date(m.fecha);
      return fecha >= startDate && fecha <= endDate;
    });

    const byCategory = {};
    let totalPesos = 0;
    let totalDolares = 0;

    expenses.forEach(m => {
      const cat = m.categoria || 'Sin categoria';
      const cleanCat = cat.replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim() || cat;
      const pesos = m.montoPesos || m.monto || 0;
      const dolares = m.montoDolares || 0;
      
      totalPesos += pesos;
      totalDolares += dolares;

      if (!byCategory[cleanCat]) {
        byCategory[cleanCat] = { pesos: 0, dolares: 0 };
      }
      byCategory[cleanCat].pesos += pesos;
      byCategory[cleanCat].dolares += dolares;
    });

    const total = currency === 'ARS' ? totalPesos : totalDolares;

    return Object.entries(byCategory)
      .map(([name, data]) => {
        const value = currency === 'ARS' ? data.pesos : data.dolares;
        return {
          name,
          value,
          pesos: data.pesos,
          dolares: data.dolares,
          percentage: total > 0 ? (value / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [movements, dateRange, currency]);

  // Process data for bar chart (income vs expenses by month)
  const barChartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];

    // Get all months in the range
    const monthsInRange = eachMonthOfInterval({
      start: dateRange.from,
      end: dateRange.to
    });

    return monthsInRange.map(monthDate => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM', { locale: es });

      let ingresosPesos = 0;
      let gastosPesos = 0;
      let ingresosDolares = 0;
      let gastosDolares = 0;

      movements.forEach(m => {
        const fecha = new Date(m.fecha);
        if (fecha >= monthStart && fecha <= monthEnd) {
          const pesos = m.montoPesos || m.monto || 0;
          const dolares = m.montoDolares || 0;
          if (m.tipo === 'ingreso') {
            ingresosPesos += pesos;
            ingresosDolares += dolares;
          } else if (m.tipo === 'gasto') {
            gastosPesos += pesos;
            gastosDolares += dolares;
          }
        }
      });

      return {
        month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        monthKey,
        ingresos: currency === 'ARS' ? ingresosPesos : ingresosDolares,
        gastos: currency === 'ARS' ? gastosPesos : gastosDolares,
        ingresosPesos,
        gastosPesos,
        ingresosDolares,
        gastosDolares,
      };
    });
  }, [movements, dateRange, currency]);

  // Process data for line chart (balance evolution)
  const lineChartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];

    // Get all months in the range
    const monthsInRange = eachMonthOfInterval({
      start: dateRange.from,
      end: dateRange.to
    });

    // Get all movements sorted by date
    const sortedMovements = [...movements].sort(
      (a, b) => new Date(a.fecha) - new Date(b.fecha)
    );

    // Calculate balance for each month
    return monthsInRange.map(monthDate => {
      const monthEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, 'MMM', { locale: es });

      // Sum all movements up to this month
      let balancePesos = 0;
      let balanceDolares = 0;
      sortedMovements.forEach(m => {
        const fecha = new Date(m.fecha);
        if (fecha <= monthEnd) {
          const pesos = m.montoPesos || m.monto || 0;
          const dolares = m.montoDolares || 0;
          if (m.tipo === 'ingreso') {
            balancePesos += pesos;
            balanceDolares += dolares;
          } else if (m.tipo === 'gasto') {
            balancePesos -= pesos;
            balanceDolares -= dolares;
          }
        }
      });

      return {
        month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        balance: currency === 'ARS' ? balancePesos : balanceDolares,
        balancePesos,
        balanceDolares,
      };
    });
  }, [movements, dateRange, currency]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    if (!dateRange.from || !dateRange.to) {
      return { totalIngresos: 0, totalGastos: 0, balance: 0, savingsRate: 0 };
    }

    const startDate = new Date(dateRange.from);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateRange.to);
    endDate.setHours(23, 59, 59, 999);

    let totalIngresosPesos = 0;
    let totalGastosPesos = 0;
    let totalIngresosDolares = 0;
    let totalGastosDolares = 0;

    movements.forEach(m => {
      const fecha = new Date(m.fecha);
      if (fecha >= startDate && fecha <= endDate) {
        const pesos = m.montoPesos || m.monto || 0;
        const dolares = m.montoDolares || 0;
        if (m.tipo === 'ingreso') {
          totalIngresosPesos += pesos;
          totalIngresosDolares += dolares;
        } else if (m.tipo === 'gasto') {
          totalGastosPesos += pesos;
          totalGastosDolares += dolares;
        }
      }
    });

    const totalIngresos = currency === 'ARS' ? totalIngresosPesos : totalIngresosDolares;
    const totalGastos = currency === 'ARS' ? totalGastosPesos : totalGastosDolares;

    return {
      totalIngresos,
      totalGastos,
      balance: totalIngresos - totalGastos,
      savingsRate: totalIngresos > 0 ? ((totalIngresos - totalGastos) / totalIngresos) * 100 : 0,
    };
  }, [movements, dateRange, currency]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Estadisticas
        </h2>
        <div className="flex items-center gap-2">
          {/* Currency Selector */}
          <div
            className="inline-flex rounded-lg p-0.5"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <button
              onClick={() => setCurrency('ARS')}
              className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: currency === 'ARS' ? 'var(--accent-primary)' : 'transparent',
                color: currency === 'ARS' ? 'white' : 'var(--text-secondary)',
              }}
            >
              Pesos
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-200"
              style={{
                backgroundColor: currency === 'USD' ? 'var(--accent-green)' : 'transparent',
                color: currency === 'USD' ? 'white' : 'var(--text-secondary)',
              }}
            >
              Dólares
            </button>
          </div>
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            presets={STATS_PRESETS}
            defaultPreset="6 meses"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div
          className="rounded-2xl p-4 lg:p-5"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
            Total Ingresos
          </p>
          <p className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--accent-green)' }}>
            {loading ? '...' : formatCurrency(summaryStats.totalIngresos, currency)}
          </p>
        </div>
        <div
          className="rounded-2xl p-4 lg:p-5"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
            Total Gastos
          </p>
          <p className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--accent-red)' }}>
            {loading ? '...' : formatCurrency(summaryStats.totalGastos, currency)}
          </p>
        </div>
        <div
          className="rounded-2xl p-4 lg:p-5"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
            Balance
          </p>
          <p
            className="text-xl lg:text-2xl font-bold"
            style={{ color: summaryStats.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {loading ? '...' : formatCurrency(summaryStats.balance, currency)}
          </p>
        </div>
        <div
          className="rounded-2xl p-4 lg:p-5"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
            Tasa de Ahorro
          </p>
          <p
            className="text-xl lg:text-2xl font-bold"
            style={{ color: summaryStats.savingsRate >= 0 ? 'var(--accent-primary)' : 'var(--accent-red)' }}
          >
            {loading ? '...' : `${summaryStats.savingsRate.toFixed(1)}%`}
          </p>
        </div>
      </div>

      {/* Charts - 2 column grid on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpensePieChart 
          data={pieChartData} 
          loading={loading} 
          currency={currency}
        />
        <IncomeExpenseBarChart 
          data={barChartData} 
          loading={loading}
          currency={currency}
        />
      </div>
      
      {/* Full width line chart */}
      <BalanceLineChart 
        data={lineChartData} 
        loading={loading}
        currency={currency}
      />
    </div>
  );
}

export default Statistics;
