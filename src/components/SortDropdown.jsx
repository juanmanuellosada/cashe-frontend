import { useState, useRef, useEffect } from 'react';

/**
 * Componente dropdown para ordenamiento
 * La persistencia en localStorage se maneja en el componente padre (MovementsList)
 */
export default function SortDropdown({
  options, // [{ id: 'date', label: 'Fecha' }, ...]
  value, // { sortBy: 'date', sortOrder: 'desc' }
  onChange, // (newValue) => void
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentOption = options.find(o => o.id === value.sortBy) || options[0];

  const handleOptionClick = (optionId) => {
    if (optionId === value.sortBy) {
      // Toggle order si es la misma opción
      onChange({ sortBy: optionId, sortOrder: value.sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      // Nueva opción, usar orden por defecto (desc para fecha/monto, asc para texto)
      const option = options.find(o => o.id === optionId);
      const defaultOrder = option?.defaultOrder || 'desc';
      onChange({ sortBy: optionId, sortOrder: defaultOrder });
    }
    setIsOpen(false);
  };

  const toggleOrder = (e) => {
    e.stopPropagation();
    onChange({ ...value, sortOrder: value.sortOrder === 'asc' ? 'desc' : 'asc' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: 'var(--text-secondary)',
        }}
      >
        {/* Sort icon */}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        <span className="hidden sm:inline">{currentOption?.label}</span>
        {/* Order indicator */}
        <span
          onClick={toggleOrder}
          className="p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
          title={value.sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && toggleOrder(e)}
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${value.sortOrder === 'asc' ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 py-2 rounded-xl shadow-lg z-50 min-w-[160px] animate-scale-in"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => handleOptionClick(option.id)}
              className="w-full px-4 py-2.5 text-left text-sm flex items-center justify-between gap-3 transition-colors hover:bg-[var(--bg-tertiary)]"
              style={{
                color: value.sortBy === option.id ? 'var(--accent-primary)' : 'var(--text-primary)',
              }}
            >
              <span>{option.label}</span>
              {value.sortBy === option.id && (
                <svg
                  className={`w-4 h-4 transition-transform ${value.sortOrder === 'asc' ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
