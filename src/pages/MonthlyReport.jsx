import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getExpenses, getIncomes, getTransfers, getAccounts } from '../services/supabaseApi';
import { formatCurrency, formatDate, parseLocalDate } from '../utils/format';
import { generateMarkdownReport, downloadMarkdown } from '../utils/reportExporter';
import ExpensePieChart from '../components/charts/ExpensePieChart';
import LoadingSpinner from '../components/LoadingSpinner';

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function isSameMonth(dateStr, year, month) {
  if (!dateStr) return false;
  const [y, m] = dateStr.split('-').map(Number);
  return y === year && m === month + 1;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function buildCategoryData(movements, currency) {
  const byCategory = {};
  let total = 0;
  movements.forEach(m => {
    const cat = m.categoria || 'Sin categoría';
    const val = currency === 'USD' ? (m.montoDolares || 0) : (m.montoPesos || m.monto || 0);
    total += val;
    if (!byCategory[cat]) byCategory[cat] = { value: 0, icon: null };
    byCategory[cat].value += val;
  });
  return Object.entries(byCategory)
    .map(([name, d]) => ({ name, value: d.value, percentage: total > 0 ? (d.value / total) * 100 : 0 }))
    .sort((a, b) => b.value - a.value);
}

function buildPieData(movements, currency) {
  const byCategory = {};
  let totalPesos = 0, totalDolares = 0;
  movements.forEach(m => {
    const cat = (m.categoria || 'Sin categoría').replace(/^[\p{Emoji}\u200d]+\s*/u, '').trim() || (m.categoria || 'Sin categoría');
    const pesos = m.montoPesos || m.monto || 0;
    const dolares = m.montoDolares || 0;
    totalPesos += pesos;
    totalDolares += dolares;
    if (!byCategory[cat]) byCategory[cat] = { pesos: 0, dolares: 0 };
    byCategory[cat].pesos += pesos;
    byCategory[cat].dolares += dolares;
  });
  const total = currency === 'USD' ? totalDolares : totalPesos;
  return Object.entries(byCategory)
    .map(([name, d]) => {
      const value = currency === 'USD' ? d.dolares : d.pesos;
      return { name, value, pesos: d.pesos, dolares: d.dolares, percentage: total > 0 ? (value / total) * 100 : 0, icon: null };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

export default function MonthlyReport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState({ expenses: [], incomes: [], transfers: [], accounts: [] });
  const currency = 'ARS';

  // Selected month state
  const [selectedYear, setSelectedYear] = useState(() => {
    const p = searchParams.get('mes');
    if (p) return parseInt(p.split('-')[0]);
    return new Date().getFullYear();
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const p = searchParams.get('mes');
    if (p) return parseInt(p.split('-')[1]) - 1;
    return new Date().getMonth();
  });

  // Load all data once
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getExpenses(), getIncomes(), getTransfers(), getAccounts()])
      .then(([exp, inc, tr, acc]) => {
        if (!cancelled) {
          setRawData({
            expenses: exp?.gastos || [],
            incomes: inc?.ingresos || [],
            transfers: tr?.transferencias || [],
            accounts: acc?.accounts || [],
          });
          setLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const monthLabel = `${MONTHS_ES[selectedMonth]} ${selectedYear}`;

  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevMonthLabel = `${MONTHS_ES[prevMonth]} ${prevYear}`;

  // Filter movements for selected month
  const monthExpenses = useMemo(() =>
    rawData.expenses.filter(m => isSameMonth(m.fecha, selectedYear, selectedMonth) && !m.isFuture),
    [rawData.expenses, selectedYear, selectedMonth]
  );
  const monthIncomes = useMemo(() =>
    rawData.incomes.filter(m => isSameMonth(m.fecha, selectedYear, selectedMonth) && !m.isFuture),
    [rawData.incomes, selectedYear, selectedMonth]
  );
  const monthTransfers = useMemo(() =>
    rawData.transfers.filter(m => isSameMonth(m.fecha, selectedYear, selectedMonth) && !m.isFuture),
    [rawData.transfers, selectedYear, selectedMonth]
  );

  // Filter prev month
  const prevMonthExpenses = useMemo(() =>
    rawData.expenses.filter(m => isSameMonth(m.fecha, prevYear, prevMonth) && !m.isFuture),
    [rawData.expenses, prevYear, prevMonth]
  );
  const prevMonthIncomes = useMemo(() =>
    rawData.incomes.filter(m => isSameMonth(m.fecha, prevYear, prevMonth) && !m.isFuture),
    [rawData.incomes, prevYear, prevMonth]
  );

  // Calculated stats
  const totalIngresos = useMemo(() =>
    monthIncomes.reduce((s, m) => s + (m.montoPesos || m.monto || 0), 0),
    [monthIncomes]
  );
  const totalGastos = useMemo(() =>
    monthExpenses.reduce((s, m) => s + (m.montoPesos || m.monto || 0), 0),
    [monthExpenses]
  );
  const balance = totalIngresos - totalGastos;
  const ahorroRate = totalIngresos > 0 ? Math.round((balance / totalIngresos) * 100) : 0;

  const prevTotalIngresos = useMemo(() =>
    prevMonthIncomes.reduce((s, m) => s + (m.montoPesos || m.monto || 0), 0),
    [prevMonthIncomes]
  );
  const prevTotalGastos = useMemo(() =>
    prevMonthExpenses.reduce((s, m) => s + (m.montoPesos || m.monto || 0), 0),
    [prevMonthExpenses]
  );

  // Ingresos recurrentes: solo categorías que también aparecieron el mes anterior.
  // Si no hay mes anterior (primer mes), usa la categoría de mayor monto (el sueldo).
  const prevMonthIncomeCategoryIds = useMemo(() =>
    new Set(prevMonthIncomes.map(m => m.categoryId).filter(Boolean)),
    [prevMonthIncomes]
  );
  const ingresosRecurrentes = useMemo(() => {
    if (prevMonthIncomeCategoryIds.size > 0) {
      return monthIncomes
        .filter(m => prevMonthIncomeCategoryIds.has(m.categoryId))
        .reduce((s, m) => s + (m.montoPesos || m.monto || 0), 0);
    }
    // Sin mes anterior: usar solo la categoría de ingreso más grande (probablemente el sueldo)
    const byCategory = {};
    monthIncomes.forEach(m => {
      if (!m.categoryId) return;
      byCategory[m.categoryId] = (byCategory[m.categoryId] || 0) + (m.montoPesos || m.monto || 0);
    });
    const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return totalIngresos;
    return entries[0][1];
  }, [monthIncomes, prevMonthIncomeCategoryIds, totalIngresos]);

  const diasDelMes = getDaysInMonth(selectedYear, selectedMonth);

  const gastoDiario = diasDelMes > 0 ? totalGastos / diasDelMes : 0;

  const topGastos = useMemo(() =>
    [...monthExpenses].sort((a, b) => b.monto - a.monto).slice(0, 5),
    [monthExpenses]
  );

  const cuotasActivas = useMemo(() =>
    monthExpenses.filter(m => m.idCompra !== null && m.idCompra !== undefined),
    [monthExpenses]
  );

  const diasConGastos = useMemo(() => {
    const days = new Set(monthExpenses.map(m => m.fecha));
    return days.size;
  }, [monthExpenses]);
  const diasSinGastos = diasDelMes - diasConGastos;

  const diaMasCaro = useMemo(() => {
    const byDay = {};
    monthExpenses.forEach(m => {
      if (!byDay[m.fecha]) byDay[m.fecha] = 0;
      byDay[m.fecha] += m.monto || 0;
    });
    const entries = Object.entries(byDay).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return null;
    return { fecha: entries[0][0], total: entries[0][1] };
  }, [monthExpenses]);

  const gastosPorCategoria = useMemo(() => buildCategoryData(monthExpenses, currency), [monthExpenses, currency]);
  const ingresosPorCategoria = useMemo(() => buildCategoryData(monthIncomes, currency), [monthIncomes, currency]);

  const expensePieData = useMemo(() => buildPieData(monthExpenses, currency), [monthExpenses, currency]);
  const incomePieData = useMemo(() => buildPieData(monthIncomes, currency), [monthIncomes, currency]);

  // Sorted all movements for full list
  const allMovements = useMemo(() => {
    const combined = [
      ...monthIncomes.map(m => ({ ...m, tipo: 'ingreso' })),
      ...monthExpenses.map(m => ({ ...m, tipo: 'gasto' })),
    ];
    return combined.sort((a, b) => a.fecha > b.fecha ? -1 : 1);
  }, [monthIncomes, monthExpenses]);

  // Proyección mes siguiente
  const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
  const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
  const nextMonthLabel = `${MONTHS_ES[nextMonth]} ${nextYear}`;

  const nextMonthCuotas = useMemo(() =>
    rawData.expenses.filter(m => isSameMonth(m.fecha, nextYear, nextMonth) && m.idCompra !== null && m.idCompra !== undefined),
    [rawData.expenses, nextYear, nextMonth]
  );

  const totalCuotasEstesMes = useMemo(() =>
    cuotasActivas.reduce((s, m) => s + (m.montoPesos || m.monto || 0), 0),
    [cuotasActivas]
  );

  const totalCuotasSiguiente = useMemo(() =>
    nextMonthCuotas.reduce((s, m) => s + (m.montoPesos || m.monto || 0), 0),
    [nextMonthCuotas]
  );

  const gastosRecurrentesEstimados = totalGastos - totalCuotasEstesMes;
  const margenDisponible = ingresosRecurrentes - totalCuotasSiguiente - gastosRecurrentesEstimados;

  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const goToNextMonth = () => {
    const now = new Date();
    if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth()) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };
  const isCurrentMonth = () => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth();
  };

  const varPct = (actual, anterior) => {
    if (!anterior || anterior === 0) return null;
    return ((actual - anterior) / Math.abs(anterior)) * 100;
  };

  const handleExportMD = () => {
    const data = {
      totalIngresos, totalGastos, balance, ahorroRate,
      prevMonthLabel, prevTotalIngresos, prevTotalGastos,
      gastosPorCategoria, ingresosPorCategoria,
      topGastos, gastoDiario, diaMasCaro, diasSinGastos, diasDelMes,
      transferencias: monthTransfers, cuotasActivas,
      movimientos: allMovements, cuentas: rawData.accounts, currency,
      proyeccion: {
        nextMonthLabel,
        totalIngresosEstimado: ingresosRecurrentes,
        totalCuotasSiguiente,
        gastosRecurrentesEstimados,
        margenDisponible,
        cuotas: nextMonthCuotas,
      },
    };
    const md = generateMarkdownReport(data, monthLabel);
    const filename = `cashe-resumen-${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}.md`;
    downloadMarkdown(md, filename);
  };

  const fmt = (n) => formatCurrency(n, currency);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Header + controles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 report-controls">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrevMonth}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            style={{ color: 'var(--text-secondary)' }}
            title="Mes anterior"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold min-w-[180px] text-center" style={{ color: 'var(--text-primary)' }}>
            {monthLabel}
          </h2>
          <button
            onClick={goToNextMonth}
            disabled={isCurrentMonth()}
            className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: 'var(--text-secondary)' }}
            title="Mes siguiente"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={handleExportMD}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Exportar MD
        </button>
      </div>

      {/* Resumen Ejecutivo */}
      <div className="report-section">
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          Resumen ejecutivo
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="Total ingresos" value={fmt(totalIngresos)} accent="var(--accent-green)" />
          <SummaryCard label="Total gastos" value={fmt(totalGastos)} accent="var(--accent-red)" />
          <SummaryCard label="Balance neto" value={fmt(balance)} accent={balance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
          <SummaryCard label="Tasa de ahorro" value={`${ahorroRate}%`} accent="var(--accent-primary)" />
        </div>
      </div>

      {/* Comparativa vs mes anterior */}
      <div className="report-section rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
          Comparativa vs {prevMonthLabel}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <ComparativaRow
            label="Ingresos"
            prev={fmt(prevTotalIngresos)}
            actual={fmt(totalIngresos)}
            pct={varPct(totalIngresos, prevTotalIngresos)}
            positiveIsGood
          />
          <ComparativaRow
            label="Gastos"
            prev={fmt(prevTotalGastos)}
            actual={fmt(totalGastos)}
            pct={varPct(totalGastos, prevTotalGastos)}
            positiveIsGood={false}
          />
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="report-section rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
          Estadísticas del mes
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <StatItem label="Gasto diario" value={fmt(gastoDiario)} />
          <StatItem
            label="Día más caro"
            value={diaMasCaro ? `${formatDate(diaMasCaro.fecha, 'short')} — ${fmt(diaMasCaro.total)}` : '—'}
          />
          <StatItem label="Días sin gastos" value={`${diasSinGastos} de ${diasDelMes}`} />
        </div>
      </div>

      {/* Gráficos — solo visibles en web y PDF */}
      {(expensePieData.length > 0 || incomePieData.length > 0) && (
        <div className="report-section grid grid-cols-1 lg:grid-cols-2 gap-6 print-charts">
          {expensePieData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
                Gastos por categoría
              </h3>
              <ExpensePieChart
                data={expensePieData}
                loading={false}
                currency={currency}
              />
            </div>
          )}
          {incomePieData.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
                Ingresos por categoría
              </h3>
              <ExpensePieChart
                data={incomePieData}
                loading={false}
                currency={currency}
              />
            </div>
          )}
        </div>
      )}

      {/* Balance por cuenta */}
      {rawData.accounts.length > 0 && (
        <div className="report-section">
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Balance por cuenta
          </h3>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  <th className="text-left px-4 py-3 font-medium">Cuenta</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-right px-4 py-3 font-medium">Saldo actual</th>
                </tr>
              </thead>
              <tbody>
                {rawData.accounts.filter(c => !c.ocultaDelBalance).map((c, i) => (
                  <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <td className="px-4 py-2.5">{c.nombre}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--text-secondary)' }}>{c.tipo}</td>
                    <td className="px-4 py-2.5 text-right font-medium" style={{ color: c.balanceActual >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {fmt(c.balanceActual)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gastos por categoría — tabla */}
      {gastosPorCategoria.length > 0 && (
        <div className="report-section">
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Gastos por categoría
          </h3>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  <th className="text-left px-4 py-3 font-medium">Categoría</th>
                  <th className="text-right px-4 py-3 font-medium">Monto</th>
                  <th className="text-right px-4 py-3 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {gastosPorCategoria.map((c, i) => (
                  <tr key={c.name} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <td className="px-4 py-2.5">{c.name}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(c.value)}</td>
                    <td className="px-4 py-2.5 text-right" style={{ color: 'var(--text-secondary)' }}>{c.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ingresos por categoría — tabla */}
      {ingresosPorCategoria.length > 0 && (
        <div className="report-section">
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Ingresos por categoría
          </h3>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  <th className="text-left px-4 py-3 font-medium">Categoría</th>
                  <th className="text-right px-4 py-3 font-medium">Monto</th>
                  <th className="text-right px-4 py-3 font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {ingresosPorCategoria.map((c, i) => (
                  <tr key={c.name} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <td className="px-4 py-2.5">{c.name}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(c.value)}</td>
                    <td className="px-4 py-2.5 text-right" style={{ color: 'var(--text-secondary)' }}>{c.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cuotas activas */}
      {cuotasActivas.length > 0 && (
        <div className="report-section">
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Cuotas activas ({cuotasActivas.length})
          </h3>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  <th className="text-left px-4 py-3 font-medium">Descripción</th>
                  <th className="text-center px-4 py-3 font-medium">Cuotas</th>
                  <th className="text-right px-4 py-3 font-medium">Monto mensual</th>
                </tr>
              </thead>
              <tbody>
                {cuotasActivas.map((c, i) => (
                  <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <td className="px-4 py-2.5">{c.nota || 'Sin descripción'}</td>
                    <td className="px-4 py-2.5 text-center" style={{ color: 'var(--text-secondary)' }}>{c.cuota}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(c.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proyección mes siguiente */}
      <div className="report-section">
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
          Proyección — {nextMonthLabel}
        </h3>
        {/* Desglose del cálculo */}
        <div className="rounded-2xl p-5 mb-4 space-y-2" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>
              Ingresos recurrentes de {monthLabel}
              <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>(se excluyen regalos, reintegros y otros ingresos puntuales)</span>
            </span>
            <span className="font-semibold" style={{ color: 'var(--accent-green)' }}>+ {fmt(ingresosRecurrentes)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>
              Cuotas comprometidas en {nextMonthLabel}
              <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>({nextMonthCuotas.length} cuota{nextMonthCuotas.length !== 1 ? 's' : ''} de tarjeta)</span>
            </span>
            <span className="font-semibold" style={{ color: 'var(--accent-red)' }}>− {fmt(totalCuotasSiguiente)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--text-secondary)' }}>
              Gastos corrientes estimados
              <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>(base: gastos sin cuotas de {monthLabel})</span>
            </span>
            <span className="font-semibold" style={{ color: 'var(--accent-red)' }}>− {fmt(gastosRecurrentesEstimados)}</span>
          </div>
          <div className="pt-2 mt-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Lo que podés ahorrar o invertir en {nextMonthLabel}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Si tus gastos se repiten igual que en {monthLabel}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold" style={{ color: margenDisponible > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {fmt(margenDisponible)}
                </p>
                {ingresosRecurrentes > 0 && (
                  <p className="text-xs font-medium mt-0.5" style={{ color: margenDisponible > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {Math.round((margenDisponible / ingresosRecurrentes) * 100)}% del ingreso recurrente
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        {nextMonthCuotas.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  <th className="text-left px-4 py-3 font-medium">Descripción</th>
                  <th className="text-center px-4 py-3 font-medium">Cuota</th>
                  <th className="text-right px-4 py-3 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {nextMonthCuotas.map((c, i) => (
                  <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <td className="px-4 py-2.5">{c.nota || 'Sin descripción'}</td>
                    <td className="px-4 py-2.5 text-center" style={{ color: 'var(--text-secondary)' }}>{c.cuota}</td>
                    <td className="px-4 py-2.5 text-right">{fmt(c.monto)}</td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
                  <td className="px-4 py-2.5 font-semibold" colSpan={2} style={{ color: 'var(--text-primary)' }}>Total cuotas</td>
                  <td className="px-4 py-2.5 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(totalCuotasSiguiente)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top 5 gastos */}
      {topGastos.length > 0 && (
        <div className="report-section">
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Top 5 gastos del mes
          </h3>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Nota</th>
                  <th className="text-right px-4 py-3 font-medium">Monto</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Cuenta</th>
                </tr>
              </thead>
              <tbody>
                {topGastos.map((g, i) => (
                  <tr key={g.id} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{formatDate(g.fecha, 'short')}</td>
                    <td className="px-4 py-2.5 max-w-[200px] truncate">{g.nota || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-medium" style={{ color: 'var(--accent-red)' }}>{fmt(g.monto)}</td>
                    <td className="px-4 py-2.5 hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{g.cuenta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transferencias del mes */}
      {monthTransfers.length > 0 && (
        <div className="report-section">
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Transferencias ({monthTransfers.length})
          </h3>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Desde</th>
                  <th className="text-left px-4 py-3 font-medium">Hacia</th>
                  <th className="text-right px-4 py-3 font-medium">Monto</th>
                </tr>
              </thead>
              <tbody>
                {monthTransfers.map((t, i) => (
                  <tr key={t.id} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{formatDate(t.fecha, 'short')}</td>
                    <td className="px-4 py-2.5">{t.cuentaSaliente}</td>
                    <td className="px-4 py-2.5">{t.cuentaEntrante}</td>
                    <td className="px-4 py-2.5 text-right" style={{ color: 'var(--accent-blue)' }}>{fmt(t.montoSaliente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Listado completo de movimientos */}
      {allMovements.length > 0 && (
        <div className="report-section">
          <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
            Movimientos del mes ({allMovements.length})
          </h3>
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Tipo</th>
                  <th className="text-right px-4 py-3 font-medium">Monto</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Categoría</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Cuenta</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Nota</th>
                </tr>
              </thead>
              <tbody>
                {allMovements.map((m, i) => (
                  <tr key={m.id} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                    <td className="px-4 py-2 whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{formatDate(m.fecha, 'short')}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{
                        backgroundColor: m.tipo === 'ingreso' ? 'var(--accent-green-subtle, rgba(34,197,94,0.1))' : 'var(--accent-red-subtle, rgba(239,68,68,0.1))',
                        color: m.tipo === 'ingreso' ? 'var(--accent-green)' : 'var(--accent-red)'
                      }}>
                        {m.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right font-medium" style={{ color: m.tipo === 'ingreso' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {fmt(m.monto)}
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>{m.categoria || '—'}</td>
                    <td className="px-4 py-2 hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>{m.cuenta}</td>
                    <td className="px-4 py-2 max-w-[200px] truncate hidden lg:table-cell" style={{ color: 'var(--text-secondary)' }}>{m.nota || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {allMovements.length === 0 && monthTransfers.length === 0 && (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <svg className="w-12 h-12 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">No hay movimientos en {monthLabel}</p>
        </div>
      )}
    </div>
  );
}

// Sub-components
function SummaryCard({ label, value, accent }) {
  return (
    <div className="report-section rounded-2xl p-4 lg:p-5" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xl font-bold" style={{ color: accent || 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

function ComparativaRow({ label, prev, actual, pct, positiveIsGood }) {
  const color = pct === null ? 'var(--text-secondary)'
    : (pct > 0) === positiveIsGood ? 'var(--accent-green)' : 'var(--accent-red)';
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <div className="flex flex-col gap-0.5">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Anterior: {prev}</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Actual: {actual}</p>
        {pct !== null && (
          <p className="text-xs font-medium" style={{ color }}>
            {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
          </p>
        )}
      </div>
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div>
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}
