import { formatCurrency } from '../../utils/format';

// Helper to format date in Spanish
const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Helper to check if date is today
const isToday = (dateStr) => {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
};

// Helper to check if date is past
const isPast = (dateStr) => {
  if (!dateStr) return false;
  const today = new Date().toISOString().split('T')[0];
  return dateStr < today;
};

// Get status label and color
const getStatusInfo = (status, scheduledDate) => {
  const dateIsPast = isPast(scheduledDate);
  const dateIsToday = isToday(scheduledDate);

  switch (status) {
    case 'pending':
      if (dateIsToday) {
        return { label: 'Hoy', color: 'var(--accent-orange)', bgColor: 'var(--accent-orange-dim)' };
      }
      if (dateIsPast) {
        return { label: 'Vencida', color: 'var(--accent-red)', bgColor: 'var(--accent-red-dim)' };
      }
      return { label: 'Pendiente', color: 'var(--text-muted)', bgColor: 'var(--bg-tertiary)' };
    case 'approved':
      return { label: 'Aprobada', color: 'var(--accent-green)', bgColor: 'var(--accent-green-dim)' };
    case 'rejected':
      return { label: 'Rechazada', color: 'var(--accent-red)', bgColor: 'var(--accent-red-dim)' };
    case 'executed':
      return { label: 'Ejecutada', color: 'var(--accent-primary)', bgColor: 'var(--accent-primary-dim)' };
    default:
      return { label: status, color: 'var(--text-muted)', bgColor: 'var(--bg-tertiary)' };
  }
};

function ScheduledCard({ scheduled, onClick, onApprove, onReject, onEdit, onDelete }) {
  const isExpense = scheduled.type === 'expense';
  const isIncome = scheduled.type === 'income';
  const isTransfer = scheduled.type === 'transfer';
  const isPending = scheduled.status === 'pending';

  const typeColor = isExpense
    ? 'var(--accent-red)'
    : isIncome
      ? 'var(--accent-green)'
      : 'var(--accent-blue)';

  const typeLabel = isExpense ? 'Gasto' : isIncome ? 'Ingreso' : 'Transferencia';
  const statusInfo = getStatusInfo(scheduled.status, scheduled.fecha);

  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 rounded-2xl cursor-pointer transition-all duration-200
        hover:scale-[1.01] active:scale-[0.99]
        ${scheduled.status === 'rejected' ? 'opacity-60' : ''}
      `}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-subtle)',
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
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: statusInfo.bgColor,
            color: statusInfo.color,
          }}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Date and amount */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span
            className="font-semibold text-base"
            style={{ color: 'var(--text-primary)' }}
          >
            {formatDate(scheduled.fecha)}
          </span>
        </div>
        <span
          className="font-bold text-lg whitespace-nowrap"
          style={{ color: typeColor }}
        >
          {isExpense ? '-' : isIncome ? '+' : ''}
          {formatCurrency(scheduled.monto, scheduled.cuentaMoneda === 'USD' ? 'Dólar' : 'Peso')}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        {/* Note (if exists) */}
        {scheduled.nota && (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="truncate">{scheduled.nota}</span>
          </div>
        )}

        {/* Account/Category */}
        {isTransfer ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {scheduled.cuentaIcon ? (
              <span className="text-sm">{scheduled.cuentaIcon}</span>
            ) : (
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            )}
            <span className="truncate">
              {scheduled.cuenta} → {scheduled.cuentaDestino}
            </span>
          </div>
        ) : (
          <>
            {scheduled.cuenta && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {scheduled.cuentaIcon ? (
                  <span className="text-sm">{scheduled.cuentaIcon}</span>
                ) : (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                )}
                <span className="truncate">{scheduled.cuenta}</span>
              </div>
            )}
            {scheduled.categoria && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {scheduled.categoriaIcon ? (
                  <span className="text-sm">{scheduled.categoriaIcon}</span>
                ) : (
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                )}
                <span className="truncate">{scheduled.categoria}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons for pending transactions */}
      {isPending && (onApprove || onReject || onEdit) && (
        <div
          className="mt-3 pt-3 flex items-center justify-between gap-2"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            {/* Approve button */}
            {onApprove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onApprove(scheduled);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80 active:scale-95"
                style={{
                  backgroundColor: 'var(--accent-green-dim)',
                  color: 'var(--accent-green)',
                }}
                title="Aprobar y ejecutar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Aprobar
              </button>
            )}

            {/* Reject button */}
            {onReject && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onReject(scheduled);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80 active:scale-95"
                style={{
                  backgroundColor: 'var(--accent-red-dim)',
                  color: 'var(--accent-red)',
                }}
                title="Rechazar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Edit button */}
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onEdit(scheduled);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                }}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
                style={{ color: 'var(--text-muted)' }}
                title="Editar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}

            {/* Delete button */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDelete(scheduled);
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                }}
                className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)] active:bg-[var(--accent-red-dim)]"
                style={{ color: 'var(--accent-red)' }}
                title="Eliminar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduledCard;
