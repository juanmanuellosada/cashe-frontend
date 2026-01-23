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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      {/* Backdrop with premium blur */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={submitting ? undefined : onClose}
      />

      {/* Modal with glass morphism */}
      <div
        className="relative w-full max-w-lg my-auto rounded-2xl animate-scale-in card-elevated"
        style={{ 
          boxShadow: '0 25px 80px -20px rgba(0, 0, 0, 0.5), 0 0 40px rgba(139, 124, 255, 0.1)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Gradient accent line at top */}
        <div 
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{ 
            background: defaultType 
              ? (defaultType === 'expense' ? 'var(--accent-red)' : defaultType === 'income' ? 'var(--accent-green)' : 'var(--accent-blue)')
              : 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-purple) 50%, var(--accent-green) 100%)'
          }}
        />

        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ 
            backgroundColor: 'var(--bg-secondary)', 
            borderColor: 'var(--border-subtle)',
            borderTopLeftRadius: '1rem',
            borderTopRightRadius: '1rem'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ 
                background: getIconColor(),
                boxShadow: '0 4px 16px var(--accent-primary-glow)'
              }}
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {getIcon()}
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold font-display" style={{ color: 'var(--text-primary)' }}>
                {getModalTitle()}
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {getModalSubtitle()}
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

        {/* Content - scrollable */}
        <div className="p-5 overflow-y-auto flex-1">
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
              prefillData={defaultType ? { tipo: defaultType === 'income' ? 'ingreso' : defaultType === 'expense' ? 'gasto' : 'transferencia' } : null}
              hideTypeSelector={!!defaultType}
              onCategoryCreated={refetchCategories}
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
