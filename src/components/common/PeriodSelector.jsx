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
    { value: 'weekly', label: 'Sem', labelFull: 'Semanal' },
    { value: 'monthly', label: 'Mes', labelFull: 'Mensual' },
    { value: 'yearly', label: 'Año', labelFull: 'Anual' },
  ];

  if (showCustom) {
    periods.push({ value: 'custom', label: 'Otro', labelFull: 'Personalizado' });
  }

  return (
    <div className={`flex gap-1 sm:gap-2 ${className}`}>
      {periods.map((period) => {
        const isSelected = value === period.value;
        return (
          <button
            key={period.value}
            type="button"
            onClick={() => onChange(period.value)}
            className={`
              flex-1 px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-medium transition-all
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
            <span className="sm:hidden">{period.label}</span>
            <span className="hidden sm:inline">{period.labelFull}</span>
          </button>
        );
      })}
    </div>
  );
}

export default PeriodSelector;
