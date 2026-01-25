import { formatCurrency, formatNumber } from '../../utils/format';

function BalanceCard({ 
  totalPesos, 
  totalDolares, 
  totalGeneralPesos, 
  totalGeneralDolares,
  tipoCambio,
  currency = 'ARS',
  ingresosMes = 0,
  gastosMes = 0,
  ingresosMesDolares = 0,
  gastosMesDolares = 0
}) {
  const balance = currency === 'ARS' ? totalGeneralPesos : totalGeneralDolares;
  const ingresos = currency === 'ARS' ? ingresosMes : ingresosMesDolares;
  const gastos = currency === 'ARS' ? gastosMes : gastosMesDolares;
  const netFlow = ingresos - Math.abs(gastos);

  return (
    <div
      className="p-3 sm:p-4 rounded-xl"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
          Balance total
        </span>
        <span
          className="px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-medium"
          style={{
            backgroundColor: currency === 'ARS' ? 'var(--accent-primary-dim)' : 'var(--accent-green-dim)',
            color: currency === 'ARS' ? 'var(--accent-primary)' : 'var(--accent-green)'
          }}
        >
          {currency}
        </span>
      </div>

      {/* Main balance */}
      <h2
        className="text-xl sm:text-2xl font-medium tracking-tight mb-3 sm:mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        {formatCurrency(balance, currency)}
      </h2>

      {/* Income / Expenses row */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2 sm:mb-3">
        <div className="p-2 sm:p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-green-dim)' }}>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wide mb-0.5 sm:mb-1" style={{ color: 'var(--text-muted)' }}>
            Ingresos
          </p>
          <p className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--accent-green)' }}>
            +{formatCurrency(Math.abs(ingresos), currency)}
          </p>
        </div>

        <div className="p-2 sm:p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-red-dim)' }}>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wide mb-0.5 sm:mb-1" style={{ color: 'var(--text-muted)' }}>
            Gastos
          </p>
          <p className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--accent-red)' }}>
            -{formatCurrency(Math.abs(gastos), currency)}
          </p>
        </div>
      </div>

      {/* Net flow */}
      <div className="flex items-center justify-between py-1.5 sm:py-2">
        <span className="text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
          Flujo neto
        </span>
        <span
          className="text-xs sm:text-sm font-medium"
          style={{ color: netFlow >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
        >
          {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow, currency)}
        </span>
      </div>

      {/* Exchange rate */}
      {tipoCambio && (
        <div
          className="flex items-center justify-between pt-1.5 sm:pt-2 mt-1.5 sm:mt-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <span className="text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
            Tipo de cambio
          </span>
          <span className="text-[11px] sm:text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {formatCurrency(tipoCambio)} / USD
          </span>
        </div>
      )}
    </div>
  );
}

export default BalanceCard;
