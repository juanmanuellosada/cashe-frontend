import React, { useState, useMemo } from 'react';
import { useBudgets } from '../hooks/useBudgets';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useError } from '../contexts/ErrorContext';
import {
  addBudget,
  updateBudget,
  deleteBudget,
  duplicateBudget,
  toggleBudgetPause,
} from '../services/supabaseApi';
import BudgetCard from '../components/budgets/BudgetCard';
import BudgetModal from '../components/budgets/BudgetModal';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

function Budgets() {
  const { showError } = useError();
  const { budgets, activeBudgets, pausedBudgets, exceededBudgets, loading, refetch } = useBudgets();
  const { accounts } = useAccounts();
  const { categoriesWithId } = useCategories();

  const [filter, setFilter] = useState('active'); // 'active' | 'paused' | 'exceeded' | 'all'
  const [editingBudget, setEditingBudget] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Multi-select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filter budgets based on current filter
  const filteredBudgets = useMemo(() => {
    switch (filter) {
      case 'active':
        return activeBudgets;
      case 'paused':
        return pausedBudgets;
      case 'exceeded':
        return exceededBudgets;
      case 'all':
      default:
        return budgets;
    }
  }, [filter, budgets, activeBudgets, pausedBudgets, exceededBudgets]);

  const handleSave = async (budgetData) => {
    try {
      setSaving(true);

      if (budgetData.id) {
        await updateBudget(budgetData);
        setToast({ message: 'Presupuesto actualizado', type: 'success' });
      } else {
        await addBudget(budgetData);
        setToast({ message: 'Presupuesto creado', type: 'success' });
      }

      setIsAdding(false);
      setEditingBudget(null);
      await refetch();
    } catch (err) {
      console.error('Error saving budget:', err);
      showError('Error', err.message || 'No se pudo guardar el presupuesto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (budget) => {
    try {
      setSaving(true);
      await deleteBudget(budget.id);
      setToast({ message: 'Presupuesto eliminado', type: 'success' });
      setEditingBudget(null);
      await refetch();
    } catch (err) {
      console.error('Error deleting budget:', err);
      showError('Error', err.message || 'No se pudo eliminar el presupuesto');
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (budget) => {
    try {
      setSaving(true);
      await duplicateBudget(budget.id);
      setToast({ message: 'Presupuesto duplicado', type: 'success' });
      setEditingBudget(null);
      await refetch();
    } catch (err) {
      console.error('Error duplicating budget:', err);
      showError('Error', err.message || 'No se pudo duplicar el presupuesto');
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async (budget) => {
    try {
      await toggleBudgetPause(budget.id);
      setToast({
        message: budget.is_paused ? 'Presupuesto reanudado' : 'Presupuesto pausado',
        type: 'success',
      });
      await refetch();
    } catch (err) {
      console.error('Error toggling pause:', err);
      showError('Error', err.message || 'No se pudo cambiar el estado');
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
    if (selectedIds.size === filteredBudgets.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBudgets.map(b => b.id)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      setSaving(true);
      const deletePromises = Array.from(selectedIds).map(id => deleteBudget(id));
      await Promise.all(deletePromises);
      setToast({ message: `${selectedIds.size} presupuesto${selectedIds.size !== 1 ? 's' : ''} eliminado${selectedIds.size !== 1 ? 's' : ''}`, type: 'success' });
      setSelectedIds(new Set());
      setSelectMode(false);
      setShowDeleteConfirm(false);
      await refetch();
    } catch (err) {
      console.error('Error deleting budgets:', err);
      showError('Error', err.message || 'No se pudieron eliminar los presupuestos');
    } finally {
      setSaving(false);
    }
  };

  const filters = [
    { id: 'active', label: 'Activos', count: activeBudgets.length },
    { id: 'paused', label: 'Pausados', count: pausedBudgets.length },
    { id: 'exceeded', label: 'Excedidos', count: exceededBudgets.length },
    { id: 'all', label: 'Todos', count: budgets.length },
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
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            Presupuestos
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Controla tus límites de gasto
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Select mode toggle */}
          {budgets.length > 0 && !selectMode && (
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
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Nuevo presupuesto</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          )}
        </div>
      </div>

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
              title="Cancelar selección"
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
                  borderColor: selectedIds.size === filteredBudgets.length && filteredBudgets.length > 0 ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  backgroundColor: selectedIds.size === filteredBudgets.length && filteredBudgets.length > 0 ? 'var(--accent-primary)' : 'transparent',
                }}
              >
                {selectedIds.size === filteredBudgets.length && filteredBudgets.length > 0 && (
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
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--accent-red-dim)',
                color: 'var(--accent-red)',
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar ({selectedIds.size})
            </button>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div
        className="flex gap-1 p-1 rounded-xl overflow-x-auto"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`
              flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
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

      {/* Summary stats */}
      {exceededBudgets.length > 0 && filter !== 'exceeded' && (
        <div
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{
            backgroundColor: 'var(--accent-red-dim)',
            border: '1px solid var(--accent-red)',
          }}
        >
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: 'var(--accent-red)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-sm" style={{ color: 'var(--accent-red)' }}>
            Tienes {exceededBudgets.length} presupuesto{exceededBudgets.length !== 1 ? 's' : ''} excedido{exceededBudgets.length !== 1 ? 's' : ''} este período
          </p>
        </div>
      )}

      {/* Budget grid */}
      {filteredBudgets.length === 0 ? (
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p
            className="font-medium mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {filter === 'active' && 'No hay presupuestos activos'}
            {filter === 'paused' && 'No hay presupuestos pausados'}
            {filter === 'exceeded' && 'No hay presupuestos excedidos'}
            {filter === 'all' && 'No hay presupuestos'}
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            {filter === 'all' || filter === 'active'
              ? 'Crea tu primer presupuesto para controlar tus gastos'
              : 'Los presupuestos aparecerán aquí'}
          </p>
          {(filter === 'all' || filter === 'active') && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
              }}
            >
              + Crear presupuesto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBudgets.map((budget) => (
            <div key={budget.id} className="relative">
              {selectMode && (
                <button
                  onClick={() => toggleSelect(budget.id)}
                  className="absolute top-3 left-3 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: selectedIds.has(budget.id) ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    backgroundColor: selectedIds.has(budget.id) ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  }}
                >
                  {selectedIds.has(budget.id) && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )}
              <BudgetCard
                budget={budget}
                categories={categoriesWithId}
                accounts={accounts}
                onClick={() => selectMode ? toggleSelect(budget.id) : setEditingBudget(budget)}
                onPause={selectMode ? undefined : handlePause}
              />
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAdding || editingBudget) && (
        <BudgetModal
          budget={editingBudget}
          categories={categoriesWithId}
          accounts={accounts}
          onSave={handleSave}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onClose={() => {
            setIsAdding(false);
            setEditingBudget(null);
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
                style={{
                  backgroundColor: 'rgba(255, 92, 114, 0.12)',
                  boxShadow: '0 0 30px rgba(255, 92, 114, 0.2)'
                }}
              >
                <svg className="w-8 h-8" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                Eliminar presupuestos
              </h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                ¿Estás seguro de que quieres eliminar {selectedIds.size} presupuesto{selectedIds.size !== 1 ? 's' : ''}?
                <br />
                <span className="text-xs mt-1 inline-block" style={{ color: 'var(--text-muted)' }}>
                  Esta acción no se puede deshacer
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
                  style={{
                    backgroundColor: 'var(--accent-red)',
                    boxShadow: '0 4px 20px rgba(255, 92, 114, 0.3)'
                  }}
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

export default Budgets;
