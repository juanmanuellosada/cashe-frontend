import { supabase } from '../config/supabase';
import { uploadAttachment, uploadStatementAttachment, deleteAttachment } from './attachmentStorage';
import { getIconCatalogUrl } from '../hooks/useIconCatalog';
import { emit, DataEvents } from './dataEvents';

// ============================================
// CACHE MANAGEMENT (mantener compatibilidad)
// ============================================
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map();
const pendingRequests = new Map(); // Prevent duplicate concurrent requests

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, { data, timestamp: Date.now() });
};

// Wrapper to prevent duplicate concurrent requests
const withDeduplication = async (key, fetchFn) => {
  // Check cache first
  const cached = getCachedData(key);
  if (cached) return cached;
  
  // Check if request is already in flight
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }
  
  // Make the request and store the promise
  const promise = fetchFn().finally(() => {
    pendingRequests.delete(key);
  });
  
  pendingRequests.set(key, promise);
  return promise;
};

export const clearCache = () => {
  cache.clear();
  pendingRequests.clear();
};

const invalidateCache = (type) => {
  // Si type está vacío, limpiar todo
  if (!type) {
    cache.clear();
    pendingRequests.clear();
    emit(DataEvents.ALL_DATA_CHANGED);
    return;
  }

  const keysToDelete = [];
  for (const key of cache.keys()) {
    // Incluir 'accounts' porque los balances dependen de movimientos
    if (key.includes(type) || key.includes('dashboard') || key.includes('movements') || key.includes('income') || key.includes('expense') || key.includes('accounts')) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => cache.delete(key));

  // También limpiar pending requests relacionadas
  for (const key of pendingRequests.keys()) {
    if (!type || key.includes(type) || key.includes('dashboard') || key.includes('movements') || key.includes('income') || key.includes('expense') || key.includes('accounts')) {
      pendingRequests.delete(key);
    }
  }

  // Invalidar recentUsage cuando hay mutaciones de movimientos o transferencias (no para categorías)
  if (!type.includes('categor')) {
    cache.delete('recentUsage');
    pendingRequests.delete('recentUsage');
  }

  // Emitir evento según el tipo de datos invalidados
  if (type.includes('expense')) {
    emit(DataEvents.EXPENSES_CHANGED);
  } else if (type.includes('income')) {
    emit(DataEvents.INCOMES_CHANGED);
  } else if (type.includes('transfer')) {
    emit(DataEvents.TRANSFERS_CHANGED);
  } else if (type.includes('account')) {
    emit(DataEvents.ACCOUNTS_CHANGED);
  } else if (type.includes('categor')) {
    emit(DataEvents.CATEGORIES_CHANGED);
  } else {
    // Para otros tipos, emitir evento general
    emit(DataEvents.ALL_DATA_CHANGED);
  }
};

// ============================================
// HELPER: Get current user ID
// ============================================
const getUserId = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    throw new Error('Error getting authenticated user');
  }
  if (!user) {
    throw new Error('No authenticated user');
  }
  return user.id;
};

// ============================================
// RECENT USAGE TRACKING
// ============================================
// Obtiene las cuentas y categorías usadas recientemente para ordenar selectores
export const getRecentUsage = () => withDeduplication('recentUsage', async () => {
  const userId = await getUserId();

  // Obtener últimos 50 movimientos (cubren ~1-2 meses de uso activo)
  const { data: recentMovements } = await supabase
    .from('movements')
    .select('account_id, category_id, date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(50);

  // Obtener últimas 20 transferencias
  const { data: recentTransfers } = await supabase
    .from('transfers')
    .select('from_account_id, to_account_id, date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(20);

  // Construir mapa de última fecha de uso por account_id
  const accountLastUsed = new Map();
  const categoryLastUsed = new Map();

  (recentMovements || []).forEach(m => {
    if (m.account_id && !accountLastUsed.has(m.account_id)) {
      accountLastUsed.set(m.account_id, m.date);
    }
    if (m.category_id && !categoryLastUsed.has(m.category_id)) {
      categoryLastUsed.set(m.category_id, m.date);
    }
  });

  (recentTransfers || []).forEach(t => {
    if (t.from_account_id && !accountLastUsed.has(t.from_account_id)) {
      accountLastUsed.set(t.from_account_id, t.date);
    }
    if (t.to_account_id && !accountLastUsed.has(t.to_account_id)) {
      accountLastUsed.set(t.to_account_id, t.date);
    }
  });

  // Convertir a arrays ordenados (más reciente primero)
  const recentAccountIds = [...accountLastUsed.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([id]) => id);

  const recentCategoryIds = [...categoryLastUsed.entries()]
    .sort((a, b) => b[1].localeCompare(a[1]))
    .map(([id]) => id);

  const result = { recentAccountIds, recentCategoryIds };
  setCachedData('recentUsage', result);
  return result;
});

// ============================================
// ACCOUNT TYPE MAPPING
// ============================================
// Los tipos de cuenta se guardan en español directamente en la DB
const accountTypeToDb = (tipo) => {
  // Mapear nombres de UI a nombres de DB (son iguales, pero normalizamos)
  const validTypes = [
    'Caja de ahorro',
    'Cuenta corriente',
    'Efectivo',
    'Inversión',
    'Tarjeta de crédito',
    'Billetera virtual',
    'Otro'
  ];
  
  // Si el tipo es válido, usarlo directamente
  if (validTypes.includes(tipo)) {
    return tipo;
  }
  
  // Mapeo de nombres alternativos
  const map = {
    'Inversiones': 'Inversión',
  };
  
  return map[tipo] || 'Caja de ahorro';
};

const accountTypeFromDb = (type) => {
  // Los tipos ya están en español, solo retornar
  return type || 'Caja de ahorro';
};

// ============================================
// ACCOUNTS
// ============================================
export const getAccounts = () => withDeduplication('accounts', async () => {
  const userId = await getUserId();

  // Fetch accounts and balances in parallel (2 queries instead of 4*N)
  const [{ data: accounts, error: accountsError }, { data: balances, error: balancesError }] = await Promise.all([
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('name'),
    supabase.rpc('get_account_balances', { p_user_id: userId })
  ]);

  if (accountsError) throw accountsError;
  if (balancesError) throw balancesError;

  // If no accounts, return empty immediately
  if (!accounts || accounts.length === 0) {
    const result = { accounts: [] };
    setCachedData('accounts', result);
    return result;
  }

  // Create a map of balances by account_id for O(1) lookup
  const balanceMap = new Map();
  (balances || []).forEach(b => {
    balanceMap.set(b.account_id, {
      balance: parseFloat(b.balance) || 0,
      totalIngresos: parseFloat(b.total_incomes) || 0,
      totalGastos: parseFloat(b.total_expenses) || 0,
      totalTransfEntrantes: parseFloat(b.total_transfers_in) || 0,
      totalTransfSalientes: parseFloat(b.total_transfers_out) || 0,
    });
  });

  // Get credit card data for accounts that need it (parallel)
  const creditCardAccounts = accounts.filter(a => a.is_credit_card);
  const creditCardDataMap = new Map();

  if (creditCardAccounts.length > 0) {
    const creditCardPromises = creditCardAccounts.map(async (account) => {
      const nextStatement = await calculateCreditCardNextStatement(account.id, account.closing_day, account.due_day);
      return { accountId: account.id, data: nextStatement };
    });
    const creditCardResults = await Promise.all(creditCardPromises);
    creditCardResults.forEach(({ accountId, data }) => {
      creditCardDataMap.set(accountId, {
        proximoResumenPesos: data.proximoResumenPesos,
        proximoResumenDolares: data.proximoResumenDolares,
        promedioMensual: data.promedioMensual,
        // Data for due date alerts
        resumenVencePesos: data.resumenVencePesos,
        resumenVenceDolares: data.resumenVenceDolares,
        resumenVencePagado: data.resumenVencePagado,
        resumenVencePeriodo: data.resumenVencePeriodo,
      });
    });
  }

  // Map accounts with their balances
  const accountsWithBalances = accounts.map((account) => {
    const balanceData = balanceMap.get(account.id) || {
      balance: parseFloat(account.initial_balance) || 0,
      totalIngresos: 0,
      totalGastos: 0,
      totalTransfEntrantes: 0,
      totalTransfSalientes: 0,
    };
    const creditCardData = creditCardDataMap.get(account.id) || {};

    return {
      id: account.id,
      nombre: account.name,
      moneda: account.currency === 'ARS' ? 'Peso' : 'Dólar',
      balanceInicial: account.initial_balance,
      numeroCuenta: account.account_number || '',
      tipo: accountTypeFromDb(account.account_type),
      esTarjetaCredito: account.is_credit_card,
      diaCierre: account.closing_day,
      diaVencimiento: account.due_day,
      balanceActual: balanceData.balance,
      totalIngresos: balanceData.totalIngresos,
      totalGastos: balanceData.totalGastos,
      totalTransfEntrantes: balanceData.totalTransfEntrantes,
      totalTransfSalientes: balanceData.totalTransfSalientes,
      icon: account.icon || null,
      ocultaDelBalance: account.hidden_from_balance || false,
      ...creditCardData,
      // Keep original fields too
      ...account
    };
  });

  const result = { accounts: accountsWithBalances };
  setCachedData('accounts', result);
  return result;
});

// Calculate next statement balance for credit cards (separated by currency)
// Returns:
// - proximoResumenPesos/Dolares: first UNPAID statement amounts
// - resumenVencePesos/Dolares: amounts for the statement that's due now (for due alerts)
// - resumenVencePagado: whether the due statement is fully paid
const calculateCreditCardNextStatement = async (accountId, closingDay, dueDay) => {
  const userId = await getUserId();
  const diaCierre = closingDay || 1;

  // Get all expenses for this credit card
  const { data: expenses } = await supabase
    .from('movements')
    .select('amount, date, original_currency')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('type', 'expense');

  if (!expenses || expenses.length === 0) {
    return {
      proximoResumenPesos: 0,
      proximoResumenDolares: 0,
      promedioMensual: 0,
      resumenVencePesos: 0,
      resumenVenceDolares: 0,
      resumenVencePagado: false,
    };
  }

  // Get existing payments for this credit card
  const { data: payments } = await supabase
    .from('statement_payments')
    .select('statement_period, currency')
    .eq('user_id', userId)
    .eq('account_id', accountId);

  // Create a set of paid period+currency combos for fast lookup
  const paidSet = new Set();
  (payments || []).forEach(p => {
    paidSet.add(`${p.statement_period}_${p.currency}`);
  });

  // Calculate current statement period (the one we're accumulating now)
  const today = new Date();
  const currentDay = today.getDate();
  let statementYear = today.getFullYear();
  let statementMonth = today.getMonth();

  // If we're past the closing day, we're in the next month's statement
  if (currentDay >= diaCierre) {
    statementMonth += 1;
    if (statementMonth > 11) {
      statementMonth = 0;
      statementYear += 1;
    }
  }

  // Function to get statement period for a date
  // Format: "YYYY-MM" (1-indexed month with zero padding) to match CreditCards.jsx
  const getStatementPeriod = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    let year = d.getFullYear();
    let month = d.getMonth();

    if (day >= diaCierre) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    // Convert to 1-indexed and pad with zero
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  };

  // Group expenses by period
  const expensesByPeriod = {};
  const expensesByMonth = {};

  expenses.forEach(expense => {
    const period = getStatementPeriod(expense.date);
    const amount = parseFloat(expense.amount);
    const currency = expense.original_currency === 'USD' ? 'USD' : 'ARS';

    // Group by period and currency
    if (!expensesByPeriod[period]) {
      expensesByPeriod[period] = { ARS: 0, USD: 0 };
    }
    expensesByPeriod[period][currency] += amount;

    // For monthly average (group by month)
    const expenseDate = new Date(expense.date);
    const monthKey = `${expenseDate.getFullYear()}-${expenseDate.getMonth()}`;
    if (!expensesByMonth[monthKey]) {
      expensesByMonth[monthKey] = 0;
    }
    expensesByMonth[monthKey] += amount;
  });

  // Calculate monthly average
  const months = Object.keys(expensesByMonth);
  const totalAllMonths = Object.values(expensesByMonth).reduce((sum, val) => sum + val, 0);
  const promedioMensual = months.length > 0 ? totalAllMonths / months.length : 0;

  // Calculate the "due" period (the one that's due now/soon, previous to current)
  // This is the statement that closed and is now due for payment
  let dueYear = statementYear;
  let dueMonth = statementMonth - 1;
  if (dueMonth < 0) {
    dueMonth = 11;
    dueYear -= 1;
  }
  const duePeriod = `${dueYear}-${String(dueMonth + 1).padStart(2, '0')}`;

  // Get due period data
  const dueExpenses = expensesByPeriod[duePeriod] || { ARS: 0, USD: 0 };
  const dueArsPaid = paidSet.has(`${duePeriod}_ARS`);
  const dueUsdPaid = paidSet.has(`${duePeriod}_USD`);
  const resumenVencePagado = (dueExpenses.ARS === 0 || dueArsPaid) && (dueExpenses.USD === 0 || dueUsdPaid);

  // Sort periods chronologically
  const sortedPeriods = Object.keys(expensesByPeriod).sort((a, b) => {
    const [yearA, monthA] = a.split('-').map(Number);
    const [yearB, monthB] = b.split('-').map(Number);
    if (yearA !== yearB) return yearA - yearB;
    return monthA - monthB;
  });

  // Find first period that has unpaid amounts (for "próximo resumen" display)
  let proximoResumenPesos = 0;
  let proximoResumenDolares = 0;
  let statementPeriod = null;

  for (const period of sortedPeriods) {
    const periodExpenses = expensesByPeriod[period];
    const arsTotal = periodExpenses.ARS || 0;
    const usdTotal = periodExpenses.USD || 0;

    const arsPaid = paidSet.has(`${period}_ARS`);
    const usdPaid = paidSet.has(`${period}_USD`);

    // If this period has any unpaid amount, use it
    const unpaidARS = arsPaid ? 0 : arsTotal;
    const unpaidUSD = usdPaid ? 0 : usdTotal;

    if (unpaidARS > 0 || unpaidUSD > 0) {
      proximoResumenPesos = unpaidARS;
      proximoResumenDolares = unpaidUSD;
      statementPeriod = period;
      break;
    }
  }

  // If no unpaid period found, use current period
  if (!statementPeriod) {
    const currentPeriod = `${statementYear}-${String(statementMonth + 1).padStart(2, '0')}`;
    const currentExpenses = expensesByPeriod[currentPeriod] || { ARS: 0, USD: 0 };
    proximoResumenPesos = currentExpenses.ARS || 0;
    proximoResumenDolares = currentExpenses.USD || 0;
    statementPeriod = currentPeriod;
  }

  return {
    proximoResumenPesos,
    proximoResumenDolares,
    promedioMensual,
    statementPeriod,
    // Data for the statement that's due now (for due alerts)
    resumenVencePesos: dueExpenses.ARS || 0,
    resumenVenceDolares: dueExpenses.USD || 0,
    resumenVencePagado,
    resumenVencePeriodo: duePeriod,
  };
};

export const addAccount = async ({ nombre, balanceInicial, moneda, numeroCuenta, tipo, esTarjetaCredito, diaCierre, diaVencimiento, icon, ocultaDelBalance }) => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: userId,
      name: nombre,
      initial_balance: balanceInicial || 0,
      currency: moneda === 'Peso' ? 'ARS' : 'USD',
      account_number: numeroCuenta || null,
      account_type: accountTypeToDb(tipo),
      is_credit_card: esTarjetaCredito || false,
      closing_day: diaCierre || null,
      due_day: diaVencimiento || null,
      icon: icon || null,
      hidden_from_balance: ocultaDelBalance || false
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('accounts');
  return { success: true, account: data };
};

export const updateAccount = async ({ id, rowIndex, nombre, balanceInicial, moneda, numeroCuenta, tipo, esTarjetaCredito, diaCierre, diaVencimiento, icon, ocultaDelBalance }) => {
  const accountId = id || rowIndex;
  if (!accountId) {
    throw new Error('No se encontró el id de la cuenta para actualizar.');
  }
  const { data, error } = await supabase
    .from('accounts')
    .update({
      name: nombre,
      initial_balance: balanceInicial || 0,
      currency: moneda === 'Peso' ? 'ARS' : 'USD',
      account_number: numeroCuenta || null,
      account_type: accountTypeToDb(tipo),
      is_credit_card: esTarjetaCredito || false,
      closing_day: diaCierre || null,
      due_day: diaVencimiento || null,
      icon: icon || null,
      hidden_from_balance: ocultaDelBalance || false
    })
    .eq('id', accountId)
    .select()
    .single();

  if (error) throw error;
  invalidateCache('accounts');
  return { success: true, account: data };
};

/**
 * Elimina todos los adjuntos asociados a una cuenta
 * Llamar ANTES de eliminar la cuenta
 */
const deleteAccountAttachments = async (accountId) => {
  const userId = await getUserId();

  // 1. Eliminar adjuntos de movimientos de esta cuenta
  const { data: movements } = await supabase
    .from('movements')
    .select('attachment_url')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .not('attachment_url', 'is', null);

  for (const m of (movements || [])) {
    if (m.attachment_url) {
      await deleteAttachment(m.attachment_url);
    }
  }

  // 2. Eliminar adjuntos de transferencias (from y to)
  const { data: transfersFrom } = await supabase
    .from('transfers')
    .select('attachment_url')
    .eq('user_id', userId)
    .eq('from_account_id', accountId)
    .not('attachment_url', 'is', null);

  const { data: transfersTo } = await supabase
    .from('transfers')
    .select('attachment_url')
    .eq('user_id', userId)
    .eq('to_account_id', accountId)
    .not('attachment_url', 'is', null);

  for (const t of [...(transfersFrom || []), ...(transfersTo || [])]) {
    if (t.attachment_url) {
      await deleteAttachment(t.attachment_url);
    }
  }

  // 3. Eliminar adjuntos de resúmenes de tarjeta
  const { data: statements } = await supabase
    .from('card_statement_attachments')
    .select('statement_url, receipt_url')
    .eq('user_id', userId)
    .eq('account_id', accountId);

  for (const s of (statements || [])) {
    if (s.statement_url) await deleteAttachment(s.statement_url);
    if (s.receipt_url) await deleteAttachment(s.receipt_url);
  }
};

export const deleteAccount = async (idOrRowIndex) => {
  // Eliminar adjuntos primero
  await deleteAccountAttachments(idOrRowIndex);

  const { error } = await supabase
    .from('accounts')
    .delete()
    .eq('id', idOrRowIndex);

  if (error) throw error;
  invalidateCache('accounts');
  return { success: true };
};

export const bulkDeleteAccounts = async (accounts) => {
  const ids = accounts.map(a => a.id).filter(Boolean);
  if (ids.length === 0) return { success: true };

  // Eliminar adjuntos de cada cuenta
  for (const id of ids) {
    await deleteAccountAttachments(id);
  }

  const { error } = await supabase
    .from('accounts')
    .delete()
    .in('id', ids);

  if (error) throw error;
  invalidateCache('accounts');
  return { success: true };
};

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

export const getNotificationPreferences = async () => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // If no preferences exist yet, return defaults
    if (error.code === 'PGRST116') {
      return {
        notifyPush: true,
        notifyTelegram: false,
        notifyWhatsapp: false,
        notificationHour: 9,
      };
    }
    throw error;
  }

  return {
    notifyPush: data.notify_push ?? true,
    notifyTelegram: data.notify_telegram ?? false,
    notifyWhatsapp: data.notify_whatsapp ?? false,
    notificationHour: data.notification_hour ?? 9,
  };
};

export const updateNotificationPreferences = async ({ notifyPush, notifyTelegram, notifyWhatsapp, notificationHour }) => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('notification_preferences')
    .upsert({
      user_id: userId,
      notify_push: notifyPush ?? true,
      notify_telegram: notifyTelegram ?? false,
      notify_whatsapp: notifyWhatsapp ?? false,
      notification_hour: notificationHour ?? 9,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) throw error;
  return { success: true, preferences: data };
};

// ============================================
// CATEGORIES
// ============================================

// Helper to extract emoji from the start of a string
const extractLeadingEmoji = (str) => {
  if (!str) return null;
  // Match emoji at the start of the string (including compound emojis with ZWJ)
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(\u200D(\p{Emoji_Presentation}|\p{Emoji}\uFE0F))*/u;
  const match = str.match(emojiRegex);
  return match ? match[0] : null;
};

export const getCategories = () => withDeduplication('categories', async () => {
  const userId = await getUserId();

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*, icon_catalog:icon_catalog_id(id, name, filename)')
    .eq('user_id', userId)
    .order('name');

  if (error) throw error;

  const mapCategory = (c) => {
    // If there's a catalog icon, use it
    const hasCatalogIcon = c.icon_catalog && c.icon_catalog.filename;
    // If there's a custom icon (URL), use it
    // Otherwise, try to extract an emoji from the name
    const customIcon = c.icon || null;
    const emojiFromName = (!customIcon && !hasCatalogIcon) ? extractLeadingEmoji(c.name) : null;

    // If we're using an emoji from the name as icon, remove it from the label
    let displayLabel = c.name;
    if (emojiFromName && !customIcon && !hasCatalogIcon) {
      displayLabel = c.name.slice(emojiFromName.length).trim();
    }

    // For Combobox compatibility: set icon to catalog URL if available
    const resolvedIcon = hasCatalogIcon
      ? getIconCatalogUrl(c.icon_catalog.filename)
      : (customIcon || emojiFromName);

    return {
      id: c.id,  // Include ID for recent usage sorting
      value: c.name,  // Keep original name as value for saving
      label: displayLabel,  // Clean label for display
      icon: resolvedIcon,
      icon_catalog: hasCatalogIcon ? c.icon_catalog : null,
      icon_catalog_id: c.icon_catalog_id || null,
    };
  };

  const ingresos = (categories || [])
    .filter(c => c.type === 'income')
    .map(mapCategory);

  const gastos = (categories || [])
    .filter(c => c.type === 'expense')
    .map(mapCategory);

  const result = { categorias: { ingresos, gastos } };
  setCachedData('categories', result);
  return result;
});
export const getCategoriesWithId = async () => {
  const cacheKey = 'categoriesWithId';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  const userId = await getUserId();

  const { data: categories, error } = await supabase
    .from('categories')
    .select('*, icon_catalog:icon_catalog_id(id, name, filename)')
    .eq('user_id', userId)
    .order('name');

  if (error) throw error;

  const result = {
    categorias: categories.map(c => ({
      id: c.id,
      rowIndex: c.id, // compatibility
      nombre: c.name,
      tipo: c.type === 'income' ? 'Ingreso' : 'Gasto',
      icon: c.icon || null,
      icon_catalog_id: c.icon_catalog_id || null,
      icon_catalog: (c.icon_catalog && c.icon_catalog.filename) ? c.icon_catalog : null,
    }))
  };
  setCachedData(cacheKey, result);
  return result;
};

export const addCategory = async ({ nombre, tipo, icon, icon_catalog_id }) => {
  const userId = await getUserId();

  // Normalizar el tipo a income/expense
  const normalizedType = tipo.toLowerCase().includes('ingreso') || tipo.toLowerCase() === 'income'
    ? 'income'
    : 'expense';

  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: nombre,
      type: normalizedType,
      icon: icon || null,
      icon_catalog_id: icon_catalog_id || null,
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('categories');
  emit(DataEvents.CATEGORIES_CHANGED);
  return { success: true, category: data };
};

export const updateCategory = async ({ id, rowIndex, nombre, tipo, icon, icon_catalog_id }) => {
  const categoryId = id || rowIndex;
  const { data, error } = await supabase
    .from('categories')
    .update({
      name: nombre,
      type: tipo === 'Ingreso' ? 'income' : 'expense',
      icon: icon !== undefined ? icon : null,
      icon_catalog_id: icon_catalog_id || null,
    })
    .eq('id', categoryId)
    .select()
    .single();

  if (error) throw error;
  invalidateCache('categories');
  emit(DataEvents.CATEGORIES_CHANGED);
  return { success: true, category: data };
};

export const deleteCategory = async (idOrRowIndex) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', idOrRowIndex);

  if (error) throw error;
  invalidateCache('categories');
  emit(DataEvents.CATEGORIES_CHANGED);
  return { success: true };
};

export const bulkDeleteCategories = async (categoryIds) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .in('id', categoryIds);

  if (error) throw error;
  invalidateCache('categories');
  emit(DataEvents.CATEGORIES_CHANGED);
  return { success: true };
};

// ============================================
// MOVEMENTS (Incomes & Expenses)
// ============================================
const mapMovementFromDB = (m, accounts, categories) => {
  const account = accounts?.find(a => a.id === m.account_id);
  const category = categories?.find(c => c.id === m.category_id);
  const amount = parseFloat(m.amount);
  const isUSD = m.original_currency === 'USD';

  return {
    id: m.id,
    rowIndex: m.id, // compatibility
    fecha: m.date,
    monto: amount,
    // Montos separados por moneda para tarjetas de crédito
    montoPesos: isUSD ? 0 : amount,
    montoDolares: isUSD ? amount : 0,
    monedaOriginal: m.original_currency || 'ARS',
    cuenta: account?.name || '',
    categoria: category?.name || '',
    nota: m.note || '',
    tipo: m.type === 'income' ? 'ingreso' : 'gasto',
    accountId: m.account_id,
    categoryId: m.category_id,
    // Installment info
    idCompra: m.installment_purchase_id,
    cuota: m.installment_number && m.total_installments
      ? `${m.installment_number}/${m.total_installments}`
      : null,
    // Attachment info
    attachmentUrl: m.attachment_url,
    attachmentName: m.attachment_name,
    // Future transaction indicator
    isFuture: m.is_future || false,
    // Recurring indicator
    isRecurring: !!m.recurring_occurrence_id,
    recurringOccurrenceId: m.recurring_occurrence_id,
  };
};

export const getExpenses = async (forceRefresh = false) => {
  const cacheKey = 'expenses';
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
  }

  const userId = await getUserId();
  
  const [{ data: movements }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from('movements')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .order('date', { ascending: false }),
    supabase.from('accounts').select('id, name').eq('user_id', userId),
    supabase.from('categories').select('id, name').eq('user_id', userId)
  ]);

  const result = {
    gastos: (movements || []).map(m => mapMovementFromDB(m, accounts, categories))
  };
  setCachedData(cacheKey, result);
  return result;
};

export const getIncomes = async (forceRefresh = false) => {
  const cacheKey = 'incomes';
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
  }

  const userId = await getUserId();
  
  const [{ data: movements }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from('movements')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'income')
      .order('date', { ascending: false }),
    supabase.from('accounts').select('id, name').eq('user_id', userId),
    supabase.from('categories').select('id, name').eq('user_id', userId)
  ]);

  const result = {
    ingresos: (movements || []).map(m => mapMovementFromDB(m, accounts, categories))
  };
  setCachedData(cacheKey, result);
  return result;
};

export const addExpense = async ({ fecha, monto, cuenta, categoria, nota, attachment, moneda }) => {
  const userId = await getUserId();

  // Get account and category IDs - include is_credit_card to check for future transactions
  const { data: account } = await supabase
    .from('accounts')
    .select('id, is_credit_card')
    .eq('user_id', userId)
    .eq('name', cuenta)
    .single();

  // Buscar categoría - primero intento exacto, luego fallback
  let categoryData = null;
  const { data: exactMatch, error: exactError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .eq('name', categoria)
    .single();

  if (exactMatch) {
    categoryData = exactMatch;
  } else {
    // Fallback: buscar con ilike para manejar diferencias de espacios o case
    const { data: fuzzyMatch } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${categoria}%`)
      .limit(1)
      .single();

    if (fuzzyMatch) {
      categoryData = fuzzyMatch;
    } else {
      console.warn('No category found for:', categoria);
    }
  }

  // Subir adjunto si existe
  let attachmentUrl = null;
  let attachmentName = null;

  if (attachment) {
    const result = await uploadAttachment(attachment, userId, 'movements');
    attachmentUrl = result.url;
    attachmentName = result.name;
  }

  // Determinar si es transacción futura
  // Solo si: fecha > hoy Y cuenta NO es tarjeta de crédito
  const today = new Date().toISOString().split('T')[0];
  const isFuture = fecha > today && !account?.is_credit_card;

  // Determinar la moneda original del gasto
  // Solo guardar si es tarjeta de crédito y se especificó moneda
  const originalCurrency = account?.is_credit_card && moneda ? moneda : null;

  const { data, error } = await supabase
    .from('movements')
    .insert({
      user_id: userId,
      type: 'expense',
      date: fecha,
      amount: monto,
      account_id: account?.id,
      category_id: categoryData?.id,
      note: nota || null,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      is_future: isFuture,
      original_currency: originalCurrency,
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('expense');
  return { success: true, movement: data };
};

export const addIncome = async ({ fecha, monto, cuenta, categoria, nota, attachment }) => {
  const userId = await getUserId();

  const { data: account } = await supabase
    .from('accounts')
    .select('id, is_credit_card')
    .eq('user_id', userId)
    .eq('name', cuenta)
    .single();

  // Buscar categoría - primero intento exacto, luego fallback
  let categoryData = null;
  const { data: exactMatch, error: exactError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .eq('name', categoria)
    .single();

  if (exactMatch) {
    categoryData = exactMatch;
  } else {
    // Fallback: buscar con ilike para manejar diferencias de espacios o case
    const { data: fuzzyMatch } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${categoria}%`)
      .limit(1)
      .single();

    if (fuzzyMatch) {
      categoryData = fuzzyMatch;
    } else {
      console.warn('No category found for:', categoria);
    }
  }

  // Subir adjunto si existe
  let attachmentUrl = null;
  let attachmentName = null;

  if (attachment) {
    const result = await uploadAttachment(attachment, userId, 'movements');
    attachmentUrl = result.url;
    attachmentName = result.name;
  }

  // Determinar si es transacción futura
  // Solo si: fecha > hoy Y cuenta NO es tarjeta de crédito
  const today = new Date().toISOString().split('T')[0];
  const isFuture = fecha > today && !account?.is_credit_card;

  const { data, error } = await supabase
    .from('movements')
    .insert({
      user_id: userId,
      type: 'income',
      date: fecha,
      amount: monto,
      account_id: account?.id,
      category_id: categoryData?.id,
      note: nota || null,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      is_future: isFuture,
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('income');
  return { success: true, movement: data };
};

export const updateMovement = async (movement) => {
  const userId = await getUserId();

  // Usar accountId directamente si está disponible, fallback a búsqueda por nombre
  let accountId = movement.accountId;
  if (!accountId && movement.cuenta) {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', movement.cuenta);
    accountId = accounts?.[0]?.id;
  }

  // Usar categoryId directamente si está disponible, fallback a búsqueda por nombre
  let categoryId = movement.categoryId;
  if (!categoryId && movement.categoria) {
    const { data: categories } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', movement.categoria);
    categoryId = categories?.[0]?.id || null;
  }

  const id = movement.id || movement.rowIndex;

  // Manejar adjuntos
  let attachmentUrl = movement.attachmentUrl;
  let attachmentName = movement.attachmentName;

  // Si hay nuevo archivo, subir
  if (movement.newAttachment) {
    // Eliminar adjunto anterior si existe
    if (movement.attachmentUrl) {
      await deleteAttachment(movement.attachmentUrl);
    }
    const result = await uploadAttachment(movement.newAttachment, userId, 'movements');
    attachmentUrl = result.url;
    attachmentName = result.name;
  }

  // Si se marcó para eliminar
  if (movement.removeAttachment) {
    if (movement.attachmentUrl) {
      await deleteAttachment(movement.attachmentUrl);
    }
    attachmentUrl = null;
    attachmentName = null;
  }

  // Redondear monto a 2 decimales para evitar errores de precisión de punto flotante
  const roundedAmount = typeof movement.monto === 'number'
    ? Math.round(movement.monto * 100) / 100
    : movement.monto;

  const updatePayload = {
    date: movement.fecha,
    amount: roundedAmount,
    account_id: accountId,
    category_id: categoryId,
    note: movement.nota || null,
    attachment_url: attachmentUrl,
    attachment_name: attachmentName,
    // Guardar moneda original si se especifica (para tarjetas de crédito)
    ...(movement.moneda && { original_currency: movement.moneda }),
  };

  const { data, error } = await supabase
    .from('movements')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // Si se pidió aplicar a cuotas siguientes
  if (movement.applyToSubsequent) {
    try {
      await updateSubsequentInstallments({
        ...movement,
        accountId,
        categoryId,
      });
    } catch (err) {
      console.error('Error updating subsequent installments:', err);
      // No lanzar error, el movimiento principal ya se actualizó
    }
  }

  invalidateCache('movements');
  return { success: true, movement: data };
};

export const deleteMovement = async (movement) => {
  const id = movement.id || movement.rowIndex;

  // Eliminar adjunto si existe
  if (movement.attachmentUrl) {
    await deleteAttachment(movement.attachmentUrl);
  }

  const { error } = await supabase
    .from('movements')
    .delete()
    .eq('id', id);

  if (error) throw error;
  invalidateCache('movements');
  return { success: true };
};

export const deleteMultipleMovements = async (movements) => {
  const ids = movements.map(m => m.id || m.rowIndex);

  // Eliminar adjuntos de los movimientos que los tengan
  const deletePromises = movements
    .filter(m => m.attachmentUrl)
    .map(m => deleteAttachment(m.attachmentUrl));

  await Promise.all(deletePromises);

  const { error } = await supabase
    .from('movements')
    .delete()
    .in('id', ids);

  if (error) throw error;
  invalidateCache('movements');
  return { success: true };
};

export const updateMultipleMovements = async (movements, field, value) => {
  const userId = await getUserId();
  const ids = movements.map(m => m.id || m.rowIndex);
  
  let updateData = {};
  
  if (field === 'cuenta') {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', value)
      .single();
    updateData.account_id = account?.id;
  } else if (field === 'categoria') {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', value)
      .single();
    updateData.category_id = category?.id;
  } else if (field === 'nota') {
    updateData.note = value;
  } else if (field === 'fecha') {
    updateData.date = value;
  }

  const { error } = await supabase
    .from('movements')
    .update(updateData)
    .in('id', ids);

  if (error) throw error;
  invalidateCache('movements');
  return { success: true };
};

/**
 * Update subsequent installments of a purchase
 * Updates all installments with number > current installment number
 * @param {Object} movement - The movement that was edited (contains idCompra, cuota info)
 */
export const updateSubsequentInstallments = async (movement) => {
  const userId = await getUserId();
  const purchaseId = movement.idCompra || movement.installment_purchase_id;

  if (!purchaseId) {
    console.warn('No purchase ID found for installment update');
    return { success: false };
  }

  // Parse current installment number from cuota string (e.g., "2/6" -> 2)
  let currentNumber = 1;
  if (movement.cuota) {
    const match = movement.cuota.match(/^(\d+)/);
    if (match) currentNumber = parseInt(match[1]);
  } else if (movement.installment_number) {
    currentNumber = movement.installment_number;
  }

  // Get all subsequent installments (number > currentNumber)
  const { data: subsequentMovements, error: fetchError } = await supabase
    .from('movements')
    .select('id')
    .eq('user_id', userId)
    .eq('installment_purchase_id', purchaseId)
    .gt('installment_number', currentNumber);

  if (fetchError) throw fetchError;
  if (!subsequentMovements || subsequentMovements.length === 0) {
    return { success: true, updated: 0 };
  }

  const ids = subsequentMovements.map(m => m.id);

  // Build update payload with the same fields as the original movement
  let updateData = {};

  // Handle account - usar accountId directamente si está disponible
  if (movement.accountId) {
    updateData.account_id = movement.accountId;
  } else if (movement.cuenta) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', movement.cuenta)
      .single();
    if (account) updateData.account_id = account.id;
  }

  // Handle category - usar categoryId directamente si está disponible
  if (movement.categoryId) {
    updateData.category_id = movement.categoryId;
  } else if (movement.categoria) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', movement.categoria)
      .single();
    if (category) updateData.category_id = category.id;
  }

  // Handle amount (only if specified) - redondear a 2 decimales
  if (movement.monto !== undefined && movement.monto !== null) {
    updateData.amount = typeof movement.monto === 'number'
      ? Math.round(movement.monto * 100) / 100
      : movement.monto;
  }

  // Handle note
  if (movement.nota !== undefined) {
    updateData.note = movement.nota || null;
  }

  // Only update if there's something to update
  if (Object.keys(updateData).length === 0) {
    return { success: true, updated: 0 };
  }

  const { error: updateError } = await supabase
    .from('movements')
    .update(updateData)
    .in('id', ids);

  if (updateError) throw updateError;
  invalidateCache('movements');

  return { success: true, updated: ids.length };
};

// ============================================
// TRANSFERS
// ============================================
export const getTransfers = async (forceRefresh = false) => {
  const cacheKey = 'transfers';
  if (!forceRefresh) {
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
  }

  const userId = await getUserId();
  
  const [{ data: transfers }, { data: accounts }] = await Promise.all([
    supabase
      .from('transfers')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false }),
    supabase.from('accounts').select('id, name').eq('user_id', userId)
  ]);

  const result = {
    transferencias: (transfers || []).map(t => {
      const fromAccount = accounts?.find(a => a.id === t.from_account_id);
      const toAccount = accounts?.find(a => a.id === t.to_account_id);
      return {
        id: t.id,
        rowIndex: t.id,
        fecha: t.date,
        cuentaSaliente: fromAccount?.name || '',
        cuentaEntrante: toAccount?.name || '',
        fromAccountId: t.from_account_id,
        toAccountId: t.to_account_id,
        montoSaliente: parseFloat(t.from_amount),
        montoEntrante: parseFloat(t.to_amount),
        nota: t.note || '',
        tipo: 'transferencia',
        attachmentUrl: t.attachment_url,
        attachmentName: t.attachment_name,
        // Future transaction indicator
        isFuture: t.is_future || false,
        // Recurring indicator
        isRecurring: !!t.recurring_occurrence_id,
        recurringOccurrenceId: t.recurring_occurrence_id,
      };
    })
  };
  setCachedData(cacheKey, result);
  return result;
};

export const addTransfer = async ({ fecha, cuentaSaliente, cuentaEntrante, montoSaliente, montoEntrante, nota, attachment }) => {
  const userId = await getUserId();

  const { data: fromAccount } = await supabase
    .from('accounts')
    .select('id, is_credit_card')
    .eq('user_id', userId)
    .eq('name', cuentaSaliente)
    .single();

  const { data: toAccount } = await supabase
    .from('accounts')
    .select('id, is_credit_card')
    .eq('user_id', userId)
    .eq('name', cuentaEntrante)
    .single();

  // Subir adjunto si existe
  let attachmentUrl = null;
  let attachmentName = null;

  if (attachment) {
    const result = await uploadAttachment(attachment, userId, 'transfers');
    attachmentUrl = result.url;
    attachmentName = result.name;
  }

  // Determinar si es transacción futura
  // Solo si: fecha > hoy Y ninguna cuenta es tarjeta de crédito
  const today = new Date().toISOString().split('T')[0];
  const isFuture = fecha > today && !fromAccount?.is_credit_card && !toAccount?.is_credit_card;

  const { data, error } = await supabase
    .from('transfers')
    .insert({
      user_id: userId,
      date: fecha,
      from_account_id: fromAccount?.id,
      to_account_id: toAccount?.id,
      from_amount: montoSaliente,
      to_amount: montoEntrante,
      note: nota || null,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      is_future: isFuture,
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('transfer');
  return { success: true, transfer: data };
};

export const updateTransfer = async (transfer) => {
  const userId = await getUserId();

  // Usar fromAccountId directamente si está disponible, fallback a búsqueda por nombre
  let fromAccountId = transfer.fromAccountId;
  if (!fromAccountId && transfer.cuentaSaliente) {
    const { data: fromAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', transfer.cuentaSaliente)
      .single();
    fromAccountId = fromAccount?.id;
  }

  // Usar toAccountId directamente si está disponible, fallback a búsqueda por nombre
  let toAccountId = transfer.toAccountId;
  if (!toAccountId && transfer.cuentaEntrante) {
    const { data: toAccount } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', transfer.cuentaEntrante)
      .single();
    toAccountId = toAccount?.id;
  }

  const id = transfer.id || transfer.rowIndex;

  // Manejar adjuntos
  let attachmentUrl = transfer.attachmentUrl;
  let attachmentName = transfer.attachmentName;

  // Si hay nuevo archivo, subir
  if (transfer.newAttachment) {
    // Eliminar adjunto anterior si existe
    if (transfer.attachmentUrl) {
      await deleteAttachment(transfer.attachmentUrl);
    }
    const result = await uploadAttachment(transfer.newAttachment, userId, 'transfers');
    attachmentUrl = result.url;
    attachmentName = result.name;
  }

  // Si se marcó para eliminar
  if (transfer.removeAttachment) {
    if (transfer.attachmentUrl) {
      await deleteAttachment(transfer.attachmentUrl);
    }
    attachmentUrl = null;
    attachmentName = null;
  }

  const { data, error } = await supabase
    .from('transfers')
    .update({
      date: transfer.fecha,
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      from_amount: transfer.montoSaliente,
      to_amount: transfer.montoEntrante,
      note: transfer.nota || null,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  invalidateCache('transfer');
  return { success: true, transfer: data };
};

export const deleteTransfer = async (transfer) => {
  const id = transfer.id || transfer.rowIndex;

  // Eliminar adjunto si existe
  if (transfer.attachmentUrl) {
    await deleteAttachment(transfer.attachmentUrl);
  }

  const { error } = await supabase
    .from('transfers')
    .delete()
    .eq('id', id);

  if (error) throw error;
  invalidateCache('transfer');
  return { success: true };
};

// ============================================
// DASHBOARD
// ============================================
export const getDashboard = async () => {
  const userId = await getUserId();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  // Excluir transacciones futuras (is_future = true) del balance
  const [{ data: incomes }, { data: expenses }] = await Promise.all([
    supabase
      .from('movements')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'income')
      .or('is_future.is.null,is_future.eq.false')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth),
    supabase
      .from('movements')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .or('is_future.is.null,is_future.eq.false')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
  ]);

  const ingresosMes = (incomes || []).reduce((sum, m) => sum + parseFloat(m.amount), 0);
  const gastosMes = (expenses || []).reduce((sum, m) => sum + parseFloat(m.amount), 0);

  return {
    ingresosMes,
    gastosMes,
    balanceMes: ingresosMes - gastosMes
  };
};

export const getFilteredDashboard = async ({ startDate, endDate }) => {
  const userId = await getUserId();

  // Get exchange rate (auto-updates if stale)
  const exchangeData = await getExchangeRate();
  const tipoCambio = exchangeData.tipoCambio;

  // Get accounts with their currencies
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, currency')
    .eq('user_id', userId);

  const arsAccountIds = (accounts || []).filter(a => a.currency === 'ARS').map(a => a.id);
  const usdAccountIds = (accounts || []).filter(a => a.currency === 'USD').map(a => a.id);

  // Excluir transacciones futuras del balance
  const [{ data: incomes }, { data: expenses }] = await Promise.all([
    supabase
      .from('movements')
      .select('amount, account_id')
      .eq('user_id', userId)
      .eq('type', 'income')
      .or('is_future.is.null,is_future.eq.false')
      .gte('date', startDate)
      .lte('date', endDate),
    supabase
      .from('movements')
      .select('amount, account_id')
      .eq('user_id', userId)
      .eq('type', 'expense')
      .or('is_future.is.null,is_future.eq.false')
      .gte('date', startDate)
      .lte('date', endDate)
  ]);

  // Calculate totals by currency
  let ingresosMes = 0;
  let ingresosMesDolares = 0;
  let gastosMes = 0;
  let gastosMesDolares = 0;

  (incomes || []).forEach(m => {
    const amount = parseFloat(m.amount);
    if (usdAccountIds.includes(m.account_id)) {
      ingresosMesDolares += amount;
    } else {
      ingresosMes += amount;
    }
  });

  (expenses || []).forEach(m => {
    const amount = parseFloat(m.amount);
    if (usdAccountIds.includes(m.account_id)) {
      gastosMesDolares += amount;
    } else {
      gastosMes += amount;
    }
  });

  // Calculate totals (accounts balances would need separate query)
  // For now, return the income/expense totals
  return {
    ingresosMes,
    ingresosMesDolares,
    gastosMes,
    gastosMesDolares,
    balanceMes: ingresosMes - gastosMes,
    balanceMesDolares: ingresosMesDolares - gastosMesDolares,
    tipoCambio,
    // Total general needs account balances
    totalPesos: ingresosMes - gastosMes,
    totalDolares: ingresosMesDolares - gastosMesDolares,
    totalGeneralPesos: (ingresosMes - gastosMes) + ((ingresosMesDolares - gastosMesDolares) * tipoCambio),
    totalGeneralDolares: ((ingresosMes - gastosMes) / tipoCambio) + (ingresosMesDolares - gastosMesDolares),
  };
};

export const getRecentMovements = async (limit = 10) => {
  const userId = await getUserId();
  
  const [{ data: movements }, { data: transfers }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from('movements')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit),
    supabase
      .from('transfers')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit),
    supabase.from('accounts').select('id, name').eq('user_id', userId),
    supabase.from('categories').select('id, name').eq('user_id', userId)
  ]);

  const mappedMovements = (movements || []).map(m => mapMovementFromDB(m, accounts, categories));
  
  const mappedTransfers = (transfers || []).map(t => {
    const fromAccount = accounts?.find(a => a.id === t.from_account_id);
    const toAccount = accounts?.find(a => a.id === t.to_account_id);
    return {
      id: t.id,
      rowIndex: t.id,
      fecha: t.date,
      cuentaSaliente: fromAccount?.name || '',
      cuentaEntrante: toAccount?.name || '',
      montoSaliente: parseFloat(t.from_amount),
      montoEntrante: parseFloat(t.to_amount),
      monto: parseFloat(t.from_amount),
      nota: t.note || '',
      tipo: 'transferencia',
      // Future transaction indicator
      isFuture: t.is_future || false,
      // Recurring indicator
      isRecurring: !!t.recurring_occurrence_id,
      recurringOccurrenceId: t.recurring_occurrence_id,
    };
  });

  const all = [...mappedMovements, ...mappedTransfers]
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .slice(0, limit);

  return { movimientos: all };
};

// ============================================
// EXCHANGE RATE & USER SETTINGS
// ============================================

// Fetch live exchange rate from dolarapi.com
export const fetchLiveExchangeRate = async (tipo = 'oficial') => {
  try {
    const response = await fetch(`https://dolarapi.com/v1/dolares/${tipo}`);
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return {
      compra: data.compra,
      venta: data.venta,
      fecha: data.fechaActualizacion
    };
  } catch (error) {
    console.error('Error fetching live exchange rate:', error);
    return null;
  }
};

// Get all dollar rates
export const fetchAllDollarRates = async () => {
  try {
    const response = await fetch('https://dolarapi.com/v1/dolares');
    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return data; // Array with oficial, blue, bolsa, etc.
  } catch (error) {
    console.error('Error fetching dollar rates:', error);
    return null;
  }
};

export const getExchangeRate = async () => {
  const userId = await getUserId();

  // Request only existing columns to avoid 400s if the table is missing optional fields
  const { data, error } = await supabase
    .from('user_settings')
    .select('exchange_rate')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.warn('Could not fetch user_settings (exchange rate)', error.message);
  }

  // If no rate, refresh; otherwise keep existing value (timestamps not present in schema)
  const needsRefresh = !data?.exchange_rate;

  if (needsRefresh) {
    const liveRate = await fetchLiveExchangeRate('oficial');

    if (liveRate?.compra) {
      const { error: upsertError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          exchange_rate: liveRate.compra
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.warn('Could not upsert exchange rate', upsertError.message);
      }

      return {
        tipoCambio: liveRate.compra,
        tipoUsado: 'oficial',
        fechaActualizacion: liveRate.fecha,
        autoUpdated: true
      };
    }
  }

  return {
    tipoCambio: data?.exchange_rate || 1000,
    tipoUsado: 'oficial',
    fechaActualizacion: null,
    autoUpdated: false
  };
};

export const updateExchangeRate = async (rate) => {
  const userId = await getUserId();

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      exchange_rate: rate
    }, { onConflict: 'user_id' });

  if (error) throw error;
  return { success: true };
};

// Force refresh exchange rate from API
export const refreshExchangeRate = async (tipo = 'oficial') => {
  const userId = await getUserId();
  const liveRate = await fetchLiveExchangeRate(tipo);

  if (!liveRate?.compra) {
    throw new Error('No se pudo obtener el tipo de cambio');
  }

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      exchange_rate: liveRate.compra
    }, { onConflict: 'user_id' });

  if (error) throw error;

  return {
    tipoCambio: liveRate.compra,
    tipoUsado: 'oficial',
    fechaActualizacion: liveRate.fecha
  };
};

// ============================================
// FILTERED MOVEMENTS (client-side compatible)
// ============================================
export const getFilteredMovements = async ({ type, startDate, endDate, account, category }) => {
  const userId = await getUserId();
  
  let query = supabase
    .from('movements')
    .select('*')
    .eq('user_id', userId);

  if (type === 'ingreso') {
    query = query.eq('type', 'income');
  } else if (type === 'gasto') {
    query = query.eq('type', 'expense');
  }

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const [{ data: movements }, { data: accounts }, { data: categories }] = await Promise.all([
    query.order('date', { ascending: false }),
    supabase.from('accounts').select('id, name').eq('user_id', userId),
    supabase.from('categories').select('id, name').eq('user_id', userId)
  ]);

  let result = (movements || []).map(m => mapMovementFromDB(m, accounts, categories));

  // Client-side filtering for account and category names
  if (account) {
    result = result.filter(m => m.cuenta === account);
  }
  if (category) {
    result = result.filter(m => m.categoria === category);
  }

  return { movimientos: result };
};

// ============================================
// INSTALLMENTS (Cuotas)
// ============================================
export const addInstallmentPurchase = async ({ descripcion, montoTotal, cuotas, cuenta, categoria, fechaInicio, moneda }) => {
  const userId = await getUserId();

  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('name', cuenta)
    .single();

  const { data: categoryData } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .eq('name', categoria)
    .single();

  // Create the installment purchase record
  const { data: purchase, error: purchaseError } = await supabase
    .from('installment_purchases')
    .insert({
      user_id: userId,
      description: descripcion,
      total_amount: montoTotal,
      installments: cuotas,
      account_id: account?.id,
      category_id: categoryData?.id,
      start_date: fechaInicio
    })
    .select()
    .single();

  if (purchaseError) throw purchaseError;

  // Create individual movements for each installment
  const installmentAmount = montoTotal / cuotas;
  const movements = [];

  for (let i = 0; i < cuotas; i++) {
    const date = new Date(fechaInicio);
    date.setMonth(date.getMonth() + i);

    movements.push({
      user_id: userId,
      type: 'expense',
      date: date.toISOString().split('T')[0],
      amount: installmentAmount,
      account_id: account?.id,
      category_id: categoryData?.id,
      note: `${descripcion} - Cuota ${i + 1}/${cuotas}`,
      installment_purchase_id: purchase.id,
      installment_number: i + 1,
      total_installments: cuotas,
      // Guardar moneda original para tarjetas de crédito
      original_currency: moneda || null,
    });
  }

  const { error: movementsError } = await supabase
    .from('movements')
    .insert(movements);

  if (movementsError) throw movementsError;

  invalidateCache('expense');
  return { success: true, purchase, filasCreadas: cuotas };
};

export const getInstallmentsByPurchase = async (purchaseId) => {
  const userId = await getUserId();
  
  const { data, error } = await supabase
    .from('movements')
    .select('*')
    .eq('user_id', userId)
    .eq('installment_purchase_id', purchaseId)
    .order('installment_number');

  if (error) throw error;
  return { cuotas: data };
};

export const getPendingInstallments = async () => {
  const userId = await getUserId();
  const today = new Date().toISOString().split('T')[0];
  
  const [{ data: movements }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from('movements')
      .select('*')
      .eq('user_id', userId)
      .not('installment_purchase_id', 'is', null)
      .gte('date', today)
      .order('date'),
    supabase.from('accounts').select('id, name').eq('user_id', userId),
    supabase.from('categories').select('id, name').eq('user_id', userId)
  ]);

  return {
    cuotasPendientes: (movements || []).map(m => mapMovementFromDB(m, accounts, categories))
  };
};

export const deleteInstallmentPurchase = async (purchaseId) => {
  // Delete all movements associated with this purchase
  const { error: movementsError } = await supabase
    .from('movements')
    .delete()
    .eq('installment_purchase_id', purchaseId);

  if (movementsError) throw movementsError;

  // Delete the purchase record
  const { error: purchaseError } = await supabase
    .from('installment_purchases')
    .delete()
    .eq('id', purchaseId);

  if (purchaseError) throw purchaseError;

  invalidateCache('expense');
  return { success: true };
};

// ============================================
// INITIALIZATION - Create default categories for new users
// ============================================
export const initializeUserData = async () => {
  const userId = await getUserId();
  
  // Check if user already has categories
  const { data: existingCategories } = await supabase
    .from('categories')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (existingCategories && existingCategories.length > 0) {
    return; // Already initialized
  }

  // Default categories
  const defaultCategories = [
    // Income categories
    { name: '💼 Sueldo', type: 'income' },
    { name: '💰 Freelance', type: 'income' },
    { name: '📈 Inversiones', type: 'income' },
    { name: '🎁 Regalo', type: 'income' },
    { name: '📦 Otros ingresos', type: 'income' },
    // Expense categories
    { name: '🍔 Comida', type: 'expense' },
    { name: '🏠 Hogar', type: 'expense' },
    { name: '🚗 Transporte', type: 'expense' },
    { name: '🎬 Entretenimiento', type: 'expense' },
    { name: '🛒 Supermercado', type: 'expense' },
    { name: '💊 Salud', type: 'expense' },
    { name: '👕 Ropa', type: 'expense' },
    { name: '📱 Servicios', type: 'expense' },
    { name: '📦 Otros gastos', type: 'expense' },
  ];

  const categoriesWithUserId = defaultCategories.map(c => ({
    ...c,
    user_id: userId
  }));

  await supabase.from('categories').insert(categoriesWithUserId);

  // Create default settings
  await supabase.from('user_settings').insert({
    user_id: userId,
    default_currency: 'ARS',
    exchange_rate: 1000
  });
};

// ============================================
// ALIASES for backwards compatibility with sheetsApi
// ============================================
export const getAllExpenses = async (forceRefresh = false) => {
  const result = await getExpenses(forceRefresh);
  return { success: true, expenses: result.gastos };
};

export const getAllIncomes = async (forceRefresh = false) => {
  const result = await getIncomes(forceRefresh);
  return { success: true, incomes: result.ingresos };
};

export const getAllTransfers = async (forceRefresh = false) => {
  const result = await getTransfers(forceRefresh);
  return { success: true, transfers: result.transferencias };
};

export const getCategoriesAll = async () => {
  const result = await getCategoriesWithId();
  return { success: true, categories: result.categorias };
};

export const getDashboardFiltered = async ({ fromDate, toDate }) => {
  const result = await getFilteredDashboard({ 
    startDate: fromDate, 
    endDate: toDate 
  });
  return { 
    success: true, 
    dashboard: result 
  };
};

export const getMovementsFiltered = async ({ fromDate, toDate, tipos = [], cuentas = [], categorias = [] }) => {
  const userId = await getUserId();

  const [{ data: movements }, { data: transfers }, { data: accounts }, { data: categoriesData }] = await Promise.all([
    supabase
      .from('movements')
      .select('*')
      .eq('user_id', userId)
      .gte('date', fromDate || '1900-01-01')
      .lte('date', toDate || '2100-12-31')
      .order('date', { ascending: false }),
    supabase
      .from('transfers')
      .select('*')
      .eq('user_id', userId)
      .gte('date', fromDate || '1900-01-01')
      .lte('date', toDate || '2100-12-31')
      .order('date', { ascending: false }),
    supabase.from('accounts').select('id, name').eq('user_id', userId),
    supabase.from('categories').select('id, name').eq('user_id', userId)
  ]);

  let result = [];

  // Map movements using the same function as other endpoints
  (movements || []).forEach(m => {
    result.push(mapMovementFromDB(m, accounts, categoriesData));
  });

  // Map transfers
  (transfers || []).forEach(t => {
    const fromAccount = accounts?.find(a => a.id === t.from_account_id);
    const toAccount = accounts?.find(a => a.id === t.to_account_id);
    result.push({
      id: t.id,
      rowIndex: t.id,
      fecha: t.date,
      cuentaSaliente: fromAccount?.name || '',
      cuentaEntrante: toAccount?.name || '',
      cuenta: fromAccount?.name || '',
      montoSaliente: parseFloat(t.from_amount),
      montoEntrante: parseFloat(t.to_amount),
      monto: parseFloat(t.from_amount),
      nota: t.note || '',
      tipo: 'transferencia',
      // Attachment info
      attachmentUrl: t.attachment_url,
      attachmentName: t.attachment_name,
      // Future transaction indicator
      isFuture: t.is_future || false,
      // Recurring indicator
      isRecurring: !!t.recurring_occurrence_id,
      recurringOccurrenceId: t.recurring_occurrence_id,
    });
  });

  // Sort by date
  result.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  // Apply filters
  if (tipos && tipos.length > 0) {
    result = result.filter(m => tipos.includes(m.tipo));
  }
  if (cuentas && cuentas.length > 0) {
    result = result.filter(m => {
      // For transfers, check both source and destination accounts
      if (m.tipo === 'transferencia') {
        return cuentas.includes(m.cuentaSaliente) || cuentas.includes(m.cuentaEntrante);
      }
      return cuentas.includes(m.cuenta);
    });
  }
  if (categorias && categorias.length > 0) {
    result = result.filter(m => m.categoria && categorias.includes(m.categoria));
  }

  return { success: true, movements: result };
};

export const bulkDeleteMovements = deleteMultipleMovements;
export const bulkUpdateMovements = updateMultipleMovements;

// Alias for invalidateMovementCache
export const invalidateMovementCache = invalidateCache;

// Alias for addExpenseWithInstallments (used in credit cards)
export const addExpenseWithInstallments = addInstallmentPurchase;

// ============================================
// CARD STATEMENT ATTACHMENTS
// ============================================
export const getCardStatementAttachments = async (accountId) => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('card_statement_attachments')
    .select('*')
    .eq('user_id', userId)
    .eq('account_id', accountId);

  if (error) throw error;

  // Devolver mapa por período para acceso rápido
  const byPeriod = {};
  (data || []).forEach(row => {
    byPeriod[row.period] = {
      id: row.id,
      statementUrl: row.statement_url,
      statementName: row.statement_name,
      receiptUrl: row.receipt_url,
      receiptName: row.receipt_name,
    };
  });

  return byPeriod;
};

export const saveCardStatementAttachments = async ({ accountId, period, statementFile, receiptFile, existing }) => {
  const userId = await getUserId();

  let statementUrl = existing?.statementUrl || null;
  let statementName = existing?.statementName || null;
  let receiptUrl = existing?.receiptUrl || null;
  let receiptName = existing?.receiptName || null;

  // Subir nuevo PDF de resumen
  if (statementFile) {
    // Eliminar anterior si existe
    if (statementUrl) await deleteAttachment(statementUrl);
    const result = await uploadStatementAttachment(statementFile, userId, 'statement');
    statementUrl = result.url;
    statementName = result.name;
  }

  // Subir nuevo comprobante de pago
  if (receiptFile) {
    if (receiptUrl) await deleteAttachment(receiptUrl);
    const result = await uploadStatementAttachment(receiptFile, userId, 'receipt');
    receiptUrl = result.url;
    receiptName = result.name;
  }

  const { data, error } = await supabase
    .from('card_statement_attachments')
    .upsert({
      user_id: userId,
      account_id: accountId,
      period,
      statement_url: statementUrl,
      statement_name: statementName,
      receipt_url: receiptUrl,
      receipt_name: receiptName,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,account_id,period' })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    statementUrl: data.statement_url,
    statementName: data.statement_name,
    receiptUrl: data.receipt_url,
    receiptName: data.receipt_name,
  };
};

export const deleteCardStatementAttachment = async ({ accountId, period, field }) => {
  const userId = await getUserId();

  // Obtener registro actual
  const { data: current } = await supabase
    .from('card_statement_attachments')
    .select('*')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('period', period)
    .single();

  if (!current) return;

  // Eliminar archivo del storage
  if (field === 'statement' && current.statement_url) {
    await deleteAttachment(current.statement_url);
  } else if (field === 'receipt' && current.receipt_url) {
    await deleteAttachment(current.receipt_url);
  }

  const updateData = field === 'statement'
    ? { statement_url: null, statement_name: null }
    : { receipt_url: null, receipt_name: null };

  // Si ambos quedan null, eliminar el registro entero
  const otherField = field === 'statement' ? 'receipt_url' : 'statement_url';
  if (!current[otherField]) {
    await supabase
      .from('card_statement_attachments')
      .delete()
      .eq('id', current.id);
  } else {
    await supabase
      .from('card_statement_attachments')
      .update(updateData)
      .eq('id', current.id);
  }

  return { success: true };
};

// ============================================
// STATEMENT PAYMENTS (Pagos de resúmenes)
// ============================================
export const getStatementPayments = async (accountId) => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('statement_payments')
    .select('*')
    .eq('user_id', userId)
    .eq('account_id', accountId);

  if (error) throw error;

  // Devolver mapa por período y moneda para acceso rápido
  // Key: "YYYY-MM_ARS" o "YYYY-MM_USD"
  const byPeriodCurrency = {};
  (data || []).forEach(row => {
    const key = `${row.statement_period}_${row.currency}`;
    byPeriodCurrency[key] = {
      id: row.id,
      amount: parseFloat(row.amount),
      paymentAccountId: row.payment_account_id,
      transferId: row.transfer_id,
      paidAt: row.paid_at,
    };
  });

  return byPeriodCurrency;
};

export const registerStatementPayment = async ({ accountId, statementPeriod, currency, amount, paymentAccountId, transferId }) => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('statement_payments')
    .insert({
      user_id: userId,
      account_id: accountId,
      statement_period: statementPeriod,
      currency,
      amount,
      payment_account_id: paymentAccountId,
      transfer_id: transferId,
    })
    .select()
    .single();

  if (error) throw error;

  // Invalidar cache para que próximo resumen se recalcule
  invalidateCache('accounts');
  emit(DataEvents.ACCOUNTS_CHANGED);

  return data;
};

export const cancelStatementPayment = async (paymentId, transferId) => {
  const userId = await getUserId();

  // Eliminar la transferencia asociada si existe
  if (transferId) {
    await supabase
      .from('transfers')
      .delete()
      .eq('id', transferId)
      .eq('user_id', userId);
  }

  // Eliminar el registro de pago
  const { error } = await supabase
    .from('statement_payments')
    .delete()
    .eq('id', paymentId)
    .eq('user_id', userId);

  if (error) throw error;

  invalidateCache('transfers');
  invalidateCache('accounts');
  emit(DataEvents.TRANSFERS_CHANGED);
  emit(DataEvents.ACCOUNTS_CHANGED);

  return { success: true };
};

// ============================================
// BUDGETS (Presupuestos)
// ============================================

// Helper: Calculate period dates based on type
const calculatePeriodDates = (periodType, customStartDate, customEndDate) => {
  const now = new Date();
  let start, end;

  switch (periodType) {
    case 'weekly': {
      // Start of week (Monday)
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      start = new Date(now);
      start.setDate(now.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'monthly': {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    }
    case 'yearly': {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
      break;
    }
    case 'custom': {
      start = customStartDate ? new Date(customStartDate) : new Date();
      end = customEndDate ? new Date(customEndDate) : new Date();
      break;
    }
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
};

// Helper: Calculate days remaining in period
const calculateDaysRemaining = (endDate) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

// Helper: Calculate spent amount for a budget in a period
const calculateBudgetSpent = async (budget, startDate, endDate) => {
  const userId = await getUserId();

  let query = supabase
    .from('movements')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .or('is_future.is.null,is_future.eq.false') // Exclude future transactions
    .gte('date', startDate)
    .lte('date', endDate);

  // Apply filters only if not global
  if (!budget.is_global) {
    if (budget.category_ids && budget.category_ids.length > 0) {
      query = query.in('category_id', budget.category_ids);
    }
    if (budget.account_ids && budget.account_ids.length > 0) {
      query = query.in('account_id', budget.account_ids);
    }
  }

  const { data: movements } = await query;
  return (movements || []).reduce((sum, m) => sum + parseFloat(m.amount), 0);
};

// Calculate projected recurring expenses for a budget period
const calculateProjectedRecurringExpenses = async (budget, startDate, endDate) => {
  const userId = await getUserId();
  const today = new Date().toISOString().split('T')[0];

  // Only calculate projections from today onwards
  const projectionStart = startDate > today ? startDate : today;
  if (projectionStart > endDate) return 0;

  // Get active expense recurring transactions
  let query = supabase
    .from('recurring_transactions')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .eq('is_active', true)
    .eq('is_paused', false);

  // Apply category/account filters if not global
  if (!budget.is_global) {
    if (budget.category_ids && budget.category_ids.length > 0) {
      query = query.in('category_id', budget.category_ids);
    }
    if (budget.account_ids && budget.account_ids.length > 0) {
      query = query.in('account_id', budget.account_ids);
    }
  }

  const { data: recurringList } = await query;
  if (!recurringList || recurringList.length === 0) return 0;

  let totalProjected = 0;
  const start = new Date(projectionStart);
  const end = new Date(endDate);

  // Calculate occurrences for each recurring transaction
  for (const recurring of recurringList) {
    let nextDate = recurring.next_execution_date
      ? new Date(recurring.next_execution_date)
      : new Date(recurring.start_date);

    // Skip if start date is after period end
    if (nextDate > end) continue;

    // Find occurrences within the date range
    while (nextDate <= end) {
      if (nextDate >= start) {
        totalProjected += parseFloat(recurring.amount);
      }

      // Calculate next occurrence
      const freq = recurring.frequency;
      switch (freq.type) {
        case 'daily':
          nextDate = new Date(nextDate.setDate(nextDate.getDate() + 1));
          break;
        case 'weekly':
          nextDate = new Date(nextDate.setDate(nextDate.getDate() + 7));
          break;
        case 'biweekly':
          nextDate = new Date(nextDate.setDate(nextDate.getDate() + 14));
          break;
        case 'monthly':
          nextDate = new Date(nextDate.setMonth(nextDate.getMonth() + 1));
          break;
        case 'bimonthly':
          nextDate = new Date(nextDate.setMonth(nextDate.getMonth() + 2));
          break;
        case 'quarterly':
          nextDate = new Date(nextDate.setMonth(nextDate.getMonth() + 3));
          break;
        case 'biannual':
          nextDate = new Date(nextDate.setMonth(nextDate.getMonth() + 6));
          break;
        case 'yearly':
          nextDate = new Date(nextDate.setFullYear(nextDate.getFullYear() + 1));
          break;
        case 'custom_days':
          nextDate = new Date(nextDate.setDate(nextDate.getDate() + (freq.interval || 30)));
          break;
        default:
          nextDate = new Date(nextDate.setMonth(nextDate.getMonth() + 1));
      }
    }
  }

  return totalProjected;
};

export const getBudgets = () => withDeduplication('budgets', async () => {
  const userId = await getUserId();

  const { data: budgets, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const result = { budgets: budgets || [] };
  setCachedData('budgets', result);
  return result;
});

export const getBudgetsWithProgress = async () => {
  const userId = await getUserId();

  const { data: budgets, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Calculate progress for each budget
  const budgetsWithProgress = await Promise.all(
    (budgets || []).map(async (budget) => {
      // Skip calculation for inactive or paused budgets
      if (!budget.is_active || budget.is_paused) {
        return {
          ...budget,
          spent: 0,
          remaining: budget.amount,
          percentageUsed: 0,
          currentPeriod: null,
          daysRemaining: 0,
        };
      }

      const periodDates = calculatePeriodDates(budget.period_type, budget.start_date, budget.end_date);
      const [spent, projectedRecurring] = await Promise.all([
        calculateBudgetSpent(budget, periodDates.start, periodDates.end),
        calculateProjectedRecurringExpenses(budget, periodDates.start, periodDates.end),
      ]);
      const remaining = budget.amount - spent;
      const percentageUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const daysRemaining = calculateDaysRemaining(periodDates.end);

      // Projected total includes current spent + future recurring expenses
      const projectedTotal = spent + projectedRecurring;
      const projectedRemaining = budget.amount - projectedTotal;
      const projectedPercentageUsed = budget.amount > 0 ? (projectedTotal / budget.amount) * 100 : 0;

      return {
        ...budget,
        spent,
        remaining,
        percentageUsed,
        currentPeriod: periodDates,
        daysRemaining,
        // Recurring projections
        projectedRecurring,
        projectedTotal,
        projectedRemaining,
        projectedPercentageUsed,
      };
    })
  );

  return { budgets: budgetsWithProgress };
};

export const getBudgetWithProgress = async (budgetId) => {
  const userId = await getUserId();

  const { data: budget, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', budgetId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  const periodDates = calculatePeriodDates(budget.period_type, budget.start_date, budget.end_date);
  const spent = await calculateBudgetSpent(budget, periodDates.start, periodDates.end);
  const remaining = budget.amount - spent;
  const percentageUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
  const daysRemaining = calculateDaysRemaining(periodDates.end);

  return {
    ...budget,
    spent,
    remaining,
    percentageUsed,
    currentPeriod: periodDates,
    daysRemaining,
  };
};

export const addBudget = async (budgetData) => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      user_id: userId,
      name: budgetData.name,
      amount: budgetData.amount,
      currency: budgetData.currency || 'ARS',
      period_type: budgetData.periodType,
      start_date: budgetData.startDate,
      end_date: budgetData.endDate || null,
      is_recurring: budgetData.isRecurring ?? true,
      category_ids: budgetData.categoryIds || [],
      account_ids: budgetData.accountIds || [],
      is_global: budgetData.isGlobal || false,
      icon: budgetData.icon || null,
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('budgets');
  return { success: true, budget: data };
};

export const updateBudget = async (budgetData) => {
  const { data, error } = await supabase
    .from('budgets')
    .update({
      name: budgetData.name,
      amount: budgetData.amount,
      currency: budgetData.currency,
      period_type: budgetData.periodType,
      start_date: budgetData.startDate,
      end_date: budgetData.endDate,
      is_recurring: budgetData.isRecurring,
      category_ids: budgetData.categoryIds,
      account_ids: budgetData.accountIds,
      is_global: budgetData.isGlobal,
      is_active: budgetData.isActive,
      is_paused: budgetData.isPaused,
      icon: budgetData.icon,
      updated_at: new Date().toISOString(),
    })
    .eq('id', budgetData.id)
    .select()
    .single();

  if (error) throw error;
  invalidateCache('budgets');
  return { success: true, budget: data };
};

export const deleteBudget = async (budgetId) => {
  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', budgetId);

  if (error) throw error;
  invalidateCache('budgets');
  return { success: true };
};

export const duplicateBudget = async (budgetId) => {
  const userId = await getUserId();

  // Get original budget
  const { data: original, error: fetchError } = await supabase
    .from('budgets')
    .select('*')
    .eq('id', budgetId)
    .eq('user_id', userId)
    .single();

  if (fetchError) throw fetchError;
  if (!original) throw new Error('Presupuesto no encontrado');

  // Create copy without id and timestamps
  const { id, created_at, updated_at, ...budgetData } = original;

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      ...budgetData,
      name: `${original.name} (copia)`,
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('budgets');
  return { success: true, budget: data };
};

export const toggleBudgetPause = async (budgetId) => {
  const userId = await getUserId();

  // Get current state
  const { data: budget, error: fetchError } = await supabase
    .from('budgets')
    .select('is_paused')
    .eq('id', budgetId)
    .eq('user_id', userId)
    .single();

  if (fetchError) throw fetchError;

  // Toggle
  const { data, error } = await supabase
    .from('budgets')
    .update({
      is_paused: !budget.is_paused,
      updated_at: new Date().toISOString(),
    })
    .eq('id', budgetId)
    .select()
    .single();

  if (error) throw error;
  invalidateCache('budgets');
  return { success: true, budget: data };
};

// ============================================
// GOALS (Metas)
// ============================================

// Helper: Calculate goal progress based on type
const calculateGoalProgress = async (goal, startDate, endDate) => {
  const userId = await getUserId();

  switch (goal.goal_type) {
    case 'income': {
      // Sum all incomes in the period
      let query = supabase
        .from('movements')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'income')
        .gte('date', startDate)
        .lte('date', endDate);

      if (!goal.is_global) {
        if (goal.category_ids?.length > 0) {
          query = query.in('category_id', goal.category_ids);
        }
        if (goal.account_ids?.length > 0) {
          query = query.in('account_id', goal.account_ids);
        }
      }

      const { data: incomes } = await query;
      return (incomes || []).reduce((sum, m) => sum + parseFloat(m.amount), 0);
    }

    case 'savings': {
      // Savings = Income - Expenses in the period
      let incomeQuery = supabase
        .from('movements')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'income')
        .gte('date', startDate)
        .lte('date', endDate);

      let expenseQuery = supabase
        .from('movements')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate);

      if (!goal.is_global) {
        if (goal.category_ids?.length > 0) {
          incomeQuery = incomeQuery.in('category_id', goal.category_ids);
          expenseQuery = expenseQuery.in('category_id', goal.category_ids);
        }
        if (goal.account_ids?.length > 0) {
          incomeQuery = incomeQuery.in('account_id', goal.account_ids);
          expenseQuery = expenseQuery.in('account_id', goal.account_ids);
        }
      }

      const [{ data: incomes }, { data: expenses }] = await Promise.all([
        incomeQuery,
        expenseQuery,
      ]);

      const totalIncome = (incomes || []).reduce((sum, m) => sum + parseFloat(m.amount), 0);
      const totalExpense = (expenses || []).reduce((sum, m) => sum + parseFloat(m.amount), 0);
      return totalIncome - totalExpense;
    }

    case 'spending_reduction': {
      // Current spending in the period
      let query = supabase
        .from('movements')
        .select('amount')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate);

      if (!goal.is_global) {
        if (goal.category_ids?.length > 0) {
          query = query.in('category_id', goal.category_ids);
        }
        if (goal.account_ids?.length > 0) {
          query = query.in('account_id', goal.account_ids);
        }
      }

      const { data: expenses } = await query;
      const currentSpending = (expenses || []).reduce((sum, m) => sum + parseFloat(m.amount), 0);

      // For reduction goals, we want to spend LESS than target
      // Return the "saved" amount vs baseline
      const baseline = goal.baseline_amount || goal.target_amount;
      return baseline - currentSpending;
    }

    default:
      return 0;
  }
};

export const getGoals = () => withDeduplication('goals', async () => {
  const userId = await getUserId();

  const { data: goals, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const result = { goals: goals || [] };
  setCachedData('goals', result);
  return result;
});

export const getGoalsWithProgress = async () => {
  const userId = await getUserId();

  const { data: goals, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Calculate progress for each goal
  const goalsWithProgress = await Promise.all(
    (goals || []).map(async (goal) => {
      // Skip calculation for inactive goals
      if (!goal.is_active) {
        return {
          ...goal,
          currentAmount: 0,
          percentageAchieved: 0,
          currentPeriod: null,
          daysRemaining: 0,
        };
      }

      const periodDates = calculatePeriodDates(goal.period_type, goal.start_date, goal.end_date);
      const currentAmount = await calculateGoalProgress(goal, periodDates.start, periodDates.end);
      const percentageAchieved = goal.target_amount > 0 ? (currentAmount / goal.target_amount) * 100 : 0;
      const daysRemaining = calculateDaysRemaining(periodDates.end);
      const isOnTrack = percentageAchieved >= ((new Date() - new Date(periodDates.start)) / (new Date(periodDates.end) - new Date(periodDates.start))) * 100;

      return {
        ...goal,
        currentAmount,
        percentageAchieved,
        currentPeriod: periodDates,
        daysRemaining,
        isOnTrack,
      };
    })
  );

  return { goals: goalsWithProgress };
};

export const getGoalWithProgress = async (goalId) => {
  const userId = await getUserId();

  const { data: goal, error } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  const periodDates = calculatePeriodDates(goal.period_type, goal.start_date, goal.end_date);
  const currentAmount = await calculateGoalProgress(goal, periodDates.start, periodDates.end);
  const percentageAchieved = goal.target_amount > 0 ? (currentAmount / goal.target_amount) * 100 : 0;
  const daysRemaining = calculateDaysRemaining(periodDates.end);

  return {
    ...goal,
    currentAmount,
    percentageAchieved,
    currentPeriod: periodDates,
    daysRemaining,
  };
};

export const addGoal = async (goalData) => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      name: goalData.name,
      goal_type: goalData.goalType,
      target_amount: goalData.targetAmount,
      currency: goalData.currency || 'ARS',
      period_type: goalData.periodType,
      start_date: goalData.startDate,
      end_date: goalData.endDate || null,
      is_recurring: goalData.isRecurring ?? true,
      category_ids: goalData.categoryIds || [],
      account_ids: goalData.accountIds || [],
      is_global: goalData.isGlobal || false,
      reduction_type: goalData.reductionType || null,
      reduction_value: goalData.reductionValue || null,
      baseline_amount: goalData.baselineAmount || null,
      icon: goalData.icon || null,
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('goals');
  return { success: true, goal: data };
};

export const updateGoal = async (goalData) => {
  const { data, error } = await supabase
    .from('goals')
    .update({
      name: goalData.name,
      goal_type: goalData.goalType,
      target_amount: goalData.targetAmount,
      currency: goalData.currency,
      period_type: goalData.periodType,
      start_date: goalData.startDate,
      end_date: goalData.endDate,
      is_recurring: goalData.isRecurring,
      category_ids: goalData.categoryIds,
      account_ids: goalData.accountIds,
      is_global: goalData.isGlobal,
      reduction_type: goalData.reductionType,
      reduction_value: goalData.reductionValue,
      baseline_amount: goalData.baselineAmount,
      is_active: goalData.isActive,
      is_completed: goalData.isCompleted,
      completed_at: goalData.isCompleted ? new Date().toISOString() : null,
      icon: goalData.icon,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalData.id)
    .select()
    .single();

  if (error) throw error;
  invalidateCache('goals');
  return { success: true, goal: data };
};

export const deleteGoal = async (goalId) => {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', goalId);

  if (error) throw error;
  invalidateCache('goals');
  return { success: true };
};

export const completeGoal = async (goalId, completed = true) => {
  const { data, error } = await supabase
    .from('goals')
    .update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', goalId)
    .select()
    .single();

  if (error) throw error;
  invalidateCache('goals');
  return { success: true, goal: data };
};

// ============================================
// RECURRING TRANSACTIONS (Transacciones Recurrentes)
// ============================================

// Helper: Map recurring from DB to frontend format
const mapRecurringFromDB = (r, accounts, categories) => {
  const account = accounts?.find(a => a.id === r.account_id);
  const fromAccount = accounts?.find(a => a.id === r.from_account_id);
  const toAccount = accounts?.find(a => a.id === r.to_account_id);
  const category = categories?.find(c => c.id === r.category_id);

  return {
    id: r.id,
    name: r.name,
    description: r.description,
    amount: parseFloat(r.amount),
    currency: r.currency,
    type: r.type,
    // Account info
    accountId: r.account_id,
    accountName: account?.name || '',
    categoryId: r.category_id,
    categoryName: category?.name || '',
    // Transfer info
    fromAccountId: r.from_account_id,
    fromAccountName: fromAccount?.name || '',
    toAccountId: r.to_account_id,
    toAccountName: toAccount?.name || '',
    toAmount: r.to_amount ? parseFloat(r.to_amount) : null,
    // Frequency
    frequency: r.frequency,
    executionHour: r.execution_hour,
    weekendHandling: r.weekend_handling,
    // Dates
    startDate: r.start_date,
    endDate: r.end_date,
    // Mode
    creationMode: r.creation_mode,
    preferredBot: r.preferred_bot,
    // Status
    isActive: r.is_active,
    isPaused: r.is_paused,
    isCreditCardRecurring: r.is_credit_card_recurring,
    // Tracking
    lastGeneratedDate: r.last_generated_date,
    nextExecutionDate: r.next_execution_date,
    // Timestamps
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
};

// ============================================
// TRANSACCIONES FUTURAS
// ============================================

// Procesar transacciones futuras cuya fecha ya llegó
// Convierte is_future = true a false para que afecten el balance
export const processFutureTransactions = async () => {
  const userId = await getUserId();
  const today = new Date().toISOString().split('T')[0];

  // Actualizar movimientos cuya fecha ya pasó
  const { data: updatedMovements, error: movError } = await supabase
    .from('movements')
    .update({ is_future: false })
    .eq('user_id', userId)
    .eq('is_future', true)
    .lte('date', today)
    .select();

  if (movError) {
    console.error('Error processing future movements:', movError);
  }

  // Actualizar transferencias cuya fecha ya pasó
  const { data: updatedTransfers, error: transError } = await supabase
    .from('transfers')
    .update({ is_future: false })
    .eq('user_id', userId)
    .eq('is_future', true)
    .lte('date', today)
    .select();

  if (transError) {
    console.error('Error processing future transfers:', transError);
  }

  const count = (updatedMovements?.length || 0) + (updatedTransfers?.length || 0);

  if (count > 0) {
    invalidateCache('all');
  }

  return {
    processed: count,
    movements: updatedMovements?.length || 0,
    transfers: updatedTransfers?.length || 0,
  };
};

// Obtener transacciones futuras pendientes
export const getPendingFutureTransactions = async () => {
  const userId = await getUserId();
  const today = new Date().toISOString().split('T')[0];

  const [{ data: movements }, { data: transfers }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from('movements')
      .select('*')
      .eq('user_id', userId)
      .eq('is_future', true)
      .gt('date', today)
      .order('date'),
    supabase
      .from('transfers')
      .select('*')
      .eq('user_id', userId)
      .eq('is_future', true)
      .gt('date', today)
      .order('date'),
    supabase.from('accounts').select('id, name').eq('user_id', userId),
    supabase.from('categories').select('id, name').eq('user_id', userId)
  ]);

  const futureTransactions = [
    ...(movements || []).map(m => ({
      id: m.id,
      type: m.type,
      date: m.date,
      amount: parseFloat(m.amount),
      account: accounts?.find(a => a.id === m.account_id)?.name || '',
      category: categories?.find(c => c.id === m.category_id)?.name || '',
      note: m.note,
      eventType: 'movement',
    })),
    ...(transfers || []).map(t => ({
      id: t.id,
      type: 'transfer',
      date: t.date,
      amount: parseFloat(t.from_amount),
      fromAccount: accounts?.find(a => a.id === t.from_account_id)?.name || '',
      toAccount: accounts?.find(a => a.id === t.to_account_id)?.name || '',
      note: t.note,
      eventType: 'transfer',
    })),
  ];

  // Ordenar por fecha
  futureTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));

  return futureTransactions;
};

// ============================================
// TRANSACCIONES RECURRENTES
// ============================================

export const getRecurringTransactions = () => withDeduplication('recurring', async () => {
  const userId = await getUserId();

  const [{ data: recurring, error }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase.from('accounts').select('id, name').eq('user_id', userId),
    supabase.from('categories').select('id, name').eq('user_id', userId)
  ]);

  if (error) throw error;

  const result = {
    recurring: (recurring || []).map(r => mapRecurringFromDB(r, accounts, categories))
  };
  setCachedData('recurring', result);
  return result;
});

export const getRecurringWithStats = async () => {
  const userId = await getUserId();

  const [{ data: recurring, error }, { data: accounts }, { data: categories }, { data: occurrences }] = await Promise.all([
    supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase.from('accounts').select('id, name').eq('user_id', userId),
    supabase.from('categories').select('id, name').eq('user_id', userId),
    supabase
      .from('recurring_occurrences')
      .select('recurring_id, status, actual_amount')
      .eq('user_id', userId)
  ]);

  if (error) throw error;

  // Calculate stats for each recurring
  const recurringWithStats = (recurring || []).map(r => {
    const rOccurrences = (occurrences || []).filter(o => o.recurring_id === r.id);
    const confirmed = rOccurrences.filter(o => o.status === 'confirmed');
    const skipped = rOccurrences.filter(o => o.status === 'skipped');
    const totalPaid = confirmed.reduce((sum, o) => sum + (parseFloat(o.actual_amount) || parseFloat(r.amount)), 0);

    return {
      ...mapRecurringFromDB(r, accounts, categories),
      stats: {
        totalOccurrences: rOccurrences.length,
        confirmedCount: confirmed.length,
        skippedCount: skipped.length,
        totalPaid,
        averageAmount: confirmed.length > 0 ? totalPaid / confirmed.length : parseFloat(r.amount),
      }
    };
  });

  return { recurring: recurringWithStats };
};

export const addRecurringTransaction = async (data) => {
  const userId = await getUserId();

  // Get account and category IDs if provided by name
  let accountId = data.accountId;
  let categoryId = data.categoryId;
  let fromAccountId = data.fromAccountId;
  let toAccountId = data.toAccountId;

  if (data.accountName && !accountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.accountName)
      .single();
    accountId = account?.id;
  }

  if (data.categoryName && !categoryId) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.categoryName)
      .single();
    categoryId = category?.id;
  }

  if (data.fromAccountName && !fromAccountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.fromAccountName)
      .single();
    fromAccountId = account?.id;
  }

  if (data.toAccountName && !toAccountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.toAccountName)
      .single();
    toAccountId = account?.id;
  }

  // Calculate initial next_execution_date
  const startDate = new Date(data.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // If start date is today or in the past, calculate next execution
  // Otherwise, next execution is the start date
  let nextExecutionDate = data.startDate;
  if (startDate <= today) {
    // We'll let the database function calculate this, or set it to start_date for now
    nextExecutionDate = data.startDate;
  }

  const { data: result, error } = await supabase
    .from('recurring_transactions')
    .insert({
      user_id: userId,
      name: data.name,
      description: data.description || null,
      amount: data.amount,
      currency: data.currency || 'ARS',
      type: data.type,
      account_id: accountId,
      category_id: categoryId,
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      to_amount: data.toAmount || null,
      frequency: data.frequency,
      execution_hour: data.executionHour || 9,
      weekend_handling: data.weekendHandling || 'as_is',
      start_date: data.startDate,
      end_date: data.endDate || null,
      creation_mode: data.creationMode || 'automatic',
      preferred_bot: data.preferredBot || null,
      is_credit_card_recurring: data.isCreditCardRecurring || false,
      next_execution_date: nextExecutionDate,
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('recurring');
  return { success: true, recurring: result };
};

export const updateRecurringTransaction = async (data) => {
  const userId = await getUserId();

  // Get account and category IDs if provided by name
  let accountId = data.accountId;
  let categoryId = data.categoryId;
  let fromAccountId = data.fromAccountId;
  let toAccountId = data.toAccountId;

  if (data.accountName && !accountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.accountName)
      .single();
    accountId = account?.id;
  }

  if (data.categoryName && !categoryId) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.categoryName)
      .single();
    categoryId = category?.id;
  }

  if (data.fromAccountName && !fromAccountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.fromAccountName)
      .single();
    fromAccountId = account?.id;
  }

  if (data.toAccountName && !toAccountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.toAccountName)
      .single();
    toAccountId = account?.id;
  }

  const updatePayload = {
    name: data.name,
    description: data.description,
    amount: data.amount,
    currency: data.currency,
    type: data.type,
    account_id: accountId,
    category_id: categoryId,
    from_account_id: fromAccountId,
    to_account_id: toAccountId,
    to_amount: data.toAmount,
    frequency: data.frequency,
    execution_hour: data.executionHour,
    weekend_handling: data.weekendHandling,
    start_date: data.startDate,
    end_date: data.endDate,
    creation_mode: data.creationMode,
    preferred_bot: data.preferredBot,
    is_credit_card_recurring: data.isCreditCardRecurring,
    is_active: data.isActive,
    is_paused: data.isPaused,
  };

  // If frequency changed, recalculate next_execution_date
  if (data.frequency) {
    updatePayload.next_execution_date = data.nextExecutionDate || data.startDate;
  }

  const { data: result, error } = await supabase
    .from('recurring_transactions')
    .update(updatePayload)
    .eq('id', data.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  invalidateCache('recurring');
  return { success: true, recurring: result };
};

export const deleteRecurringTransaction = async (recurringId) => {
  const { error } = await supabase
    .from('recurring_transactions')
    .delete()
    .eq('id', recurringId);

  if (error) throw error;
  invalidateCache('recurring');
  return { success: true };
};

export const pauseRecurringTransaction = async (recurringId) => {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .update({ is_paused: true })
    .eq('id', recurringId)
    .select()
    .single();

  if (error) throw error;
  invalidateCache('recurring');
  return { success: true, recurring: data };
};

export const resumeRecurringTransaction = async (recurringId) => {
  const { data, error } = await supabase
    .from('recurring_transactions')
    .update({ is_paused: false })
    .eq('id', recurringId)
    .select()
    .single();

  if (error) throw error;
  invalidateCache('recurring');
  return { success: true, recurring: data };
};

export const skipNextOccurrence = async (recurringId) => {
  const userId = await getUserId();

  // Get the recurring transaction
  const { data: recurring, error: fetchError } = await supabase
    .from('recurring_transactions')
    .select('*')
    .eq('id', recurringId)
    .single();

  if (fetchError) throw fetchError;

  // Create a skipped occurrence
  const { error: occurrenceError } = await supabase
    .from('recurring_occurrences')
    .insert({
      recurring_id: recurringId,
      user_id: userId,
      scheduled_date: recurring.next_execution_date,
      status: 'skipped',
      skipped_at: new Date().toISOString(),
    });

  if (occurrenceError) throw occurrenceError;

  // Update next_execution_date (the database function will calculate it)
  // For now, we'll just mark the last_generated_date
  const { data, error: updateError } = await supabase
    .from('recurring_transactions')
    .update({
      last_generated_date: recurring.next_execution_date,
    })
    .eq('id', recurringId)
    .select()
    .single();

  if (updateError) throw updateError;
  invalidateCache('recurring');
  return { success: true, recurring: data };
};

// ============================================
// RECURRING OCCURRENCES
// ============================================

export const getRecurringOccurrences = async (recurringId) => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('recurring_occurrences')
    .select('*')
    .eq('user_id', userId)
    .eq('recurring_id', recurringId)
    .order('scheduled_date', { ascending: false });

  if (error) throw error;
  return { occurrences: data || [] };
};

export const getPendingOccurrences = async () => {
  const userId = await getUserId();

  const { data: occurrences, error } = await supabase
    .from('recurring_occurrences')
    .select(`
      *,
      recurring:recurring_id (
        name, amount, currency, type, account_id, category_id,
        from_account_id, to_account_id
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('scheduled_date', { ascending: true });

  if (error) throw error;
  return { occurrences: occurrences || [] };
};

export const confirmOccurrence = async (occurrenceId, actualAmount = null) => {
  const userId = await getUserId();

  // Get the occurrence with recurring info
  const { data: occurrence, error: fetchError } = await supabase
    .from('recurring_occurrences')
    .select(`
      *,
      recurring:recurring_id (*)
    `)
    .eq('id', occurrenceId)
    .single();

  if (fetchError) throw fetchError;

  const recurring = occurrence.recurring;
  const amount = actualAmount || recurring.amount;

  let movementId = null;
  let transferId = null;

  // Create the movement or transfer
  if (recurring.type === 'transfer') {
    const { data: transfer, error: transferError } = await supabase
      .from('transfers')
      .insert({
        user_id: userId,
        date: occurrence.scheduled_date,
        from_account_id: recurring.from_account_id,
        to_account_id: recurring.to_account_id,
        from_amount: amount,
        to_amount: recurring.to_amount || amount,
        note: `${recurring.name} (recurrente)`,
        recurring_occurrence_id: occurrenceId,
      })
      .select()
      .single();

    if (transferError) throw transferError;
    transferId = transfer.id;
  } else {
    const { data: movement, error: movementError } = await supabase
      .from('movements')
      .insert({
        user_id: userId,
        type: recurring.type,
        date: occurrence.scheduled_date,
        amount: amount,
        account_id: recurring.account_id,
        category_id: recurring.category_id,
        note: `${recurring.name} (recurrente)`,
        recurring_occurrence_id: occurrenceId,
      })
      .select()
      .single();

    if (movementError) throw movementError;
    movementId = movement.id;
  }

  // Update the occurrence
  const { error: updateError } = await supabase
    .from('recurring_occurrences')
    .update({
      status: 'confirmed',
      movement_id: movementId,
      transfer_id: transferId,
      actual_amount: amount,
      confirmed_at: new Date().toISOString(),
      confirmed_via: 'web',
    })
    .eq('id', occurrenceId);

  if (updateError) throw updateError;

  invalidateCache('movements');
  return { success: true };
};

export const skipOccurrence = async (occurrenceId) => {
  const { error } = await supabase
    .from('recurring_occurrences')
    .update({
      status: 'skipped',
      skipped_at: new Date().toISOString(),
    })
    .eq('id', occurrenceId);

  if (error) throw error;
  invalidateCache('recurring');
  return { success: true };
};

// ============================================
// FUTURE TRANSACTIONS (Transacciones Futuras)
// ============================================

export const getFutureTransactions = async () => {
  const userId = await getUserId();
  const today = new Date().toISOString().split('T')[0];

  const [{ data: movements }, { data: transfers }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from('movements')
      .select('*')
      .eq('user_id', userId)
      .eq('is_future', true)
      .gte('date', today)
      .order('date', { ascending: true }),
    supabase
      .from('transfers')
      .select('*')
      .eq('user_id', userId)
      .eq('is_future', true)
      .gte('date', today)
      .order('date', { ascending: true }),
    supabase.from('accounts').select('id, name, is_credit_card').eq('user_id', userId),
    supabase.from('categories').select('id, name').eq('user_id', userId)
  ]);

  const futureMovements = (movements || []).map(m => ({
    ...mapMovementFromDB(m, accounts, categories),
    isFuture: true,
    transactionType: 'movement',
  }));

  const futureTransfers = (transfers || []).map(t => {
    const fromAccount = accounts?.find(a => a.id === t.from_account_id);
    const toAccount = accounts?.find(a => a.id === t.to_account_id);
    return {
      id: t.id,
      rowIndex: t.id,
      fecha: t.date,
      cuentaSaliente: fromAccount?.name || '',
      cuentaEntrante: toAccount?.name || '',
      montoSaliente: parseFloat(t.from_amount),
      montoEntrante: parseFloat(t.to_amount),
      nota: t.note || '',
      tipo: 'transferencia',
      isFuture: true,
      transactionType: 'transfer',
    };
  });

  return {
    futureTransactions: [...futureMovements, ...futureTransfers].sort(
      (a, b) => new Date(a.fecha) - new Date(b.fecha)
    )
  };
};

// ============================================
// CALENDAR EVENTS
// ============================================

export const getCalendarEvents = async (startDate, endDate) => {
  const userId = await getUserId();

  const [
    { data: movements },
    { data: transfers },
    { data: recurring },
    { data: scheduled },
    { data: accounts },
    { data: categories }
  ] = await Promise.all([
    supabase
      .from('movements')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date'),
    supabase
      .from('transfers')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date'),
    supabase
      .from('recurring_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('is_paused', false),
    supabase
      .from('scheduled_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate),
    supabase.from('accounts').select('id, name').eq('user_id', userId),
    supabase.from('categories').select('id, name').eq('user_id', userId)
  ]);

  // Map movements
  const movementEvents = (movements || []).map(m => ({
    id: m.id,
    date: m.date,
    type: m.type === 'income' ? 'income' : 'expense',
    amount: parseFloat(m.amount),
    name: categories?.find(c => c.id === m.category_id)?.name || 'Sin categoría',
    account: accounts?.find(a => a.id === m.account_id)?.name || '',
    isFuture: m.is_future,
    isRecurring: !!m.recurring_occurrence_id,
    eventType: 'movement',
  }));

  // Map transfers
  const transferEvents = (transfers || []).map(t => ({
    id: t.id,
    date: t.date,
    type: 'transfer',
    amount: parseFloat(t.from_amount),
    name: `${accounts?.find(a => a.id === t.from_account_id)?.name || ''} → ${accounts?.find(a => a.id === t.to_account_id)?.name || ''}`,
    isFuture: t.is_future,
    isRecurring: !!t.recurring_occurrence_id,
    eventType: 'transfer',
  }));

  // Calculate future recurring occurrences within the date range
  const recurringEvents = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  (recurring || []).forEach(r => {
    let nextDate = r.next_execution_date ? new Date(r.next_execution_date) : new Date(r.start_date);

    // Find all occurrences within the date range
    while (nextDate <= end) {
      if (nextDate >= start) {
        recurringEvents.push({
          id: `${r.id}-${nextDate.toISOString().split('T')[0]}`,
          date: nextDate.toISOString().split('T')[0],
          type: r.type,
          amount: parseFloat(r.amount),
          name: r.name,
          account: accounts?.find(a => a.id === r.account_id)?.name || '',
          isRecurring: true,
          recurringId: r.id,
          eventType: 'recurring_scheduled',
        });
      }

      // Calculate next occurrence (simplified - just add based on frequency type)
      const freq = r.frequency;
      switch (freq.type) {
        case 'daily':
          nextDate = new Date(nextDate.setDate(nextDate.getDate() + 1));
          break;
        case 'weekly':
          nextDate = new Date(nextDate.setDate(nextDate.getDate() + 7));
          break;
        case 'biweekly':
          nextDate = new Date(nextDate.setDate(nextDate.getDate() + 14));
          break;
        case 'monthly':
          nextDate = new Date(nextDate.setMonth(nextDate.getMonth() + 1));
          break;
        case 'bimonthly':
          nextDate = new Date(nextDate.setMonth(nextDate.getMonth() + 2));
          break;
        case 'quarterly':
          nextDate = new Date(nextDate.setMonth(nextDate.getMonth() + 3));
          break;
        case 'yearly':
          nextDate = new Date(nextDate.setFullYear(nextDate.getFullYear() + 1));
          break;
        case 'custom_days':
          nextDate = new Date(nextDate.setDate(nextDate.getDate() + (freq.interval || 30)));
          break;
        default:
          nextDate = new Date(nextDate.setMonth(nextDate.getMonth() + 1));
      }
    }
  });

  // Map scheduled transactions (pending approval)
  const scheduledEvents = (scheduled || []).map(s => ({
    id: `scheduled-${s.id}`,
    date: s.scheduled_date,
    type: s.type,
    amount: parseFloat(s.amount),
    name: s.type === 'transfer'
      ? `${accounts?.find(a => a.id === s.account_id)?.name || ''} → ${accounts?.find(a => a.id === s.to_account_id)?.name || ''}`
      : categories?.find(c => c.id === s.category_id)?.name || s.note || 'Programada',
    account: accounts?.find(a => a.id === s.account_id)?.name || '',
    isScheduled: true,
    isPending: true,
    scheduledId: s.id,
    eventType: 'scheduled',
  }));

  // Combine all events and return as flat array
  const allEvents = [...movementEvents, ...transferEvents, ...recurringEvents, ...scheduledEvents];

  return allEvents;
};

// ============================================
// CONVERT MOVEMENT TO RECURRING
// ============================================

export const convertToRecurring = async (movementId, frequency, accountName = null) => {
  const userId = await getUserId();

  // Get the movement
  const { data: movement, error: fetchError } = await supabase
    .from('movements')
    .select('*')
    .eq('id', movementId)
    .eq('user_id', userId)
    .single();

  if (fetchError) throw fetchError;

  // Get category name for the recurring
  const { data: category } = await supabase
    .from('categories')
    .select('name')
    .eq('id', movement.category_id)
    .single();

  // Determine account_id - use provided account name or movement's account
  let accountId = movement.account_id;
  if (accountName) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', accountName)
      .single();
    if (account) {
      accountId = account.id;
    }
  }

  // Create the recurring transaction
  const { data: recurring, error: createError } = await supabase
    .from('recurring_transactions')
    .insert({
      user_id: userId,
      name: category?.name || movement.note || 'Gasto recurrente',
      description: movement.note,
      amount: movement.amount,
      currency: movement.original_currency || 'ARS',
      type: movement.type,
      account_id: accountId,
      category_id: movement.category_id,
      frequency: frequency,
      start_date: movement.date,
      next_execution_date: movement.date,
      last_generated_date: movement.date, // Mark this movement as already generated
      creation_mode: 'automatic',
    })
    .select()
    .single();

  if (createError) throw createError;

  // Create an occurrence for the original movement
  const { error: occurrenceError } = await supabase
    .from('recurring_occurrences')
    .insert({
      recurring_id: recurring.id,
      user_id: userId,
      scheduled_date: movement.date,
      status: 'confirmed',
      movement_id: movementId,
      actual_amount: movement.amount,
      confirmed_at: new Date().toISOString(),
      confirmed_via: 'web',
    });

  if (occurrenceError) throw occurrenceError;

  // Update the movement to reference the occurrence
  // (We'd need to get the occurrence ID, but for simplicity we'll skip this)

  invalidateCache('movements');
  return { success: true, recurring };
};

// ============================================
// HOLIDAYS
// ============================================

export const getHolidays = async (year) => {
  const { data, error } = await supabase
    .from('argentine_holidays')
    .select('*')
    .eq('year', year)
    .order('date');

  if (error) throw error;
  return { holidays: data || [] };
};

// ============================================
// SCHEDULED TRANSACTIONS
// Transacciones programadas para una fecha futura
// ============================================

export const getScheduledTransactions = async (status = null) => {
  const userId = await getUserId();

  let query = supabase
    .from('scheduled_transactions')
    .select(`
      *,
      account:accounts!scheduled_transactions_account_id_fkey(id, name, icon, currency),
      to_account:accounts!scheduled_transactions_to_account_id_fkey(id, name, icon, currency),
      category:categories(id, name, icon)
    `)
    .eq('user_id', userId)
    .order('scheduled_date', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return {
    scheduled: (data || []).map(s => ({
      ...s,
      cuenta: s.account?.name,
      cuentaIcon: s.account?.icon,
      cuentaMoneda: s.account?.currency,
      cuentaDestino: s.to_account?.name,
      cuentaDestinoIcon: s.to_account?.icon,
      cuentaDestinoMoneda: s.to_account?.currency,
      categoria: s.category?.name,
      categoriaIcon: s.category?.icon,
      monto: s.amount,
      montoDestino: s.to_amount,
      fecha: s.scheduled_date,
      nota: s.note,
    })),
  };
};

export const getScheduledForCalendar = async (startDate, endDate) => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('scheduled_transactions')
    .select(`
      *,
      account:accounts!scheduled_transactions_account_id_fkey(name, icon),
      category:categories(name, icon)
    `)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate);

  if (error) throw error;
  return { scheduled: data || [] };
};

export const createScheduledTransaction = async (data) => {
  const userId = await getUserId();

  // Obtener IDs de cuenta y categoría
  let accountId = data.accountId;
  let toAccountId = data.toAccountId;
  let categoryId = data.categoryId;

  if (data.accountName && !accountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.accountName)
      .single();
    accountId = account?.id;
  }

  if (data.toAccountName && !toAccountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.toAccountName)
      .single();
    toAccountId = account?.id;
  }

  if (data.categoryName && !categoryId) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.categoryName)
      .single();
    categoryId = category?.id;
  }

  const { data: result, error } = await supabase
    .from('scheduled_transactions')
    .insert({
      user_id: userId,
      type: data.type,
      scheduled_date: data.scheduledDate,
      amount: data.amount,
      account_id: accountId,
      to_account_id: toAccountId,
      to_amount: data.toAmount || null,
      category_id: categoryId,
      note: data.note || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('scheduled');
  return { success: true, scheduled: result };
};

export const updateScheduledTransaction = async (id, data) => {
  const userId = await getUserId();

  // Obtener IDs si vienen por nombre
  let accountId = data.accountId;
  let toAccountId = data.toAccountId;
  let categoryId = data.categoryId;

  if (data.accountName && !accountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.accountName)
      .single();
    accountId = account?.id;
  }

  if (data.toAccountName && !toAccountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.toAccountName)
      .single();
    toAccountId = account?.id;
  }

  if (data.categoryName && !categoryId) {
    const { data: category } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', data.categoryName)
      .single();
    categoryId = category?.id;
  }

  const updateData = {};
  if (data.scheduledDate !== undefined) updateData.scheduled_date = data.scheduledDate;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (accountId !== undefined) updateData.account_id = accountId;
  if (toAccountId !== undefined) updateData.to_account_id = toAccountId;
  if (data.toAmount !== undefined) updateData.to_amount = data.toAmount;
  if (categoryId !== undefined) updateData.category_id = categoryId;
  if (data.note !== undefined) updateData.note = data.note;

  const { data: result, error } = await supabase
    .from('scheduled_transactions')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  invalidateCache('scheduled');
  return { success: true, scheduled: result };
};

export const deleteScheduledTransaction = async (id) => {
  const userId = await getUserId();

  const { error } = await supabase
    .from('scheduled_transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
  invalidateCache('scheduled');
  return { success: true };
};

export const approveScheduledTransaction = async (id) => {
  const userId = await getUserId();

  // Obtener la transacción programada
  const { data: scheduled, error: fetchError } = await supabase
    .from('scheduled_transactions')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError) throw fetchError;
  if (!scheduled) throw new Error('Transacción no encontrada');
  if (scheduled.status !== 'pending') throw new Error('Solo se pueden aprobar transacciones pendientes');

  // Crear el movimiento/transferencia real según el tipo
  if (scheduled.type === 'transfer') {
    // Crear transferencia
    const { error: transferError } = await supabase
      .from('transfers')
      .insert({
        user_id: userId,
        date: scheduled.scheduled_date,
        from_account_id: scheduled.account_id,
        to_account_id: scheduled.to_account_id,
        from_amount: scheduled.amount,
        to_amount: scheduled.to_amount || scheduled.amount,
        note: scheduled.note,
      });

    if (transferError) throw transferError;
    invalidateCache('transfer');
  } else {
    // Crear movimiento (income/expense)
    const { error: movementError } = await supabase
      .from('movements')
      .insert({
        user_id: userId,
        type: scheduled.type,
        date: scheduled.scheduled_date,
        amount: scheduled.amount,
        account_id: scheduled.account_id,
        category_id: scheduled.category_id,
        note: scheduled.note,
      });

    if (movementError) throw movementError;
    invalidateCache(scheduled.type === 'income' ? 'income' : 'expense');
  }

  // Marcar como ejecutada
  const { error: updateError } = await supabase
    .from('scheduled_transactions')
    .update({ status: 'executed' })
    .eq('id', id);

  if (updateError) throw updateError;
  invalidateCache('scheduled');
  return { success: true };
};

export const rejectScheduledTransaction = async (id) => {
  const userId = await getUserId();

  const { error } = await supabase
    .from('scheduled_transactions')
    .update({ status: 'rejected' })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
  invalidateCache('scheduled');
  return { success: true };
};

// ============================================
// PUSH SUBSCRIPTIONS
// ============================================

export const getPushSubscriptions = async () => {
  const userId = await getUserId();

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return { subscriptions: data || [] };
};

export const deletePushSubscription = async (endpoint) => {
  const userId = await getUserId();

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) throw error;
  return { success: true };
};

export const deleteAllPushSubscriptions = async () => {
  const userId = await getUserId();

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
  return { success: true };
};

// ============================================
// AUTO RULES (Reglas automáticas de categorización)
// ============================================

/**
 * Obtener todas las reglas del usuario con sus condiciones y acciones
 * Ordenadas por prioridad descendente (mayor prioridad primero)
 */
export const getAutoRules = () => withDeduplication('autoRules', async () => {
  const userId = await getUserId();

  const { data: rules, error } = await supabase
    .from('auto_rules')
    .select(`
      *,
      conditions:auto_rule_conditions(*),
      actions:auto_rule_actions(*)
    `)
    .eq('user_id', userId)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  const result = { rules: rules || [] };
  setCachedData('autoRules', result);
  return result;
});

/**
 * Crear una nueva regla automática con sus condiciones y acciones
 */
export const createAutoRule = async ({ name, logicOperator = 'AND', priority = 0, conditions = [], actions = [] }) => {
  const userId = await getUserId();

  // Insertar la regla principal
  const { data: rule, error: ruleError } = await supabase
    .from('auto_rules')
    .insert({
      user_id: userId,
      name,
      logic_operator: logicOperator,
      priority,
      is_active: true,
    })
    .select()
    .single();

  if (ruleError) throw ruleError;

  // Insertar condiciones
  if (conditions.length > 0) {
    const conditionsToInsert = conditions.map(c => ({
      rule_id: rule.id,
      field: c.field,
      operator: c.operator,
      value: c.value,
    }));

    const { error: condError } = await supabase
      .from('auto_rule_conditions')
      .insert(conditionsToInsert);

    if (condError) throw condError;
  }

  // Insertar acciones
  if (actions.length > 0) {
    const actionsToInsert = actions.map(a => ({
      rule_id: rule.id,
      field: a.field,
      value: a.value,
    }));

    const { error: actError } = await supabase
      .from('auto_rule_actions')
      .insert(actionsToInsert);

    if (actError) throw actError;
  }

  invalidateCache('autoRules');
  emit(DataEvents.RULES_CHANGED);
  return { success: true, rule };
};

/**
 * Actualizar una regla existente (reemplaza condiciones y acciones)
 */
export const updateAutoRule = async (id, { name, logicOperator, priority, isActive, conditions, actions }) => {
  // Actualizar la regla principal
  const updateData = { updated_at: new Date().toISOString() };
  if (name !== undefined) updateData.name = name;
  if (logicOperator !== undefined) updateData.logic_operator = logicOperator;
  if (priority !== undefined) updateData.priority = priority;
  if (isActive !== undefined) updateData.is_active = isActive;

  const { data: rule, error: ruleError } = await supabase
    .from('auto_rules')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (ruleError) throw ruleError;

  // Si se proporcionan condiciones, reemplazar las existentes
  if (conditions !== undefined) {
    await supabase.from('auto_rule_conditions').delete().eq('rule_id', id);

    if (conditions.length > 0) {
      const conditionsToInsert = conditions.map(c => ({
        rule_id: id,
        field: c.field,
        operator: c.operator,
        value: c.value,
      }));

      const { error: condError } = await supabase
        .from('auto_rule_conditions')
        .insert(conditionsToInsert);

      if (condError) throw condError;
    }
  }

  // Si se proporcionan acciones, reemplazar las existentes
  if (actions !== undefined) {
    await supabase.from('auto_rule_actions').delete().eq('rule_id', id);

    if (actions.length > 0) {
      const actionsToInsert = actions.map(a => ({
        rule_id: id,
        field: a.field,
        value: a.value,
      }));

      const { error: actError } = await supabase
        .from('auto_rule_actions')
        .insert(actionsToInsert);

      if (actError) throw actError;
    }
  }

  invalidateCache('autoRules');
  emit(DataEvents.RULES_CHANGED);
  return { success: true, rule };
};

/**
 * Eliminar una regla (CASCADE elimina condiciones y acciones)
 */
export const deleteAutoRule = async (id) => {
  const { error } = await supabase
    .from('auto_rules')
    .delete()
    .eq('id', id);

  if (error) throw error;

  invalidateCache('autoRules');
  emit(DataEvents.RULES_CHANGED);
  return { success: true };
};

/**
 * Activar/desactivar una regla
 */
export const toggleAutoRule = async (id, isActive) => {
  const { data, error } = await supabase
    .from('auto_rules')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  invalidateCache('autoRules');
  emit(DataEvents.RULES_CHANGED);
  return { success: true, rule: data };
};

/**
 * Reordenar prioridades de reglas
 * @param {Array<{id: string, priority: number}>} rules - Array de reglas con nuevas prioridades
 */
export const reorderAutoRules = async (rules) => {
  const updates = rules.map(({ id, priority }) =>
    supabase
      .from('auto_rules')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', id)
  );

  await Promise.all(updates);

  invalidateCache('autoRules');
  emit(DataEvents.RULES_CHANGED);
  return { success: true };
};

/**
 * Evaluar reglas automáticas contra datos de un movimiento
 * Retorna la primera regla que matchea (por prioridad) o null
 *
 * @param {Object} params
 * @param {string} params.note - Nota/descripción del movimiento
 * @param {number} params.amount - Monto del movimiento
 * @param {string} params.accountId - ID de la cuenta seleccionada
 * @param {string} params.type - Tipo de movimiento ('income' | 'expense')
 * @returns {Object|null} - { ruleId, ruleName, actions: { category_id?, account_id? } } o null
 */
export const evaluateAutoRules = async ({ note = '', amount = 0, accountId = '', type = 'expense' }) => {
  const userId = await getUserId();

  // Obtener reglas activas ordenadas por prioridad
  const { data: rules, error } = await supabase
    .from('auto_rules')
    .select(`
      *,
      conditions:auto_rule_conditions(*),
      actions:auto_rule_actions(*)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) throw error;
  if (!rules || rules.length === 0) return null;

  // Helper para evaluar una condición individual
  const evaluateCondition = (condition) => {
    const { field, operator, value } = condition;

    switch (field) {
      case 'note': {
        const noteLC = (note || '').toLowerCase();
        const valueLC = value.toLowerCase();

        switch (operator) {
          case 'contains':
            return noteLC.includes(valueLC);
          case 'equals':
            return noteLC === valueLC;
          case 'starts_with':
            return noteLC.startsWith(valueLC);
          case 'ends_with':
            return noteLC.endsWith(valueLC);
          default:
            return false;
        }
      }

      case 'amount': {
        const numAmount = parseFloat(amount) || 0;
        const numValue = parseFloat(value) || 0;

        switch (operator) {
          case 'equals':
            return numAmount === numValue;
          case 'greater_than':
            return numAmount > numValue;
          case 'less_than':
            return numAmount < numValue;
          case 'between': {
            // value format: "min|max"
            const [min, max] = value.split('|').map(Number);
            return numAmount >= min && numAmount <= max;
          }
          default:
            return false;
        }
      }

      case 'account_id':
        return accountId === value;

      case 'type':
        return type === value;

      default:
        return false;
    }
  };

  // Buscar la primera regla que matchea
  for (const rule of rules) {
    if (!rule.conditions || rule.conditions.length === 0) continue;

    const conditionResults = rule.conditions.map(evaluateCondition);
    const logicOp = rule.logic_operator || 'AND';

    const ruleMatches = logicOp === 'AND'
      ? conditionResults.every(Boolean)
      : conditionResults.some(Boolean);

    if (ruleMatches) {
      // Construir objeto de acciones
      const actionsObj = {};
      for (const action of rule.actions || []) {
        actionsObj[action.field] = action.value;
      }

      return {
        ruleId: rule.id,
        ruleName: rule.name,
        actions: actionsObj,
      };
    }
  }

  return null;
};
