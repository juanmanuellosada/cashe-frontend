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

// Invalida cache específico por tipo de movimiento
export function invalidateMovementCache(type) {
  const keysToDelete = [];
  if (type === 'gasto' || type === 'expense') {
    keysToDelete.push('allExpenses');
  } else if (type === 'ingreso' || type === 'income') {
    keysToDelete.push('allIncomes');
  } else if (type === 'transferencia' || type === 'transfer') {
    keysToDelete.push('allTransfers');
  }
  keysToDelete.forEach(key => cache.delete(key));
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
 * Con caché para mejorar rendimiento
 */
export async function getCategoriesAll() {
  const cacheKey = 'categoriesAll';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchGet('getCategoriesAll');
  if (data.success && data.categories) {
    setCache(cacheKey, data);
    return data;
  }
  
  throw new Error('getCategoriesAll endpoint not available');
}

/**
 * Obtiene todos los gastos
 * Con caché para mejorar rendimiento
 */
export async function getAllExpenses() {
  const cacheKey = 'allExpenses';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchGet('getAllExpenses');
  if (data.success && data.expenses) {
    setCache(cacheKey, data);
    return data;
  }
  
  // Si el endpoint no existe, el servidor devuelve error
  throw new Error('getAllExpenses endpoint not available');
}

/**
 * Obtiene todos los ingresos
 * Con caché para mejorar rendimiento
 */
export async function getAllIncomes() {
  const cacheKey = 'allIncomes';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchGet('getAllIncomes');
  if (data.success && data.incomes) {
    setCache(cacheKey, data);
    return data;
  }
  
  throw new Error('getAllIncomes endpoint not available');
}

/**
 * Obtiene todas las transferencias
 * Con caché para mejorar rendimiento
 */
export async function getAllTransfers() {
  const cacheKey = 'allTransfers';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const data = await fetchGet('getAllTransfers');
  if (data.success && data.transfers) {
    setCache(cacheKey, data);
    return data;
  }
  
  throw new Error('getAllTransfers endpoint not available');
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

export async function addExpense({ fecha, monto, cuenta, categoria, nota, moneda }) {
  const result = await fetchPost('addExpense', {
    fecha,
    monto,
    cuenta,
    categoria,
    nota,
    moneda, // 'ARS' o 'USD' para tarjetas de crédito
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
    esTarjetaCredito: account.esTarjetaCredito || false,
    diaCierre: account.diaCierre || null,
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

/**
 * Elimina múltiples movimientos
 * @param {Array} movements - Array de movimientos a eliminar
 */
export async function bulkDeleteMovements(movements) {
  // Ordenar por rowIndex descendente para borrar de abajo hacia arriba
  // (evita que cambien los índices al borrar)
  const sorted = [...movements].sort((a, b) => b.rowIndex - a.rowIndex);
  
  const results = [];
  for (const movement of sorted) {
    try {
      const result = await deleteMovement(movement);
      results.push({ success: true, movement });
    } catch (err) {
      results.push({ success: false, movement, error: err.message });
    }
  }
  
  clearCache();
  return results;
}

/**
 * Actualiza múltiples movimientos con un campo específico
 * @param {Array} movements - Array de movimientos a actualizar
 * @param {string} field - Campo a actualizar ('cuenta', 'categoria')
 * @param {string} value - Nuevo valor
 */
export async function bulkUpdateMovements(movements, field, value) {
  const results = [];
  
  for (const movement of movements) {
    try {
      const updatedMovement = { ...movement, [field]: value };
      const result = await updateMovement(updatedMovement);
      results.push({ success: true, movement });
    } catch (err) {
      results.push({ success: false, movement, error: err.message });
    }
  }
  
  clearCache();
  return results;
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
  cantidadCuotas,
  moneda
}) {
  const result = await fetchPost('addExpenseWithInstallments', {
    fechaCompra,
    montoTotal,
    cuenta,
    categoria,
    nota,
    cantidadCuotas,
    moneda, // 'ARS' o 'USD' para tarjetas de crédito
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
