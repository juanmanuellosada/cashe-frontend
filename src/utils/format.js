/**
 * Formatea un monto en formato argentino
 * - Separador de miles: punto (.)
 * - Separador decimal: coma (,)
 * - Siempre 2 decimales
 *
 * @param {number} amount - El monto a formatear
 * @param {string} currency - 'ARS' para pesos, 'USD' para dolares
 * @returns {string} - Monto formateado (ej: "$ 1.234,56" o "US$ 1.234,56")
 */
export function formatCurrency(amount, currency = 'ARS') {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return currency === 'USD' ? 'US$ -' : '$ -';
  }

  // Formatear el numero con separadores argentinos
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Agregar el prefijo de moneda
  const prefix = currency === 'USD' ? 'US$ ' : '$ ';

  return prefix + formatted;
}

/**
 * Formatea un monto con signo (+ o -)
 * @param {number} amount - El monto a formatear
 * @param {string} currency - 'ARS' para pesos, 'USD' para dolares
 * @param {boolean} forceSign - Si es true, siempre muestra el signo
 * @returns {string} - Monto formateado con signo
 */
export function formatCurrencyWithSign(amount, currency = 'ARS', forceSign = true) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return currency === 'USD' ? 'US$ -' : '$ -';
  }

  const formatted = formatCurrency(Math.abs(amount), currency);

  if (amount > 0 && forceSign) {
    return '+' + formatted;
  } else if (amount < 0) {
    return '-' + formatted;
  }

  return formatted;
}

/**
 * Formatea solo el numero sin simbolo de moneda
 * @param {number} amount - El monto a formatear
 * @returns {string} - Numero formateado (ej: "1.234,56")
 */
export function formatNumber(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '-';
  }

  return amount.toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Formatea un numero sin decimales en formato argentino
 * @param {number} amount - El monto a formatear
 * @returns {string} - Numero formateado sin decimales (ej: "1.234")
 */
export function formatNumberAR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '-';
  }

  return Math.round(amount).toLocaleString('es-AR');
}

/**
 * Parsea un string de fecha en formato yyyy-MM-dd a un Date object local
 * Evita problemas de timezone al no usar new Date(string) directamente
 * @param {string} dateStr - La fecha en formato yyyy-MM-dd
 * @returns {Date} - Date object en zona horaria local
 */
export function parseLocalDate(dateStr) {
  if (!dateStr) return new Date();

  // Si es formato yyyy-MM-dd, parsear manualmente para evitar timezone issues
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0); // Usar mediodía para evitar edge cases
  }

  // Fallback para otros formatos
  return new Date(dateStr);
}

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Formatea una fecha según el estilo indicado.
 * @param {string|Date} dateStr
 * @param {string} style
 *   'short'    → 19-ene
 *   'full'     → 19-01-2026
 *   'medium'   → 19 ene 2026
 *   'slash'    → 19/01/26
 *   'relative' → Hoy / Ayer / Hace N días / (fallback: 19-ene)
 */
export function formatDate(dateStr, style = 'short') {
  if (!dateStr) return '-';

  let year, month, day;

  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    [year, month, day] = dateStr.split('-').map(Number);
  } else {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    year = d.getFullYear();
    month = d.getMonth() + 1;
    day = d.getDate();
  }

  const dd = day.toString().padStart(2, '0');
  const mm = month.toString().padStart(2, '0');
  const mon = MONTHS_SHORT[month - 1];

  if (style === 'relative') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(year, month - 1, day);
    const diff = Math.round((today - target) / 86400000);
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    if (diff > 1 && diff <= 6) return `Hace ${diff} días`;
    return `${dd}-${mon}`;
  }

  if (style === 'medium') return `${dd} ${mon} ${year}`;
  if (style === 'slash')  return `${dd}/${mm}/${String(year).slice(-2)}`;
  if (style === 'full')   return `${dd}-${mm}-${year}`;
  // 'short' (default)
  return `${dd}-${mon}`;
}
