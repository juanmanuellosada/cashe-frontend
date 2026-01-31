import React from 'react';
import { formatCurrency } from '../../utils/format';

// Helper to get frequency label
const getFrequencyLabel = (frequency) => {
  if (!frequency) return 'Sin frecuencia';

  switch (frequency.type) {
    case 'daily':
      return 'Diario';
    case 'weekly':
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      return `Semanal (${days[frequency.dayOfWeek] || 'Lun'})`;
    case 'biweekly':
      return 'Quincenal';
    case 'monthly':
      return `Mensual (día ${frequency.day || 1})`;
    case 'bimonthly':
      return `Bimestral (día ${frequency.day || 1})`;
    case 'quarterly':
      return `Trimestral (día ${frequency.day || 1})`;
    case 'biannual':
      return 'Semestral';
    case 'yearly':
      return 'Anual';
    case 'custom_days':
      return `Cada ${frequency.interval || 30} días`;
    default:
      return 'Personalizado';
  }
};

// Helper to format date in Spanish
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};

function RecurringCard({ recurring, onClick, onPause, selectMode, isSelected }) {
  const isExpense = recurring.type === 'expense';
  const isIncome = recurring.type === 'income';
  const isTransfer = recurring.type === 'transfer';

  const typeColor = isExpense
    ? 'var(--accent-red)'
    : isIncome
      ? 'var(--accent-green)'
      : 'var(--accent-blue)';

  const typeLabel = isExpense ? 'Gasto' : isIncome ? 'Ingreso' : 'Transferencia';

  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 rounded-2xl cursor-pointer transition-all duration-200
        hover:scale-[1.01] active:scale-[0.99]
        ${recurring.isPaused ? 'opacity-60' : ''}
      `}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
      }}
    >
      {/* Status badges */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `color-mix(in srgb, ${typeColor} 15%, transparent)`,
            color: typeColor,
          }}
        >
          {typeLabel}
        </span>
        {recurring.isPaused && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-muted)',
            }}
          >
            Pausado
          </span>
        )}
        {recurring.isCreditCardRecurring && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'var(--accent-purple-dim)',
              color: 'var(--accent-purple)',
            }}
          >
            Tarjeta
          </span>
        )}
        {recurring.creationMode === 'bot_confirmation' && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: 'var(--accent-blue-dim)',
              color: 'var(--accent-blue)',
            }}
          >
            {recurring.preferredBot === 'telegram' ? 'TG' : 'WA'}
          </span>
        )}
      </div>

      {/* Name and amount */}
      <div className="flex items-start justify-between mb-2">
        <h3
          className="font-semibold text-base truncate flex-1 mr-2"
          style={{ color: 'var(--text-primary)' }}
        >
          {recurring.name}
        </h3>
        <span
          className="font-bold text-lg whitespace-nowrap"
          style={{ color: typeColor }}
        >
          {isExpense ? '-' : isIncome ? '+' : ''}
          {formatCurrency(recurring.amount, recurring.currency === 'USD' ? 'Dólar' : 'Peso')}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        {/* Account/Category */}
        {isTransfer ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span className="truncate">
              {recurring.fromAccountName} → {recurring.toAccountName}
            </span>
          </div>
        ) : (
          <>
            {recurring.accountName && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="truncate">{recurring.accountName}</span>
              </div>
            )}
            {recurring.categoryName && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span className="truncate">{recurring.categoryName}</span>
              </div>
            )}
          </>
        )}

        {/* Frequency */}
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{getFrequencyLabel(recurring.frequency)}</span>
        </div>
      </div>

      {/* Next execution date */}
      {recurring.nextExecutionDate && !recurring.isPaused && (
        <div
          className="mt-3 pt-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Próxima ejecución
          </span>
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatDate(recurring.nextExecutionDate)}
          </span>
        </div>
      )}

      {/* Stats (if available) */}
      {recurring.stats && (
        <div
          className="mt-3 pt-3 grid grid-cols-2 gap-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div>
            <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>
              Total pagado
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatCurrency(recurring.stats.totalPaid, recurring.currency === 'USD' ? 'Dólar' : 'Peso')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>
              Ejecuciones
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {recurring.stats.confirmedCount}
              {recurring.stats.skippedCount > 0 && (
                <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>
                  ({recurring.stats.skippedCount} saltadas)
                </span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Quick actions */}
      {!selectMode && onPause && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPause(recurring);
          }}
          className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
          style={{ color: 'var(--text-muted)' }}
          title={recurring.isPaused ? 'Reanudar' : 'Pausar'}
        >
          {recurring.isPaused ? (
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
  );
}

export default RecurringCard;
