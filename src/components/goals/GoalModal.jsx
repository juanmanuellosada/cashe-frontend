import React, { useState, useEffect, useRef } from 'react';
import PeriodSelector from '../common/PeriodSelector';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import DatePicker from '../DatePicker';
import ConfirmModal from '../ConfirmModal';
import IconPicker from '../IconPicker';
import { isEmoji } from '../../services/iconStorage';

/**
 * GoalModal - Modal para crear/editar metas
 */
function GoalModal({
  goal = null,
  categories = [],
  accounts = [],
  onSave,
  onDelete,
  onClose,
  loading = false,
}) {
  const isEditing = !!goal;

  const [formData, setFormData] = useState({
    name: '',
    goalType: 'savings',
    targetAmount: '',
    currency: 'ARS',
    periodType: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isRecurring: true,
    categoryIds: [],
    accountIds: [],
    isGlobal: true,
    reductionType: 'percentage',
    reductionValue: '',
    baselineAmount: '',
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
  }, [goal]);

  // Load goal data when editing
  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name || '',
        goalType: goal.goal_type || 'savings',
        targetAmount: goal.target_amount?.toString() || '',
        currency: goal.currency || 'ARS',
        periodType: goal.period_type || 'monthly',
        startDate: goal.start_date || new Date().toISOString().split('T')[0],
        endDate: goal.end_date || '',
        isRecurring: goal.is_recurring ?? true,
        categoryIds: goal.category_ids || [],
        accountIds: goal.account_ids || [],
        isGlobal: goal.is_global ?? true,
        reductionType: goal.reduction_type || 'percentage',
        reductionValue: goal.reduction_value?.toString() || '',
        baselineAmount: goal.baseline_amount?.toString() || '',
        icon: goal.icon || '',
      });
    }
  }, [goal]);

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
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    const targetAmount = parseFloat(formData.targetAmount);
    if (!formData.targetAmount || isNaN(targetAmount) || targetAmount <= 0) {
      newErrors.targetAmount = 'Ingresa un monto válido mayor a 0';
    }

    if (formData.periodType === 'custom' && !formData.endDate) {
      newErrors.endDate = 'Selecciona una fecha de fin';
    }

    if (formData.goalType === 'spending_reduction') {
      if (formData.reductionType === 'percentage') {
        const value = parseFloat(formData.reductionValue);
        if (!formData.reductionValue || isNaN(value) || value <= 0 || value > 100) {
          newErrors.reductionValue = 'Ingresa un porcentaje válido (1-100)';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    onSave({
      ...(goal && { id: goal.id }),
      name: formData.name.trim(),
      goalType: formData.goalType,
      targetAmount: parseFloat(formData.targetAmount),
      currency: formData.currency,
      periodType: formData.periodType,
      startDate: formData.startDate,
      endDate: formData.periodType === 'custom' ? formData.endDate : null,
      isRecurring: formData.isRecurring,
      categoryIds: formData.isGlobal ? [] : formData.categoryIds,
      accountIds: formData.isGlobal ? [] : formData.accountIds,
      isGlobal: formData.isGlobal,
      reductionType: formData.goalType === 'spending_reduction' ? formData.reductionType : null,
      reductionValue: formData.goalType === 'spending_reduction' ? parseFloat(formData.reductionValue) : null,
      baselineAmount: formData.goalType === 'spending_reduction' ? parseFloat(formData.baselineAmount) : null,
      icon: formData.icon || null,
      isActive: goal?.is_active ?? true,
      isCompleted: goal?.is_completed ?? false,
    });
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.(goal);
  };

  // Prepare categories based on goal type
  const relevantCategories = categories
    .filter((c) => {
      if (formData.goalType === 'income') {
        return c.tipo === 'Ingreso' || c.type === 'income';
      }
      return c.tipo === 'Gasto' || c.type === 'expense';
    })
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

  // Goal type options
  const goalTypes = [
    { value: 'income', label: 'Ingreso', labelShort: '💰', icon: '💰' },
    { value: 'savings', label: 'Ahorro', labelShort: '🏦', icon: '🏦' },
    { value: 'spending_reduction', label: 'Reducir', labelShort: '📉', icon: '📉' },
  ];

  const backdropOpacity = Math.max(0.6 - (dragY / 300), 0);
  const shouldClose = dragY > 100;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto sm:py-6">
        {/* Backdrop */}
        <div
          className="absolute inset-0 backdrop-blur-sm transition-opacity animate-fade-in"
          style={{ backgroundColor: `rgba(0, 0, 0, ${backdropOpacity})` }}
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className="relative w-full sm:max-w-lg max-h-[90vh] sm:max-h-[calc(100vh-48px)] overflow-y-auto sm:mx-4 mt-0 rounded-b-2xl sm:rounded-2xl p-4 sm:p-5 animate-slide-down"
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
              {isEditing ? 'Editar meta' : 'Nueva meta'}
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
            {/* Goal type selector - Ultra compact */}
            <div>
              <label
                className="block text-[10px] sm:text-xs font-medium mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Tipo
              </label>
              <div className="flex gap-1">
                {goalTypes.map((type) => {
                  const isSelected = formData.goalType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleChange('goalType', type.value)}
                      className={`
                        flex-1 px-1.5 py-1.5 rounded-md text-center transition-all flex items-center justify-center gap-1
                        ${isSelected ? 'ring-1 ring-offset-1' : 'hover:opacity-80'}
                      `}
                      style={{
                        backgroundColor: isSelected ? 'var(--accent-primary-dim)' : 'var(--bg-tertiary)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        '--tw-ring-color': 'var(--accent-primary)',
                        '--tw-ring-offset-color': 'var(--bg-secondary)',
                      }}
                    >
                      <span className="text-xs">{type.icon}</span>
                      <span className="text-[10px] font-medium hidden sm:inline">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name & Icon - Ultra compact */}
            <div>
              <label
                className="block text-[10px] sm:text-xs font-medium mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Nombre
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-base transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  {formData.icon ? (
                    isEmoji(formData.icon) ? formData.icon : (
                      <img src={formData.icon} alt="" className="w-5 h-5 rounded object-contain" />
                    )
                  ) : '🎯'}
                </button>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Nombre de la meta"
                  className="flex-1 px-2.5 py-2 rounded-lg text-xs outline-none transition-all focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    '--tw-ring-color': 'var(--accent-primary)',
                  }}
                />
              </div>
              {errors.name && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--accent-red)' }}>
                  {errors.name}
                </p>
              )}
            </div>

            {/* Target Amount - Ultra compact */}
            <div>
              <label
                className="block text-[10px] sm:text-xs font-medium mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                {formData.goalType === 'spending_reduction' ? 'Máx. a gastar' : 'Monto'}
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => handleChange('targetAmount', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="flex-1 px-2.5 py-2 rounded-lg text-xs outline-none transition-all focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    '--tw-ring-color': 'var(--accent-primary)',
                  }}
                />
                {/* Currency selector compact */}
                <div
                  className="flex rounded-lg p-0.5"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <button
                    type="button"
                    onClick={() => handleChange('currency', 'ARS')}
                    className="px-1.5 py-1.5 rounded text-xs font-medium transition-colors flex items-center"
                    style={{
                      backgroundColor: formData.currency === 'ARS' ? 'var(--bg-elevated)' : 'transparent',
                      color: formData.currency === 'ARS' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-4 h-4 rounded-sm" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('currency', 'USD')}
                    className="px-1.5 py-1.5 rounded text-xs font-medium transition-colors flex items-center"
                    style={{
                      backgroundColor: formData.currency === 'USD' ? 'var(--bg-elevated)' : 'transparent',
                      color: formData.currency === 'USD' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-4 h-4 rounded-sm" />
                  </button>
                </div>
              </div>
              {errors.targetAmount && (
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--accent-red)' }}>
                  {errors.targetAmount}
                </p>
              )}
            </div>

            {/* Period - Ultra compact */}
            <div>
              <label
                className="block text-[10px] sm:text-xs font-medium mb-1"
                style={{ color: 'var(--text-muted)' }}
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
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {formData.goalType === 'income'
                    ? 'Todos los ingresos'
                    : formData.goalType === 'savings'
                    ? 'Balance general'
                    : 'Todos los gastos'}
                </p>
              </div>
            </button>

            {/* Category & Account filters (if not global) - Compact dropdowns */}
            {!formData.isGlobal && (
              <div className="grid grid-cols-2 gap-2">
                <MultiSelectDropdown
                  items={relevantCategories}
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

            {/* Actions - Compact */}
            <div className="flex gap-2 pt-2">
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-3 py-2.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--accent-red-dim)',
                    color: 'var(--accent-red)',
                  }}
                >
                  Eliminar
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
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
        title="Eliminar meta"
        message={`¿Estás seguro de que quieres eliminar "${goal?.name}"? Esta acción no se puede deshacer.`}
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

export default GoalModal;
