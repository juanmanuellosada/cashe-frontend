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
import { useDataEvent, DataEvents } from '../services/dataEvents';

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

  // Movements date range (default: current week)
  const [movementDateRange, setMovementDateRange] = useState({
    from: startOfWeek(new Date(), { weekStartsOn: 1 }),
    to: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });

  // Movements filters (arrays for multi-select)
  const [movementFilters, setMovementFilters] = useState({
    tipos: [],
    cuentas: [],
    categorias: [],
  });

  // Data states
  const [dashboard, setDashboard] = useState(null);
  const [movements, setMovements] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState({ ingresos: [], gastos: [] });

  // Loading states
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(true);
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

  // Combined refresh for pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchDashboard(), fetchMovements()]);
  }, [fetchDashboard, fetchMovements]);

  // Suscribirse a cambios de datos para refrescar automáticamente
  useDataEvent(DataEvents.ALL_DATA_CHANGED, handleRefresh);

  // Handle movement edit save
  const handleSaveMovement = async (updatedMovement) => {
    try {
      setSavingMovement(true);
      await updateMovement(updatedMovement);
      setEditingMovement(null);
      // Refresh data
      await Promise.all([fetchDashboard(), fetchMovements()]);
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

    // Borrar en background
    try {
      await deleteMovement(movement);
      // Refrescar todos los datos para sincronizar (dashboard + movements)
      await Promise.all([fetchDashboard(), fetchMovements()]);
    } catch (err) {
      console.error('Error deleting movement:', err);
      showError('No se pudo eliminar el movimiento', err.message);
      // Recargar para recuperar el estado real
      await fetchMovements();
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
        <BalanceCard
          totalPesos={dashboard?.totalPesos}
          totalDolares={dashboard?.totalDolares}
          totalGeneralPesos={dashboard?.totalGeneralPesos}
          totalGeneralDolares={dashboard?.totalGeneralDolares}
          tipoCambio={dashboard?.tipoCambio}
          currency={currency}
          ingresosMes={dashboard?.ingresosMes}
          gastosMes={dashboard?.gastosMes}
          ingresosMesDolares={dashboard?.ingresosMesDolares}
          gastosMesDolares={dashboard?.gastosMesDolares}
        />
      )}

      {/* Account Balances - Full width */}
      <AccountBalances
        accounts={accounts}
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
        movements={movements}
        loading={loadingMovements}
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
