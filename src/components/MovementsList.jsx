import { memo, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency, formatDate, parseLocalDate } from '../utils/format';
import { getExchangeRate } from '../services/supabaseApi';
import DateFilterChip from './DateFilterChip';
import DatePicker from './DatePicker';
import Combobox from './Combobox';
import ConfirmModal from './ConfirmModal';
import { useError } from '../contexts/ErrorContext';
import { useAuth } from '../contexts/AuthContext';
import { isImageFile, downloadAttachment } from '../services/attachmentStorage';
import { isEmoji, resolveIconPath } from '../services/iconStorage';
import MovementsTable from './table/MovementsTable';
import { useSavedViews } from '../hooks/useSavedViews';
import { useViewPreferences } from '../hooks/useViewPreferences';
import { useDebounce } from '../hooks/useDebounce';

// ─── ViewTab ──────────────────────────────────────────────────────────────────
const ICON_EDIT = (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const ICON_STAR = (filled) => (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);
const ICON_TRASH = (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const TABLE_ICON = (
  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
  </svg>
);

// Renders context menu via portal, auto-clamped to viewport
function ContextMenuPortal({ x, y, onClose, children }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState({ top: y + 4, left: x + 4 });

  // Clamp position to viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const { offsetWidth: w, offsetHeight: h } = menuRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      top: Math.min(y + 4, vh - h - 8),
      left: Math.min(x + 4, vw - w - 8),
    });
  }, [x, y]);

  // Auto-focus first menuitem on mount
  useEffect(() => {
    const first = menuRef.current?.querySelector('[role="menuitem"]');
    first?.focus();
  }, []);

  // Keyboard navigation: Arrow keys, Escape, Tab
  const handleKeyDown = (e) => {
    const items = [...(menuRef.current?.querySelectorAll('[role="menuitem"]') || [])];
    const idx = items.indexOf(document.activeElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      onClose?.();
    }
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label="Opciones de vista"
      className="fixed z-[250] rounded-xl shadow-2xl py-1 min-w-[180px] outline-none"
      style={{
        top: pos.top,
        left: pos.left,
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>,
    document.body
  );
}

function ViewTab({
  label, isActive, isRenaming, renameValue,
  accentColor, onClick, onDoubleClick, onContextMenu,
  onRenameChange, onRenameCommit, onRenameCancel,
}) {
  if (isRenaming) {
    return (
      <div className="flex items-center px-2 py-1.5 flex-shrink-0" style={{ marginBottom: '-1px' }}>
        <input
          type="text"
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameCommit(renameValue);
            if (e.key === 'Escape') onRenameCancel();
          }}
          onBlur={() => onRenameCommit(renameValue)}
          autoFocus
          className="w-28 px-2 py-0.5 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: `1px solid ${accentColor}` }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors rounded-t-lg"
        style={{
          color: isActive ? accentColor : 'var(--text-secondary)',
          borderBottom: `2px solid ${isActive ? accentColor : 'transparent'}`,
          marginBottom: '-1px',
          backgroundColor: 'transparent',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {TABLE_ICON}
        {label}
      </button>
    </div>
  );
}

// ─── FilterChip ───────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
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
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchText, setSearchText] = useState('');
  // Debounce search to avoid re-filtering on every keystroke
  const debouncedSearch = useDebounce(searchText, 250);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Exchange rate for equivalente column
  const [tipoCambio, setTipoCambio] = useState(1000);
  useEffect(() => {
    getExchangeRate().then(data => setTipoCambio(data.tipoCambio || 1000)).catch(() => {});
  }, []);

  // Popovers / saved views UI state
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [showDateFormatMenu, setShowDateFormatMenu] = useState(false);
  const [dateFormat, setDateFormat] = useState('short'); // 'short' | 'full' | 'medium' | 'slash' | 'relative'
  const [savingViewName, setSavingViewName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [activeViewId, setActiveViewId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { x, y, tabId, viewId, isDefaultTab }
  const [renamingViewId, setRenamingViewId] = useState(null); // id of view being renamed inline
  const [renameInputValue, setRenameInputValue] = useState('');

  // Per-tab filter/sort state memory (in-memory, survives tab switches)
  const viewStatesRef = useRef({});

  // Refs for click-outside handling
  const filterPopoverRef = useRef(null);
  const dateFormatMenuRef = useRef(null);

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
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

  // Close date format menu on click-outside
  useEffect(() => {
    if (!showDateFormatMenu) return;
    const handler = (e) => {
      if (dateFormatMenuRef.current && !dateFormatMenuRef.current.contains(e.target)) {
        setShowDateFormatMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDateFormatMenu]);

  // Close context menu on any click
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => setContextMenu(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu]);

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkAction, setBulkAction] = useState(null); // 'delete', 'editAccount', 'editCategory', 'editDate'
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [bulkDateValue, setBulkDateValue] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Namespace por usuario para columnas de tabla (localStorage, solo visual)
  const uid = user?.id || '';
  const tableColsKey = uid ? `cashe-table-cols-${type}_${uid}` : `cashe-table-cols-${type}`;

  const [sortConfig, setSortConfig] = useState({ sortBy: 'date', sortOrder: 'desc' });
  const [sortLoaded, setSortLoaded] = useState(false);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Preferencias de vista persistidas en Supabase (cross-device)
  const { prefs: savedPrefs, loaded: prefsLoaded, savePrefs } = useViewPreferences(type, uid);

  // Saved views (Supabase — vistas manuales guardadas por el usuario)
  const { views: savedViews, loading: viewsLoading, saveView, deleteView, setDefault, unsetDefault, renameView, defaultView } = useSavedViews(type, uid);

  // Aplicar preferencias guardadas automáticamente (una sola vez al cargar)
  const prefsAppliedRef = useRef(false);
  useEffect(() => {
    if (prefsAppliedRef.current || !prefsLoaded) return;
    prefsAppliedRef.current = true;

    if (savedPrefs) {
      if (savedPrefs.dateFormat) setDateFormat(savedPrefs.dateFormat);
      if (savedPrefs.sortConfig?.sortBy) setSortConfig(savedPrefs.sortConfig);
      if (savedPrefs.filters?.selectedAccounts?.length) setSelectedAccounts(savedPrefs.filters.selectedAccounts);
      if (savedPrefs.filters?.selectedCategories?.length) setSelectedCategories(savedPrefs.filters.selectedCategories);
      const dr = savedPrefs.filters?.dateRange;
      if (dr?.from || dr?.to) {
        setDateRange({
          from: dr.from ? new Date(dr.from) : null,
          to: dr.to ? new Date(dr.to) : null,
        });
      } else if (type === 'gasto' || type === 'ingreso') {
        const now = new Date();
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
      }
    } else {
      // Sin prefs guardadas: usar mes actual para gastos/ingresos
      if (type === 'gasto' || type === 'ingreso') {
        const now = new Date();
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
      }
    }

    setFiltersLoaded(true);
    setSortLoaded(true);
  }, [prefsLoaded, savedPrefs, type]);

  // Auto-aplicar vista default manual solo si no hay auto-prefs guardadas
  const defaultAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultAppliedRef.current || viewsLoading || !filtersLoaded || !defaultView) return;
    // Las auto-prefs tienen prioridad: si ya existen, no pisar con la vista default
    if (savedPrefs !== null) return;
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
  }, [defaultView, viewsLoading, filtersLoaded, savedPrefs]);

  // Guardar preferencias automáticamente en Supabase cuando cambia algo
  useEffect(() => {
    if (!filtersLoaded || !sortLoaded) return;
    savePrefs({
      filters: { selectedAccounts, selectedCategories, dateRange },
      sortConfig,
      dateFormat,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccounts, selectedCategories, dateRange, sortConfig, dateFormat, filtersLoaded, sortLoaded]);

  // Validar filtros guardados contra cuentas/categorías actuales (quitar eliminadas)
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

    if (debouncedSearch.trim()) {
      const search = debouncedSearch.toLowerCase().trim();
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
  }, [movements, dateRange, selectedAccounts, selectedCategories, debouncedSearch, type, sortConfig]);

  // Calculate subtotals
  const subtotals = useMemo(() => {
    if (type === 'transferencia') {
      const totalSalienteARS = filteredMovements.reduce((sum, m) => sum + (m.montoSaliente || 0), 0);
      const totalEntranteARS = filteredMovements.reduce((sum, m) => sum + (m.montoEntrante || 0), 0);
      return { totalSalienteARS, totalEntranteARS };
    } else {
      const nativeARS = filteredMovements.reduce((sum, m) =>
        m.monedaOriginal !== 'USD' ? sum + (m.monto || 0) : sum, 0);
      const nativeUSD = filteredMovements.reduce((sum, m) =>
        m.monedaOriginal === 'USD' ? sum + (m.monto || 0) : sum, 0);
      const tc = tipoCambio || 1000;
      // Grand totals: native + converted equivalent
      const totalEnARS = nativeARS + nativeUSD * tc;
      const totalEnUSD = nativeUSD + nativeARS / tc;
      return { nativeARS, nativeUSD, totalEnARS, totalEnUSD };
    }
  }, [filteredMovements, type, tipoCambio]);

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

  const getDefaultFilters = useCallback(() => {
    const now = new Date();
    return {
      dateRange: (type === 'gasto' || type === 'ingreso')
        ? { from: startOfMonth(now), to: endOfMonth(now) }
        : { from: null, to: null },
      selectedAccounts: [],
      selectedCategories: [],
      searchText: '',
      sortConfig: { sortBy: 'date', sortOrder: 'desc' },
      dateFormat: 'short',
    };
  }, [type]);

  const applyFilters = useCallback((s) => {
    setDateRange(s.dateRange);
    setSelectedAccounts(s.selectedAccounts);
    setSelectedCategories(s.selectedCategories);
    setSearchText(s.searchText);
    setSortConfig(s.sortConfig);
    if (s.dateFormat) setDateFormat(s.dateFormat);
  }, []);

  // Switch tab: saves current state, restores target tab state
  const switchTab = useCallback((newViewId, view = null) => {
    // Save current tab state
    const currentKey = activeViewId === null ? '__default' : activeViewId;
    viewStatesRef.current[currentKey] = {
      dateRange, selectedAccounts, selectedCategories, searchText, sortConfig, dateFormat,
    };

    const newKey = newViewId === null ? '__default' : newViewId;

    if (viewStatesRef.current[newKey]) {
      // Restore previously remembered state
      applyFilters(viewStatesRef.current[newKey]);
    } else if (view) {
      // First visit to this saved view — apply its DB filters
      const { filters, sortConfig: sc } = view;
      applyFilters({
        dateRange: {
          from: filters.dateRange?.from ? new Date(filters.dateRange.from) : null,
          to: filters.dateRange?.to ? new Date(filters.dateRange.to) : null,
        },
        selectedAccounts: filters.selectedAccounts || [],
        selectedCategories: filters.selectedCategories || [],
        searchText: filters.searchText || '',
        sortConfig: sc || { sortBy: 'date', sortOrder: 'desc' },
        dateFormat: filters.dateFormat || 'short',
      });
    } else {
      // First visit to Tabla — use defaults
      applyFilters(getDefaultFilters());
    }

    setActiveViewId(newViewId);
  }, [activeViewId, dateRange, selectedAccounts, selectedCategories, searchText, sortConfig, dateFormat, applyFilters, getDefaultFilters]);

  // Reset current tab filters (button in filter bar)
  const handleReset = useCallback(() => {
    const defaults = getDefaultFilters();
    applyFilters(defaults);
    // Also clear cached state for current tab so it's fresh next time
    const currentKey = activeViewId === null ? '__default' : activeViewId;
    viewStatesRef.current[currentKey] = defaults;
  }, [activeViewId, applyFilters, getDefaultFilters]);

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
      case 'ingreso': return 'var(--accent-green-dim)';
      case 'gasto': return 'var(--accent-red-dim)';
      case 'transferencia': return 'var(--accent-blue-dim)';
      default: return 'var(--accent-primary-dim)';
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
      dateFormat,
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
      <div className="flex items-center">
        <h2 className="text-lg font-semibold flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
      </div>

      {/* ── Views tab bar (Notion-style) ── */}
      <div
        className="flex items-end overflow-x-auto scrollbar-hide"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        {/* Helper: inline rename input */}
        {/* Renders inside each tab when renamingViewId matches */}

        {/* Tab "Tabla" — siempre presente */}
        <ViewTab
          label={defaultView ? defaultView.name : 'Tabla'}
          isActive={activeViewId === null}
          isRenaming={renamingViewId === '__default'}
          renameValue={renameInputValue}
          accentColor={getTypeColor()}
          onClick={() => switchTab(null)}
          onDoubleClick={() => {
            setRenameInputValue(defaultView ? defaultView.name : 'Tabla');
            setRenamingViewId('__default');
            setContextMenu(null);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ x: e.clientX, y: e.clientY, tabId: '__default', viewId: defaultView?.id || null, isDefaultTab: true });
            setRenamingViewId(null);
          }}
          onRenameChange={setRenameInputValue}
          onRenameCommit={(val) => {
            if (!val.trim()) { setRenamingViewId(null); return; }
            if (defaultView) {
              renameView(defaultView.id, val.trim());
            } else {
              saveView(val.trim(), {
                dateRange: { from: dateRange.from ? (dateRange.from instanceof Date ? dateRange.from.toISOString() : dateRange.from) : null, to: dateRange.to ? (dateRange.to instanceof Date ? dateRange.to.toISOString() : dateRange.to) : null },
                selectedAccounts, selectedCategories, searchText,
              }, sortConfig).then(v => { if (v) setDefault(v.id); });
            }
            setRenamingViewId(null);
          }}
          onRenameCancel={() => setRenamingViewId(null)}
        />

        {/* Saved views tabs */}
        {savedViews.filter(v => !v.isDefault).map(view => (
          <ViewTab
            key={view.id}
            label={view.name}
            isActive={activeViewId === view.id}
            isRenaming={renamingViewId === view.id}
            renameValue={renameInputValue}
            accentColor={getTypeColor()}
            onClick={() => switchTab(view.id, view)}
            onDoubleClick={() => { setRenameInputValue(view.name); setRenamingViewId(view.id); setContextMenu(null); }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.clientX, y: e.clientY, tabId: view.id, viewId: view.id, isDefaultTab: false, isViewDefault: view.isDefault });
              setRenamingViewId(null);
            }}
            onRenameChange={setRenameInputValue}
            onRenameCommit={(val) => { if (val.trim()) renameView(view.id, val.trim()); setRenamingViewId(null); }}
            onRenameCancel={() => setRenamingViewId(null)}
          />
        ))}

        {/* Add new view — Notion-style inline */}
        <div className="flex-shrink-0 flex items-center self-stretch" style={{ marginBottom: '-1px' }}>
          {showSaveInput ? (
            <div className="flex items-center gap-1 px-1 pb-1 self-end">
              <input
                type="text"
                value={savingViewName}
                onChange={(e) => setSavingViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveView();
                  if (e.key === 'Escape') { setShowSaveInput(false); setSavingViewName(''); }
                }}
                placeholder="Nombre de la vista..."
                autoFocus
                className="w-32 px-2 py-1 text-xs rounded-md"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  border: `1px solid ${getTypeColor()}`,
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSaveView}
                disabled={!savingViewName.trim()}
                className="px-2 py-1 rounded-md text-xs font-semibold text-white disabled:opacity-30 transition-opacity"
                style={{ backgroundColor: getTypeColor() }}
              >
                Guardar
              </button>
              <button
                onClick={() => { setShowSaveInput(false); setSavingViewName(''); }}
                className="w-6 h-6 flex items-center justify-center rounded-md text-xs transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveInput(true)}
              title="Nueva vista"
              className="flex items-center justify-center w-7 h-7 rounded-md mx-1 self-center transition-all"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1 min-w-4" />

        {/* New movement button — right side of tab bar */}
        {!selectionMode && (
          <div className="flex-shrink-0 flex items-center self-center pb-1 pr-0.5">
            <button
              onClick={() => onAddClick ? onAddClick() : navigate('/nuevo')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ backgroundColor: getTypeColor(), color: 'white' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {type === 'ingreso' ? 'Nuevo Ingreso' : type === 'transferencia' ? 'Nueva Transferencia' : 'Nuevo Gasto'}
            </button>
          </div>
        )}
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
                className="absolute left-0 top-full mt-2 z-50 w-80 rounded-2xl p-4 space-y-4"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-xl)',
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

        {/* Date format picker */}
        <div className="relative flex-shrink-0" ref={dateFormatMenuRef}>
          <button
            onClick={() => setShowDateFormatMenu(v => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
            title="Formato de fecha"
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>
              {{ short: '19-ene', full: '19-01-2026', medium: '19 ene 2026', slash: '19/01/26', relative: 'Relativa' }[dateFormat]}
            </span>
            <svg className="w-2.5 h-2.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDateFormatMenu && (
            <div
              className="absolute right-0 top-full mt-1 z-50 rounded-xl py-1 min-w-[150px]"
              style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xl)' }}
            >
              {[
                { id: 'short',    label: '19-ene',       desc: 'Día y mes corto' },
                { id: 'full',     label: '19-01-2026',   desc: 'Numérica completa' },
                { id: 'medium',   label: '19 ene 2026',  desc: 'Con año' },
                { id: 'slash',    label: '19/01/26',     desc: 'Barra corta' },
                { id: 'relative', label: 'Relativa',     desc: 'Hoy / Ayer / ...' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setDateFormat(opt.id); setShowDateFormatMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-opacity hover:opacity-80"
                  style={{ color: dateFormat === opt.id ? getTypeColor() : 'var(--text-primary)' }}
                >
                  <span className="font-medium tabular-nums">{opt.label}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Reset button */}
        {activeFiltersCount > 0 && (
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex-shrink-0"
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

      {/* ── Stats summary ── */}
      <div
        className="flex items-center gap-3 px-3 py-1.5 text-sm flex-wrap rounded-xl"
        style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>
          {filteredMovements.length} {type === 'transferencia' ? 'transferencia' : 'movimiento'}{filteredMovements.length !== 1 ? 's' : ''}
        </span>
        {type !== 'transferencia' ? (
          <>
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: getTypeColor() }}>
              <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-4 h-4 rounded-sm flex-shrink-0" />
              {formatCurrency(subtotals.totalEnARS, 'ARS')}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>·</span>
            <span className="inline-flex items-center gap-1 font-semibold" style={{ color: getTypeColor(), opacity: 0.75 }}>
              <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-4 h-4 rounded-sm flex-shrink-0" />
              {formatCurrency(subtotals.totalEnUSD, 'USD')}
            </span>
          </>
        ) : (
          <>
            <span className="font-semibold" style={{ color: 'var(--accent-red)' }}>
              ↓ {formatCurrency(subtotals.totalSalienteARS, 'ARS')}
            </span>
            <span className="font-semibold" style={{ color: 'var(--accent-green)' }}>
              ↑ {formatCurrency(subtotals.totalEntranteARS, 'ARS')}
            </span>
          </>
        )}
      </div>

      {/* ── Content ── */}
      {filteredMovements.length === 0 ? (
        renderEmptyState()
      ) : (
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
          tipoCambio={tipoCambio}
          dateFormat={dateFormat}
        />
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
                    ? formatCurrency(deleteConfirm.montoSaliente, 'ARS')
                    : formatCurrency(deleteConfirm.monto || deleteConfirm.montoPesos || 0, 'ARS')}
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

      {/* ── Context Menu (right-click on tabs) ── */}
      {contextMenu && (
        <ContextMenuPortal x={contextMenu.x} y={contextMenu.y} onClose={() => setContextMenu(null)}>

          {/* Renombrar — siempre */}
          <button
            role="menuitem"
            tabIndex={-1}
            className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-opacity hover:opacity-80"
            style={{ color: 'var(--text-primary)' }}
            onClick={() => {
              if (contextMenu.isDefaultTab) {
                setRenameInputValue(defaultView ? defaultView.name : 'Tabla');
                setRenamingViewId('__default');
              } else {
                const view = savedViews.find(v => v.id === contextMenu.viewId);
                setRenameInputValue(view?.name || '');
                setRenamingViewId(contextMenu.viewId);
              }
              setContextMenu(null);
            }}
          >
            {ICON_EDIT}
            Renombrar
          </button>

          {/* Establecer como predeterminada — solo tabs no-default */}
          {!contextMenu.isDefaultTab && (
            <button
              role="menuitem"
              tabIndex={-1}
              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{ color: contextMenu.isViewDefault ? '#f59e0b' : 'var(--text-primary)' }}
              onClick={() => {
                if (contextMenu.isViewDefault) {
                  unsetDefault(contextMenu.viewId);
                } else {
                  setDefault(contextMenu.viewId);
                }
                setContextMenu(null);
              }}
            >
              {ICON_STAR(contextMenu.isViewDefault)}
              {contextMenu.isViewDefault ? 'Quitar predeterminada' : 'Establecer como predeterminada'}
            </button>
          )}

          {/* Eliminar — solo tabs no-default */}
          {!contextMenu.isDefaultTab && (
            <button
              role="menuitem"
              tabIndex={-1}
              className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-opacity hover:opacity-80"
              style={{ color: 'var(--accent-red)' }}
              onClick={() => {
                deleteView(contextMenu.viewId);
                if (activeViewId === contextMenu.viewId) setActiveViewId(null);
                setContextMenu(null);
              }}
            >
              {ICON_TRASH}
              Eliminar vista
            </button>
          )}
        </ContextMenuPortal>
      )}
    </div>
  );
});

export default MovementsList;
