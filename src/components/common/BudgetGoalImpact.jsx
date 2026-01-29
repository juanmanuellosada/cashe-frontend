import React, { useMemo } from 'react';
import ProgressBar from './ProgressBar';
import { formatCurrency } from '../../utils/format';

/**
 * BudgetGoalImpact - Muestra el impacto de un movimiento en presupuestos y metas
 *
 * @param {string} type - 'expense' | 'income'
 * @param {number} amount - Monto del movimiento
 * @param {string} categoryId - ID de la categoría
 * @param {string} accountId - ID de la cuenta
 * @param {string} currency - Moneda del movimiento
 * @param {Array} budgets - Lista de presupuestos con progreso
 * @param {Array} goals - Lista de metas con progreso
 */
function BudgetGoalImpact({
  type,
  amount,
  categoryId,
  accountId,
  currency = 'ARS',
  budgets = [],
  goals = [],
}) {
  // Encontrar presupuestos afectados (solo para gastos)
  const affectedBudgets = useMemo(() => {
    if (type !== 'expense' || !amount || amount <= 0) return [];

    return budgets.filter((budget) => {
      // Solo presupuestos activos y no pausados
      if (!budget.is_active || budget.is_paused) return false;

      // Verificar moneda
      if (budget.currency !== currency) return false;

      // Presupuesto global afecta todos los gastos
      if (budget.is_global) return true;

      // Verificar si la categoría está en el presupuesto
      if (budget.category_ids?.length > 0 && categoryId) {
        if (!budget.category_ids.includes(categoryId)) return false;
      }

      // Verificar si la cuenta está en el presupuesto
      if (budget.account_ids?.length > 0 && accountId) {
        if (!budget.account_ids.includes(accountId)) return false;
      }

      return true;
    }).map((budget) => {
      const newSpent = (budget.spent || 0) + amount;
      const newRemaining = budget.amount - newSpent;
      const newPercentage = (newSpent / budget.amount) * 100;
      const willExceed = newSpent > budget.amount;

      return {
        ...budget,
        newSpent,
        newRemaining,
        newPercentage,
        willExceed,
      };
    });
  }, [type, amount, categoryId, accountId, currency, budgets]);

  // Encontrar metas afectadas (para ingresos o reducción de gastos)
  const affectedGoals = useMemo(() => {
    if (!amount || amount <= 0) return [];

    return goals.filter((goal) => {
      // Solo metas activas y no completadas
      if (!goal.is_active || goal.is_completed) return false;

      // Verificar moneda
      if (goal.currency !== currency) return false;

      // Meta de ingreso solo afectada por ingresos
      if (goal.goal_type === 'income' && type !== 'income') return false;

      // Meta de reducción de gasto solo afectada por gastos
      if (goal.goal_type === 'spending_reduction' && type !== 'expense') return false;

      // Meta global afecta todos
      if (goal.is_global) return true;

      // Verificar si la categoría está en la meta
      if (goal.category_ids?.length > 0 && categoryId) {
        if (!goal.category_ids.includes(categoryId)) return false;
      }

      // Verificar si la cuenta está en la meta
      if (goal.account_ids?.length > 0 && accountId) {
        if (!goal.account_ids.includes(accountId)) return false;
      }

      return true;
    }).map((goal) => {
      const currentAmount = goal.currentAmount || 0;
      let newAmount = currentAmount;
      let isPositive = false;

      if (goal.goal_type === 'income') {
        newAmount = currentAmount + amount;
        isPositive = true;
      } else if (goal.goal_type === 'spending_reduction') {
        // Para reducción de gasto, más gasto significa más lejos de la meta
        newAmount = currentAmount + amount;
        isPositive = false;
      }

      const newPercentage = (newAmount / goal.target_amount) * 100;
      const willComplete = goal.goal_type === 'income' && newAmount >= goal.target_amount;

      return {
        ...goal,
        newAmount,
        newPercentage,
        willComplete,
        isPositive,
      };
    });
  }, [type, amount, categoryId, accountId, currency, goals]);

  // Si no hay impacto, no mostrar nada
  if (affectedBudgets.length === 0 && affectedGoals.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-xl p-4 space-y-3 animate-fade-in"
      style={{
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4"
          style={{ color: 'var(--accent-primary)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span
          className="text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          Impacto en tus finanzas
        </span>
      </div>

      {/* Presupuestos afectados */}
      {affectedBudgets.map((budget) => (
        <div
          key={budget.id}
          className="p-3 rounded-lg"
          style={{
            backgroundColor: budget.willExceed
              ? 'rgba(239, 68, 68, 0.1)'
              : 'var(--bg-secondary)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{budget.icon || '💰'}</span>
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {budget.name}
              </span>
            </div>
            {budget.willExceed && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: 'var(--accent-red)',
                }}
              >
                ⚠️ Excederá
              </span>
            )}
          </div>

          <ProgressBar
            value={budget.newSpent}
            max={budget.amount}
            variant="budget"
            size="sm"
            showLabel={false}
          />

          <div className="flex justify-between mt-2 text-xs">
            <span style={{ color: 'var(--text-muted)' }}>
              {formatCurrency(budget.spent || 0, budget.currency)} →{' '}
              <span
                style={{
                  color: budget.willExceed
                    ? 'var(--accent-red)'
                    : 'var(--text-primary)',
                  fontWeight: 500,
                }}
              >
                {formatCurrency(budget.newSpent, budget.currency)}
              </span>
            </span>
            <span
              style={{
                color: budget.newRemaining < 0
                  ? 'var(--accent-red)'
                  : 'var(--text-muted)',
              }}
            >
              {budget.newRemaining >= 0 ? 'Queda: ' : 'Exceso: '}
              {formatCurrency(Math.abs(budget.newRemaining), budget.currency)}
            </span>
          </div>
        </div>
      ))}

      {/* Metas afectadas */}
      {affectedGoals.map((goal) => (
        <div
          key={goal.id}
          className="p-3 rounded-lg"
          style={{
            backgroundColor: goal.willComplete
              ? 'rgba(34, 197, 94, 0.1)'
              : 'var(--bg-secondary)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{goal.icon || '🎯'}</span>
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {goal.name}
              </span>
            </div>
            {goal.willComplete && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  color: 'var(--accent-green)',
                }}
              >
                🎉 ¡Completada!
              </span>
            )}
          </div>

          <ProgressBar
            value={goal.newAmount}
            max={goal.target_amount}
            variant="goal"
            size="sm"
            showLabel={false}
          />

          <div className="flex justify-between mt-2 text-xs">
            <span style={{ color: 'var(--text-muted)' }}>
              {formatCurrency(goal.currentAmount || 0, goal.currency)} →{' '}
              <span
                style={{
                  color: goal.isPositive
                    ? 'var(--accent-green)'
                    : 'var(--accent-red)',
                  fontWeight: 500,
                }}
              >
                {formatCurrency(goal.newAmount, goal.currency)}
              </span>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              Meta: {formatCurrency(goal.target_amount, goal.currency)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default BudgetGoalImpact;
