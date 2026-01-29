import React from 'react';

/**
 * ProgressBar - Barra de progreso con colores dinámicos
 *
 * @param {number} value - Valor actual
 * @param {number} max - Valor máximo (default: 100)
 * @param {string} variant - 'budget' (verde->rojo) o 'goal' (rojo->verde)
 * @param {boolean} showLabel - Mostrar porcentaje
 * @param {string} size - 'sm' | 'md' | 'lg'
 * @param {boolean} animated - Animación de la barra
 */
function ProgressBar({
  value = 0,
  max = 100,
  variant = 'budget',
  showLabel = true,
  size = 'md',
  animated = true,
  className = '',
}) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 150); // Cap at 150% for display
  const displayPercentage = Math.min(percentage, 100); // For bar width

  // Budget: green -> yellow -> orange -> red as it increases (spending limit)
  // Goal: red -> yellow -> green as it increases (achievement)
  const getColor = () => {
    if (variant === 'budget') {
      if (percentage <= 50) return 'var(--accent-green)';
      if (percentage <= 75) return 'var(--accent-yellow, #eab308)';
      if (percentage <= 100) return 'var(--accent-orange, #f97316)';
      return 'var(--accent-red)';
    } else {
      // Goal variant
      if (percentage < 25) return 'var(--accent-red)';
      if (percentage < 50) return 'var(--accent-orange, #f97316)';
      if (percentage < 75) return 'var(--accent-yellow, #eab308)';
      return 'var(--accent-green)';
    }
  };

  const getBackgroundColor = () => {
    const color = getColor();
    // Create a dimmed version
    if (color.includes('--accent-green')) return 'var(--accent-green-dim, rgba(34, 197, 94, 0.15))';
    if (color.includes('--accent-red')) return 'var(--accent-red-dim, rgba(239, 68, 68, 0.15))';
    if (color.includes('yellow')) return 'rgba(234, 179, 8, 0.15)';
    if (color.includes('orange')) return 'rgba(249, 115, 22, 0.15)';
    return 'var(--bg-tertiary)';
  };

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  return (
    <div className={`w-full ${className}`}>
      <div
        className={`w-full rounded-full overflow-hidden ${heights[size]}`}
        style={{ backgroundColor: getBackgroundColor() }}
      >
        <div
          className={`h-full rounded-full ${animated ? 'transition-all duration-500 ease-out' : ''}`}
          style={{
            width: `${displayPercentage}%`,
            backgroundColor: getColor(),
          }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span
            className="text-xs font-medium"
            style={{ color: percentage > 100 ? 'var(--accent-red)' : 'var(--text-secondary)' }}
          >
            {percentage.toFixed(0)}%
            {percentage > 100 && variant === 'budget' && ' (excedido)'}
            {percentage >= 100 && variant === 'goal' && ' (completado)'}
          </span>
        </div>
      )}
    </div>
  );
}

export default ProgressBar;
