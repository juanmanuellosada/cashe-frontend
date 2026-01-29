import React from 'react';
import ProgressBar from '../common/ProgressBar';
import { formatCurrency } from '../../utils/format';

/**
 * GoalCard - Card de meta con barra de progreso
 */
function GoalCard({
  goal,
  onClick,
  categories = [],
  accounts = [],
}) {
  const {
    name,
    goal_type,
    target_amount,
    currency,
    currentAmount = 0,
    percentageAchieved = 0,
    period_type,
    daysRemaining = 0,
    is_completed,
    is_global,
    category_ids = [],
    account_ids = [],
    icon,
    isOnTrack,
  } = goal;

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

  const goalTypeLabels = {
    income: 'Ingreso',
    savings: 'Ahorro',
    spending_reduction: 'Reducir gasto',
  };

  const goalTypeColors = {
    income: { bg: 'var(--accent-green-dim)', color: 'var(--accent-green)' },
    savings: { bg: 'var(--accent-blue-dim, rgba(59, 130, 246, 0.15))', color: 'var(--accent-blue)' },
    spending_reduction: { bg: 'var(--accent-purple-dim, rgba(168, 85, 247, 0.15))', color: 'var(--accent-purple, #a855f7)' },
  };

  const typeStyle = goalTypeColors[goal_type] || goalTypeColors.income;
  const isAchieved = percentageAchieved >= 100;

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-2xl p-4 cursor-pointer transition-all
        hover:scale-[1.02] hover:shadow-lg
        ${is_completed ? 'ring-2 ring-offset-2' : ''}
      `}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: is_completed ? '2px solid var(--accent-green)' : '1px solid var(--border-subtle)',
        '--tw-ring-color': 'var(--accent-green)',
        '--tw-ring-offset-color': 'var(--bg-primary)',
      }}
    >
      {/* Completion celebration */}
      {is_completed && (
        <div
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-lg"
          style={{ backgroundColor: 'var(--accent-green)' }}
        >
          🎉
        </div>
      )}

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

        {/* Goal type badge */}
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: typeStyle.bg,
            color: typeStyle.color,
          }}
        >
          {goalTypeLabels[goal_type]}
        </span>
      </div>

      {/* Progress bar */}
      <ProgressBar
        value={currentAmount}
        max={target_amount}
        variant="goal"
        size="md"
        showLabel={false}
        className="mb-3"
      />

      {/* Amount display */}
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <span
            className="text-lg font-bold"
            style={{ color: isAchieved ? 'var(--accent-green)' : 'var(--text-primary)' }}
          >
            {formatCurrency(Math.max(0, currentAmount), currency)}
          </span>
          <span
            className="text-sm ml-1"
            style={{ color: 'var(--text-muted)' }}
          >
            / {formatCurrency(target_amount, currency)}
          </span>
        </div>
        <span
          className="text-sm font-medium"
          style={{ color: isAchieved ? 'var(--accent-green)' : 'var(--text-secondary)' }}
        >
          {percentageAchieved.toFixed(0)}%
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
        {!is_completed && (
          <span
            className="flex items-center gap-1"
            style={{ color: isOnTrack ? 'var(--accent-green)' : 'var(--accent-yellow, #eab308)' }}
          >
            {isOnTrack ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                En camino
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Atrasado
              </>
            )}
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
            {goal_type === 'income' ? 'Todos los ingresos' : goal_type === 'savings' ? 'Balance general' : 'Todos los gastos'}
          </span>
        </div>
      )}
    </div>
  );
}

export default GoalCard;
