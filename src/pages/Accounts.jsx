import { useState, useEffect, useMemo } from 'react';
import { getAccounts, addAccount, updateAccount, deleteAccount } from '../services/sheetsApi';
import { formatCurrency } from '../utils/format';

function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState({});

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

  // Calculate total balance across all accounts (in pesos)
  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => {
      const balance = acc.balanceActual || 0;
      // Assuming tipoCambio is available or use a default
      if (acc.moneda === 'Peso') {
        return sum + balance;
      } else {
        // Convert USD to pesos (rough estimate, would need actual exchange rate)
        return sum + (balance * (acc.tipoCambio || 1000));
      }
    }, 0);
  }, [accounts]);

  const handleAdd = async (formData) => {
    try {
      setSaving(true);
      await addAccount(formData);
      setIsAdding(false);
      fetchAccounts();
    } catch (err) {
      console.error('Error adding account:', err);
      alert('Error al crear: ' + err.message);
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
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rowIndex) => {
    if (!window.confirm('¿Estas seguro de que quieres eliminar esta cuenta? Los movimientos asociados no se eliminarán.')) return;
    try {
      setSaving(true);
      await deleteAccount(rowIndex);
      setEditingAccount(null);
      fetchAccounts();
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('Error al eliminar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleDetails = (accountName) => {
    setShowDetails(prev => ({
      ...prev,
      [accountName]: !prev[accountName]
    }));
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
    const balance = account.balanceActual || 0;
    const balanceInPesos = account.moneda === 'Peso'
      ? balance
      : balance * (account.tipoCambio || 1000);
    return Math.min(100, Math.max(0, (balanceInPesos / totalBalance) * 100));
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Cuentas
        </h2>
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
        <div className="space-y-3">
          {accounts.map((account) => {
            const percentage = getAccountPercentage(account);
            const isExpanded = showDetails[account.nombre];

            return (
              <div
                key={account.nombre}
                className="rounded-2xl overflow-hidden transition-all duration-200"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                {/* Main row - always visible */}
                <button
                  onClick={() => toggleDetails(account.nombre)}
                  className="w-full p-4 flex items-center gap-3 text-left transition-colors hover:bg-[var(--bg-tertiary)]"
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
                    <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
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
                      {account.moneda === 'Peso'
                        ? formatCurrency(account.balanceActual, 'ARS')
                        : formatCurrency(account.balanceActual, 'USD')}
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

                {/* Expanded details */}
                {isExpanded && (
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
          onDelete={() => handleDelete(editingAccount.rowIndex)}
          onClose={() => setEditingAccount(null)}
          loading={saving}
        />
      )}
    </div>
  );
}

function AccountModal({ account, onSave, onDelete, onClose, loading }) {
  const isEditing = !!account;
  const [formData, setFormData] = useState({
    rowIndex: account?.rowIndex,
    nombre: account?.nombre || '',
    balanceInicial: account?.balanceInicial?.toString() || '0',
    moneda: account?.moneda || 'Peso',
    numeroCuenta: account?.numeroCuenta || '',
    tipo: account?.tipo || '',
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
            </label>
            <div className="grid grid-cols-2 gap-3">
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
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, moneda: 'Dólar estadounidense' }))}
                className="flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all duration-200"
                style={{
                  backgroundColor: formData.moneda === 'Dólar estadounidense' ? '#3CB371' : 'var(--bg-tertiary)',
                  color: formData.moneda === 'Dólar estadounidense' ? 'white' : 'var(--text-secondary)',
                }}
              >
                <span className="font-bold">US$</span>
                USD
              </button>
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

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Tipo
            </label>
            <input
              type="text"
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              placeholder="Ej: Caja de ahorro, Cuenta corriente..."
              className="w-full px-4 py-3 rounded-xl transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              required
            />
          </div>

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
