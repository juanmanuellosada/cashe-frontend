import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  getScheduledTransactions,
  approveScheduledTransaction,
  rejectScheduledTransaction,
  deleteScheduledTransaction,
} from '../services/supabaseApi';
import { DataEvents, useDataEvent } from '../services/dataEvents';
import { useError } from '../contexts/ErrorContext';
import ScheduledCard from '../components/scheduled/ScheduledCard';
import ScheduledModal from '../components/scheduled/ScheduledModal';
import ConfirmModal from '../components/ConfirmModal';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import PullToRefresh from '../components/PullToRefresh';
import { formatCurrency } from '../utils/format';

function ScheduledTransactions() {
  const { showError } = useError();

  const [scheduled, setScheduled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [typeFilter, setTypeFilter] = useState('all');
  const [editingScheduled, setEditingScheduled] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmApprove, setConfirmApprove] = useState(null);

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const data = await getScheduledTransactions();
      setScheduled(data.scheduled || []);
    } catch (err) {
      console.error('Error fetching scheduled:', err);
      showError('Error', 'No se pudieron cargar las transacciones programadas');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-fetch when data changes (approvals, executions from other contexts)
  useDataEvent(DataEvents.ALL_DATA_CHANGED, () => fetchData(false));

  // Filter scheduled based on current filters
  const filteredScheduled = useMemo(() => {
    let result = scheduled;

    // Status filter
    if (filter !== 'all') {
      result = result.filter(s => s.status === filter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(s => s.type === typeFilter);
    }

    return result;
  }, [filter, typeFilter, scheduled]);

  // Counts
  const counts = useMemo(() => ({
    pending: scheduled.filter(s => s.status === 'pending').length,
    executed: scheduled.filter(s => s.status === 'executed').length,
    rejected: scheduled.filter(s => s.status === 'rejected').length,
    all: scheduled.length,
  }), [scheduled]);

  // Summary for pending
  const pendingSummary = useMemo(() => {
    const pending = scheduled.filter(s => s.status === 'pending');
    return {
      expenses: pending.filter(s => s.type === 'expense').reduce((sum, s) => sum + parseFloat(s.monto), 0),
      incomes: pending.filter(s => s.type === 'income').reduce((sum, s) => sum + parseFloat(s.monto), 0),
      count: pending.length,
    };
  }, [scheduled]);

  const handleApprove = async (item) => {
    try {
      setSaving(true);
      await approveScheduledTransaction(item.id);
      setToast({ message: 'Transacción ejecutada', type: 'success' });
      setConfirmApprove(null);
      await fetchData(false);
    } catch (err) {
      console.error('Error approving:', err);
      showError('Error', err.message || 'No se pudo aprobar la transacción');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (item) => {
    try {
      setSaving(true);
      await rejectScheduledTransaction(item.id);
      setToast({ message: 'Transacción rechazada', type: 'success' });
      await fetchData(false);
    } catch (err) {
      console.error('Error rejecting:', err);
      showError('Error', err.message || 'No se pudo rechazar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      setSaving(true);
      await deleteScheduledTransaction(confirmDelete.id);
      setToast({ message: 'Transacción eliminada', type: 'success' });
      setConfirmDelete(null);
      await fetchData(false);
    } catch (err) {
      console.error('Error deleting:', err);
      showError('Error', err.message || 'No se pudo eliminar');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingScheduled(item);
  };

  const statusFilters = [
    { id: 'pending', label: 'Pendientes', count: counts.pending },
    { id: 'executed', label: 'Ejecutadas', count: counts.executed },
    { id: 'rejected', label: 'Rechazadas', count: counts.rejected },
    { id: 'all', label: 'Todas', count: counts.all },
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
    <PullToRefresh onRefresh={fetchData} disabled={loading}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Programadas
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Transacciones futuras pendientes de aprobación
            </p>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Nueva programada</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>

        {/* Summary cards (only show when there are pending) */}
        {counts.pending > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              className="p-4 rounded-2xl"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                Gastos pendientes
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--accent-red)' }}>
                {formatCurrency(pendingSummary.expenses, 'Peso')}
              </p>
            </div>
            <div
              className="p-4 rounded-2xl"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                Ingresos pendientes
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--accent-green)' }}>
                {formatCurrency(pendingSummary.incomes, 'Peso')}
              </p>
            </div>
            <div
              className="p-4 rounded-2xl"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                Por aprobar
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {pendingSummary.count}
              </p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Status filter */}
          <div
            className="flex gap-1 p-1 rounded-xl flex-1 overflow-x-auto"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            {statusFilters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`
                  flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 whitespace-nowrap
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

        {/* Scheduled list */}
        {filteredScheduled.length === 0 ? (
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
              {filter === 'pending' && 'No hay transacciones pendientes'}
              {filter === 'executed' && 'No hay transacciones ejecutadas'}
              {filter === 'rejected' && 'No hay transacciones rechazadas'}
              {filter === 'all' && 'No hay transacciones programadas'}
            </p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              {filter === 'pending' || filter === 'all'
                ? 'Programa una transacción para una fecha futura'
                : filter === 'executed'
                  ? 'Las transacciones aprobadas aparecerán aquí'
                  : 'Las transacciones rechazadas aparecerán aquí'}
            </p>
            {(filter === 'all' || filter === 'pending') && (
              <button
                onClick={() => setIsAdding(true)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
              >
                + Programar transacción
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScheduled.map((s) => (
              <ScheduledCard
                key={s.id}
                scheduled={s}
                onClick={() => s.status === 'pending' ? handleEdit(s) : null}
                onApprove={s.status === 'pending' ? (item) => setConfirmApprove(item) : undefined}
                onReject={s.status === 'pending' ? handleReject : undefined}
                onEdit={s.status === 'pending' ? handleEdit : undefined}
                onDelete={s.status === 'pending' ? (item) => setConfirmDelete(item) : undefined}
              />
            ))}
          </div>
        )}

        {/* Add/Edit Modal */}
        <ScheduledModal
          isOpen={isAdding || !!editingScheduled}
          onClose={() => {
            setIsAdding(false);
            setEditingScheduled(null);
          }}
          onSuccess={() => fetchData(false)}
          editData={editingScheduled}
        />

        {/* Confirm Approve Modal */}
        {confirmApprove && (
          <ConfirmModal
            title="Aprobar transacción"
            message={`¿Aprobar y ejecutar esta transacción de ${formatCurrency(confirmApprove.monto, 'Peso')}?`}
            confirmText="Aprobar"
            confirmColor="var(--accent-green)"
            onConfirm={() => handleApprove(confirmApprove)}
            onCancel={() => setConfirmApprove(null)}
            loading={saving}
          />
        )}

        {/* Confirm Delete Modal */}
        {confirmDelete && (
          <ConfirmModal
            title="Eliminar transacción"
            message="¿Estás seguro de que quieres eliminar esta transacción programada?"
            confirmText="Eliminar"
            confirmColor="var(--accent-red)"
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(null)}
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
      </div>
    </PullToRefresh>
  );
}

export default ScheduledTransactions;
