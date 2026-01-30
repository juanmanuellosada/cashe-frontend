import React, { useState, useEffect, useRef } from 'react';
import PeriodSelector from '../common/PeriodSelector';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import DatePicker from '../DatePicker';
import ConfirmModal from '../ConfirmModal';
import IconPicker from '../IconPicker';
import { isEmoji } from '../../services/iconStorage';

/**
 * BudgetModal - Modal para crear/editar presupuestos
 */
function BudgetModal({
  budget = null,
  categories = [],
  accounts = [],
  onSave,
  onDelete,
  onDuplicate,
  onClose,
  loading = false,
}) {
  const isEditing = !!budget;

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    currency: 'ARS',
    periodType: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isRecurring: true,
    categoryIds: [],
    accountIds: [],
    isGlobal: false,
    icon: '',
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [errors, setErrors] = useState({});

  // Drag to dismiss state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  // Reset drag state when modal opens
  useEffect(() => {
    setDragY(0);
    setIsDragging(false);
  }, [budget]);

  // Load budget data when editing
  useEffect(() => {
    if (budget) {
      setFormData({
        name: budget.name || '',
        amount: budget.amount?.toString() || '',
        currency: budget.currency || 'ARS',
        periodType: budget.period_type || 'monthly',
        startDate: budget.start_date || new Date().toISOString().split('T')[0],
        endDate: budget.end_date || '',
        isRecurring: budget.is_recurring ?? true,
        categoryIds: budget.category_ids || [],
        accountIds: budget.account_ids || [],
        isGlobal: budget.is_global || false,
        icon: budget.icon || '',
      });
    }
  }, [budget]);

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

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Ingresa un monto válido mayor a 0';
    }

    if (formData.periodType === 'custom' && !formData.endDate) {
      newErrors.endDate = 'Selecciona una fecha de fin';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    onSave({
      ...(budget && { id: budget.id }),
      name: formData.name.trim(),
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      periodType: formData.periodType,
      startDate: formData.startDate,
      endDate: formData.periodType === 'custom' ? formData.endDate : null,
      isRecurring: formData.isRecurring,
      categoryIds: formData.isGlobal ? [] : formData.categoryIds,
      accountIds: formData.isGlobal ? [] : formData.accountIds,
      isGlobal: formData.isGlobal,
      icon: formData.icon || null,
      isActive: budget?.is_active ?? true,
      isPaused: budget?.is_paused ?? false,
    });
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.(budget);
  };

  // Prepare categories and accounts for MultiSelectChips
  const expenseCategories = categories
    .filter((c) => c.tipo === 'Gasto' || c.type === 'expense')
    .map((c, index) => ({
      id: c.id || c.rowIndex || `cat-${index}`,
      name: c.nombre || c.name || c.label,
      icon: c.icon,
    }));

  const accountOptions = accounts.map((a, index) => ({
    id: a.id || a.rowIndex || `acc-${index}`,
    name: a.nombre || a.name,
    icon: a.icon,
  }));

  const backdropOpacity = Math.max(0.6 - (dragY / 300), 0);
  const shouldClose = dragY > 100;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 backdrop-blur-sm transition-opacity animate-fade-in"
          style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto sm:m-4 mt-0 rounded-b-2xl sm:rounded-2xl p-4 sm:p-5 animate-slide-down"
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
          <div className="sm:hidden flex justify-center -mt-2 mb-1" data-drag-handle>
            <div
              className="w-10 h-1 rounded-full transition-colors"
              style={{
                backgroundColor: shouldClose ? 'var(--accent-red)' : 'var(--border-medium)',
              }}
            />
          </div>

          {/* Header - Compact like AccountModal */}
          <div
            className="flex items-center justify-between py-2 sm:py-3 mb-3 border-b"
            style={{ borderColor: 'var(--border-subtle)' }}
            data-drag-handle
          >
            <h2
              className="text-base sm:text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {isEditing ? 'Editar presupuesto' : 'Nuevo presupuesto'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors hover:bg-black/10"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Name & Icon */}
            <div>
              <label
                className="block text-xs sm:text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Nombre
              </label>
              <div className="flex gap-2">
                {/* Icon selector */}
                <button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-xl transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  {formData.icon ? (
                    isEmoji(formData.icon) ? formData.icon : (
                      <img src={formData.icon} alt="" className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg object-contain" />
                    )
                  ) : '💰'}
                </button>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Ej: Gastos mensuales"
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm outline-none transition-all focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    '--tw-ring-color': 'var(--accent-primary)',
                  }}
                />
              </div>
              {errors.name && (
                <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Amount & Currency */}
            <div>
              <label
                className="block text-xs sm:text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Monto límite
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm outline-none transition-all focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    '--tw-ring-color': 'var(--accent-primary)',
                  }}
                />
                {/* Currency selector with flags */}
                <div
                  className="flex rounded-lg sm:rounded-xl p-0.5 sm:p-1"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <button
                    type="button"
                    onClick={() => handleChange('currency', 'ARS')}
                    className="px-2 sm:px-3 py-2 rounded-md sm:rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                    style={{
                      backgroundColor: formData.currency === 'ARS' ? 'var(--bg-elevated)' : 'transparent',
                      color: formData.currency === 'ARS' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-4 h-4 rounded-sm" />
                    <span className="hidden sm:inline">ARS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('currency', 'USD')}
                    className="px-2 sm:px-3 py-2 rounded-md sm:rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                    style={{
                      backgroundColor: formData.currency === 'USD' ? 'var(--bg-elevated)' : 'transparent',
                      color: formData.currency === 'USD' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-4 h-4 rounded-sm" />
                    <span className="hidden sm:inline">USD</span>
                  </button>
                </div>
              </div>
              {errors.amount && (
                <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
                  {errors.amount}
                </p>
              )}
            </div>

            {/* Period */}
            <div>
              <label
                className="block text-xs sm:text-sm font-medium mb-1.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Período
              </label>
              <PeriodSelector
                value={formData.periodType}
                onChange={(value) => handleChange('periodType', value)}
              />
            </div>

            {/* Dates row - two columns only for custom period */}
            <div className={`grid gap-2 ${formData.periodType === 'custom' ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <div>
                <label
                  className="block text-[10px] sm:text-xs font-medium mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {formData.periodType === 'custom' ? 'Inicio' : 'Fecha de inicio'}
                </label>
                <DatePicker
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  compact={formData.periodType === 'custom'}
                />
              </div>

              {formData.periodType === 'custom' && (
                <div>
                  <label
                    className="block text-[10px] sm:text-xs font-medium mb-1"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Fin
                  </label>
                  <DatePicker
                    value={formData.endDate}
                    onChange={(e) => handleChange('endDate', e.target.value)}
                    compact
                  />
                  {errors.endDate && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--accent-red)' }}>
                      {errors.endDate}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Global checkbox - compact */}
            <button
              type="button"
              onClick={() => handleChange('isGlobal', !formData.isGlobal)}
              className="flex items-center gap-2 w-full p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center transition-all duration-200 flex-shrink-0 ${!formData.isGlobal ? 'border-2' : ''}`}
                style={{
                  backgroundColor: formData.isGlobal ? 'var(--accent-primary)' : 'transparent',
                  borderColor: 'var(--text-secondary)'
                }}
              >
                {formData.isGlobal && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Global</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Todos los gastos</p>
              </div>
            </button>

            {/* Category & Account filters (if not global) */}
            {!formData.isGlobal && (
              <div className="grid grid-cols-2 gap-2">
                <MultiSelectDropdown
                  items={expenseCategories}
                  selectedIds={formData.categoryIds}
                  onChange={(ids) => handleChange('categoryIds', ids)}
                  label="Categorías"
                  placeholder="Todas"
                  emptyMessage="Sin categorías"
                />
                <MultiSelectDropdown
                  items={accountOptions}
                  selectedIds={formData.accountIds}
                  onChange={(ids) => handleChange('accountIds', ids)}
                  label="Cuentas"
                  placeholder="Todas"
                  emptyMessage="Sin cuentas"
                />
              </div>
            )}

            {/* Recurring checkbox - compact */}
            <button
              type="button"
              onClick={() => handleChange('isRecurring', !formData.isRecurring)}
              className="flex items-center gap-2 w-full p-2 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div
                className={`w-4 h-4 rounded flex items-center justify-center transition-all duration-200 flex-shrink-0 ${!formData.isRecurring ? 'border-2' : ''}`}
                style={{
                  backgroundColor: formData.isRecurring ? 'var(--accent-primary)' : 'transparent',
                  borderColor: 'var(--text-secondary)'
                }}
              >
                {formData.isRecurring && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Recurrente</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Se reinicia cada período</p>
              </div>
            </button>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--accent-red-dim)',
                    color: 'var(--accent-red)',
                  }}
                >
                  Eliminar
                </button>
              )}

              {isEditing && onDuplicate && (
                <button
                  type="button"
                  onClick={() => onDuplicate(budget)}
                  disabled={loading}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Duplicar
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                }}
              >
                {loading ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Eliminar presupuesto"
        message={`¿Estás seguro de que quieres eliminar "${budget?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
      />

      {/* Icon picker */}
      <IconPicker
        isOpen={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={(icon) => handleChange('icon', icon)}
        currentValue={formData.icon}
        showPredefined={false}
        title="Seleccionar ícono"
      />
    </>
  );
}

export default BudgetModal;
