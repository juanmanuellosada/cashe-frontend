import { memo, useState, useMemo, useEffect, useRef } from 'react';
import { formatCurrency } from '../../utils/format';
import { getExchangeRate } from '../../services/supabaseApi';
import DateFilterChip from '../DateFilterChip';
import FilterBar from '../FilterBar';
import MovementsTable from '../table/MovementsTable';

const DATE_FORMAT_KEY = 'cashe-home-date-format';
const DATE_FORMAT_OPTIONS = [
  { id: 'short',    label: '19-ene',       desc: 'Día y mes corto' },
  { id: 'full',     label: '19-01-2026',   desc: 'Numérica completa' },
  { id: 'medium',   label: '19 ene 2026',  desc: 'Con año' },
  { id: 'slash',    label: '19/01/26',     desc: 'Barra corta' },
  { id: 'relative', label: 'Relativa',     desc: 'Hoy / Ayer / ...' },
];

const RecentMovements = memo(function RecentMovements({
  movements,
  dateRange,
  onDateRangeChange,
  filters,
  onFilterChange,
  accounts,
  categories,
  onMovementClick,
  onMovementDelete,
  loading = false,
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortConfig, setSortConfig] = useState({ sortBy: 'date', sortOrder: 'desc' });
  const [tipoCambio, setTipoCambio] = useState(null);
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem(DATE_FORMAT_KEY) || 'short');
  const [showDateFormatMenu, setShowDateFormatMenu] = useState(false);
  const dateFormatMenuRef = useRef(null);

  useEffect(() => {
    getExchangeRate().then(r => setTipoCambio(r?.venta || null)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showDateFormatMenu) return;
    const handler = (e) => {
      if (dateFormatMenuRef.current && !dateFormatMenuRef.current.contains(e.target))
        setShowDateFormatMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDateFormatMenu]);

  const handleDateFormat = (id) => {
    setDateFormat(id);
    localStorage.setItem(DATE_FORMAT_KEY, id);
    setShowDateFormatMenu(false);
  };

  const isAccountUSD = (accountName) => {
    const acc = accounts?.find(a => a.nombre === accountName);
    return acc?.moneda === 'Dólar';
  };

  const sortedMovements = useMemo(() => {
    if (sortConfig.sortBy === 'date') {
      return [...movements].sort((a, b) => {
        const d = new Date(a.fecha) - new Date(b.fecha);
        return sortConfig.sortOrder === 'asc' ? d : -d;
      });
    }
    return movements;
  }, [movements, sortConfig]);

  const subtotals = useMemo(() => {
    const ingresos = movements.filter(m => m.tipo === 'ingreso');
    const gastos = movements.filter(m => m.tipo === 'gasto');
    const transfers = movements.filter(m => m.tipo === 'transferencia');
    const tc = tipoCambio || 1000;

    const nativeIngresosARS = ingresos.reduce((s, m) => s + (m.montoPesos || (m.monedaOriginal !== 'USD' ? m.monto : 0) || 0), 0);
    const nativeIngresosUSD = ingresos.reduce((s, m) => s + (m.montoDolares || (m.monedaOriginal === 'USD' ? m.monto : 0) || 0), 0);
    const nativeGastosARS = gastos.reduce((s, m) => s + (m.montoPesos || (m.monedaOriginal !== 'USD' ? m.monto : 0) || 0), 0);
    const nativeGastosUSD = gastos.reduce((s, m) => s + (m.montoDolares || (m.monedaOriginal === 'USD' ? m.monto : 0) || 0), 0);

    const ingresosEnARS = nativeIngresosARS + nativeIngresosUSD * tc;
    const ingresosEnUSD = nativeIngresosUSD + nativeIngresosARS / tc;
    const gastosEnARS = nativeGastosARS + nativeGastosUSD * tc;
    const gastosEnUSD = nativeGastosUSD + nativeGastosARS / tc;
    const netoEnARS = ingresosEnARS - gastosEnARS;
    const netoEnUSD = ingresosEnUSD - gastosEnUSD;

    return { ingresosEnARS, ingresosEnUSD, gastosEnARS, gastosEnUSD, netoEnARS, netoEnUSD, transferCount: transfers.length };
  }, [movements, tipoCambio]);

  const handleDeleteClick = (e, movement) => {
    e.stopPropagation();
    setDeleteConfirm(movement);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onMovementDelete?.(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const renderSkeleton = () => (
    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3"
          style={{ borderBottom: i < 5 ? '1px solid var(--border-subtle)' : 'none' }}
        >
          <div className="w-16 h-3 skeleton-shimmer rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
          <div className="flex-1 h-3 skeleton-shimmer rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
          <div className="w-24 h-3 skeleton-shimmer rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
          <div className="w-20 h-3 skeleton-shimmer rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
          <div className="w-20 h-3 skeleton-shimmer rounded ml-auto" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-primary-dim)' }}
          >
            <svg className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Movimientos
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Date format picker */}
          <div className="relative flex-shrink-0" ref={dateFormatMenuRef}>
            <button
              onClick={() => setShowDateFormatMenu(v => !v)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
              title="Formato de fecha"
            >
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{{ short: '19-ene', full: '19-01-2026', medium: '19 ene 2026', slash: '19/01/26', relative: 'Relativa' }[dateFormat]}</span>
              <svg className="w-2.5 h-2.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showDateFormatMenu && (
              <div
                className="absolute right-0 top-full mt-1 z-50 rounded-xl py-1 min-w-[150px]"
                style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--shadow-xl)' }}
              >
                {DATE_FORMAT_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleDateFormat(opt.id)}
                    className="w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 transition-opacity hover:opacity-80"
                    style={{ color: dateFormat === opt.id ? 'var(--accent-primary)' : 'var(--text-primary)' }}
                  >
                    <span className="font-medium tabular-nums">{opt.label}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <DateFilterChip
            value={dateRange || { from: null, to: null }}
            onChange={onDateRangeChange}
          />
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        accounts={accounts}
        categories={categories}
        filters={filters}
        onFilterChange={onFilterChange}
      />

      {/* Stats bar */}
      {!loading && movements.length > 0 && (
        <div
          className="flex items-center gap-3 px-3 py-1.5 text-sm flex-wrap rounded-xl"
          style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>
            {movements.length} movimiento{movements.length !== 1 ? 's' : ''}
          </span>

          {/* Ingresos */}
          {subtotals.ingresosEnARS > 0 && (
            <>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--accent-green)' }}>
                <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-3.5 h-3.5 rounded-sm flex-shrink-0" />
                {formatCurrency(subtotals.ingresosEnARS, 'ARS')}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold opacity-70" style={{ color: 'var(--accent-green)' }}>
                <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-3.5 h-3.5 rounded-sm flex-shrink-0" />
                {formatCurrency(subtotals.ingresosEnUSD, 'USD')}
              </span>
            </>
          )}

          {/* Gastos */}
          {subtotals.gastosEnARS > 0 && (
            <>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
              <span className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--accent-red)' }}>
                <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-3.5 h-3.5 rounded-sm flex-shrink-0" />
                {formatCurrency(subtotals.gastosEnARS, 'ARS')}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold opacity-70" style={{ color: 'var(--accent-red)' }}>
                <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-3.5 h-3.5 rounded-sm flex-shrink-0" />
                {formatCurrency(subtotals.gastosEnUSD, 'USD')}
              </span>
            </>
          )}

          {/* Flujo neto */}
          {(subtotals.ingresosEnARS > 0 || subtotals.gastosEnARS > 0) && (
            <>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
              <span className="inline-flex items-center gap-1 font-semibold"
                style={{ color: subtotals.netoEnARS >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
              >
                <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-3.5 h-3.5 rounded-sm flex-shrink-0" />
                {subtotals.netoEnARS >= 0 ? '+' : ''}{formatCurrency(subtotals.netoEnARS, 'ARS')}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold opacity-70"
                style={{ color: subtotals.netoEnUSD >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}
              >
                <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-3.5 h-3.5 rounded-sm flex-shrink-0" />
                {subtotals.netoEnUSD >= 0 ? '+' : ''}{formatCurrency(subtotals.netoEnUSD, 'USD')}
              </span>
            </>
          )}

          {/* Transferencias */}
          {subtotals.transferCount > 0 && (
            <>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
              <span className="text-xs font-medium" style={{ color: 'var(--accent-blue)' }}>
                {subtotals.transferCount} transferencia{subtotals.transferCount !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        renderSkeleton()
      ) : !sortedMovements || sortedMovements.length === 0 ? (
        <div
          className="p-8 text-center rounded-xl"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
        >
          <div
            className="w-14 h-14 mx-auto mb-3 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-primary-dim)' }}
          >
            <svg className="w-7 h-7" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
            Sin movimientos
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            No hay movimientos en este periodo.
          </p>
          <a
            href="/nuevo"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo movimiento
          </a>
        </div>
      ) : (
        <MovementsTable
          movements={sortedMovements}
          type="mixed"
          accounts={accounts}
          sortConfig={sortConfig}
          onSortChange={setSortConfig}
          selectionMode={false}
          selectedItems={new Set()}
          onToggleSelect={() => {}}
          onSelectAll={() => {}}
          onDeselectAll={() => {}}
          onMovementClick={onMovementClick}
          onDeleteClick={handleDeleteClick}
          getTypeColor={() => 'var(--accent-primary)'}
          getTypeBgDim={() => 'var(--accent-primary-dim)'}
          isAccountUSD={isAccountUSD}
          storageKey="cashe-table-cols-home"
          tipoCambio={tipoCambio}
          dateFormat={dateFormat}
          maxHeight="none"
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div className="text-center">
              <div
                className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
              >
                <svg className="w-7 h-7" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Eliminar movimiento
              </h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                ¿Estás seguro de que querés eliminar este movimiento?
                <br />
                <span className="font-semibold text-base" style={{ color: 'var(--accent-red)' }}>
                  {deleteConfirm.tipo === 'transferencia'
                    ? formatCurrency(deleteConfirm.montoSaliente, 'ARS')
                    : formatCurrency(deleteConfirm.monto || deleteConfirm.montoPesos || 0, 'ARS')}
                </span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-xl font-medium text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent-red)' }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default RecentMovements;
