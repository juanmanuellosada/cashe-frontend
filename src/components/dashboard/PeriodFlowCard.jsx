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
  // Calculate filtered flow data (excluding hidden accounts)
  const flowData = useMemo(() => {
    // First, exclude accounts hidden from balance
    const visibleAccounts = accounts.filter(acc => !acc.ocultaDelBalance);

    // Then apply user filters on visible accounts
    const filteredAccounts = accountFilters.length > 0
      ? visibleAccounts.filter(acc => accountFilters.includes(acc.nombre))
      : visibleAccounts;

    // Always calculate from filtered accounts (not dashboard) to respect hidden accounts
    const ingresosMes = filteredAccounts.reduce((sum, acc) => sum + (acc.totalIngresos || 0), 0);
    const gastosMes = filteredAccounts.reduce((sum, acc) => sum + (acc.totalGastos || 0), 0);

    return {
      ingresos: ingresosMes,
      gastos: gastosMes,
      flujoNeto: ingresosMes - Math.abs(gastosMes),
    };
  }, [accounts, accountFilters]);

  const { ingresos, gastos, flujoNeto } = flowData;

  // Calculate percentage for progress bar
  const total = Math.abs(ingresos) + Math.abs(gastos);
  const ingresosPercent = total > 0 ? (Math.abs(ingresos) / total) * 100 : 50;

  return (
    <div
      className="p-3 sm:p-4 rounded-lg min-[400px]:rounded-xl"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Header with date range - stacks on <400px */}
      <div className="flex flex-col min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between gap-2 mb-2 sm:mb-3">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Flujo del período
        </span>
        <div className="self-start min-[400px]:self-auto">
          <DateRangePicker
            value={dateRange}
            onChange={onDateRangeChange}
            defaultPreset="Este mes"
          />
        </div>
      </div>

      {/* Flow visualization bar */}
      <div className="mb-3 sm:mb-4">
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

      {/* Income / Expenses - 1 col en <400px, 2 cols en 400px+ */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2 sm:gap-3 mb-3">
        <div className="p-2.5 sm:p-3 rounded-md min-[400px]:rounded-lg" style={{ backgroundColor: 'var(--accent-green-dim)' }}>
          <p className="text-[10px] sm:text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Ingresos
          </p>
          <p className="text-sm sm:text-base font-semibold truncate" style={{ color: 'var(--accent-green)' }}>
            +{formatCurrency(Math.abs(ingresos), currency)}
          </p>
        </div>

        <div className="p-2.5 sm:p-3 rounded-md min-[400px]:rounded-lg" style={{ backgroundColor: 'var(--accent-red-dim)' }}>
          <p className="text-[10px] sm:text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            Gastos
          </p>
          <p className="text-sm sm:text-base font-semibold truncate" style={{ color: 'var(--accent-red)' }}>
            -{formatCurrency(Math.abs(gastos), currency)}
          </p>
        </div>
      </div>

      {/* Net flow - prominent display */}
      <div
        className="p-2.5 sm:p-3 rounded-md min-[400px]:rounded-lg"
        style={{
          backgroundColor: flujoNeto >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)',
          border: `1px solid ${flujoNeto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}20`,
        }}
      >
        <p className="text-[10px] sm:text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
          Flujo neto
        </p>
        <p
          className="text-base sm:text-lg font-bold truncate"
          style={{ color: flujoNeto >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
        >
          {flujoNeto >= 0 ? '+' : ''}{formatCurrency(flujoNeto, currency)}
        </p>
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
