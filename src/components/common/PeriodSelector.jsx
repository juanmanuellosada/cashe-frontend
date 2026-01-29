import React from 'react';

/**
 * PeriodSelector - Selector de período con botones
 *
 * @param {string} value - Período seleccionado ('weekly' | 'monthly' | 'yearly' | 'custom')
 * @param {function} onChange - Callback cuando cambia el período
 * @param {boolean} showCustom - Mostrar opción personalizada
 */
function PeriodSelector({
  value,
  onChange,
  showCustom = true,
  className = '',
}) {
  const periods = [
    { value: 'weekly', label: 'Semanal', shortLabel: '7D' },
    { value: 'monthly', label: 'Mensual', shortLabel: '30D' },
    { value: 'yearly', label: 'Anual', shortLabel: '1A' },
  ];

  if (showCustom) {
    periods.push({ value: 'custom', label: 'Personalizado', shortLabel: '...' });
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {periods.map((period) => {
        const isSelected = value === period.value;
        return (
          <button
            key={period.value}
            type="button"
            onClick={() => onChange(period.value)}
            className={`
              px-4 py-2.5 rounded-xl text-sm font-medium transition-all
              ${isSelected ? 'ring-2 ring-offset-1' : 'hover:opacity-80'}
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
            <span className="hidden sm:inline">{period.label}</span>
            <span className="sm:hidden">{period.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

export default PeriodSelector;
