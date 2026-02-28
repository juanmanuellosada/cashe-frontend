import { useState, useMemo, useEffect } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import DatePicker from '../DatePicker';
import Combobox from '../Combobox';
import CreateCategoryModal from '../CreateCategoryModal';
import AttachmentInput from '../AttachmentInput';
import BudgetGoalImpact from '../common/BudgetGoalImpact';
import RuleSuggestionBanner from '../rules/RuleSuggestionBanner';
import { formatCurrency } from '../../utils/format';
import { useRecentUsage } from '../../hooks/useRecentUsage';
import { sortByRecency } from '../../utils/sortByRecency';
import { useDebounce } from '../../hooks/useDebounce';
import { evaluateAutoRules, getStatementPayments } from '../../services/supabaseApi';

const INSTALLMENT_OPTIONS = [1, 3, 6, 12, 18, 24];

// Genera opciones de períodos de resumen para tarjetas de crédito
function generarPeriodosResumen(diaCierre) {
  const periodos = [];
  const today = new Date();
  const currentDay = today.getDate();
  const cierre = diaCierre || 1;

  // Determinar el período actual
  let baseDate = new Date(today.getFullYear(), today.getMonth(), 1);

  // Si estamos después del día de cierre, el período actual es el siguiente mes
  if (currentDay >= cierre) {
    baseDate = addMonths(baseDate, 1);
  }

  // Generar 6 períodos: 1 anterior, actual, y 4 futuros
  for (let i = -1; i <= 4; i++) {
    const periodoDate = addMonths(baseDate, i);
    const periodoId = format(periodoDate, 'yyyy-MM');
    const periodoLabel = format(periodoDate, "MMMM yyyy", { locale: es });

    periodos.push({
      value: periodoId,
      label: periodoLabel.charAt(0).toUpperCase() + periodoLabel.slice(1),
      isCurrent: i === 0,
    });
  }

  return periodos;
}

// Calcula una fecha que caiga en el período seleccionado
function calcularFechaDePeriodo(periodoId, diaCierre) {
  if (!periodoId) return new Date().toISOString().split('T')[0];

  const [year, month] = periodoId.split('-').map(Number);
  const cierre = diaCierre || 1;

  // La fecha debe ser ANTES del día de cierre del mes del período
  // Por ejemplo: período Marzo 2025, cierre día 15 → fecha: 14 de marzo
  const dia = Math.max(1, cierre - 1);
  const fecha = new Date(year, month - 1, dia);

  return fecha.toISOString().split('T')[0];
}

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

function ExpenseForm({ accounts, categories, categoriesWithId, budgets, goals, onSubmit, loading, prefillData, onCategoryCreated, sharedAmount, onAmountChange }) {
  const today = new Date().toISOString().split('T')[0];

  // Ordenar cuentas y categorías por uso reciente
  const { recentAccountIds, recentCategoryIds } = useRecentUsage();

  const sortedAccounts = useMemo(() => {
    return sortByRecency(accounts, recentAccountIds, 'id');
  }, [accounts, recentAccountIds]);

  const sortedCategories = useMemo(() => {
    return sortByRecency(categories, recentCategoryIds, 'id');
  }, [categories, recentCategoryIds]);

  const [formData, setFormData] = useState({
    fecha: prefillData?.fecha || today,
    monto: prefillData?.monto?.toString() || sharedAmount || '',
    cuenta: prefillData?.cuenta || '',
    categoria: prefillData?.categoria || '',
    nota: prefillData?.nota || '',
  });

  const [cantidadCuotas, setCantidadCuotas] = useState(1);
  const [showSuccess, setShowSuccess] = useState(false);
  const [monedaGasto, setMonedaGasto] = useState('ARS'); // Moneda para gastos en tarjeta de crédito
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [attachment2, setAttachment2] = useState(null);
  const [periodoResumen, setPeriodoResumen] = useState(''); // Período para tarjetas de crédito
  const [cardPayments, setCardPayments] = useState({}); // Pagos de la tarjeta seleccionada
  const [paymentsLoaded, setPaymentsLoaded] = useState(false); // Flag para esperar carga de pagos
  const [ruleSuggestion, setRuleSuggestion] = useState(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  // Debounce para evaluación de reglas
  const debouncedNota = useDebounce(formData.nota, 400);
  const debouncedMonto = useDebounce(formData.monto, 400);

  // Encontrar la cuenta seleccionada y verificar si es tarjeta de crédito
  const selectedAccount = useMemo(() => {
    return accounts.find(a => a.nombre === formData.cuenta);
  }, [accounts, formData.cuenta]);

  const esTarjetaCredito = selectedAccount?.esTarjetaCredito || false;
  const diaCierre = selectedAccount?.diaCierre || 1;

  // Generar opciones de períodos para tarjetas de crédito
  const periodosResumen = useMemo(() => {
    if (!esTarjetaCredito) return [];
    return generarPeriodosResumen(diaCierre);
  }, [esTarjetaCredito, diaCierre]);

  // Cargar pagos de la tarjeta seleccionada
  useEffect(() => {
    if (esTarjetaCredito && selectedAccount?.id) {
      setPaymentsLoaded(false);
      setPeriodoResumen(''); // Reset para que se re-calcule con datos nuevos
      getStatementPayments(selectedAccount.id)
        .then(data => {
          setCardPayments(data);
          setPaymentsLoaded(true);
        })
        .catch(err => {
          console.error('Error loading card payments:', err);
          setPaymentsLoaded(true); // Continuar aunque falle
        });
    } else {
      setCardPayments({});
      setPaymentsLoaded(false);
    }
  }, [esTarjetaCredito, selectedAccount?.id]);

  // Calcular el primer período no pagado (desde el actual en adelante, no mira hacia atrás)
  const primerPeriodoNoPagado = useMemo(() => {
    if (!esTarjetaCredito || periodosResumen.length === 0) return null;
    // Empezar desde el período calendario actual (isCurrent), ignorar anteriores
    const currentIndex = periodosResumen.findIndex(p => p.isCurrent);
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    const periodosDesdeActual = periodosResumen.slice(startIndex);
    return periodosDesdeActual.find(p => {
      const hasPesosPayment = !!cardPayments[`${p.value}_ARS`];
      const hasDolaresPayment = !!cardPayments[`${p.value}_USD`];
      return !hasPesosPayment && !hasDolaresPayment;
    })?.value || null;
  }, [esTarjetaCredito, periodosResumen, cardPayments]);

  // Leer fecha de cierre directamente de la cuenta
  const infoCierreTarjeta = useMemo(() => {
    if (!esTarjetaCredito || !selectedAccount) return null;

    // Usar la fecha completa guardada en la cuenta
    if (selectedAccount.fechaCierre) {
      const [y, m, d] = selectedAccount.fechaCierre.split('-').map(Number);
      const fechaCierre = new Date(y, m - 1, d);
      return {
        fechaCierre: format(fechaCierre, "d 'de' MMMM yyyy", { locale: es }),
      };
    }

    // Fallback: calcular desde el día de cierre si no hay fecha completa
    const today = new Date();
    const currentDay = today.getDate();
    let year = today.getFullYear();
    let month = today.getMonth();
    if (currentDay > diaCierre) {
      month += 1;
      if (month > 11) { month = 0; year += 1; }
    }
    const lastDay = new Date(year, month + 1, 0).getDate();
    const fechaCierre = new Date(year, month, Math.min(diaCierre, lastDay));

    return {
      fechaCierre: format(fechaCierre, "d 'de' MMMM yyyy", { locale: es }),
    };
  }, [esTarjetaCredito, selectedAccount, diaCierre]);

  // Establecer período por defecto: primer período no pagado (espera a que carguen pagos)
  useEffect(() => {
    if (esTarjetaCredito && periodosResumen.length > 0 && !periodoResumen && paymentsLoaded) {
      if (primerPeriodoNoPagado) {
        setPeriodoResumen(primerPeriodoNoPagado);
      } else {
        // Fallback: período calendario actual
        const periodoActual = periodosResumen.find(p => p.isCurrent);
        if (periodoActual) {
          setPeriodoResumen(periodoActual.value);
        }
      }
    }
  }, [esTarjetaCredito, periodosResumen, periodoResumen, primerPeriodoNoPagado, paymentsLoaded]);

  // Actualizar la fecha automáticamente cuando cambia el período
  useEffect(() => {
    if (esTarjetaCredito && periodoResumen) {
      const fechaCalculada = calcularFechaDePeriodo(periodoResumen, diaCierre);
      setFormData(prev => ({ ...prev, fecha: fechaCalculada }));
    }
  }, [periodoResumen, diaCierre, esTarjetaCredito]);

  // Evaluar reglas automáticas cuando cambia nota o monto (debounced)
  useEffect(() => {
    const checkRules = async () => {
      // No evaluar si ya seleccionó categoría o si descartó sugerencia
      if (formData.categoria || suggestionDismissed) {
        setRuleSuggestion(null);
        return;
      }

      // No evaluar si no hay datos suficientes
      if (!debouncedNota && !debouncedMonto) {
        setRuleSuggestion(null);
        return;
      }

      try {
        const suggestion = await evaluateAutoRules({
          type: 'expense',
          note: debouncedNota,
          amount: parseFloat(debouncedMonto) || 0,
          accountId: selectedAccount?.id || '',
        });
        setRuleSuggestion(suggestion);
      } catch (err) {
        console.error('Error evaluating rules:', err);
      }
    };

    checkRules();
  }, [debouncedNota, debouncedMonto, selectedAccount?.id, formData.categoria, suggestionDismissed]);

  // Reset dismissed state cuando se limpia el formulario
  useEffect(() => {
    if (!formData.nota && !formData.monto) {
      setSuggestionDismissed(false);
    }
  }, [formData.nota, formData.monto]);

  // Encontrar el ID de la categoría seleccionada
  const selectedCategoryId = useMemo(() => {
    if (!formData.categoria || !categoriesWithId) return null;
    const cat = categoriesWithId.find(c =>
      c.nombre === formData.categoria || c.name === formData.categoria
    );
    return cat?.id || null;
  }, [formData.categoria, categoriesWithId]);

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

    // Sync amount with parent for tab persistence
    if (name === 'monto' && onAmountChange) {
      onAmountChange(value);
    }

    // Reset cuotas y moneda si cambia la cuenta
    if (name === 'cuenta') {
      const newAccount = accounts.find(a => a.nombre === value);
      if (!newAccount?.esTarjetaCredito) {
        setCantidadCuotas(1);
      }
      setMonedaGasto('ARS'); // Reset a pesos al cambiar de cuenta
    }
  };

  // Handler para aplicar sugerencia de regla
  const handleApplyRuleSuggestion = () => {
    if (!ruleSuggestion?.actions) return;

    const updates = {};

    if (ruleSuggestion.actions.category_id) {
      const cat = categoriesWithId?.find(c => c.id === ruleSuggestion.actions.category_id);
      if (cat) {
        updates.categoria = cat.nombre || cat.name;
      }
    }

    if (ruleSuggestion.actions.account_id) {
      const acc = accounts.find(a => a.id === ruleSuggestion.actions.account_id);
      if (acc) {
        updates.cuenta = acc.nombre;
      }
    }

    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }

    setRuleSuggestion(null);
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
        fechaInicio: formData.fecha,
        montoTotal: parseFloat(formData.monto),
        cuenta: formData.cuenta,
        categoria: formData.categoria,
        descripcion: formData.nota || `Compra en ${cantidadCuotas} cuotas`,
        cuotas: cantidadCuotas,
        moneda: esTarjetaCredito ? monedaGasto : undefined, // Solo para tarjetas de credito
      } : {
        ...formData,
        monto: parseFloat(formData.monto),
        moneda: esTarjetaCredito ? monedaGasto : undefined, // Solo para tarjetas de credito
        attachment,
        attachment2,
      },
    });

    if (result !== false) {
      setShowSuccess(true);
      setAttachment(null);
      setAttachment2(null);
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
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
        {/* Fecha o Período de Resumen */}
        <div>
          <label
            className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {esTarjetaCredito
              ? (cantidadCuotas > 1 ? 'Resumen de la primera cuota' : 'Período de Resumen')
              : 'Fecha'}
          </label>
          {esTarjetaCredito ? (
            <div className="space-y-2">
              <div className="relative">
                <select
                  value={periodoResumen}
                  onChange={(e) => setPeriodoResumen(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl appearance-none cursor-pointer transition-all duration-200 border-2 border-transparent focus:border-[var(--accent-primary)] text-sm sm:text-base"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {periodosResumen.map((periodo) => (
                    <option key={periodo.value} value={periodo.value}>
                      {periodo.label} {periodo.value === primerPeriodoNoPagado ? '(actual)' : (cardPayments[`${periodo.value}_ARS`] || cardPayments[`${periodo.value}_USD`] ? '(pagado)' : '')}
                    </option>
                  ))}
                </select>
                <div
                  className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              {/* Info de cierre de tarjeta */}
              {infoCierreTarjeta && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    color: 'var(--accent-blue, #3b82f6)',
                  }}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    Próximo cierre: <strong>{infoCierreTarjeta.fechaCierre}</strong>
                  </span>
                </div>
              )}
            </div>
          ) : (
            <DatePicker
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
            />
          )}
      </div>

      {/* Monto - Highlighted */}
      <div>
        <label
          className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {currencyIcon}
          {esTarjetaCredito && cantidadCuotas > 1 ? 'Monto Total' : 'Monto'}
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
              className="text-xl sm:text-2xl md:text-3xl font-bold"
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
              className="flex-1 text-xl sm:text-2xl md:text-3xl font-bold bg-transparent outline-none"
              style={{ color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      {/* Selector de moneda - Full width - Solo para tarjetas de crédito */}
      {esTarjetaCredito && (
        <div>
          <label
            className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
            style={{ color: 'var(--text-secondary)' }}
          >
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
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
                onClick={() => setMonedaGasto(opt.id)}
                className="flex-1 py-2.5 rounded-md text-xs font-medium transition-colors duration-150 flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: monedaGasto === opt.id ? 'var(--bg-elevated)' : 'transparent',
                  color: monedaGasto === opt.id ? 'var(--text-primary)' : 'var(--text-muted)',
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
        <label
          className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {accountIcon}
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
          className="rounded-xl sm:rounded-2xl p-3 sm:p-4 space-y-3 sm:space-y-4 animate-fade-in"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--accent-purple)',
          }}
        >
          <div className="flex items-center gap-2">
            {installmentsIcon}
            <span className="text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
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
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
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
          options={sortedCategories}
          placeholder="Seleccionar categoría"
          icon={categoryIcon}
          emptyMessage="No hay categorías"
          onCreateNew={() => setShowCreateCategory(true)}
          createNewLabel="Crear categoría"
          defaultOptionIcon="🏷️"
        />
      </div>

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

      {/* Adjuntos - Solo para gastos sin cuotas */}
      {!(esTarjetaCredito && cantidadCuotas > 1) && (
        <>
          <AttachmentInput
            value={attachment}
            onChange={setAttachment}
            disabled={loading}
            label="Adjunto 1"
          />
          <AttachmentInput
            value={attachment2}
            onChange={setAttachment2}
            disabled={loading}
            label="Adjunto 2"
          />
        </>
      )}

      {/* Impacto en presupuestos y metas */}
      {formData.monto && parseFloat(formData.monto) > 0 && (budgets?.length > 0 || goals?.length > 0) && (
        <BudgetGoalImpact
          type="expense"
          amount={parseFloat(formData.monto)}
          categoryId={selectedCategoryId}
          accountId={selectedAccount?.id}
          currency={esTarjetaCredito ? monedaGasto : (selectedAccount?.moneda === 'Dólar' ? 'USD' : 'ARS')}
          budgets={budgets || []}
          goals={goals || []}
        />
      )}

      {/* Sugerencia de regla automática */}
      {ruleSuggestion && !suggestionDismissed && (
        <RuleSuggestionBanner
          suggestion={ruleSuggestion}
          onApply={handleApplyRuleSuggestion}
          onDismiss={() => setSuggestionDismissed(true)}
          categories={categoriesWithId || []}
          accounts={accounts}
        />
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isValid || loading || showSuccess}
        className="w-full py-3 sm:py-4 rounded-xl font-semibold text-white text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
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
