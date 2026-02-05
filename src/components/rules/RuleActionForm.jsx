import { Trash2 } from 'lucide-react';
import Combobox from '../Combobox';

const ACTION_FIELD_OPTIONS = [
  { value: 'category_id', label: 'Categoría' },
  { value: 'account_id', label: 'Cuenta' },
];

/**
 * Formulario de una acción individual dentro de RuleFormModal
 */
function RuleActionForm({ action, index, onChange, onRemove, canRemove, categories = [], accounts = [] }) {
  const handleFieldChange = (e) => {
    onChange(index, {
      ...action,
      field: e.target.value,
      value: '',
    });
  };

  const handleValueChange = (e) => {
    onChange(index, { ...action, value: e.target.value });
  };

  // Helper para limpiar emoji del inicio del label
  const cleanLabel = (label) => {
    if (!label) return '';
    // Regex para detectar emoji al inicio
    const emojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]\s*/u;
    return label.replace(emojiRegex, '').trim();
  };

  // Preparar opciones de categorías para Combobox
  const categoryOptions = categories.map(cat => {
    const rawLabel = cat.label || cat.value || cat.name || cat.nombre;
    const hasIcon = !!cat.icon;
    return {
      value: cat.id,
      // Si ya tiene icono, limpiar el label para no duplicar
      label: hasIcon ? cleanLabel(rawLabel) : rawLabel,
      icon: cat.icon || null,
    };
  });

  // Preparar opciones de cuentas para Combobox
  const accountOptions = accounts.map(acc => ({
    value: acc.id,
    label: acc.name || acc.nombre,
    icon: acc.icon || null,
  }));

  const renderValueSelect = () => {
    if (action.field === 'category_id') {
      return (
        <div className="min-w-[160px] max-w-[220px]">
          <Combobox
            name={`action-category-${index}`}
            value={action.value}
            onChange={handleValueChange}
            options={categoryOptions}
            placeholder="Seleccionar..."
            emptyMessage="No hay categorías"
            defaultOptionIcon="📁"
          />
        </div>
      );
    }

    if (action.field === 'account_id') {
      return (
        <div className="min-w-[160px] max-w-[220px]">
          <Combobox
            name={`action-account-${index}`}
            value={action.value}
            onChange={handleValueChange}
            options={accountOptions}
            placeholder="Seleccionar..."
            emptyMessage="No hay cuentas"
            defaultOptionIcon="💳"
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div
      className="flex flex-wrap items-center gap-2 p-3 rounded-xl"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        Asignar
      </span>

      {/* Campo de acción */}
      <select
        value={action.field}
        onChange={handleFieldChange}
        className="px-3 py-2 rounded-lg text-sm"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-medium)',
        }}
      >
        {ACTION_FIELD_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>→</span>

      {/* Valor de la acción */}
      {renderValueSelect()}

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

export default RuleActionForm;
