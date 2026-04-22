import { create } from 'zustand';
import {
  getAccounts,
  getCategories,
  getCategoriesWithId,
  getDashboard,
  getRecentMovements,
  processFutureTransactions,
  addExpense,
  addIncome,
  updateMovement as apiUpdateMovement,
  deleteMovement as apiDeleteMovement,
  addTransfer as apiAddTransfer,
} from '../services/supabaseApi';
import { subscribe, DataEvents } from '../services/dataEvents';

// ============================================
// ZUSTAND STORE
// ============================================

export const useAppStore = create((set, get) => ({
  // ──────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────
  accounts: [],
  categories: { ingresos: [], gastos: [] },
  categoriesWithId: [],
  movements: [],
  dashboard: null,

  loading: {
    accounts: false,
    categories: false,
    movements: false,
    dashboard: false,
  },

  errors: {},

  // Internal flag: track which slices have been fetched at least once
  // so hooks can avoid double-fetching
  _initialized: {
    accounts: false,
    categories: false,
    movements: false,
    dashboard: false,
  },

  // ──────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────

  _setLoading: (key, value) =>
    set(state => ({ loading: { ...state.loading, [key]: value } })),

  _setError: (key, error) =>
    set(state => ({ errors: { ...state.errors, [key]: error } })),

  _clearError: (key) =>
    set(state => {
      const errors = { ...state.errors };
      delete errors[key];
      return { errors };
    }),

  _markInitialized: (key) =>
    set(state => ({ _initialized: { ...state._initialized, [key]: true } })),

  // ──────────────────────────────────────────
  // FETCH ACTIONS
  // ──────────────────────────────────────────

  fetchAccounts: async () => {
    const { _setLoading, _setError, _clearError, _markInitialized } = get();
    _setLoading('accounts', true);
    _clearError('accounts');
    try {
      const data = await getAccounts();
      set({ accounts: data.accounts || [] });
      _markInitialized('accounts');
    } catch (err) {
      _setError('accounts', err.message);
      if (err?.name !== 'AbortError') console.error('[store] Error fetching accounts:', err);
    } finally {
      _setLoading('accounts', false);
    }
  },

  fetchCategories: async () => {
    const { _setLoading, _setError, _clearError, _markInitialized } = get();
    _setLoading('categories', true);
    _clearError('categories');
    try {
      const [data, dataWithId] = await Promise.all([
        getCategories(),
        getCategoriesWithId(),
      ]);
      set({
        categories: data.categorias || { ingresos: [], gastos: [] },
        categoriesWithId: dataWithId.categorias || [],
      });
      _markInitialized('categories');
    } catch (err) {
      _setError('categories', err.message);
      if (err?.name !== 'AbortError') console.error('[store] Error fetching categories:', err);
    } finally {
      _setLoading('categories', false);
    }
  },

  fetchDashboard: async () => {
    const { _setLoading, _setError, _clearError, _markInitialized } = get();
    _setLoading('dashboard', true);
    _clearError('dashboard');
    try {
      // Process future transactions that have already reached their date
      await processFutureTransactions();

      const [dashboardData, movementsData] = await Promise.all([
        getDashboard(),
        getRecentMovements(5),
      ]);

      set({
        dashboard: dashboardData,
        movements: movementsData.movimientos || [],
      });
      _markInitialized('dashboard');
      _markInitialized('movements');
    } catch (err) {
      _setError('dashboard', err.message);
      if (err?.name !== 'AbortError') console.error('[store] Error fetching dashboard:', err);
    } finally {
      _setLoading('dashboard', false);
    }
  },

  fetchMovements: async (limit = 10) => {
    const { _setLoading, _setError, _clearError, _markInitialized } = get();
    _setLoading('movements', true);
    _clearError('movements');
    try {
      const data = await getRecentMovements(limit);
      set({ movements: data.movimientos || [] });
      _markInitialized('movements');
    } catch (err) {
      _setError('movements', err.message);
      if (err?.name !== 'AbortError') console.error('[store] Error fetching movements:', err);
    } finally {
      _setLoading('movements', false);
    }
  },

  // ──────────────────────────────────────────
  // MUTATION ACTIONS (with optimistic updates)
  // ──────────────────────────────────────────

  /**
   * Add a movement (expense or income) with optimistic UI update.
   * movementData must include { tipo: 'expense'|'income', ...rest }
   */
  addMovement: async (movementData) => {
    const optimisticId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticItem = {
      ...movementData,
      id: optimisticId,
      _optimistic: true,
    };

    // 1. Optimistic insert at the top of the list
    set(state => ({ movements: [optimisticItem, ...state.movements] }));

    try {
      let result;
      if (movementData.tipo === 'income') {
        result = await addIncome(movementData);
      } else {
        result = await addExpense(movementData);
      }

      // 2. Replace optimistic item with real data
      set(state => ({
        movements: state.movements.map(m =>
          m.id === optimisticId ? { ...result.movement, _optimistic: false } : m
        ),
      }));

      // 3. Update related slices in background (no await – fire and forget)
      get().fetchAccounts();
      get().fetchDashboard();

      return result;
    } catch (error) {
      // Rollback: remove optimistic item
      set(state => ({
        movements: state.movements.filter(m => m.id !== optimisticId),
      }));
      throw error;
    }
  },

  /**
   * Update an existing movement with optimistic UI update.
   */
  updateMovement: async (movementData) => {
    const id = movementData.id || movementData.rowIndex;

    // Snapshot the original item for rollback
    const original = get().movements.find(m => m.id === id || m.rowIndex === id);

    // 1. Optimistic update
    if (original) {
      set(state => ({
        movements: state.movements.map(m =>
          (m.id === id || m.rowIndex === id)
            ? { ...m, ...movementData, _optimistic: true }
            : m
        ),
      }));
    }

    try {
      const result = await apiUpdateMovement(movementData);

      // 2. Replace with real server data
      set(state => ({
        movements: state.movements.map(m =>
          (m.id === id || m.rowIndex === id)
            ? { ...result.movement, _optimistic: false }
            : m
        ),
      }));

      // 3. Update related slices in background
      get().fetchAccounts();
      get().fetchDashboard();

      return result;
    } catch (error) {
      // Rollback: restore original item
      if (original) {
        set(state => ({
          movements: state.movements.map(m =>
            (m.id === id || m.rowIndex === id) ? original : m
          ),
        }));
      }
      throw error;
    }
  },

  /**
   * Delete a movement with optimistic UI update.
   */
  deleteMovement: async (movement) => {
    const id = movement.id || movement.rowIndex;

    // Snapshot for rollback
    const original = get().movements.find(m => m.id === id || m.rowIndex === id);
    const originalIndex = get().movements.findIndex(m => m.id === id || m.rowIndex === id);

    // 1. Optimistic remove
    set(state => ({
      movements: state.movements.filter(m => m.id !== id && m.rowIndex !== id),
    }));

    try {
      const result = await apiDeleteMovement(movement);

      // 2. Update related slices in background
      get().fetchAccounts();
      get().fetchDashboard();

      return result;
    } catch (error) {
      // Rollback: reinsert at original position
      if (original !== undefined) {
        set(state => {
          const newMovements = [...state.movements];
          const insertAt = Math.min(originalIndex, newMovements.length);
          newMovements.splice(insertAt, 0, original);
          return { movements: newMovements };
        });
      }
      throw error;
    }
  },

  /**
   * Add a transfer with optimistic UI update.
   */
  addTransfer: async (transferData) => {
    const optimisticId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticItem = {
      ...transferData,
      id: optimisticId,
      tipo: 'transferencia',
      _optimistic: true,
    };

    // 1. Optimistic insert at the top of the list
    set(state => ({ movements: [optimisticItem, ...state.movements] }));

    try {
      const result = await apiAddTransfer(transferData);

      // 2. Replace optimistic item with real data
      set(state => ({
        movements: state.movements.map(m =>
          m.id === optimisticId ? { ...result.transfer, tipo: 'transferencia', _optimistic: false } : m
        ),
      }));

      // 3. Update related slices in background
      get().fetchAccounts();
      get().fetchDashboard();

      return result;
    } catch (error) {
      // Rollback: remove optimistic item
      set(state => ({
        movements: state.movements.filter(m => m.id !== optimisticId),
      }));
      throw error;
    }
  },

  // ──────────────────────────────────────────
  // RESET (on logout)
  // ──────────────────────────────────────────

  reset: () =>
    set({
      accounts: [],
      categories: { ingresos: [], gastos: [] },
      categoriesWithId: [],
      movements: [],
      dashboard: null,
      loading: {
        accounts: false,
        categories: false,
        movements: false,
        dashboard: false,
      },
      errors: {},
      _initialized: {
        accounts: false,
        categories: false,
        movements: false,
        dashboard: false,
      },
    }),
}));

// ============================================
// SUBSCRIBE TO DATA EVENTS
// Whenever supabaseApi invalidates cache and emits events,
// we re-fetch the affected slices in the store.
// ============================================

subscribe(DataEvents.ACCOUNTS_CHANGED, () => {
  useAppStore.getState().fetchAccounts();
});

subscribe(DataEvents.CATEGORIES_CHANGED, () => {
  useAppStore.getState().fetchCategories();
});

subscribe(DataEvents.EXPENSES_CHANGED, () => {
  useAppStore.getState().fetchAccounts();
  useAppStore.getState().fetchDashboard();
});

subscribe(DataEvents.INCOMES_CHANGED, () => {
  useAppStore.getState().fetchAccounts();
  useAppStore.getState().fetchDashboard();
});

subscribe(DataEvents.TRANSFERS_CHANGED, () => {
  useAppStore.getState().fetchAccounts();
  useAppStore.getState().fetchDashboard();
});

subscribe(DataEvents.ALL_DATA_CHANGED, () => {
  useAppStore.getState().fetchAccounts();
  useAppStore.getState().fetchCategories();
  useAppStore.getState().fetchDashboard();
});
