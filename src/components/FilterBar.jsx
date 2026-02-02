import { useState } from 'react';

function FilterBar({
  accounts = [],
  categories = { ingresos: [], gastos: [] },
  filters,
  onFilterChange
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const allCategories = [...(categories.ingresos || []), ...(categories.gastos || [])];

  // Toggle a value in an array filter
  const toggleArrayFilter = (key, value) => {
    const current = filters[key] || [];
    let newValue;

    if (current.includes(value)) {
      newValue = current.filter(v => v !== value);
    } else {
      newValue = [...current, value];
    }

    onFilterChange?.({ ...filters, [key]: newValue });
  };

  // Check if a value is selected in an array filter
  const isSelected = (key, value) => {
    const current = filters[key] || [];
    return current.includes(value);
  };

  // Count active filters
  const activeFiltersCount = [
    (filters.tipos?.length > 0 && filters.tipos?.length < 3),
    (filters.cuentas?.length > 0),
    (filters.categorias?.length > 0),
  ].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    onFilterChange?.({ tipos: [], cuentas: [], categorias: [] });
  };

  return (
    <div className="space-y-2">
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-[0.98]"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
      >
        <svg className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="font-medium">Filtros</span>
        {activeFiltersCount > 0 && (
          <span
            className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
            style={{ 
              backgroundColor: 'var(--accent-primary)', 
              color: 'white',
              boxShadow: '0 2px 8px var(--accent-primary-glow)'
            }}
          >
            {activeFiltersCount}
          </span>
        )}
        <svg 
          className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filters Panel */}
      {isExpanded && (
        <div
          className="p-4 rounded-2xl space-y-4 animate-scale-in card-glass"
        >
          {/* Tipo - Multi select */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-secondary)' }}>
              Tipo de movimiento
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'ingreso', label: 'Ingresos', color: 'var(--accent-green)', glow: 'rgba(0, 217, 154, 0.3)' },
                { value: 'gasto', label: 'Gastos', color: 'var(--accent-red)', glow: 'rgba(255, 92, 114, 0.3)' },
                { value: 'transferencia', label: 'Transferencias', color: 'var(--accent-blue)', glow: 'rgba(59, 130, 246, 0.3)' },
              ].map((option) => {
                const selected = isSelected('tipos', option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleArrayFilter('tipos', option.value)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
                    style={{
                      backgroundColor: selected ? option.color : 'var(--bg-secondary)',
                      color: selected ? 'white' : 'var(--text-secondary)',
                      boxShadow: selected ? `0 4px 16px ${option.glow}` : 'none',
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cuentas - Multi select */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-secondary)' }}>
              Cuentas
            </label>
            <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto custom-scrollbar">
              {accounts.map((account) => {
                const selected = isSelected('cuentas', account.nombre);
                return (
                  <button
                    key={account.nombre}
                    onClick={() => toggleArrayFilter('cuentas', account.nombre)}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
                    style={{
                      backgroundColor: selected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: selected ? 'white' : 'var(--text-secondary)',
                      boxShadow: selected ? '0 4px 16px var(--accent-primary-glow)' : 'none',
                    }}
                  >
                    {account.nombre}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Categorias - Multi select */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-secondary)' }}>
              Categorías
            </label>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto custom-scrollbar">
              {categories.ingresos?.length > 0 && (
                <>
                  <span className="w-full text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-green)' }}>Ingresos:</span>
                  {categories.ingresos.map((cat) => {
                    // Support both string and object format
                    const catValue = typeof cat === 'string' ? cat : cat.value;
                    const catLabel = typeof cat === 'string' ? cat : cat.label;
                    const selected = isSelected('categorias', catValue);
                    return (
                      <button
                        key={catValue}
                        onClick={() => toggleArrayFilter('categorias', catValue)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
                        style={{
                          backgroundColor: selected ? 'var(--accent-green)' : 'var(--bg-secondary)',
                          color: selected ? 'white' : 'var(--text-secondary)',
                          boxShadow: selected ? '0 4px 16px rgba(0, 217, 154, 0.3)' : 'none',
                        }}
                      >
                        {catLabel}
                      </button>
                    );
                  })}
                </>
              )}
              {categories.gastos?.length > 0 && (
                <>
                  <span className="w-full text-[10px] font-semibold uppercase tracking-wider mt-2" style={{ color: 'var(--accent-red)' }}>Gastos:</span>
                  {categories.gastos.map((cat) => {
                    // Support both string and object format
                    const catValue = typeof cat === 'string' ? cat : cat.value;
                    const catLabel = typeof cat === 'string' ? cat : cat.label;
                    const selected = isSelected('categorias', catValue);
                    return (
                      <button
                        key={catValue}
                        onClick={() => toggleArrayFilter('categorias', catValue)}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95"
                        style={{
                          backgroundColor: selected ? 'var(--accent-red)' : 'var(--bg-secondary)',
                          color: selected ? 'white' : 'var(--text-secondary)',
                          boxShadow: selected ? '0 4px 16px rgba(255, 92, 114, 0.3)' : 'none',
                        }}
                      >
                        {catLabel}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={clearFilters}
                className="text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 hover:opacity-80 active:scale-95"
                style={{ color: 'var(--accent-primary)' }}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default FilterBar;
