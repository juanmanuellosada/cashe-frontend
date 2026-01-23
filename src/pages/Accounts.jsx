import { useState, useEffect, useMemo } from 'react';
import { getAccounts, addAccount, updateAccount, deleteAccount, bulkDeleteAccounts } from '../services/supabaseApi';
import { formatCurrency } from '../utils/format';
import ConfirmModal from '../components/ConfirmModal';
import { useError } from '../contexts/ErrorContext';

function Accounts() {
  const { showError } = useError();
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

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const data = await getAccounts();
      setAccounts(data.accounts || []);
    } catch (err) {
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total balance across all accounts based on displayCurrency
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => {
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
      fetchAccounts();
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
      fetchAccounts();
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
      fetchAccounts();
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
      fetchAccounts();
    } catch (err) {
      console.error('Error bulk deleting accounts:', err);
      showError('No se pudieron eliminar las cuentas', err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleDetails = (accountName) => {
    setShowDetails(prev => {
      const isOpen = !!prev[accountName];
      // Solo dejar abierto el que se clickeó; si ya estaba abierto, cierra todos.
      return isOpen ? {} : { [accountName]: true };
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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Cuentas
        </h2>
        <div className="flex items-center gap-3">
          {/* Currency Selector - Premium design */}
          <div
            className="inline-flex rounded-xl p-1"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <button
              onClick={() => setDisplayCurrency('original')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 active:scale-95"
              style={{
                backgroundColor: displayCurrency === 'original' ? 'var(--accent-blue)' : 'transparent',
                color: displayCurrency === 'original' ? 'white' : 'var(--text-secondary)',
                boxShadow: displayCurrency === 'original' ? '0 4px 12px var(--accent-blue-glow)' : 'none',
              }}
            >
              Original
            </button>
            <button
              onClick={() => setDisplayCurrency('ARS')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 active:scale-95"
              style={{
                backgroundColor: displayCurrency === 'ARS' ? 'var(--accent-primary)' : 'transparent',
                color: displayCurrency === 'ARS' ? 'white' : 'var(--text-secondary)',
                boxShadow: displayCurrency === 'ARS' ? '0 4px 12px var(--accent-primary-glow)' : 'none',
              }}
            >
              ARS
            </button>
            <button
              onClick={() => setDisplayCurrency('USD')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 active:scale-95"
              style={{
                backgroundColor: displayCurrency === 'USD' ? 'var(--accent-green)' : 'transparent',
                color: displayCurrency === 'USD' ? 'white' : 'var(--text-secondary)',
                boxShadow: displayCurrency === 'USD' ? '0 4px 12px rgba(0, 217, 154, 0.3)' : 'none',
              }}
            >
              USD
            </button>
          </div>
          
          {/* Selection mode toggle */}
          {accounts.length > 0 && (
            <button
              onClick={toggleSelectionMode}
              className={`p-2.5 rounded-xl transition-all duration-200 ${selectionMode ? 'ring-2 ring-offset-2' : ''}`}
              style={{ 
                backgroundColor: selectionMode ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: selectionMode ? 'white' : 'var(--text-secondary)',
                ringColor: 'var(--accent-primary)',
                ringOffsetColor: 'var(--bg-primary)'
              }}
              title={selectionMode ? 'Cancelar selección' : 'Seleccionar múltiples'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h7M4 12h7m-7 7h7m5-14v14m0-14l3 3m-3-3l-3 3m3 11l3-3m-3 3l-3-3" />
              </svg>
            </button>
          )}
          
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 hover:opacity-90 flex items-center gap-2"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva
          </button>
        </div>
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
        <div className="space-y-3 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-4 lg:space-y-0">
          {accounts.map((account) => {
            const percentage = getAccountPercentage(account);
            const isExpanded = showDetails[account.nombre];
            const displayBalance = getDisplayBalance(account);
            const isSelected = selectedAccounts.has(account.id);

            return (
              <div
                key={account.nombre}
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
                    onClick={() => selectionMode ? toggleAccountSelection(account.id) : toggleDetails(account.nombre)}
                    className={`flex-1 p-4 ${selectionMode ? 'pl-0' : ''} flex items-center gap-3 text-left transition-colors hover:bg-[var(--bg-tertiary)]`}
                  >
                    {/* Currency icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: account.moneda === 'Peso'
                          ? 'rgba(117, 170, 219, 0.15)'
                          : 'rgba(60, 179, 113, 0.15)',
                      }}
                    >
                      <span
                        className="text-lg font-bold"
                        style={{
                          color: account.moneda === 'Peso' ? '#75AADB' : '#3CB371',
                        }}
                      >
                      {account.moneda === 'Peso' ? '$' : 'US$'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="font-semibold text-sm leading-tight"
                      style={{
                        color: 'var(--text-primary)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                      title={account.nombre}
                    >
                      {account.nombre}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {account.moneda === 'Peso' ? 'ARS' : 'USD'} {account.tipo && `· ${account.tipo}`}
                    </p>
                    {/* Progress bar */}
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: 'var(--accent-primary)',
                        }}
                      />
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold" style={{ color: 'var(--accent-primary)' }}>
                      {formatCurrency(displayBalance.value, displayBalance.currency)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {percentage.toFixed(1)}% del total
                    </p>
                  </div>

                  {/* Chevron with rotation */}
                  <svg
                    className={`w-5 h-5 ml-1 flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    style={{ color: 'var(--text-secondary)' }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                </div>

                {/* Expanded details */}
                {isExpanded && !selectionMode && (
                  <div
                    className="px-4 pb-4 pt-2 animate-scale-in"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
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

                    {/* Día de cierre para tarjetas de crédito */}
                    {account.esTarjetaCredito && (
                      <ClosingDayEditor
                        account={account}
                        onSave={handleSave}
                        loading={saving}
                      />
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
          })}
        </div>
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
  });

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
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto animate-scale-in"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isEditing ? 'Editar Cuenta' : 'Nueva Cuenta'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Nombre
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Balance Inicial
            </label>
            <input
              type="number"
              name="balanceInicial"
              value={formData.balanceInicial}
              onChange={handleChange}
              step="0.01"
              className="w-full px-4 py-3 rounded-xl transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Moneda
              {formData.esTarjetaCredito && (
                <span className="ml-2 text-xs font-normal" style={{ color: 'var(--accent-purple)' }}>
                  (Solo ARS para tarjetas)
                </span>
              )}
            </label>
            <div className={`grid gap-3 ${formData.esTarjetaCredito ? 'grid-cols-1' : 'grid-cols-2'}`}>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, moneda: 'Peso' }))}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-200"
                style={{
                  backgroundColor: formData.moneda === 'Peso' ? '#75AADB' : 'var(--bg-tertiary)',
                  color: formData.moneda === 'Peso' ? 'white' : 'var(--text-secondary)',
                }}
              >
                <span className="font-bold">$</span>
                ARS
              </button>
              {!formData.esTarjetaCredito && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, moneda: 'Dólar' }))}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-200"
                  style={{
                    backgroundColor: formData.moneda === 'Dólar' ? '#3CB371' : 'var(--bg-tertiary)',
                    color: formData.moneda === 'Dólar' ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  <span className="font-bold">US$</span>
                  USD
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Numero de Cuenta (opcional)
            </label>
            <input
              type="text"
              name="numeroCuenta"
              value={formData.numeroCuenta}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Tipo de cuenta - Selector unificado */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Tipo de cuenta
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'Caja de ahorro', icon: '🏦', label: 'Caja de ahorro' },
                { value: 'Cuenta corriente', icon: '💼', label: 'Cuenta corriente' },
                { value: 'Tarjeta de crédito', icon: '💳', label: 'Tarjeta de crédito' },
                { value: 'Billetera virtual', icon: '📱', label: 'Billetera virtual' },
                { value: 'Efectivo', icon: '💵', label: 'Efectivo' },
                { value: 'Inversiones', icon: '📈', label: 'Inversiones' },
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
                      // Tarjetas de crédito solo en pesos
                      ...(isCreditCard ? { moneda: 'Peso' } : {}),
                    }))}
                    className="flex items-center gap-2 p-3 rounded-xl font-medium transition-all duration-200 text-left"
                    style={{
                      backgroundColor: isSelected
                        ? (isCreditCard ? 'var(--accent-purple)' : 'var(--accent-primary)')
                        : 'var(--bg-tertiary)',
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                      border: isSelected ? 'none' : '1px solid var(--border-subtle)',
                    }}
                  >
                    <span className="text-lg">{tipo.icon}</span>
                    <span className="text-sm">{tipo.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Día de cierre - solo visible si es tarjeta de crédito */}
          {formData.esTarjetaCredito && (
            <div
              className="p-4 rounded-xl"
              style={{ backgroundColor: 'var(--accent-purple-dim)', border: '1px solid var(--accent-purple)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--accent-purple)' }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Día de cierre</p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Para calcular resúmenes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  name="diaCierre"
                  value={formData.diaCierre}
                  onChange={handleChange}
                  min="1"
                  max="31"
                  className="flex-1 px-4 py-3 rounded-xl transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-purple)] text-center text-lg font-semibold"
                  style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>de cada mes</span>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={loading}
                className="px-4 py-3 rounded-xl font-medium disabled:opacity-50 transition-all duration-200 hover:opacity-80"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' }}
              >
                Eliminar
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !formData.nombre}
              className="flex-1 py-3 rounded-xl font-semibold text-white disabled:opacity-50 transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? 'Guardar' : 'Crear'}
            </button>
          </div>
        </form>
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
        style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}
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
      style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)' }}
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
