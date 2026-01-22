import { useState, useEffect, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { getRecentMovements } from '../services/sheetsApi';
import { formatCurrency } from '../utils/format';
import ExpensePieChart from '../components/charts/ExpensePieChart';
import IncomeExpenseBarChart from '../components/charts/IncomeExpenseBarChart';
import BalanceLineChart from '../components/charts/BalanceLineChart';

function Statistics() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(6); // months

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
    const now = new Date();
    const startDate = startOfMonth(subMonths(now, period - 1));

    const expenses = movements.filter(m => {
      if (m.tipo !== 'gasto') return false;
      const fecha = new Date(m.fecha);
      return fecha >= startDate;
    });

    const byCategory = {};
    let total = 0;

    expenses.forEach(m => {
      const cat = m.categoria || 'Sin categoria';
      const cleanCat = cat.replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim() || cat;
      const amount = m.montoPesos || m.monto || 0;
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
      .slice(0, 10);
  }, [movements, period]);

  // Process data for bar chart (income vs expenses by month)
  const barChartData = useMemo(() => {
    const now = new Date();
    const months = [];

    for (let i = period - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM', { locale: es });

      let ingresos = 0;
      let gastos = 0;

      movements.forEach(m => {
        const fecha = new Date(m.fecha);
        if (fecha >= monthStart && fecha <= monthEnd) {
          const amount = m.montoPesos || m.monto || 0;
          if (m.tipo === 'ingreso') {
            ingresos += amount;
          } else if (m.tipo === 'gasto') {
            gastos += amount;
          }
        }
      });

      months.push({
        month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        monthKey,
        ingresos,
        gastos,
      });
    }

    return months;
  }, [movements, period]);

  // Process data for line chart (balance evolution)
  const lineChartData = useMemo(() => {
    const now = new Date();
    const months = [];
    let runningBalance = 0;

    // Get all movements sorted by date
    const sortedMovements = [...movements].sort(
      (a, b) => new Date(a.fecha) - new Date(b.fecha)
    );

    // Calculate balance for each month
    for (let i = period - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, 'MMM', { locale: es });

      // Sum all movements up to this month
      let monthBalance = 0;
      sortedMovements.forEach(m => {
        const fecha = new Date(m.fecha);
        if (fecha <= monthEnd) {
          const amount = m.montoPesos || m.monto || 0;
          if (m.tipo === 'ingreso') {
            monthBalance += amount;
          } else if (m.tipo === 'gasto') {
            monthBalance -= amount;
          }
        }
      });

      months.push({
        month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        balance: monthBalance,
      });
    }

    return months;
  }, [movements, period]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const now = new Date();
    const startDate = startOfMonth(subMonths(now, period - 1));

    let totalIngresos = 0;
    let totalGastos = 0;

    movements.forEach(m => {
      const fecha = new Date(m.fecha);
      if (fecha >= startDate) {
        const amount = m.montoPesos || m.monto || 0;
        if (m.tipo === 'ingreso') {
          totalIngresos += amount;
        } else if (m.tipo === 'gasto') {
          totalGastos += amount;
        }
      }
    });

    return {
      totalIngresos,
      totalGastos,
      balance: totalIngresos - totalGastos,
      savingsRate: totalIngresos > 0 ? ((totalIngresos - totalGastos) / totalIngresos) * 100 : 0,
    };
  }, [movements, period]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Estadisticas
        </h2>
        <select
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
          className="px-3 py-2 rounded-xl text-sm font-medium"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
        >
          <option value={3}>3 meses</option>
          <option value={6}>6 meses</option>
          <option value={12}>12 meses</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
            Total Ingresos
          </p>
          <p className="text-xl font-bold" style={{ color: 'var(--accent-green)' }}>
            {loading ? '...' : formatCurrency(summaryStats.totalIngresos)}
          </p>
        </div>
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
            Total Gastos
          </p>
          <p className="text-xl font-bold" style={{ color: 'var(--accent-red)' }}>
            {loading ? '...' : formatCurrency(summaryStats.totalGastos)}
          </p>
        </div>
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
            Balance
          </p>
          <p
            className="text-xl font-bold"
            style={{ color: summaryStats.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {loading ? '...' : formatCurrency(summaryStats.balance)}
          </p>
        </div>
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
            Tasa de Ahorro
          </p>
          <p
            className="text-xl font-bold"
            style={{ color: summaryStats.savingsRate >= 0 ? 'var(--accent-primary)' : 'var(--accent-red)' }}
          >
            {loading ? '...' : `${summaryStats.savingsRate.toFixed(1)}%`}
          </p>
        </div>
      </div>

      {/* Charts */}
      <ExpensePieChart data={pieChartData} loading={loading} />
      <IncomeExpenseBarChart data={barChartData} loading={loading} />
      <BalanceLineChart data={lineChartData} loading={loading} />
    </div>
  );
}

export default Statistics;
