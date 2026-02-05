import { useState, useEffect } from 'react';
import { X, Plus, Loader2, Trash2 } from 'lucide-react';
import RuleConditionForm from './RuleConditionForm';
import RuleActionForm from './RuleActionForm';

const DEFAULT_CONDITION = { field: 'note', operator: 'contains', value: '' };
const DEFAULT_ACTION = { field: 'category_id', value: '' };

/**
 * Modal para crear o editar una regla automática
 */
function RuleFormModal({ rule, onSave, onClose, onDelete, loading, categories = [], accounts = [] }) {
  const isEditing = !!rule;

  const [formData, setFormData] = useState({
    name: '',
    logicOperator: 'AND',
    priority: 0,
    isActive: true,
  });

  const [conditions, setConditions] = useState([{ ...DEFAULT_CONDITION }]);
  const [actions, setActions] = useState([{ ...DEFAULT_ACTION }]);
  const [errors, setErrors] = useState({});

  // Cargar datos si estamos editando
  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name || '',
        logicOperator: rule.logic_operator || 'AND',
        priority: rule.priority || 0,
        isActive: rule.is_active !== false,
      });

      if (rule.conditions?.length > 0) {
        setConditions(rule.conditions.map(c => ({
          field: c.field,
          operator: c.operator,
          value: c.value,
        })));
      }

      if (rule.actions?.length > 0) {
        setActions(rule.actions.map(a => ({
          field: a.field,
          value: a.value,
        })));
      }
    }
  }, [rule]);

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (conditions.length === 0) {
      newErrors.conditions = 'Debe tener al menos una condición';
    } else {
      const invalidCondition = conditions.find(c => !c.value && c.field !== 'type');
      if (invalidCondition) {
        newErrors.conditions = 'Todas las condiciones deben tener un valor';
      }
    }

    if (actions.length === 0) {
      newErrors.actions = 'Debe tener al menos una acción';
    } else {
      const invalidAction = actions.find(a => !a.value);
      if (invalidAction) {
        newErrors.actions = 'Todas las acciones deben tener un valor';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    await onSave({
      id: rule?.id,
      name: formData.name.trim(),
      logicOperator: formData.logicOperator,
      priority: formData.priority,
      isActive: formData.isActive,
      conditions,
      actions,
    });
  };

  const handleConditionChange = (index, newCondition) => {
    const newConditions = [...conditions];
    newConditions[index] = newCondition;
    setConditions(newConditions);
  };

  const handleConditionRemove = (index) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleActionChange = (index, newAction) => {
    const newActions = [...actions];
    newActions[index] = newAction;
    setActions(newActions);
  };

  const handleActionRemove = (index) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-auto rounded-2xl shadow-2xl"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-medium)',
          }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isEditing ? 'Editar regla' : 'Nueva regla'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Nombre de la regla
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Netflix mensual, Supermercado..."
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: errors.name ? '1px solid var(--accent-red)' : '1px solid var(--border-medium)',
              }}
            />
            {errors.name && (
              <p className="mt-1 text-xs" style={{ color: 'var(--accent-red)' }}>{errors.name}</p>
            )}
          </div>

          {/* Condiciones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Condiciones
              </label>

              {conditions.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Combinar con:
                  </span>
                  <select
                    value={formData.logicOperator}
                    onChange={(e) => setFormData({ ...formData, logicOperator: e.target.value })}
                    className="px-2 py-1 rounded-lg text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-medium)',
                    }}
                  >
                    <option value="AND">Y (todas)</option>
                    <option value="OR">O (alguna)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {conditions.map((condition, index) => (
                <RuleConditionForm
                  key={index}
                  condition={condition}
                  index={index}
                  onChange={handleConditionChange}
                  onRemove={handleConditionRemove}
                  canRemove={conditions.length > 1}
                  accounts={accounts}
                />
              ))}
            </div>

            {errors.conditions && (
              <p className="mt-2 text-xs" style={{ color: 'var(--accent-red)' }}>{errors.conditions}</p>
            )}

            <button
              type="button"
              onClick={() => setConditions([...conditions, { ...DEFAULT_CONDITION }])}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                color: 'var(--accent-primary)',
                backgroundColor: 'rgba(20, 184, 166, 0.1)',
              }}
            >
              <Plus className="w-4 h-4" />
              Agregar condición
            </button>
          </div>

          {/* Acciones */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Acciones
            </label>

            <div className="space-y-2">
              {actions.map((action, index) => (
                <RuleActionForm
                  key={index}
                  action={action}
                  index={index}
                  onChange={handleActionChange}
                  onRemove={handleActionRemove}
                  canRemove={actions.length > 1}
                  categories={categories}
                  accounts={accounts}
                />
              ))}
            </div>

            {errors.actions && (
              <p className="mt-2 text-xs" style={{ color: 'var(--accent-red)' }}>{errors.actions}</p>
            )}

            <button
              type="button"
              onClick={() => setActions([...actions, { ...DEFAULT_ACTION }])}
              className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                color: 'var(--accent-primary)',
                backgroundColor: 'rgba(20, 184, 166, 0.1)',
              }}
            >
              <Plus className="w-4 h-4" />
              Agregar acción
            </button>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between gap-3 pt-4 border-t"
            style={{ borderColor: 'var(--border-medium)' }}
          >
            {/* Botón eliminar (solo en edición) */}
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(rule)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                style={{
                  color: 'var(--accent-red)',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                }}
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-secondary)',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors flex items-center gap-2"
                style={{
                  backgroundColor: loading ? 'var(--text-secondary)' : 'var(--accent-primary)',
                }}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEditing ? 'Guardar cambios' : 'Crear regla'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RuleFormModal;
