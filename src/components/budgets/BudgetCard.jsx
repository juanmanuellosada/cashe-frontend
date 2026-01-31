import React from 'react';
import ProgressBar from '../common/ProgressBar';
import { formatCurrency } from '../../utils/format';

/**
 * BudgetCard - Card de presupuesto con barra de progreso
 */
function BudgetCard({
  budget,
  onClick,
  onPause,
  onDelete,
  categories = [],
  accounts = [],
}) {
  const {
    name,
    amount,
    currency,
    spent = 0,
    remaining = 0,
    percentageUsed = 0,
    period_type,
    daysRemaining = 0,
    is_paused,
    is_global,
    category_ids = [],
    account_ids = [],
    icon,
    // Projected recurring fields
    projectedRecurring = 0,
    projectedTotal = 0,
    projectedRemaining = 0,
    projectedPercentageUsed = 0,
  } = budget;

  // Get category/account names for display
  const categoryNames = category_ids
    .map((id) => {
      const cat = categories.find((c) => c.id === id);
      return cat?.nombre || cat?.name;
    })
    .filter(Boolean)
    .slice(0, 2);

  const accountNames = account_ids
    .map((id) => {
      const acc = accounts.find((a) => a.id === id);
      return acc?.nombre || acc?.name;
    })
    .filter(Boolean)
    .slice(0, 2);

  const periodLabels = {
    weekly: 'Semanal',
    monthly: 'Mensual',
    yearly: 'Anual',
    custom: 'Personalizado',
  };

  const isExceeded = percentageUsed > 100;
  const hasProjectedRecurring = projectedRecurring > 0;
  const willBeExceeded = !isExceeded && projectedPercentageUsed > 100;

  // Calculate daily averages
  const daysElapsed = Math.max(1, (period_type === 'weekly' ? 7 : period_type === 'monthly' ? 30 : 365) - daysRemaining);
  const dailySpent = spent / daysElapsed;
  const dailyAvailable = daysRemaining > 0 ? remaining / daysRemaining : 0;

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-2xl p-4 cursor-pointer transition-all
        hover:scale-[1.02] hover:shadow-lg
        ${is_paused ? 'opacity-60' : ''}
      `}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: isExceeded ? '2px solid var(--accent-red)' : '1px solid var(--border-subtle)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <span className="text-xl">{icon}</span>
          )}
          <div>
            <h3
              className="font-semibold text-sm"
              style={{ color: 'var(--text-primary)' }}
            >
              {name}
            </h3>
            <span
              className="text-xs"
              style={{ color: 'var(--text-muted)' }}
            >
              {periodLabels[period_type]}
            </span>
          </div>
        </div>

        {/* Status badge */}
        {is_paused ? (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
            }}
          >
            Pausado
          </span>
        ) : isExceeded ? (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'var(--accent-red-dim)',
              color: 'var(--accent-red)',
            }}
          >
            Excedido
          </span>
        ) : willBeExceeded ? (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1"
            style={{
              backgroundColor: 'var(--accent-yellow-dim)',
              color: 'var(--accent-yellow)',
            }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
            </svg>
            Atención
          </span>
        ) : null}
      </div>

      {/* Progress bar */}
      <ProgressBar
        value={spent}
        max={amount}
        variant="budget"
        size="md"
        showLabel={false}
        className="mb-3"
      />

      {/* Amount display */}
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <span
            className="text-lg font-bold"
            style={{ color: isExceeded ? 'var(--accent-red)' : 'var(--text-primary)' }}
          >
            {formatCurrency(spent, currency)}
          </span>
          <span
            className="text-sm ml-1"
            style={{ color: 'var(--text-muted)' }}
          >
            / {formatCurrency(amount, currency)}
          </span>
        </div>
        <span
          className="text-sm font-medium"
          style={{ color: isExceeded ? 'var(--accent-red)' : 'var(--text-secondary)' }}
        >
          {percentageUsed.toFixed(0)}%
        </span>
      </div>

      {/* Stats row */}
      <div
        className="flex items-center justify-between text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        <div className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{daysRemaining} días restantes</span>
        </div>
        {remaining > 0 && !is_paused && (
          <span>
            ~{formatCurrency(dailyAvailable, currency)}/día disponible
          </span>
        )}
      </div>

      {/* Projected recurring section */}
      {hasProjectedRecurring && !is_paused && (
        <div
          className="mt-3 pt-3 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: 'var(--accent-purple)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--accent-purple)' }}
            >
              Recurrentes pendientes
            </span>
          </div>

          {/* Projected progress bar */}
          <div className="relative h-1.5 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            {/* Current spent (solid) */}
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all"
              style={{
                width: `${Math.min(percentageUsed, 100)}%`,
                backgroundColor: isExceeded ? 'var(--accent-red)' : 'var(--accent-primary)',
              }}
            />
            {/* Projected recurring (striped) */}
            <div
              className="absolute top-0 h-full rounded-full transition-all"
              style={{
                left: `${Math.min(percentageUsed, 100)}%`,
                width: `${Math.min(projectedPercentageUsed - percentageUsed, 100 - percentageUsed)}%`,
                background: willBeExceeded
                  ? 'repeating-linear-gradient(45deg, var(--accent-red), var(--accent-red) 2px, var(--accent-red-dim) 2px, var(--accent-red-dim) 4px)'
                  : 'repeating-linear-gradient(45deg, var(--accent-purple), var(--accent-purple) 2px, var(--accent-purple-dim) 2px, var(--accent-purple-dim) 4px)',
              }}
            />
          </div>

          {/* Projected amounts */}
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--text-muted)' }}>
              +{formatCurrency(projectedRecurring, currency)} programados
            </span>
            <span
              className="font-medium"
              style={{ color: willBeExceeded ? 'var(--accent-red)' : 'var(--text-secondary)' }}
            >
              Proyectado: {projectedPercentageUsed.toFixed(0)}%
            </span>
          </div>

          {/* Warning if will exceed */}
          {willBeExceeded && (
            <div
              className="flex items-center gap-1.5 mt-2 px-2 py-1.5 rounded-lg text-xs"
              style={{
                backgroundColor: 'var(--accent-red-dim)',
                color: 'var(--accent-red)',
              }}
            >
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Excederá el presupuesto con recurrentes</span>
            </div>
          )}
        </div>
      )}

      {/* Scope tags */}
      {!is_global && (category_ids.length > 0 || account_ids.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {categoryNames.map((name, i) => (
            <span
              key={`cat-${i}`}
              className="px-2 py-0.5 rounded-full text-xs"
              style={{
                backgroundColor: 'var(--accent-primary-dim)',
                color: 'var(--accent-primary)',
              }}
            >
              {name}
            </span>
          ))}
          {category_ids.length > 2 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
            >
              +{category_ids.length - 2}
            </span>
          )}
          {accountNames.map((name, i) => (
            <span
              key={`acc-${i}`}
              className="px-2 py-0.5 rounded-full text-xs"
              style={{
                backgroundColor: 'var(--accent-blue-dim, rgba(59, 130, 246, 0.15))',
                color: 'var(--accent-blue)',
              }}
            >
              {name}
            </span>
          ))}
        </div>
      )}

      {is_global && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <span
            className="px-2 py-0.5 rounded-full text-xs"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
            }}
          >
            Todos los gastos
          </span>
        </div>
      )}

      {/* Quick actions (stop propagation) */}
      <div
        className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {onPause && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPause(budget);
            }}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/10"
            title={is_paused ? 'Reanudar' : 'Pausar'}
          >
            {is_paused ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default BudgetCard;
