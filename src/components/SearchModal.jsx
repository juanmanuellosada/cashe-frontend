import { useState, useEffect, useRef } from 'react';
import { getRecentMovements } from '../services/supabaseApi';
import { formatCurrency } from '../utils/format';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function SearchModal({ isOpen, onClose, onMovementClick }) {
  const [query, setQuery] = useState('');
  const [movements, setMovements] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const inputRef = useRef(null);

  // Drag to dismiss state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  // Reset drag state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Load movements when modal opens
  useEffect(() => {
    if (isOpen && initialLoad) {
      loadMovements();
    }
  }, [isOpen, initialLoad]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset query when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setFilteredResults([]);
    }
  }, [isOpen]);

  const loadMovements = async () => {
    try {
      setLoading(true);
      const data = await getRecentMovements(500);
      setMovements(data.movimientos || []);
      setInitialLoad(false);
    } catch (err) {
      console.error('Error loading movements:', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        const searchTerm = query.toLowerCase().trim();
        const results = movements.filter(m => {
          const categoria = (m.categoria || '').toLowerCase();
          const cuenta = (m.cuenta || m.cuentaSaliente || m.cuentaEntrante || '').toLowerCase();
          const nota = (m.nota || '').toLowerCase();
          const monto = (m.monto || m.montoSaliente || 0).toString();

          return (
            categoria.includes(searchTerm) ||
            cuenta.includes(searchTerm) ||
            nota.includes(searchTerm) ||
            monto.includes(searchTerm)
          );
        });
        setFilteredResults(results.slice(0, 20));
      } else {
        setFilteredResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, movements]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Handle touch start
  const handleTouchStart = (e) => {
    if (e.target.closest('[data-drag-handle]')) {
      startY.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) setDragY(diff);
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging) return;
    if (dragY > 100) onClose();
    setDragY(0);
    setIsDragging(false);
  };

  const getTypeColor = (tipo) => {
    switch (tipo) {
      case 'ingreso': return 'var(--accent-green)';
      case 'gasto': return 'var(--accent-red)';
      case 'transferencia': return 'var(--accent-blue)';
      default: return 'var(--text-secondary)';
    }
  };

  const getTypeIcon = (tipo) => {
    switch (tipo) {
      case 'ingreso':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        );
      case 'gasto':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        );
      case 'transferencia':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatDate = (fecha) => {
    try {
      return format(new Date(fecha), 'd MMM yyyy', { locale: es });
    } catch {
      return fecha;
    }
  };

  if (!isOpen) return null;

  const backdropOpacity = Math.max(0.6 - (dragY / 300), 0);
  const shouldClose = dragY > 100;

  return (
    <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center overflow-y-auto sm:py-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg sm:max-w-xl sm:mx-4 mt-0 rounded-b-2xl sm:rounded-2xl overflow-hidden animate-slide-down sm:max-h-[calc(100vh-48px)]"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          opacity: shouldClose ? 0.5 : 1,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag indicator - mobile only */}
        <div className="sm:hidden flex justify-center pt-2 pb-1" data-drag-handle>
          <div
            className="w-10 h-1 rounded-full transition-colors"
            style={{
              backgroundColor: shouldClose ? 'var(--accent-red)' : 'var(--border-medium)',
            }}
          />
        </div>

        {/* Search Input */}
        <div
          className="p-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
          data-drag-handle
        >
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5"
              style={{ color: 'var(--text-secondary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar por categoria, cuenta, nota o monto..."
              className="w-full pl-12 pr-4 py-3 rounded-xl text-base"
              style={{
                backgroundColor: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--bg-secondary)]"
                style={{ color: 'var(--text-secondary)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : query && filteredResults.length === 0 ? (
            <div className="py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>No se encontraron resultados</p>
              <p className="text-sm mt-1">Intenta con otra busqueda</p>
            </div>
          ) : !query ? (
            <div className="py-12 text-center" style={{ color: 'var(--text-secondary)' }}>
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>Busca en tus movimientos</p>
              <p className="text-sm mt-1">Categoria, cuenta, nota o monto</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredResults.map((movement, index) => (
                <button
                  key={`${movement.tipo}-${movement.fecha}-${index}`}
                  onClick={() => {
                    onMovementClick(movement);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors hover:bg-[var(--bg-tertiary)]"
                >
                  {/* Type Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${getTypeColor(movement.tipo)}20`,
                      color: getTypeColor(movement.tipo),
                    }}
                  >
                    {getTypeIcon(movement.tipo)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="font-medium truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {movement.categoria || movement.cuentaSaliente || 'Movimiento'}
                      </span>
                      <span
                        className="font-semibold flex-shrink-0"
                        style={{ color: getTypeColor(movement.tipo) }}
                      >
                        {movement.tipo === 'ingreso' ? '+' : movement.tipo === 'gasto' ? '-' : ''}
                        {formatCurrency(movement.monto || movement.montoSaliente || 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span className="truncate">
                        {movement.cuenta || (movement.tipo === 'transferencia' ? `${movement.cuentaSaliente} → ${movement.cuentaEntrante}` : '')}
                      </span>
                      <span>•</span>
                      <span className="flex-shrink-0">{formatDate(movement.fecha)}</span>
                    </div>
                    {movement.nota && (
                      <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-secondary)' }}>
                        {movement.nota}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div
          className="p-3 text-center text-xs"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            ESC
          </kbd>
          {' '}para cerrar
        </div>
      </div>
    </div>
  );
}

export default SearchModal;
