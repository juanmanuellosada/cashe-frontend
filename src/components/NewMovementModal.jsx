import { useState, useEffect } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { addIncome, addExpense, addExpenseWithInstallments, addTransfer } from '../services/supabaseApi';
import MovementForm from './forms/MovementForm';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';

/**
 * Modal para crear nuevo movimiento (Desktop)
 */
function NewMovementModal({ isOpen, onClose, defaultType }) {
  const { accounts, loading: loadingAccounts, refetch: refetchAccounts } = useAccounts();
  const { categories, loading: loadingCategories, refetch: refetchCategories } = useCategories();

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [formKey, setFormKey] = useState(0);

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

  const getModalSubtitle = () => {
    if (!defaultType) return 'Registra ingreso, gasto o transferencia';
    switch (defaultType) {
      case 'expense': return 'Registra un gasto';
      case 'income': return 'Registra un ingreso';
      case 'transfer': return 'Registra una transferencia';
      default: return 'Registra ingreso, gasto o transferencia';
    }
  };

  const getIconColor = () => {
    if (!defaultType) return 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-purple) 100%)';
    switch (defaultType) {
      case 'expense': return 'var(--accent-red)';
      case 'income': return 'var(--accent-green)';
      case 'transfer': return 'var(--accent-blue)';
      default: return 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-purple) 100%)';
    }
  };

  const getIcon = () => {
    if (!defaultType) {
      return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />;
    }
    switch (defaultType) {
      case 'expense':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />;
      case 'income':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />;
      case 'transfer':
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />;
      default:
        return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={submitting ? undefined : onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md my-auto rounded-xl animate-scale-in"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
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
        <div className="p-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <MovementForm
              key={formKey}
              accounts={accounts}
              categories={categories}
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
