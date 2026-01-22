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

  return (
    <div
      className="rounded-2xl p-6 relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 opacity-50"
        style={{
          background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, transparent 50%, rgba(139, 92, 246, 0.05) 100%)'
        }}
      />

      <div className="relative z-10">
        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
          Balance Total
        </p>

        <h2
          className="text-4xl font-bold mb-1 tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {formatCurrency(balance, currency)}
        </h2>

        <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
          {currency === 'ARS' ? 'en pesos argentinos' : 'en dólares estadounidenses'}
        </p>

        <div className="flex gap-4">
          {/* Ingresos del mes */}
          <div
            className="flex-1 p-3 rounded-xl relative overflow-hidden"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, transparent 70%)'
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4" style={{ color: 'var(--accent-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Ingresos
                </p>
              </div>
              <p className="text-lg font-semibold" style={{ color: 'var(--accent-green)' }}>
                +{formatCurrency(Math.abs(ingresos), currency)}
              </p>
            </div>
          </div>

          {/* Gastos del mes */}
          <div
            className="flex-1 p-3 rounded-xl relative overflow-hidden"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, transparent 70%)'
              }}
            />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Gastos
                </p>
              </div>
              <p className="text-lg font-semibold" style={{ color: 'var(--accent-red)' }}>
                -{formatCurrency(Math.abs(gastos), currency)}
              </p>
            </div>
          </div>
        </div>

        {tipoCambio && (
          <div
            className="mt-4 pt-3 flex items-center justify-between"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Tipo de cambio
            </p>
            <p className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>
              {formatCurrency(tipoCambio)} / USD
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BalanceCard;
