import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DatePicker from '../DatePicker';
import Combobox from '../Combobox';
import CreateCategoryModal from '../CreateCategoryModal';
import { formatCurrency } from '../../utils/format';

const INSTALLMENT_OPTIONS = [1, 3, 6, 12, 18, 24];

// Calcula la fecha de la primera cuota basada en la fecha de compra y día de cierre
function calcularFechaPrimeraCuota(fechaCompra, diaCierre) {
  if (!fechaCompra || !diaCierre) return null;

  const fecha = new Date(fechaCompra);
  const diaCompra = fecha.getDate();

  // Si compra antes o en el día de cierre → primera cuota mes siguiente
  // Si compra después del cierre → primera cuota en 2 meses
  if (diaCompra <= diaCierre) {
    fecha.setMonth(fecha.getMonth() + 1);
  } else {
    fecha.setMonth(fecha.getMonth() + 2);
  }

  // Ajustar el día al día de cierre (manejando meses con menos días)
  const lastDayOfMonth = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
  fecha.setDate(Math.min(diaCierre, lastDayOfMonth));

  return fecha;
}

function ExpenseForm({ accounts, categories, onSubmit, loading, prefillData, onCategoryCreated }) {
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    fecha: prefillData?.fecha || today,
    monto: prefillData?.monto?.toString() || '',
    cuenta: prefillData?.cuenta || '',
    categoria: prefillData?.categoria || '',
    nota: prefillData?.nota || '',
  });

  const [cantidadCuotas, setCantidadCuotas] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [monedaGasto, setMonedaGasto] = useState('ARS'); // Moneda para gastos en tarjeta de crédito
  const [showCreateCategory, setShowCreateCategory] = useState(false);

  // Encontrar la cuenta seleccionada y verificar si es tarjeta de crédito
  const selectedAccount = useMemo(() => {
    return accounts.find(a => a.nombre === formData.cuenta);
  }, [accounts, formData.cuenta]);

  const esTarjetaCredito = selectedAccount?.esTarjetaCredito || false;
  const diaCierre = selectedAccount?.diaCierre || null;

  // Calcular monto por cuota
  const montoPorCuota = useMemo(() => {
    if (!formData.monto || cantidadCuotas < 1) return 0;
    return parseFloat(formData.monto) / cantidadCuotas;
  }, [formData.monto, cantidadCuotas]);

  // Calcular fecha de primera cuota
  const fechaPrimeraCuota = useMemo(() => {
    if (!esTarjetaCredito || !diaCierre || cantidadCuotas <= 1) return null;
    return calcularFechaPrimeraCuota(formData.fecha, diaCierre);
  }, [formData.fecha, diaCierre, esTarjetaCredito, cantidadCuotas]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Reset cuotas y moneda si cambia la cuenta
    if (name === 'cuenta') {
      const newAccount = accounts.find(a => a.nombre === value);
      if (!newAccount?.esTarjetaCredito) {
        setCantidadCuotas(1);
      }
      setMonedaGasto('ARS'); // Reset a pesos al cambiar de cuenta
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.monto || !formData.cuenta || !formData.categoria) {
      return;
    }

    // Determinar si usar cuotas o gasto normal
    const usarCuotas = esTarjetaCredito && cantidadCuotas > 1;

    const result = await onSubmit({
      type: usarCuotas ? 'expense_installments' : 'expense',
      data: usarCuotas ? {
        fechaCompra: formData.fecha,
        montoTotal: parseFloat(formData.monto),
        cuenta: formData.cuenta,
        categoria: formData.categoria,
        nota: formData.nota,
        cantidadCuotas: cantidadCuotas,
        moneda: esTarjetaCredito ? monedaGasto : undefined, // Solo para tarjetas de crédito
      } : {
        ...formData,
        monto: parseFloat(formData.monto),
        moneda: esTarjetaCredito ? monedaGasto : undefined, // Solo para tarjetas de crédito
      },
    });

    if (result !== false) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    }
  };

  const isValid = formData.monto && formData.cuenta && formData.categoria;

  // Icon for currency
  const currencyIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  // Icon for accounts
  const accountIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );

  // Icon for category
  const categoryIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );

  // Icon for note
  const noteIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );

  // Icon for installments
  const installmentsIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );

  // Texto dinámico del botón
  const getButtonText = () => {
    if (showSuccess) return 'Guardado';
    if (loading) return 'Guardando...';
    if (esTarjetaCredito && cantidadCuotas > 1) {
      return `Registrar Gasto en ${cantidadCuotas} cuotas`;
    }
    return 'Registrar Gasto';
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Fecha */}
        <div>
          <label
            className="flex items-center gap-2 text-sm font-medium mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Monto - Highlighted */}
      <div>
        <label
          className="flex items-center gap-2 text-sm font-medium mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {currencyIcon}
          {esTarjetaCredito && cantidadCuotas > 1 ? 'Monto Total' : 'Monto'}
        </label>
        <div
          className="relative rounded-2xl p-4 transition-all duration-200"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '2px solid transparent',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-3xl font-bold"
              style={{ color: 'var(--accent-red)' }}
            >
              {monedaGasto === 'USD' ? 'US$' : '$'}
            </span>
            <input
              type="number"
              name="monto"
              value={formData.monto}
              onChange={handleChange}
              placeholder="0"
              min="0"
              step="0.01"
              className="flex-1 text-3xl font-bold bg-transparent outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
          
          {/* Selector de moneda para tarjetas de crédito */}
          {esTarjetaCredito && (
            <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setMonedaGasto('ARS')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  monedaGasto === 'ARS' ? 'ring-2' : 'opacity-60'
                }`}
                style={{
                  backgroundColor: monedaGasto === 'ARS' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary)',
                  color: monedaGasto === 'ARS' ? 'var(--accent-red)' : 'var(--text-secondary)',
                  '--tw-ring-color': 'var(--accent-red)',
                }}
              >
                $ Pesos
              </button>
              <button
                type="button"
                onClick={() => setMonedaGasto('USD')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  monedaGasto === 'USD' ? 'ring-2' : 'opacity-60'
                }`}
                style={{
                  backgroundColor: monedaGasto === 'USD' ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-secondary)',
                  color: monedaGasto === 'USD' ? 'var(--accent-green)' : 'var(--text-secondary)',
                  '--tw-ring-color': 'var(--accent-green)',
                }}
              >
                US$ Dólares
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cuenta */}
      <div>
        <label
          className="flex items-center gap-2 text-sm font-medium mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {accountIcon}
          Cuenta
        </label>
        <Combobox
          name="cuenta"
          value={formData.cuenta}
          onChange={handleChange}
          options={accounts.map(a => ({
            value: a.nombre,
            label: a.nombre,
            icon: a.icon || null,
            badge: a.esTarjetaCredito ? 'TC' : null
          }))}
          defaultOptionIcon="💳"
          placeholder="Seleccionar cuenta"
          icon={accountIcon}
          emptyMessage="No hay cuentas"
        />
      </div>

      {/* Selector de Cuotas - Solo visible si es tarjeta de crédito */}
      {esTarjetaCredito && (
        <div
          className="rounded-2xl p-4 space-y-4 animate-fade-in"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--accent-purple)',
          }}
        >
          <div className="flex items-center gap-2">
            {installmentsIcon}
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              ¿En cuantas cuotas?
            </span>
          </div>

          {/* Input de cuotas con opciones rápidas */}
          <div className="space-y-3">
            {/* Input numérico */}
            <div className="flex items-center gap-3">
              <div
                className="flex-1 relative rounded-xl overflow-hidden"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={cantidadCuotas}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    setCantidadCuotas(Math.max(1, Math.min(48, value)));
                  }}
                  className="w-full px-4 py-3 text-center text-xl font-bold bg-transparent outline-none"
                  style={{ color: 'var(--accent-purple)' }}
                />
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {cantidadCuotas === 1 ? 'cuota (contado)' : 'cuotas'}
              </span>
            </div>

            {/* Opciones rápidas */}
            <div className="flex flex-wrap gap-2">
              {INSTALLMENT_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setCantidadCuotas(option)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    cantidadCuotas === option
                      ? 'ring-2 ring-[var(--accent-purple)]'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: cantidadCuotas === option
                      ? 'rgba(20, 184, 166, 0.2)'
                      : 'var(--bg-secondary)',
                    color: cantidadCuotas === option
                      ? 'var(--accent-purple)'
                      : 'var(--text-secondary)',
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Info de cuotas */}
          {cantidadCuotas > 1 && formData.monto && (
            <div
              className="p-3 rounded-xl space-y-2"
              style={{ backgroundColor: 'var(--bg-secondary)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Monto por cuota:
                </span>
                <span className="font-bold" style={{ color: 'var(--accent-purple)' }}>
                  {formatCurrency(montoPorCuota, monedaGasto)}
                </span>
              </div>
              {fechaPrimeraCuota && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Primera cuota:
                  </span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {format(fechaPrimeraCuota, "d 'de' MMMM yyyy", { locale: es })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Ultima cuota:
                </span>
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  {fechaPrimeraCuota && format(
                    new Date(fechaPrimeraCuota.getFullYear(), fechaPrimeraCuota.getMonth() + cantidadCuotas - 1, fechaPrimeraCuota.getDate()),
                    "MMMM yyyy",
                    { locale: es }
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Categoría */}
      <div>
        <label
          className="flex items-center gap-2 text-sm font-medium mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {categoryIcon}
          Categoria
        </label>
        <Combobox
          name="categoria"
          value={formData.categoria}
          onChange={handleChange}
          options={categories}
          placeholder="Seleccionar categoria"
          icon={categoryIcon}
          emptyMessage="No hay categorias"
          onCreateNew={() => setShowCreateCategory(true)}
          createNewLabel="Crear categoría"
          defaultOptionIcon="🏷️"
        />
      </div>

      {/* Nota */}
      <div>
        <label
          className="flex items-center gap-2 text-sm font-medium mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {noteIcon}
          Nota (opcional)
        </label>
        <div className="relative">
          <div
            className="absolute left-4 top-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            {noteIcon}
          </div>
          <textarea
            name="nota"
            value={formData.nota}
            onChange={handleChange}
            placeholder="Agregar una nota..."
            rows={2}
            className="w-full pl-12 pr-4 py-3 rounded-xl resize-none transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-primary)]"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isValid || loading || showSuccess}
        className="w-full py-4 rounded-xl font-semibold text-white transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
        style={{
          backgroundColor: showSuccess
            ? 'var(--accent-green)'
            : (esTarjetaCredito && cantidadCuotas > 1)
              ? 'var(--accent-purple)'
              : 'var(--accent-red)',
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
            {esTarjetaCredito && cantidadCuotas > 1 ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
            {getButtonText()}
          </>
        )}
      </button>
    </form>

      {/* Create Category Modal - FUERA del form */}
      <CreateCategoryModal
        isOpen={showCreateCategory}
        onClose={() => setShowCreateCategory(false)}
        type="gasto"
        onCategoryCreated={(newCat) => {
          setFormData(prev => ({ ...prev, categoria: newCat }));
          if (onCategoryCreated) onCategoryCreated();
        }}
      />
    </>
  );
}

export default ExpenseForm;
