import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns';
import { getDashboardFiltered, getMovementsFiltered, getAccounts, getCategories, updateMovement, deleteMovement } from '../services/sheetsApi';
import BalanceCard from '../components/dashboard/BalanceCard';
import QuickStats from '../components/dashboard/QuickStats';
import AccountBalances from '../components/dashboard/AccountBalances';
import WeeklySummary from '../components/dashboard/WeeklySummary';
import RecentMovements from '../components/dashboard/RecentMovements';
import DateRangePicker from '../components/DateRangePicker';
import EditMovementModal from '../components/EditMovementModal';
import LoadingSpinner from '../components/LoadingSpinner';

function Home() {
  const navigate = useNavigate();

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

  // Handle movement edit save
  const handleSaveMovement = async (updatedMovement) => {
    try {
      setSavingMovement(true);
      await updateMovement(updatedMovement);
      setEditingMovement(null);
      // Refresh data
      fetchDashboard();
      fetchMovements();
    } catch (err) {
      console.error('Error updating movement:', err);
      alert('Error al guardar: ' + err.message);
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
      // Refrescar datos para sincronizar
      fetchDashboard();
    } catch (err) {
      console.error('Error deleting movement:', err);
      alert('Error al eliminar: ' + err.message);
      // Recargar para recuperar el estado real
      fetchMovements();
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
    <div className="space-y-6">
      {/* Balance Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Resumen
          </h2>
          <div className="flex items-center gap-2">
            {/* Currency Selector */}
            <div
              className="inline-flex rounded-lg p-0.5"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <button
                onClick={() => setCurrency('ARS')}
                className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-200"
                style={{
                  backgroundColor: currency === 'ARS' ? 'var(--accent-primary)' : 'transparent',
                  color: currency === 'ARS' ? 'white' : 'var(--text-secondary)',
                }}
              >
                Pesos
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className="px-3 py-1 rounded-md text-xs font-medium transition-all duration-200"
                style={{
                  backgroundColor: currency === 'USD' ? 'var(--accent-green)' : 'transparent',
                  color: currency === 'USD' ? 'white' : 'var(--text-secondary)',
                }}
              >
                Dólares
              </button>
            </div>
            <DateRangePicker
              value={balanceDateRange}
              onChange={setBalanceDateRange}
              defaultPreset="Este mes"
            />
          </div>
        </div>

        {loadingDashboard ? (
          <div className="rounded-2xl p-8" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <LoadingSpinner />
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* Account Balances Section */}
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

      {/* Weekly Summary */}
      <WeeklySummary
        movements={movements}
        loading={loadingMovements}
      />

      {/* Movements Section */}
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
          loading={savingMovement}
        />
      )}
    </div>
  );
}

export default Home;
