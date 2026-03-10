import { memo } from 'react';
import { formatCurrency, formatDate } from '../../utils/format';
import { isEmoji, resolveIconPath } from '../../services/iconStorage';

function AccountIcon({ icon }) {
  if (!icon) return null;
  if (isEmoji(icon)) return <span className="text-xs leading-none">{icon}</span>;
  return (
    <img
      src={resolveIconPath(icon)}
      alt=""
      className="w-3.5 h-3.5 rounded object-cover flex-shrink-0"
    />
  );
}

const MovementsTableRow = memo(function MovementsTableRow({
  movement,
  type,
  accounts,
  isSelected,
  selectionMode,
  onToggleSelect,
  onClick,
  onDeleteClick,
  getTypeColor,
  getTypeBgDim,
  isAccountUSD,
  gridTemplateColumns,
  tipoCambio,
}) {
  const itemId = movement.rowIndex || movement.id;

  const getAccountIcon = (name) => {
    const acc = accounts?.find(a => a.nombre === name);
    return acc?.icon ?? null;
  };

  const handleRowClick = () => {
    if (selectionMode) {
      onToggleSelect(itemId);
    } else {
      onClick(movement);
    }
  };

  return (
    <div
      className="group grid border-b hover:bg-[var(--bg-secondary)] transition-colors duration-100 cursor-pointer"
      style={{
        gridTemplateColumns,
        backgroundColor: isSelected ? getTypeBgDim() : 'transparent',
        borderColor: 'var(--border-subtle)',
      }}
      onClick={handleRowClick}
    >
      {/* Checkbox column - always first */}
      <div
        className="flex items-center justify-center px-2 py-2.5"
        onClick={(e) => { e.stopPropagation(); onToggleSelect(itemId); }}
      >
        <div
          className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all ${!selectionMode ? 'opacity-0 group-hover:opacity-60' : ''}`}
          style={{
            backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
            border: `1.5px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border)'}`,
          }}
        >
          {isSelected && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {type !== 'transferencia' ? (
        <>
          {/* Fecha */}
          <div className="flex items-center px-3 py-2">
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {formatDate(movement.fecha, 'short')}
            </span>
          </div>

          {/* Nota / Descripción */}
          <div className="flex items-center px-3 py-2 min-w-0">
            <span
              className="text-sm truncate"
              style={{ color: movement.nota ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              {movement.nota || '—'}
            </span>
          </div>

          {/* Categoría + badges */}
          <div className="flex items-center gap-1.5 px-3 py-2 min-w-0">
            <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              {movement.categoria || '—'}
            </span>
            {movement.cuota && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                style={{ backgroundColor: 'rgba(20,184,166,0.15)', color: 'var(--accent-primary)' }}
              >
                {movement.cuota}
              </span>
            )}
            {movement.isRecurring && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                style={{ backgroundColor: 'var(--accent-purple-dim)', color: 'var(--accent-purple)' }}
              >
                ↻
              </span>
            )}
            {movement.isFuture && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                style={{ backgroundColor: 'var(--accent-yellow-dim)', color: 'var(--accent-yellow)' }}
              >
                futuro
              </span>
            )}
          </div>

          {/* Cuenta */}
          <div className="flex items-center gap-1.5 px-3 py-2 min-w-0">
            <AccountIcon icon={getAccountIcon(movement.cuenta)} />
            <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
              {movement.cuenta || '—'}
            </span>
          </div>

          {/* Monto */}
          <div className="flex items-center justify-end gap-1 px-3 py-2">
            {(() => {
              const currencyCode = isAccountUSD(movement.cuenta) ? 'USD' : 'ARS';
              return (
                <>
                  <img
                    src={`${import.meta.env.BASE_URL}icons/catalog/${currencyCode}.svg`}
                    alt={currencyCode}
                    className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                  />
                  <span className="text-sm font-semibold tabular-nums whitespace-nowrap" style={{ color: getTypeColor() }}>
                    {type === 'ingreso' ? '+' : '-'}{formatCurrency(movement.monto, currencyCode)}
                  </span>
                </>
              );
            })()}
          </div>

          {/* Equivalente (otra moneda, calculada con tipoCambio) */}
          <div className="flex items-center justify-end gap-1 px-3 py-2">
            {(() => {
              const isUSD = isAccountUSD(movement.cuenta);
              const equivCode = isUSD ? 'ARS' : 'USD';
              const tc = tipoCambio || 1000;
              const equivAmount = isUSD
                ? movement.monto * tc
                : movement.monto / tc;
              return (
                <>
                  <img
                    src={`${import.meta.env.BASE_URL}icons/catalog/${equivCode}.svg`}
                    alt={equivCode}
                    className="w-3.5 h-3.5 rounded-sm flex-shrink-0 opacity-50"
                  />
                  <span className="text-xs tabular-nums whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                    {formatCurrency(equivAmount, equivCode)}
                  </span>
                </>
              );
            })()}
          </div>
        </>
      ) : (
        <>
          {/* Desde */}
          <div className="flex items-center gap-1.5 px-3 py-2 min-w-0">
            <AccountIcon icon={getAccountIcon(movement.cuentaSaliente)} />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {movement.cuentaSaliente || '—'}
              </p>
            </div>
          </div>

          {/* Hacia */}
          <div className="flex items-center gap-1.5 px-3 py-2 min-w-0">
            <AccountIcon icon={getAccountIcon(movement.cuentaEntrante)} />
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {movement.cuentaEntrante || '—'}
            </p>
          </div>

          {/* Fecha */}
          <div className="flex items-center px-3 py-2">
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
              {formatDate(movement.fecha, 'short')}
            </span>
          </div>

          {/* Monto saliente */}
          <div className="flex items-center justify-end gap-1 px-3 py-2">
            {(() => {
              const currencyCode = isAccountUSD(movement.cuentaSaliente) ? 'USD' : 'ARS';
              return (
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--accent-red)' }}>
                  -{formatCurrency(movement.montoSaliente, currencyCode)}
                </span>
              );
            })()}
          </div>

          {/* Monto entrante */}
          <div className="flex items-center justify-end gap-1 px-3 py-2">
            {(() => {
              const currencyCode = isAccountUSD(movement.cuentaEntrante) ? 'USD' : 'ARS';
              return (
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--accent-green)' }}>
                  +{formatCurrency(movement.montoEntrante, currencyCode)}
                </span>
              );
            })()}
          </div>

          {/* Nota */}
          <div className="flex items-center px-3 py-2 min-w-0">
            {movement.nota && (
              <span className="text-xs truncate italic" style={{ color: 'var(--text-secondary)' }}>
                {movement.nota}
              </span>
            )}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center py-2 px-1">
        {!selectionMode && (
          <button
            onClick={(e) => onDeleteClick(e, movement)}
            className="w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/20"
            style={{ color: 'var(--text-secondary)' }}
            title="Eliminar"
          >
            <svg className="w-3.5 h-3.5 hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
});

export default MovementsTableRow;
