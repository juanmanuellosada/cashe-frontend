import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import DatePicker from './DatePicker';
import LoadingSpinner from './LoadingSpinner';
import AttachmentInput from './AttachmentInput';
import { formatCurrency } from '../utils/format';
import { useError } from '../contexts/ErrorContext';

function EditMovementModal({
  movement,
  accounts = [],
  categories = { ingresos: [], gastos: [] },
  onSave,
  onDelete,
  onDuplicate,
  onClose,
  loading = false
}) {
  // Form data for income/expense
  const [formData, setFormData] = useState({
    fecha: '',
    monto: '',
    cuenta: '',
    categoria: '',
    nota: '',
  });

  // Form data for transfer
  const [transferData, setTransferData] = useState({
    fecha: '',
    cuentaSaliente: '',
    cuentaEntrante: '',
    montoSaliente: '',
    montoEntrante: '',
    nota: '',
  });

  // Estado para modal de confirmación de eliminación
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Estados para adjuntos
  const [newAttachment, setNewAttachment] = useState(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);

  // Drag to dismiss state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  const isTransfer = movement?.tipo === 'transferencia';

  // Reset drag state when modal opens
  useEffect(() => {
    if (movement) {
      setDragY(0);
      setIsDragging(false);
    }
  }, [movement]);

  useEffect(() => {
    if (movement) {
      const fecha = movement.fecha
        ? format(new Date(movement.fecha), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd');

      if (isTransfer) {
        setTransferData({
          fecha,
          cuentaSaliente: movement.cuentaSaliente || '',
          cuentaEntrante: movement.cuentaEntrante || '',
          montoSaliente: movement.montoSaliente?.toString() || '',
          montoEntrante: movement.montoEntrante?.toString() || '',
          nota: movement.nota || '',
        });
      } else {
        setFormData({
          fecha,
          monto: movement.monto?.toString() || '',
          cuenta: movement.cuenta || '',
          categoria: movement.categoria || '',
          nota: movement.nota || '',
        });
      }
      // Reset attachment states
      setNewAttachment(null);
      setRemoveExistingAttachment(false);
    }
  }, [movement, isTransfer]);

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
    if (dragY > 100 && !loading) onClose();
    setDragY(0);
    setIsDragging(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTransferChange = (e) => {
    const { name, value } = e.target;
    setTransferData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isTransfer) {
      onSave?.({
        ...movement,
        fecha: transferData.fecha,
        cuentaSaliente: transferData.cuentaSaliente,
        cuentaEntrante: transferData.cuentaEntrante,
        montoSaliente: parseFloat(transferData.montoSaliente),
        montoEntrante: parseFloat(transferData.montoEntrante),
        nota: transferData.nota,
        newAttachment,
        removeAttachment: removeExistingAttachment && !newAttachment,
      });
    } else {
      onSave?.({
        ...movement,
        ...formData,
        monto: parseFloat(formData.monto),
        newAttachment,
        removeAttachment: removeExistingAttachment && !newAttachment,
      });
    }
  };

  const { showError } = useError();

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!movement?.rowIndex) {
      showError('No se puede eliminar el movimiento', 'Falta información del movimiento (rowIndex)');
      return;
    }
    if (!onDelete) {
      showError('No se puede eliminar el movimiento', 'Función de eliminación no disponible');
      return;
    }
    // Mostrar modal de confirmación
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(movement);
  };

  const handleDuplicate = () => {
    // Create a copy with today's date and no rowIndex (so it creates new)
    const today = format(new Date(), 'yyyy-MM-dd');
    const duplicated = {
      ...movement,
      fecha: today,
      rowIndex: undefined, // Remove rowIndex so it creates a new entry
    };
    onDuplicate?.(duplicated);
  };

  const currentCategories = movement?.tipo === 'ingreso'
    ? categories.ingresos
    : categories.gastos;

  const isValidIncomeExpense = formData.monto && formData.cuenta && formData.categoria;
  const isValidTransfer = transferData.montoSaliente && transferData.montoEntrante &&
    transferData.cuentaSaliente && transferData.cuentaEntrante;
  const isValid = isTransfer ? isValidTransfer : isValidIncomeExpense;

  const getTitle = () => {
    switch (movement?.tipo) {
      case 'ingreso': return 'Editar Ingreso';
      case 'gasto': return 'Editar Gasto';
      case 'transferencia': return 'Editar Transferencia';
      default: return 'Editar Movimiento';
    }
  };

  const getColor = () => {
    switch (movement?.tipo) {
      case 'ingreso': return 'var(--accent-green)';
      case 'gasto': return 'var(--accent-red)';
      case 'transferencia': return 'var(--accent-blue)';
      default: return 'var(--accent-primary)';
    }
  };

  if (!movement) return null;

  const backdropOpacity = Math.max(0.6 - (dragY / 300), 0);
  const shouldClose = dragY > 100;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md sm:m-4 mt-0 rounded-b-2xl sm:rounded-2xl flex flex-col animate-slide-down"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          maxHeight: 'min(calc(100dvh - 40px), calc(100vh - 40px))',
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

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-2 sm:py-3 flex-shrink-0 border-b cursor-grab active:cursor-grabbing sm:cursor-default"
          style={{ borderColor: 'var(--border-subtle)' }}
          data-drag-handle
        >
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {getTitle()}
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

        {/* Form - scrollable content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {isTransfer ? (
            // Transfer form
            <>
              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Fecha
                </label>
                <DatePicker
                  name="fecha"
                  value={transferData.fecha}
                  onChange={handleTransferChange}
                />
              </div>

              {/* Cuenta Saliente */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Cuenta origen
                </label>
                <select
                  name="cuentaSaliente"
                  value={transferData.cuentaSaliente}
                  onChange={handleTransferChange}
                  className="w-full px-4 py-3 rounded-xl appearance-none cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <option value="">Seleccionar cuenta</option>
                  {accounts.map((account) => (
                    <option key={account.nombre} value={account.nombre}>
                      {account.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monto Saliente */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Monto saliente
                </label>
                <div className="relative">
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-lg"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    name="montoSaliente"
                    value={transferData.montoSaliente}
                    onChange={handleTransferChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-lg"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Cuenta Entrante */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Cuenta destino
                </label>
                <select
                  name="cuentaEntrante"
                  value={transferData.cuentaEntrante}
                  onChange={handleTransferChange}
                  className="w-full px-4 py-3 rounded-xl appearance-none cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <option value="">Seleccionar cuenta</option>
                  {accounts.map((account) => (
                    <option key={account.nombre} value={account.nombre}>
                      {account.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monto Entrante */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Monto entrante
                </label>
                <div className="relative">
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-lg"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    name="montoEntrante"
                    value={transferData.montoEntrante}
                    onChange={handleTransferChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-lg"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Nota */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Nota (opcional)
                </label>
                <textarea
                  name="nota"
                  value={transferData.nota}
                  onChange={handleTransferChange}
                  placeholder="Agregar una nota..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl resize-none"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Adjunto */}
              <AttachmentInput
                value={newAttachment}
                existingAttachment={
                  !removeExistingAttachment && movement?.attachmentUrl
                    ? { url: movement.attachmentUrl, name: movement.attachmentName }
                    : null
                }
                onChange={(file) => {
                  setNewAttachment(file);
                  if (file) setRemoveExistingAttachment(true);
                }}
                onRemoveExisting={() => {
                  setRemoveExistingAttachment(true);
                  setNewAttachment(null);
                }}
                disabled={loading}
              />
            </>
          ) : (
            // Income/Expense form
            <>
              {/* Fecha */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Fecha
                </label>
                <DatePicker
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                />
              </div>

              {/* Monto */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Monto
                </label>
                <div className="relative">
                  <span
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-lg"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    name="monto"
                    value={formData.monto}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-lg"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Cuenta */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Cuenta
                </label>
                <select
                  name="cuenta"
                  value={formData.cuenta}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl appearance-none cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <option value="">Seleccionar cuenta</option>
                  {accounts.map((account) => (
                    <option key={account.nombre} value={account.nombre}>
                      {account.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Categoria
                </label>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl appearance-none cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                >
                  <option value="">Seleccionar categoria</option>
                  {currentCategories?.map((categoria) => {
                    // Soportar tanto objetos { value, label } como strings
                    const value = typeof categoria === 'string' ? categoria : categoria.value;
                    const label = typeof categoria === 'string' ? categoria : (categoria.icon ? `${categoria.icon} ${categoria.label}` : categoria.label);
                    return (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Nota */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Nota (opcional)
                </label>
                <textarea
                  name="nota"
                  value={formData.nota}
                  onChange={handleChange}
                  placeholder="Agregar una nota..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl resize-none"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Adjunto */}
              <AttachmentInput
                value={newAttachment}
                existingAttachment={
                  !removeExistingAttachment && movement?.attachmentUrl
                    ? { url: movement.attachmentUrl, name: movement.attachmentName }
                    : null
                }
                onChange={(file) => {
                  setNewAttachment(file);
                  if (file) setRemoveExistingAttachment(true);
                }}
                onRemoveExisting={() => {
                  setRemoveExistingAttachment(true);
                  setNewAttachment(null);
                }}
                disabled={loading}
              />
            </>
          )}
        </form>

        {/* Actions - sticky footer */}
        <div className="flex gap-2 p-4 border-t flex-shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={loading}
            className="p-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 hover:scale-105"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' }}
            title="Eliminar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          {onDuplicate && (
            <button
              type="button"
              onClick={handleDuplicate}
              disabled={loading}
              className="p-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 hover:scale-105"
              style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' }}
              title="Duplicar con fecha de hoy"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className="flex-1 py-3 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: getColor() }}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                Guardando...
              </>
            ) : (
              'Guardar'
            )}
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <div
              className="relative w-full max-w-sm sm:m-4 mt-0 rounded-b-2xl sm:rounded-2xl p-6 animate-slide-down"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              {/* Drag indicator - mobile only */}
              <div className="sm:hidden flex justify-center -mt-4 mb-2">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-medium)' }} />
              </div>

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
                  ¿Estás seguro de que quieres eliminar este {movement?.tipo === 'transferencia' ? 'transferencia' : movement?.tipo}?
                  <br />
                  <span className="font-semibold text-base" style={{ color: getColor() }}>
                    {movement?.tipo === 'transferencia'
                      ? formatCurrency(movement?.montoSaliente)
                      : formatCurrency(movement?.montoPesos || movement?.monto)}
                  </span>
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
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
    </div>
  );
}

export default EditMovementModal;
