import { useState, useEffect } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { addIncome, addExpense, addExpenseWithInstallments, addTransfer } from '../services/sheetsApi';
import MovementForm from './forms/MovementForm';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';

/**
 * Modal para crear nuevo movimiento (Desktop)
 */
function NewMovementModal({ isOpen, onClose }) {
  const { accounts, loading: loadingAccounts, refetch: refetchAccounts } = useAccounts();
  const { categories, loading: loadingCategories } = useCategories();

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={submitting ? undefined : onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl animate-scale-in"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between p-4 border-b"
          style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            Nuevo Movimiento
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <MovementForm
              key={formKey}
              accounts={accounts}
              categories={categories}
              onSubmit={handleSubmit}
              loading={submitting}
            />
          )}
        </div>

        {/* Toast dentro del modal */}
        {toast && (
          <div className="absolute bottom-4 left-4 right-4">
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
