import React, { useState, useMemo } from 'react';
import { useGoals } from '../hooks/useGoals';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useError } from '../contexts/ErrorContext';
import {
  addGoal,
  updateGoal,
  deleteGoal,
} from '../services/supabaseApi';
import GoalCard from '../components/goals/GoalCard';
import GoalModal from '../components/goals/GoalModal';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

function Goals() {
  const { showError } = useError();
  const { goals, activeGoals, completedGoals, successRate, loading, refetch } = useGoals();
  const { accounts } = useAccounts();
  const { categoriesWithId } = useCategories();

  const [filter, setFilter] = useState('active'); // 'active' | 'completed' | 'all'
  const [editingGoal, setEditingGoal] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Multi-select mode
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filter goals based on current filter
  const filteredGoals = useMemo(() => {
    switch (filter) {
      case 'active':
        return activeGoals;
      case 'completed':
        return completedGoals;
      case 'all':
      default:
        return goals;
    }
  }, [filter, goals, activeGoals, completedGoals]);

  const handleSave = async (goalData) => {
    try {
      setSaving(true);

      if (goalData.id) {
        await updateGoal(goalData);
        setToast({ message: 'Meta actualizada', type: 'success' });
      } else {
        await addGoal(goalData);
        setToast({ message: 'Meta creada', type: 'success' });
      }

      setIsAdding(false);
      setEditingGoal(null);
      await refetch();
    } catch (err) {
      console.error('Error saving goal:', err);
      showError('Error', err.message || 'No se pudo guardar la meta');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (goal) => {
    try {
      setSaving(true);
      await deleteGoal(goal.id);
      setToast({ message: 'Meta eliminada', type: 'success' });
      setEditingGoal(null);
      await refetch();
    } catch (err) {
      console.error('Error deleting goal:', err);
      showError('Error', err.message || 'No se pudo eliminar la meta');
    } finally {
      setSaving(false);
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
    if (selectedIds.size === filteredGoals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredGoals.map(g => g.id)));
    }
  };

  const handleBulkDelete = async () => {
    try {
      setSaving(true);
      const deletePromises = Array.from(selectedIds).map(id => deleteGoal(id));
      await Promise.all(deletePromises);
      setToast({ message: `${selectedIds.size} meta${selectedIds.size !== 1 ? 's' : ''} eliminada${selectedIds.size !== 1 ? 's' : ''}`, type: 'success' });
      setSelectedIds(new Set());
      setSelectMode(false);
      setShowDeleteConfirm(false);
      await refetch();
    } catch (err) {
      console.error('Error deleting goals:', err);
      showError('Error', err.message || 'No se pudieron eliminar las metas');
    } finally {
      setSaving(false);
    }
  };

  const filters = [
    { id: 'active', label: 'Activas', count: activeGoals.length },
    { id: 'completed', label: 'Completadas', count: completedGoals.length },
    { id: 'all', label: 'Todas', count: goals.length },
  ];

  // Calculate streak (consecutive completed goals)
  const completedCount = completedGoals.filter(g => g.percentageAchieved >= 100).length;

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
            Metas
          </h1>
          <p
            className="text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Alcanza tus objetivos financieros
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Select mode toggle */}
          {goals.length > 0 && !selectMode && (
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
              <span className="hidden sm:inline">Nueva meta</span>
              <span className="sm:hidden">Nueva</span>
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
                  borderColor: selectedIds.size === filteredGoals.length && filteredGoals.length > 0 ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  backgroundColor: selectedIds.size === filteredGoals.length && filteredGoals.length > 0 ? 'var(--accent-primary)' : 'transparent',
                }}
              >
                {selectedIds.size === filteredGoals.length && filteredGoals.length > 0 && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              Todos
            </button>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}
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

      {/* Stats summary */}
      {goals.length > 0 && (
        <div
          className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div>
            <p
              className="text-xs font-medium mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Metas activas
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {activeGoals.length}
            </p>
          </div>
          <div>
            <p
              className="text-xs font-medium mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Completadas
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: 'var(--accent-green)' }}
            >
              {completedCount}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p
              className="text-xs font-medium mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Tasa de éxito
            </p>
            <p
              className="text-2xl font-bold"
              style={{ color: successRate >= 50 ? 'var(--accent-green)' : 'var(--accent-yellow, #eab308)' }}
            >
              {successRate.toFixed(0)}%
            </p>
          </div>
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

      {/* Goals grid */}
      {filteredGoals.length === 0 ? (
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
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
          </div>
          <p
            className="font-medium mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            {filter === 'active' && 'No hay metas activas'}
            {filter === 'completed' && 'No hay metas completadas'}
            {filter === 'all' && 'No hay metas'}
          </p>
          <p
            className="text-sm mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            {filter === 'all' || filter === 'active'
              ? 'Crea tu primera meta y empieza a ahorrar'
              : 'Las metas completadas aparecerán aquí'}
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
              + Crear meta
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal) => (
            <div key={goal.id} className="relative">
              {selectMode && (
                <button
                  onClick={() => toggleSelect(goal.id)}
                  className="absolute top-3 left-3 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all"
                  style={{
                    borderColor: selectedIds.has(goal.id) ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    backgroundColor: selectedIds.has(goal.id) ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                  }}
                >
                  {selectedIds.has(goal.id) && (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )}
              <GoalCard
                goal={goal}
                categories={categoriesWithId}
                accounts={accounts}
                onClick={() => selectMode ? toggleSelect(goal.id) : setEditingGoal(goal)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Celebration message for completed goals */}
      {filter === 'completed' && completedGoals.length > 0 && (
        <div
          className="flex items-center gap-3 p-4 rounded-xl"
          style={{
            backgroundColor: 'var(--accent-green-dim)',
            border: '1px solid var(--accent-green)',
          }}
        >
          <span className="text-2xl">🎉</span>
          <div>
            <p
              className="font-medium"
              style={{ color: 'var(--accent-green)' }}
            >
              ¡Felicitaciones!
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Has completado {completedCount} meta{completedCount !== 1 ? 's' : ''}. ¡Sigue así!
            </p>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAdding || editingGoal) && (
        <GoalModal
          goal={editingGoal}
          categories={categoriesWithId}
          accounts={accounts}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => {
            setIsAdding(false);
            setEditingGoal(null);
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
                Eliminar metas
              </h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                ¿Estás seguro de que quieres eliminar {selectedIds.size} meta{selectedIds.size !== 1 ? 's' : ''}?
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

export default Goals;
