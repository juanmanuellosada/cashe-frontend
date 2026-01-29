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
