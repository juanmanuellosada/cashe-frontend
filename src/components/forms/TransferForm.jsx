import { useState, useEffect, useMemo } from 'react';
import DatePicker from '../DatePicker';
import Combobox from '../Combobox';
import { AccountIcon, NoteIcon } from './FormIcons';
import AttachmentInput from '../AttachmentInput';
import { useRecentUsage } from '../../hooks/useRecentUsage';
import { sortByRecency } from '../../utils/sortByRecency';

function TransferForm({ accounts, onSubmit, loading, prefillData, sharedAmount, onAmountChange }) {
  const today = new Date().toISOString().split('T')[0];

  // Ordenar cuentas por uso reciente
  const { recentAccountIds } = useRecentUsage();

  const sortedAccounts = useMemo(() => {
    return sortByRecency(accounts, recentAccountIds, 'id');
  }, [accounts, recentAccountIds]);

  const [formData, setFormData] = useState({
    fecha: prefillData?.fecha || today,
    cuentaSaliente: prefillData?.cuentaSaliente || '',
    cuentaEntrante: prefillData?.cuentaEntrante || '',
    montoSaliente: prefillData?.montoSaliente?.toString() || sharedAmount || '',
    montoEntrante: prefillData?.montoEntrante?.toString() || sharedAmount || '',
    nota: prefillData?.nota || '',
  });

  const [errors, setErrors] = useState({});

  // Si hay prefillData con montos diferentes, desactivar sameAmount
  const initialSameAmount = prefillData
    ? prefillData.montoSaliente === prefillData.montoEntrante
    : true;
  const [sameAmount, setSameAmount] = useState(initialSameAmount);
  const [showSuccess, setShowSuccess] = useState(false);
  const [attachment, setAttachment] = useState(null);

  // Sincronizar montos cuando sameAmount está activo
  useEffect(() => {
    if (sameAmount) {
      setFormData((prev) => ({
        ...prev,
        montoEntrante: prev.montoSaliente,
      }));
    }
  }, [sameAmount, formData.montoSaliente]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
    // Clear same-account error when either account changes
    if ((name === 'cuentaSaliente' || name === 'cuentaEntrante') && errors.cuentaEntrante) {
      setErrors(prev => ({ ...prev, cuentaEntrante: null }));
    }

    // Sincronizar monto saliente con el estado compartido
    if (name === 'montoSaliente' && onAmountChange) {
      onAmountChange(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.cuentaSaliente) newErrors.cuentaSaliente = 'Selecciona una cuenta de origen';
    if (!formData.cuentaEntrante) newErrors.cuentaEntrante = 'Selecciona una cuenta de destino';
    else if (formData.cuentaSaliente && formData.cuentaSaliente === formData.cuentaEntrante) {
      newErrors.cuentaEntrante = 'Las cuentas deben ser diferentes';
    }
    if (!formData.montoSaliente) newErrors.montoSaliente = 'Ingresa un monto';
    else if (parseFloat(formData.montoSaliente) <= 0) newErrors.montoSaliente = 'El monto debe ser mayor a cero';
    if (!sameAmount) {
      if (!formData.montoEntrante) newErrors.montoEntrante = 'Ingresa un monto';
      else if (parseFloat(formData.montoEntrante) <= 0) newErrors.montoEntrante = 'El monto debe ser mayor a cero';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const parsedSaliente = parseFloat(formData.montoSaliente);
    const parsedEntrante = parseFloat(formData.montoEntrante);

    const result = await onSubmit({
      type: 'transfer',
      data: {
        ...formData,
        montoSaliente: parseFloat(formData.montoSaliente),
        montoEntrante: parseFloat(formData.montoEntrante),
        attachment,
      },
    });

    if (result !== false) {
      setShowSuccess(true);
      setAttachment(null); // Limpiar adjunto despues de guardar
      setTimeout(() => setShowSuccess(false), 1500);
    }
  };

  const isValid =
    formData.cuentaSaliente &&
    formData.cuentaEntrante &&
    formData.montoSaliente &&
    formData.montoEntrante &&
    formData.cuentaSaliente !== formData.cuentaEntrante;

  const accountIcon = AccountIcon;
  const noteIcon = NoteIcon;

  const availableDestinationAccounts = sortedAccounts
    .filter((acc) => acc.nombre !== formData.cuentaSaliente)
    .map(a => ({ value: a.nombre, label: a.nombre, icon: a.icon || null }));

  return (
    <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
      {/* Fecha */}
      <div>
        <label
          className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Fecha
        </label>
        <DatePicker
          name="fecha"
          value={formData.fecha}
          onChange={handleChange}
        />
      </div>

      {/* Transfer visualization */}
      <div
        className="p-3 sm:p-4 rounded-xl sm:rounded-2xl"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        {/* Cuenta Saliente */}
        <div className="mb-2 sm:mb-3">
          <label
            className="flex items-center gap-2 text-xs font-medium mb-1.5 sm:mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-4 h-4" style={{ color: 'var(--accent-red)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Cuenta de origen
          </label>
          <Combobox
            name="cuentaSaliente"
            value={formData.cuentaSaliente}
            onChange={handleChange}
            options={sortedAccounts.map(a => ({ value: a.nombre, label: a.nombre, icon: a.icon || null }))}
            placeholder="Seleccionar cuenta"
            icon={accountIcon}
            emptyMessage="No hay cuentas"
            defaultOptionIcon="💳"
          />
          {errors.cuentaSaliente && (
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--accent-red)' }}>{errors.cuentaSaliente}</p>
          )}
        </div>

        {/* Arrow */}
        <div className="flex justify-center my-1.5 sm:my-2">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--accent-blue-dim)' }}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: 'var(--accent-blue)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>

        {/* Cuenta Entrante */}
        <div>
          <label
            className="flex items-center gap-2 text-xs font-medium mb-1.5 sm:mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-4 h-4" style={{ color: 'var(--accent-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Cuenta de destino
          </label>
          <Combobox
            name="cuentaEntrante"
            value={formData.cuentaEntrante}
            onChange={handleChange}
            options={availableDestinationAccounts}
            placeholder="Seleccionar cuenta"
            icon={accountIcon}
            emptyMessage={formData.cuentaSaliente ? "No hay otras cuentas" : "Selecciona cuenta de origen primero"}
            defaultOptionIcon="💳"
          />
          {errors.cuentaEntrante && (
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--accent-red)' }}>{errors.cuentaEntrante}</p>
          )}
        </div>
      </div>

      {/* Checkbox para mismo monto */}
      <button
        type="button"
        onClick={() => setSameAmount(!sameAmount)}
        className="flex items-center gap-3 w-full p-3 min-h-[44px] rounded-xl transition-colors"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center transition-all duration-200 flex-shrink-0 ${!sameAmount ? 'border-2' : ''}`}
          style={{
            backgroundColor: sameAmount ? 'var(--accent-primary)' : 'transparent',
            borderColor: 'var(--text-secondary)'
          }}
        >
          {sameAmount && (
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Mismo monto</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Igual en origen y destino</p>
        </div>
      </button>

      {/* Montos */}
      <div className={sameAmount ? '' : 'grid grid-cols-2 gap-3 sm:gap-4'}>
        <div>
          <label
            className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {sameAmount ? 'Monto' : 'Monto saliente'}
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
                style={{ color: 'var(--accent-blue)' }}
              >
                $
              </span>
              <input
                type="number"
                name="montoSaliente"
                value={formData.montoSaliente}
                onChange={handleChange}
                placeholder="0"
                min="0"
                step="0.01"
                className="flex-1 text-2xl sm:text-3xl font-bold bg-transparent outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          {errors.montoSaliente && (
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--accent-red)' }}>{errors.montoSaliente}</p>
          )}
        </div>

        {!sameAmount && (
          <div>
            <label
              className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Monto entrante
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
                  style={{ color: 'var(--accent-green)' }}
                >
                  $
                </span>
                <input
                  type="number"
                  name="montoEntrante"
                  value={formData.montoEntrante}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="flex-1 text-2xl sm:text-3xl font-bold bg-transparent outline-none"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            {errors.montoEntrante && (
              <p className="text-xs mt-1 font-medium" style={{ color: 'var(--accent-red)' }}>{errors.montoEntrante}</p>
            )}
          </div>
        )}
      </div>

      {/* Nota */}
      <div>
        <label
          htmlFor="transfer-nota"
          className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {noteIcon}
          Nota (opcional)
        </label>
        <textarea
          id="transfer-nota"
          name="nota"
          value={formData.nota}
          onChange={handleChange}
          placeholder="Agregar una nota..."
          maxLength={500}
          rows={1}
          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl resize-none transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-primary)] text-sm sm:text-base"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Adjunto */}
      <AttachmentInput
        value={attachment}
        onChange={setAttachment}
        disabled={loading}
      />

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isValid || loading || showSuccess}
        className="w-full py-3 sm:py-4 rounded-xl font-semibold text-white text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
        style={{
          backgroundColor: showSuccess ? 'var(--accent-green)' : 'var(--accent-blue)',
        }}
      >
        {showSuccess ? (
          <>
            <svg className="w-6 h-6 animate-check-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
            Guardado
          </>
        ) : loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Registrar Transferencia
          </>
        )}
      </button>
    </form>
  );
}

export default TransferForm;
