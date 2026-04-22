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
 * @param {string} date - Fecha del movimiento (yyyy-mm-dd)
 * @param {Array} budgets - Lista de presupuestos con progreso
 * @param {Array} goals - Lista de metas con progreso
 */
function BudgetGoalImpact({
  type,
  amount,
  categoryId,
  accountId,
  currency = 'ARS',
  date,
  budgets = [],
  goals = [],
}) {
  // Supabase can return a `date` column as "YYYY-MM-DD" or as a fuller ISO
  // timestamp depending on the postgrest version. Trim to the first 10 chars
  // before comparing so `"2026-04-22" < "2026-04-22T00:00:00"` doesn't fire
  // (the shorter string would otherwise sort first and filter out a goal on
  // its own start date).
  const toDateOnly = (v) => (typeof v === 'string' ? v.slice(0, 10) : v);

  // Verifica si la fecha del movimiento cae dentro de la vigencia del ítem.
  // Usamos start_date/end_date directamente (no currentPeriod, que está
  // anclado a "hoy") — si el usuario registra un gasto de mayo y el
  // presupuesto mensual arrancó en enero, debe aparecer igual.
  const isWithinLifetime = (movementDate, item) => {
    if (!movementDate) return true;
    const m = toDateOnly(movementDate);
    const s = toDateOnly(item?.start_date);
    const e = toDateOnly(item?.end_date);
    if (s && m < s) return false;
    if (e && m > e) return false;
    return true;
  };

  // Determina si la fecha del movimiento cae dentro del período actual del
  // ítem (el mes/semana/año que contiene "hoy"). Se usa solo para decidir si
  // los números de `spent`/`currentAmount` son aplicables al impacto.
  const isInCurrentPeriod = (movementDate, period) => {
    if (!period?.start || !period?.end) return false;
    if (!movementDate) return false;
    const m = toDateOnly(movementDate);
    return m >= toDateOnly(period.start) && m <= toDateOnly(period.end);
  };

  // Normalize amount — we still show applicable items when amount is 0/NaN
  // so the user can see what's affected as they pick date/account/category.
  const parsedAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const hasAmount = parsedAmount > 0;

  // Encontrar presupuestos afectados (solo para gastos)
  const affectedBudgets = useMemo(() => {
    if (type !== 'expense') return [];

    return budgets.filter((budget) => {
      // Solo presupuestos activos y no pausados
      if (!budget.is_active || budget.is_paused) return false;

      // Verificar moneda
      if (budget.currency !== currency) return false;

      // La fecha del movimiento debe caer dentro de la vigencia del presupuesto
      if (!isWithinLifetime(date, budget)) return false;

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
      // If the movement falls in the current period, current `spent` is the
      // right baseline. If the movement is in a different period (past or
      // future of the recurring cycle), baseline is 0 for that period — we
      // can't know another period's spent from what's in memory, and showing
      // "April spent + May charge" would be misleading.
      const inCurrent = isInCurrentPeriod(date, budget.currentPeriod);
      const baseline = inCurrent ? (budget.spent || 0) : 0;
      const newSpent = baseline + parsedAmount;
      const newRemaining = budget.amount - newSpent;
      const newPercentage = budget.amount > 0 ? (newSpent / budget.amount) * 100 : 0;
      const willExceed = newSpent > budget.amount;

      return {
        ...budget,
        spent: baseline,
        newSpent,
        newRemaining,
        newPercentage,
        willExceed,
        outOfCurrentPeriod: !inCurrent,
      };
    });
  }, [type, parsedAmount, categoryId, accountId, currency, date, budgets]);

  // Encontrar metas afectadas
  const affectedGoals = useMemo(() => {
    return goals.filter((goal) => {
      // Solo metas activas y no completadas
      if (!goal.is_active || goal.is_completed) return false;

      // Verificar moneda
      if (goal.currency !== currency) return false;

      // Meta de ingreso solo afectada por ingresos
      if (goal.goal_type === 'income' && type !== 'income') return false;

      // Meta de reducción de gasto solo afectada por gastos
      if (goal.goal_type === 'spending_reduction' && type !== 'expense') return false;

      // La fecha del movimiento debe caer dentro de la vigencia de la meta
      if (!isWithinLifetime(date, goal)) return false;

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
      // Same rationale as budgets: if the movement isn't in the goal's
      // current period, the in-memory currentAmount is for a different
      // window — start from 0 instead of adding the two together.
      const inCurrent = isInCurrentPeriod(date, goal.currentPeriod);
      const baseline = inCurrent ? (goal.currentAmount || 0) : 0;
      let newAmount = baseline;
      let isPositive = type === 'income';

      if (goal.goal_type === 'income') {
        // Meta de ingreso: cada ingreso suma al progreso
        newAmount = baseline + parsedAmount;
        isPositive = true;
      } else if (goal.goal_type === 'savings') {
        // Meta de ahorro = ingresos - gastos del período
        if (type === 'income') {
          newAmount = baseline + parsedAmount;
          isPositive = true;
        } else {
          newAmount = baseline - parsedAmount;
          isPositive = false;
        }
      } else if (goal.goal_type === 'spending_reduction') {
        // currentAmount = max(0, baseline - gastado). Más gasto reduce el ahorro.
        const baselineReduction = goal.baseline_amount || goal.target_amount;
        const startFrom = inCurrent ? (goal.currentAmount || 0) : baselineReduction;
        newAmount = Math.max(0, startFrom - parsedAmount);
        isPositive = false;
      }

      const newPercentage = goal.target_amount > 0
        ? (newAmount / goal.target_amount) * 100
        : 0;
      const willComplete =
        (goal.goal_type === 'income' || goal.goal_type === 'savings') &&
        newAmount >= goal.target_amount;

      return {
        ...goal,
        currentAmount: baseline,
        newAmount,
        newPercentage,
        willComplete,
        isPositive,
        outOfCurrentPeriod: !inCurrent,
      };
    });
  }, [type, parsedAmount, categoryId, accountId, currency, date, goals]);

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
          {hasAmount ? 'Impacto en tus finanzas' : 'Se contará acá'}
        </span>
        {!hasAmount && (
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            · ingresá un monto para ver el impacto
          </span>
        )}
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
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg">{budget.icon || '💰'}</span>
              <span
                className="text-sm font-medium truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {budget.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {budget.outOfCurrentPeriod && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-muted)',
                  }}
                  title="Este movimiento cae fuera del período actual del presupuesto"
                >
                  Otro período
                </span>
              )}
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
          </div>

          {hasAmount ? (
            <>
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
            </>
          ) : (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatCurrency(budget.spent || 0, budget.currency)} de {formatCurrency(budget.amount, budget.currency)}
            </div>
          )}
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
          <div className="flex items-center justify-between mb-2 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg">{goal.icon || '🎯'}</span>
              <span
                className="text-sm font-medium truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {goal.name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {goal.outOfCurrentPeriod && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-muted)',
                  }}
                  title="Este movimiento cae fuera del período actual de la meta"
                >
                  Otro período
                </span>
              )}
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
          </div>

          {hasAmount ? (
            <>
              <ProgressBar
                value={Math.max(0, goal.newAmount)}
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
            </>
          ) : (
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatCurrency(goal.currentAmount || 0, goal.currency)} de {formatCurrency(goal.target_amount, goal.currency)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default BudgetGoalImpact;
