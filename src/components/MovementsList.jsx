import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../utils/format';
import DateRangePicker from './DateRangePicker';
import Combobox from './Combobox';
import ConfirmModal from './ConfirmModal';
import SortDropdown from './SortDropdown';
import { useError } from '../contexts/ErrorContext';
import { isImageFile, downloadAttachment } from '../services/attachmentStorage';

function MovementsList({
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
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [currency, setCurrency] = useState('ARS');
  
  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkAction, setBulkAction] = useState(null); // 'delete', 'editAccount', 'editCategory'
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Sort state - different storage key per type
  const sortStorageKey = `cashe-sort-${type}`;
  const [sortConfig, setSortConfig] = useState({ sortBy: 'date', sortOrder: 'desc' });

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
  }, [sortStorageKey]);

  // Save sort preference to localStorage
  useEffect(() => {
    localStorage.setItem(sortStorageKey, JSON.stringify(sortConfig));
  }, [sortConfig, sortStorageKey]);

  // Sort options based on movement type
  const sortOptions = useMemo(() => {
    if (type === 'transferencia') {
      return [
        { id: 'date', label: 'Fecha', defaultOrder: 'desc' },
        { id: 'amount', label: 'Monto', defaultOrder: 'desc' },
        { id: 'accountFrom', label: 'Cuenta origen', defaultOrder: 'asc' },
        { id: 'accountTo', label: 'Cuenta destino', defaultOrder: 'asc' },
      ];
    }
    return [
      { id: 'date', label: 'Fecha', defaultOrder: 'desc' },
      { id: 'amount', label: 'Monto', defaultOrder: 'desc' },
      { id: 'category', label: 'Categoría', defaultOrder: 'asc' },
      { id: 'account', label: 'Cuenta', defaultOrder: 'asc' },
    ];
  }, [type]);

  // Filter movements
  const filteredMovements = useMemo(() => {
    let filtered = [...movements];

    // Filter by date
    if (dateRange.from) {
      const from = new Date(dateRange.from);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter(m => new Date(m.fecha) >= from);
    }
    if (dateRange.to) {
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(m => new Date(m.fecha) <= to);
    }

    // Filter by accounts
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

    // Filter by categories (only for income/expense)
    if (selectedCategories.length > 0 && type !== 'transferencia') {
      filtered = filtered.filter(m => selectedCategories.includes(m.categoria));
    }

    // Filter by search text (nota, categoria, cuenta)
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

    // Apply sorting
    const { sortBy, sortOrder } = sortConfig;
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.fecha) - new Date(b.fecha);
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
      // Para transferencias, usar la moneda seleccionada
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
      // Para gastos e ingresos, usar la moneda seleccionada
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

  const activeFiltersCount = [
    dateRange.from || dateRange.to,
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
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
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
    if (!onBulkUpdate || !bulkEditValue) return;
    
    setBulkProcessing(true);
    try {
      const movementsToUpdate = getSelectedMovements();
      const field = bulkAction === 'editAccount' ? 'cuenta' : 'categoria';
      await onBulkUpdate(movementsToUpdate, field, bulkEditValue);
      setSelectedItems(new Set());
      setSelectionMode(false);
      setBulkAction(null);
      setBulkEditValue('');
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
    <div className="space-y-4">
      {/* Selection Mode Bar */}
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
                className="text-xs px-2 py-1 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}
              >
                {selectedItems.size === filteredMovements.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedItems.size > 0 && (
                <>
                  {/* Bulk Delete */}
                  <button
                    onClick={() => setBulkAction('delete')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>
                  
                  {/* Bulk Edit Account */}
                  <button
                    onClick={() => setBulkAction('editAccount')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)', color: 'var(--accent-blue)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Cuenta
                  </button>
                  
                  {/* Bulk Edit Category (not for transfers) */}
                  {type !== 'transferencia' && (
                    <button
                      onClick={() => setBulkAction('editCategory')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)', color: 'var(--accent-primary)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Categoría
                    </button>
                  )}
                </>
              )}
              
              <button
                onClick={toggleSelectionMode}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {/* Add button */}
          {!selectionMode && (
            <button
              onClick={() => onAddClick ? onAddClick() : navigate('/nuevo')}
              className="p-2 rounded-xl transition-colors"
              style={{ backgroundColor: getTypeColor(), color: 'white' }}
              title={`Agregar ${type === 'transferencia' ? 'transferencia' : type}`}
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
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h7M4 12h7m-7 7h7m5-14v14m0-14l3 3m-3-3l-3 3m3 11l3-3m-3 3l-3-3" />
              </svg>
            </button>
          )}

          {/* Currency Selector - Premium design */}
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
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
          />
        </div>
      </div>

      {/* Filters and Sort Row */}
      <div className="flex items-center gap-2">
        {/* Filters Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: showFilters ? getTypeBgDim() : 'var(--bg-tertiary)',
            color: showFilters ? getTypeColor() : 'var(--text-secondary)'
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Filtros</span>
          {activeFiltersCount > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: getTypeColor() }}
            >
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Sort Dropdown */}
        <SortDropdown
          options={sortOptions}
          value={sortConfig}
          onChange={setSortConfig}
          storageKey={sortStorageKey}
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div
          className="p-4 rounded-2xl space-y-4 animate-scale-in"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
        >
          {/* Search filter */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
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
                placeholder={type === 'transferencia'
                  ? "Buscar por cuenta..."
                  : "Buscar por nota, categoria, cuenta..."}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Accounts filter */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Cuentas
            </label>
            <div className="flex flex-wrap gap-2">
              {accounts.map(account => (
                <button
                  key={account.nombre}
                  onClick={() => toggleAccount(account.nombre)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                  style={{
                    backgroundColor: selectedAccounts.includes(account.nombre)
                      ? getTypeColor()
                      : 'var(--bg-tertiary)',
                    color: selectedAccounts.includes(account.nombre)
                      ? 'white'
                      : 'var(--text-secondary)',
                  }}
                >
                  {account.nombre}
                </button>
              ))}
            </div>
          </div>

          {/* Categories filter (not for transfers) */}
          {type !== 'transferencia' && categories.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Categorias
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                    style={{
                      backgroundColor: selectedCategories.includes(cat)
                        ? getTypeColor()
                        : 'var(--bg-tertiary)',
                      color: selectedCategories.includes(cat)
                        ? 'white'
                        : 'var(--text-secondary)',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs font-medium transition-colors hover:opacity-80"
              style={{ color: getTypeColor() }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Subtotals */}
      <div
        className="rounded-2xl p-4 relative overflow-hidden"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${getTypeBgDim()} 0%, transparent 70%)` }}
        />
        <div className="relative z-10">
          {/* Count */}
          <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
            {filteredMovements.length} {type === 'transferencia' ? 'transferencia' : 'movimiento'}{filteredMovements.length !== 1 ? 's' : ''}
          </p>

          {type === 'transferencia' ? (
            /* Transfer totals - show both saliente and entrante */
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--accent-red)' }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
                  </svg>
                  Total saliente
                </p>
                <p className="text-xl font-bold" style={{ color: 'var(--accent-red)' }}>
                  {formatCurrency(subtotals.totalSaliente, currency)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs mb-1 flex items-center gap-1 justify-end" style={{ color: 'var(--accent-green)' }}>
                  Total entrante
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h14" />
                  </svg>
                </p>
                <p className="text-xl font-bold" style={{ color: 'var(--accent-green)' }}>
                  {formatCurrency(subtotals.totalEntrante, currency)}
                </p>
              </div>
            </div>
          ) : (
            /* Income/Expense total */
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                Total
              </p>
              <p className="text-2xl font-bold" style={{ color: getTypeColor() }}>
                {formatCurrency(subtotals.total, currency)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Movements list */}
      {filteredMovements.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="space-y-2">
          {/* Desktop table header */}
          <div className="hidden lg:flex items-center gap-3 px-4 py-2 text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {selectionMode && <div className="w-6" />}
            <div className="w-12" /> {/* Icon space */}
            <div className="flex-1">Descripción</div>
            <div className="w-24 text-center">Fecha</div>
            {type !== 'transferencia' && <div className="w-32 text-center">Cuenta</div>}
            <div className="w-28 text-right">Monto</div>
            <div className="w-10" /> {/* Delete button space */}
          </div>
          
          {filteredMovements.map((movement, index) => {
            const itemId = movement.rowIndex || movement.id;
            const isSelected = selectedItems.has(itemId);
            
            return (
              <div
                key={itemId}
                className={`group rounded-2xl p-4 transition-all duration-200 ${!selectionMode ? 'hover:scale-[1.01]' : ''}`}
                style={{ 
                  backgroundColor: isSelected ? getTypeBgDim() : 'var(--bg-secondary)',
                  border: isSelected ? `1px solid ${getTypeColor()}` : '1px solid transparent',
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Checkbox for selection mode */}
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
                      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${!selectionMode ? 'group-hover:scale-110' : ''}`}
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
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {type === 'transferencia'
                          ? 'Transferencia'
                          : movement.categoria || '-'}
                      </p>
                      {/* Installment badge */}
                      {movement.cuota && (
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1"
                          style={{
                            backgroundColor: 'rgba(20, 184, 166, 0.15)',
                            color: 'var(--accent-primary)',
                          }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          {movement.cuota}
                        </span>
                      )}
                      {/* Category badge */}
                      {type !== 'transferencia' && movement.categoria && !movement.cuota && (
                        <span
                          className="px-2 py-0.5 rounded-md text-xs font-medium hidden sm:inline-block"
                          style={{
                            backgroundColor: getTypeBgDim(),
                            color: getTypeColor(),
                          }}
                        >
                          {movement.categoria.split(' ')[0]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                      {type === 'transferencia'
                        ? `${movement.cuentaSaliente} → ${movement.cuentaEntrante}`
                        : movement.cuenta}
                    </p>
                    {movement.nota && (
                      <p className="text-xs truncate mt-0.5 italic" style={{ color: 'var(--text-secondary)', opacity: 0.7 }}>
                        "{movement.nota}"
                      </p>
                    )}
                  </div>

                  {/* Desktop: Show date in separate column */}
                  <div className="hidden lg:block text-center flex-shrink-0 w-24">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {formatDate(movement.fecha, 'short')}
                    </p>
                  </div>

                  {/* Desktop: Show account/category info */}
                  {type !== 'transferencia' && (
                    <div className="hidden lg:block text-center flex-shrink-0 w-32">
                      <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                        {movement.cuenta}
                      </p>
                    </div>
                  )}

                  {/* Amount and date */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold lg:text-lg" style={{ color: getTypeColor() }}>
                      {type === 'transferencia'
                        ? formatCurrency(currency === 'ARS' ? movement.montoSaliente : (movement.montoSalienteDolares || 0), currency)
                        : type === 'ingreso'
                          ? `+${formatCurrency(currency === 'ARS' ? (movement.montoPesos || movement.monto) : (movement.montoDolares || 0), currency)}`
                          : `-${formatCurrency(currency === 'ARS' ? (movement.montoPesos || movement.monto) : (movement.montoDolares || 0), currency)}`}
                    </p>
                    <p className="text-xs lg:hidden" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(movement.fecha, 'short')}
                    </p>
                  </div>
                </button>

                {/* Attachment indicator */}
                {movement.attachmentUrl && !selectionMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadAttachment(movement.attachmentUrl, movement.attachmentName);
                    }}
                    className="p-2 rounded-xl flex-shrink-0 transition-all hover:scale-105"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    title={movement.attachmentName ? `Descargar: ${movement.attachmentName}` : 'Descargar adjunto'}
                  >
                    {isImageFile(movement.attachmentName) ? (
                      <img
                        src={movement.attachmentUrl}
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
                  </button>
                )}

                {/* Delete button - hidden by default and in selection mode */}
                {!selectionMode && (
                  <button
                    onClick={(e) => handleDeleteClick(e, movement)}
                    className="p-2 rounded-xl flex-shrink-0 transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-red-500/20"
                    style={{ color: 'var(--text-secondary)' }}
                    title="Eliminar"
                  >
                    <svg className="w-5 h-5 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
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

      {/* Bulk Delete Confirmation Modal */}
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

      {/* Bulk Edit Account Modal */}
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

      {/* Bulk Edit Category Modal */}
      {bulkAction === 'editCategory' && (
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
              Cambiar categoría
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Cambiar la categoría de {selectedItems.size} movimiento{selectedItems.size !== 1 ? 's' : ''}
            </p>
            
            <div className="mb-4">
              <Combobox
                value={bulkEditValue}
                onChange={(e) => setBulkEditValue(e.target.value)}
                options={categories.map(c => ({ value: c, label: c }))}
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
    </div>
  );
}

export default MovementsList;
