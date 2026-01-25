import { useState, useRef, useEffect } from 'react';
import { isEmoji, resolveIconPath } from '../services/iconStorage';

// Component to render an icon (emoji or image)
const OptionIcon = ({ icon, defaultIcon, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 text-sm',
    md: 'w-6 h-6 text-base',
    lg: 'w-8 h-8 text-lg',
  };

  if (!icon && !defaultIcon) return null;

  const iconToShow = icon || defaultIcon;

  if (isEmoji(iconToShow)) {
    return (
      <span className={`flex items-center justify-center ${sizeClasses[size]} ${className}`}>
        {iconToShow}
      </span>
    );
  }

  return (
    <img
      src={resolveIconPath(iconToShow)}
      alt=""
      className={`${sizeClasses[size]} rounded object-cover flex-shrink-0 ${className}`}
    />
  );
};

function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  name,
  icon,
  emptyMessage = 'No hay opciones',
  onCreateNew,
  createNewLabel = 'Crear nueva',
  defaultOptionIcon, // Default icon for options without an icon
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Find selected option
  const selectedOption = options.find(opt =>
    typeof opt === 'string' ? opt === value : opt.value === value
  );
  const selectedLabel = typeof selectedOption === 'string'
    ? selectedOption
    : selectedOption?.label || '';
  const selectedIcon = typeof selectedOption === 'object' ? selectedOption?.icon : null;

  // Filter options based on search
  const filteredOptions = options.filter(opt => {
    const label = typeof opt === 'string' ? opt : opt.label;
    return label.toLowerCase().includes(search.toLowerCase());
  });

  // Handle option selection
  const handleSelect = (opt) => {
    const optValue = typeof opt === 'string' ? opt : opt.value;
    onChange({ target: { name, value: optValue } });
    setSearch('');
    setIsOpen(false);
  };

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

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-xl text-left flex items-center gap-3 transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-primary)]"
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          color: value ? 'var(--text-primary)' : 'var(--text-secondary)'
        }}
      >
        {/* Show selected option's icon, or default icon, or generic icon */}
        {value && (selectedIcon || defaultOptionIcon) ? (
          <OptionIcon icon={selectedIcon} defaultIcon={defaultOptionIcon} size="md" />
        ) : icon ? (
          <span style={{ color: 'var(--text-secondary)' }}>
            {icon}
          </span>
        ) : null}
        <span className="flex-1 truncate">
          {selectedLabel || placeholder}
        </span>
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          style={{ color: 'var(--text-secondary)' }}
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
          className="absolute z-50 mt-2 w-full rounded-xl shadow-xl overflow-hidden animate-scale-in"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          {/* Search input */}
          <div className="p-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-secondary)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((opt, index) => {
                const optValue = typeof opt === 'string' ? opt : opt.value;
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                const optIcon = typeof opt === 'object' ? opt.icon : null;
                const isSelected = optValue === value;

                return (
                  <button
                    key={optValue}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                      isSelected ? 'font-medium' : ''
                    }`}
                    style={{
                      backgroundColor: isSelected ? 'var(--accent-primary-dim)' : 'transparent',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {(optIcon || defaultOptionIcon) && (
                        <OptionIcon icon={optIcon} defaultIcon={defaultOptionIcon} size="sm" />
                      )}
                      <span className={isSelected || optIcon || defaultOptionIcon ? '' : 'ml-6'}>{optLabel}</span>
                    </div>
                  </button>
                );
              })
            )}
            
            {/* Create new option button */}
            {onCreateNew && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setSearch('');
                  onCreateNew(search);
                }}
                className="w-full px-4 py-3 text-left text-sm transition-colors flex items-center gap-2"
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  color: 'var(--accent-primary)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent-primary-dim)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-medium">{createNewLabel}</span>
                {search && (
                  <span style={{ color: 'var(--text-secondary)' }}>"{search}"</span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Combobox;
