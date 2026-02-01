import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAccounts, getAllExpenses, addExpense, addTransfer, getCardStatementAttachments, saveCardStatementAttachments, deleteCardStatementAttachment, getCategories, updateMovement, updateMultipleMovements, updateSubsequentInstallments } from '../services/supabaseApi';
import { formatCurrency } from '../utils/format';
import LoadingSpinner from '../components/LoadingSpinner';
import Combobox from '../components/Combobox';
import { useError } from '../contexts/ErrorContext';
import { isEmoji, resolveIconPath } from '../services/iconStorage';
import { downloadAttachment } from '../services/attachmentStorage';
import StatementAttachmentsModal from '../components/StatementAttachmentsModal';
import EditMovementModal from '../components/EditMovementModal';
import NewMovementModal from '../components/NewMovementModal';
import { useDataEvent, DataEvents } from '../services/dataEvents';

function CreditCards() {
  const { showError } = useError();
  const [creditCards, setCreditCards] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [allCategories, setAllCategories] = useState({ ingresos: [], gastos: [] });
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null);
  const [currency, setCurrency] = useState('ARS');

  // Estados para modales
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [taxAmount, setTaxAmount] = useState('');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [paymentCurrency, setPaymentCurrency] = useState('ARS'); // Moneda a pagar
  const [saving, setSaving] = useState(false);
  const [viewingStatement, setViewingStatement] = useState(null); // Para ver detalle de un resumen

  // Estado para adjuntos de resúmenes
  const [statementAttachments, setStatementAttachments] = useState({});
  const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false);
  const [selectedStatementForAttachments, setSelectedStatementForAttachments] = useState(null);
  const [savingAttachment, setSavingAttachment] = useState(false);

  // Estado para editar movimiento
  const [editingMovement, setEditingMovement] = useState(null);

  // Estado para selección masiva
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Estado para agregar nuevo gasto al resumen
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [addExpensePrefill, setAddExpensePrefill] = useState(null);

  // Estado para refrescar viewingStatement después de editar
  const [pendingStatementRefresh, setPendingStatementRefresh] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Suscribirse a cambios de datos para refrescar automáticamente
  const handleDataChange = useCallback(() => {
    fetchData(true, false);
  }, []);

  useDataEvent([DataEvents.EXPENSES_CHANGED, DataEvents.ACCOUNTS_CHANGED], handleDataChange);

  const fetchData = async (forceRefresh = false, showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [accountsData, expensesData, categoriesData] = await Promise.all([
        getAccounts(),
        getAllExpenses(forceRefresh),
        getCategories(),
      ]);

      const accounts = accountsData.accounts || [];
      const expenses = expensesData.expenses || [];
      const categories = categoriesData.categorias || { ingresos: [], gastos: [] };

      // Filtrar solo tarjetas de crédito
      const cards = accounts.filter(acc => acc.esTarjetaCredito);

      setCreditCards(cards);
      setAllAccounts(accounts);
      setAllExpenses(expenses);
      setAllCategories(categories);

      // Seleccionar primera tarjeta por defecto
      if (cards.length > 0 && !selectedCard) {
        setSelectedCard(cards[0]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Cargar adjuntos cuando cambia la tarjeta seleccionada
  useEffect(() => {
    if (selectedCard?.id) {
      getCardStatementAttachments(selectedCard.id)
        .then(setStatementAttachments)
        .catch(err => console.error('Error loading statement attachments:', err));
    } else {
      setStatementAttachments({});
    }
  }, [selectedCard?.id]);

  // Cuentas disponibles para pagar (no tarjetas de crédito), filtradas por moneda
  const paymentAccountsARS = useMemo(() => {
    return allAccounts.filter(acc => !acc.esTarjetaCredito && acc.moneda === 'Peso');
  }, [allAccounts]);

  const paymentAccountsUSD = useMemo(() => {
    return allAccounts.filter(acc => !acc.esTarjetaCredito && acc.moneda !== 'Peso');
  }, [allAccounts]);

  // Generar resúmenes para la tarjeta seleccionada (solo con gastos)
  const statements = useMemo(() => {
    if (!selectedCard) return [];

    const diaCierre = selectedCard.diaCierre || 1;
    const cardExpenses = allExpenses.filter(e => e.cuenta === selectedCard.nombre);
    
    if (cardExpenses.length === 0) return [];
    
    // Encontrar el rango de fechas de los gastos
    const expenseDates = cardExpenses.map(e => new Date(e.fecha));
    const minDate = new Date(Math.min(...expenseDates));
    const maxDate = new Date(Math.max(...expenseDates));
    
    // Función para obtener el período de cierre de una fecha
    const getStatementPeriod = (date) => {
      const d = new Date(date);
      const day = d.getDate();
      let year = d.getFullYear();
      let month = d.getMonth();
      
      // Si el día es >= día de cierre, pertenece al siguiente período
      if (day >= diaCierre) {
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
      }
      
      return `${year}-${String(month + 1).padStart(2, '0')}`;
    };
    
    // Agrupar gastos por período
    const expensesByPeriod = {};
    cardExpenses.forEach(expense => {
      const period = getStatementPeriod(expense.fecha);
      if (!expensesByPeriod[period]) {
        expensesByPeriod[period] = [];
      }
      expensesByPeriod[period].push(expense);
    });
    
    // Crear resúmenes solo para períodos con gastos
    const result = [];
    const today = new Date();
    
    Object.entries(expensesByPeriod).forEach(([period, expenses]) => {
      const [year, month] = period.split('-').map(Number);
      const closeDate = new Date(year, month - 1, Math.min(diaCierre, new Date(year, month, 0).getDate()));
      
      // Calcular totales separando por moneda original
      // Un gasto es en dólares si tiene montoDolares > 0 y el monto original (columna B) 
      // es similar a montoDolares (no es una conversión)
      let totalPesosOriginal = 0;  // Gastos cargados en pesos
      let totalDolaresOriginal = 0; // Gastos cargados en dólares
      const itemsPesos = [];
      const itemsDolares = [];
      
      expenses.forEach(expense => {
        // Parsear montoDolares - puede venir como número o como texto "USD $3,33"
        let montoDolares = expense.montoDolares;
        if (typeof montoDolares === 'string') {
          // Remover "USD", "$", espacios y convertir comas a puntos
          montoDolares = parseFloat(montoDolares.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
        } else {
          montoDolares = parseFloat(montoDolares) || 0;
        }
        
        const montoPesos = parseFloat(expense.montoPesos) || 0;
        const montoBase = parseFloat(expense.monto) || 0;
        
        // Un gasto es en dólares si:
        // - Tiene montoDolares > 0 Y
        // - NO tiene montoPesos Y el monto base es similar al de dólares (no conversión)
        const esGastoEnDolares = montoDolares > 0 && montoPesos === 0;
        
        const item = {
          ...expense,
          isInstallment: !!expense.cuota,
          monedaOriginal: esGastoEnDolares ? 'USD' : 'ARS',
          // Guardar los montos parseados
          montoPesosNum: montoPesos || montoBase,
          montoDolaresNum: montoDolares,
        };
        
        if (esGastoEnDolares) {
          totalDolaresOriginal += montoDolares;
          itemsDolares.push(item);
        } else {
          // Si no tiene montoPesos específico, usar el monto base
          totalPesosOriginal += montoPesos || montoBase;
          itemsPesos.push(item);
        }
      });
      
      // Ordenar items por fecha
      const allItems = [...itemsPesos, ...itemsDolares].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      
      // Buscar si hay impuesto de sellos cargado (siempre en pesos)
      const taxExpense = expenses.find(e => 
        e.categoria && e.categoria.includes('Impuesto de sellos')
      );
      
      result.push({
        id: period,
        year,
        month: month - 1,
        monthName: format(closeDate, 'MMMM yyyy', { locale: es }),
        closeDate,
        totalPesos: totalPesosOriginal,      // Total de gastos en pesos
        totalDolares: totalDolaresOriginal,  // Total de gastos en dólares
        items: allItems,
        itemsPesos,
        itemsDolares,
        itemCount: allItems.length,
        hasTax: !!taxExpense,
        taxAmount: taxExpense ? (taxExpense.montoPesos || taxExpense.monto || 0) : 0,
        isPast: closeDate < today,
        isCurrent: isSameMonth(closeDate, today),
        isFuture: closeDate > endOfMonth(today),
      });
    });
    
    // Ordenar por fecha de cierre (más reciente primero)
    return result.sort((a, b) => a.closeDate - b.closeDate);
  }, [selectedCard, allExpenses]);

  // Actualizar viewingStatement cuando hay un refresh pendiente
  useEffect(() => {
    if (pendingStatementRefresh && statements.length > 0) {
      const freshStatement = statements.find(s => s.id === pendingStatementRefresh);
      if (freshStatement) {
        setViewingStatement(freshStatement);
      }
      setPendingStatementRefresh(null);
    }
  }, [pendingStatementRefresh, statements]);

  // Manejar agregar impuesto de sellos
  const handleAddTax = async () => {
    if (!selectedStatement || !taxAmount || !selectedCard) return;
    
    try {
      setSaving(true);
      
      // La fecha del gasto es el día de cierre del resumen
      const fecha = format(selectedStatement.closeDate, 'yyyy-MM-dd');
      
      await addExpense({
        fecha,
        monto: parseFloat(taxAmount),
        cuenta: selectedCard.nombre,
        categoria: '⬇️ Impuesto de sellos',
        nota: `Impuesto de sellos - Resumen ${selectedStatement.monthName}`,
      });
      
      setShowTaxModal(false);
      setTaxAmount('');
      setSelectedStatement(null);
      await fetchData();
    } catch (err) {
      console.error('Error adding tax:', err);
      showError('No se pudo agregar el impuesto de sellos', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Manejar pago de resumen
  const handlePayStatement = async () => {
    if (!selectedStatement || !paymentAccount || !selectedCard) return;
    
    // El total depende de qué parte estamos pagando
    const total = paymentCurrency === 'ARS' 
      ? selectedStatement.totalPesos 
      : selectedStatement.totalDolares;
    
    if (total <= 0) {
      showError('No se puede realizar el pago', `No hay monto en ${paymentCurrency === 'ARS' ? 'pesos' : 'dólares'} para pagar`);
      return;
    }
    
    try {
      setSaving(true);
      
      // Crear transferencia desde la cuenta de pago hacia la tarjeta
      const fecha = format(new Date(), 'yyyy-MM-dd');
      const notaMoneda = paymentCurrency === 'ARS' ? '(Pesos)' : '(Dólares)';
      
      await addTransfer({
        fecha,
        cuentaSaliente: paymentAccount,
        cuentaEntrante: selectedCard.nombre,
        montoSaliente: total,
        montoEntrante: total,
        nota: `Pago resumen ${selectedStatement.monthName} ${notaMoneda}`,
      });
      
      setShowPayModal(false);
      setPaymentAccount('');
      setSelectedStatement(null);
      await fetchData();
    } catch (err) {
      console.error('Error paying statement:', err);
      showError('No se pudo registrar el pago del resumen', err.message);
    } finally {
      setSaving(false);
    }
  };

  const openTaxModal = (statement) => {
    setSelectedStatement(statement);
    setTaxAmount('');
    setShowTaxModal(true);
  };

  const openPayModal = (statement) => {
    setSelectedStatement(statement);
    setPaymentAccount('');
    // Por defecto seleccionar la moneda que tenga saldo
    setPaymentCurrency(statement.totalPesos > 0 ? 'ARS' : 'USD');
    setShowPayModal(true);
  };

  const openAttachmentsModal = (statement) => {
    setSelectedStatementForAttachments(statement);
    setAttachmentsModalOpen(true);
  };

  const handleSaveAttachments = async ({ statementFile, receiptFile }) => {
    if (!selectedStatementForAttachments || !selectedCard) return;
    try {
      setSavingAttachment(true);
      const period = selectedStatementForAttachments.id;
      const existing = statementAttachments[period] || null;

      const result = await saveCardStatementAttachments({
        accountId: selectedCard.id,
        period,
        statementFile,
        receiptFile,
        existing,
      });

      setStatementAttachments(prev => ({ ...prev, [period]: result }));
    } catch (err) {
      console.error('Error saving statement attachments:', err);
      showError('No se pudieron guardar los adjuntos', err.message);
    } finally {
      setSavingAttachment(false);
    }
  };

  const handleRemoveAttachment = async (field) => {
    if (!selectedStatementForAttachments || !selectedCard) return;
    try {
      setSavingAttachment(true);
      const period = selectedStatementForAttachments.id;

      await deleteCardStatementAttachment({
        accountId: selectedCard.id,
        period,
        field,
      });

      setStatementAttachments(prev => {
        const updated = { ...prev };
        if (updated[period]) {
          const copy = { ...updated[period] };
          if (field === 'statement') {
            copy.statementUrl = null;
            copy.statementName = null;
          } else {
            copy.receiptUrl = null;
            copy.receiptName = null;
          }
          // Si ambos quedaron null, eliminar la entrada
          if (!copy.statementUrl && !copy.receiptUrl) {
            delete updated[period];
          } else {
            updated[period] = copy;
          }
        }
        return updated;
      });
    } catch (err) {
      console.error('Error removing attachment:', err);
      showError('No se pudo eliminar el adjunto', err.message);
    } finally {
      setSavingAttachment(false);
    }
  };

  // Handler para abrir el modal de edición
  const handleEditMovement = (item) => {
    // Convertir item del statement a formato de movimiento
    setEditingMovement({
      id: item.id,
      fecha: item.fecha,
      monto: item.monto,
      cuenta: item.cuenta || selectedCard?.nombre,
      categoria: item.categoria,
      nota: item.nota,
      tipo: 'gasto',
      accountId: item.accountId,
      categoryId: item.categoryId,
      cuota: item.cuota,
      idCompra: item.idCompra || item.installment_purchase_id,
    });
  };

  // Handler para guardar cambios del movimiento
  const handleSaveMovement = async (updatedMovement) => {
    try {
      await updateMovement(updatedMovement);

      // Si es cuota y el usuario eligió aplicar a las siguientes
      if (updatedMovement.applyToSubsequent && updatedMovement.idCompra) {
        await updateSubsequentInstallments(updatedMovement);
      }

      setEditingMovement(null);

      // Actualización optimista: actualizar viewingStatement inmediatamente
      if (viewingStatement) {
        setViewingStatement(prev => {
          if (!prev) return prev;

          // Actualizar el item en la lista
          const updateItems = (items) => items.map(item =>
            item.id === updatedMovement.id
              ? { ...item, nota: updatedMovement.nota, categoria: updatedMovement.categoria, fecha: updatedMovement.fecha }
              : item
          );

          return {
            ...prev,
            items: updateItems(prev.items || []),
            itemsPesos: updateItems(prev.itemsPesos || []),
            itemsDolares: updateItems(prev.itemsDolares || []),
          };
        });
      }

      // Refrescar datos en background
      fetchData(true, false);
    } catch (err) {
      console.error('Error updating movement:', err);
      showError('No se pudo actualizar el movimiento', err.message);
    }
  };

  // Navegación entre resúmenes
  const getCurrentStatementIndex = () => {
    if (!viewingStatement) return -1;
    return statements.findIndex(s => s.id === viewingStatement.id);
  };

  const goToPreviousStatement = () => {
    const currentIndex = getCurrentStatementIndex();
    if (currentIndex > 0) {
      setViewingStatement(statements[currentIndex - 1]);
    }
  };

  const goToNextStatement = () => {
    const currentIndex = getCurrentStatementIndex();
    if (currentIndex < statements.length - 1) {
      setViewingStatement(statements[currentIndex + 1]);
    }
  };

  const hasPreviousStatement = () => getCurrentStatementIndex() > 0;
  const hasNextStatement = () => getCurrentStatementIndex() < statements.length - 1;

  // Funciones para selección masiva
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedItems(new Set());
  };

  const toggleItemSelection = (itemId) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAllItems = (items) => {
    const allIds = new Set(items.map(item => item.id));
    setSelectedItems(allIds);
  };

  const getSelectedMovementsFromStatement = () => {
    if (!viewingStatement) return [];
    const hasBoth = viewingStatement.totalPesos > 0 && viewingStatement.totalDolares > 0;
    const itemsToShow = hasBoth
      ? (currency === 'ARS' ? viewingStatement.itemsPesos : viewingStatement.itemsDolares)
      : viewingStatement.items;
    return itemsToShow.filter(item => selectedItems.has(item.id));
  };

  // Calcular una fecha válida para un período de resumen dado
  const getDateForStatementPeriod = (statement, diaCierre) => {
    // El período es "YYYY-MM" donde el mes es el mes del cierre
    // Para que un gasto caiga en ese período, la fecha debe ser < diaCierre de ese mes
    // Por ejemplo: período "2026-03" con cierre día 29 → usar fecha como "2026-03-15" (cualquier día < 29)
    const year = statement.year;
    const month = statement.month; // 0-indexed

    // Usar el día 15 del mes del período (seguro que está antes del cierre)
    const dia = Math.min(15, diaCierre - 1);
    const fecha = new Date(year, month, dia);
    return format(fecha, 'yyyy-MM-dd');
  };

  // Abrir modal para agregar gasto al resumen actual
  const handleAddExpenseToStatement = () => {
    if (!viewingStatement || !selectedCard) return;

    const diaCierre = selectedCard.diaCierre || 1;
    const fecha = getDateForStatementPeriod(viewingStatement, diaCierre);

    setAddExpensePrefill({
      tipo: 'gasto',
      cuenta: selectedCard.nombre,
      fecha: fecha,
    });
    setShowAddExpenseModal(true);
  };

  // Mover gastos seleccionados al resumen anterior o siguiente
  const handleBulkMoveToStatement = async (direction) => {
    if (!viewingStatement || !selectedCard) return;

    const currentIndex = getCurrentStatementIndex();
    const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= statements.length) {
      showError('No se puede mover', `No hay resumen ${direction === 'prev' ? 'anterior' : 'siguiente'}`);
      return;
    }

    const targetStatement = statements[targetIndex];
    const diaCierre = selectedCard.diaCierre || 1;
    const newDate = getDateForStatementPeriod(targetStatement, diaCierre);

    setBulkProcessing(true);
    try {
      const movementsToUpdate = getSelectedMovementsFromStatement();
      await updateMultipleMovements(movementsToUpdate, 'fecha', newDate);
      setSelectedItems(new Set());
      setSelectionMode(false);
      // Guardar el ID del statement destino para navegar a él después del refresh
      setPendingStatementRefresh(targetStatement.id);
      await fetchData(true, false);
    } catch (err) {
      console.error('Error moving to statement:', err);
      showError('No se pudieron mover los movimientos', err.message);
    } finally {
      setBulkProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (creditCards.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Tarjetas de Crédito
        </h2>
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div
            className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(20, 184, 166, 0.15)' }}
          >
            <svg className="w-10 h-10" style={{ color: 'var(--accent-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            Sin tarjetas de crédito
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Agrega una cuenta con tipo "Tarjeta de crédito" para ver los resúmenes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
          Tarjetas de Crédito
        </h2>
        <div className="flex items-center gap-3">
          {/* Currency Selector - Premium design */}
          <div
            className="inline-flex rounded-xl p-1"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <button
              onClick={() => setCurrency('ARS')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 active:scale-95 flex items-center gap-1.5"
              style={{
                backgroundColor: currency === 'ARS' ? 'var(--accent-primary)' : 'transparent',
                color: currency === 'ARS' ? 'white' : 'var(--text-secondary)',
                boxShadow: currency === 'ARS' ? '0 4px 12px var(--accent-primary-glow)' : 'none',
              }}
            >
              <img src={`${import.meta.env.BASE_URL}icons/catalog/ARS.svg`} alt="ARS" className="w-4 h-4 rounded-sm" />
              ARS
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 active:scale-95 flex items-center gap-1.5"
              style={{
                backgroundColor: currency === 'USD' ? 'var(--accent-green)' : 'transparent',
                color: currency === 'USD' ? 'white' : 'var(--text-secondary)',
                boxShadow: currency === 'USD' ? '0 4px 12px rgba(0, 217, 154, 0.3)' : 'none',
              }}
            >
              <img src={`${import.meta.env.BASE_URL}icons/catalog/USD.svg`} alt="USD" className="w-4 h-4 rounded-sm" />
              USD
            </button>
          </div>
        </div>
      </div>

      {/* Selector de tarjeta */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {creditCards.map((card) => {
          const hasIcon = !!card.icon;
          const iconIsEmoji = hasIcon && isEmoji(card.icon);

          return (
            <button
              key={card.nombre}
              onClick={() => setSelectedCard(card)}
              className={`px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                selectedCard?.nombre === card.nombre ? 'scale-[1.02]' : 'opacity-70'
              }`}
              style={{
                backgroundColor: selectedCard?.nombre === card.nombre
                  ? 'var(--accent-primary)'
                  : 'var(--bg-secondary)',
                color: selectedCard?.nombre === card.nombre
                  ? 'white'
                  : 'var(--text-primary)',
              }}
            >
              <div className="flex items-center gap-2">
                {hasIcon ? (
                  iconIsEmoji ? (
                    <span className="text-base">{card.icon}</span>
                  ) : (
                    <img
                      src={resolveIconPath(card.icon)}
                      alt={card.nombre}
                      className="w-5 h-5 rounded object-cover"
                    />
                  )
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                )}
                {card.nombre}
              </div>
            </button>
          );
        })}
      </div>

      {/* Info de la tarjeta seleccionada */}
      {selectedCard && (
        <div
          className="rounded-2xl p-4"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
                Día de cierre
              </p>
              <p className="text-xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                {selectedCard.diaCierre || 'No configurado'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
                Balance actual
              </p>
              <p className="text-xl font-bold" style={{ color: 'var(--accent-red)' }}>
                {formatCurrency(Math.abs(selectedCard.balanceActual || 0), selectedCard.moneda === 'Peso' ? 'ARS' : 'USD')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de resúmenes */}
      <div className="space-y-3">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          Resúmenes
        </h3>
        
        {statements.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No hay resúmenes con gastos</p>
          </div>
        ) : (
          statements.map((statement) => {
            const hasBothCurrencies = statement.totalPesos > 0 && statement.totalDolares > 0;
            
            return (
              <div
                key={statement.id}
                className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
                onClick={() => setViewingStatement(statement)}
              >
                {/* Header del resumen */}
                <div
                  className="p-4 flex items-center justify-between"
                  style={{
                    backgroundColor: statement.isCurrent
                      ? 'rgba(20, 184, 166, 0.15)'
                      : statement.isFuture
                        ? 'rgba(96, 165, 250, 0.1)'
                        : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{
                        backgroundColor: statement.isCurrent
                          ? 'var(--accent-primary)'
                          : statement.isFuture
                            ? 'var(--accent-blue)'
                            : 'var(--bg-tertiary)',
                      }}
                    >
                      <svg
                        className="w-5 h-5"
                        style={{
                          color: statement.isCurrent || statement.isFuture ? 'white' : 'var(--text-secondary)',
                        }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                        {statement.monthName}
                        {statement.isCurrent && (
                          <span
                            className="ml-2 px-2 py-0.5 rounded-full text-xs"
                            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                          >
                            Actual
                          </span>
                        )}
                        {statement.isFuture && (
                          <span
                            className="ml-2 px-2 py-0.5 rounded-full text-xs"
                            style={{ backgroundColor: 'var(--accent-blue)', color: 'white' }}
                          >
                            Futuro
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {statement.itemCount} movimiento{statement.itemCount !== 1 ? 's' : ''} · Cierra {format(statement.closeDate, 'd MMM', { locale: es })}
                        </p>
                        {statementAttachments[statement.id]?.statementUrl && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' }}
                          >
                            PDF
                          </span>
                        )}
                        {statementAttachments[statement.id]?.receiptUrl && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'var(--accent-green)' }}
                          >
                            Pagado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      {hasBothCurrencies ? (
                        <>
                          <p className="text-sm font-bold" style={{ color: 'var(--accent-red)' }}>
                            {formatCurrency(statement.totalPesos, 'ARS')}
                          </p>
                          <p className="text-sm font-bold" style={{ color: 'var(--accent-green)' }}>
                            {formatCurrency(statement.totalDolares, 'USD')}
                          </p>
                        </>
                      ) : (
                        <p
                          className="text-lg font-bold"
                          style={{ color: statement.totalPesos > 0 || statement.totalDolares > 0 ? 'var(--accent-red)' : 'var(--text-secondary)' }}
                        >
                          {statement.totalPesos > 0 
                            ? formatCurrency(statement.totalPesos, 'ARS')
                            : formatCurrency(statement.totalDolares, 'USD')
                          }
                        </p>
                      )}
                      {statement.hasTax && (
                        <p className="text-xs" style={{ color: 'var(--accent-yellow)' }}>
                          Inc. imp. sellos
                        </p>
                      )}
                    </div>
                    <svg className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Acciones */}
                <div
                  className="px-4 py-3 flex gap-2"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {!statement.hasTax && (
                    <button
                      onClick={() => openTaxModal(statement)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5"
                      style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-yellow)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Imp. Sellos
                    </button>
                  )}
                  <button
                    onClick={() => openAttachmentsModal(statement)}
                    className="py-2.5 px-3 rounded-xl text-xs font-medium transition-all duration-200 flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}
                    title="Adjuntos"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <button
                    onClick={() => openPayModal(statement)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-medium text-white transition-all duration-200 flex items-center justify-center gap-1.5"
                    style={{ backgroundColor: 'var(--accent-green)' }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Pagar Resumen
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal - Agregar Impuesto de Sellos */}
      {showTaxModal && selectedStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTaxModal(false)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Agregar Impuesto de Sellos
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Resumen de <span className="font-medium capitalize">{selectedStatement.monthName}</span>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Monto del impuesto
              </label>
              <input
                type="number"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 rounded-xl text-lg"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowTaxModal(false)}
                className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTax}
                disabled={saving || !taxAmount}
                className="flex-1 py-3 rounded-xl font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-yellow)' }}
              >
                {saving ? 'Guardando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal - Pagar Resumen */}
      {showPayModal && selectedStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowPayModal(false)}
          />
          <div
            className="relative w-full max-w-sm rounded-2xl p-6 animate-scale-in"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Pagar Resumen
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Resumen de <span className="font-medium capitalize">{selectedStatement.monthName}</span>
            </p>
            
            {/* Selector de moneda a pagar */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Seleccionar porción a pagar
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPaymentCurrency('ARS');
                    setPaymentAccount('');
                  }}
                  disabled={selectedStatement.totalPesos <= 0}
                  className={`flex-1 p-3 rounded-xl text-left transition-all ${
                    paymentCurrency === 'ARS' ? 'ring-2' : ''
                  } ${selectedStatement.totalPesos <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  style={{
                    backgroundColor: paymentCurrency === 'ARS' ? 'rgba(20, 184, 166, 0.15)' : 'var(--bg-tertiary)',
                    borderColor: 'var(--accent-primary)',
                    '--tw-ring-color': 'var(--accent-primary)',
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Pesos</p>
                  <p className="text-lg font-bold" style={{ color: paymentCurrency === 'ARS' ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    {formatCurrency(selectedStatement.totalPesos, 'ARS')}
                  </p>
                </button>
                <button
                  onClick={() => {
                    setPaymentCurrency('USD');
                    setPaymentAccount('');
                  }}
                  disabled={selectedStatement.totalDolares <= 0}
                  className={`flex-1 p-3 rounded-xl text-left transition-all ${
                    paymentCurrency === 'USD' ? 'ring-2' : ''
                  } ${selectedStatement.totalDolares <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  style={{
                    backgroundColor: paymentCurrency === 'USD' ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-tertiary)',
                    borderColor: 'var(--accent-green)',
                    '--tw-ring-color': 'var(--accent-green)',
                  }}
                >
                  <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Dólares</p>
                  <p className="text-lg font-bold" style={{ color: paymentCurrency === 'USD' ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                    {formatCurrency(selectedStatement.totalDolares, 'USD')}
                  </p>
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                Pagar desde cuenta en {paymentCurrency === 'ARS' ? 'pesos' : 'dólares'}
              </label>
              <Combobox
                value={paymentAccount}
                onChange={setPaymentAccount}
                options={(paymentCurrency === 'ARS' ? paymentAccountsARS : paymentAccountsUSD).map(acc => ({
                  value: acc.nombre,
                  label: acc.nombre,
                }))}
                placeholder="Seleccionar cuenta..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPayModal(false)}
                className="flex-1 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handlePayStatement}
                disabled={saving || !paymentAccount}
                className="flex-1 py-3 rounded-xl font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent-green)' }}
              >
                {saving ? 'Procesando...' : 'Pagar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vista de detalle del resumen */}
      {viewingStatement && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
          {/* Header */}
          <div
            className="flex items-center gap-2 px-4 py-3 safe-area-top"
            style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}
          >
            <button
              onClick={() => {
                setViewingStatement(null);
                setSelectionMode(false);
                setSelectedItems(new Set());
              }}
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <svg className="w-5 h-5" style={{ color: 'var(--text-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navegación anterior */}
            <button
              onClick={goToPreviousStatement}
              disabled={!hasPreviousStatement()}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <svg className="w-5 h-5" style={{ color: 'var(--text-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex-1 text-center">
              <h2 className="font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>
                {viewingStatement.monthName}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {selectedCard?.nombre} · Cierra {format(viewingStatement.closeDate, 'd MMM yyyy', { locale: es })}
              </p>
            </div>

            {/* Navegación siguiente */}
            <button
              onClick={goToNextStatement}
              disabled={!hasNextStatement()}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-30"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <svg className="w-5 h-5" style={{ color: 'var(--text-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div
              className="px-3 py-1.5 rounded-xl text-sm font-bold"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: 'var(--accent-red)',
              }}
            >
              {viewingStatement.totalPesos > 0 && viewingStatement.totalDolares > 0 ? (
                <div className="flex flex-col items-end gap-0.5">
                  <span>{formatCurrency(viewingStatement.totalPesos, 'ARS')}</span>
                  <span style={{ color: 'var(--accent-green)' }}>{formatCurrency(viewingStatement.totalDolares, 'USD')}</span>
                </div>
              ) : (
                viewingStatement.totalPesos > 0
                  ? formatCurrency(viewingStatement.totalPesos, 'ARS')
                  : formatCurrency(viewingStatement.totalDolares, 'USD')
              )}
            </div>
          </div>

          {/* Adjuntos del resumen */}
          {statementAttachments[viewingStatement.id] && (
            <div
              className="px-4 py-3 flex gap-2 flex-wrap"
              style={{ borderBottom: '1px solid var(--border-subtle)' }}
            >
              {statementAttachments[viewingStatement.id].statementUrl && (
                <button
                  onClick={() => downloadAttachment(
                    statementAttachments[viewingStatement.id].statementUrl,
                    statementAttachments[viewingStatement.id].statementName
                  )}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-red)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Resumen PDF
                </button>
              )}
              {statementAttachments[viewingStatement.id].receiptUrl && (
                <button
                  onClick={() => downloadAttachment(
                    statementAttachments[viewingStatement.id].receiptUrl,
                    statementAttachments[viewingStatement.id].receiptName
                  )}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: 'var(--accent-green)' }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Comprobante
                </button>
              )}
            </div>
          )}

          {/* Selector de moneda para filtrar gastos */}
          {viewingStatement.totalPesos > 0 && viewingStatement.totalDolares > 0 && (
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex gap-2">
                {['ARS', 'USD'].map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setCurrency(curr)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      currency === curr ? 'text-white' : ''
                    }`}
                    style={{
                      backgroundColor: currency === curr ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                      color: currency === curr ? 'white' : 'var(--text-secondary)',
                    }}
                  >
                    <img src={`${import.meta.env.BASE_URL}icons/catalog/${curr}.svg`} alt={curr} className="w-5 h-5 rounded-sm" />
                    {curr === 'ARS' ? `Pesos (${viewingStatement.itemsPesos?.length || 0})` : `Dólares (${viewingStatement.itemsDolares?.length || 0})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Barra de selección masiva */}
          {selectionMode && (
            <div
              className="px-4 py-3 flex items-center justify-between gap-2 flex-wrap"
              style={{ backgroundColor: 'rgba(20, 184, 166, 0.1)', borderBottom: '1px solid var(--accent-primary)' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {selectedItems.size} seleccionado{selectedItems.size !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => {
                    const hasBoth = viewingStatement.totalPesos > 0 && viewingStatement.totalDolares > 0;
                    const itemsToShow = hasBoth
                      ? (currency === 'ARS' ? viewingStatement.itemsPesos : viewingStatement.itemsDolares)
                      : viewingStatement.items;
                    selectedItems.size === itemsToShow.length ? setSelectedItems(new Set()) : selectAllItems(itemsToShow);
                  }}
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}
                >
                  {(() => {
                    const hasBoth = viewingStatement.totalPesos > 0 && viewingStatement.totalDolares > 0;
                    const itemsToShow = hasBoth
                      ? (currency === 'ARS' ? viewingStatement.itemsPesos : viewingStatement.itemsDolares)
                      : viewingStatement.items;
                    return selectedItems.size === itemsToShow.length ? 'Deseleccionar' : 'Seleccionar todo';
                  })()}
                </button>
              </div>
              <div className="flex items-center gap-2">
                {selectedItems.size > 0 && (
                  <>
                    <button
                      onClick={() => handleBulkMoveToStatement('prev')}
                      disabled={bulkProcessing || !hasPreviousStatement()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                      style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)' }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Resumen ant.
                    </button>
                    <button
                      onClick={() => handleBulkMoveToStatement('next')}
                      disabled={bulkProcessing || !hasNextStatement()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40"
                      style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)' }}
                    >
                      Resumen sig.
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </>
                )}
                <button
                  onClick={toggleSelectionMode}
                  disabled={bulkProcessing}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Botón para activar selección masiva */}
          {!selectionMode && (
            <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <button
                onClick={toggleSelectionMode}
                className="text-xs font-medium flex items-center gap-1.5"
                style={{ color: 'var(--accent-primary)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h7M4 12h7m-7 7h7m5-14v14m0-14l3 3m-3-3l-3 3m3 11l3-3m-3 3l-3-3" />
                </svg>
                Selección múltiple
              </button>
            </div>
          )}

          {/* Lista de gastos */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {(() => {
              // Si hay ambas monedas, filtrar por la moneda seleccionada
              const hasBoth = viewingStatement.totalPesos > 0 && viewingStatement.totalDolares > 0;
              const itemsToShow = hasBoth
                ? (currency === 'ARS' ? viewingStatement.itemsPesos : viewingStatement.itemsDolares)
                : viewingStatement.items;
              
              return itemsToShow?.map((item, idx) => {
                // Usar el campo monedaOriginal que ya se calculó correctamente
                const itemCurrency = item.monedaOriginal || 'ARS';
                const displayAmount = itemCurrency === 'USD'
                  ? (item.montoDolaresNum || item.montoDolares || 0)
                  : (item.montoPesosNum || item.montoPesos || item.monto || 0);
                const isSelected = selectedItems.has(item.id);

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${!selectionMode ? 'active:scale-[0.98]' : ''}`}
                    style={{
                      backgroundColor: isSelected ? 'rgba(20, 184, 166, 0.15)' : 'var(--bg-secondary)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid transparent',
                    }}
                    onClick={() => selectionMode ? toggleItemSelection(item.id) : handleEditMovement(item)}
                  >
                    {/* Checkbox en modo selección */}
                    {selectionMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleItemSelection(item.id);
                        }}
                        className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                        style={{
                          backgroundColor: isSelected ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                          border: isSelected ? 'none' : '2px solid var(--border-subtle)',
                        }}
                      >
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )}

                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--bg-tertiary)' }}
                    >
                      {(() => {
                        // Find category icon from allCategories
                        const categoryData = allCategories.gastos?.find(
                          c => c.value === item.categoria || c.label === item.categoria
                        );
                        const icon = categoryData?.icon;

                        if (icon && isEmoji(icon)) {
                          return <span className="text-lg">{icon}</span>;
                        } else if (icon) {
                          return (
                            <img
                              src={resolveIconPath(icon)}
                              alt=""
                              className="w-6 h-6 rounded object-cover"
                            />
                          );
                        } else {
                          // Fallback: try to extract emoji from category string
                          const firstChar = item.categoria?.split(' ')[0] || '💳';
                          return <span className="text-lg">{firstChar}</span>;
                        }
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                        {item.categoria?.replace(/^[^\s]+\s*/, '') || item.categoria || 'Sin categoría'}
                        {item.isInstallment && (
                          <span
                            className="ml-2 px-1.5 py-0.5 rounded text-xs"
                            style={{ backgroundColor: 'rgba(20, 184, 166, 0.2)', color: 'var(--accent-primary)' }}
                          >
                            {item.cuota}
                          </span>
                        )}
                        {itemCurrency === 'USD' && (
                          <span
                            className="ml-2 px-1.5 py-0.5 rounded text-xs"
                            style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', color: 'var(--accent-green)' }}
                          >
                            USD
                          </span>
                        )}
                      </p>
                      {item.nota && (
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {item.nota}
                        </p>
                      )}
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {format(new Date(item.fecha), "d 'de' MMMM", { locale: es })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-center gap-2">
                      <p
                        className="text-sm font-bold"
                        style={{ color: itemCurrency === 'USD' ? 'var(--accent-green)' : 'var(--accent-red)' }}
                      >
                        {formatCurrency(displayAmount, itemCurrency)}
                      </p>
                      {!selectionMode && (
                        <svg className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Acciones en footer */}
          <div
            className="px-4 py-4 safe-area-bottom flex gap-2"
            style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}
          >
            {/* Botón Agregar Gasto */}
            <button
              onClick={handleAddExpenseToStatement}
              className="py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent-red)', color: 'white' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            {/* Botón Impuesto de Sellos */}
            {!viewingStatement.hasTax && (
              <button
                onClick={() => {
                  openTaxModal(viewingStatement);
                  setViewingStatement(null);
                }}
                className="py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-yellow)' }}
                title="Agregar Impuesto de Sellos"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </button>
            )}
            {/* Botón Adjuntos */}
            <button
              onClick={() => {
                openAttachmentsModal(viewingStatement);
              }}
              className="py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--accent-primary)' }}
              title="Adjuntos"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            {/* Botón Pagar Resumen */}
            <button
              onClick={() => {
                openPayModal(viewingStatement);
                setViewingStatement(null);
              }}
              className="flex-1 py-3 rounded-xl font-medium text-white transition-all duration-200 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--accent-green)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Pagar
            </button>
          </div>
        </div>
      )}
      {/* Modal - Adjuntos del Resumen */}
      <StatementAttachmentsModal
        isOpen={attachmentsModalOpen}
        onClose={() => {
          setAttachmentsModalOpen(false);
          setSelectedStatementForAttachments(null);
        }}
        statement={selectedStatementForAttachments}
        attachments={selectedStatementForAttachments ? statementAttachments[selectedStatementForAttachments.id] : null}
        onSave={handleSaveAttachments}
        onRemove={handleRemoveAttachment}
        saving={savingAttachment}
      />

      {/* Modal - Editar Movimiento */}
      {editingMovement && (
        <EditMovementModal
          movement={editingMovement}
          accounts={allAccounts}
          categories={allCategories}
          onSave={handleSaveMovement}
          onClose={() => setEditingMovement(null)}
          onConvertedToRecurring={() => fetchData(true, false)}
        />
      )}

      {/* Modal - Agregar Gasto al Resumen */}
      <NewMovementModal
        isOpen={showAddExpenseModal}
        onClose={() => {
          setShowAddExpenseModal(false);
          setAddExpensePrefill(null);
        }}
        prefillData={addExpensePrefill}
      />
    </div>
  );
}

export default CreditCards;
