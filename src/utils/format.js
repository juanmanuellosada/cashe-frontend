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
 * Formatea una fecha en formato dd-MM-yyyy
 * @param {string|Date} dateStr - La fecha a formatear
 * @param {string} style - 'short' para dd-MM, 'full' para dd-MM-yyyy
 * @returns {string} - Fecha formateada (ej: "19-01-2026" o "19-ene")
 */
export function formatDate(dateStr, style = 'full') {
  if (!dateStr) return '-';

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';

  if (style === 'short') {
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const month = months[date.getMonth()];
    return `${day}-${month}`;
  }

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
}
