import { useState, useRef, useEffect } from 'react';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useStatistics } from '../contexts/StatisticsContext';
import { resolveIconPath, isEmoji } from '../services/iconStorage';
import DateRangePicker from './DateRangePicker';

const STATS_PRESETS = [
  { label: 'Este mes', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: '3 meses', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
  { label: '6 meses', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 5)), to: endOfMonth(new Date()) }) },
  { label: '12 meses', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 11)), to: endOfMonth(new Date()) }) },
];

function AccountFilter() {
  const { accounts, selectedAccounts, setSelectedAccounts } = useStatistics();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleAccount = (nombre) => {
    if (selectedAccounts.includes(nombre)) {
      setSelectedAccounts(selectedAccounts.filter(a => a !== nombre));
    } else {
      setSelectedAccounts([...selectedAccounts, nombre]);
    }
  };

  const toggleAll = () => {
    if (selectedAccounts.length === accounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(accounts.map(a => a.nombre));
    }
  };

  const displayLabel = selectedAccounts.length === 0
    ? 'Todas las cuentas'
    : `${selectedAccounts.length} cuenta${selectedAccounts.length > 1 ? 's' : ''}`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-sm flex items-center gap-1.5 transition-all duration-200 hover:bg-[var(--bg-hover)] active:scale-[0.98]"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
      >
        <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="font-medium text-xs">{displayLabel}</span>
        {selectedAccounts.length > 0 && (
          <span
            className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            {selectedAccounts.length}
          </span>
        )}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-secondary)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 mt-2 rounded-xl shadow-2xl p-3 right-0 animate-scale-in min-w-[220px] max-w-[300px]"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(139, 124, 255, 0.1)',
          }}
        >
          {/* Toggle all */}
          <button
            onClick={toggleAll}
            className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-[var(--bg-tertiary)] mb-2"
            style={{ color: 'var(--accent-primary)' }}
          >
            {selectedAccounts.length === accounts.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
          </button>

          <div
            className="space-y-0.5 max-h-[250px] overflow-y-auto pr-1"
            style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}
          >
            {accounts.map((account) => {
              const isSelected = selectedAccounts.includes(account.nombre);
              return (
                <button
                  key={account.id || account.nombre}
                  onClick={() => toggleAccount(account.nombre)}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  {/* Checkbox */}
                  <div
                    className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-colors"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                      border: isSelected ? 'none' : '1.5px solid var(--text-muted)',
                    }}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Account icon */}
                  {account.icon && (
                    isEmoji(account.icon) ? (
                      <span className="w-5 h-5 flex items-center justify-center text-sm flex-shrink-0">{account.icon}</span>
                    ) : (
                      <img
                        src={resolveIconPath(account.icon)}
                        alt=""
                        className="w-5 h-5 rounded flex-shrink-0"
                      />
                    )
                  )}

                  {/* Account name + currency badge */}
                  <span className="text-xs font-medium truncate flex-1 text-left" style={{ color: 'var(--text-primary)' }}>
                    {account.nombre}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{
                      backgroundColor: account.moneda === 'Dólar' ? 'var(--accent-green-dim)' : 'var(--accent-primary-dim)',
                      color: account.moneda === 'Dólar' ? 'var(--accent-green)' : 'var(--accent-primary)',
                    }}
                  >
                    {account.moneda === 'Dólar' ? 'USD' : 'ARS'}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedAccounts.length > 0 && (
            <button
              onClick={() => {
                setSelectedAccounts([]);
                setIsOpen(false);
              }}
              className="w-full text-center text-xs font-medium mt-2 pt-2 transition-colors hover:opacity-80"
              style={{ color: 'var(--accent-red)', borderTop: '1px solid var(--border-subtle)' }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CurrencyToggle() {
  const { currency, setCurrency } = useStatistics();

  return (
    <div
      className="inline-flex rounded-xl p-1"
      style={{ backgroundColor: 'var(--bg-tertiary)' }}
    >
      <button
        onClick={() => setCurrency('ARS')}
        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 active:scale-95 flex items-center gap-1.5"
        style={{
          backgroundColor: currency === 'ARS' ? 'var(--accent-primary)' : 'transparent',
          color: currency === 'ARS' ? 'white' : 'var(--text-secondary)',
          boxShadow: currency === 'ARS' ? '0 4px 12px var(--accent-primary-glow)' : 'none',
        }}
      >
        <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-4 h-4 rounded-sm" />
        ARS
      </button>
      <button
        onClick={() => setCurrency('USD')}
        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 active:scale-95 flex items-center gap-1.5"
        style={{
          backgroundColor: currency === 'USD' ? 'var(--accent-green)' : 'transparent',
          color: currency === 'USD' ? 'white' : 'var(--text-secondary)',
          boxShadow: currency === 'USD' ? '0 4px 12px rgba(0, 217, 154, 0.3)' : 'none',
        }}
      >
        <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-4 h-4 rounded-sm" />
        USD
      </button>
    </div>
  );
}

function StatisticsFilterBar() {
  const { dateRange, setDateRange } = useStatistics();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
      <CurrencyToggle />
      <AccountFilter />
      <div className="flex items-center gap-1">
        <DateRangePicker
          value={dateRange}
          onChange={setDateRange}
          presets={STATS_PRESETS}
          defaultPreset="6 meses"
        />
        {(dateRange.from || dateRange.to) && (
          <button
            onClick={() => setDateRange({ from: null, to: null })}
            className="p-1.5 rounded-lg transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
            title="Limpiar fechas"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default StatisticsFilterBar;
