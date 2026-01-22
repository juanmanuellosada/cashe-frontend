import { useState } from 'react';
import IncomeForm from './IncomeForm';
import ExpenseForm from './ExpenseForm';
import TransferForm from './TransferForm';

const MOVEMENT_TYPES = [
  { id: 'ingreso', label: 'Ingreso', color: 'var(--accent-green)', bgDim: 'rgba(34, 197, 94, 0.15)' },
  { id: 'gasto', label: 'Gasto', color: 'var(--accent-red)', bgDim: 'rgba(239, 68, 68, 0.15)' },
  { id: 'transferencia', label: 'Transfer.', color: 'var(--accent-blue)', bgDim: 'rgba(59, 130, 246, 0.15)' },
];

function MovementForm({ accounts, categories, onSubmit, loading, prefillData }) {
  // Set initial type based on prefill data
  const getInitialType = () => {
    if (prefillData?.tipo === 'ingreso') return 'ingreso';
    if (prefillData?.tipo === 'transferencia') return 'transferencia';
    return 'gasto';
  };

  const [movementType, setMovementType] = useState(getInitialType());

  const renderForm = () => {
    const formProps = {
      accounts,
      onSubmit,
      loading,
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

  const activeType = MOVEMENT_TYPES.find(t => t.id === movementType);

  return (
    <div>
      {/* Movement Type Selector - Compact Pills */}
      <div
        className="inline-flex rounded-xl p-1 mb-6"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        {MOVEMENT_TYPES.map((type) => {
          const isActive = movementType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => setMovementType(type.id)}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive ? 'shadow-md' : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: isActive ? type.color : 'transparent',
                color: isActive ? 'white' : 'var(--text-secondary)',
              }}
            >
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Type indicator bar */}
      <div
        className="h-1 rounded-full mb-6 transition-all duration-300"
        style={{
          backgroundColor: activeType?.bgDim,
          boxShadow: `0 0 20px ${activeType?.bgDim}`
        }}
      />

      {/* Dynamic Form */}
      {renderForm()}
    </div>
  );
}

export default MovementForm;
