import React, { useState, useEffect } from 'react';
import PeriodSelector from '../common/PeriodSelector';
import MultiSelectChips from '../common/MultiSelectChips';
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
    { value: 'income', label: 'Ingreso', description: 'Ganar cierta cantidad', icon: '💰' },
    { value: 'savings', label: 'Ahorro', description: 'Ahorrar cierta cantidad', icon: '🏦' },
    { value: 'spending_reduction', label: 'Reducir gasto', description: 'Gastar menos', icon: '📉' },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-5 animate-slide-up sm:animate-scale-in"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          {/* Drag indicator (mobile) */}
          <div
            className="sm:hidden w-12 h-1 rounded-full mx-auto mb-4"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          />

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {isEditing ? 'Editar meta' : 'Nueva meta'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition-colors hover:bg-black/10"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Goal type selector */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Tipo de meta
              </label>
              <div className="grid grid-cols-3 gap-2">
                {goalTypes.map((type) => {
                  const isSelected = formData.goalType === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleChange('goalType', type.value)}
                      className={`
                        p-3 rounded-xl text-center transition-all
                        ${isSelected ? 'ring-2 ring-offset-1' : 'hover:opacity-80'}
                      `}
                      style={{
                        backgroundColor: isSelected ? 'var(--accent-primary-dim)' : 'var(--bg-tertiary)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        '--tw-ring-color': 'var(--accent-primary)',
                        '--tw-ring-offset-color': 'var(--bg-secondary)',
                      }}
                    >
                      <span className="text-xl block mb-1">{type.icon}</span>
                      <span className="text-xs font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name & Icon */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Nombre
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  {formData.icon ? (
                    isEmoji(formData.icon) ? formData.icon : (
                      <img src={formData.icon} alt="" className="w-8 h-8 rounded-lg object-contain" />
                    )
                  ) : '🎯'}
                </button>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder={
                    formData.goalType === 'income'
                      ? 'Ej: Alcanzar $1M de ingresos'
                      : formData.goalType === 'savings'
                      ? 'Ej: Ahorrar para vacaciones'
                      : 'Ej: Reducir gastos de delivery'
                  }
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
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

            {/* Target Amount */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {formData.goalType === 'spending_reduction' ? 'Monto máximo a gastar' : 'Monto objetivo'}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => handleChange('targetAmount', e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="flex-1 px-4 py-3 rounded-xl text-sm outline-none transition-all focus:ring-2"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    '--tw-ring-color': 'var(--accent-primary)',
                  }}
                />
                {/* Currency selector with flags */}
                <div
                  className="flex rounded-xl p-1"
                  style={{ backgroundColor: 'var(--bg-tertiary)' }}
                >
                  <button
                    type="button"
                    onClick={() => handleChange('currency', 'ARS')}
                    className="px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                    style={{
                      backgroundColor: formData.currency === 'ARS' ? 'var(--bg-elevated)' : 'transparent',
                      color: formData.currency === 'ARS' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-4 h-4 rounded-sm" />
                    ARS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChange('currency', 'USD')}
                    className="px-3 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                    style={{
                      backgroundColor: formData.currency === 'USD' ? 'var(--bg-elevated)' : 'transparent',
                      color: formData.currency === 'USD' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-4 h-4 rounded-sm" />
                    USD
                  </button>
                </div>
              </div>
              {errors.targetAmount && (
                <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
                  {errors.targetAmount}
                </p>
              )}
            </div>

            {/* Period */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                Período
              </label>
              <PeriodSelector
                value={formData.periodType}
                onChange={(value) => handleChange('periodType', value)}
              />
            </div>

            {/* Start date (for all period types) */}
            <div>
              <label
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Fecha de inicio
              </label>
              <DatePicker
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
            </div>

            {/* End date (only for custom period) */}
            {formData.periodType === 'custom' && (
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Fecha fin
                </label>
                <DatePicker
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                />
                {errors.endDate && (
                  <p className="text-xs mt-1" style={{ color: 'var(--accent-red)' }}>
                    {errors.endDate}
                  </p>
                )}
              </div>
            )}

            {/* Global toggle */}
            <div
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Meta global
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {formData.goalType === 'income'
                    ? 'Todos los ingresos'
                    : formData.goalType === 'savings'
                    ? 'Balance general'
                    : 'Todos los gastos'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleChange('isGlobal', !formData.isGlobal)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{
                  backgroundColor: formData.isGlobal ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                }}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
                    ${formData.isGlobal ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>

            {/* Category filter (if not global) */}
            {!formData.isGlobal && (
              <MultiSelectChips
                items={relevantCategories}
                selectedIds={formData.categoryIds}
                onChange={(ids) => handleChange('categoryIds', ids)}
                label={`Categorías de ${formData.goalType === 'income' ? 'ingreso' : 'gasto'} (opcional)`}
                emptyMessage="No hay categorías"
              />
            )}

            {/* Account filter (if not global) */}
            {!formData.isGlobal && (
              <MultiSelectChips
                items={accountOptions}
                selectedIds={formData.accountIds}
                onChange={(ids) => handleChange('accountIds', ids)}
                label="Cuentas (opcional)"
                emptyMessage="No hay cuentas"
              />
            )}

            {/* Recurring toggle */}
            <div
              className="flex items-center justify-between p-3 rounded-xl"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Recurrente
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Se reinicia cada período
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleChange('isRecurring', !formData.isRecurring)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{
                  backgroundColor: formData.isRecurring ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                }}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
                    ${formData.isRecurring ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-3">
              {isEditing && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-3 rounded-xl text-sm font-medium transition-colors"
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
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                }}
              >
                {loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear meta'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <ConfirmModal
          title="Eliminar meta"
          message={`¿Estás seguro de que quieres eliminar "${goal?.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          variant="danger"
        />
      )}

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
