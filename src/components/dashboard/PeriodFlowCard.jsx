import { useMemo } from 'react';
import { formatCurrency } from '../../utils/format';
import DateRangePicker from '../DateRangePicker';

function PeriodFlowCard({
  accounts = [],
  dashboard,
  currency = 'ARS',
  dateRange,
  onDateRangeChange,
  accountFilters = [],
}) {
  // Calculate filtered flow data
  const flowData = useMemo(() => {
    const filteredAccounts = accountFilters.length > 0
      ? accounts.filter(acc => accountFilters.includes(acc.nombre))
      : accounts;

    let ingresosMes = 0;
    let gastosMes = 0;

    if (accountFilters.length === 0) {
      // Sin filtros: usar valores del dashboard
      ingresosMes = dashboard?.ingresosMes || 0;
      gastosMes = dashboard?.gastosMes || 0;
    } else {
      // Con filtros: sumar de las cuentas filtradas
      ingresosMes = filteredAccounts.reduce((sum, acc) => sum + (acc.totalIngresos || 0), 0);
      gastosMes = filteredAccounts.reduce((sum, acc) => sum + (acc.totalGastos || 0), 0);
    }

    return {
      ingresos: ingresosMes,
      gastos: gastosMes,
      flujoNeto: ingresosMes - Math.abs(gastosMes),
    };
  }, [accounts, accountFilters, dashboard]);

  const { ingresos, gastos, flujoNeto } = flowData;

  // Calculate percentage for progress bar
  const total = Math.abs(ingresos) + Math.abs(gastos);
  const ingresosPercent = total > 0 ? (Math.abs(ingresos) / total) * 100 : 50;

  return (
    <div
      className="p-3 sm:p-4 rounded-xl"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Header with date range */}
      <div className="flex items-center justify-between mb-3 sm:mb-4 flex-wrap gap-2">
        <span className="text-[11px] sm:text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Flujo del período
        </span>
        <div className="flex items-center gap-1">
          <DateRangePicker
            value={dateRange}
            onChange={onDateRangeChange}
            defaultPreset="Este mes"
          />
          {(dateRange?.from || dateRange?.to) && (
            <button
              onClick={() => onDateRangeChange({ from: null, to: null })}
              className="p-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
              title="Limpiar fechas"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Flow visualization bar */}
      <div className="mb-4">
        <div className="h-2 rounded-full overflow-hidden flex" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${ingresosPercent}%`,
              backgroundColor: 'var(--accent-green)',
            }}
          />
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${100 - ingresosPercent}%`,
              backgroundColor: 'var(--accent-red)',
            }}
          />
        </div>
      </div>

      {/* Income / Expenses row */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
        <div className="p-2 sm:p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-green-dim)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <svg className="w-3 h-3" style={{ color: 'var(--accent-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Ingresos
            </p>
          </div>
          <p className="text-sm sm:text-base font-semibold truncate" style={{ color: 'var(--accent-green)' }}>
            +{formatCurrency(Math.abs(ingresos), currency)}
          </p>
        </div>

        <div className="p-2 sm:p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-red-dim)' }}>
          <div className="flex items-center gap-1.5 mb-1">
            <svg className="w-3 h-3" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
            <p className="text-[9px] sm:text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Gastos
            </p>
          </div>
          <p className="text-sm sm:text-base font-semibold truncate" style={{ color: 'var(--accent-red)' }}>
            -{formatCurrency(Math.abs(gastos), currency)}
          </p>
        </div>
      </div>

      {/* Net flow - prominent display */}
      <div
        className="p-3 rounded-lg flex items-center justify-between"
        style={{
          backgroundColor: flujoNeto >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
          border: `1px solid ${flujoNeto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}20`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: flujoNeto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
            }}
          >
            {flujoNeto >= 0 ? (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </div>
          <span className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Flujo neto
          </span>
        </div>
        <span
          className="text-base sm:text-lg font-bold"
          style={{ color: flujoNeto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
        >
          {flujoNeto >= 0 ? '+' : ''}{formatCurrency(flujoNeto, currency)}
        </span>
      </div>

      {/* Subtitle explaining filter relationship */}
      {accountFilters.length > 0 && (
        <p className="text-[10px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
          Mostrando flujo de {accountFilters.length} cuenta{accountFilters.length !== 1 ? 's' : ''} seleccionada{accountFilters.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

export default PeriodFlowCard;
