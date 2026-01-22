import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import DatePicker from './DatePicker';
import LoadingSpinner from './LoadingSpinner';
import { formatCurrency } from '../utils/format';

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

  const isTransfer = movement?.tipo === 'transferencia';

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
    }
  }, [movement, isTransfer]);

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
      });
    } else {
      onSave?.({
        ...movement,
        ...formData,
        monto: parseFloat(formData.monto),
      });
    }
  };

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!movement?.rowIndex) {
      alert('No se puede eliminar: falta información del movimiento (rowIndex)');
      return;
    }
    if (!onDelete) {
      alert('No se puede eliminar: función de eliminación no disponible');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl p-5 max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {getTitle()}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-opacity-80 transition-colors"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <svg className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
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
                  {currentCategories?.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
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
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
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
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <div
              className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
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
