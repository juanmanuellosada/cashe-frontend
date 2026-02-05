import { useState } from 'react';
import { ChevronDown, ChevronUp, MoreVertical, Pencil, Trash2, Power, Check } from 'lucide-react';

const FIELD_LABELS = {
  note: 'Nota',
  amount: 'Monto',
  account_id: 'Cuenta',
  type: 'Tipo',
  category_id: 'Categoría',
};

const OPERATOR_LABELS = {
  contains: 'contiene',
  equals: 'es igual a',
  starts_with: 'empieza con',
  ends_with: 'termina con',
  greater_than: 'mayor que',
  less_than: 'menor que',
  between: 'entre',
};

/**
 * Card para mostrar una regla
 */
function RuleMobileCard({
  rule,
  categories = [],
  accounts = [],
  onEdit,
  onDelete,
  onToggle,
  selectionMode = false,
  selected = false,
  onSelect,
}) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Helper para obtener emoji del icon (no mostrar URLs)
  const getIconEmoji = (icon) => {
    if (!icon) return '📁';
    if (typeof icon === 'string' && (icon.startsWith('/') || icon.startsWith('http'))) {
      return '📁';
    }
    return icon;
  };

  const getValueDisplay = (field, value) => {
    if (field === 'category_id') {
      const category = categories.find(c => c.id === value);
      return category ? `${getIconEmoji(category.icon)} ${category.label || category.value || category.name || category.nombre}` : value;
    }
    if (field === 'account_id') {
      const account = accounts.find(a => a.id === value);
      return account ? (account.name || account.nombre) : value;
    }
    if (field === 'type') {
      return value === 'expense' ? 'Gasto' : 'Ingreso';
    }
    return value;
  };

  const handleCardClick = () => {
    if (selectionMode) {
      onSelect?.(rule.id);
    } else {
      setExpanded(!expanded);
    }
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all ${selected ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-medium)',
        opacity: rule.is_active ? 1 : 0.6,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={handleCardClick}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Checkbox en modo selección, indicador de estado normal */}
          {selectionMode ? (
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                selected ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--border-medium)]'
              }`}
            >
              {selected && <Check className="w-3 h-3 text-white" />}
            </div>
          ) : (
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: rule.is_active ? 'var(--accent-green)' : 'var(--text-muted)',
              }}
            />
          )}

          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {rule.name}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {rule.conditions?.length || 0} condición{rule.conditions?.length !== 1 ? 'es' : ''} •{' '}
              {rule.actions?.length || 0} acción{rule.actions?.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Botón eliminar rápido - oculto en modo selección */}
          {!selectionMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(rule);
              }}
              className="p-2 rounded-lg transition-colors hover:bg-red-500/10"
              style={{ color: 'var(--text-muted)' }}
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Menú de acciones - oculto en modo selección */}
          {!selectionMode && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <div
                    className="absolute right-0 top-full mt-1 z-20 py-1 rounded-xl shadow-lg min-w-[140px]"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-medium)',
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onEdit(rule);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onToggle(rule);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <Power className="w-4 h-4" />
                      {rule.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onDelete(rule);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors"
                      style={{ color: 'var(--accent-red)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Chevron - oculto en modo selección */}
          {!selectionMode && (
            expanded ? (
              <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            ) : (
              <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            )
          )}
        </div>
      </div>

      {/* Contenido expandido - oculto en modo selección */}
      {expanded && !selectionMode && (
        <div
          className="px-4 pb-4 space-y-3 border-t"
          style={{ borderColor: 'var(--border-medium)' }}
        >
          {/* Condiciones */}
          <div className="pt-3">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              SI {rule.logic_operator === 'OR' ? '(alguna)' : '(todas)'}:
            </p>
            <div className="space-y-1">
              {rule.conditions?.map((cond, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs p-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                >
                  <span style={{ color: '#f59e0b' }}>•</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {FIELD_LABELS[cond.field] || cond.field}{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {OPERATOR_LABELS[cond.operator] || cond.operator}
                    </span>{' '}
                    "{getValueDisplay(cond.field, cond.value)}"
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones */}
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              ENTONCES:
            </p>
            <div className="space-y-1">
              {rule.actions?.map((action, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs p-2 rounded-lg"
                  style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                >
                  <span style={{ color: '#22c55e' }}>→</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {FIELD_LABELS[action.field] || action.field}:{' '}
                    <span className="font-medium">
                      {getValueDisplay(action.field, action.value)}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RuleMobileCard;
