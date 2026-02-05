import { useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../utils/format';
import { isEmoji, resolveIconPath } from '../services/iconStorage';

function CategoryDetailDrawer({ isOpen, onClose, categoryName, categoryIcon, movements, currency = 'ARS', dateRange }) {
  const drawerRef = useRef(null);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const sortedMovements = useMemo(() => {
    return [...movements].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  }, [movements]);

  const totalMonto = useMemo(() => {
    return movements.reduce((sum, m) => {
      return sum + (currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0));
    }, 0);
  }, [movements, currency]);

  const promedioTransaccion = movements.length > 0 ? totalMonto / movements.length : 0;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />

      {/* Drawer / Modal */}
      <div
        className="fixed z-50
          bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl
          lg:bottom-auto lg:left-1/2 lg:top-[35%] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-2xl lg:max-w-lg lg:w-full lg:max-h-[70vh]"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 -8px 40px rgba(0, 0, 0, 0.3)',
          animation: 'slideUp 0.3s var(--ease-out-expo)',
        }}
        ref={drawerRef}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 lg:hidden">
          <div
            className="w-10 h-1 rounded-full"
            style={{ backgroundColor: 'var(--text-muted)', opacity: 0.3 }}
          />
        </div>

        {/* Header */}
        <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--accent-red-dim)' }}
            >
              {categoryIcon && isEmoji(categoryIcon) ? (
                <span className="text-xl">{categoryIcon}</span>
              ) : categoryIcon ? (
                <img src={resolveIconPath(categoryIcon)} alt="" className="w-6 h-6 rounded" />
              ) : (
                <svg className="w-5 h-5" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {categoryName}
              </h3>
              <p className="text-lg font-bold" style={{ color: 'var(--accent-red)' }}>
                {formatCurrency(totalMonto, currency)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)]"
          >
            <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Movement list */}
        <div className="overflow-y-auto p-4 space-y-1.5" style={{ maxHeight: 'calc(70vh - 180px)' }}>
          {sortedMovements.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Sin movimientos en este periodo
            </p>
          ) : (
            sortedMovements.map((m, i) => {
              const monto = currency === 'ARS' ? (m.montoPesos || m.monto || 0) : (m.montoDolares || 0);
              return (
                <div
                  key={m.id || i}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {format(new Date(m.fecha + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}
                      >
                        {m.cuenta}
                      </span>
                    </div>
                    {m.nota && (
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {m.nota}
                      </p>
                    )}
                  </div>
                  <span className="font-semibold text-sm flex-shrink-0" style={{ color: 'var(--accent-red)' }}>
                    -{formatCurrency(monto, currency)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {sortedMovements.length > 0 && (
          <div className="p-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {movements.length} transaccion{movements.length !== 1 ? 'es' : ''}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Promedio: {formatCurrency(promedioTransaccion, currency)}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @media (min-width: 1024px) {
          @keyframes slideUp {
            from { opacity: 0; transform: translate(-50%, -46%) scale(0.95); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
        }
      `}</style>
    </>
  );
}

export default CategoryDetailDrawer;
