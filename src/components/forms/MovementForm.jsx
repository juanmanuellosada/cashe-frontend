import { useState } from 'react';
import IncomeForm from './IncomeForm';
import ExpenseForm from './ExpenseForm';
import TransferForm from './TransferForm';

const MOVEMENT_TYPES = [
  { 
    id: 'ingreso', 
    label: 'Ingreso', 
    color: 'var(--accent-green)', 
    bgDim: 'rgba(0, 217, 154, 0.12)',
    glow: 'rgba(0, 217, 154, 0.4)',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    )
  },
  { 
    id: 'gasto', 
    label: 'Gasto', 
    color: 'var(--accent-red)', 
    bgDim: 'rgba(255, 92, 114, 0.12)',
    glow: 'rgba(255, 92, 114, 0.4)',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    )
  },
  { 
    id: 'transferencia', 
    label: 'Transferir', 
    color: 'var(--accent-blue)', 
    bgDim: 'rgba(59, 130, 246, 0.12)',
    glow: 'rgba(59, 130, 246, 0.4)',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    )
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

  const activeType = MOVEMENT_TYPES.find(t => t.id === movementType);

  return (
    <div>
      {/* Movement Type Selector - Premium Segmented Control */}
      {!hideTypeSelector && (
        <>
          <div
            className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl mb-6"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            {MOVEMENT_TYPES.map((type) => {
              const isActive = movementType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setMovementType(type.id)}
                  className={`relative flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-300 active:scale-[0.98] ${
                    isActive ? '' : 'hover:bg-[var(--bg-secondary)]'
                  }`}
                  style={{
                    backgroundColor: isActive ? type.color : 'transparent',
                    color: isActive ? 'white' : 'var(--text-secondary)',
                    boxShadow: isActive ? `0 4px 20px ${type.glow}` : 'none',
                  }}
                >
                  {type.icon}
                  <span className="hidden sm:inline">{type.label}</span>
                </button>
              );
            })}
          </div>

          {/* Type indicator bar with glow */}
          <div
            className="h-1 rounded-full mb-6 transition-all duration-500"
            style={{
              backgroundColor: activeType?.color,
              boxShadow: `0 0 20px ${activeType?.glow}, 0 0 40px ${activeType?.glow}`
            }}
          />
        </>
      )}

      {/* Dynamic Form */}
      {renderForm()}
    </div>
  );
}

export default MovementForm;
