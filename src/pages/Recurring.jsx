import React, { useState, useMemo } from 'react';
import { useRecurringTransactions } from '../hooks/useRecurringTransactions';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useError } from '../contexts/ErrorContext';
import {
  addRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  pauseRecurringTransaction,
  resumeRecurringTransaction,
  skipNextOccurrence,
  confirmOccurrence,
  skipOccurrence,
} from '../services/supabaseApi';
import RecurringCard from '../components/recurring/RecurringCard';
import RecurringModal from '../components/recurring/RecurringModal';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency } from '../utils/format';

function Recurring() {
  const { showError } = useError();
  const {
    recurring,
    activeRecurring,
    pausedRecurring,
    pendingOccurrences,
    monthlyExpenseTotal,
    monthlyIncomeTotal,
    monthlyBalance,
    getUpcomingOccurrences,
    loading,
    refetch,
  } = useRecurringTransactions();
  const { accounts } = useAccounts();
  const { categoriesWithId } = useCategories();

  const [filter, setFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editingRecurring, setEditingRecurring] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Multi-select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filter recurring based on current filters
  const filteredRecurring = useMemo(() => {
    let result = recurring;

    // Status filter
    switch (filter) {
      case 'active':
        result = result.filter(r => r.isActive && !r.isPaused);
        break;
      case 'paused':
        result = result.filter(r => r.isActive && r.isPaused);
        break;
      case 'inactive':
        result = result.filter(r => !r.isActive);
        break;
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(r => r.type === typeFilter);
    }

    return result;
  }, [filter, typeFilter, recurring]);

  const upcomingOccurrences = getUpcomingOccurrences();

  const handleSave = async (data) => {
    try {
      setSaving(true);

      if (data.id) {
        await updateRecurringTransaction(data);
        setToast({ message: 'Recurrente actualizado', type: 'success' });
      } else {
        await addRecurringTransaction(data);
        setToast({ message: 'Recurrente creado', type: 'success' });
      }

      setIsAdding(false);
      setEditingRecurring(null);
      await refetch();
    } catch (err) {
      console.error('Error saving recurring:', err);
      showError('Error', err.message || 'No se pudo guardar el recurrente');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (recurring) => {
    try {
      setSaving(true);
      await deleteRecurringTransaction(recurring.id);
      setToast({ message: 'Recurrente eliminado', type: 'success' });
      setEditingRecurring(null);
      await refetch();
    } catch (err) {
      console.error('Error deleting recurring:', err);
      showError('Error', err.message || 'No se pudo eliminar el recurrente');
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async (recurring) => {
    try {
      if (recurring.isPaused) {
        await resumeRecurringTransaction(recurring.id);
        setToast({ message: 'Recurrente reanudado', type: 'success' });
      } else {
        await pauseRecurringTransaction(recurring.id);
        setToast({ message: 'Recurrente pausado', type: 'success' });
      }
      await refetch();
    } catch (err) {
      console.error('Error toggling pause:', err);
      showError('Error', err.message || 'No se pudo cambiar el estado');
    }
  };

  const handleSkipNext = async (recurring) => {
    try {
      await skipNextOccurrence(recurring.id);
      setToast({ message: 'Próxima ocurrencia saltada', type: 'success' });
      await refetch();
    } catch (err) {
      console.error('Error skipping:', err);
      showError('Error', err.message || 'No se pudo saltar la ocurrencia');
    }
  };

  const handleConfirmOccurrence = async (occurrence) => {
    try {
      await confirmOccurrence(occurrence.id);
      setToast({ message: 'Movimiento creado', type: 'success' });
      await refetch();
    } catch (err) {
      console.error('Error confirming:', err);
      showError('Error', err.message || 'No se pudo confirmar');
    }
  };

  const handleSkipOccurrence = async (occurrence) => {
    try {
      await skipOccurrence(occurrence.id);
      setToast({ message: 'Ocurrencia saltada', type: 'success' });
      await refetch();
    } catch (err) {
      console.error('Error skipping:', err);
      showError('Error', err.message || 'No se pudo saltar');
    }
  };

  // Multi-select handlers
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredRecurring.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecurring.map(r => r.id)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      setSaving(true);
      const deletePromises = Array.from(selectedIds).map(id => deleteRecurringTransaction(id));
      await Promise.all(deletePromises);
      setToast({ message: `${selectedIds.size} recurrente${selectedIds.size !== 1 ? 's' : ''} eliminado${selectedIds.size !== 1 ? 's' : ''}`, type: 'success' });
      setSelectedIds(new Set());
      setSelectMode(false);
      setShowDeleteConfirm(false);
      await refetch();
    } catch (err) {
      console.error('Error deleting:', err);
      showError('Error', err.message || 'No se pudieron eliminar');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkPause = async () => {
    try {
      setSaving(true);
      const pausePromises = Array.from(selectedIds).map(id => {
        const r = filteredRecurring.find(rec => rec.id === id);
        return r?.isPaused ? resumeRecurringTransaction(id) : pauseRecurringTransaction(id);
      });
      await Promise.all(pausePromises);
      setToast({ message: 'Estado actualizado', type: 'success' });
      setSelectedIds(new Set());
      setSelectMode(false);
      await refetch();
    } catch (err) {
      console.error('Error pausing:', err);
      showError('Error', err.message || 'No se pudo cambiar el estado');
    } finally {
      setSaving(false);
    }
  };

  const statusFilters = [
    { id: 'active', label: 'Activos', count: activeRecurring.length },
    { id: 'paused', label: 'Pausados', count: pausedRecurring.length },
    { id: 'all', label: 'Todos', count: recurring.length },
  ];

  const typeFilters = [
    { id: 'all', label: 'Todos' },
    { id: 'expense', label: 'Gastos', color: 'var(--accent-red)' },
    { id: 'income', label: 'Ingresos', color: 'var(--accent-green)' },
    { id: 'transfer', label: 'Transferencias', color: 'var(--accent-blue)' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Transacciones Recurrentes
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Suscripciones, alquiler, sueldo y más
          </p>
        </div>
        <div className="flex items-center gap-2">
          {recurring.length > 0 && !selectMode && (
            <button
              onClick={toggleSelectMode}
              className="p-2 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              title="Selección múltiple"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h7M4 12h7m-7 7h7m5-14v14m0-14l3 3m-3-3l-3 3m3 11l3-3m-3 3l-3-3" />
              </svg>
            </button>
          )}
          {!selectMode && (
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Nuevo recurrente</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div
          className="p-4 rounded-2xl"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Gastos mensuales
          </p>
          <p className="text-lg font-bold" style={{ color: 'var(--accent-red)' }}>
            {formatCurrency(monthlyExpenseTotal, 'Peso')}
          </p>
        </div>
        <div
          className="p-4 rounded-2xl"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Ingresos mensuales
          </p>
          <p className="text-lg font-bold" style={{ color: 'var(--accent-green)' }}>
            {formatCurrency(monthlyIncomeTotal, 'Peso')}
          </p>
        </div>
        <div
          className="p-4 rounded-2xl"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            Balance mensual
          </p>
          <p
            className="text-lg font-bold"
            style={{ color: monthlyBalance >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
          >
            {formatCurrency(monthlyBalance, 'Peso')}
          </p>
        </div>
      </div>

      {/* Pending occurrences */}
      {pendingOccurrences.length > 0 && (
        <div
          className="p-4 rounded-2xl"
          style={{ backgroundColor: 'var(--accent-yellow-dim)', border: '1px solid var(--accent-yellow)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5" style={{ color: 'var(--accent-yellow)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-semibold" style={{ color: 'var(--accent-yellow)' }}>
              Pendientes de confirmación ({pendingOccurrences.length})
            </h3>
          </div>
          <div className="space-y-2">
            {pendingOccurrences.slice(0, 3).map((occ) => (
              <div
                key={occ.id}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                    {occ.recurring?.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatCurrency(occ.recurring?.amount, occ.recurring?.currency === 'USD' ? 'Dólar' : 'Peso')}
                    {' • '}
                    {new Date(occ.scheduled_date + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirmOccurrence(occ)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: 'var(--accent-green-dim)', color: 'var(--accent-green)' }}
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => handleSkipOccurrence(occ)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                  >
                    Saltar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming this week */}
      {upcomingOccurrences.length > 0 && (
        <div
          className="p-4 rounded-2xl"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Próximos 7 días
          </h3>
          <div className="space-y-2">
            {upcomingOccurrences.slice(0, 5).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: r.type === 'expense' ? 'var(--accent-red)' :
                        r.type === 'income' ? 'var(--accent-green)' : 'var(--accent-blue)'
                    }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{r.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(r.amount, r.currency === 'USD' ? 'Dólar' : 'Peso')}
                  </span>
                  <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>
                    {new Date(r.nextExecutionDate + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-select toolbar */}
      {selectMode && (
        <div
          className="flex items-center justify-between p-3 rounded-xl"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)' }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectMode}
              className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button
              onClick={selectAll}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-[var(--bg-tertiary)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              <div
                className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                style={{
                  borderColor: selectedIds.size === filteredRecurring.length && filteredRecurring.length > 0 ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  backgroundColor: selectedIds.size === filteredRecurring.length && filteredRecurring.length > 0 ? 'var(--accent-primary)' : 'transparent',
                }}
              >
                {selectedIds.size === filteredRecurring.length && filteredRecurring.length > 0 && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              Todos
            </button>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}
            </span>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleBulkPause}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              >
                Pausar/Reanudar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--accent-red-dim)', color: 'var(--accent-red)' }}
              >
                Eliminar ({selectedIds.size})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Status filter */}
        <div
          className="flex gap-1 p-1 rounded-xl flex-1"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          {statusFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1
                ${filter === f.id ? 'shadow-sm' : 'hover:opacity-80'}
              `}
              style={{
                backgroundColor: filter === f.id ? 'var(--bg-primary)' : 'transparent',
                color: filter === f.id ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              {f.label}
              {f.count > 0 && (
                <span
                  className="px-1.5 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor: filter === f.id ? 'var(--accent-primary-dim)' : 'var(--bg-tertiary)',
                    color: filter === f.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                  }}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div
          className="flex gap-1 p-1 rounded-xl"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          {typeFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: typeFilter === f.id ? 'var(--bg-primary)' : 'transparent',
                color: typeFilter === f.id ? (f.color || 'var(--text-primary)') : 'var(--text-muted)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recurring grid */}
      {filteredRecurring.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div
            className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: 'var(--text-muted)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
            {filter === 'active' && 'No hay recurrentes activos'}
            {filter === 'paused' && 'No hay recurrentes pausados'}
            {filter === 'all' && 'No hay transacciones recurrentes'}
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            {filter === 'all' || filter === 'active'
              ? 'Crea tu primera transacción recurrente'
              : 'Los recurrentes pausados aparecerán aquí'}
          </p>
          {(filter === 'all' || filter === 'active') && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
            >
              + Crear recurrente
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecurring.map((r) => (
            <div key={r.id} className="relative">
              {selectMode && (
                <button
                  onClick={() => toggleSelect(r.id)}
                  className="absolute top-3 left-3 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: selectedIds.has(r.id) ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    backgroundColor: selectedIds.has(r.id) ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  }}
                >
                  {selectedIds.has(r.id) && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )}
              <RecurringCard
                recurring={r}
                onClick={() => selectMode ? toggleSelect(r.id) : setEditingRecurring(r)}
                onPause={selectMode ? undefined : handlePause}
                selectMode={selectMode}
                isSelected={selectedIds.has(r.id)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAdding || editingRecurring) && (
        <RecurringModal
          recurring={editingRecurring}
          accounts={accounts}
          categories={categoriesWithId}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => {
            setIsAdding(false);
            setEditingRecurring(null);
          }}
          loading={saving}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="text-center">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255, 92, 114, 0.12)', boxShadow: '0 0 30px rgba(255, 92, 114, 0.2)' }}
              >
                <svg className="w-8 h-8" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Eliminar recurrentes
              </h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                ¿Estás seguro de que quieres eliminar {selectedIds.size} recurrente{selectedIds.size !== 1 ? 's' : ''}?
                <br />
                <span className="text-xs mt-1 inline-block" style={{ color: 'var(--text-muted)' }}>
                  Los movimientos ya creados no se eliminarán
                </span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent-red)', boxShadow: '0 4px 20px rgba(255, 92, 114, 0.3)' }}
                >
                  {saving ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recurring;
