import { supabase } from '../config/supabase';

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
    return;
  }
  
  const keysToDelete = [];
  for (const key of cache.keys()) {
    if (key.includes(type) || key.includes('dashboard') || key.includes('movements') || key.includes('income') || key.includes('expense')) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => cache.delete(key));
  
  // También limpiar pending requests relacionadas
  for (const key of pendingRequests.keys()) {
    if (!type || key.includes(type) || key.includes('dashboard') || key.includes('movements') || key.includes('income') || key.includes('expense')) {
      pendingRequests.delete(key);
    }
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
  
  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) throw error;

  // If no accounts, return empty immediately
  if (!accounts || accounts.length === 0) {
    const result = { accounts: [] };
    setCachedData('accounts', result);
    return result;
  }

  // Get balances for each account
  const accountsWithBalances = await Promise.all(
    accounts.map(async (account) => {
      const balance = await calculateAccountBalance(account.id, account.initial_balance);
      return {
        id: account.id,
        nombre: account.name,
        moneda: account.currency === 'ARS' ? 'Peso' : 'Dólar',
        balanceInicial: account.initial_balance,
        numeroCuenta: account.account_number || '',
        tipo: accountTypeFromDb(account.account_type),
        esTarjetaCredito: account.is_credit_card,
        diaCierre: account.closing_day,
        balanceActual: balance,
        icon: account.icon || null,
        // Keep original fields too
        ...account
      };
    })
  );

  const result = { accounts: accountsWithBalances };
  setCachedData('accounts', result);
  return result;
});

const calculateAccountBalance = async (accountId, initialBalance) => {
  const userId = await getUserId();
  
  // Sum incomes
  const { data: incomes } = await supabase
    .from('movements')
    .select('amount')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('type', 'income');
  
  const totalIncomes = (incomes || []).reduce((sum, m) => sum + parseFloat(m.amount), 0);

  // Sum expenses
  const { data: expenses } = await supabase
    .from('movements')
    .select('amount')
    .eq('user_id', userId)
    .eq('account_id', accountId)
    .eq('type', 'expense');
  
  const totalExpenses = (expenses || []).reduce((sum, m) => sum + parseFloat(m.amount), 0);

  // Sum transfers in
  const { data: transfersIn } = await supabase
    .from('transfers')
    .select('to_amount')
    .eq('user_id', userId)
    .eq('to_account_id', accountId);
  
  const totalTransfersIn = (transfersIn || []).reduce((sum, t) => sum + parseFloat(t.to_amount), 0);

  // Sum transfers out
  const { data: transfersOut } = await supabase
    .from('transfers')
    .select('from_amount')
    .eq('user_id', userId)
    .eq('from_account_id', accountId);
  
  const totalTransfersOut = (transfersOut || []).reduce((sum, t) => sum + parseFloat(t.from_amount), 0);

  return parseFloat(initialBalance) + totalIncomes - totalExpenses + totalTransfersIn - totalTransfersOut;
};

export const addAccount = async ({ nombre, balanceInicial, moneda, numeroCuenta, tipo, esTarjetaCredito, diaCierre, icon }) => {
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
      icon: icon || null
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('accounts');
  return { success: true, account: data };
};

export const updateAccount = async ({ id, rowIndex, nombre, balanceInicial, moneda, numeroCuenta, tipo, esTarjetaCredito, diaCierre, icon }) => {
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
      icon: icon || null
    })
    .eq('id', accountId)
    .select()
    .single();

  if (error) throw error;
  invalidateCache('accounts');
  return { success: true, account: data };
};

export const deleteAccount = async (idOrRowIndex) => {
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
  
  const { error } = await supabase
    .from('accounts')
    .delete()
    .in('id', ids);

  if (error) throw error;
  invalidateCache('accounts');
  return { success: true };
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
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) throw error;

  const mapCategory = (c) => {
    // If there's a custom icon (URL), use it
    // Otherwise, try to extract an emoji from the name
    const customIcon = c.icon || null;
    const emojiFromName = !customIcon ? extractLeadingEmoji(c.name) : null;

    // If we're using an emoji from the name as icon, remove it from the label
    let displayLabel = c.name;
    if (emojiFromName && !customIcon) {
      displayLabel = c.name.slice(emojiFromName.length).trim();
    }

    return {
      value: c.name,  // Keep original name as value for saving
      label: displayLabel,  // Clean label for display
      icon: customIcon || emojiFromName
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
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) throw error;

  const result = {
    categorias: categories.map(c => ({
      id: c.id,
      rowIndex: c.id, // compatibility
      nombre: c.name,
      tipo: c.type === 'income' ? 'Ingreso' : 'Gasto',
      icon: c.icon || null
    }))
  };
  setCachedData(cacheKey, result);
  return result;
};

export const addCategory = async ({ nombre, tipo, icon }) => {
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
      icon: icon || null
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('categories');
  return { success: true, category: data };
};

export const updateCategory = async ({ id, rowIndex, nombre, tipo, icon }) => {
  const categoryId = id || rowIndex;
  const { data, error } = await supabase
    .from('categories')
    .update({
      name: nombre,
      type: tipo === 'Ingreso' ? 'income' : 'expense',
      icon: icon !== undefined ? icon : null
    })
    .eq('id', categoryId)
    .select()
    .single();

  if (error) throw error;
  invalidateCache('categories');
  return { success: true, category: data };
};

export const deleteCategory = async (idOrRowIndex) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', idOrRowIndex);

  if (error) throw error;
  invalidateCache('categories');
  return { success: true };
};

export const bulkDeleteCategories = async (categoryIds) => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .in('id', categoryIds);

  if (error) throw error;
  invalidateCache('categories');
  return { success: true };
};

// ============================================
// MOVEMENTS (Incomes & Expenses)
// ============================================
const mapMovementFromDB = (m, accounts, categories) => {
  const account = accounts?.find(a => a.id === m.account_id);
  const category = categories?.find(c => c.id === m.category_id);
  
  return {
    id: m.id,
    rowIndex: m.id, // compatibility
    fecha: m.date,
    monto: parseFloat(m.amount),
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
  };
};

export const getExpenses = async () => {
  const cacheKey = 'expenses';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

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

export const getIncomes = async () => {
  const cacheKey = 'incomes';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

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

export const addExpense = async ({ fecha, monto, cuenta, categoria, nota }) => {
  const userId = await getUserId();
  
  // Get account and category IDs
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

  const { data, error } = await supabase
    .from('movements')
    .insert({
      user_id: userId,
      type: 'expense',
      date: fecha,
      amount: monto,
      account_id: account?.id,
      category_id: categoryData?.id,
      note: nota || null
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('expense');
  return { success: true, movement: data };
};

export const addIncome = async ({ fecha, monto, cuenta, categoria, nota }) => {
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

  const { data, error } = await supabase
    .from('movements')
    .insert({
      user_id: userId,
      type: 'income',
      date: fecha,
      amount: monto,
      account_id: account?.id,
      category_id: categoryData?.id,
      note: nota || null
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('income');
  return { success: true, movement: data };
};

export const updateMovement = async (movement) => {
  console.log('updateMovement called with:', movement);
  
  const userId = await getUserId();
  
  // Buscar cuenta
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('name', movement.cuenta);

  const account = accounts?.[0];
  console.log('Found account:', account);

  // Buscar categoría (solo si no es transferencia)
  let categoryId = null;
  if (movement.categoria) {
    const { data: categories } = await supabase
      .from('categories')
      .select('id')
      .eq('user_id', userId)
      .eq('name', movement.categoria);

    categoryId = categories?.[0]?.id || null;
    console.log('Found category:', categories?.[0]);
  }

  const id = movement.id || movement.rowIndex;
  console.log('Movement ID to update:', id);
  
  const updatePayload = {
    date: movement.fecha,
    amount: movement.monto,
    account_id: account?.id,
    category_id: categoryId,
    note: movement.nota || null
  };
  console.log('Update payload:', updatePayload);
  
  const { data, error } = await supabase
    .from('movements')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  console.log('Update result:', { data, error });

  if (error) throw error;
  invalidateCache('');
  return { success: true, movement: data };
};

export const deleteMovement = async (movement) => {
  const id = movement.id || movement.rowIndex;
  
  const { error } = await supabase
    .from('movements')
    .delete()
    .eq('id', id);

  if (error) throw error;
  invalidateCache('');
  return { success: true };
};

export const deleteMultipleMovements = async (movements) => {
  const ids = movements.map(m => m.id || m.rowIndex);
  
  const { error } = await supabase
    .from('movements')
    .delete()
    .in('id', ids);

  if (error) throw error;
  invalidateCache('');
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
  }

  const { error } = await supabase
    .from('movements')
    .update(updateData)
    .in('id', ids);

  if (error) throw error;
  invalidateCache('');
  return { success: true };
};

// ============================================
// TRANSFERS
// ============================================
export const getTransfers = async () => {
  const cacheKey = 'transfers';
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

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
        montoSaliente: parseFloat(t.from_amount),
        montoEntrante: parseFloat(t.to_amount),
        nota: t.note || '',
        tipo: 'transferencia'
      };
    })
  };
  setCachedData(cacheKey, result);
  return result;
};

export const addTransfer = async ({ fecha, cuentaSaliente, cuentaEntrante, montoSaliente, montoEntrante, nota }) => {
  const userId = await getUserId();
  
  const { data: fromAccount } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('name', cuentaSaliente)
    .single();

  const { data: toAccount } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('name', cuentaEntrante)
    .single();

  const { data, error } = await supabase
    .from('transfers')
    .insert({
      user_id: userId,
      date: fecha,
      from_account_id: fromAccount?.id,
      to_account_id: toAccount?.id,
      from_amount: montoSaliente,
      to_amount: montoEntrante,
      note: nota || null
    })
    .select()
    .single();

  if (error) throw error;
  invalidateCache('transfer');
  return { success: true, transfer: data };
};

// ============================================
// DASHBOARD
// ============================================
export const getDashboard = async () => {
  const userId = await getUserId();
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [{ data: incomes }, { data: expenses }] = await Promise.all([
    supabase
      .from('movements')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'income')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth),
    supabase
      .from('movements')
      .select('amount')
      .eq('user_id', userId)
      .eq('type', 'expense')
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

  const [{ data: incomes }, { data: expenses }] = await Promise.all([
    supabase
      .from('movements')
      .select('amount, account_id')
      .eq('user_id', userId)
      .eq('type', 'income')
      .gte('date', startDate)
      .lte('date', endDate),
    supabase
      .from('movements')
      .select('amount, account_id')
      .eq('user_id', userId)
      .eq('type', 'expense')
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
      tipo: 'transferencia'
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
export const addInstallmentPurchase = async ({ descripcion, montoTotal, cuotas, cuenta, categoria, fechaInicio }) => {
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
      total_installments: cuotas
    });
  }

  const { error: movementsError } = await supabase
    .from('movements')
    .insert(movements);

  if (movementsError) throw movementsError;

  invalidateCache('');
  return { success: true, purchase };
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

  invalidateCache('');
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
export const getAllExpenses = async () => {
  const result = await getExpenses();
  return { success: true, expenses: result.gastos };
};

export const getAllIncomes = async () => {
  const result = await getIncomes();
  return { success: true, incomes: result.ingresos };
};

export const getAllTransfers = async () => {
  const result = await getTransfers();
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

  // Map movements
  (movements || []).forEach(m => {
    const account = accounts?.find(a => a.id === m.account_id);
    const category = categoriesData?.find(c => c.id === m.category_id);
    result.push({
      id: m.id,
      rowIndex: m.id,
      fecha: m.date,
      monto: parseFloat(m.amount),
      cuenta: account?.name || '',
      categoria: category?.name || '',
      nota: m.note || '',
      tipo: m.type === 'income' ? 'ingreso' : 'gasto',
    });
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
    });
  });

  // Sort by date
  result.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  // Apply filters
  if (tipos && tipos.length > 0) {
    result = result.filter(m => tipos.includes(m.tipo));
  }
  if (cuentas && cuentas.length > 0) {
    result = result.filter(m => cuentas.includes(m.cuenta));
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
