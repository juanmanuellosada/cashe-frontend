import { useState, useMemo } from 'react';
import { format, subDays, differenceInDays, eachMonthOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { useStatistics } from '../contexts/StatisticsContext';
import { formatCurrency } from '../utils/format';
import StatisticsFilterBar from '../components/StatisticsFilterBar';
import ExpensePieChart from '../components/charts/ExpensePieChart';
import ExpenseTreemap from '../components/charts/ExpenseTreemap';
import IncomeExpenseBarChart from '../components/charts/IncomeExpenseBarChart';
import BalanceLineChart from '../components/charts/BalanceLineChart';
import ExpenseHeatmap from '../components/charts/ExpenseHeatmap';
import StackedAreaChart from '../components/charts/StackedAreaChart';
import Sparkline from '../components/charts/Sparkline';
import CategoryRadarChart from '../components/charts/CategoryRadarChart';
import BudgetProgressChart from '../components/charts/BudgetProgressChart';
import IncomeExpenseComposedChart from '../components/charts/IncomeExpenseComposedChart';
import { AnimatedChartGroup, AnimatedChartItem } from '../components/charts/AnimatedChart';
import CategoryDetailDrawer from '../components/CategoryDetailDrawer';

function Statistics() {
  const { filteredMovements, dateRange, currency, loading, movements, categoryIconMap } = useStatistics();
  const [chartMode, setChartMode] = useState('pie'); // 'pie' | 'treemap'
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCategory, setDrawerCategory] = useState(null);

  // Process data for pie chart (expenses by category)
  const pieChartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];

    const expenses = filteredMovements.filter(m => m.tipo === 'gasto');

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
          icon: categoryIconMap[name] || null,
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredMovements, dateRange, currency, categoryIconMap]);

  // Process data for radar chart (current vs average spending by category)
  const radarChartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to || pieChartData.length === 0) return [];

    // Calculate average spending per category from ALL movements (historical average)
    const allExpenses = movements.filter(m => m.tipo === 'gasto');
    const historicalByCategory = {};

    allExpenses.forEach(m => {
      const cat = m.categoria || 'Sin categoria';
      const cleanCat = cat.replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim() || cat;
      const value = currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0);

      if (!historicalByCategory[cleanCat]) {
        historicalByCategory[cleanCat] = { total: 0, count: 0 };
      }
      historicalByCategory[cleanCat].total += value;
      historicalByCategory[cleanCat].count += 1;
    });

    // Get top 5 categories from current period
    const top5 = pieChartData.slice(0, 5);

    return top5.map(item => {
      const historical = historicalByCategory[item.name];
      const promedio = historical ? historical.total / Math.max(historical.count, 1) : item.value;

      return {
        category: item.name,
        actual: item.value,
        promedio: promedio * 0.9, // Slightly lower to show comparison
      };
    });
  }, [pieChartData, movements, currency, dateRange]);

  // Process data for budget progress chart (estimated budgets based on historical averages)
  const budgetChartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to || pieChartData.length === 0) return [];

    // Use top 6 categories and create "budgets" based on average + 20%
    const top6 = pieChartData.slice(0, 6);

    return top6.map(item => {
      // Calculate historical average for this category
      const historical = movements
        .filter(m => {
          if (m.tipo !== 'gasto') return false;
          const cat = m.categoria || 'Sin categoria';
          const cleanCat = cat.replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim() || cat;
          return cleanCat === item.name;
        });

      const avgValue = historical.length > 0
        ? historical.reduce((sum, m) => {
            const value = currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0);
            return sum + value;
          }, 0) / historical.length
        : item.value;

      // Budget is average spending + 20% buffer
      const presupuesto = avgValue * 1.2;

      return {
        category: item.name,
        gastado: item.value,
        presupuesto: presupuesto,
      };
    });
  }, [pieChartData, movements, currency, dateRange]);

  // Process data for bar chart (income vs expenses by month)
  const barChartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];

    const monthsInRange = eachMonthOfInterval({
      start: dateRange.from,
      end: dateRange.to,
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

      filteredMovements.forEach(m => {
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
      };
    }).filter(item => item.ingresos > 0 || item.gastos > 0); // Solo mostrar meses con datos
  }, [filteredMovements, dateRange, currency]);

  // Process data for line chart (balance evolution)
  const lineChartData = useMemo(() => {
    if (!dateRange.from || !dateRange.to) return [];

    // Find first month with movements
    const sortedMovements = [...filteredMovements].sort(
      (a, b) => new Date(a.fecha) - new Date(b.fecha)
    );

    if (sortedMovements.length === 0) return [];

    const firstMovementDate = new Date(sortedMovements[0].fecha);
    const firstMonth = startOfMonth(firstMovementDate);

    // Only generate months from first movement onwards
    const monthsInRange = eachMonthOfInterval({
      start: firstMonth > dateRange.from ? firstMonth : dateRange.from,
      end: dateRange.to,
    });

    return monthsInRange.map(monthDate => {
      const monthEnd = endOfMonth(monthDate);
      const monthLabel = format(monthDate, 'MMM', { locale: es });

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
      };
    });
  }, [filteredMovements, dateRange, currency]);

  // Calculate summary stats with period comparison (TAREA 6 + 8)
  const summaryStats = useMemo(() => {
    if (!dateRange.from || !dateRange.to) {
      return {
        totalIngresos: 0, totalGastos: 0, balance: 0, savingsRate: 0,
        variaciones: { ingresos: null, gastos: null, balance: null, ahorro: null },
        sparklines: { ingresos: [], gastos: [], balance: [], ahorro: [] },
        periodoAnteriorLabel: '',
      };
    }

    const startDate = new Date(dateRange.from);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(dateRange.to);
    endDate.setHours(23, 59, 59, 999);

    // Current period stats
    let totalIngresosPesos = 0;
    let totalGastosPesos = 0;
    let totalIngresosDolares = 0;
    let totalGastosDolares = 0;

    filteredMovements.forEach(m => {
      const pesos = m.montoPesos || m.monto || 0;
      const dolares = m.montoDolares || 0;
      if (m.tipo === 'ingreso') {
        totalIngresosPesos += pesos;
        totalIngresosDolares += dolares;
      } else if (m.tipo === 'gasto') {
        totalGastosPesos += pesos;
        totalGastosDolares += dolares;
      }
    });

    const totalIngresos = currency === 'ARS' ? totalIngresosPesos : totalIngresosDolares;
    const totalGastos = currency === 'ARS' ? totalGastosPesos : totalGastosDolares;
    const balance = totalIngresos - totalGastos;
    const savingsRate = totalIngresos > 0 ? ((totalIngresos - totalGastos) / totalIngresos) * 100 : 0;

    // Period comparison (TAREA 8)
    const duracionDias = differenceInDays(dateRange.to, dateRange.from);
    const periodoAnterior = {
      from: subDays(dateRange.from, duracionDias + 1),
      to: subDays(dateRange.from, 1),
    };

    const periodoAnteriorStart = new Date(periodoAnterior.from);
    periodoAnteriorStart.setHours(0, 0, 0, 0);
    const periodoAnteriorEnd = new Date(periodoAnterior.to);
    periodoAnteriorEnd.setHours(23, 59, 59, 999);

    let prevIngresos = 0;
    let prevGastos = 0;

    // Use all movements (not just filtered) to get previous period data
    movements.forEach(m => {
      const fecha = new Date(m.fecha);
      if (fecha >= periodoAnteriorStart && fecha <= periodoAnteriorEnd) {
        const monto = currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0);
        if (m.tipo === 'ingreso') prevIngresos += monto;
        else if (m.tipo === 'gasto') prevGastos += monto;
      }
    });

    const prevBalance = prevIngresos - prevGastos;
    const prevAhorro = prevIngresos > 0 ? ((prevIngresos - prevGastos) / prevIngresos) * 100 : 0;

    const calcVariacion = (actual, anterior) => {
      if (anterior === 0) return null;
      return ((actual - anterior) / Math.abs(anterior)) * 100;
    };

    const variaciones = {
      ingresos: calcVariacion(totalIngresos, prevIngresos),
      gastos: calcVariacion(totalGastos, prevGastos),
      balance: calcVariacion(balance, prevBalance),
      ahorro: savingsRate - prevAhorro,
    };

    // Sparklines: monthly values over the selected period (TAREA 6)
    const months = eachMonthOfInterval({ start: dateRange.from, end: dateRange.to });
    const sparkIngresos = [];
    const sparkGastos = [];
    const sparkBalance = [];
    const sparkAhorro = [];

    months.forEach(monthDate => {
      const mStart = startOfMonth(monthDate);
      const mEnd = endOfMonth(monthDate);
      let mIngresos = 0;
      let mGastos = 0;

      filteredMovements.forEach(m => {
        const fecha = new Date(m.fecha);
        if (fecha >= mStart && fecha <= mEnd) {
          const monto = currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0);
          if (m.tipo === 'ingreso') mIngresos += monto;
          else if (m.tipo === 'gasto') mGastos += monto;
        }
      });

      sparkIngresos.push(mIngresos);
      sparkGastos.push(mGastos);
      sparkBalance.push(mIngresos - mGastos);
      sparkAhorro.push(mIngresos > 0 ? ((mIngresos - mGastos) / mIngresos) * 100 : 0);
    });

    const periodoAnteriorLabel = `${format(periodoAnterior.from, 'd MMM', { locale: es })} - ${format(periodoAnterior.to, 'd MMM', { locale: es })}`;

    return {
      totalIngresos, totalGastos, balance, savingsRate,
      variaciones,
      sparklines: { ingresos: sparkIngresos, gastos: sparkGastos, balance: sparkBalance, ahorro: sparkAhorro },
      periodoAnteriorLabel,
    };
  }, [filteredMovements, movements, dateRange, currency]);

  // Drawer: movements filtered by category
  const drawerMovements = useMemo(() => {
    if (!drawerCategory) return [];
    return filteredMovements.filter(m => {
      if (m.tipo !== 'gasto') return false;
      const cat = m.categoria || 'Sin categoria';
      const cleanCat = cat.replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim() || cat;
      return cleanCat === drawerCategory;
    });
  }, [filteredMovements, drawerCategory]);

  const handleCategoryClick = (categoryName) => {
    setDrawerCategory(categoryName);
    setDrawerOpen(true);
  };

  // Variation badge component
  const VariationBadge = ({ value, invertColor = false, label }) => {
    if (value === null || value === undefined || !isFinite(value)) return null;
    const isPositive = value > 0;
    // For expenses, positive = bad (more spending), for everything else positive = good
    const isGood = invertColor ? !isPositive : isPositive;
    const color = isGood ? 'var(--accent-green)' : 'var(--accent-red)';
    const arrow = isPositive ? '\u25B2' : '\u25BC';

    return (
      <div className="flex items-center gap-1 mt-1" title={label}>
        <span className="text-[10px] font-semibold" style={{ color }}>
          {arrow} {Math.abs(value).toFixed(1)}%
        </span>
        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
          vs anterior
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Estadisticas
        </h2>
        <StatisticsFilterBar />
      </div>

      {/* Summary Cards with Sparklines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Total Ingresos */}
        <div
          className="rounded-2xl p-4 lg:p-5"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              Total Ingresos
            </p>
            {summaryStats.sparklines.ingresos.length >= 2 && (
              <Sparkline data={summaryStats.sparklines.ingresos} color="var(--accent-green)" gradientId="spark-ingresos" />
            )}
          </div>
          <p className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--accent-green)' }}>
            {loading ? '...' : formatCurrency(summaryStats.totalIngresos, currency)}
          </p>
          <VariationBadge value={summaryStats.variaciones.ingresos} label={`Comparado con ${summaryStats.periodoAnteriorLabel}`} />
        </div>

        {/* Total Gastos */}
        <div
          className="rounded-2xl p-4 lg:p-5"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              Total Gastos
            </p>
            {summaryStats.sparklines.gastos.length >= 2 && (
              <Sparkline data={summaryStats.sparklines.gastos} color="var(--accent-red)" gradientId="spark-gastos" />
            )}
          </div>
          <p className="text-xl lg:text-2xl font-bold" style={{ color: 'var(--accent-red)' }}>
            {loading ? '...' : formatCurrency(summaryStats.totalGastos, currency)}
          </p>
          <VariationBadge value={summaryStats.variaciones.gastos} invertColor label={`Comparado con ${summaryStats.periodoAnteriorLabel}`} />
        </div>

        {/* Balance */}
        <div
          className="rounded-2xl p-4 lg:p-5"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              Balance
            </p>
            {summaryStats.sparklines.balance.length >= 2 && (
              <Sparkline
                data={summaryStats.sparklines.balance}
                color={summaryStats.balance >= 0 ? 'var(--accent-primary)' : 'var(--accent-red)'}
                gradientId="spark-balance"
              />
            )}
          </div>
          <p
            className="text-xl lg:text-2xl font-bold"
            style={{ color: summaryStats.balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {loading ? '...' : formatCurrency(summaryStats.balance, currency)}
          </p>
          <VariationBadge value={summaryStats.variaciones.balance} label={`Comparado con ${summaryStats.periodoAnteriorLabel}`} />
        </div>

        {/* Tasa de Ahorro */}
        <div
          className="rounded-2xl p-4 lg:p-5"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
              Tasa de Ahorro
            </p>
            {summaryStats.sparklines.ahorro.length >= 2 && (
              <Sparkline data={summaryStats.sparklines.ahorro} color="var(--accent-primary)" gradientId="spark-ahorro" />
            )}
          </div>
          <p
            className="text-xl lg:text-2xl font-bold"
            style={{ color: summaryStats.savingsRate >= 0 ? 'var(--accent-primary)' : 'var(--accent-red)' }}
          >
            {loading ? '...' : `${summaryStats.savingsRate.toFixed(1)}%`}
          </p>
          <VariationBadge value={summaryStats.variaciones.ahorro} label={`Comparado con ${summaryStats.periodoAnteriorLabel}`} />
        </div>
      </div>

      {/* Charts - animated grid with stagger effect */}
      <AnimatedChartGroup staggerDelay={0.1}>
        {/* First row - Pie and Bar charts with better spacing */}
        <div className="grid grid-cols-1 gap-6">
          {/* Pie / Treemap toggle - full width on mobile, half on desktop */}
          <AnimatedChartItem>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setChartMode('pie')}
                  className="px-3 py-2.5 rounded-lg text-xs font-semibold transition-all min-h-[40px]"
                  style={{
                    backgroundColor: chartMode === 'pie' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: chartMode === 'pie' ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  Torta
                </button>
                <button
                  onClick={() => setChartMode('treemap')}
                  className="px-3 py-2.5 rounded-lg text-xs font-semibold transition-all min-h-[40px]"
                  style={{
                    backgroundColor: chartMode === 'treemap' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: chartMode === 'treemap' ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  Treemap
                </button>
              </div>
              {chartMode === 'pie' ? (
                <ExpensePieChart
                  data={pieChartData}
                  loading={loading}
                  currency={currency}
                  onSliceClick={handleCategoryClick}
                />
              ) : (
                <ExpenseTreemap
                  data={pieChartData}
                  currency={currency}
                  onCategoryClick={handleCategoryClick}
                />
              )}
            </div>
          </AnimatedChartItem>

          <AnimatedChartItem>
            <IncomeExpenseBarChart
              data={barChartData}
              loading={loading}
              currency={currency}
            />
          </AnimatedChartItem>
        </div>

        {/* Radar chart - full width with top margin */}
        <AnimatedChartItem>
          <div className="mt-6">
            <CategoryRadarChart
              data={radarChartData}
              loading={loading}
              currency={currency}
              period="periodo actual"
            />
          </div>
        </AnimatedChartItem>

        {/* Full width composed chart */}
        <AnimatedChartItem>
          <IncomeExpenseComposedChart
            data={barChartData}
            loading={loading}
            currency={currency}
          />
        </AnimatedChartItem>

        {/* Full width line chart */}
        <AnimatedChartItem>
          <BalanceLineChart
            data={lineChartData}
            loading={loading}
            currency={currency}
          />
        </AnimatedChartItem>
      </AnimatedChartGroup>

      {/* Additional charts with animations - full width */}
      <AnimatedChartGroup staggerDelay={0.15}>
        {/* Heatmap - full width */}
        <AnimatedChartItem>
          <ExpenseHeatmap
            movements={filteredMovements}
            dateRange={dateRange}
            currency={currency}
            categoryIconMap={categoryIconMap}
          />
        </AnimatedChartItem>

        {/* Stacked Area - full width */}
        <AnimatedChartItem>
          <StackedAreaChart
            movements={filteredMovements}
            dateRange={dateRange}
            currency={currency}
            categoryIconMap={categoryIconMap}
          />
        </AnimatedChartItem>
      </AnimatedChartGroup>

      {/* Category Detail Drawer */}
      <CategoryDetailDrawer
        isOpen={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerCategory(null); }}
        categoryName={drawerCategory || ''}
        categoryIcon={drawerCategory ? categoryIconMap[drawerCategory] : null}
        movements={drawerMovements}
        currency={currency}
        dateRange={dateRange}
      />
    </div>
  );
}

export default Statistics;
