import { API_URL, CACHE_DURATION } from '../config/api';

// Cache simple en memoria
const cache = new Map();

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_DURATION) {
    return item.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function clearCache() {
  cache.clear();
}

// Función genérica para GET
async function fetchGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

// Función genérica para POST
async function fetchPost(action, body) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: JSON.stringify({ action, ...body }),
  });

  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

// ============================================
// FUNCIONES GET
// ============================================

export async function getAccounts() {
  const cacheKey = 'accounts';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchGet('getAccounts');
  setCache(cacheKey, data);
  return data;
}

export async function getCategories() {
  const cacheKey = 'categories';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchGet('getCategories');
  setCache(cacheKey, data);
  return data;
}

export async function getDashboard() {
  const data = await fetchGet('getDashboard');
  return data;
}

export async function getRecentMovements(limit = 10) {
  const data = await fetchGet('getRecentMovements', { limit });
  return data;
}

export async function getExchangeRate() {
  const data = await fetchGet('getExchangeRate');
  return data;
}

/**
 * Obtiene todas las categorías con rowIndex (para gestión)
 * Fallback: construye desde getCategories
 */
export async function getCategoriesAll() {
  try {
    const data = await fetchGet('getCategoriesAll');
    if (data.success && data.categories) {
      return data;
    }
  } catch (e) {
    console.log('getCategoriesAll not available, using fallback');
  }
  // Fallback - construir lista basica
  const data = await fetchGet('getCategories');
  const categories = [];
  let idx = 2;
  (data.categorias?.ingresos || []).forEach(nombre => {
    categories.push({ rowIndex: idx++, nombre, tipo: 'Ingreso' });
  });
  (data.categorias?.gastos || []).forEach(nombre => {
    categories.push({ rowIndex: idx++, nombre, tipo: 'Gasto' });
  });
  return { success: true, categories };
}

/**
 * Obtiene todos los gastos
 * Fallback: usa getRecentMovements y filtra
 */
export async function getAllExpenses() {
  try {
    const data = await fetchGet('getAllExpenses');
    if (data.success && data.expenses) {
      return data;
    }
  } catch (e) {
    console.log('getAllExpenses not available, using fallback');
  }
  // Fallback
  const data = await fetchGet('getRecentMovements', { limit: 1000 });
  const expenses = (data.movements || []).filter(m => m.tipo === 'gasto');
  return { success: true, expenses };
}

/**
 * Obtiene todos los ingresos
 * Fallback: usa getRecentMovements y filtra
 */
export async function getAllIncomes() {
  try {
    const data = await fetchGet('getAllIncomes');
    if (data.success && data.incomes) {
      return data;
    }
  } catch (e) {
    console.log('getAllIncomes not available, using fallback');
  }
  // Fallback
  const data = await fetchGet('getRecentMovements', { limit: 1000 });
  const incomes = (data.movements || []).filter(m => m.tipo === 'ingreso');
  return { success: true, incomes };
}

/**
 * Obtiene todas las transferencias
 * Fallback: usa getRecentMovements y filtra
 */
export async function getAllTransfers() {
  try {
    const data = await fetchGet('getAllTransfers');
    if (data.success && data.transfers) {
      return data;
    }
  } catch (e) {
    console.log('getAllTransfers not available, using fallback');
  }
  // Fallback
  const data = await fetchGet('getRecentMovements', { limit: 1000 });
  const transfers = (data.movements || []).filter(m => m.tipo === 'transferencia');
  return { success: true, transfers };
}

// ============================================
// FUNCIONES POST
// ============================================

export async function addIncome({ fecha, monto, cuenta, categoria, nota }) {
  const result = await fetchPost('addIncome', {
    fecha,
    monto,
    cuenta,
    categoria,
    nota,
  });
  clearCache();
  return result;
}

export async function addExpense({ fecha, monto, cuenta, categoria, nota }) {
  const result = await fetchPost('addExpense', {
    fecha,
    monto,
    cuenta,
    categoria,
    nota,
  });
  clearCache();
  return result;
}

export async function addTransfer({ fecha, cuentaSaliente, cuentaEntrante, montoSaliente, montoEntrante, nota }) {
  const result = await fetchPost('addTransfer', {
    fecha,
    cuentaSaliente,
    cuentaEntrante,
    montoSaliente,
    montoEntrante,
    nota,
  });
  clearCache();
  return result;
}

// ============================================
// FUNCIONES DE CUENTAS
// ============================================

/**
 * Agrega una nueva cuenta
 */
export async function addAccount({ nombre, balanceInicial, moneda, numeroCuenta, tipo }) {
  const result = await fetchPost('addAccount', {
    nombre,
    balanceInicial,
    moneda,
    numeroCuenta,
    tipo,
  });
  clearCache();
  return result;
}

/**
 * Actualiza una cuenta (solo campos editables)
 */
export async function updateAccount(account) {
  const result = await fetchPost('updateAccount', {
    rowIndex: account.rowIndex,
    nombre: account.nombre,
    balanceInicial: account.balanceInicial,
    moneda: account.moneda,
    numeroCuenta: account.numeroCuenta,
    tipo: account.tipo,
  });
  clearCache();
  return result;
}

/**
 * Elimina una cuenta
 */
export async function deleteAccount(rowIndex) {
  const result = await fetchPost('deleteAccount', { rowIndex });
  clearCache();
  return result;
}

// ============================================
// FUNCIONES DE CATEGORÍAS
// ============================================

/**
 * Agrega una nueva categoría
 */
export async function addCategory({ nombre, tipo }) {
  const result = await fetchPost('addCategory', { nombre, tipo });
  clearCache();
  return result;
}

/**
 * Actualiza una categoría
 */
export async function updateCategory({ rowIndex, nombre, tipo }) {
  const result = await fetchPost('updateCategory', { rowIndex, nombre, tipo });
  clearCache();
  return result;
}

/**
 * Elimina una categoría
 */
export async function deleteCategory(rowIndex) {
  const result = await fetchPost('deleteCategory', { rowIndex });
  clearCache();
  return result;
}

// ============================================
// FUNCIONES CON FILTROS (cliente-side)
// ============================================

/**
 * Obtiene todos los movimientos y los filtra en el cliente
 * Soporta arrays para filtros multi-seleccion
 */
export async function getMovementsFiltered({
  fromDate,
  toDate,
  tipos = [],      // Array de tipos: ['ingreso', 'gasto', 'transferencia']
  cuentas = [],    // Array de nombres de cuentas
  categorias = [], // Array de categorias
  limit = 100
} = {}) {
  // Obtener todos los movimientos (aumentamos el limite)
  const data = await fetchGet('getRecentMovements', { limit });

  if (!data.success || !data.movements) {
    return data;
  }

  let filtered = data.movements;

  // Filtrar por fecha
  if (fromDate) {
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    filtered = filtered.filter(m => {
      const fecha = new Date(m.fecha);
      return fecha >= from;
    });
  }

  if (toDate) {
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    filtered = filtered.filter(m => {
      const fecha = new Date(m.fecha);
      return fecha <= to;
    });
  }

  // Filtrar por tipos (array)
  if (tipos && tipos.length > 0) {
    filtered = filtered.filter(m => tipos.includes(m.tipo));
  }

  // Filtrar por cuentas (array)
  if (cuentas && cuentas.length > 0) {
    filtered = filtered.filter(m => cuentas.includes(m.cuenta));
  }

  // Filtrar por categorias (array)
  if (categorias && categorias.length > 0) {
    filtered = filtered.filter(m => categorias.includes(m.categoria));
  }

  return { success: true, movements: filtered };
}

/**
 * Calcula el resumen del dashboard para un rango de fechas
 */
export async function getDashboardFiltered({ fromDate, toDate } = {}) {
  // Obtener datos base
  const [dashboardData, movementsData] = await Promise.all([
    fetchGet('getDashboard'),
    fetchGet('getRecentMovements', { limit: 500 })
  ]);

  if (!dashboardData.success) {
    return dashboardData;
  }

  // Si no hay filtro de fecha, devolver el dashboard normal
  if (!fromDate && !toDate) {
    return dashboardData;
  }

  const from = fromDate ? new Date(fromDate) : new Date(0);
  from.setHours(0, 0, 0, 0);

  const to = toDate ? new Date(toDate) : new Date();
  to.setHours(23, 59, 59, 999);

  // Filtrar movimientos por fecha y calcular totales
  const movements = movementsData.movements || [];

  let ingresosPeriodo = 0;
  let gastosPeriodo = 0;

  movements.forEach(m => {
    const fecha = new Date(m.fecha);
    if (fecha >= from && fecha <= to) {
      const monto = m.montoPesos || m.monto || 0;
      if (m.tipo === 'ingreso') {
        ingresosPeriodo += monto;
      } else if (m.tipo === 'gasto') {
        gastosPeriodo += monto;
      }
    }
  });

  return {
    success: true,
    dashboard: {
      ...dashboardData.dashboard,
      ingresosMes: ingresosPeriodo,
      gastosMes: gastosPeriodo,
      balanceMes: ingresosPeriodo - gastosPeriodo,
    }
  };
}

/**
 * Actualiza un movimiento existente
 * Soporta ingresos, gastos y transferencias
 */
export async function updateMovement(movement) {
  let action;
  let body;

  if (movement.tipo === 'transferencia') {
    action = 'updateTransfer';
    body = {
      rowIndex: movement.rowIndex,
      fecha: movement.fecha,
      cuentaSaliente: movement.cuentaSaliente,
      cuentaEntrante: movement.cuentaEntrante,
      montoSaliente: movement.montoSaliente,
      montoEntrante: movement.montoEntrante,
      nota: movement.nota,
    };
  } else {
    action = movement.tipo === 'ingreso' ? 'updateIncome' : 'updateExpense';
    body = {
      rowIndex: movement.rowIndex,
      fecha: movement.fecha,
      monto: movement.monto,
      cuenta: movement.cuenta,
      categoria: movement.categoria,
      nota: movement.nota,
    };
  }

  const result = await fetchPost(action, body);
  clearCache();
  return result;
}

/**
 * Elimina un movimiento
 * Soporta ingresos, gastos y transferencias
 */
export async function deleteMovement(movement) {
  let action;

  if (movement.tipo === 'transferencia') {
    action = 'deleteTransfer';
  } else if (movement.tipo === 'ingreso') {
    action = 'deleteIncome';
  } else {
    action = 'deleteExpense';
  }

  const result = await fetchPost(action, {
    rowIndex: movement.rowIndex,
  });
  clearCache();
  return result;
}

// ============================================
// FUNCIONES DE CUOTAS (Tarjetas de Crédito)
// ============================================

/**
 * Agrega un gasto en cuotas (para tarjetas de crédito)
 * Crea automáticamente N filas de gastos (una por cada cuota)
 */
export async function addExpenseWithInstallments({
  fechaCompra,
  montoTotal,
  cuenta,
  categoria,
  nota,
  cantidadCuotas
}) {
  const result = await fetchPost('addExpenseWithInstallments', {
    fechaCompra,
    montoTotal,
    cuenta,
    categoria,
    nota,
    cantidadCuotas,
  });
  clearCache();
  return result;
}

/**
 * Obtiene todas las cuotas de una compra por su ID
 */
export async function getInstallmentsByPurchase(idCompra) {
  const data = await fetchGet('getInstallmentsByPurchase', { idCompra });
  return data;
}

/**
 * Obtiene compras con cuotas pendientes (futuras)
 */
export async function getPendingInstallments() {
  const data = await fetchGet('getPendingInstallments');
  return data;
}

/**
 * Elimina todas las cuotas de una compra por su ID
 */
export async function deleteInstallmentsByPurchase(idCompra) {
  const result = await fetchPost('deleteInstallmentsByPurchase', { idCompra });
  clearCache();
  return result;
}
