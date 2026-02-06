import { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import DatePicker from './DatePicker';
import Combobox from './Combobox';
import LoadingSpinner from './LoadingSpinner';
import AttachmentInput from './AttachmentInput';
import { formatCurrency, parseLocalDate } from '../utils/format';
import { useError } from '../contexts/ErrorContext';
import { convertToRecurring } from '../services/supabaseApi';
import { useRecentUsage } from '../hooks/useRecentUsage';
import { sortByRecency } from '../utils/sortByRecency';

function EditMovementModal({
  movement,
  accounts = [],
  categories = { ingresos: [], gastos: [] },
  onSave,
  onDelete,
  onDuplicate,
  onClose,
  onConvertedToRecurring,
  loading = false
}) {
  // Form data for income/expense
  const [formData, setFormData] = useState({
    fecha: '',
    monto: '',
    cuenta: '',
    categoria: '',
    nota: '',
    moneda: 'ARS', // Moneda original del gasto (para tarjetas de crédito)
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

  // Estado para modal de confirmación de cuotas
  const [showInstallmentConfirm, setShowInstallmentConfirm] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState(null);

  // Estados para adjuntos
  const [newAttachment, setNewAttachment] = useState(null);
  const [removeExistingAttachment, setRemoveExistingAttachment] = useState(false);

  // Estado para convertir a recurrente
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState('monthly');
  const [recurringAccount, setRecurringAccount] = useState('');
  const [convertingToRecurring, setConvertingToRecurring] = useState(false);

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
      // Si la fecha ya es yyyy-MM-dd, usarla directamente
      // Si no, usar parseLocalDate para evitar problemas de timezone
      const fecha = movement.fecha && /^\d{4}-\d{2}-\d{2}$/.test(movement.fecha)
        ? movement.fecha
        : (movement.fecha ? format(parseLocalDate(movement.fecha), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));

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
          moneda: movement.monedaOriginal || 'ARS', // Cargar moneda original del movimiento
        });
      }
      // Reset attachment states
      setNewAttachment(null);
      setRemoveExistingAttachment(false);
      // Reset recurring account to movement's account
      setRecurringAccount(movement.cuenta || '');
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

  // Check if movement is an installment with subsequent installments
  const isInstallment = !!(movement?.cuota || movement?.installment_number);
  const hasSubsequentInstallments = () => {
    if (!movement?.cuota) return false;
    const match = movement.cuota.match(/^(\d+)\/(\d+)$/);
    if (!match) return false;
    const current = parseInt(match[1]);
    const total = parseInt(match[2]);
    return current < total;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let saveData;
    if (isTransfer) {
      saveData = {
        ...movement,
        fecha: transferData.fecha,
        cuentaSaliente: transferData.cuentaSaliente,
        cuentaEntrante: transferData.cuentaEntrante,
        montoSaliente: parseFloat(transferData.montoSaliente),
        montoEntrante: parseFloat(transferData.montoEntrante),
        nota: transferData.nota,
        newAttachment,
        removeAttachment: removeExistingAttachment && !newAttachment,
      };
      onSave?.(saveData);
    } else {
      saveData = {
        ...movement,
        ...formData,
        monto: parseFloat(formData.monto),
        newAttachment,
        removeAttachment: removeExistingAttachment && !newAttachment,
      };

      // If it's an installment with subsequent installments, ask user
      if (isInstallment && hasSubsequentInstallments()) {
        setPendingSaveData(saveData);
        setShowInstallmentConfirm(true);
      } else {
        onSave?.(saveData);
      }
    }
  };

  // Handle installment confirmation
  const handleInstallmentConfirm = (applyToSubsequent) => {
    if (pendingSaveData) {
      onSave?.({
        ...pendingSaveData,
        applyToSubsequent,
      });
    }
    setShowInstallmentConfirm(false);
    setPendingSaveData(null);
  };

  // Handle convert to recurring
  const handleConvertToRecurring = async () => {
    if (!movement?.id) return;

    try {
      setConvertingToRecurring(true);
      const frequency = { type: recurringFrequency };
      await convertToRecurring(movement.id, frequency, recurringAccount);
      setShowRecurringModal(false);
      onConvertedToRecurring?.();
      onClose();
    } catch (err) {
      console.error('Error converting to recurring:', err);
      showError('Error', 'No se pudo convertir a recurrente');
    } finally {
      setConvertingToRecurring(false);
    }
  };

  // Can convert to recurring? (not installment, not already recurring, not transfer)
  const canConvertToRecurring = !isInstallment && !movement?.isRecurring && !isTransfer && movement?.id;

  const { showError } = useError();

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Aceptar tanto id como rowIndex para identificar el movimiento
    if (!movement?.id && !movement?.rowIndex) {
      showError('No se puede eliminar el movimiento', 'Falta información del movimiento');
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

  // Ordenar cuentas y categorías por uso reciente
  const { recentAccountIds, recentCategoryIds } = useRecentUsage();

  const sortedAccounts = useMemo(() => {
    return sortByRecency(accounts, recentAccountIds, 'id');
  }, [accounts, recentAccountIds]);

  const currentCategories = movement?.tipo === 'ingreso'
    ? categories.ingresos
    : categories.gastos;

  const sortedCategories = useMemo(() => {
    return sortByRecency(currentCategories, recentCategoryIds, 'id');
  }, [currentCategories, recentCategoryIds]);

  // Check if selected account is a credit card
  const selectedAccount = useMemo(() => {
    return accounts.find(a => a.nombre === formData.cuenta);
  }, [accounts, formData.cuenta]);

  const isCreditCard = selectedAccount?.esTarjetaCredito || false;

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
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto sm:py-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity"
        style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md sm:max-w-lg sm:mx-4 mt-0 rounded-b-2xl sm:rounded-2xl flex flex-col animate-slide-down max-h-[calc(100dvh-40px)] sm:max-h-[calc(100vh-48px)]"
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
                <Combobox
                  name="cuentaSaliente"
                  value={transferData.cuentaSaliente}
                  onChange={handleTransferChange}
                  options={sortedAccounts.map(a => ({
                    value: a.nombre,
                    label: a.nombre,
                    icon: a.icon || null,
                  }))}
                  defaultOptionIcon="💳"
                  placeholder="Seleccionar cuenta"
                  emptyMessage="No hay cuentas"
                />
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
                <Combobox
                  name="cuentaEntrante"
                  value={transferData.cuentaEntrante}
                  onChange={handleTransferChange}
                  options={sortedAccounts.map(a => ({
                    value: a.nombre,
                    label: a.nombre,
                    icon: a.icon || null,
                  }))}
                  defaultOptionIcon="💳"
                  placeholder="Seleccionar cuenta"
                  emptyMessage="No hay cuentas"
                />
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
                    {formData.moneda === 'USD' ? 'US$' : '$'}
                  </span>
                  <input
                    type="number"
                    name="monto"
                    value={formData.monto}
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full pl-12 pr-4 py-3 rounded-xl text-lg"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              {/* Selector de moneda - Solo para tarjetas de crédito y gastos */}
              {isCreditCard && movement?.tipo === 'gasto' && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Moneda
                  </label>
                  <div className="flex w-full p-1 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    {[
                      { id: 'ARS', label: 'ARS', icon: `${import.meta.env.BASE_URL}icons/catalog/ARS.svg` },
                      { id: 'USD', label: 'USD', icon: `${import.meta.env.BASE_URL}icons/catalog/USD.svg` },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, moneda: opt.id }))}
                        className="flex-1 py-2 rounded-md text-xs font-medium transition-colors duration-150 flex items-center justify-center gap-1.5"
                        style={{
                          backgroundColor: formData.moneda === opt.id ? 'var(--bg-elevated)' : 'transparent',
                          color: formData.moneda === opt.id ? 'var(--text-primary)' : 'var(--text-muted)',
                        }}
                      >
                        <img src={opt.icon} alt={opt.label} className="w-4 h-4 rounded-sm" />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Cuenta */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Cuenta
                </label>
                <Combobox
                  name="cuenta"
                  value={formData.cuenta}
                  onChange={handleChange}
                  options={sortedAccounts.map(a => ({
                    value: a.nombre,
                    label: a.nombre,
                    icon: a.icon || null,
                  }))}
                  defaultOptionIcon="💳"
                  placeholder="Seleccionar cuenta"
                  emptyMessage="No hay cuentas"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Categoria
                </label>
                <Combobox
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  options={sortedCategories || []}
                  defaultOptionIcon="🏷️"
                  placeholder="Seleccionar categoria"
                  emptyMessage="No hay categorías"
                />
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
          {canConvertToRecurring && (
            <button
              type="button"
              onClick={() => setShowRecurringModal(true)}
              disabled={loading}
              className="p-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 hover:scale-105"
              style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)' }}
              title="Convertir a recurrente"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
          <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center overflow-y-auto sm:py-6">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <div
              className="relative w-full max-w-sm sm:mx-4 mt-0 rounded-b-2xl sm:rounded-2xl p-6 animate-slide-down sm:max-h-[calc(100vh-48px)]"
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

        {/* Installment Confirmation Modal */}
        {showInstallmentConfirm && (
          <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center overflow-y-auto sm:py-6">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setShowInstallmentConfirm(false);
                setPendingSaveData(null);
              }}
            />
            <div
              className="relative w-full max-w-sm sm:mx-4 mt-0 rounded-b-2xl sm:rounded-2xl p-6 animate-slide-down sm:max-h-[calc(100vh-48px)]"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              {/* Drag indicator - mobile only */}
              <div className="sm:hidden flex justify-center -mt-4 mb-2">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-medium)' }} />
              </div>

              <div className="text-center">
                <div
                  className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)' }}
                >
                  <svg className="w-7 h-7" style={{ color: 'var(--accent-purple, #a855f7)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Aplicar a cuotas siguientes
                </h3>
                <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Esta es la cuota <span className="font-bold" style={{ color: 'var(--accent-purple, #a855f7)' }}>{movement?.cuota}</span>
                </p>
                <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                  ¿Querés aplicar estos cambios también a las cuotas siguientes de esta compra?
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleInstallmentConfirm(true)}
                    className="w-full py-3 rounded-xl font-medium text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: 'var(--accent-purple, #a855f7)' }}
                  >
                    Sí, aplicar a todas
                  </button>
                  <button
                    onClick={() => handleInstallmentConfirm(false)}
                    className="w-full py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    No, solo esta cuota
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Convert to Recurring Modal */}
        {showRecurringModal && (
          <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center overflow-y-auto sm:py-6">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowRecurringModal(false)}
            />
            <div
              className="relative w-full max-w-sm sm:mx-4 mt-0 rounded-b-2xl sm:rounded-2xl p-6 animate-slide-down sm:max-h-[calc(100vh-48px)]"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              {/* Drag indicator - mobile only */}
              <div className="sm:hidden flex justify-center -mt-4 mb-2">
                <div className="w-10 h-1 rounded-full" style={{ backgroundColor: 'var(--border-medium)' }} />
              </div>

              <div className="text-center">
                <div
                  className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)' }}
                >
                  <svg className="w-7 h-7" style={{ color: 'var(--accent-purple)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Convertir a recurrente
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Este {movement?.tipo === 'ingreso' ? 'ingreso' : 'gasto'} se convertirá en una transacción recurrente
                </p>

                {/* Amount preview */}
                <div
                  className="mb-4 p-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Monto</p>
                  <p
                    className="text-xl font-bold"
                    style={{ color: movement?.tipo === 'ingreso' ? 'var(--accent-green)' : 'var(--accent-red)' }}
                  >
                    {formatCurrency(movement?.montoPesos || movement?.monto)}
                  </p>
                </div>

                {/* Account selector */}
                <div className="mb-4 text-left">
                  <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Cuenta
                  </p>
                  <Combobox
                    name="recurringAccount"
                    value={recurringAccount}
                    onChange={(e) => setRecurringAccount(e.target.value)}
                    options={sortedAccounts.map(a => ({
                      value: a.nombre,
                      label: a.nombre,
                      icon: a.icon || null,
                    }))}
                    defaultOptionIcon="💳"
                    placeholder="Seleccionar cuenta"
                    emptyMessage="No hay cuentas"
                  />
                </div>

                {/* Frequency selector */}
                <div className="mb-5">
                  <p className="text-sm font-medium mb-2 text-left" style={{ color: 'var(--text-secondary)' }}>
                    Frecuencia
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'weekly', label: 'Semanal' },
                      { value: 'biweekly', label: 'Quincenal' },
                      { value: 'monthly', label: 'Mensual' },
                      { value: 'bimonthly', label: 'Bimestral' },
                      { value: 'quarterly', label: 'Trimestral' },
                      { value: 'yearly', label: 'Anual' },
                    ].map((freq) => (
                      <button
                        key={freq.value}
                        type="button"
                        onClick={() => setRecurringFrequency(freq.value)}
                        className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-all ${
                          recurringFrequency === freq.value ? 'ring-2' : ''
                        }`}
                        style={{
                          backgroundColor: recurringFrequency === freq.value
                            ? 'rgba(168, 85, 247, 0.15)'
                            : 'var(--bg-tertiary)',
                          color: recurringFrequency === freq.value
                            ? 'var(--accent-purple)'
                            : 'var(--text-secondary)',
                          ringColor: 'var(--accent-purple)',
                        }}
                      >
                        {freq.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleConvertToRecurring}
                    disabled={convertingToRecurring}
                    className="w-full py-3 rounded-xl font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--accent-purple)' }}
                  >
                    {convertingToRecurring ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Convirtiendo...
                      </>
                    ) : (
                      'Convertir a recurrente'
                    )}
                  </button>
                  <button
                    onClick={() => setShowRecurringModal(false)}
                    disabled={convertingToRecurring}
                    className="w-full py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  >
                    Cancelar
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
