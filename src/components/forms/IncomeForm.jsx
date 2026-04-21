import { useState, useMemo, useEffect } from 'react';
import DatePicker from '../DatePicker';
import Combobox from '../Combobox';
import { CurrencyIcon, AccountIcon, CategoryIcon, NoteIcon } from './FormIcons';
import CreateCategoryModal from '../CreateCategoryModal';
import AttachmentInput from '../AttachmentInput';
import BudgetGoalImpact from '../common/BudgetGoalImpact';
import RuleSuggestionBanner from '../rules/RuleSuggestionBanner';
import { useRecentUsage } from '../../hooks/useRecentUsage';
import { sortByRecency } from '../../utils/sortByRecency';
import { useDebounce } from '../../hooks/useDebounce';
import { evaluateAutoRules } from '../../services/supabaseApi';

function IncomeForm({ accounts, categories, categoriesWithId, budgets, goals, onSubmit, loading, prefillData, onCategoryCreated, sharedAmount, onAmountChange }) {
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

  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [ruleSuggestion, setRuleSuggestion] = useState(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);

  // Debounce para evaluación de reglas
  const debouncedNota = useDebounce(formData.nota, 400);
  const debouncedMonto = useDebounce(formData.monto, 400);

  // Obtener el ID de la categoría seleccionada
  const selectedCategoryId = useMemo(() => {
    if (!formData.categoria || !categoriesWithId) return null;
    const cat = categoriesWithId.find(c =>
      c.nombre === formData.categoria || c.name === formData.categoria
    );
    return cat?.id || null;
  }, [formData.categoria, categoriesWithId]);

  // Obtener la cuenta seleccionada
  const selectedAccount = useMemo(() => {
    if (!formData.cuenta || !accounts) return null;
    return accounts.find(a => a.nombre === formData.cuenta) || null;
  }, [formData.cuenta, accounts]);

  // Evaluar reglas automáticas cuando cambia nota o monto (debounced)
  useEffect(() => {
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

    let cancelled = false;

    evaluateAutoRules({
      type: 'income',
      note: debouncedNota,
      amount: parseFloat(debouncedMonto) || 0,
      accountId: selectedAccount?.id || '',
    }).then(suggestion => {
      if (!cancelled) setRuleSuggestion(suggestion);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [debouncedNota, debouncedMonto, selectedAccount?.id, formData.categoria, suggestionDismissed]);

  // Reset dismissed state cuando se limpia el formulario
  useEffect(() => {
    if (!formData.nota && !formData.monto) {
      setSuggestionDismissed(false);
    }
  }, [formData.nota, formData.monto]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));

    // Sincronizar monto con el estado compartido
    if (name === 'monto' && onAmountChange) {
      onAmountChange(value);
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

    const newErrors = {};
    if (!formData.monto) newErrors.monto = 'Ingresa un monto';
    else if (parseFloat(formData.monto) <= 0) newErrors.monto = 'El monto debe ser mayor a cero';
    if (!formData.cuenta) newErrors.cuenta = 'Selecciona una cuenta';
    if (!formData.categoria) newErrors.categoria = 'Selecciona una categoría';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const parsedAmount = parseFloat(formData.monto);

    const result = await onSubmit({
      type: 'income',
      data: {
        ...formData,
        monto: parseFloat(formData.monto),
        attachment,
      },
    });

    if (result !== false) {
      setShowSuccess(true);
      setAttachment(null); // Limpiar adjunto despues de guardar
      setTimeout(() => setShowSuccess(false), 1500);
    }
  };

  const isValid = formData.monto && formData.cuenta && formData.categoria;

  const currencyIcon = CurrencyIcon;
  const accountIcon = AccountIcon;
  const categoryIcon = CategoryIcon;
  const noteIcon = NoteIcon;

  return (
    <>
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

      {/* Monto - Highlighted */}
      <div>
        <label
          className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {currencyIcon}
          Monto
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
              style={{ color: 'var(--accent-green)' }}
            >
              $
            </span>
            <input
              id="income-monto"
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
        {errors.monto && (
          <p className="text-xs mt-1 font-medium" style={{ color: 'var(--accent-red)' }}>{errors.monto}</p>
        )}
      </div>

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
          options={sortedAccounts.map(a => ({ value: a.nombre, label: a.nombre, icon: a.icon || null }))}
          placeholder="Seleccionar cuenta"
          icon={accountIcon}
          emptyMessage="No hay cuentas"
          defaultOptionIcon="💳"
        />
        {errors.cuenta && (
          <p className="text-xs mt-1 font-medium" style={{ color: 'var(--accent-red)' }}>{errors.cuenta}</p>
        )}
      </div>

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
        {errors.categoria && (
          <p className="text-xs mt-1 font-medium" style={{ color: 'var(--accent-red)' }}>{errors.categoria}</p>
        )}
      </div>

      {/* Nota */}
      <div>
        <label
          htmlFor="income-nota"
          className="flex items-center gap-2 text-xs sm:text-sm font-medium mb-1.5 sm:mb-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          {noteIcon}
          Nota (opcional)
        </label>
        <textarea
          id="income-nota"
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

      {/* Impacto en presupuestos y metas */}
      {formData.monto && parseFloat(formData.monto) > 0 && (budgets?.length > 0 || goals?.length > 0) && (
        <BudgetGoalImpact
          type="income"
          amount={parseFloat(formData.monto)}
          categoryId={selectedCategoryId}
          accountId={selectedAccount?.id}
          currency={selectedAccount?.moneda === 'Dólar' ? 'USD' : 'ARS'}
          date={formData.fecha}
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
        className="w-full py-3 sm:py-4 rounded-xl font-semibold text-white text-sm sm:text-base transition-all duration-300 active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 relative overflow-hidden"
        style={{
          backgroundColor: 'var(--accent-green)',
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            Registrar Ingreso
          </>
        )}
      </button>
    </form>

      {/* Create Category Modal - FUERA del form */}
      <CreateCategoryModal
        isOpen={showCreateCategory}
        onClose={() => setShowCreateCategory(false)}
        type="ingreso"
        onCategoryCreated={(newCat) => {
          setFormData(prev => ({ ...prev, categoria: newCat }));
          if (onCategoryCreated) onCategoryCreated();
        }}
      />
    </>
  );
}

export default IncomeForm;
