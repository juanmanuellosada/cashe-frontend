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
    <div className="card-elevated p-5 md:p-6 relative overflow-hidden group">
      {/* Premium mesh gradient background */}
      <div
        className="absolute inset-0 opacity-60 transition-opacity duration-500 group-hover:opacity-80"
        style={{
          background: `
            radial-gradient(circle at 0% 0%, var(--accent-primary-glow) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(0, 217, 154, 0.05) 0%, transparent 70%)
          `
        }}
      />
      
      {/* Subtle animated glow */}
      <div 
        className="absolute -top-24 -right-24 w-48 h-48 rounded-full opacity-30 blur-3xl"
        style={{ 
          background: 'var(--accent-primary)',
          animation: 'pulse-glow 4s ease-in-out infinite'
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-primary-dim)' }}
            >
              <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Balance Total
            </p>
          </div>
          <span 
            className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
            style={{ 
              backgroundColor: currency === 'ARS' ? 'var(--accent-primary-dim)' : 'rgba(34, 197, 94, 0.15)',
              color: currency === 'ARS' ? 'var(--accent-primary)' : 'var(--accent-green)'
            }}
          >
            {currency}
          </span>
        </div>

        {/* Main balance */}
        <div className="mb-6">
          <h2
            className="text-3xl md:text-4xl font-bold font-display tracking-tight mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatCurrency(balance, currency)}
          </h2>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {currency === 'ARS' ? 'Pesos argentinos' : 'Dólares estadounidenses'}
          </p>
        </div>

        {/* Income / Expenses row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Ingresos del mes */}
          <div className="group/stat p-3.5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:scale-[1.02]"
            style={{ backgroundColor: 'rgba(0, 217, 154, 0.08)' }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 217, 154, 0.15) 0%, transparent 70%)'
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(0, 217, 154, 0.2)' }}
                >
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--accent-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Ingresos
                </p>
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--accent-green)' }}>
                +{formatCurrency(Math.abs(ingresos), currency)}
              </p>
            </div>
          </div>

          {/* Gastos del mes */}
          <div className="group/stat p-3.5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:scale-[1.02]"
            style={{ backgroundColor: 'rgba(255, 92, 114, 0.08)' }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover/stat:opacity-100 transition-opacity duration-300"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 92, 114, 0.15) 0%, transparent 70%)'
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(255, 92, 114, 0.2)' }}
                >
                  <svg className="w-3.5 h-3.5" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <p className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                  Gastos
                </p>
              </div>
              <p className="text-lg font-bold" style={{ color: 'var(--accent-red)' }}>
                -{formatCurrency(Math.abs(gastos), currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Net flow indicator */}
        <div 
          className="flex items-center justify-between p-3 rounded-xl"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ 
                backgroundColor: netFlow >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                boxShadow: netFlow >= 0 ? '0 0 8px var(--accent-green)' : '0 0 8px var(--accent-red)'
              }}
            />
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Flujo neto del mes
            </span>
          </div>
          <span 
            className="text-sm font-semibold"
            style={{ color: netFlow >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow, currency)}
          </span>
        </div>

        {/* Exchange rate */}
        {tipoCambio && (
          <div
            className="mt-4 pt-3 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Tipo de cambio
              </p>
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
              {formatCurrency(tipoCambio)} / USD
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BalanceCard;
