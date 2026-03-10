import { memo, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency, formatDate, parseLocalDate } from '../utils/format';
import DateFilterChip from './DateFilterChip';
import DatePicker from './DatePicker';
import Combobox from './Combobox';
import ConfirmModal from './ConfirmModal';
import SwipeableItem from './SwipeableItem';
import { useError } from '../contexts/ErrorContext';
import { useAuth } from '../contexts/AuthContext';
import { isImageFile, downloadAttachment } from '../services/attachmentStorage';
import { useHaptics } from '../hooks/useHaptics';
import { isEmoji, resolveIconPath } from '../services/iconStorage';
import MovementsTable from './table/MovementsTable';
import { useSavedViews } from '../hooks/useSavedViews';

// ─── FilterChip ───────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {label}
      {onRemove && (
        <button onClick={onRemove} className="ml-0.5 hover:opacity-70 transition-opacity" aria-label="Quitar filtro">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}

const MovementsList = memo(function MovementsList({
  title,
  movements,
  accounts,
  categories,
  loading,
  onMovementClick,
  onMovementDelete,
  onBulkDelete,
  onBulkUpdate,
  onAddClick,
  type, // 'gasto', 'ingreso', 'transferencia'
}) {
  const navigate = useNavigate();
  const { showError } = useError();
  const { user } = useAuth();
  const haptics = useHaptics();
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currency, setCurrency] = useState('ARS');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Popovers / saved views UI state
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [showSavedViews, setShowSavedViews] = useState(false);
  const [savingViewName, setSavingViewName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [activeViewId, setActiveViewId] = useState(null);

  // Refs for click-outside handling
  const filterPopoverRef = useRef(null);
  const savedViewsRef = useRef(null);

  // Helper to get account by name
  const getAccount = (accountName) => {
    return accounts?.find(a => a.nombre === accountName);
  };

  // Helper to check if account is USD
  const isAccountUSD = (accountName) => {
    const account = getAccount(accountName);
    return account?.moneda === 'Dólar';
  };

  // Helper to get account icon
  const getAccountIcon = (accountName) => {
    const account = getAccount(accountName);
    if (!account?.icon) return null;
    return account.icon;
  };

  // Render small account icon
  const renderAccountIcon = (accountName) => {
    const icon = getAccountIcon(accountName);
    if (!icon) return null;

    if (isEmoji(icon)) {
      return <span className="text-xs">{icon}</span>;
    }
    return (
      <img
        src={resolveIconPath(icon)}
        alt=""
        className="w-4 h-4 rounded object-cover"
      />
    );
  };

  // Track window resize for mobile detection
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close add-filter popover on click-outside
  useEffect(() => {
    if (!showAddFilter) return;
    const handler = (e) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target)) {
        setShowAddFilter(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAddFilter]);

  // Close saved-views dropdown on click-outside
  useEffect(() => {
    if (!showSavedViews) return;
    const handler = (e) => {
      if (savedViewsRef.current && !savedViewsRef.current.contains(e.target)) {
        setShowSavedViews(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSavedViews]);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkAction, setBulkAction] = useState(null); // 'delete', 'editAccount', 'editCategory', 'editDate'
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [bulkDateValue, setBulkDateValue] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Sort state - different storage key per type, namespaced by user
  const uid = user?.id || '';
  const sortStorageKey = uid ? `cashe-sort-${type}_${uid}` : `cashe-sort-${type}`;
  const filterStorageKey = uid ? `cashe-filters-${type}_${uid}` : `cashe-filters-${type}`;
  const tableColsKey = uid ? `cashe-table-cols-${type}_${uid}` : `cashe-table-cols-${type}`;

  const [sortConfig, setSortConfig] = useState({ sortBy: 'date', sortOrder: 'desc' });
  const [sortLoaded, setSortLoaded] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Saved views (Supabase — persisten entre dispositivos)
  const { views: savedViews, loading: viewsLoading, saveView, deleteView, setDefault, unsetDefault, defaultView } = useSavedViews(type, uid);

  // Auto-aplicar vista default la primera vez que carga (una sola vez)
  const defaultAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultAppliedRef.current || viewsLoading || !filtersLoaded || !defaultView) return;
    defaultAppliedRef.current = true;
    if (defaultView.filters?.dateRange) {
      setDateRange({
        from: defaultView.filters.dateRange.from ? new Date(defaultView.filters.dateRange.from) : null,
        to: defaultView.filters.dateRange.to ? new Date(defaultView.filters.dateRange.to) : null,
      });
    }
    setSelectedAccounts(defaultView.filters?.selectedAccounts || []);
    setSelectedCategories(defaultView.filters?.selectedCategories || []);
    setSearchText(defaultView.filters?.searchText || '');
    if (defaultView.sortConfig) setSortConfig(defaultView.sortConfig);
  }, [defaultView, viewsLoading, filtersLoaded]);

  // Load sort preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(sortStorageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.sortBy && parsed.sortOrder) {
          setSortConfig(parsed);
        }
      } catch (e) {
        console.error('Error parsing sort preference:', e);
      }
    }
    setSortLoaded(true);
  }, [sortStorageKey]);

  // Save sort preference to localStorage
  useEffect(() => {
    if (!sortLoaded) return;
    localStorage.setItem(sortStorageKey, JSON.stringify(sortConfig));
  }, [sortConfig, sortStorageKey, sortLoaded]);

  // Load filter preferences from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(filterStorageKey);
    let hasDateRange = false;

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.selectedAccounts) setSelectedAccounts(parsed.selectedAccounts);
        if (parsed.selectedCategories) setSelectedCategories(parsed.selectedCategories);
        if (parsed.dateRange && (parsed.dateRange.from || parsed.dateRange.to)) {
          setDateRange({
            from: parsed.dateRange.from ? new Date(parsed.dateRange.from) : null,
            to: parsed.dateRange.to ? new Date(parsed.dateRange.to) : null,
          });
          hasDateRange = true;
        }
      } catch (e) {
        console.error('Error parsing filter preference:', e);
      }
    }

    // Default to current month for gastos and ingresos if no saved date range
    if (!hasDateRange && (type === 'gasto' || type === 'ingreso')) {
      const now = new Date();
      setDateRange({
        from: startOfMonth(now),
        to: endOfMonth(now),
      });
    }

    setFiltersLoaded(true);
  }, [filterStorageKey, type]);

  // Validate stored filters against current accounts/categories (remove deleted ones)
  useEffect(() => {
    if (!filtersLoaded || accounts.length === 0) return;
    const validAccountNames = accounts.map(a => a.nombre);
    setSelectedAccounts(prev => prev.filter(name => validAccountNames.includes(name)));
  }, [accounts, filtersLoaded]);

  useEffect(() => {
    if (!filtersLoaded || categories.length === 0) return;
    const validCatValues = categories.map(cat =>
      typeof cat === 'object' ? (cat.value || cat.label) : cat
    );
    setSelectedCategories(prev => prev.filter(cat => validCatValues.includes(cat)));
  }, [categories, filtersLoaded]);

  // Save filter preferences to localStorage
  useEffect(() => {
    if (!filtersLoaded) return;
    localStorage.setItem(filterStorageKey, JSON.stringify({
      selectedAccounts,
      selectedCategories,
      dateRange,
    }));
  }, [selectedAccounts, selectedCategories, dateRange, filterStorageKey, filtersLoaded]);

  // Filter movements
  const filteredMovements = useMemo(() => {
    let filtered = [...movements];

    if (dateRange.from) {
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter(m => parseLocalDate(m.fecha) >= from);
    }
    if (dateRange.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(m => parseLocalDate(m.fecha) <= to);
    }

    if (selectedAccounts.length > 0) {
      if (type === 'transferencia') {
        filtered = filtered.filter(m =>
          selectedAccounts.includes(m.cuentaSaliente) ||
          selectedAccounts.includes(m.cuentaEntrante)
        );
      } else {
        filtered = filtered.filter(m => selectedAccounts.includes(m.cuenta));
      }
    }

    if (selectedCategories.length > 0 && type !== 'transferencia') {
      filtered = filtered.filter(m => selectedCategories.includes(m.categoria));
    }

    if (searchText.trim()) {
      const search = searchText.toLowerCase().trim();
      filtered = filtered.filter(m => {
        const nota = (m.nota || '').toLowerCase();
        const categoria = (m.categoria || '').toLowerCase();
        const cuenta = (m.cuenta || '').toLowerCase();
        const cuentaSaliente = (m.cuentaSaliente || '').toLowerCase();
        const cuentaEntrante = (m.cuentaEntrante || '').toLowerCase();
        return nota.includes(search) ||
               categoria.includes(search) ||
               cuenta.includes(search) ||
               cuentaSaliente.includes(search) ||
               cuentaEntrante.includes(search);
      });
    }

    const { sortBy, sortOrder } = sortConfig;
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = parseLocalDate(a.fecha) - parseLocalDate(b.fecha);
          if (comparison === 0) {
            const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return (cb - ca);
          }
          break;
        case 'amount':
          if (type === 'transferencia') {
            comparison = (a.montoSaliente || 0) - (b.montoSaliente || 0);
          } else {
            comparison = (a.monto || 0) - (b.monto || 0);
          }
          break;
        case 'category':
          comparison = (a.categoria || '').localeCompare(b.categoria || '');
          break;
        case 'account':
          comparison = (a.cuenta || '').localeCompare(b.cuenta || '');
          break;
        case 'accountFrom':
          comparison = (a.cuentaSaliente || '').localeCompare(b.cuentaSaliente || '');
          break;
        case 'accountTo':
          comparison = (a.cuentaEntrante || '').localeCompare(b.cuentaEntrante || '');
          break;
        default:
          comparison = 0;
      }

      return comparison * multiplier;
    });

    return filtered;
  }, [movements, dateRange, selectedAccounts, selectedCategories, searchText, type, sortConfig]);

  // Calculate subtotals
  const subtotals = useMemo(() => {
    if (type === 'transferencia') {
      if (currency === 'ARS') {
        const totalSaliente = filteredMovements.reduce((sum, m) => sum + (m.montoSaliente || 0), 0);
        const totalEntrante = filteredMovements.reduce((sum, m) => sum + (m.montoEntrante || 0), 0);
        return { totalSaliente, totalEntrante };
      } else {
        const totalSaliente = filteredMovements.reduce((sum, m) => sum + (m.montoSalienteDolares || 0), 0);
        const totalEntrante = filteredMovements.reduce((sum, m) => sum + (m.montoEntranteDolares || 0), 0);
        return { totalSaliente, totalEntrante };
      }
    } else {
      if (currency === 'ARS') {
        const total = filteredMovements.reduce((sum, m) => sum + (m.montoPesos || m.monto || 0), 0);
        return { total };
      } else {
        const total = filteredMovements.reduce((sum, m) => sum + (m.montoDolares || 0), 0);
        return { total };
      }
    }
  }, [filteredMovements, type, currency]);

  const toggleAccount = (accountName) => {
    setSelectedAccounts(prev =>
      prev.includes(accountName)
        ? prev.filter(a => a !== accountName)
        : [...prev, accountName]
    );
  };

  const toggleCategory = (categoryName) => {
    setSelectedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const clearFilters = () => {
    setDateRange({ from: null, to: null });
    setSelectedAccounts([]);
    setSelectedCategories([]);
    setSearchText('');
  };

  const handleReset = () => {
    setActiveViewId(null);
    clearFilters();
    if (type === 'gasto' || type === 'ingreso') {
      const now = new Date();
      setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
    }
  };

  // Check if date range is the default (current month) for gastos/ingresos
  const isDefaultDateRange = useMemo(() => {
    if (type !== 'gasto' && type !== 'ingreso') return false;
    if (!dateRange.from || !dateRange.to) return false;
    const now = new Date();
    const defaultFrom = startOfMonth(now);
    const defaultTo = endOfMonth(now);
    const fromDate = dateRange.from instanceof Date ? dateRange.from : new Date(dateRange.from);
    const toDate = dateRange.to instanceof Date ? dateRange.to : new Date(dateRange.to);
    return fromDate.toDateString() === defaultFrom.toDateString() &&
           toDate.toDateString() === defaultTo.toDateString();
  }, [dateRange, type]);

  const activeFiltersCount = [
    (dateRange.from || dateRange.to) && !isDefaultDateRange,
    selectedAccounts.length > 0,
    selectedCategories.length > 0,
    searchText.trim().length > 0,
  ].filter(Boolean).length;

  // Selection functions
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedItems(new Set());
  };

  const toggleItemSelection = (itemId) => {
    if (!selectionMode) setSelectionMode(true);
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
      if (newSelected.size === 0) setSelectionMode(false);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const allIds = new Set(filteredMovements.map(m => m.rowIndex || m.id));
    setSelectedItems(allIds);
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const getSelectedMovements = () => {
    return filteredMovements.filter(m => selectedItems.has(m.rowIndex || m.id));
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete) return;
    setBulkProcessing(true);
    try {
      const movementsToDelete = getSelectedMovements();
      await onBulkDelete(movementsToDelete);
      setSelectedItems(new Set());
      setSelectionMode(false);
      setBulkAction(null);
    } catch (err) {
      console.error('Error in bulk delete:', err);
      showError('No se pudieron eliminar los movimientos', err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkUpdate = async () => {
    let field, value;
    if (bulkAction === 'editAccount') {
      field = 'cuenta';
      value = bulkEditValue;
    } else if (bulkAction === 'editCategory') {
      field = 'categoria';
      value = bulkEditValue;
    } else if (bulkAction === 'editDate') {
      field = 'fecha';
      value = bulkDateValue;
    } else {
      return;
    }

    if (!onBulkUpdate || !value) return;

    setBulkProcessing(true);
    try {
      const movementsToUpdate = getSelectedMovements();
      await onBulkUpdate(movementsToUpdate, field, value);
      setSelectedItems(new Set());
      setSelectionMode(false);
      setBulkAction(null);
      setBulkEditValue('');
      setBulkDateValue('');
    } catch (err) {
      console.error('Error in bulk update:', err);
      showError('No se pudieron actualizar los movimientos', err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'ingreso': return 'var(--accent-green)';
      case 'gasto': return 'var(--accent-red)';
      case 'transferencia': return 'var(--accent-blue)';
      default: return 'var(--accent-primary)';
    }
  };

  const getTypeBgDim = () => {
    switch (type) {
      case 'ingreso': return 'rgba(34, 197, 94, 0.15)';
      case 'gasto': return 'rgba(239, 68, 68, 0.15)';
      case 'transferencia': return 'rgba(59, 130, 246, 0.15)';
      default: return 'rgba(96, 165, 250, 0.15)';
    }
  };

  const handleDeleteClick = (e, movement) => {
    e.stopPropagation();
    setDeleteConfirm(movement);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onMovementDelete?.(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  // Apply a saved view
  const applyView = (view) => {
    const { filters, sortConfig: sc } = view;
    if (filters.dateRange) {
      setDateRange({
        from: filters.dateRange.from ? new Date(filters.dateRange.from) : null,
        to: filters.dateRange.to ? new Date(filters.dateRange.to) : null,
      });
    }
    setSelectedAccounts(filters.selectedAccounts || []);
    setSelectedCategories(filters.selectedCategories || []);
    setSearchText(filters.searchText || '');
    if (sc) setSortConfig(sc);
    setActiveViewId(view.id);
    setShowSavedViews(false);
  };

  // Save current view
  const handleSaveView = () => {
    if (!savingViewName.trim()) return;
    saveView(savingViewName.trim(), {
      dateRange: {
        from: dateRange.from ? (dateRange.from instanceof Date ? dateRange.from.toISOString() : dateRange.from) : null,
        to: dateRange.to ? (dateRange.to instanceof Date ? dateRange.to.toISOString() : dateRange.to) : null,
      },
      selectedAccounts,
      selectedCategories,
      searchText,
    }, sortConfig);
    setSavingViewName('');
    setShowSaveInput(false);
  };

  // Skeleton loading
  const renderSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-28 skeleton" />
              <div className="h-3 w-40 skeleton" />
            </div>
            <div className="text-right space-y-2">
              <div className="h-5 w-24 skeleton ml-auto" />
              <div className="h-3 w-16 skeleton ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state
  const renderEmptyState = () => (
    <div
      className="rounded-2xl p-8 text-center"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div
        className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: getTypeBgDim() }}
      >
        {type === 'transferencia' ? (
          <svg className="w-10 h-10" style={{ color: getTypeColor() }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        ) : type === 'ingreso' ? (
          <svg className="w-10 h-10" style={{ color: getTypeColor() }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        ) : (
          <svg className="w-10 h-10" style={{ color: getTypeColor() }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
        Sin {type === 'transferencia' ? 'transferencias' : type === 'ingreso' ? 'ingresos' : 'gastos'}
      </h3>
      <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        {activeFiltersCount > 0
          ? 'No se encontraron movimientos con los filtros seleccionados'
          : `Aun no has registrado ningun ${type === 'transferencia' ? 'a' : ''} ${type}`}
      </p>
      <button
        onClick={() => onAddClick ? onAddClick() : navigate('/nuevo')}
        className="px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90"
        style={{ backgroundColor: getTypeColor() }}
      >
        Agregar {type === 'transferencia' ? 'transferencia' : type}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-24 skeleton" />
          <div className="h-8 w-32 skeleton" />
        </div>
        {renderSkeleton()}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Selection Mode Bar ── */}
      {selectionMode && (
        <div
          className="sticky top-14 z-40 rounded-2xl p-3 animate-fade-in"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)' }}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {selectedItems.size} seleccionado{selectedItems.size !== 1 ? 's' : ''}
              </span>
              <button
                onClick={selectedItems.size === filteredMovements.length ? deselectAll : selectAll}
                className="text-xs px-2 py-1 min-h-[44px] rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}
              >
                {selectedItems.size === filteredMovements.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {selectedItems.size > 0 && (
                <>
                  <button
                    onClick={() => setBulkAction('delete')}
                    className="flex items-center gap-1 px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-medium transition-colors"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>

                  <button
                    onClick={() => setBulkAction('editAccount')}
                    className="flex items-center gap-1 px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-medium transition-colors"
                    style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)', color: 'var(--accent-blue)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Cuenta
                  </button>

                  {type !== 'transferencia' && (
                    <button
                      onClick={() => setBulkAction('editCategory')}
                      className="flex items-center gap-1 px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-medium transition-colors"
                      style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)', color: 'var(--accent-primary)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Categoría
                    </button>
                  )}

                  <button
                    onClick={() => setBulkAction('editDate')}
                    className="flex items-center gap-1 px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-medium transition-colors"
                    style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Fecha
                  </button>
                </>
              )}

              <button
                onClick={toggleSelectionMode}
                className="px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header row ── */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink min-w-0">
          {/* Add button */}
          {!selectionMode && (
            <button
              onClick={() => onAddClick ? onAddClick() : navigate('/nuevo')}
              className="p-2 rounded-xl transition-colors"
              style={{ backgroundColor: getTypeColor(), color: 'white' }}
              title={`Agregar ${type === 'transferencia' ? 'transferencia' : type}`}
              aria-label={`Agregar ${type === 'transferencia' ? 'transferencia' : type}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}

          {/* Selection mode toggle */}
          {!selectionMode && filteredMovements.length > 0 && (
            <button
              onClick={toggleSelectionMode}
              className="p-2 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              title="Selección múltiple"
              aria-label="Selección múltiple"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h7M4 12h7m-7 7h7m5-14v14m0-14l3 3m-3-3l-3 3m3 11l3-3m-3 3l-3-3" />
              </svg>
            </button>
          )}

          {/* Currency Selector - desktop */}
          <div
            className="hidden sm:inline-flex rounded-xl p-1"
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
        </div>
      </div>

      {/* ── Currency Selector - mobile ── */}
      <div className="sm:hidden">
        <div
          className="flex w-full p-1 rounded-lg"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <button
            onClick={() => setCurrency('ARS')}
            className="flex-1 py-2 rounded-md text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: currency === 'ARS' ? 'var(--bg-elevated)' : 'transparent',
              color: currency === 'ARS' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-4 h-4 rounded-sm" />
            Pesos (ARS)
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className="flex-1 py-2 rounded-md text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: currency === 'USD' ? 'var(--bg-elevated)' : 'transparent',
              color: currency === 'USD' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-4 h-4 rounded-sm" />
            Dólares (USD)
          </button>
        </div>
      </div>

      {/* ── Filter chips bar ── */}
      <div className="flex items-start gap-2 flex-wrap">
        {/* Left: chips + date picker + add filter */}
        <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
          {/* Date filter chip (always shown) */}
          <DateFilterChip
            value={dateRange}
            onChange={setDateRange}
            accentColor={getTypeColor()}
          />

          {/* Account filter chips */}
          {selectedAccounts.map(acc => (
            <FilterChip key={acc} label={acc} onRemove={() => toggleAccount(acc)} />
          ))}

          {/* Category filter chips */}
          {selectedCategories.map(cat => (
            <FilterChip key={cat} label={cat} onRemove={() => toggleCategory(cat)} />
          ))}

          {/* Search chip */}
          {searchText && (
            <FilterChip label={`"${searchText}"`} onRemove={() => setSearchText('')} />
          )}

          {/* Add filter popover */}
          <div className="relative" ref={filterPopoverRef}>
            <button
              onClick={() => setShowAddFilter(!showAddFilter)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: showAddFilter ? getTypeBgDim() : 'var(--bg-tertiary)',
                color: showAddFilter ? getTypeColor() : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Filtrar
              {activeFiltersCount > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: getTypeColor() }}
                >
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {showAddFilter && (
              <div
                className="absolute left-0 top-full mt-2 z-50 w-80 rounded-2xl p-4 space-y-4 shadow-xl"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Search */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Buscar
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--text-secondary)' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      placeholder={type === 'transferencia' ? 'Buscar por cuenta...' : 'Buscar por nota, categoría, cuenta...'}
                      className="w-full pl-10 pr-4 py-2 rounded-xl text-sm"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                {/* Accounts */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Cuentas</label>
                    <button
                      onClick={() => {
                        const allAccountNames = accounts.map(a => a.nombre);
                        setSelectedAccounts(selectedAccounts.length === accounts.length ? [] : allAccountNames);
                      }}
                      className="text-xs font-medium transition-colors hover:opacity-80"
                      style={{ color: getTypeColor() }}
                    >
                      {selectedAccounts.length === accounts.length ? 'Ninguna' : 'Todas'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {accounts.map(account => (
                      <button
                        key={account.nombre}
                        onClick={() => toggleAccount(account.nombre)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                        style={{
                          backgroundColor: selectedAccounts.includes(account.nombre) ? getTypeColor() : 'var(--bg-tertiary)',
                          color: selectedAccounts.includes(account.nombre) ? 'white' : 'var(--text-secondary)',
                        }}
                      >
                        {account.nombre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                {type !== 'transferencia' && categories.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Categorías</label>
                      <button
                        onClick={() => {
                          const allCatValues = categories.map(cat => typeof cat === 'object' ? (cat.value || cat.label) : cat);
                          setSelectedCategories(selectedCategories.length === categories.length ? [] : allCatValues);
                        }}
                        className="text-xs font-medium transition-colors hover:opacity-80"
                        style={{ color: getTypeColor() }}
                      >
                        {selectedCategories.length === categories.length ? 'Ninguna' : 'Todas'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                      {categories.map((cat, index) => {
                        const catValue = typeof cat === 'object' ? (cat.value || cat.label) : cat;
                        const catLabel = typeof cat === 'object' ? (cat.label || cat.value) : cat;
                        return (
                          <button
                            key={catValue || `cat-${index}`}
                            onClick={() => toggleCategory(catValue)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200"
                            style={{
                              backgroundColor: selectedCategories.includes(catValue) ? getTypeColor() : 'var(--bg-tertiary)',
                              color: selectedCategories.includes(catValue) ? 'white' : 'var(--text-secondary)',
                            }}
                          >
                            {catLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => { handleReset(); setShowAddFilter(false); }}
                    className="text-xs font-medium transition-colors hover:opacity-80"
                    style={{ color: getTypeColor() }}
                  >
                    Restablecer filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: saved views + reset */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Saved views dropdown */}
          <div className="relative" ref={savedViewsRef}>
            <button
              onClick={() => setShowSavedViews(!showSavedViews)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: showSavedViews ? getTypeBgDim() : 'var(--bg-tertiary)',
                color: showSavedViews ? getTypeColor() : 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
              title="Vistas guardadas"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              <span className="hidden sm:inline">Vistas</span>
              {savedViews.length > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: getTypeColor() }}
                >
                  {savedViews.length}
                </span>
              )}
            </button>

            {showSavedViews && (
              <div
                className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl p-3 shadow-xl"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <p className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--text-secondary)' }}>
                  Vistas guardadas
                </p>

                {viewsLoading ? (
                  <p className="text-xs px-1 py-2" style={{ color: 'var(--text-muted)' }}>Cargando...</p>
                ) : savedViews.length === 0 ? (
                  <p className="text-xs px-1 py-2" style={{ color: 'var(--text-muted)' }}>
                    No hay vistas guardadas todavía.
                  </p>
                ) : (
                  <div className="space-y-1 mb-3">
                    {savedViews.map(view => (
                      <div key={view.id} className="flex items-center gap-1">
                        {/* Estrella: marcar como default */}
                        <button
                          onClick={() => view.isDefault ? unsetDefault(view.id) : setDefault(view.id)}
                          className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                          style={{ color: view.isDefault ? '#f59e0b' : 'var(--text-secondary)' }}
                          title={view.isDefault ? 'Quitar vista predeterminada' : 'Marcar como predeterminada'}
                        >
                          <svg className="w-3.5 h-3.5" fill={view.isDefault ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                        </button>
                        {/* Nombre: click para aplicar */}
                        <button
                          onClick={() => applyView(view)}
                          className="flex-1 text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                          style={{
                            backgroundColor: view.isDefault ? getTypeBgDim() : 'var(--bg-tertiary)',
                            color: view.isDefault ? getTypeColor() : 'var(--text-primary)',
                          }}
                        >
                          {view.name}
                          {view.isDefault && <span className="ml-1 opacity-60 text-[10px]">predeterminada</span>}
                        </button>
                        {/* Eliminar */}
                        <button
                          onClick={() => deleteView(view.id)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20 flex-shrink-0"
                          style={{ color: 'var(--text-secondary)' }}
                          title="Eliminar vista"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save current view */}
                {showSaveInput ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      value={savingViewName}
                      onChange={(e) => setSavingViewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveView(); if (e.key === 'Escape') setShowSaveInput(false); }}
                      placeholder="Nombre de la vista..."
                      autoFocus
                      className="flex-1 px-2.5 py-1.5 rounded-lg text-xs"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    />
                    <button
                      onClick={handleSaveView}
                      disabled={!savingViewName.trim()}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40"
                      style={{ backgroundColor: getTypeColor() }}
                    >
                      OK
                    </button>
                    <button
                      onClick={() => setShowSaveInput(false)}
                      className="px-2 py-1.5 rounded-lg text-xs transition-colors"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSaveInput(true)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left"
                    style={{ backgroundColor: getTypeBgDim(), color: getTypeColor() }}
                  >
                    + Guardar vista actual
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Reset button */}
          {(activeFiltersCount > 0) && (
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
              title="Restablecer filtros"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline">Restablecer</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Saved views tabs ── */}
      {savedViews.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {savedViews.map(view => (
            <button
              key={view.id}
              onClick={() => applyView(view)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0"
              style={{
                backgroundColor: activeViewId === view.id ? getTypeBgDim() : 'var(--bg-tertiary)',
                color: activeViewId === view.id ? getTypeColor() : 'var(--text-secondary)',
                border: `1px solid ${activeViewId === view.id ? getTypeColor() : 'var(--border-subtle)'}`,
              }}
            >
              {view.isDefault && (
                <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              )}
              {view.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Stats summary ── */}
      <div className="flex items-center gap-3 py-1 text-sm flex-wrap">
        <span style={{ color: 'var(--text-secondary)' }}>
          {filteredMovements.length} {type === 'transferencia' ? 'transferencia' : 'movimiento'}{filteredMovements.length !== 1 ? 's' : ''}
        </span>
        {type !== 'transferencia' ? (
          <span className="font-semibold" style={{ color: getTypeColor() }}>
            {formatCurrency(subtotals.total, currency)}
          </span>
        ) : (
          <>
            <span className="font-semibold" style={{ color: 'var(--accent-red)' }}>
              ↓ {formatCurrency(subtotals.totalSaliente, currency)}
            </span>
            <span className="font-semibold" style={{ color: 'var(--accent-green)' }}>
              ↑ {formatCurrency(subtotals.totalEntrante, currency)}
            </span>
          </>
        )}
      </div>

      {/* ── Content ── */}
      {filteredMovements.length === 0 ? (
        renderEmptyState()
      ) : !isMobile ? (
        /* Desktop: always show MovementsTable */
        <MovementsTable
          movements={filteredMovements}
          type={type}
          accounts={accounts}
          sortConfig={sortConfig}
          onSortChange={setSortConfig}
          selectionMode={selectionMode}
          selectedItems={selectedItems}
          onToggleSelect={toggleItemSelection}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onMovementClick={onMovementClick}
          onDeleteClick={handleDeleteClick}
          getTypeColor={getTypeColor}
          getTypeBgDim={getTypeBgDim}
          isAccountUSD={isAccountUSD}
          storageKey={tableColsKey}
        />
      ) : (
        /* Mobile: cards */
        <div className="space-y-2">
          {filteredMovements.map((movement) => {
            const itemId = movement.rowIndex || movement.id;
            const isSelected = selectedItems.has(itemId);

            const movementContent = (
              <div
                className="group rounded-2xl p-4 transition-all duration-200"
                style={{
                  backgroundColor: isSelected ? getTypeBgDim() : 'var(--bg-secondary)',
                  border: isSelected ? `1px solid ${getTypeColor()}` : '1px solid transparent',
                }}
              >
                <div className="flex items-center gap-3">
                  {selectionMode && (
                    <button
                      onClick={() => toggleItemSelection(itemId)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
                      style={{
                        backgroundColor: isSelected ? getTypeColor() : 'var(--bg-tertiary)',
                        border: isSelected ? 'none' : '2px solid var(--border-subtle)',
                      }}
                    >
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => selectionMode ? toggleItemSelection(itemId) : onMovementClick?.(movement)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    style={{ backgroundColor: 'transparent' }}
                  >
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: getTypeBgDim() }}
                    >
                      {type === 'transferencia' ? (
                        <svg className="w-6 h-6" style={{ color: getTypeColor() }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      ) : type === 'ingreso' ? (
                        <svg className="w-6 h-6" style={{ color: getTypeColor() }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6" style={{ color: getTypeColor() }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {type === 'transferencia' ? 'Transferencia' : movement.categoria || '-'}
                        </p>
                        {movement.isFuture && (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1"
                            style={{ backgroundColor: 'var(--accent-yellow-dim)', color: 'var(--accent-yellow)' }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Futuro
                          </span>
                        )}
                        {movement.isRecurring && (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1"
                            style={{ backgroundColor: 'var(--accent-purple-dim)', color: 'var(--accent-purple)' }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Recurrente
                          </span>
                        )}
                        {movement.cuota && (
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-medium flex items-center gap-1"
                            style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)', color: 'var(--accent-primary)' }}
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            {movement.cuota}
                          </span>
                        )}
                      </div>
                      <p className="text-xs truncate flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                        {type === 'transferencia' ? (
                          <>
                            {renderAccountIcon(movement.cuentaSaliente)}
                            <span>{movement.cuentaSaliente}</span>
                            <span>→</span>
                            {renderAccountIcon(movement.cuentaEntrante)}
                            <span>{movement.cuentaEntrante}</span>
                          </>
                        ) : (
                          <>
                            {renderAccountIcon(movement.cuenta)}
                            <span>{movement.cuenta}</span>
                          </>
                        )}
                      </p>
                      {movement.nota && (
                        <p className="text-xs truncate mt-0.5 italic" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                          &quot;{movement.nota}&quot;
                        </p>
                      )}
                    </div>

                    {/* Amount and date */}
                    <div className="text-right flex-shrink-0 max-w-[45%] sm:max-w-none">
                      {(() => {
                        const accountName = type === 'transferencia' ? movement.cuentaSaliente : movement.cuenta;
                        const isUSD = isAccountUSD(accountName);
                        const currencyCode = isUSD ? 'USD' : 'ARS';
                        const amount = movement.monto || movement.montoSaliente;
                        return (
                          <div className="flex items-center justify-end gap-1">
                            <img
                              src={`${import.meta.env.BASE_URL}icons/catalog/${currencyCode}.svg`}
                              alt={currencyCode}
                              className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                            />
                            <p className="text-[15px] font-bold truncate" style={{ color: getTypeColor() }}>
                              {type === 'ingreso' ? '+' : type === 'gasto' ? '-' : ''}{formatCurrency(amount, currencyCode)}
                            </p>
                          </div>
                        );
                      })()}
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(movement.fecha, 'short')}
                      </p>
                    </div>
                  </button>

                  {/* Attachment indicator */}
                  {(movement.attachmentUrl || movement.attachmentUrl2) && !selectionMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadAttachment(movement.attachmentUrl || movement.attachmentUrl2, movement.attachmentName || movement.attachmentName2);
                      }}
                      className="p-2 rounded-xl flex-shrink-0 transition-all hover:scale-105 relative"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                      title={movement.attachmentUrl && movement.attachmentUrl2 ? '2 adjuntos' : (movement.attachmentName || movement.attachmentName2 || 'Descargar adjunto')}
                    >
                      {isImageFile(movement.attachmentName || movement.attachmentName2) ? (
                        <img
                          src={movement.attachmentUrl || movement.attachmentUrl2}
                          alt="Adjunto"
                          className="w-6 h-6 rounded object-cover"
                        />
                      ) : (
                        <svg
                          className="w-4 h-4"
                          style={{ color: 'var(--accent-primary)' }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      )}
                      {movement.attachmentUrl && movement.attachmentUrl2 && (
                        <span
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
                          style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                        >
                          2
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );

            // Wrap with SwipeableItem on mobile for swipe-to-delete
            return !selectionMode ? (
              <SwipeableItem
                key={itemId}
                onDelete={() => {
                  haptics.warning();
                  setDeleteConfirm(movement);
                }}
                onEdit={() => onMovementClick?.(movement)}
              >
                {movementContent}
              </SwipeableItem>
            ) : (
              <div key={itemId}>
                {movementContent}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="text-center">
              <div
                className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
              >
                <svg className="w-7 h-7" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Eliminar movimiento
              </h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                ¿Estas seguro de que quieres eliminar este movimiento?
                <br />
                <span className="font-semibold text-base" style={{ color: getTypeColor() }}>
                  {type === 'transferencia'
                    ? formatCurrency(
                        currency === 'ARS'
                          ? deleteConfirm.montoSaliente
                          : (deleteConfirm.montoSalienteDolares || 0),
                        currency
                      )
                    : formatCurrency(
                        currency === 'ARS'
                          ? (deleteConfirm.montoPesos || deleteConfirm.monto)
                          : (deleteConfirm.montoDolares || 0),
                        currency
                      )}
                </span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-xl font-medium text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent-red)' }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Modal ── */}
      {bulkAction === 'delete' && (
        <ConfirmModal
          isOpen={true}
          title="Eliminar movimientos"
          message={`¿Estás seguro de que quieres eliminar ${selectedItems.size} movimiento${selectedItems.size !== 1 ? 's' : ''}? Esta acción no se puede deshacer.`}
          confirmText={bulkProcessing ? 'Eliminando...' : 'Eliminar todos'}
          variant="danger"
          loading={bulkProcessing}
          onConfirm={handleBulkDelete}
          onClose={() => setBulkAction(null)}
        />
      )}

      {/* ── Bulk Edit Account Modal ── */}
      {bulkAction === 'editAccount' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setBulkAction(null); setBulkEditValue(''); }}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Cambiar cuenta
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Cambiar la cuenta de {selectedItems.size} movimiento{selectedItems.size !== 1 ? 's' : ''}
            </p>
            <div className="mb-4">
              <Combobox
                value={bulkEditValue}
                onChange={(e) => setBulkEditValue(e.target.value)}
                options={accounts.map(a => ({ value: a.nombre, label: a.nombre }))}
                placeholder="Seleccionar cuenta..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setBulkAction(null); setBulkEditValue(''); }}
                className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={bulkProcessing || !bulkEditValue}
                className="flex-1 py-3 rounded-xl font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-blue)' }}
              >
                {bulkProcessing ? 'Actualizando...' : 'Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Edit Category Modal ── */}
      {bulkAction === 'editCategory' && (
        <div className="fixed inset-0 z-[130] flex items-start justify-center p-4 pt-20">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setBulkAction(null); setBulkEditValue(''); }}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Cambiar categoría
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Cambiar la categoría de {selectedItems.size} movimiento{selectedItems.size !== 1 ? 's' : ''}
            </p>
            <div className="mb-4">
              <Combobox
                value={bulkEditValue}
                onChange={(e) => setBulkEditValue(e.target.value)}
                options={categories.map(c => {
                  const catValue = typeof c === 'object' ? (c.value || c.label) : c;
                  const catLabel = typeof c === 'object' ? (c.label || c.value) : c;
                  const catIcon = typeof c === 'object' ? c.icon : null;
                  return { value: catValue, label: catLabel, icon: catIcon };
                })}
                placeholder="Seleccionar categoría..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setBulkAction(null); setBulkEditValue(''); }}
                className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={bulkProcessing || !bulkEditValue}
                className="flex-1 py-3 rounded-xl font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                {bulkProcessing ? 'Actualizando...' : 'Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Edit Date Modal ── */}
      {bulkAction === 'editDate' && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => { setBulkAction(null); setBulkDateValue(''); }}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Cambiar fecha
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Cambiar la fecha de {selectedItems.size} movimiento{selectedItems.size !== 1 ? 's' : ''}
            </p>
            <div className="mb-4">
              <DatePicker
                value={bulkDateValue}
                onChange={(e) => setBulkDateValue(e.target.value)}
                name="bulkDate"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setBulkAction(null); setBulkDateValue(''); }}
                className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={bulkProcessing || !bulkDateValue}
                className="flex-1 py-3 rounded-xl font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-purple, #a855f7)' }}
              >
                {bulkProcessing ? 'Actualizando...' : 'Aplicar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default MovementsList;
