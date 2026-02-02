import { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../../utils/format';

function BalanceCard({
  accounts = [],
  dashboard,
  currency = 'ARS',
  onCurrencyChange,
  accountFilters = [],
  onAccountFiltersChange,
}) {
  const [showFilters, setShowFilters] = useState(false);

  // Calculate filtered balance from accounts
  const filteredData = useMemo(() => {
    const filteredAccounts = accountFilters.length > 0
      ? accounts.filter(acc => accountFilters.includes(acc.nombre))
      : accounts;

    const tipoCambio = dashboard?.tipoCambio || 1000;

    // Calculate totals from filtered accounts
    const totalPesos = filteredAccounts
      .filter(acc => acc.moneda === 'Peso')
      .reduce((sum, acc) => sum + (acc.balanceActual || 0), 0);

    const totalDolares = filteredAccounts
      .filter(acc => acc.moneda === 'Dólar')
      .reduce((sum, acc) => sum + (acc.balanceActual || 0), 0);

    const totalGeneralPesos = totalPesos + (totalDolares * tipoCambio);
    const totalGeneralDolares = totalDolares + (totalPesos / tipoCambio);

    return {
      totalPesos,
      totalDolares,
      totalGeneralPesos,
      totalGeneralDolares,
      tipoCambio,
      filteredAccounts,
    };
  }, [accounts, accountFilters, dashboard]);

  const balance = currency === 'ARS' ? filteredData.totalGeneralPesos : filteredData.totalGeneralDolares;

  // Count active filters
  const activeFiltersCount = accountFilters.length > 0 ? accountFilters.length : 0;

  // Toggle filter value
  const toggleFilter = (accountName) => {
    if (!onAccountFiltersChange) return;

    if (accountFilters.length === 0) {
      // First selection: select only this account
      onAccountFiltersChange([accountName]);
    } else if (accountFilters.includes(accountName)) {
      // Deselect
      const newFilters = accountFilters.filter(n => n !== accountName);
      onAccountFiltersChange(newFilters);
    } else {
      // Add to selection
      onAccountFiltersChange([...accountFilters, accountName]);
    }
  };

  // Check if account is selected
  const isSelected = (accountName) => {
    return accountFilters.length === 0 || accountFilters.includes(accountName);
  };

  // Select all accounts
  const selectAll = () => {
    if (!onAccountFiltersChange) return;
    const allAccountNames = accounts.map(a => a.nombre);
    const allSelected = allAccountNames.length > 0 && allAccountNames.every(name => accountFilters.includes(name));
    onAccountFiltersChange(allSelected ? [] : allAccountNames);
  };

  // Clear filters (show all)
  const clearFilters = () => {
    if (onAccountFiltersChange) {
      onAccountFiltersChange([]);
    }
  };

  return (
    <div
      className="p-3 sm:p-4 rounded-xl"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Header with currency selector */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
          Saldo actual
        </span>
        {/* Currency Selector */}
        <div
          className="inline-flex p-0.5 rounded-md"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <button
            onClick={() => onCurrencyChange?.('ARS')}
            className="px-2 py-1 rounded text-[10px] font-medium transition-colors duration-150 flex items-center gap-1"
            style={{
              backgroundColor: currency === 'ARS' ? 'var(--bg-elevated)' : 'transparent',
              color: currency === 'ARS' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-3.5 h-3.5 rounded-sm" />
            ARS
          </button>
          <button
            onClick={() => onCurrencyChange?.('USD')}
            className="px-2 py-1 rounded text-[10px] font-medium transition-colors duration-150 flex items-center gap-1"
            style={{
              backgroundColor: currency === 'USD' ? 'var(--bg-elevated)' : 'transparent',
              color: currency === 'USD' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-3.5 h-3.5 rounded-sm" />
            USD
          </button>
        </div>
      </div>

      {/* Main balance */}
      <h2
        className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3 sm:mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        {formatCurrency(balance, currency)}
      </h2>

      {/* Currency breakdown */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3">
        <div className="p-2 sm:p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wide mb-0.5 sm:mb-1" style={{ color: 'var(--text-muted)' }}>
            En pesos
          </p>
          <p className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(filteredData.totalPesos, 'ARS')}
          </p>
        </div>

        <div className="p-2 sm:p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <p className="text-[9px] sm:text-[10px] uppercase tracking-wide mb-0.5 sm:mb-1" style={{ color: 'var(--text-muted)' }}>
            En dólares
          </p>
          <p className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
            {formatCurrency(filteredData.totalDolares, 'USD')}
          </p>
        </div>
      </div>

      {/* Exchange rate */}
      {filteredData.tipoCambio && (
        <div
          className="flex items-center justify-between py-1.5 sm:py-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <span className="text-[11px] sm:text-xs" style={{ color: 'var(--text-muted)' }}>
            Tipo de cambio
          </span>
          <span className="text-[11px] sm:text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {formatCurrency(filteredData.tipoCambio)} / USD
          </span>
        </div>
      )}

      {/* Filters Toggle */}
      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-[0.99]"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          <div className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="font-medium">Filtrar cuentas</span>
            {activeFiltersCount > 0 && (
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                }}
              >
                {activeFiltersCount}
              </span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-2 p-3 rounded-lg space-y-2 animate-scale-in" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Cuentas incluidas
              </label>
              <button
                onClick={selectAll}
                className="text-[10px] font-semibold transition-colors hover:opacity-80"
                style={{ color: 'var(--accent-primary)' }}
              >
                {accounts.length > 0 && accounts.every(a => accountFilters.includes(a.nombre))
                  ? 'Deseleccionar todos'
                  : 'Seleccionar todos'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
              {accounts.map((account) => {
                const selected = isSelected(account.nombre);
                return (
                  <button
                    key={account.nombre}
                    onClick={() => toggleFilter(account.nombre)}
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 active:scale-95"
                    style={{
                      backgroundColor: selected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: selected ? 'white' : 'var(--text-secondary)',
                      boxShadow: selected ? '0 2px 8px var(--accent-primary-glow)' : 'none',
                      opacity: accountFilters.length === 0 ? 0.7 : 1,
                    }}
                  >
                    {account.nombre}
                  </button>
                );
              })}
            </div>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-[10px] font-semibold flex items-center gap-1 transition-all duration-200 hover:opacity-80 mt-2"
                style={{ color: 'var(--accent-primary)' }}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Mostrar todas
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BalanceCard;
