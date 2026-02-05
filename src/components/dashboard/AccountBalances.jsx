import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../../utils/format';
import { isEmoji, resolveIconPath } from '../../services/iconStorage';

function AccountBalances({ accounts, loading, onAccountClick }) {
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();

  // Filter out accounts hidden from balance
  const visibleAccounts = (accounts || []).filter(acc => !acc.ocultaDelBalance);

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

  if (!visibleAccounts || visibleAccounts.length === 0) {
    return null;
  }

  const handleAccountClick = (account) => {
    if (onAccountClick) {
      onAccountClick(account);
    }
  };

  return (
    <div className="card-glass overflow-hidden transition-all duration-300 rounded-lg min-[400px]:rounded-xl">
      {/* Header - always visible, stacks on <400px */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-3 sm:p-4 flex flex-col min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between gap-2 text-left transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-[0.99]"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-primary-dim)' }}
          >
            <svg
              className="w-4 h-4"
              style={{ color: 'var(--accent-primary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <span className="font-semibold text-sm sm:text-[15px]" style={{ color: 'var(--text-primary)' }}>
              Cuentas
            </span>
            <span
              className="ml-2 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              {visibleAccounts.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end min-[400px]:self-auto">
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {expanded ? 'Ocultar' : 'Ver todas'}
          </span>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
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
            {visibleAccounts.map((account, index) => {
              const isARS = account.moneda === 'Peso';
              const isCreditCard = account.esTarjetaCredito;
              const currencyColor = isCreditCard ? '#a855f7' : (isARS ? '#75AADB' : '#3CB371');
              const hasIcon = !!account.icon;
              const iconIsEmoji = hasIcon && isEmoji(account.icon);

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
                  {/* Account icon or currency fallback */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110 overflow-hidden"
                    style={{
                      backgroundColor: hasIcon && !iconIsEmoji ? 'transparent' : `${currencyColor}15`,
                      boxShadow: `0 0 20px ${currencyColor}10`
                    }}
                  >
                    {hasIcon ? (
                      iconIsEmoji ? (
                        <span className="text-xl">{account.icon}</span>
                      ) : (
                        <img
                          src={resolveIconPath(account.icon)}
                          alt={account.nombre}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      )
                    ) : (
                      <span className="text-sm font-bold" style={{ color: currencyColor }}>
                        {isCreditCard ? '💳' : (isARS ? '$' : 'US$')}
                      </span>
                    )}
                  </div>

                  {/* Account info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate text-[15px]" style={{ color: 'var(--text-primary)' }}>
                      {account.nombre}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {isCreditCard ? 'Próximo resumen' : (
                        <>
                          {isARS ? 'Pesos' : 'Dólares'}
                          {account.tipo && ` · ${account.tipo}`}
                        </>
                      )}
                    </p>
                  </div>

                  {/* Balance or Credit Card Statement */}
                  <div className="text-right flex-shrink-0">
                    {isCreditCard ? (
                      <div className="flex flex-col items-end gap-0.5">
                        {account.proximoResumenPesos > 0 && (
                          <p className="font-bold text-[14px]" style={{ color: 'var(--accent-red)' }}>
                            -{formatCurrency(account.proximoResumenPesos, 'ARS')}
                          </p>
                        )}
                        {account.proximoResumenDolares > 0 && (
                          <p className="font-bold text-[14px]" style={{ color: '#3CB371' }}>
                            -{formatCurrency(account.proximoResumenDolares, 'USD')}
                          </p>
                        )}
                        {account.proximoResumenPesos === 0 && account.proximoResumenDolares === 0 && (
                          <p className="font-bold text-[14px]" style={{ color: 'var(--text-muted)' }}>
                            $0
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="font-bold text-[15px]" style={{ color: currencyColor }}>
                        {formatCurrency(account.balanceActual, isARS ? 'ARS' : 'USD')}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mobile: List layout */}
          <div className="lg:hidden overflow-hidden">
            {visibleAccounts.map((account, index) => {
              const isARS = account.moneda === 'Peso';
              const isCreditCard = account.esTarjetaCredito;
              const currencyColor = isCreditCard ? '#a855f7' : (isARS ? '#75AADB' : '#3CB371');
              const hasIcon = !!account.icon;
              const iconIsEmoji = hasIcon && isEmoji(account.icon);

              return (
                <button
                  key={account.nombre}
                  onClick={() => handleAccountClick(account)}
                  className="w-full px-3 py-2.5 flex flex-col min-[400px]:flex-row min-[400px]:items-center gap-2 text-left transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-[0.99] group"
                  style={{
                    borderBottom: index < visibleAccounts.length - 1 ? '1px solid var(--border-subtle)' : 'none'
                  }}
                >
                  {/* Top row: Icon + Name */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Account icon or currency fallback */}
                    <div
                      className="w-8 h-8 rounded-md min-[400px]:rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: hasIcon && !iconIsEmoji ? 'transparent' : `${currencyColor}15` }}
                    >
                      {hasIcon ? (
                        iconIsEmoji ? (
                          <span className="text-lg">{account.icon}</span>
                        ) : (
                          <img
                            src={resolveIconPath(account.icon)}
                            alt={account.nombre}
                            className="w-full h-full object-cover rounded-md min-[400px]:rounded-lg"
                          />
                        )
                      ) : (
                        <span className="text-[11px] font-bold" style={{ color: currencyColor }}>
                          {isCreditCard ? '💳' : (isARS ? '$' : 'US$')}
                        </span>
                      )}
                    </div>

                    {/* Account info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-medium text-sm leading-tight"
                        style={{
                          color: 'var(--text-primary)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {account.nombre}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {isCreditCard ? 'Próximo resumen' : (isARS ? 'Pesos' : 'Dólares')}
                      </p>
                    </div>
                  </div>

                  {/* Balance or Credit Card Statement - below on <400px, right on 400px+ */}
                  <div className="text-left min-[400px]:text-right flex-shrink-0 pl-10 min-[400px]:pl-0">
                    {isCreditCard ? (
                      <div className="flex flex-col min-[400px]:items-end gap-0.5">
                        {account.proximoResumenPesos > 0 && (
                          <p className="font-bold text-sm" style={{ color: 'var(--accent-red)' }}>
                            -{formatCurrency(account.proximoResumenPesos, 'ARS')}
                          </p>
                        )}
                        {account.proximoResumenDolares > 0 && (
                          <p className="font-bold text-sm" style={{ color: '#3CB371' }}>
                            -{formatCurrency(account.proximoResumenDolares, 'USD')}
                          </p>
                        )}
                        {account.proximoResumenPesos === 0 && account.proximoResumenDolares === 0 && (
                          <p className="font-bold text-sm" style={{ color: 'var(--text-muted)' }}>
                            $0
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="font-bold text-sm" style={{ color: currencyColor }}>
                        {formatCurrency(account.balanceActual, isARS ? 'ARS' : 'USD')}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* View all button */}
          <button
            onClick={() => navigate('/cuentas')}
            className="w-full py-3 sm:p-3.5 text-center text-sm font-semibold transition-all duration-200 hover:bg-[var(--accent-primary-dim)] active:scale-[0.99]"
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
