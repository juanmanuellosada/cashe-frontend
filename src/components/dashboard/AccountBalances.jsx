import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';

function AccountBalances({ accounts, loading, onAccountClick }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  // Skeleton loading
  if (loading) {
    return (
      <div className="card-glass overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <div className="h-4 w-24 skeleton-shimmer rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
          <div className="h-4 w-16 skeleton-shimmer rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
        </div>
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return null;
  }

  const handleAccountClick = (account) => {
    if (onAccountClick) {
      onAccountClick(account);
    }
  };

  return (
    <div className="card-glass overflow-hidden transition-all duration-300">
      {/* Header - always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-primary-dim)' }}
          >
            <svg
              className="w-4.5 h-4.5"
              style={{ color: 'var(--accent-primary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <span className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>
              Cuentas
            </span>
            <span
              className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              {accounts.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {expanded ? 'Ocultar' : 'Ver todas'}
          </span>
          <div 
            className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
              style={{ color: 'var(--text-secondary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="animate-scale-in" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {/* Desktop: Grid layout */}
          <div className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-3 gap-px" style={{ backgroundColor: 'var(--border-subtle)' }}>
            {accounts.map((account, index) => {
              const isARS = account.moneda === 'Peso';
              const currencyColor = isARS ? '#75AADB' : '#3CB371';

              return (
                <button
                  key={account.nombre}
                  onClick={() => handleAccountClick(account)}
                  className="p-4 flex items-center gap-3 text-left transition-all duration-200 hover:bg-[var(--bg-tertiary)] group"
                  style={{ 
                    backgroundColor: 'var(--bg-secondary)',
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  {/* Currency icon with glow */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ 
                      backgroundColor: `${currencyColor}15`,
                      boxShadow: `0 0 20px ${currencyColor}10`
                    }}
                  >
                    <span className="text-sm font-bold" style={{ color: currencyColor }}>
                      {isARS ? '$' : 'US$'}
                    </span>
                  </div>

                  {/* Account info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-[15px]" style={{ color: 'var(--text-primary)' }}>
                      {account.nombre}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {isARS ? 'Pesos' : 'Dólares'}
                      {account.tipo && ` · ${account.tipo}`}
                    </p>
                  </div>

                  {/* Balance */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-[15px]" style={{ color: currencyColor }}>
                      {formatCurrency(account.balanceActual, isARS ? 'ARS' : 'USD')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mobile: List layout */}
          <div className="lg:hidden">
            {accounts.map((account, index) => {
              const isARS = account.moneda === 'Peso';
              const currencyColor = isARS ? '#75AADB' : '#3CB371';

              return (
                <button
                  key={account.nombre}
                  onClick={() => handleAccountClick(account)}
                  className="w-full p-4 flex items-center gap-3 text-left transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-[0.99] group"
                  style={{
                    borderBottom: index < accounts.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                  }}
                >
                  {/* Currency icon with glow */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-active:scale-95"
                    style={{ 
                      backgroundColor: `${currencyColor}15`,
                      boxShadow: `0 0 16px ${currencyColor}08`
                    }}
                  >
                    <span className="text-sm font-bold" style={{ color: currencyColor }}>
                      {isARS ? '$' : 'US$'}
                    </span>
                  </div>

                  {/* Account info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                      {account.nombre}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {isARS ? 'Pesos' : 'Dólares'}
                      {account.tipo && ` · ${account.tipo}`}
                    </p>
                  </div>

                  {/* Balance */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold" style={{ color: currencyColor }}>
                      {formatCurrency(account.balanceActual, isARS ? 'ARS' : 'USD')}
                    </p>
                  </div>

                  {/* Arrow */}
                  <svg
                    className="w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--text-secondary)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>

          {/* View all button */}
          <button
            onClick={() => navigate('/cuentas')}
            className="w-full p-3.5 text-center text-sm font-semibold transition-all duration-200 hover:bg-[var(--accent-primary-dim)] active:scale-[0.99]"
            style={{ color: 'var(--accent-primary)', borderTop: '1px solid var(--border-subtle)' }}
          >
            Ver detalles de cuentas →
          </button>
        </div>
      )}
    </div>
  );
}

export default AccountBalances;
