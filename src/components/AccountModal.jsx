import { useState, useRef } from 'react';
import IconPicker from './IconPicker';
import { isEmoji, resolveIconPath } from '../services/iconStorage';

function AccountModal({ account, onSave, onDelete, onClose, loading }) {
  const isEditing = !!account;
  const [formData, setFormData] = useState({
    id: account?.id,
    rowIndex: account?.rowIndex,
    nombre: account?.nombre || '',
    balanceInicial: account?.balanceInicial?.toString() || '0',
    moneda: account?.moneda || 'Peso',
    numeroCuenta: account?.numeroCuenta || '',
    tipo: account?.tipo || '',
    esTarjetaCredito: account?.esTarjetaCredito || false,
    diaCierre: account?.diaCierre?.toString() || '1',
    diaVencimiento: account?.diaVencimiento?.toString() || '',
    icon: account?.icon || null,
    ocultaDelBalance: account?.ocultaDelBalance || false,
  });
  const [validationError, setValidationError] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Drag to dismiss state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);

  const handleTouchStart = (e) => {
    if (e.target.closest('[data-drag-handle]')) {
      startYRef.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startYRef.current;
    if (diff > 0) setDragY(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    if (dragY > 100) onClose();
    setDragY(0);
    setIsDragging(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate that closing day and due day are different for credit cards
    if (formData.esTarjetaCredito) {
      const cierre = parseInt(formData.diaCierre) || 1;
      const vencimiento = parseInt(formData.diaVencimiento) || null;
      if (vencimiento && cierre === vencimiento) {
        setValidationError('El día de cierre y vencimiento no pueden ser iguales');
        return;
      }
    }

    setValidationError('');
    onSave({
      ...formData,
      balanceInicial: parseFloat(formData.balanceInicial) || 0,
      diaCierre: formData.esTarjetaCredito ? parseInt(formData.diaCierre) || 1 : null,
      diaVencimiento: formData.esTarjetaCredito ? parseInt(formData.diaVencimiento) || null : null,
      icon: formData.icon,
      ocultaDelBalance: formData.ocultaDelBalance,
    });
  };

  const handleIconSelect = (iconValue) => {
    setFormData(prev => ({ ...prev, icon: iconValue }));
  };

  const shouldClose = dragY > 100;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto pt-4 sm:pt-6 pb-4">
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: `rgba(0, 0, 0, ${Math.max(0.6 - dragY / 300, 0)})` }}
        onClick={onClose}
      />
      <div
        className="relative w-full sm:max-w-lg mx-2 sm:mx-4 rounded-2xl flex flex-col animate-slide-down max-h-[calc(100dvh-32px)] sm:max-h-[calc(100vh-48px)]"
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
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isEditing ? 'Editar Cuenta' : 'Nueva Cuenta'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="space-y-3 overflow-y-auto px-4 py-3 flex-1">
          {/* Icon selector - compacto */}
          <button
            type="button"
            onClick={() => setShowIconPicker(true)}
            className="w-full px-3 py-2.5 rounded-lg transition-all duration-200 border border-dashed hover:border-solid flex items-center gap-3"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              borderColor: formData.icon ? 'var(--accent-primary)' : 'var(--border-medium)',
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0"
              style={{
                backgroundColor: formData.icon
                  ? (isEmoji(formData.icon) ? 'var(--bg-secondary)' : 'transparent')
                  : 'var(--bg-secondary)',
              }}
            >
              {formData.icon ? (
                isEmoji(formData.icon) ? (
                  <span className="text-xl">{formData.icon}</span>
                ) : (
                  <img
                    src={resolveIconPath(formData.icon)}
                    alt="Ícono"
                    className="w-full h-full object-cover rounded-lg"
                  />
                )
              ) : (
                <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {formData.icon ? 'Cambiar ícono' : 'Seleccionar ícono'}
              </p>
            </div>
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Nombre */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg text-sm border border-transparent focus:border-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              required
            />
          </div>

          {/* Balance y Moneda en fila */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Balance Inicial</label>
              <input
                type="number"
                name="balanceInicial"
                value={formData.balanceInicial}
                onChange={handleChange}
                step="0.01"
                className="w-full px-3 py-2 rounded-lg text-sm border border-transparent focus:border-[var(--accent-primary)]"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Moneda</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, moneda: 'Peso' }))}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: formData.moneda === 'Peso' ? 'rgba(117, 170, 219, 0.2)' : 'var(--bg-tertiary)',
                    color: formData.moneda === 'Peso' ? '#75AADB' : 'var(--text-secondary)',
                    border: formData.moneda === 'Peso' ? '1px solid #75AADB' : '1px solid transparent',
                  }}
                >
                  <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-4 h-4 rounded-sm" />
                  ARS
                </button>
                {!formData.esTarjetaCredito && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, moneda: 'Dólar' }))}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: formData.moneda === 'Dólar' ? 'rgba(60, 179, 113, 0.2)' : 'var(--bg-tertiary)',
                      color: formData.moneda === 'Dólar' ? '#3CB371' : 'var(--text-secondary)',
                      border: formData.moneda === 'Dólar' ? '1px solid #3CB371' : '1px solid transparent',
                    }}
                  >
                    <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-4 h-4 rounded-sm" />
                    USD
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Numero de Cuenta */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nro. Cuenta (opcional)</label>
            <input
              type="text"
              name="numeroCuenta"
              value={formData.numeroCuenta}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg text-sm border border-transparent focus:border-[var(--accent-primary)]"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Tipo de cuenta - más compacto */}
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Tipo de cuenta</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { value: 'Caja de ahorro', icon: '🏦', label: 'Ahorro' },
                { value: 'Cuenta corriente', icon: '💼', label: 'Corriente' },
                { value: 'Tarjeta de crédito', icon: '💳', label: 'Crédito' },
                { value: 'Billetera virtual', icon: '📱', label: 'Billetera' },
                { value: 'Efectivo', icon: '💵', label: 'Efectivo' },
                { value: 'Inversión', icon: '📈', label: 'Inversión' },
              ].map((tipo) => {
                const isSelected = formData.tipo === tipo.value;
                const isCreditCard = tipo.value === 'Tarjeta de crédito';
                return (
                  <button
                    key={tipo.value}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      tipo: tipo.value,
                      esTarjetaCredito: isCreditCard,
                      ...(isCreditCard ? { moneda: 'Peso' } : {}),
                    }))}
                    className="flex flex-col items-center gap-0.5 p-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      backgroundColor: isSelected
                        ? (isCreditCard ? 'var(--accent-purple)' : 'var(--accent-primary)')
                        : 'var(--bg-tertiary)',
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    <span className="text-base">{tipo.icon}</span>
                    <span className="text-xs leading-tight">{tipo.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Días de cierre y vencimiento - solo visible si es tarjeta de crédito */}
          {formData.esTarjetaCredito && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--accent-purple-dim)' }}>
                {/* Día de cierre */}
                <div className="flex items-center gap-2">
                  <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>Cierre día</span>
                  <input
                    type="number"
                    name="diaCierre"
                    value={formData.diaCierre}
                    onChange={handleChange}
                    min="1"
                    max="31"
                    className="w-16 px-2 py-1.5 rounded-md text-sm text-center font-semibold border border-transparent focus:border-[var(--accent-purple)]"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  />
                </div>
                {/* Día de vencimiento */}
                <div className="flex items-center gap-2">
                  <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>Vence día</span>
                  <input
                    type="number"
                    name="diaVencimiento"
                    value={formData.diaVencimiento}
                    onChange={handleChange}
                    min="1"
                    max="31"
                    placeholder="—"
                    className="w-16 px-2 py-1.5 rounded-md text-sm text-center font-semibold border border-transparent focus:border-[var(--accent-purple)]"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              {/* Validation error */}
              {validationError && (
                <p className="text-xs px-1" style={{ color: 'var(--accent-red)' }}>
                  {validationError}
                </p>
              )}
            </div>
          )}

          {/* Ocultar del balance general */}
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, ocultaDelBalance: !prev.ocultaDelBalance }))}
            className="w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200"
            style={{
              backgroundColor: formData.ocultaDelBalance ? 'var(--accent-primary-dim)' : 'var(--bg-tertiary)',
              border: formData.ocultaDelBalance ? '1px solid var(--accent-primary)' : '1px solid transparent',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: formData.ocultaDelBalance ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                }}
              >
                <svg
                  className="w-4 h-4"
                  style={{ color: formData.ocultaDelBalance ? 'white' : 'var(--text-muted)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  Ocultar del balance
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  No sumar al saldo general
                </p>
              </div>
            </div>
            <div
              className="w-11 h-6 rounded-full transition-all duration-200 relative"
              style={{
                backgroundColor: formData.ocultaDelBalance ? 'var(--accent-primary)' : 'var(--bg-secondary)',
              }}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${formData.ocultaDelBalance ? 'left-6' : 'left-1'}`}
              />
            </div>
          </button>

          </div>

          {/* Botones compactos */}
          <div className="flex gap-2 p-3 flex-shrink-0 border-t" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={loading}
                className="px-3 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-all hover:opacity-80"
                style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' }}
              >
                Eliminar
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !formData.nombre}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : isEditing ? 'Guardar' : 'Crear cuenta'}
            </button>
          </div>
        </form>

        {/* Icon Picker Modal */}
        <IconPicker
          isOpen={showIconPicker}
          onClose={() => setShowIconPicker(false)}
          onSelect={handleIconSelect}
          currentValue={formData.icon}
          showPredefined={true}
          title="Ícono de cuenta"
        />
      </div>
    </div>
  );
}

export default AccountModal;
