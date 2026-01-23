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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
      {/* Backdrop with premium blur */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={submitting ? undefined : onClose}
      />

      {/* Modal with glass morphism */}
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl animate-scale-in card-elevated"
        style={{ 
          boxShadow: '0 25px 80px -20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 124, 255, 0.1)'
        }}
      >
        {/* Gradient accent line at top */}
        <div 
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{ 
            background: 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-purple) 50%, var(--accent-green) 100%)'
          }}
        />

        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b"
          style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            borderColor: 'var(--border-subtle)' 
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ 
                background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-purple) 100%)',
                boxShadow: '0 4px 16px var(--accent-primary-glow)'
              }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                Nuevo Movimiento
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Registra ingreso, gasto o transferencia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-95 disabled:opacity-50"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
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
