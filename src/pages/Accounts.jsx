import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getAccounts, clearCache, addAccount, updateAccount, deleteAccount, bulkDeleteAccounts } from '../services/supabaseApi';
import { formatCurrency } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import SortDropdown from '../components/SortDropdown';
import { useError } from '../contexts/ErrorContext';
import IconPicker from '../components/IconPicker';
import { isEmoji, isPredefinedIcon, resolveIconPath } from '../services/iconStorage';
import { useDataEvent, DataEvents } from '../services/dataEvents';

function Accounts() {
  const { showError } = useError();
  const location = useLocation();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState({});
  const [displayCurrency, setDisplayCurrency] = useState('original'); // 'original', 'ARS', 'USD'
  const [deleteConfirm, setDeleteConfirm] = useState(null); // Cuenta a eliminar
  
  // Multi-selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Sort state
  const sortStorageKey = 'cashe-sort-accounts';
  const [sortConfig, setSortConfig] = useState({ sortBy: 'balance', sortOrder: 'desc' });

  // Sort options for accounts
  const sortOptions = [
    { id: 'balance', label: 'Saldo', defaultOrder: 'desc' },
    { id: 'name', label: 'Nombre', defaultOrder: 'asc' },
    { id: 'type', label: 'Tipo', defaultOrder: 'asc' },
    { id: 'currency', label: 'Moneda', defaultOrder: 'asc' },
  ];

  // Load sort preference from localStorage
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
  }, []);

  // Save sort preference to localStorage
  useEffect(() => {
    localStorage.setItem(sortStorageKey, JSON.stringify(sortConfig));
  }, [sortConfig]);

  // Refrescar datos cada vez que se navega a esta página (location.key cambia en cada navegación)
  useEffect(() => {
    fetchAccounts(true); // Forzar limpieza de caché al entrar a la página
  }, [location.key]);

  // Refrescar datos cuando la página recupera el foco (ej: navegación con botón atrás)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchAccounts(true);
      }
    };

    const handlePageShow = (event) => {
      // Si la página viene del bfcache, refrescar datos
      if (event.persisted) {
        fetchAccounts(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // Suscribirse a cambios de datos para refrescar automáticamente
  const handleDataChange = useCallback(() => {
    fetchAccounts(true);
  }, []);

  useDataEvent([DataEvents.ACCOUNTS_CHANGED, DataEvents.EXPENSES_CHANGED, DataEvents.INCOMES_CHANGED, DataEvents.TRANSFERS_CHANGED], handleDataChange);

  const fetchAccounts = async (forceRefresh = false) => {
    try {
      setLoading(true);
      // Limpiar caché antes de obtener datos frescos
      if (forceRefresh) {
        clearCache();
      }
      const data = await getAccounts();
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total balance across all accounts based on displayCurrency
  // Exclude credit cards from the total (they represent debt, not assets)
  const totalBalance = useMemo(() => {
    return accounts
      .filter(acc => !acc.esTarjetaCredito)
      .reduce((sum, acc) => {
        const balance = acc.balanceActual || 0;
        const tipoCambio = acc.tipoCambio || 1000;

        if (displayCurrency === 'original') {
          // En modo original, convertimos todo a pesos para calcular porcentajes
          if (acc.moneda === 'Peso') {
            return sum + balance;
          } else {
            return sum + (balance * tipoCambio);
          }
        } else if (displayCurrency === 'ARS') {
          // Todo a pesos
          if (acc.moneda === 'Peso') {
            return sum + balance;
          } else {
            return sum + (balance * tipoCambio);
          }
        } else {
          // Todo a dólares
          if (acc.moneda === 'Peso') {
            return sum + (balance / tipoCambio);
          } else {
            return sum + balance;
          }
        }
      }, 0);
  }, [accounts, displayCurrency]);

  // Sorted accounts based on sort config
  const sortedAccounts = useMemo(() => {
    const sorted = [...accounts];
    const { sortBy, sortOrder } = sortConfig;
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'balance':
          // Sort by balance in display currency for consistency
          const balanceA = a.balanceActual || 0;
          const balanceB = b.balanceActual || 0;
          // Convert to same currency for comparison (use pesos as base)
          const tipoCambioA = a.tipoCambio || 1000;
          const tipoCambioB = b.tipoCambio || 1000;
          const normalizedA = a.moneda === 'Peso' ? balanceA : balanceA * tipoCambioA;
          const normalizedB = b.moneda === 'Peso' ? balanceB : balanceB * tipoCambioB;
          comparison = normalizedA - normalizedB;
          break;
        case 'name':
          comparison = (a.nombre || '').localeCompare(b.nombre || '');
          break;
        case 'type':
          comparison = (a.tipo || '').localeCompare(b.tipo || '');
          break;
        case 'currency':
          // ARS before USD when ascending
          comparison = (a.moneda || '').localeCompare(b.moneda || '');
          break;
        default:
          comparison = 0;
      }

      return comparison * multiplier;
    });

    return sorted;
  }, [accounts, sortConfig]);

  // Helper para obtener el balance de una cuenta en la moneda seleccionada
  const getDisplayBalance = (account) => {
    const balance = account.balanceActual || 0;
    const tipoCambio = account.tipoCambio || 1000;
    const isARS = account.moneda === 'Peso';

    if (displayCurrency === 'original') {
      return { value: balance, currency: isARS ? 'ARS' : 'USD' };
    } else if (displayCurrency === 'ARS') {
      const converted = isARS ? balance : balance * tipoCambio;
      return { value: converted, currency: 'ARS' };
    } else {
      const converted = isARS ? balance / tipoCambio : balance;
      return { value: converted, currency: 'USD' };
    }
  };

  const handleAdd = async (formData) => {
    try {
      setSaving(true);
      await addAccount(formData);
      setIsAdding(false);
      await fetchAccounts();
    } catch (err) {
      console.error('Error adding account:', err);
      showError('No se pudo crear la cuenta', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (formData) => {
    try {
      setSaving(true);
      await updateAccount(formData);
      setEditingAccount(null);
      await fetchAccounts();
    } catch (err) {
      console.error('Error updating account:', err);
      showError('No se pudo guardar la cuenta', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (account) => {
    setDeleteConfirm(account);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setSaving(true);
      await deleteAccount(deleteConfirm.id);
      setDeleteConfirm(null);
      setEditingAccount(null);
      await fetchAccounts();
    } catch (err) {
      console.error('Error deleting account:', err);
      showError('No se pudo eliminar la cuenta', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Multi-selection functions
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedAccounts(new Set());
  };

  const toggleAccountSelection = (accountId) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedAccounts.size === accounts.length) {
      setSelectedAccounts(new Set());
    } else {
      setSelectedAccounts(new Set(accounts.map(a => a.id)));
    }
  };

  const handleBulkDelete = async () => {
    const accountsToDelete = accounts.filter(a => selectedAccounts.has(a.id));
    if (accountsToDelete.length === 0) return;
    setBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setSaving(true);
      const accountsToDelete = accounts.filter(a => selectedAccounts.has(a.id));
      await bulkDeleteAccounts(accountsToDelete);
      setBulkDeleteConfirm(false);
      setSelectedAccounts(new Set());
      setSelectionMode(false);
      await fetchAccounts();
    } catch (err) {
      console.error('Error bulk deleting accounts:', err);
      showError('No se pudieron eliminar las cuentas', err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleDetails = (accountId) => {
    setShowDetails(prev => {
      const isOpen = !!prev[accountId];
      // Solo dejar abierto el que se clickeó; si ya estaba abierto, cierra todos.
      return isOpen ? {} : { [accountId]: true };
    });
  };

  const getCurrencyFlag = (moneda) => {
    // Use styled text instead of emoji flags (Windows doesn't render flag emojis)
    const isARS = moneda === 'Peso';
    return (
      <span
        className="text-xs font-bold px-1.5 py-0.5 rounded"
        style={{
          backgroundColor: isARS ? 'rgba(117, 170, 219, 0.2)' : 'rgba(60, 179, 113, 0.2)',
          color: isARS ? '#75AADB' : '#3CB371',
        }}
      >
        {isARS ? 'ARS' : 'USD'}
      </span>
    );
  };

  const getAccountPercentage = (account) => {
    if (totalBalance === 0) return 0;
    const { value } = getDisplayBalance(account);
    // Para el porcentaje, usamos el valor convertido
    return Math.min(100, Math.max(0, (value / totalBalance) * 100));
  };

  // Skeleton loading
  const renderSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl skeleton" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 skeleton" />
              <div className="h-3 w-24 skeleton" />
            </div>
            <div className="text-right space-y-2">
              <div className="h-5 w-28 skeleton ml-auto" />
              <div className="h-3 w-20 skeleton ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-24 skeleton" />
          <div className="h-10 w-24 skeleton" />
        </div>
        {renderSkeleton()}
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Header Row 1: Title + Actions */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
          Cuentas
        </h2>
        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          {accounts.length > 0 && (
            <SortDropdown
              options={sortOptions}
              value={sortConfig}
              onChange={setSortConfig}
              storageKey={sortStorageKey}
            />
          )}

          {/* Selection mode toggle */}
          {accounts.length > 0 && (
            <button
              onClick={toggleSelectionMode}
              className="p-2 rounded-lg transition-colors duration-150"
              style={{
                backgroundColor: selectionMode ? 'var(--accent-primary-dim)' : 'var(--bg-tertiary)',
                color: selectionMode ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
              title={selectionMode ? 'Cancelar selección' : 'Seleccionar'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h7M4 12h7m-7 7h7m5-14v14m0-14l3 3m-3-3l-3 3m3 11l3-3m-3 3l-3-3" />
              </svg>
            </button>
          )}

          <button
            onClick={() => setIsAdding(true)}
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 flex items-center gap-1.5"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)'
            }}
          >
            <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva
          </button>
        </div>
      </div>

      {/* Header Row 2: Currency Selector */}
      <div
        className="flex w-full p-1 rounded-lg"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        {[
          { id: 'original', label: 'Original', icon: null },
          { id: 'ARS', label: 'ARS', icon: `${import.meta.env.BASE_URL}icons/catalog/ARS.svg` },
          { id: 'USD', label: 'USD', icon: `${import.meta.env.BASE_URL}icons/catalog/USD.svg` },
        ].map((opt) => (
          <button
            key={opt.id}
            onClick={() => setDisplayCurrency(opt.id)}
            className="flex-1 py-2 rounded-md text-xs font-medium transition-colors duration-150 flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: displayCurrency === opt.id ? 'var(--bg-elevated)' : 'transparent',
              color: displayCurrency === opt.id ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            {opt.icon && (
              <img src={resolveIconPath(opt.icon)} alt={opt.label} className="w-4 h-4 rounded-sm" />
            )}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {selectionMode && selectedAccounts.size > 0 && (
        <div
          className="flex items-center justify-between p-4 rounded-2xl animate-scale-in"
          style={{ backgroundColor: 'var(--accent-primary-dim)', border: '1px solid var(--accent-primary)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={selectAll}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              {selectedAccounts.size === accounts.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
            <span className="text-sm font-medium" style={{ color: 'var(--accent-primary)' }}>
              {selectedAccounts.size} {selectedAccounts.size === 1 ? 'cuenta seleccionada' : 'cuentas seleccionadas'}
            </span>
          </div>
          <button
            onClick={handleBulkDelete}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-80 flex items-center gap-2"
            style={{ backgroundColor: 'var(--accent-red)', color: 'white' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Eliminar
          </button>
        </div>
      )}

      {accounts.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div
            className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-primary-dim)' }}
          >
            <svg className="w-10 h-10" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Sin cuentas
          </h3>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Agrega tu primera cuenta para comenzar
          </p>
          <button
            onClick={() => setIsAdding(true)}
            className="px-6 py-3 rounded-xl font-medium text-white transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Agregar cuenta
          </button>
        </div>
      ) : (
        <>
          {/* Mobile: Single column */}
          <div className="space-y-3 lg:hidden">
            {sortedAccounts.map((account) => {
              const expansionKey = account.id ?? account.rowIndex ?? account.nombre;
              const percentage = getAccountPercentage(account);
              const isExpanded = showDetails[expansionKey];
              const displayBalance = getDisplayBalance(account);
              const isSelected = selectedAccounts.has(account.id);

              return (
                <AccountCard
                  key={account.id || account.rowIndex || account.nombre}
                  account={account}
                  expansionKey={expansionKey}
                  percentage={percentage}
                  isExpanded={isExpanded}
                  displayBalance={displayBalance}
                  isSelected={isSelected}
                  selectionMode={selectionMode}
                  toggleAccountSelection={toggleAccountSelection}
                  toggleDetails={toggleDetails}
                  setEditingAccount={setEditingAccount}
                  handleSave={handleSave}
                  saving={saving}
                />
              );
            })}
          </div>

          {/* Desktop lg: 2 columns */}
          <div className="hidden lg:flex xl:hidden gap-4">
            {[0, 1].map((colIndex) => (
              <div key={colIndex} className="flex-1 space-y-4">
                {sortedAccounts
                  .filter((_, i) => i % 2 === colIndex)
                  .map((account) => {
                    const expansionKey = account.id ?? account.rowIndex ?? account.nombre;
                    const percentage = getAccountPercentage(account);
                    const isExpanded = showDetails[expansionKey];
                    const displayBalance = getDisplayBalance(account);
                    const isSelected = selectedAccounts.has(account.id);

                    return (
                      <AccountCard
                        key={account.id || account.rowIndex || account.nombre}
                        account={account}
                        expansionKey={expansionKey}
                        percentage={percentage}
                        isExpanded={isExpanded}
                        displayBalance={displayBalance}
                        isSelected={isSelected}
                        selectionMode={selectionMode}
                        toggleAccountSelection={toggleAccountSelection}
                        toggleDetails={toggleDetails}
                        setEditingAccount={setEditingAccount}
                        handleSave={handleSave}
                        saving={saving}
                      />
                    );
                  })}
              </div>
            ))}
          </div>

          {/* Desktop xl: 3 columns */}
          <div className="hidden xl:flex gap-4">
            {[0, 1, 2].map((colIndex) => (
              <div key={colIndex} className="flex-1 space-y-4">
                {sortedAccounts
                  .filter((_, i) => i % 3 === colIndex)
                  .map((account) => {
                    const expansionKey = account.id ?? account.rowIndex ?? account.nombre;
                    const percentage = getAccountPercentage(account);
                    const isExpanded = showDetails[expansionKey];
                    const displayBalance = getDisplayBalance(account);
                    const isSelected = selectedAccounts.has(account.id);

                    return (
                      <AccountCard
                        key={account.id || account.rowIndex || account.nombre}
                        account={account}
                        expansionKey={expansionKey}
                        percentage={percentage}
                        isExpanded={isExpanded}
                        displayBalance={displayBalance}
                        isSelected={isSelected}
                        selectionMode={selectionMode}
                        toggleAccountSelection={toggleAccountSelection}
                        toggleDetails={toggleDetails}
                        setEditingAccount={setEditingAccount}
                        handleSave={handleSave}
                        saving={saving}
                      />
                    );
                  })}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Modal */}
      {isAdding && (
        <AccountModal
          onSave={handleAdd}
          onClose={() => setIsAdding(false)}
          loading={saving}
        />
      )}

      {/* Edit Modal */}
      {editingAccount && (
        <AccountModal
          account={editingAccount}
          onSave={handleSave}
          onDelete={() => handleDelete(editingAccount)}
          onClose={() => setEditingAccount(null)}
          loading={saving}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Eliminar cuenta"
        message={
          <>
            ¿Estás seguro de que quieres eliminar la cuenta{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {deleteConfirm?.nombre}
            </span>
            ?<br />
            <span className="text-xs mt-1 block">Los movimientos asociados no se eliminarán.</span>
          </>
        }
        confirmText="Eliminar"
        loading={saving}
        icon={
          <svg className="w-7 h-7" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        }
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={confirmBulkDelete}
        title="Eliminar cuentas"
        message={
          <>
            ¿Estás seguro de que quieres eliminar{' '}
            <span className="font-semibold" style={{ color: 'var(--accent-red)' }}>
              {selectedAccounts.size} {selectedAccounts.size === 1 ? 'cuenta' : 'cuentas'}
            </span>
            ?<br />
            <span className="text-xs mt-1 block">Esta acción no se puede deshacer. Los movimientos asociados no se eliminarán.</span>
          </>
        }
        confirmText={`Eliminar ${selectedAccounts.size}`}
        loading={saving}
        icon={
          <svg className="w-7 h-7" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        }
      />
    </div>
  );

  // Account Card Component
  function AccountCard({
    account,
    expansionKey,
    percentage,
    isExpanded,
    displayBalance,
    isSelected,
    selectionMode,
    toggleAccountSelection,
    toggleDetails,
    setEditingAccount,
    handleSave,
    saving,
  }) {
    return (
      <div
        className={`rounded-2xl overflow-hidden transition-all duration-200 ${isSelected ? 'ring-2' : ''}`}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          ringColor: 'var(--accent-primary)'
        }}
      >
                {/* Main row - always visible */}
                <div className="flex items-center">
                  {/* Checkbox for selection mode */}
                  {selectionMode && (
                    <button
                      onClick={() => toggleAccountSelection(account.id)}
                      className="pl-4 pr-2 py-4 flex items-center"
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200 ${isSelected ? '' : 'border-2'}`}
                        style={{
                          backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                          borderColor: 'var(--text-secondary)'
                        }}
                      >
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  )}
                  
                  <button
                    onClick={() => selectionMode ? toggleAccountSelection(account.id) : toggleDetails(expansionKey)}
                    className={`flex-1 min-w-0 p-2.5 sm:p-4 ${selectionMode ? 'pl-0' : ''} text-left transition-colors hover:bg-[var(--bg-tertiary)] overflow-hidden`}
                  >
                    <div className="flex items-start gap-2.5">
                      {/* Account icon */}
                      <div
                        className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                        style={{
                          backgroundColor: account.icon
                            ? (isEmoji(account.icon) ? 'var(--bg-tertiary)' : 'transparent')
                            : account.moneda === 'Peso'
                              ? 'rgba(117, 170, 219, 0.15)'
                              : 'rgba(60, 179, 113, 0.15)',
                        }}
                      >
                        {account.icon ? (
                          isEmoji(account.icon) ? (
                            <span className="text-lg sm:text-2xl">{account.icon}</span>
                          ) : (
                            <img
                              src={resolveIconPath(account.icon)}
                              alt={account.nombre}
                              className="w-full h-full object-cover rounded-lg sm:rounded-xl"
                            />
                          )
                        ) : (
                          <span
                            className="text-sm sm:text-lg font-bold"
                            style={{
                              color: account.moneda === 'Peso' ? '#75AADB' : '#3CB371',
                            }}
                          >
                            {account.moneda === 'Peso' ? '$' : 'US$'}
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Row 1: Name + Chevron */}
                        <div className="flex items-center gap-1">
                          <p
                            className="font-semibold text-sm leading-tight truncate flex-1"
                            style={{ color: 'var(--text-primary)' }}
                            title={account.nombre}
                          >
                            {account.nombre}
                          </p>
                          {/* Chevron */}
                          <svg
                            className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                            style={{ color: 'var(--text-secondary)' }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>

                        {/* Row 2: Type + Balance */}
                        <div className="flex items-baseline justify-between gap-2 mt-1">
                          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {account.esTarjetaCredito ? 'Próximo resumen' : (
                              <>
                                {account.moneda === 'Peso' ? 'ARS' : 'USD'} {account.tipo && `· ${account.tipo}`}
                              </>
                            )}
                          </p>
                          {account.esTarjetaCredito ? (
                            <div className="flex items-center gap-2">
                              {account.proximoResumenPesos > 0 && (
                                <p className="text-sm font-bold" style={{ color: 'var(--accent-red)' }}>
                                  -{formatCurrency(account.proximoResumenPesos, 'ARS')}
                                </p>
                              )}
                              {account.proximoResumenDolares > 0 && (
                                <p className="text-sm font-bold" style={{ color: 'var(--accent-green)' }}>
                                  -{formatCurrency(account.proximoResumenDolares, 'USD')}
                                </p>
                              )}
                              {account.proximoResumenPesos === 0 && account.proximoResumenDolares === 0 && (
                                <p className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                                  $0
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>
                              {formatCurrency(displayBalance.value, displayBalance.currency)}
                            </p>
                          )}
                        </div>

                        {/* Row 3: Progress bar (hidden for credit cards) */}
                        {!account.esTarjetaCredito && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: 'var(--accent-primary)',
                                }}
                              />
                            </div>
                            <span className="text-[10px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                              {percentage.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && !selectionMode && (
                  <div
                    className="px-4 pb-4 pt-2 animate-scale-in"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    {account.esTarjetaCredito ? (
                      /* Credit Card specific details */
                      <>
                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div
                            className="p-3 rounded-xl"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                          >
                            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Próximo resumen $</p>
                            <p className="font-medium" style={{ color: 'var(--accent-red)' }}>
                              {account.proximoResumenPesos > 0
                                ? `-${formatCurrency(account.proximoResumenPesos, 'ARS')}`
                                : '$0'}
                            </p>
                          </div>
                          <div
                            className="p-3 rounded-xl"
                            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                          >
                            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Próximo resumen US$</p>
                            <p className="font-medium" style={{ color: 'var(--accent-green)' }}>
                              {account.proximoResumenDolares > 0
                                ? `-${formatCurrency(account.proximoResumenDolares, 'USD')}`
                                : 'US$0'}
                            </p>
                          </div>
                          <div
                            className="p-3 rounded-xl"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)' }}
                          >
                            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Total gastado</p>
                            <p className="font-medium" style={{ color: 'var(--accent-red)' }}>
                              -{formatCurrency(account.totalGastos || 0, 'ARS')}
                            </p>
                          </div>
                          <div
                            className="p-3 rounded-xl"
                            style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                          >
                            <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Promedio mensual</p>
                            <p className="font-medium" style={{ color: 'var(--accent-blue)' }}>
                              {formatCurrency(account.promedioMensual || 0, 'ARS')}
                            </p>
                          </div>
                        </div>
                        <ClosingDayEditor
                          account={account}
                          onSave={handleSave}
                          loading={saving}
                        />
                      </>
                    ) : (
                      /* Regular account details */
                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div
                          className="p-3 rounded-xl"
                          style={{ backgroundColor: 'var(--bg-tertiary)' }}
                        >
                          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Balance Inicial</p>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {formatCurrency(account.balanceInicial, account.moneda === 'Peso' ? 'ARS' : 'USD')}
                          </p>
                        </div>
                        <div
                          className="p-3 rounded-xl"
                          style={{ backgroundColor: 'var(--bg-tertiary)' }}
                        >
                          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Numero de Cuenta</p>
                          <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {account.numeroCuenta || '-'}
                          </p>
                        </div>
                        <div
                          className="p-3 rounded-xl"
                          style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                        >
                          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Total Ingresos</p>
                          <p className="font-medium" style={{ color: 'var(--accent-green)' }}>
                            +{formatCurrency(account.totalIngresos, account.moneda === 'Peso' ? 'ARS' : 'USD')}
                          </p>
                        </div>
                        <div
                          className="p-3 rounded-xl"
                          style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                        >
                          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Total Gastos</p>
                          <p className="font-medium" style={{ color: 'var(--accent-red)' }}>
                            -{formatCurrency(account.totalGastos, account.moneda === 'Peso' ? 'ARS' : 'USD')}
                          </p>
                        </div>
                        <div
                          className="p-3 rounded-xl"
                          style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                        >
                          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Transf. Entrantes</p>
                          <p className="font-medium" style={{ color: 'var(--accent-blue)' }}>
                            +{formatCurrency(account.totalTransfEntrantes, account.moneda === 'Peso' ? 'ARS' : 'USD')}
                          </p>
                        </div>
                        <div
                          className="p-3 rounded-xl"
                          style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                        >
                          <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Transf. Salientes</p>
                          <p className="font-medium" style={{ color: 'var(--accent-blue)' }}>
                            -{formatCurrency(account.totalTransfSalientes, account.moneda === 'Peso' ? 'ARS' : 'USD')}
                          </p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAccount(account);
                      }}
                      className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-80 flex items-center justify-center gap-2"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Editar cuenta
                    </button>
                  </div>
                )}
      </div>
    );
  }
}

function AccountModal({ account, onSave, onDelete, onClose, loading }) {
  const isEditing = !!account;
  const [formData, setFormData] = useState({
    id: account?.id,
    rowIndex: account?.rowIndex,
    nombre: account?.nombre || '',
    balanceInicial: account?.balanceInicial?.toString() || '0',
    moneda: account?.moneda || 'Peso',
    numeroCuenta: account?.numeroCuenta || '',
    tipo: account?.tipo || '',
    esTarjetaCredito: account?.esTarjetaCredito || false,
    diaCierre: account?.diaCierre?.toString() || '1',
    icon: account?.icon || null,
  });
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Drag to dismiss state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);

  const handleTouchStart = (e) => {
    if (e.target.closest('[data-drag-handle]')) {
      startYRef.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startYRef.current;
    if (diff > 0) setDragY(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    if (dragY > 100) onClose();
    setDragY(0);
    setIsDragging(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      balanceInicial: parseFloat(formData.balanceInicial) || 0,
      diaCierre: formData.esTarjetaCredito ? parseInt(formData.diaCierre) || 1 : null,
      icon: formData.icon,
    });
  };

  const handleIconSelect = (iconValue) => {
    setFormData(prev => ({ ...prev, icon: iconValue }));
  };

  const shouldClose = dragY > 100;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto sm:py-6">
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: `rgba(0, 0, 0, ${Math.max(0.6 - dragY / 300, 0)})` }}
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-lg sm:mx-4 rounded-b-2xl sm:rounded-2xl flex flex-col animate-slide-down max-h-[calc(100dvh-40px)] sm:max-h-[calc(100vh-48px)]"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          opacity: shouldClose ? 0.5 : 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator - mobile only */}
        <div className="sm:hidden flex justify-center pt-2" data-drag-handle>
          <div
            className="w-10 h-1 rounded-full transition-colors"
            style={{ backgroundColor: shouldClose ? 'var(--accent-red)' : 'var(--border-medium)' }}
          />
        </div>

        {/* Header compacto */}
        <div
          className="flex items-center justify-between px-4 py-2 sm:py-3 flex-shrink-0 border-b cursor-grab active:cursor-grabbing sm:cursor-default"
          style={{ borderColor: 'var(--border-subtle)' }}
          data-drag-handle
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isEditing ? 'Editar Cuenta' : 'Nueva Cuenta'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="space-y-3 overflow-y-auto px-4 py-3 flex-1">
          {/* Icon selector - compacto */}
          <button
            type="button"
            onClick={() => setShowIconPicker(true)}
            className="w-full px-3 py-2.5 rounded-lg transition-all duration-200 border border-dashed hover:border-solid flex items-center gap-3"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: formData.icon ? 'var(--accent-primary)' : 'var(--border-medium)',
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{
                backgroundColor: formData.icon
                  ? (isEmoji(formData.icon) ? 'var(--bg-secondary)' : 'transparent')
                  : 'var(--bg-secondary)',
              }}
            >
              {formData.icon ? (
                isEmoji(formData.icon) ? (
                  <span className="text-xl">{formData.icon}</span>
                ) : (
                  <img
                    src={resolveIconPath(formData.icon)}
                    alt="Ícono"
                    className="w-full h-full object-cover rounded-lg"
                  />
                )
              ) : (
                <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {formData.icon ? 'Cambiar ícono' : 'Seleccionar ícono'}
              </p>
            </div>
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg text-sm border border-transparent focus:border-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              required
            />
          </div>

          {/* Balance y Moneda en fila */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Balance Inicial</label>
              <input
                type="number"
                name="balanceInicial"
                value={formData.balanceInicial}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 rounded-lg text-sm border border-transparent focus:border-[var(--accent-primary)]"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Moneda</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, moneda: 'Peso' }))}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: formData.moneda === 'Peso' ? 'rgba(117, 170, 219, 0.2)' : 'var(--bg-tertiary)',
                    color: formData.moneda === 'Peso' ? '#75AADB' : 'var(--text-secondary)',
                    border: formData.moneda === 'Peso' ? '1px solid #75AADB' : '1px solid transparent',
                  }}
                >
                  <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-4 h-4 rounded-sm" />
                  ARS
                </button>
                {!formData.esTarjetaCredito && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, moneda: 'Dólar' }))}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: formData.moneda === 'Dólar' ? 'rgba(60, 179, 113, 0.2)' : 'var(--bg-tertiary)',
                      color: formData.moneda === 'Dólar' ? '#3CB371' : 'var(--text-secondary)',
                      border: formData.moneda === 'Dólar' ? '1px solid #3CB371' : '1px solid transparent',
                    }}
                  >
                    <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-4 h-4 rounded-sm" />
                    USD
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Numero de Cuenta */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nro. Cuenta (opcional)</label>
            <input
              type="text"
              name="numeroCuenta"
              value={formData.numeroCuenta}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg text-sm border border-transparent focus:border-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Tipo de cuenta - más compacto */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Tipo de cuenta</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: 'Caja de ahorro', icon: '🏦', label: 'Ahorro' },
                { value: 'Cuenta corriente', icon: '💼', label: 'Corriente' },
                { value: 'Tarjeta de crédito', icon: '💳', label: 'Crédito' },
                { value: 'Billetera virtual', icon: '📱', label: 'Billetera' },
                { value: 'Efectivo', icon: '💵', label: 'Efectivo' },
                { value: 'Inversiones', icon: '📈', label: 'Inversión' },
              ].map((tipo) => {
                const isSelected = formData.tipo === tipo.value;
                const isCreditCard = tipo.value === 'Tarjeta de crédito';
                return (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      tipo: tipo.value,
                      esTarjetaCredito: isCreditCard,
                      ...(isCreditCard ? { moneda: 'Peso' } : {}),
                    }))}
                    className="flex flex-col items-center gap-0.5 p-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: isSelected
                        ? (isCreditCard ? 'var(--accent-purple)' : 'var(--accent-primary)')
                        : 'var(--bg-tertiary)',
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    <span className="text-base">{tipo.icon}</span>
                    <span className="text-[10px] leading-tight">{tipo.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Día de cierre - solo visible si es tarjeta de crédito */}
          {formData.esTarjetaCredito && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ backgroundColor: 'var(--accent-purple-dim)' }}>
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Cierre día</span>
              <input
                type="number"
                name="diaCierre"
                value={formData.diaCierre}
                onChange={handleChange}
                min="1"
                max="31"
                className="w-14 px-2 py-1 rounded-md text-sm text-center font-semibold border border-transparent focus:border-[var(--accent-purple)]"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>de cada mes</span>
            </div>
          )}

          </div>

          {/* Botones compactos */}
          <div className="flex gap-2 p-3 flex-shrink-0 border-t" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={loading}
                className="px-3 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-all hover:opacity-80"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' }}
              >
                Eliminar
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !formData.nombre}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? 'Guardar' : 'Crear cuenta'}
            </button>
          </div>
        </form>

        {/* Icon Picker Modal */}
        <IconPicker
          isOpen={showIconPicker}
          onClose={() => setShowIconPicker(false)}
          onSelect={handleIconSelect}
          currentValue={formData.icon}
          showPredefined={true}
          title="Ícono de cuenta"
        />
      </div>
    </div>
  );
}

export default Accounts;

// Componente para editar rápidamente el día de cierre
function ClosingDayEditor({ account, onSave, loading }) {
  const [isEditing, setIsEditing] = useState(false);
  const [diaCierre, setDiaCierre] = useState(account.diaCierre?.toString() || '1');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const newDia = parseInt(diaCierre) || 1;
    if (newDia === account.diaCierre) {
      setIsEditing(false);
      return;
    }
    
    setSaving(true);
    try {
      await onSave({
        id: account.id,
        rowIndex: account.rowIndex,
        nombre: account.nombre,
        balanceInicial: account.balanceInicial,
        moneda: account.moneda,
        numeroCuenta: account.numeroCuenta,
        tipo: account.tipo,
        esTarjetaCredito: account.esTarjetaCredito,
        diaCierre: newDia,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating closing day:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
        className="w-full p-3 rounded-xl mb-4 flex items-center justify-between transition-colors hover:opacity-80"
        style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-purple)' }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Día de cierre</p>
            <p className="font-semibold" style={{ color: 'var(--accent-purple)' }}>
              {account.diaCierre || 1} de cada mes
            </p>
          </div>
        </div>
        <svg className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    );
  }

  return (
    <div
      className="p-4 rounded-xl mb-4"
      style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
        Día de cierre del resumen
      </p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={diaCierre}
          onChange={(e) => setDiaCierre(e.target.value)}
          min="1"
          max="31"
          className="flex-1 px-3 py-2 rounded-lg text-center font-semibold transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-purple)]"
          style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          autoFocus
        />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>de cada mes</span>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => {
            setDiaCierre(account.diaCierre?.toString() || '1');
            setIsEditing(false);
          }}
          className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent-purple)' }}
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
