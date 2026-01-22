import { formatCurrency, formatNumber } from '../../utils/format';

function BalanceCard({ totalPesos, totalDolares, totalGeneralPesos, tipoCambio }) {
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
          {formatCurrency(totalGeneralPesos)}
        </h2>

        <p className="text-xs mb-5" style={{ color: 'var(--text-secondary)' }}>
          en pesos argentinos
        </p>

        <div className="flex gap-4">
          <div
            className="flex-1 p-3 rounded-xl"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🇦🇷</span>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                En Pesos
              </p>
            </div>
            <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(totalPesos)}
            </p>
          </div>

          <div
            className="flex-1 p-3 rounded-xl"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🇺🇸</span>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                En Dólares
              </p>
            </div>
            <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(totalDolares, 'USD')}
            </p>
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
