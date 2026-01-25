import { useState } from 'react';
import IncomeForm from './IncomeForm';
import ExpenseForm from './ExpenseForm';
import TransferForm from './TransferForm';

const MOVEMENT_TYPES = [
  {
    id: 'ingreso',
    label: 'Ingreso',
    color: 'var(--accent-green)',
    bgDim: 'var(--accent-green-dim)',
  },
  {
    id: 'gasto',
    label: 'Gasto',
    color: 'var(--accent-red)',
    bgDim: 'var(--accent-red-dim)',
  },
  {
    id: 'transferencia',
    label: 'Transferir',
    color: 'var(--accent-blue)',
    bgDim: 'var(--accent-blue-dim)',
  },
];

function MovementForm({ accounts, categories, onSubmit, loading, prefillData, hideTypeSelector, onCategoryCreated }) {
  // Set initial type based on prefill data
  const getInitialType = () => {
    if (prefillData?.tipo === 'ingreso') return 'ingreso';
    if (prefillData?.tipo === 'transferencia') return 'transferencia';
    if (prefillData?.tipo === 'gasto') return 'gasto';
    return 'gasto';
  };

  const [movementType, setMovementType] = useState(getInitialType());

  const renderForm = () => {
    const formProps = {
      accounts,
      onSubmit,
      loading,
      onCategoryCreated,
    };

    // Only pass prefillData to matching form type
    const getFormPrefill = (formType) => {
      if (!prefillData) return null;
      if (prefillData.tipo === formType) return prefillData;
      return null;
    };

    switch (movementType) {
      case 'ingreso':
        return (
          <div key="ingreso" className="animate-slide-tab">
            <IncomeForm
              {...formProps}
              categories={categories.ingresos}
              prefillData={getFormPrefill('ingreso')}
            />
          </div>
        );
      case 'gasto':
        return (
          <div key="gasto" className="animate-slide-tab">
            <ExpenseForm
              {...formProps}
              categories={categories.gastos}
              prefillData={getFormPrefill('gasto')}
            />
          </div>
        );
      case 'transferencia':
        return (
          <div key="transferencia" className="animate-slide-tab">
            <TransferForm
              {...formProps}
              prefillData={getFormPrefill('transferencia')}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Movement Type Selector - Modern Pill Tabs */}
      {!hideTypeSelector && (
        <div
          className="inline-flex p-1 rounded-lg mb-5"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          {MOVEMENT_TYPES.map((type) => {
            const isActive = movementType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setMovementType(type.id)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-all duration-150"
                style={{
                  backgroundColor: isActive ? type.bgDim : 'transparent',
                  color: isActive ? type.color : 'var(--text-muted)',
                }}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Dynamic Form */}
      {renderForm()}
    </div>
  );
}

export default MovementForm;
