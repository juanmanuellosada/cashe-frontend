import { Trash2 } from 'lucide-react';
import Combobox from '../Combobox';

const FIELD_OPTIONS = [
  { value: 'note', label: 'Nota' },
  { value: 'amount', label: 'Monto' },
  { value: 'account_id', label: 'Cuenta' },
  { value: 'type', label: 'Tipo' },
];

const OPERATOR_OPTIONS = {
  note: [
    { value: 'contains', label: 'contiene' },
    { value: 'equals', label: 'es igual a' },
    { value: 'starts_with', label: 'empieza con' },
    { value: 'ends_with', label: 'termina con' },
  ],
  amount: [
    { value: 'equals', label: 'es igual a' },
    { value: 'greater_than', label: 'mayor que' },
    { value: 'less_than', label: 'menor que' },
    { value: 'between', label: 'entre' },
  ],
  account_id: [
    { value: 'equals', label: 'es' },
  ],
  type: [
    { value: 'equals', label: 'es' },
  ],
};

const TYPE_OPTIONS = [
  { value: 'expense', label: 'Gasto' },
  { value: 'income', label: 'Ingreso' },
];

/**
 * Formulario de una condición individual dentro de RuleFormModal
 */
function RuleConditionForm({ condition, index, onChange, onRemove, canRemove, accounts = [] }) {
  const operators = OPERATOR_OPTIONS[condition.field] || [];

  const handleFieldChange = (e) => {
    const newField = e.target.value;
    const newOperators = OPERATOR_OPTIONS[newField] || [];
    onChange(index, {
      ...condition,
      field: newField,
      operator: newOperators[0]?.value || 'equals',
      value: '',
    });
  };

  const handleOperatorChange = (e) => {
    onChange(index, { ...condition, operator: e.target.value });
  };

  const handleValueChange = (e) => {
    onChange(index, { ...condition, value: e.target.value });
  };

  const renderValueInput = () => {
    // Para tipo de movimiento
    if (condition.field === 'type') {
      return (
        <select
          value={condition.value}
          onChange={handleValueChange}
          className="px-3 py-2 rounded-lg text-sm min-w-[100px]"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-medium)',
          }}
        >
          <option value="">Seleccionar...</option>
          {TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    // Para cuenta
    if (condition.field === 'account_id') {
      const accountOptions = accounts.map(acc => ({
        value: acc.id,
        label: acc.name || acc.nombre,
        icon: acc.icon || null,
      }));

      return (
        <div className="min-w-[140px] max-w-[200px]">
          <Combobox
            name={`condition-account-${index}`}
            value={condition.value}
            onChange={handleValueChange}
            options={accountOptions}
            placeholder="Seleccionar..."
            emptyMessage="No hay cuentas"
            defaultOptionIcon="💳"
          />
        </div>
      );
    }

    // Para monto con operador "entre"
    if (condition.field === 'amount' && condition.operator === 'between') {
      const [min, max] = (condition.value || '|').split('|');
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={min || ''}
            onChange={(e) => onChange(index, { ...condition, value: `${e.target.value}|${max || ''}` })}
            placeholder="Mín"
            className="w-20 px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
            }}
          />
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>y</span>
          <input
            type="number"
            value={max || ''}
            onChange={(e) => onChange(index, { ...condition, value: `${min || ''}|${e.target.value}` })}
            placeholder="Máx"
            className="w-20 px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
            }}
          />
        </div>
      );
    }

    // Para monto (otros operadores)
    if (condition.field === 'amount') {
      return (
        <input
          type="number"
          value={condition.value}
          onChange={handleValueChange}
          placeholder="Ej: 5000"
          className="w-28 px-3 py-2 rounded-lg text-sm"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-medium)',
          }}
        />
      );
    }

    // Para nota (texto)
    return (
      <input
        type="text"
        value={condition.value}
        onChange={handleValueChange}
        placeholder="Ej: mercadopago, spotify..."
        className="min-w-[140px] max-w-[220px] px-3 py-2 rounded-lg text-sm"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-medium)',
        }}
      />
    );
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2 p-3 rounded-xl"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        Si
      </span>

      {/* Campo */}
      <select
        value={condition.field}
        onChange={handleFieldChange}
        className="px-3 py-2 rounded-lg text-sm"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-medium)',
        }}
      >
        {FIELD_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Operador */}
      <select
        value={condition.operator}
        onChange={handleOperatorChange}
        className="px-3 py-2 rounded-lg text-sm"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-medium)',
        }}
      >
        {operators.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Valor */}
      {renderValueInput()}

      {/* Botón eliminar */}
      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--accent-red)' }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default RuleConditionForm;
