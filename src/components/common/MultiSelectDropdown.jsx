import { useState, useRef, useEffect } from 'react';
import { isEmoji, resolveIconPath } from '../../services/iconStorage';

/**
 * MultiSelectDropdown - Dropdown compacto para selección múltiple
 */
function MultiSelectDropdown({
  items = [],
  selectedIds = [],
  onChange,
  label,
  placeholder = 'Seleccionar...',
  emptyMessage = 'No hay opciones',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  // Filter items based on search
  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleItem = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(i => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => onChange(items.map(item => item.id));
  const clearAll = () => onChange([]);

  // Get display text
  const getDisplayText = () => {
    if (selectedIds.length === 0) return placeholder;
    if (selectedIds.length === 1) {
      const item = items.find(i => i.id === selectedIds[0]);
      return item?.name || '1 seleccionado';
    }
    return `${selectedIds.length} seleccionados`;
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label
          className="block text-xs font-medium mb-1"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-2 text-sm transition-all"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: selectedIds.length > 0 ? 'var(--text-primary)' : 'var(--text-secondary)'
        }}
      >
        <span className="flex-1 truncate">{getDisplayText()}</span>
        {selectedIds.length > 0 && (
          <span
            className="px-1.5 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            {selectedIds.length}
          </span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-muted)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg shadow-xl overflow-hidden animate-scale-in"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          {/* Search */}
          <div className="p-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-2.5 py-1.5 rounded-md text-xs"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)'
              }}
              autoFocus
            />
          </div>

          {/* Quick actions */}
          {items.length > 0 && (
            <div
              className="flex gap-2 px-2 py-1.5 text-xs"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              <button
                type="button"
                onClick={selectAll}
                className="hover:underline"
                style={{ color: 'var(--accent-primary)' }}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="hover:underline"
                style={{ color: 'var(--text-muted)' }}
              >
                Ninguno
              </button>
            </div>
          )}

          {/* Options */}
          <div className="max-h-40 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <p className="px-3 py-2 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                {emptyMessage}
              </p>
            ) : (
              filteredItems.map(item => {
                const isSelected = selectedIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 transition-colors hover:bg-black/5"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-primary-dim)' : 'transparent',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                    }}
                  >
                    {/* Checkbox */}
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${!isSelected ? 'border' : ''}`}
                      style={{
                        backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                        borderColor: 'var(--text-muted)'
                      }}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>

                    {/* Icon */}
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

                    <span className="truncate">{item.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiSelectDropdown;
