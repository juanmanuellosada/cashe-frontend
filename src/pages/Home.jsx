import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns';
import { getDashboardFiltered, getMovementsFiltered, getAccounts, getCategories, updateMovement, deleteMovement } from '../services/supabaseApi';
import BalanceCard from '../components/dashboard/BalanceCard';
import QuickStats from '../components/dashboard/QuickStats';
import AccountBalances from '../components/dashboard/AccountBalances';
import WeeklySummary from '../components/dashboard/WeeklySummary';
import RecentMovements from '../components/dashboard/RecentMovements';
import DateRangePicker from '../components/DateRangePicker';
import EditMovementModal from '../components/EditMovementModal';
import LoadingSpinner from '../components/LoadingSpinner';
import PullToRefresh from '../components/PullToRefresh';
import { useError } from '../contexts/ErrorContext';
import { useDataEvent, DataEvents, emit } from '../services/dataEvents';

function Home() {
  const navigate = useNavigate();
  const { showError } = useError();

  // Currency selector for balance section
  const [currency, setCurrency] = useState('ARS');

  // Balance date range (default: current month)
  const [balanceDateRange, setBalanceDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Balance account filters - load from localStorage
  const [balanceAccountFilters, setBalanceAccountFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('cashe_home_balance_accounts');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error loading balance account filters:', e);
    }
    return []; // Empty means show all
  });

  // Save balance account filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cashe_home_balance_accounts', JSON.stringify(balanceAccountFilters));
    } catch (e) {
      console.warn('Error saving balance account filters:', e);
    }
  }, [balanceAccountFilters]);

  // State for showing balance filters panel
  const [showBalanceFilters, setShowBalanceFilters] = useState(false);

  // Movements date range (default: current week) - load from localStorage
  const [movementDateRange, setMovementDateRange] = useState(() => {
    try {
      const saved = localStorage.getItem('cashe_home_movement_dates');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          from: parsed.from ? new Date(parsed.from) : startOfWeek(new Date(), { weekStartsOn: 1 }),
          to: parsed.to ? new Date(parsed.to) : endOfWeek(new Date(), { weekStartsOn: 1 }),
        };
      }
    } catch (e) {
      console.warn('Error loading saved date range:', e);
    }
    return {
      from: startOfWeek(new Date(), { weekStartsOn: 1 }),
      to: endOfWeek(new Date(), { weekStartsOn: 1 }),
    };
  });

  // Save movement date range to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('cashe_home_movement_dates', JSON.stringify({
        from: movementDateRange.from?.toISOString() || null,
        to: movementDateRange.to?.toISOString() || null,
      }));
    } catch (e) {
      console.warn('Error saving date range:', e);
    }
  }, [movementDateRange]);

  // Movements filters (arrays for multi-select) - load from localStorage
  const [movementFilters, setMovementFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('cashe_home_filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          tipos: parsed.tipos || [],
          cuentas: parsed.cuentas || [],
          categorias: parsed.categorias || [],
        };
      }
    } catch (e) {
      console.warn('Error loading saved filters:', e);
    }
    return { tipos: [], cuentas: [], categorias: [] };
  });

  // Save filters to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('cashe_home_filters', JSON.stringify(movementFilters));
    } catch (e) {
      console.warn('Error saving filters:', e);
    }
  }, [movementFilters]);

  // Data states
  const [dashboard, setDashboard] = useState(null);
  const [movements, setMovements] = useState([]);
  const [weeklyMovements, setWeeklyMovements] = useState([]); // Always current week, unfiltered
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ ingresos: [], gastos: [] });

  // Loading states
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(true);
  const [loadingWeekly, setLoadingWeekly] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Error state
  const [error, setError] = useState(null);

  // Edit modal state
  const [editingMovement, setEditingMovement] = useState(null);
  const [savingMovement, setSavingMovement] = useState(false);

  // Fetch accounts and categories on mount
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const [accountsData, categoriesData] = await Promise.all([
          getAccounts(),
          getCategories(),
        ]);
        setAccounts(accountsData.accounts || []);
        setCategories(categoriesData.categorias || { ingresos: [], gastos: [] });
      } catch (err) {
        console.error('Error fetching initial data:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    fetchInitialData();
  }, []);

  // Fetch dashboard when date range changes
  const fetchDashboard = useCallback(async () => {
    try {
      setLoadingDashboard(true);
      const data = await getDashboardFiltered({
        fromDate: balanceDateRange.from ? format(balanceDateRange.from, 'yyyy-MM-dd') : null,
        toDate: balanceDateRange.to ? format(balanceDateRange.to, 'yyyy-MM-dd') : null,
      });
      setDashboard(data.dashboard);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching dashboard:', err);
    } finally {
      setLoadingDashboard(false);
    }
  }, [balanceDateRange]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Fetch movements when date range or filters change
  const fetchMovements = useCallback(async () => {
    try {
      setLoadingMovements(true);
      const data = await getMovementsFiltered({
        fromDate: movementDateRange.from ? format(movementDateRange.from, 'yyyy-MM-dd') : null,
        toDate: movementDateRange.to ? format(movementDateRange.to, 'yyyy-MM-dd') : null,
        tipos: movementFilters.tipos,
        cuentas: movementFilters.cuentas,
        categorias: movementFilters.categorias,
      });
      setMovements(data.movements || []);
    } catch (err) {
      console.error('Error fetching movements:', err);
    } finally {
      setLoadingMovements(false);
    }
  }, [movementDateRange, movementFilters]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  // Fetch weekly movements (always current week, no filters) for WeeklySummary
  const fetchWeeklyMovements = useCallback(async () => {
    try {
      setLoadingWeekly(true);
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
      const data = await getMovementsFiltered({
        fromDate: format(weekStart, 'yyyy-MM-dd'),
        toDate: format(weekEnd, 'yyyy-MM-dd'),
        tipos: [], // No type filter
        cuentas: [], // No account filter
        categorias: [], // No category filter
      });
      setWeeklyMovements(data.movements || []);
    } catch (err) {
      console.error('Error fetching weekly movements:', err);
    } finally {
      setLoadingWeekly(false);
    }
  }, []);

  useEffect(() => {
    fetchWeeklyMovements();
  }, [fetchWeeklyMovements]);

  // Combined refresh for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchDashboard(), fetchMovements(), fetchWeeklyMovements()]);
  }, [fetchDashboard, fetchMovements, fetchWeeklyMovements]);

  // Suscribirse a cambios de datos para refrescar automáticamente
  useDataEvent(DataEvents.ALL_DATA_CHANGED, handleRefresh);

  // Handle movement edit save
  const handleSaveMovement = async (updatedMovement) => {
    try {
      setSavingMovement(true);
      await updateMovement(updatedMovement);
      setEditingMovement(null);
      // Emitir eventos para propagar cambios a otros componentes
      const eventType = updatedMovement.tipo === 'ingreso' ? DataEvents.INCOMES_CHANGED :
                        updatedMovement.tipo === 'gasto' ? DataEvents.EXPENSES_CHANGED :
                        DataEvents.TRANSFERS_CHANGED;
      emit(eventType);
      emit(DataEvents.ACCOUNTS_CHANGED);
      // Refresh all data including weekly
      await Promise.all([fetchDashboard(), fetchMovements(), fetchWeeklyMovements()]);
    } catch (err) {
      console.error('Error updating movement:', err);
      showError('No se pudo guardar el movimiento', err.message);
    } finally {
      setSavingMovement(false);
    }
  };

  // Handle movement delete (optimistic)
  const handleDeleteMovement = async (movement) => {
    // Cerrar modal inmediatamente (optimistic)
    setEditingMovement(null);

    // Remover de la lista local inmediatamente
    setMovements(prev => prev.filter(m =>
      !(m.tipo === movement.tipo && m.rowIndex === movement.rowIndex)
    ));
    setWeeklyMovements(prev => prev.filter(m =>
      !(m.tipo === movement.tipo && m.rowIndex === movement.rowIndex)
    ));

    // Borrar en background
    try {
      await deleteMovement(movement);
      // Emitir eventos para propagar cambios a otros componentes
      const eventType = movement.tipo === 'ingreso' ? DataEvents.INCOMES_CHANGED :
                        movement.tipo === 'gasto' ? DataEvents.EXPENSES_CHANGED :
                        DataEvents.TRANSFERS_CHANGED;
      emit(eventType);
      emit(DataEvents.ACCOUNTS_CHANGED);
      // Refrescar todos los datos para sincronizar
      await Promise.all([fetchDashboard(), fetchMovements(), fetchWeeklyMovements()]);
    } catch (err) {
      console.error('Error deleting movement:', err);
      showError('No se pudo eliminar el movimiento', err.message);
      // Recargar para recuperar el estado real
      await Promise.all([fetchMovements(), fetchWeeklyMovements()]);
    }
  };

  // Handle movement duplicate
  const handleDuplicateMovement = (duplicatedData) => {
    setEditingMovement(null);
    // Navigate to new movement page with pre-filled data
    navigate('/nuevo', { state: { prefill: duplicatedData } });
  };

  // Calculate filtered balance from accounts
  const filteredAccounts = balanceAccountFilters.length > 0
    ? accounts.filter(acc => balanceAccountFilters.includes(acc.nombre))
    : accounts;

  const filteredBalance = {
    totalPesos: filteredAccounts
      .filter(acc => acc.moneda === 'Peso')
      .reduce((sum, acc) => sum + (acc.balanceActual || 0), 0),
    totalDolares: filteredAccounts
      .filter(acc => acc.moneda === 'Dólar')
      .reduce((sum, acc) => sum + (acc.balanceActual || 0), 0),
    totalGeneralPesos: filteredAccounts
      .filter(acc => acc.moneda === 'Peso')
      .reduce((sum, acc) => sum + (acc.balanceActual || 0), 0) +
      filteredAccounts
        .filter(acc => acc.moneda === 'Dólar')
        .reduce((sum, acc) => sum + (acc.balanceActual || 0), 0) * (dashboard?.tipoCambio || 1000),
    totalGeneralDolares: filteredAccounts
      .filter(acc => acc.moneda === 'Dólar')
      .reduce((sum, acc) => sum + (acc.balanceActual || 0), 0) +
      filteredAccounts
        .filter(acc => acc.moneda === 'Peso')
        .reduce((sum, acc) => sum + (acc.balanceActual || 0), 0) / (dashboard?.tipoCambio || 1000),
    ingresosMes: filteredAccounts.reduce((sum, acc) => sum + (acc.totalIngresos || 0), 0),
    gastosMes: filteredAccounts.reduce((sum, acc) => sum + (acc.totalGastos || 0), 0),
  };

  // Use filtered or original dashboard data
  const displayDashboard = balanceAccountFilters.length > 0 ? {
    ...dashboard,
    ...filteredBalance,
  } : dashboard;

  // Initial loading
  if (loadingInitial && loadingDashboard) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error && !dashboard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p style={{ color: 'var(--accent-red)' }}>Error: {error}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 rounded-lg font-medium"
          style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} disabled={loadingDashboard && loadingMovements}>
    <div className="space-y-4 sm:space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-3">
        <h1 className="text-base sm:text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Currency Selector */}
          <div
            className="inline-flex p-0.5 sm:p-1 rounded-md sm:rounded-lg"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <button
              onClick={() => setCurrency('ARS')}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-colors duration-150 flex items-center gap-1 sm:gap-1.5"
              style={{
                backgroundColor: currency === 'ARS' ? 'var(--bg-elevated)' : 'transparent',
                color: currency === 'ARS' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm" />
              ARS
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium transition-colors duration-150 flex items-center gap-1 sm:gap-1.5"
              style={{
                backgroundColor: currency === 'USD' ? 'var(--bg-elevated)' : 'transparent',
                color: currency === 'USD' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm" />
              USD
            </button>
          </div>
          <div className="flex items-center gap-1">
            <DateRangePicker
              value={balanceDateRange}
              onChange={setBalanceDateRange}
              defaultPreset="Este mes"
            />
            {(balanceDateRange.from || balanceDateRange.to) && (
              <button
                onClick={() => setBalanceDateRange({ from: null, to: null })}
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
      </div>

      {/* Balance Card - Full width */}
      {loadingDashboard ? (
        <div className="rounded-xl p-12 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-3">
          <BalanceCard
            totalPesos={displayDashboard?.totalPesos}
            totalDolares={displayDashboard?.totalDolares}
            totalGeneralPesos={displayDashboard?.totalGeneralPesos}
            totalGeneralDolares={displayDashboard?.totalGeneralDolares}
            tipoCambio={displayDashboard?.tipoCambio}
            currency={currency}
            ingresosMes={displayDashboard?.ingresosMes}
            gastosMes={displayDashboard?.gastosMes}
            ingresosMesDolares={displayDashboard?.ingresosMesDolares}
            gastosMesDolares={displayDashboard?.gastosMesDolares}
          />

          {/* Balance Filters */}
          <div className="space-y-2">
            <button
              onClick={() => setShowBalanceFilters(!showBalanceFilters)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-[0.98]"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
            >
              <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="font-medium">Filtrar cuentas</span>
              {balanceAccountFilters.length > 0 && (
                <span
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white',
                    boxShadow: '0 2px 8px var(--accent-primary-glow)'
                  }}
                >
                  {balanceAccountFilters.length}
                </span>
              )}
              <svg
                className={`w-4 h-4 transition-transform duration-300 ${showBalanceFilters ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showBalanceFilters && (
              <div className="p-4 rounded-2xl space-y-3 animate-scale-in card-glass">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    Cuentas incluidas en el balance
                  </label>
                  <button
                    onClick={() => {
                      const allAccountNames = accounts.map(a => a.nombre);
                      const allSelected = allAccountNames.length > 0 && allAccountNames.every(name => balanceAccountFilters.includes(name));
                      setBalanceAccountFilters(allSelected ? [] : allAccountNames);
                    }}
                    className="text-[10px] font-semibold transition-colors hover:opacity-80"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    {accounts.length > 0 && accounts.every(a => balanceAccountFilters.includes(a.nombre))
                      ? 'Deseleccionar todos'
                      : 'Seleccionar todos'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {accounts.map((account) => {
                    const selected = balanceAccountFilters.length === 0 || balanceAccountFilters.includes(account.nombre);
                    return (
                      <button
                        key={account.nombre}
                        onClick={() => {
                          if (balanceAccountFilters.length === 0) {
                            // First selection: select only this account
                            setBalanceAccountFilters([account.nombre]);
                          } else if (balanceAccountFilters.includes(account.nombre)) {
                            // Deselect
                            const newFilters = balanceAccountFilters.filter(n => n !== account.nombre);
                            setBalanceAccountFilters(newFilters.length === 0 ? [] : newFilters);
                          } else {
                            // Add to selection
                            setBalanceAccountFilters([...balanceAccountFilters, account.nombre]);
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
                        style={{
                          backgroundColor: selected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                          color: selected ? 'white' : 'var(--text-secondary)',
                          boxShadow: selected ? '0 4px 16px var(--accent-primary-glow)' : 'none',
                          opacity: balanceAccountFilters.length === 0 ? 0.7 : 1,
                        }}
                      >
                        {account.nombre}
                      </button>
                    );
                  })}
                </div>
                {balanceAccountFilters.length > 0 && (
                  <div className="pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <button
                      onClick={() => setBalanceAccountFilters([])}
                      className="text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 hover:opacity-80 active:scale-95"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Mostrar todas las cuentas
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account Balances - Full width */}
      <AccountBalances
        accounts={filteredAccounts}
        loading={loadingInitial}
        onAccountClick={(account) => {
          setMovementFilters(prev => ({
            ...prev,
            cuentas: [account.nombre]
          }));
        }}
      />

      {/* Weekly Summary - Full width */}
      <WeeklySummary
        movements={weeklyMovements}
        accounts={accounts}
        categories={categories}
        loading={loadingWeekly}
      />

      {/* Recent Movements - Full width */}
      <RecentMovements
        movements={movements}
        dateRange={movementDateRange}
        onDateRangeChange={setMovementDateRange}
        filters={movementFilters}
        onFilterChange={setMovementFilters}
        accounts={accounts}
        categories={categories}
        onMovementClick={setEditingMovement}
        onMovementDelete={handleDeleteMovement}
        loading={loadingMovements}
        currency={currency}
      />

      {/* Edit Modal */}
      {editingMovement && (
        <EditMovementModal
          movement={editingMovement}
          accounts={accounts}
          categories={categories}
          onSave={handleSaveMovement}
          onDelete={handleDeleteMovement}
          onDuplicate={handleDuplicateMovement}
          onClose={() => setEditingMovement(null)}
          onConvertedToRecurring={handleRefresh}
          loading={savingMovement}
        />
      )}
    </div>
    </PullToRefresh>
  );
}

export default Home;
