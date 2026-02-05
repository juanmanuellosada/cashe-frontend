import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { getAccounts, clearCache, addAccount, updateAccount, deleteAccount, bulkDeleteAccounts } from '../services/supabaseApi';
import { formatCurrency } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import SortDropdown from '../components/SortDropdown';
import AccountModal from '../components/AccountModal';
import { useError } from '../contexts/ErrorContext';
import { isEmoji, resolveIconPath } from '../services/iconStorage';
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
                        {/* Row 1: Name + Hidden indicator + Chevron */}
                        <div className="flex items-center gap-1">
                          <p
                            className="font-semibold text-sm leading-tight truncate flex-1"
                            style={{ color: 'var(--text-primary)' }}
                            title={account.nombre}
                          >
                            {account.nombre}
                          </p>
                          {/* Hidden from balance indicator */}
                          {account.ocultaDelBalance && (
                            <div
                              className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center"
                              style={{ backgroundColor: 'var(--bg-tertiary)' }}
                              title="Oculta del balance"
                            >
                              <svg
                                className="w-3 h-3"
                                style={{ color: 'var(--text-muted)' }}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                              </svg>
                            </div>
                          )}
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

export default Accounts;

// Componente para mostrar/editar días de cierre y vencimiento
function ClosingDayEditor({ account, onSave, loading }) {
  const [isEditing, setIsEditing] = useState(false);
  const [diaCierre, setDiaCierre] = useState(account.diaCierre?.toString() || '1');
  const [diaVencimiento, setDiaVencimiento] = useState(account.diaVencimiento?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const newCierre = parseInt(diaCierre) || 1;
    const newVencimiento = parseInt(diaVencimiento) || null;

    // Validate that closing and due days are different
    if (newVencimiento && newCierre === newVencimiento) {
      setError('El día de cierre y vencimiento no pueden ser iguales');
      return;
    }

    if (newCierre === account.diaCierre && newVencimiento === account.diaVencimiento) {
      setIsEditing(false);
      return;
    }

    setSaving(true);
    setError('');
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
        diaCierre: newCierre,
        diaVencimiento: newVencimiento,
        icon: account.icon,
        ocultaDelBalance: account.ocultaDelBalance,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating card dates:', err);
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
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Cierre</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--accent-purple)' }}>
                  Día {account.diaCierre || 1}
                </p>
              </div>
              <div className="w-px h-6" style={{ backgroundColor: 'var(--border-subtle)' }} />
              <div>
                <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Vencimiento</p>
                <p className="text-sm font-semibold" style={{ color: account.diaVencimiento ? 'var(--accent-purple)' : 'var(--text-muted)' }}>
                  {account.diaVencimiento ? `Día ${account.diaVencimiento}` : 'Sin definir'}
                </p>
              </div>
            </div>
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
        Fechas de la tarjeta
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Día de cierre</label>
          <input
            type="number"
            value={diaCierre}
            onChange={(e) => setDiaCierre(e.target.value)}
            min="1"
            max="31"
            className="w-full px-3 py-2 rounded-lg text-center font-semibold transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-purple)]"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            autoFocus
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--text-secondary)' }}>Día de vencimiento</label>
          <input
            type="number"
            value={diaVencimiento}
            onChange={(e) => setDiaVencimiento(e.target.value)}
            min="1"
            max="31"
            placeholder="—"
            className="w-full px-3 py-2 rounded-lg text-center font-semibold transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-purple)]"
            style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>
      {error && (
        <p className="text-xs mt-2" style={{ color: 'var(--accent-red)' }}>{error}</p>
      )}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => {
            setDiaCierre(account.diaCierre?.toString() || '1');
            setDiaVencimiento(account.diaVencimiento?.toString() || '');
            setError('');
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
