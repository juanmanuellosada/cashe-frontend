import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns';
import { getDashboardFiltered, getMovementsFiltered, getAccounts, getCategories, updateMovement, deleteMovement } from '../services/supabaseApi';
import BalanceCard from '../components/dashboard/BalanceCard';
import PeriodFlowCard from '../components/dashboard/PeriodFlowCard';
import QuickStats from '../components/dashboard/QuickStats';
import AccountBalances from '../components/dashboard/AccountBalances';
import WeeklySummary from '../components/dashboard/WeeklySummary';
import RecentMovements from '../components/dashboard/RecentMovements';
import EditMovementModal from '../components/EditMovementModal';
import LoadingSpinner from '../components/LoadingSpinner';
import PullToRefresh from '../components/PullToRefresh';
import { useError } from '../contexts/ErrorContext';
import { useDataEvent, DataEvents, emit } from '../services/dataEvents';

function Home() {
  const navigate = useNavigate();
  const { showError } = useError();

  // Currency selector (shared between cards)
  const [currency, setCurrency] = useState('ARS');

  // Shared account filters (used by both BalanceCard and PeriodFlowCard)
  const [accountFilters, setAccountFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('cashe_balance_account_filters');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error loading balance account filters:', e);
    }
    return [];
  });

  // Save account filters to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cashe_balance_account_filters', JSON.stringify(accountFilters));
    } catch (e) {
      console.warn('Error saving balance account filters:', e);
    }
  }, [accountFilters]);

  // Balance date range (default: current month) - for PeriodFlowCard
  const [balanceDateRange, setBalanceDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

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
      {/* Header - simplified */}
      <h1 className="text-base sm:text-lg font-medium" style={{ color: 'var(--text-primary)' }}>
        Dashboard
      </h1>

      {/* Balance and Flow Cards - side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Balance Card - Saldo actual */}
        {loadingDashboard ? (
          <div className="rounded-xl p-12 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <LoadingSpinner />
          </div>
        ) : (
          <BalanceCard
            accounts={accounts}
            dashboard={dashboard}
            currency={currency}
            onCurrencyChange={setCurrency}
            accountFilters={accountFilters}
            onAccountFiltersChange={setAccountFilters}
          />
        )}

        {/* Period Flow Card - Flujo del período */}
        {loadingDashboard ? (
          <div className="rounded-xl p-12 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <LoadingSpinner />
          </div>
        ) : (
          <PeriodFlowCard
            accounts={accounts}
            dashboard={dashboard}
            currency={currency}
            dateRange={balanceDateRange}
            onDateRangeChange={setBalanceDateRange}
            accountFilters={accountFilters}
          />
        )}
      </div>

      {/* Account Balances - Full width */}
      <AccountBalances
        accounts={accounts}
        loading={loadingInitial}
        onAccountClick={(account) => {
          setAccountFilters([account.nombre]);
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
