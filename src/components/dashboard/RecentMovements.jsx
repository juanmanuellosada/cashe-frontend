import { useState } from 'react';
import { formatCurrency, formatDate } from '../../utils/format';
import DateRangePicker from '../DateRangePicker';
import FilterBar from '../FilterBar';
import { isEmoji, resolveIconPath } from '../../services/iconStorage';

function RecentMovements({
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
  currency = 'ARS'
}) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Helper to get account by name
  const getAccount = (accountName) => {
    return accounts?.find(a => a.nombre === accountName);
  };

  // Helper to check if account is USD
  const isAccountUSD = (accountName) => {
    const account = getAccount(accountName);
    return account?.moneda === 'Dólar';
  };

  // Helper to get account icon
  const getAccountIcon = (accountName) => {
    const account = getAccount(accountName);
    if (!account?.icon) return null;
    return account.icon;
  };

  // Render small account icon
  const renderAccountIcon = (accountName) => {
    const icon = getAccountIcon(accountName);
    if (!icon) return null;

    if (isEmoji(icon)) {
      return <span className="text-[10px] sm:text-xs">{icon}</span>;
    }
    return (
      <img
        src={resolveIconPath(icon)}
        alt=""
        className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded object-cover"
      />
    );
  };

  // Determine if movement is in USD based on account currency
  const isUSDMovement = (movement) => {
    const accountName = movement.tipo === 'transferencia' ? movement.cuentaSaliente : movement.cuenta;
    return isAccountUSD(accountName);
  };

  const getTypeStyles = (tipo) => {
    switch (tipo) {
      case 'ingreso':
        return {
          color: 'var(--accent-green)',
          bgColor: 'rgba(0, 217, 154, 0.12)',
          glowColor: 'rgba(0, 217, 154, 0.3)',
          prefix: '+',
          icon: 'up',
        };
      case 'gasto':
        return {
          color: 'var(--accent-red)',
          bgColor: 'rgba(255, 92, 114, 0.12)',
          glowColor: 'rgba(255, 92, 114, 0.3)',
          prefix: '-',
          icon: 'down',
        };
      case 'transferencia':
        return {
          color: 'var(--accent-blue)',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          glowColor: 'rgba(59, 130, 246, 0.3)',
          prefix: '',
          icon: 'transfer',
        };
      default:
        return {
          color: 'var(--accent-blue)',
          bgColor: 'rgba(59, 130, 246, 0.12)',
          glowColor: 'rgba(59, 130, 246, 0.3)',
          prefix: '',
          icon: 'down',
        };
    }
  };

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

  const renderIcon = (tipo, color) => {
    const iconClass = "w-4 h-4 sm:w-5 sm:h-5";
    if (tipo === 'transferencia') {
      return (
        <svg className={iconClass} style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      );
    }
    if (tipo === 'ingreso') {
      return (
        <svg className={iconClass} style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      );
    }
    return (
      <svg className={iconClass} style={{ color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    );
  };

  // Skeleton loading
  const renderSkeleton = () => (
    <div className="card-glass overflow-hidden rounded-lg min-[400px]:rounded-xl">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 sm:gap-3 px-3 py-2.5 sm:p-4"
          style={{ borderBottom: i < 3 ? '1px solid var(--border-subtle)' : 'none' }}
        >
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-md min-[400px]:rounded-lg sm:rounded-xl skeleton-shimmer" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 sm:w-28 skeleton-shimmer rounded-md min-[400px]:rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
            <div className="h-3 w-32 sm:w-36 skeleton-shimmer rounded-md min-[400px]:rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
          </div>
          <div className="text-right space-y-2">
            <div className="h-4 sm:h-5 w-20 sm:w-24 skeleton-shimmer rounded-md min-[400px]:rounded-lg ml-auto" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
            <div className="h-3 w-14 sm:w-16 skeleton-shimmer rounded-md min-[400px]:rounded-lg ml-auto" style={{ backgroundColor: 'var(--bg-tertiary)' }} />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-2 sm:space-y-4">
      {/* Header con titulo y selector de fechas - stacks on <400px */}
      <div className="flex flex-col min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between gap-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-primary-dim)' }}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3
            className="text-sm sm:text-[15px] font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Movimientos
          </h3>
        </div>
        <div className="self-start min-[400px]:self-auto">
          <DateRangePicker
            value={dateRange}
            onChange={onDateRangeChange}
            defaultPreset="Este mes"
          />
        </div>
      </div>

      {/* Filtros - show all accounts (user can toggle hidden ones) */}
      <FilterBar
        accounts={accounts}
        categories={categories}
        filters={filters}
        onFilterChange={onFilterChange}
      />

      {/* Lista de movimientos */}
      {loading ? (
        renderSkeleton()
      ) : !movements || movements.length === 0 ? (
        <div className="card-glass p-6 sm:p-8 text-center rounded-lg min-[400px]:rounded-xl">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-lg min-[400px]:rounded-xl sm:rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <svg
              className="w-7 h-7 sm:w-8 sm:h-8"
              style={{ color: 'var(--text-secondary)' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
            Sin movimientos
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            No hay movimientos en este periodo
          </p>
        </div>
      ) : (
        <div className="card-glass overflow-hidden rounded-lg min-[400px]:rounded-xl">
          {movements.map((movement, index) => {
            const styles = getTypeStyles(movement.tipo);

            return (
              <div
                key={movement.rowIndex || index}
                className={`group flex items-start min-[400px]:items-center gap-2 px-3 py-2.5 sm:p-4 transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-[0.995] ${
                  index !== movements.length - 1 ? 'border-b' : ''
                }`}
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                {/* Clickable area for edit */}
                <button
                  onClick={() => onMovementClick?.(movement)}
                  className="flex flex-col min-[400px]:flex-row min-[400px]:items-center gap-2 sm:gap-3 flex-1 min-w-0 text-left transition-transform duration-200"
                  style={{ backgroundColor: 'transparent' }}
                >
                  {/* Top row: Icon + Info */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    {/* Icon with subtle glow on hover */}
                    <div
                      className="w-9 h-9 sm:w-11 sm:h-11 rounded-md min-[400px]:rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-110"
                      style={{
                        backgroundColor: styles.bgColor,
                      }}
                    >
                      {renderIcon(movement.tipo, styles.color)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p
                        className="font-semibold text-sm sm:text-[15px]"
                        style={{
                          color: 'var(--text-primary)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}
                      >
                        {movement.tipo === 'transferencia'
                          ? 'Transfer'
                          : movement.categoria || ''}
                      </p>
                      <p
                        className="text-[11px] sm:text-xs truncate flex items-center gap-1"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {movement.tipo === 'transferencia' ? (
                          <>
                            {renderAccountIcon(movement.cuentaSaliente)}
                            <span>{movement.cuentaSaliente}</span>
                            <span>→</span>
                            {renderAccountIcon(movement.cuentaEntrante)}
                            <span>{movement.cuentaEntrante}</span>
                          </>
                        ) : (
                          <>
                            {renderAccountIcon(movement.cuenta)}
                            <span>{movement.cuenta}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Amount and date - below on <400px, right on 400px+ */}
                  <div className="text-left min-[400px]:text-right flex-shrink-0 pl-11 min-[400px]:pl-0">
                    {(() => {
                      // Determine currency based on the account's currency
                      const isUSD = isUSDMovement(movement);
                      const currencyCode = isUSD ? 'USD' : 'ARS';
                      const amount = movement.monto || movement.montoSaliente;

                      return (
                        <div className="flex items-center gap-1.5 min-[400px]:justify-end">
                          <img
                            src={`${import.meta.env.BASE_URL}icons/catalog/${currencyCode}.svg`}
                            alt={currencyCode}
                            className="w-4 h-4 rounded-sm"
                          />
                          <p className="font-bold text-sm sm:text-lg" style={{ color: styles.color }}>
                            {styles.prefix}{formatCurrency(amount, currencyCode)}
                          </p>
                        </div>
                      );
                    })()}
                    <p className="text-[11px] sm:text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {formatDate(movement.fecha, 'short')}
                    </p>
                  </div>
                </button>

                {/* Delete button - always visible */}
                <button
                  onClick={(e) => handleDeleteClick(e, movement)}
                  className="p-2 sm:p-2.5 rounded-md min-[400px]:rounded-lg sm:rounded-xl flex-shrink-0 transition-all duration-200 hover:bg-red-500/15 active:scale-95 self-start min-[400px]:self-center"
                  style={{ color: 'var(--text-muted)' }}
                  title="Eliminar"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 transition-colors hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Contador de resultados */}
      {movements && movements.length > 0 && (
        <p className="text-xs text-center font-medium" style={{ color: 'var(--text-secondary)' }}>
          Mostrando {movements.length} movimiento{movements.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
            onClick={() => setDeleteConfirm(null)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in card-elevated"
          >
            <div className="text-center">
              <div
                className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                style={{ 
                  backgroundColor: 'rgba(255, 92, 114, 0.12)',
                  boxShadow: '0 0 30px rgba(255, 92, 114, 0.2)'
                }}
              >
                <svg className="w-8 h-8" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-bold font-display mb-2" style={{ color: 'var(--text-primary)' }}>
                Eliminar movimiento
              </h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                ¿Estás seguro de que quieres eliminar {deleteConfirm.tipo === 'transferencia' ? 'esta' : 'este'} {deleteConfirm.tipo}?
                <br />
                <span className="font-bold text-base mt-1 inline-block" style={{ color: getTypeStyles(deleteConfirm.tipo).color }}>
                  {deleteConfirm.tipo === 'transferencia'
                    ? formatCurrency(deleteConfirm.montoSaliente)
                    : formatCurrency(deleteConfirm.montoPesos || deleteConfirm.monto)}
                </span>
                {' - '}
                {deleteConfirm.tipo === 'transferencia'
                  ? `${deleteConfirm.cuentaSaliente} → ${deleteConfirm.cuentaEntrante}`
                  : deleteConfirm.categoria}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3.5 rounded-xl font-semibold transition-all duration-200 hover:bg-[var(--bg-tertiary)] active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3.5 rounded-xl font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                  style={{ 
                    backgroundColor: 'var(--accent-red)',
                    boxShadow: '0 4px 20px rgba(255, 92, 114, 0.3)'
                  }}
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
}

export default RecentMovements;
