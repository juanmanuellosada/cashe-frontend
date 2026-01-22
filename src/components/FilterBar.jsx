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
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span>Filtros</span>
        {activeFiltersCount > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
          >
            {activeFiltersCount}
          </span>
        )}
        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Filters Panel */}
      {isExpanded && (
        <div
          className="p-3 rounded-xl space-y-3"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          {/* Tipo - Multi select */}
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Tipo (selecciona uno o mas)
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'ingreso', label: 'Ingresos', color: 'var(--accent-green)' },
                { value: 'gasto', label: 'Gastos', color: 'var(--accent-red)' },
                { value: 'transferencia', label: 'Transferencias', color: 'var(--accent-blue)' },
              ].map((option) => {
                const selected = isSelected('tipos', option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleArrayFilter('tipos', option.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: selected ? option.color : 'var(--bg-secondary)',
                      color: selected ? 'white' : 'var(--text-secondary)',
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
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Cuentas (selecciona una o mas)
            </label>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {accounts.map((account) => {
                const selected = isSelected('cuentas', account.nombre);
                return (
                  <button
                    key={account.nombre}
                    onClick={() => toggleArrayFilter('cuentas', account.nombre)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                    style={{
                      backgroundColor: selected ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: selected ? 'white' : 'var(--text-secondary)',
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
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Categorias (selecciona una o mas)
            </label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {categories.ingresos?.length > 0 && (
                <>
                  <span className="w-full text-xs opacity-60" style={{ color: 'var(--accent-green)' }}>Ingresos:</span>
                  {categories.ingresos.map((cat) => {
                    const selected = isSelected('categorias', cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleArrayFilter('categorias', cat)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: selected ? 'var(--accent-green)' : 'var(--bg-secondary)',
                          color: selected ? 'white' : 'var(--text-secondary)',
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </>
              )}
              {categories.gastos?.length > 0 && (
                <>
                  <span className="w-full text-xs opacity-60 mt-1" style={{ color: 'var(--accent-red)' }}>Gastos:</span>
                  {categories.gastos.map((cat) => {
                    const selected = isSelected('categorias', cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleArrayFilter('categorias', cat)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                        style={{
                          backgroundColor: selected ? 'var(--accent-red)' : 'var(--bg-secondary)',
                          color: selected ? 'white' : 'var(--text-secondary)',
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Clear Filters */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs font-medium"
              style={{ color: 'var(--accent-primary)' }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default FilterBar;
