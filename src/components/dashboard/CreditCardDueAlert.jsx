import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatNumberAR } from '../../utils/format';

function CreditCardDueAlert({ accounts }) {
  const navigate = useNavigate();

  // Calculate which cards are due today or tomorrow
  const dueCards = useMemo(() => {
    if (!accounts || accounts.length === 0) return [];

    const now = new Date();
    const today = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Get the last day of the current month
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Calculate tomorrow's date
    const tomorrow = today + 1 > lastDayOfMonth ? 1 : today + 1;

    return accounts
      .filter(account => {
        // Only credit cards with due_day set
        if (!account.esTarjetaCredito || !account.diaVencimiento) return false;

        // Handle months with fewer days than due_day
        const effectiveDueDay = Math.min(account.diaVencimiento, lastDayOfMonth);

        // Check if due today or tomorrow
        return effectiveDueDay === today || effectiveDueDay === tomorrow;
      })
      .map(account => {
        const effectiveDueDay = Math.min(account.diaVencimiento, lastDayOfMonth);
        const isDueToday = effectiveDueDay === today;

        return {
          ...account,
          isDueToday,
          isDueTomorrow: !isDueToday,
        };
      })
      .sort((a, b) => {
        // Due today first
        if (a.isDueToday && !b.isDueToday) return -1;
        if (!a.isDueToday && b.isDueToday) return 1;
        return 0;
      });
  }, [accounts]);

  if (dueCards.length === 0) return null;

  return (
    <div className="space-y-2">
      {dueCards.map(card => (
        <button
          key={card.id}
          onClick={() => navigate('/tarjetas')}
          className="w-full rounded-xl p-4 transition-all hover:opacity-90"
          style={{
            backgroundColor: card.isDueToday
              ? 'var(--accent-red-dim)'
              : 'var(--accent-yellow-dim)',
            border: `1px solid ${card.isDueToday ? 'var(--accent-red)' : 'var(--accent-yellow)'}`,
          }}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: card.isDueToday
                  ? 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(234, 179, 8, 0.2)',
              }}
            >
              <span className="text-xl">{card.isDueToday ? '⚠️' : '💳'}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <p
                  className="text-sm font-semibold truncate"
                  style={{
                    color: card.isDueToday ? 'var(--accent-red)' : 'var(--accent-yellow)',
                  }}
                >
                  {card.isDueToday ? 'Vence HOY' : 'Vence mañana'}
                </p>
              </div>
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {card.nombre}
              </p>

              {/* Amounts */}
              <div className="flex items-center gap-3 mt-1">
                {(card.proximoResumenPesos > 0 || card.proximoResumenDolares > 0) ? (
                  <>
                    {card.proximoResumenPesos > 0 && (
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        ${formatNumberAR(card.proximoResumenPesos)}
                      </span>
                    )}
                    {card.proximoResumenDolares > 0 && (
                      <span className="text-sm font-semibold" style={{ color: 'var(--accent-green)' }}>
                        USD ${formatNumberAR(card.proximoResumenDolares)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Sin gastos este período
                  </span>
                )}
              </div>
            </div>

            {/* Arrow */}
            <svg
              className="w-5 h-5 flex-shrink-0 mt-2"
              style={{ color: 'var(--text-muted)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      ))}
    </div>
  );
}

export default CreditCardDueAlert;
