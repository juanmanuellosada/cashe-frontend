import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { createScheduledTransaction, updateScheduledTransaction } from '../../services/supabaseApi';
import DatePicker from '../DatePicker';
import Combobox from '../Combobox';
import CreateCategoryModal from '../CreateCategoryModal';
import LoadingSpinner from '../LoadingSpinner';
import Toast from '../Toast';

const MOVEMENT_TYPES = [
  {
    id: 'income',
    label: 'Ingreso',
    color: 'var(--accent-green)',
    bgDim: 'var(--accent-green-dim)',
  },
  {
    id: 'expense',
    label: 'Gasto',
    color: 'var(--accent-red)',
    bgDim: 'var(--accent-red-dim)',
  },
  {
    id: 'transfer',
    label: 'Transferir',
    color: 'var(--accent-blue)',
    bgDim: 'var(--accent-blue-dim)',
  },
];

function ScheduledModal({ isOpen, onClose, onSuccess, editData = null }) {
  const { accounts, loading: loadingAccounts, refetch: refetchAccounts } = useAccounts();
  const { categories, categoriesWithId, loading: loadingCategories, refetch: refetchCategories } = useCategories();

  // Filter out credit card accounts
  const nonCreditCardAccounts = useMemo(() => {
    return (accounts || []).filter(a => !a.esTarjetaCredito);
  }, [accounts]);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [movementType, setMovementType] = useState(editData?.type || 'expense');

  // Tomorrow as minimum date
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [formData, setFormData] = useState({
    fecha: editData?.fecha || tomorrow,
    monto: editData?.monto?.toString() || '',
    cuenta: editData?.cuenta || '',
    cuentaDestino: editData?.cuentaDestino || '',
    montoDestino: editData?.montoDestino?.toString() || '',
    categoria: editData?.categoria || '',
    nota: editData?.nota || '',
  });

  // Drag to dismiss state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsDragging(false);
      if (!editData) {
        setFormData({
          fecha: tomorrow,
          monto: '',
          cuenta: '',
          cuentaDestino: '',
          montoDestino: '',
          categoria: '',
          nota: '',
        });
        setMovementType('expense');
      } else {
        setFormData({
          fecha: editData.fecha || tomorrow,
          monto: editData.monto?.toString() || '',
          cuenta: editData.cuenta || '',
          cuentaDestino: editData.cuentaDestino || '',
          montoDestino: editData.montoDestino?.toString() || '',
          categoria: editData.categoria || '',
          nota: editData.nota || '',
        });
        setMovementType(editData.type || 'expense');
      }
      setToast(null);
    }
  }, [isOpen, editData, tomorrow]);

  // Close with Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !submitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, submitting, onClose]);

  // Touch handlers for drag to dismiss
  const handleTouchStart = (e) => {
    if (e.target.closest('[data-drag-handle]')) {
      startY.current = e.touches[0].clientY;
      setIsDragging(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) setDragY(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    if (dragY > 100 && !submitting) onClose();
    setDragY(0);
    setIsDragging(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    if (!formData.monto || !formData.cuenta || !formData.fecha) {
      setToast({ message: 'Completa los campos obligatorios', type: 'error' });
      return;
    }

    if (movementType !== 'transfer' && !formData.categoria) {
      setToast({ message: 'Selecciona una categoría', type: 'error' });
      return;
    }

    if (movementType === 'transfer' && !formData.cuentaDestino) {
      setToast({ message: 'Selecciona la cuenta destino', type: 'error' });
      return;
    }

    // Validate date is in the future
    if (formData.fecha < tomorrow) {
      setToast({ message: 'La fecha debe ser futura', type: 'error' });
      return;
    }

    setSubmitting(true);

    try {
      const data = {
        type: movementType,
        scheduledDate: formData.fecha,
        amount: parseFloat(formData.monto),
        accountName: formData.cuenta,
        categoryName: movementType !== 'transfer' ? formData.categoria : null,
        note: formData.nota || null,
      };

      if (movementType === 'transfer') {
        data.toAccountName = formData.cuentaDestino;
        data.toAmount = formData.montoDestino ? parseFloat(formData.montoDestino) : parseFloat(formData.monto);
      }

      if (editData?.id) {
        await updateScheduledTransaction(editData.id, data);
      } else {
        await createScheduledTransaction(data);
      }

      setToast({
        message: editData ? 'Programada actualizada' : 'Transacción programada',
        type: 'success',
      });

      refetchAccounts();

      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
      }, 1000);

    } catch (error) {
      setToast({
        message: error.message || 'Error al guardar',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isLoading = loadingAccounts || loadingCategories;
  const backdropOpacity = Math.max(0.6 - (dragY / 300), 0);
  const shouldClose = dragY > 100;

  // Form validation
  const isValid = formData.monto &&
    formData.cuenta &&
    formData.fecha >= tomorrow &&
    (movementType === 'transfer' ? formData.cuentaDestino : formData.categoria);

  // Get accent color based on type
  const getAccentColor = () => {
    switch (movementType) {
      case 'income': return 'var(--accent-green)';
      case 'expense': return 'var(--accent-red)';
      case 'transfer': return 'var(--accent-blue)';
      default: return 'var(--accent-primary)';
    }
  };

  // Filter categories by type
  const filteredCategories = movementType === 'income'
    ? categories.ingresos || []
    : categories.gastos || [];

  // Icons
  const calendarIcon = (
    <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  const currencyIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const accountIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );

  const categoryIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );

  const noteIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center overflow-y-auto sm:py-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-sm transition-opacity animate-fade-in"
        style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
        onClick={submitting ? undefined : onClose}
      />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-md sm:max-w-lg sm:mx-4 mt-0 sm:mt-0 rounded-b-xl sm:rounded-xl animate-slide-down max-h-[85dvh] sm:max-h-[calc(100vh-48px)]"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
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
          className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 cursor-grab active:cursor-grabbing sm:cursor-default"
          style={{ borderColor: 'var(--border-subtle)' }}
          data-drag-handle
        >
          <h2 className="text-base font-medium" style={{ color: 'var(--text-primary)' }}>
            {editData ? 'Editar Programada' : 'Programar Transacción'}
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-md transition-colors duration-150 hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
              {/* Movement Type Selector */}
              {!editData && (
                <div
                  className="inline-flex p-0.5 sm:p-1 rounded-lg mb-1"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  {MOVEMENT_TYPES.map((type) => {
                    const isActive = movementType === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setMovementType(type.id)}
                        className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-150"
                        style={{
                          backgroundColor: isActive ? type.bgDim : 'transparent',
                          color: isActive ? type.color : 'var(--text-muted)',
                        }}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Fecha */}
              <div>
                <label
                  className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {calendarIcon}
                  Fecha programada
                </label>
                <DatePicker
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleChange}
                  minDate={tomorrow}
                />
              </div>

              {/* Monto */}
              <div>
                <label
                  className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {currencyIcon}
                  {movementType === 'transfer' ? 'Monto a transferir' : 'Monto'}
                </label>
                <div
                  className="relative rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all duration-200"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '2px solid transparent',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-2xl sm:text-3xl font-bold"
                      style={{ color: getAccentColor() }}
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
                      className="flex-1 text-2xl sm:text-3xl font-bold bg-transparent outline-none"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Cuenta */}
              <div>
                <label
                  className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {accountIcon}
                  {movementType === 'transfer' ? 'Cuenta origen' : 'Cuenta'}
                </label>
                <Combobox
                  name="cuenta"
                  value={formData.cuenta}
                  onChange={handleChange}
                  options={nonCreditCardAccounts.map(a => ({ value: a.nombre, label: a.nombre, icon: a.icon || null }))}
                  placeholder="Seleccionar cuenta"
                  icon={accountIcon}
                  emptyMessage="No hay cuentas"
                  defaultOptionIcon="💳"
                />
              </div>

              {/* Transfer specific fields */}
              {movementType === 'transfer' && (
                <>
                  {/* Cuenta destino */}
                  <div>
                    <label
                      className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {accountIcon}
                      Cuenta destino
                    </label>
                    <Combobox
                      name="cuentaDestino"
                      value={formData.cuentaDestino}
                      onChange={handleChange}
                      options={nonCreditCardAccounts
                        .filter(a => a.nombre !== formData.cuenta)
                        .map(a => ({ value: a.nombre, label: a.nombre, icon: a.icon || null }))}
                      placeholder="Seleccionar cuenta destino"
                      icon={accountIcon}
                      emptyMessage="No hay otras cuentas"
                      defaultOptionIcon="💳"
                    />
                  </div>

                  {/* Monto destino (si es diferente moneda) */}
                  <div>
                    <label
                      className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {currencyIcon}
                      Monto en destino (si difiere)
                    </label>
                    <input
                      type="number"
                      name="montoDestino"
                      value={formData.montoDestino}
                      onChange={handleChange}
                      placeholder={formData.monto || '0'}
                      min="0"
                      step="0.01"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-primary)]"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </>
              )}

              {/* Categoría (no para transfers) */}
              {movementType !== 'transfer' && (
                <div>
                  <label
                    className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {categoryIcon}
                    Categoría
                  </label>
                  <Combobox
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    options={filteredCategories}
                    placeholder="Seleccionar categoría"
                    icon={categoryIcon}
                    emptyMessage="No hay categorías"
                    onCreateNew={() => setShowCreateCategory(true)}
                    createNewLabel="Crear categoría"
                  />
                </div>
              )}

              {/* Nota */}
              <div>
                <label
                  className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {noteIcon}
                  Nota (opcional)
                </label>
                <textarea
                  name="nota"
                  value={formData.nota}
                  onChange={handleChange}
                  placeholder="Agregar una nota..."
                  rows={1}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl resize-none transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-primary)] text-sm sm:text-base"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isValid || submitting}
                className="w-full py-3 sm:py-4 rounded-xl font-semibold text-white text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: getAccentColor() }}
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {editData ? 'Actualizar' : 'Programar'}
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute bottom-3 left-3 right-3">
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          </div>
        )}
      </div>

      {/* Create Category Modal */}
      <CreateCategoryModal
        isOpen={showCreateCategory}
        onClose={() => setShowCreateCategory(false)}
        type={movementType === 'income' ? 'ingreso' : 'gasto'}
        onCategoryCreated={(newCat) => {
          setFormData(prev => ({ ...prev, categoria: newCat }));
          refetchCategories();
        }}
      />
    </div>,
    document.body
  );
}

export default ScheduledModal;
