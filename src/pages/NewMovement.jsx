import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { addIncome, addExpense, addExpenseWithInstallments, addTransfer } from '../services/supabaseApi';
import MovementForm from '../components/forms/MovementForm';
import LoadingSpinner from '../components/LoadingSpinner';
import Toast from '../components/Toast';

function NewMovement() {
  const navigate = useNavigate();
  const location = useLocation();
  const { accounts, loading: loadingAccounts } = useAccounts();
  const { categories, loading: loadingCategories } = useCategories();

  // Check for prefill data from duplicate action
  const prefillData = location.state?.prefill || null;

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [formKey, setFormKey] = useState(0); // Key para resetear el formulario

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

      // Mensaje personalizado para cuotas
      let successMessage = result.message || 'Movimiento registrado correctamente';
      if (type === 'expense_installments' && result.filasCreadas) {
        successMessage = `Gasto en ${result.filasCreadas} cuotas registrado correctamente`;
      }

      setToast({
        message: successMessage,
        type: 'success',
      });

      // Resetear el formulario incrementando el key (si no es prefill/duplicar)
      if (!prefillData) {
        setFormKey(prev => prev + 1);
      } else {
        // Si era duplicar, navegar al inicio después de guardar
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (error) {
      setToast({
        message: error.message || 'Error al registrar el movimiento',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAccounts || loadingCategories) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="lg:max-w-2xl lg:mx-auto">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <h2
        className="text-xl font-bold mb-6 lg:text-2xl lg:mb-8"
        style={{ color: 'var(--text-primary)' }}
      >
        {prefillData ? 'Duplicar Movimiento' : 'Nuevo Movimiento'}
      </h2>

      {prefillData && (
        <div
          className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2"
          style={{ backgroundColor: 'var(--accent-blue-dim)', color: 'var(--accent-blue)' }}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Duplicando movimiento con fecha de hoy. Modifica los datos si es necesario.
        </div>
      )}

      {/* Card container for desktop */}
      <div
        className="lg:rounded-2xl lg:p-6"
        style={{ backgroundColor: 'transparent' }}
      >
        <MovementForm
          key={formKey}
          accounts={accounts}
          categories={categories}
          onSubmit={handleSubmit}
          loading={submitting}
          prefillData={prefillData}
        />
      </div>
    </div>
  );
}

export default NewMovement;
