import { useState, useEffect, useMemo } from 'react';
import { formatCurrency } from '../../utils/format';

function BalanceCard({
  accounts = [],
  dashboard,
  currency = 'ARS',
}) {
  const [showFilters, setShowFilters] = useState(false);

  // Filters state with localStorage persistence
  const [accountFilters, setAccountFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('cashe_balance_account_filters');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error loading balance account filters:', e);
    }
    return []; // Empty means show all
  });

  // Save filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cashe_balance_account_filters', JSON.stringify(accountFilters));
    } catch (e) {
      console.warn('Error saving balance account filters:', e);
    }
  }, [accountFilters]);

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

    // Ingresos y gastos del mes (solo si no hay filtros, usar dashboard)
    // Si hay filtros, sumar de las cuentas filtradas
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
      totalPesos,
      totalDolares,
      totalGeneralPesos,
      totalGeneralDolares,
      tipoCambio,
      ingresosMes,
      gastosMes,
      filteredAccounts,
    };
  }, [accounts, accountFilters, dashboard]);

  const balance = currency === 'ARS' ? filteredData.totalGeneralPesos : filteredData.totalGeneralDolares;
  const ingresos = filteredData.ingresosMes;
  const gastos = filteredData.gastosMes;
  const netFlow = ingresos - Math.abs(gastos);

  // Count active filters
  const activeFiltersCount = accountFilters.length > 0 ? accountFilters.length : 0;

  // Toggle filter value
  const toggleFilter = (accountName) => {
    if (accountFilters.length === 0) {
      // First selection: select only this account
      setAccountFilters([accountName]);
    } else if (accountFilters.includes(accountName)) {
      // Deselect
      const newFilters = accountFilters.filter(n => n !== accountName);
      setAccountFilters(newFilters);
    } else {
      // Add to selection
      setAccountFilters([...accountFilters, accountName]);
    }
  };

  // Check if account is selected
  const isSelected = (accountName) => {
    return accountFilters.length === 0 || accountFilters.includes(accountName);
  };

  // Select all accounts
  const selectAll = () => {
    const allAccountNames = accounts.map(a => a.nombre);
    const allSelected = allAccountNames.length > 0 && allAccountNames.every(name => accountFilters.includes(name));
    setAccountFilters(allSelected ? [] : allAccountNames);
  };

  // Clear filters (show all)
  const clearFilters = () => {
    setAccountFilters([]);
  };

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
      {filteredData.tipoCambio && (
        <div
          className="flex items-center justify-between pt-1.5 sm:pt-2 mt-1.5 sm:mt-2"
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
