import React, { useState, useEffect } from 'react';
import Combobox from '../Combobox';
import DatePicker from '../DatePicker';
import { formatCurrency } from '../../utils/format';

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'bimonthly', label: 'Bimestral' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'biannual', label: 'Semestral' },
  { value: 'yearly', label: 'Anual' },
  { value: 'custom_days', label: 'Personalizado' },
];

const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const WEEKEND_HANDLING_OPTIONS = [
  { value: 'as_is', label: 'Se crea igual' },
  { value: 'previous_business_day', label: 'Día hábil anterior' },
  { value: 'next_business_day', label: 'Día hábil siguiente' },
];

const CREATION_MODE_OPTIONS = [
  { value: 'automatic', label: 'Automático', description: 'Se crea solo sin preguntar' },
  { value: 'bot_confirmation', label: 'Confirmación por bot', description: 'Te notifica y espera tu confirmación' },
  { value: 'manual_confirmation', label: 'Confirmación manual', description: 'Debes confirmar desde la web' },
];

function RecurringModal({
  recurring,
  accounts,
  categories,
  onSave,
  onDelete,
  onClose,
  loading,
}) {
  const isEdit = !!recurring;

  // Form state
  const [step, setStep] = useState(1);
  const [type, setType] = useState(recurring?.type || 'expense');
  const [name, setName] = useState(recurring?.name || '');
  const [amount, setAmount] = useState(recurring?.amount?.toString() || '');
  const [currency, setCurrency] = useState(recurring?.currency || 'ARS');
  const [accountId, setAccountId] = useState(recurring?.accountId || '');
  const [categoryId, setCategoryId] = useState(recurring?.categoryId || '');
  const [fromAccountId, setFromAccountId] = useState(recurring?.fromAccountId || '');
  const [toAccountId, setToAccountId] = useState(recurring?.toAccountId || '');
  const [toAmount, setToAmount] = useState(recurring?.toAmount?.toString() || '');
  const [frequencyType, setFrequencyType] = useState(recurring?.frequency?.type || 'monthly');
  const [frequencyDay, setFrequencyDay] = useState(recurring?.frequency?.day || 1);
  const [frequencyDayOfWeek, setFrequencyDayOfWeek] = useState(recurring?.frequency?.dayOfWeek || 1);
  const [frequencyInterval, setFrequencyInterval] = useState(recurring?.frequency?.interval || 30);
  const [weekendHandling, setWeekendHandling] = useState(recurring?.weekendHandling || 'as_is');
  const [startDate, setStartDate] = useState(recurring?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(recurring?.endDate || '');
  const [hasEndDate, setHasEndDate] = useState(!!recurring?.endDate);
  const [creationMode, setCreationMode] = useState(recurring?.creationMode || 'automatic');
  const [preferredBot, setPreferredBot] = useState(recurring?.preferredBot || 'telegram');
  const [isCreditCardRecurring, setIsCreditCardRecurring] = useState(recurring?.isCreditCardRecurring || false);
  const [description, setDescription] = useState(recurring?.description || '');

  // Derived values
  const selectedAccount = accounts?.find(a => a.id === accountId);
  const isCreditCard = selectedAccount?.esTarjetaCredito || selectedAccount?.is_credit_card;

  // Filter accounts/categories for combobox
  const accountOptions = (accounts || [])
    .filter(a => type === 'transfer' || !a.esTarjetaCredito || isCreditCardRecurring)
    .map(a => ({
      value: a.id,
      label: a.nombre || a.name,
      icon: a.icon || null,
    }));

  const categoryOptions = (categories || [])
    .filter(c => {
      if (type === 'income') return c.tipo === 'Ingreso' || c.type === 'income';
      if (type === 'expense') return c.tipo === 'Gasto' || c.type === 'expense';
      return true;
    })
    .map(c => ({
      value: c.id,
      label: c.nombre || c.name,
      icon: c.icon || null,
    }));

  // Build frequency object
  const buildFrequency = () => {
    const freq = { type: frequencyType };

    switch (frequencyType) {
      case 'weekly':
      case 'biweekly':
        freq.dayOfWeek = frequencyDayOfWeek;
        break;
      case 'monthly':
      case 'bimonthly':
      case 'quarterly':
      case 'biannual':
        freq.day = frequencyDay;
        break;
      case 'yearly':
        const date = new Date(startDate);
        freq.month = date.getMonth() + 1;
        freq.day = date.getDate();
        break;
      case 'custom_days':
        freq.interval = frequencyInterval;
        break;
    }

    return freq;
  };

  const handleSubmit = () => {
    if (!name.trim() || !amount || parseFloat(amount) <= 0) {
      return;
    }

    const data = {
      id: recurring?.id,
      name: name.trim(),
      description: description.trim() || null,
      amount: parseFloat(amount),
      currency,
      type,
      frequency: buildFrequency(),
      weekendHandling,
      startDate,
      endDate: hasEndDate ? endDate : null,
      creationMode,
      preferredBot: creationMode === 'bot_confirmation' ? preferredBot : null,
      isCreditCardRecurring: type === 'expense' && isCreditCard ? isCreditCardRecurring : false,
    };

    if (type === 'transfer') {
      data.fromAccountId = fromAccountId;
      data.toAccountId = toAccountId;
      data.toAmount = toAmount ? parseFloat(toAmount) : null;
    } else {
      data.accountId = accountId;
      data.categoryId = categoryId;
    }

    onSave(data);
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return name.trim() && amount && parseFloat(amount) > 0;
      case 2:
        if (type === 'transfer') {
          return fromAccountId && toAccountId;
        }
        return accountId;
      case 3:
        return frequencyType;
      case 4:
        return startDate;
      default:
        return true;
    }
  };

  const totalSteps = 5;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl animate-scale-in flex flex-col"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-purple-dim)' }}
            >
              <svg className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {isEdit ? 'Editar recurrente' : 'Nueva transacción recurrente'}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Paso {step} de {totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-[var(--bg-tertiary)]">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${(step / totalSteps) * 100}%`,
              backgroundColor: 'var(--accent-primary)',
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Step 1: Basic info */}
          {step === 1 && (
            <>
              {/* Type selector */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Tipo de transacción
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'expense', label: 'Gasto', color: 'var(--accent-red)' },
                    { value: 'income', label: 'Ingreso', color: 'var(--accent-green)' },
                    { value: 'transfer', label: 'Transferencia', color: 'var(--accent-blue)' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setType(option.value)}
                      className="px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        backgroundColor: type === option.value
                          ? `color-mix(in srgb, ${option.color} 15%, transparent)`
                          : 'var(--bg-tertiary)',
                        color: type === option.value ? option.color : 'var(--text-secondary)',
                        border: type === option.value ? `1px solid ${option.color}` : '1px solid transparent',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej: Netflix, Alquiler, Sueldo..."
                  className="w-full px-4 py-3 rounded-xl text-sm transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                />
              </div>

              {/* Amount and Currency */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Monto *
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 rounded-xl text-sm transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Moneda
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>

              {/* Description (optional) */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Descripción (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Notas adicionales..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-sm transition-colors resize-none"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                />
              </div>
            </>
          )}

          {/* Step 2: Account/Category */}
          {step === 2 && (
            <>
              {type === 'transfer' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Cuenta origen *
                    </label>
                    <Combobox
                      options={accountOptions}
                      value={fromAccountId}
                      onChange={setFromAccountId}
                      placeholder="Seleccionar cuenta..."
                      defaultOptionIcon="💳"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Cuenta destino *
                    </label>
                    <Combobox
                      options={accountOptions.filter(a => a.value !== fromAccountId)}
                      value={toAccountId}
                      onChange={setToAccountId}
                      placeholder="Seleccionar cuenta..."
                      defaultOptionIcon="💳"
                    />
                  </div>
                  {/* Different amount for transfer (if currencies differ) */}
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Monto destino (si difiere)
                    </label>
                    <input
                      type="number"
                      value={toAmount}
                      onChange={(e) => setToAmount(e.target.value)}
                      placeholder={amount || '0.00'}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 rounded-xl text-sm transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Cuenta *
                    </label>
                    <Combobox
                      options={accountOptions}
                      value={accountId}
                      onChange={setAccountId}
                      placeholder="Seleccionar cuenta..."
                      defaultOptionIcon="💳"
                    />
                  </div>

                  {/* Credit card recurring option */}
                  {type === 'expense' && isCreditCard && (
                    <div
                      className="flex items-center gap-3 p-3 rounded-xl"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      <button
                        onClick={() => setIsCreditCardRecurring(!isCreditCardRecurring)}
                        className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                        style={{
                          borderColor: isCreditCardRecurring ? 'var(--accent-primary)' : 'var(--border-subtle)',
                          backgroundColor: isCreditCardRecurring ? 'var(--accent-primary)' : 'transparent',
                        }}
                      >
                        {isCreditCardRecurring && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          Gasto de tarjeta recurrente
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Se replica automáticamente en cada resumen
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Categoría
                    </label>
                    <Combobox
                      options={categoryOptions}
                      value={categoryId}
                      onChange={setCategoryId}
                      placeholder="Seleccionar categoría..."
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 3: Frequency */}
          {step === 3 && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Frecuencia *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {FREQUENCY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFrequencyType(option.value)}
                      className="px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                      style={{
                        backgroundColor: frequencyType === option.value ? 'var(--accent-primary-dim)' : 'var(--bg-tertiary)',
                        color: frequencyType === option.value ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        border: frequencyType === option.value ? '1px solid var(--accent-primary)' : '1px solid transparent',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day of week (for weekly/biweekly) */}
              {(frequencyType === 'weekly' || frequencyType === 'biweekly') && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Día de la semana
                  </label>
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_OF_WEEK_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFrequencyDayOfWeek(option.value)}
                        className="px-2 py-2 rounded-lg text-xs font-medium transition-all"
                        style={{
                          backgroundColor: frequencyDayOfWeek === option.value ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                          color: frequencyDayOfWeek === option.value ? 'white' : 'var(--text-secondary)',
                        }}
                      >
                        {option.label.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Day of month (for monthly+) */}
              {['monthly', 'bimonthly', 'quarterly', 'biannual'].includes(frequencyType) && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Día del mes
                  </label>
                  <input
                    type="number"
                    value={frequencyDay}
                    onChange={(e) => setFrequencyDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                    min="1"
                    max="31"
                    className="w-full px-4 py-3 rounded-xl text-sm transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Si el día no existe, se usa el último del mes
                  </p>
                </div>
              )}

              {/* Custom interval */}
              {frequencyType === 'custom_days' && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Cada cuántos días
                  </label>
                  <input
                    type="number"
                    value={frequencyInterval}
                    onChange={(e) => setFrequencyInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="w-full px-4 py-3 rounded-xl text-sm transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  />
                </div>
              )}

              {/* Weekend handling */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Si cae en fin de semana o feriado
                </label>
                <div className="space-y-2">
                  {WEEKEND_HANDLING_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setWeekendHandling(option.value)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                      style={{
                        backgroundColor: weekendHandling === option.value ? 'var(--accent-primary-dim)' : 'var(--bg-tertiary)',
                        border: weekendHandling === option.value ? '1px solid var(--accent-primary)' : '1px solid transparent',
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor: weekendHandling === option.value ? 'var(--accent-primary)' : 'var(--border-subtle)',
                        }}
                      >
                        {weekendHandling === option.value && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: 'var(--accent-primary)' }}
                          />
                        )}
                      </div>
                      <span
                        className="text-sm"
                        style={{ color: weekendHandling === option.value ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                      >
                        {option.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 4: Dates */}
          {step === 4 && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Fecha de inicio *
                </label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Seleccionar fecha..."
                />
              </div>

              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <button
                  onClick={() => setHasEndDate(!hasEndDate)}
                  className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                  style={{
                    borderColor: hasEndDate ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    backgroundColor: hasEndDate ? 'var(--accent-primary)' : 'transparent',
                  }}
                >
                  {hasEndDate && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  Tiene fecha de fin
                </span>
              </div>

              {hasEndDate && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Fecha de fin
                  </label>
                  <DatePicker
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="Seleccionar fecha..."
                    minDate={startDate}
                  />
                </div>
              )}
            </>
          )}

          {/* Step 5: Creation mode */}
          {step === 5 && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Modo de creación
                </label>
                <div className="space-y-2">
                  {CREATION_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setCreationMode(option.value)}
                      className="w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left transition-all"
                      style={{
                        backgroundColor: creationMode === option.value ? 'var(--accent-primary-dim)' : 'var(--bg-tertiary)',
                        border: creationMode === option.value ? '1px solid var(--accent-primary)' : '1px solid transparent',
                      }}
                    >
                      <div
                        className="w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5"
                        style={{
                          borderColor: creationMode === option.value ? 'var(--accent-primary)' : 'var(--border-subtle)',
                        }}
                      >
                        {creationMode === option.value && (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: 'var(--accent-primary)' }}
                          />
                        )}
                      </div>
                      <div>
                        <span
                          className="text-sm font-medium block"
                          style={{ color: creationMode === option.value ? 'var(--accent-primary)' : 'var(--text-primary)' }}
                        >
                          {option.label}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {option.description}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bot preference */}
              {creationMode === 'bot_confirmation' && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Bot preferido
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPreferredBot('telegram')}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                      style={{
                        backgroundColor: preferredBot === 'telegram' ? 'var(--accent-blue-dim)' : 'var(--bg-tertiary)',
                        color: preferredBot === 'telegram' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                        border: preferredBot === 'telegram' ? '1px solid var(--accent-blue)' : '1px solid transparent',
                      }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.142.121.099.154.232.17.325.015.094.034.31.019.478z"/>
                      </svg>
                      Telegram
                    </button>
                    <button
                      onClick={() => setPreferredBot('whatsapp')}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                      style={{
                        backgroundColor: preferredBot === 'whatsapp' ? 'var(--accent-green-dim)' : 'var(--bg-tertiary)',
                        color: preferredBot === 'whatsapp' ? 'var(--accent-green)' : 'var(--text-secondary)',
                        border: preferredBot === 'whatsapp' ? '1px solid var(--accent-green)' : '1px solid transparent',
                      }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      WhatsApp
                    </button>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div
                className="p-4 rounded-xl space-y-2"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Resumen
                </h4>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Nombre:</span>
                  <span style={{ color: 'var(--text-primary)' }}>{name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Monto:</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(parseFloat(amount) || 0, currency === 'USD' ? 'Dólar' : 'Peso')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Frecuencia:</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {FREQUENCY_OPTIONS.find(f => f.value === frequencyType)?.label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-muted)' }}>Inicio:</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {new Date(startDate + 'T12:00:00').toLocaleDateString('es-AR')}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between p-4 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                }}
              >
                Anterior
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEdit && step === 1 && (
              <button
                onClick={() => onDelete(recurring)}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'var(--accent-red-dim)',
                  color: 'var(--accent-red)',
                }}
              >
                Eliminar
              </button>
            )}

            {step < totalSteps ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                }}
              >
                Siguiente
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !canProceed()}
                className="px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'white',
                }}
              >
                {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear recurrente'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecurringModal;
