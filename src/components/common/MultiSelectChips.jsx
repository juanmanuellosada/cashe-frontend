import React from 'react';
import { isEmoji, resolveIconPath } from '../../services/iconStorage';

/**
 * MultiSelectChips - Componente de selección múltiple con chips
 *
 * @param {Array} items - Lista de items [{id, name, icon?}]
 * @param {Array} selectedIds - IDs seleccionados
 * @param {function} onChange - Callback con nuevo array de IDs
 * @param {string} label - Label del campo
 * @param {string} emptyMessage - Mensaje cuando no hay items
 * @param {boolean} disabled - Deshabilitar selección
 */
function MultiSelectChips({
  items = [],
  selectedIds = [],
  onChange,
  label,
  emptyMessage = 'No hay opciones disponibles',
  disabled = false,
  className = '',
}) {
  const toggleItem = (id) => {
    if (disabled) return;

    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (disabled) return;
    onChange(items.map((item) => item.id));
  };

  const clearAll = () => {
    if (disabled) return;
    onChange([]);
  };

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <label
            className="text-sm font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
          </label>
          {items.length > 0 && (
            <div className="flex gap-2">
              {selectedIds.length < items.length && (
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={disabled}
                  className="text-xs font-medium transition-colors hover:underline"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Seleccionar todo
                </button>
              )}
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={disabled}
                  className="text-xs font-medium transition-colors hover:underline"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Limpiar
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {items.length === 0 ? (
          <p
            className="text-sm py-2"
            style={{ color: 'var(--text-muted)' }}
          >
            {emptyMessage}
          </p>
        ) : (
          items.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleItem(item.id)}
                disabled={disabled}
                className={`
                  px-3 py-2 rounded-xl text-xs font-medium transition-all
                  flex items-center gap-1.5
                  ${isSelected ? 'ring-2 ring-offset-1' : 'hover:opacity-80'}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                style={{
                  backgroundColor: isSelected
                    ? 'var(--accent-primary-dim)'
                    : 'var(--bg-tertiary)',
                  color: isSelected
                    ? 'var(--accent-primary)'
                    : 'var(--text-secondary)',
                  '--tw-ring-color': 'var(--accent-primary)',
                  '--tw-ring-offset-color': 'var(--bg-primary)',
                }}
              >
                {item.icon && (
                  isEmoji(item.icon) ? (
                    <span className="text-sm">{item.icon}</span>
                  ) : (
                    <img
                      src={resolveIconPath(item.icon)}
                      alt=""
                      className="w-4 h-4 rounded-sm object-contain"
                    />
                  )
                )}
                <span>{item.name}</span>
                {isSelected && (
                  <svg
                    className="w-3.5 h-3.5 ml-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            );
          })
        )}
      </div>

      {selectedIds.length > 0 && (
        <p
          className="text-xs mt-2"
          style={{ color: 'var(--text-muted)' }}
        >
          {selectedIds.length} de {items.length} seleccionado{selectedIds.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

export default MultiSelectChips;
