import { useState, useEffect, useRef } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useBudgets } from '../hooks/useBudgets';
import { useGoals } from '../hooks/useGoals';
import { addIncome, addExpense, addExpenseWithInstallments, addTransfer } from '../services/supabaseApi';
import MovementForm from './forms/MovementForm';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';

/**
 * Modal para crear nuevo movimiento (Desktop)
 */
function NewMovementModal({ isOpen, onClose, defaultType }) {
  const { accounts, loading: loadingAccounts, refetch: refetchAccounts } = useAccounts();
  const { categories, categoriesWithId, loading: loadingCategories, refetch: refetchCategories } = useCategories();
  const { budgets } = useBudgets();
  const { goals } = useGoals();

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [formKey, setFormKey] = useState(0);

  // Drag to dismiss state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  // Reset drag state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevenir scroll del body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, submitting, onClose]);

  // Reset form cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setFormKey(prev => prev + 1);
      setToast(null);
    }
  }, [isOpen]);

  // Handle touch start
  const handleTouchStart = (e) => {
    if (e.target.closest('[data-drag-handle]')) {
      startY.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) setDragY(diff);
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging) return;
    if (dragY > 100 && !submitting) onClose();
    setDragY(0);
    setIsDragging(false);
  };

  const handleSubmit = async ({ type, data }) => {
    setSubmitting(true);

    try {
      let result;

      switch (type) {
        case 'income':
          result = await addIncome(data);
          break;
        case 'expense':
          result = await addExpense(data);
          break;
        case 'expense_installments':
          result = await addExpenseWithInstallments(data);
          break;
        case 'transfer':
          result = await addTransfer(data);
          break;
        default:
          throw new Error('Tipo de movimiento no válido');
      }

      let successMessage = result.message || 'Movimiento registrado correctamente';
      if (type === 'expense_installments' && result.filasCreadas) {
        successMessage = `Gasto en ${result.filasCreadas} cuotas registrado correctamente`;
      }

      setToast({
        message: successMessage,
        type: 'success',
      });

      // Refrescar cuentas para actualizar balances
      refetchAccounts();

      // Cerrar el modal después de un momento
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      setToast({
        message: error.message || 'Error al registrar el movimiento',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isLoading = loadingAccounts || loadingCategories;

  // Determinar título y subtítulo según el tipo
  const getModalTitle = () => {
    if (!defaultType) return 'Nuevo Movimiento';
    switch (defaultType) {
      case 'expense': return 'Nuevo Gasto';
      case 'income': return 'Nuevo Ingreso';
      case 'transfer': return 'Nueva Transferencia';
      default: return 'Nuevo Movimiento';
    }
  };

  const backdropOpacity = Math.max(0.6 - (dragY / 300), 0);
  const shouldClose = dragY > 100;

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm transition-opacity animate-fade-in"
        style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
        onClick={submitting ? undefined : onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md sm:my-auto sm:m-4 mt-0 rounded-b-xl sm:rounded-xl animate-slide-down"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          maxHeight: 'min(85dvh, 85vh)',
          display: 'flex',
          flexDirection: 'column',
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          opacity: shouldClose ? 0.5 : 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator - mobile only */}
        <div className="sm:hidden flex justify-center pt-2 pb-1" data-drag-handle>
          <div
            className="w-10 h-1 rounded-full transition-colors"
            style={{
              backgroundColor: shouldClose ? 'var(--accent-red)' : 'var(--border-medium)',
            }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 cursor-grab active:cursor-grabbing sm:cursor-default"
          style={{ borderColor: 'var(--border-subtle)' }}
          data-drag-handle
        >
          <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
            {getModalTitle()}
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <MovementForm
              key={formKey}
              accounts={accounts}
              categories={categories}
              categoriesWithId={categoriesWithId}
              budgets={budgets}
              goals={goals}
              onSubmit={handleSubmit}
              loading={submitting}
              prefillData={defaultType ? { tipo: defaultType === 'income' ? 'ingreso' : defaultType === 'expense' ? 'gasto' : 'transferencia' } : null}
              hideTypeSelector={!!defaultType}
              onCategoryCreated={refetchCategories}
            />
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-3 left-3 right-3">
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default NewMovementModal;
