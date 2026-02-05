import { Bot, X, Sparkles } from 'lucide-react';

/**
 * Banner que muestra sugerencias de reglas automáticas
 * Se usa dentro de los formularios de movimientos (ExpenseForm, IncomeForm)
 */
function RuleSuggestionBanner({ suggestion, onApply, onDismiss, categories = [], accounts = [] }) {
  if (!suggestion) return null;

  // Helper para obtener emoji del icon (no mostrar URLs)
  const getIconEmoji = (icon) => {
    if (!icon) return '📁';
    if (typeof icon === 'string' && (icon.startsWith('/') || icon.startsWith('http'))) {
      return '📁';
    }
    return icon;
  };

  // Resolver nombres legibles de las acciones
  const getActionDisplay = () => {
    const parts = [];

    if (suggestion.actions?.category_id) {
      const category = categories.find(c => c.id === suggestion.actions.category_id);
      if (category) {
        const catName = category.label || category.value || category.name || category.nombre;
        parts.push(`${getIconEmoji(category.icon)} ${catName}`);
      }
    }

    if (suggestion.actions?.account_id) {
      const account = accounts.find(a => a.id === suggestion.actions.account_id);
      if (account) {
        parts.push(`🏦 ${account.name || account.nombre}`);
      }
    }

    return parts.join('  •  ');
  };

  const actionDisplay = getActionDisplay();

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl animate-fade-in"
      style={{
        backgroundColor: 'rgba(20, 184, 166, 0.1)',
        border: '1px solid rgba(20, 184, 166, 0.3)',
      }}
    >
      <div
        className="p-2 rounded-lg shrink-0"
        style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)' }}
      >
        <Sparkles className="w-4 h-4" style={{ color: '#14b8a6' }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Regla detectada: "{suggestion.ruleName}"
        </p>
        {actionDisplay && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
            {actionDisplay}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onApply}
          className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors"
          style={{
            backgroundColor: '#14b8a6',
            color: 'white',
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#0d9488'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#14b8a6'}
        >
          Aplicar
        </button>

        <button
          type="button"
          onClick={onDismiss}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-tertiary)'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default RuleSuggestionBanner;
