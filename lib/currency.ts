export type Currency = {
  code: string
  name: string
  symbol: string
}

export const CURRENCIES: Currency[] = [
  { code: 'USD', name: 'Dólar Estadounidense', symbol: 'U$S' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'ARS', name: 'Peso Argentino', symbol: '$' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: '$' },
  { code: 'COP', name: 'Peso Colombiano', symbol: '$' },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$' },
  { code: 'CLP', name: 'Peso Chileno', symbol: '$' },
  { code: 'PEN', name: 'Sol Peruano', symbol: 'S/' },
]

export type ExchangeRates = {
  [key: string]: number
}

// Tasas de cambio base (USD = 1)
// En una implementación real, estas vendrían de una API
export const EXCHANGE_RATES: ExchangeRates = {
  USD: 1,
  EUR: 0.85,
  ARS: 980,
  MXN: 17.5,
  COP: 4100,
  BRL: 5.2,
  CLP: 850,
  PEN: 3.7,
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRates = EXCHANGE_RATES
): number {
  if (fromCurrency === toCurrency) return amount
  
  // Convertir a USD primero si no es USD
  const usdAmount = fromCurrency === 'USD' ? amount : amount / rates[fromCurrency]
  
  // Convertir de USD a la moneda destino
  const convertedAmount = toCurrency === 'USD' ? usdAmount : usdAmount * rates[toCurrency]
  
  return convertedAmount
}

export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale: string = 'es-AR'
): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode)
  if (!currency) return amount.toString()
  
  // Para USD usar nuestro símbolo personalizado "U$S"
  if (currencyCode === 'USD') {
    return `U$S ${amount.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Fallback si la moneda no es soportada por Intl
    return `${currency.symbol}${amount.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }
}

export function getCurrencySymbol(currencyCode: string): string {
  const currency = CURRENCIES.find(c => c.code === currencyCode)
  return currency?.symbol || currencyCode
}
