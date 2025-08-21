/**
 * Funciones de formateo para la aplicación Cashé
 */

/**
 * Formatea un número como moneda argentina
 * Formato: $131.500,00 (punto para miles, coma para decimales)
 */
export const formatCurrency = (amount: number, currency: string = "ARS"): string => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formatea un número como moneda sin símbolo
 * Formato: 131.500,00
 */
export const formatNumber = (amount: number): string => {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formatea un número como moneda compacta para gráficos
 * Formato: $131,5k
 */
export const formatCurrencyCompact = (amount: number, currency: string = "ARS"): string => {
  if (Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currency,
      notation: "compact",
      compactDisplay: "short",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(amount)
  }
  
  return formatCurrency(amount, currency)
}
