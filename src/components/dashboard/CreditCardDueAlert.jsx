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
      {dueCards.map(card => {
        // Use resumenVence* for the statement that's actually due (not próximo)
        const vencePesos = card.resumenVencePesos || 0;
        const venceDolares = card.resumenVenceDolares || 0;
        const isPaid = card.resumenVencePagado;
        const hasAmounts = vencePesos > 0 || venceDolares > 0;

        // Determine styling based on payment status
        const getStyles = () => {
          if (isPaid) {
            // Paid - green/success style
            return {
              bg: 'var(--accent-green-dim)',
              border: 'var(--accent-green)',
              iconBg: 'rgba(34, 197, 94, 0.2)',
              textColor: 'var(--accent-green)',
              icon: '✅',
            };
          }
          if (card.isDueToday) {
            // Due today and not paid - red/urgent
            return {
              bg: 'var(--accent-red-dim)',
              border: 'var(--accent-red)',
              iconBg: 'rgba(239, 68, 68, 0.2)',
              textColor: 'var(--accent-red)',
              icon: '⚠️',
            };
          }
          // Due tomorrow - yellow/warning
          return {
            bg: 'var(--accent-yellow-dim)',
            border: 'var(--accent-yellow)',
            iconBg: 'rgba(234, 179, 8, 0.2)',
            textColor: 'var(--accent-yellow)',
            icon: '💳',
          };
        };

        const styles = getStyles();

        return (
          <button
            key={card.id}
            onClick={() => navigate('/tarjetas')}
            className="w-full rounded-xl p-3 sm:p-4 transition-all hover:opacity-90"
            style={{
              backgroundColor: styles.bg,
              border: `1px solid ${styles.border}`,
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Icon */}
              <div
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: styles.iconBg }}
              >
                <span className="text-base sm:text-xl">{styles.icon}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1 sm:gap-2">
                  <p
                    className="text-xs sm:text-sm font-semibold truncate"
                    style={{ color: styles.textColor }}
                  >
                    {isPaid
                      ? (card.isDueToday ? 'Vence HOY · Pagado' : 'Vence mañana · Pagado')
                      : (card.isDueToday ? 'Vence HOY' : 'Vence mañana')
                    }
                  </p>
                  <span className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>
                    · {card.nombre}
                  </span>
                </div>

                {/* Amounts */}
                <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
                  {hasAmounts ? (
                    <>
                      {vencePesos > 0 && (
                        <span
                          className="text-sm sm:text-base font-semibold"
                          style={{
                            color: isPaid ? 'var(--text-secondary)' : 'var(--text-primary)',
                            textDecoration: isPaid ? 'line-through' : 'none',
                          }}
                        >
                          ${formatNumberAR(vencePesos)}
                        </span>
                      )}
                      {venceDolares > 0 && (
                        <span
                          className="text-xs sm:text-sm font-semibold"
                          style={{
                            color: isPaid ? 'var(--text-secondary)' : 'var(--accent-green)',
                            textDecoration: isPaid ? 'line-through' : 'none',
                          }}
                        >
                          USD ${formatNumberAR(venceDolares)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                      Sin gastos este período
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0"
                style={{ color: 'var(--text-muted)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default CreditCardDueAlert;
