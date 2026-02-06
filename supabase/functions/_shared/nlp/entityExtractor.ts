/**
 * Extractor de entidades del mensaje
 * Extrae montos, fechas, notas y referencias a cuentas/categorías
 */

import {
  AMOUNT_MULTIPLIERS,
  DATE_KEYWORDS,
  MONTH_NAMES,
  CURRENCY_KEYWORDS,
} from "../constants/aliases.ts";
import {
  AMOUNT_PATTERNS,
  DATE_PATTERNS,
  NOTE_PATTERNS,
  INSTALLMENT_PATTERNS,
  TRANSFER_DIRECTION_PATTERNS,
  PERIOD_PATTERNS,
  MONTH_NAMES as MONTH_NAMES_PATTERN,
  CREDIT_CARD_PATTERNS,
  normalizeText,
} from "../constants/patterns.ts";
import type { ParsedEntities, Intent, QueryPeriod } from "./types.ts";

/**
 * Extrae todas las entidades de un mensaje
 */
export function extractEntities(
  text: string,
  intent: Intent
): ParsedEntities {
  const normalized = normalizeText(text);
  const entities: ParsedEntities = {};

  // IMPORTANTE: Guardar el mensaje original completo como nota preliminar
  // Esto permite que las reglas automáticas evalúen contra el mensaje completo
  // Se refinará al final si es necesario
  const originalText = text.trim();

  // Extraer monto
  const amount = extractAmount(text);
  if (amount !== null) {
    entities.amount = amount.value;
    entities.currency = amount.currency;
  }

  // Extraer fecha
  const date = extractDate(text);
  if (date) {
    entities.date = date;
  }

  // Extraer cuotas (para gastos con tarjeta)
  if (intent === "REGISTRAR_GASTO") {
    const installments = extractInstallments(text);
    if (installments) {
      entities.installments = installments;
    }

    // Buscar fecha de primera cuota/resumen SIEMPRE para gastos
    // Esto permite que "primera cuota marzo 2026" funcione aunque no haya cuotas explícitas
    const firstInstallmentDate = extractFirstInstallmentDate(text);
    if (firstInstallmentDate) {
      entities.firstInstallmentDate = firstInstallmentDate;
    }
  }

  // Extraer referencias a cuentas/categorías (texto, no IDs)
  // Los IDs se resuelven después con fuzzy matching
  const accountRefs = extractAccountReferences(text, intent);
  if (accountRefs.account) {
    entities.account = accountRefs.account;
  }
  if (accountRefs.fromAccount) {
    entities.fromAccount = accountRefs.fromAccount;
  }
  if (accountRefs.toAccount) {
    entities.toAccount = accountRefs.toAccount;
  }

  // Extraer referencia a categoría
  const categoryRef = extractCategoryReference(text, intent);
  if (categoryRef) {
    entities.category = categoryRef;
  }

  // Extraer nota explícita primero (entre comillas o con "nota:")
  const explicitNote = extractNote(text);
  if (explicitNote) {
    entities.note = explicitNote;
  } else {
    // SIMPLIFICADO: Usar siempre el mensaje original completo como nota
    // Esto garantiza que las auto-reglas tengan el máximo contexto para evaluar
    // El mensaje original contiene toda la información necesaria (monto, categoría, cuenta, etc.)
    entities.note = originalText;
  }

  // Para consultas, extraer límite
  if (intent === "ULTIMOS_MOVIMIENTOS") {
    const limit = extractLimit(text);
    entities.limit = limit;
  }

  // Para consultas por período (gastos/ingresos)
  if (intent === "CONSULTAR_GASTOS" || intent === "CONSULTAR_INGRESOS") {
    const period = extractPeriod(text);
    if (period) {
      entities.period = period;
    }
    // También extraer categoría si se especifica
    const categoryRef = extractCategoryReference(text, intent);
    if (categoryRef) {
      entities.category = categoryRef;
    }
  }

  // Para pagar tarjeta
  if (intent === "PAGAR_TARJETA") {
    const cardPayment = extractCreditCardPayment(text);
    if (cardPayment.targetCard) {
      entities.targetCard = cardPayment.targetCard;
    }
    if (cardPayment.statementMonth) {
      entities.statementMonth = cardPayment.statementMonth;
    }
    if (cardPayment.sourceAccount) {
      entities.sourceAccount = cardPayment.sourceAccount;
    }
  }

  // Para agregar sellos (impuesto)
  if (intent === "AGREGAR_SELLOS") {
    const stampTax = extractStampTax(text);
    if (stampTax.amount) {
      entities.stampTaxAmount = stampTax.amount;
    }
    if (stampTax.targetCard) {
      entities.targetCard = stampTax.targetCard;
    }
    if (stampTax.statementMonth) {
      entities.statementMonth = stampTax.statementMonth;
    }
  }

  // Para consultar resumen de tarjeta
  if (intent === "CONSULTAR_RESUMEN_TARJETA") {
    // Buscar tarjeta en el mensaje
    const cardMatch = normalizeText(text).match(/\b(visa|mastercard|master|amex|cabal|naranja|nativa|[\w]+)\b.*$/i);
    if (cardMatch) {
      // Extraer la primera palabra que parece ser tarjeta
      const possibleCard = text.match(/resumen\s+(?:de\s+)?(?:tarjeta\s+)?(\w+)/i);
      if (possibleCard) {
        entities.targetCard = possibleCard[1];
      }
    }
    entities.statementMonth = extractStatementMonth(text) || "actual";
  }

  return entities;
}

/**
 * Extrae el monto del mensaje
 */
export function extractAmount(
  text: string
): { value: number; currency: "ARS" | "USD" } | null {
  const normalized = normalizeText(text);

  // Detectar moneda
  let currency: "ARS" | "USD" = "ARS";
  for (const [curr, keywords] of Object.entries(CURRENCY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        currency = curr as "ARS" | "USD";
        break;
      }
    }
  }

  // Intentar extraer monto con multiplicador (50k, 150 lucas, etc.)
  const multiplierMatch = text.match(AMOUNT_PATTERNS.withMultiplier);
  if (multiplierMatch) {
    const numStr = multiplierMatch[0].match(/[\d.,]+/)?.[0] || "";
    const multiplierKey = multiplierMatch[0]
      .match(/[a-záéíóú]+$/i)?.[0]
      ?.toLowerCase();

    let num = parseArgentineNumber(numStr);
    if (multiplierKey && AMOUNT_MULTIPLIERS[multiplierKey]) {
      num *= AMOUNT_MULTIPLIERS[multiplierKey];
    }

    if (!isNaN(num) && num > 0) {
      return { value: num, currency };
    }
  }

  // Intentar extraer monto estándar
  const standardMatches = text.matchAll(AMOUNT_PATTERNS.standard);
  for (const match of standardMatches) {
    const numStr = match[1];
    const num = parseArgentineNumber(numStr);

    // Validar que el número tiene sentido como monto
    if (!isNaN(num) && num > 0 && num < 100000000) {
      return { value: num, currency };
    }
  }

  // Último intento: buscar cualquier número
  const simpleMatches = text.matchAll(AMOUNT_PATTERNS.simple);
  for (const match of simpleMatches) {
    const num = parseArgentineNumber(match[1]);
    if (!isNaN(num) && num > 0 && num < 100000000) {
      return { value: num, currency };
    }
  }

  return null;
}

/**
 * Parsea un número en formato argentino (1.500,50 -> 1500.50)
 */
function parseArgentineNumber(str: string): number {
  if (!str) return NaN;

  // Si tiene coma y punto, asumir formato argentino (1.500,50)
  if (str.includes(",") && str.includes(".")) {
    // Punto como separador de miles, coma como decimal
    return parseFloat(str.replace(/\./g, "").replace(",", "."));
  }

  // Si solo tiene coma, podría ser decimal argentino
  if (str.includes(",")) {
    // Si hay más de 2 dígitos después de la coma, son miles
    const parts = str.split(",");
    if (parts[1]?.length > 2) {
      return parseFloat(str.replace(/,/g, ""));
    }
    // Si no, es decimal
    return parseFloat(str.replace(",", "."));
  }

  // Si solo tiene punto
  if (str.includes(".")) {
    // Si hay exactamente 3 dígitos después del punto, son miles
    const parts = str.split(".");
    if (parts[1]?.length === 3) {
      return parseFloat(str.replace(/\./g, ""));
    }
    // Si no, es decimal americano
    return parseFloat(str);
  }

  // Sin separadores
  return parseFloat(str);
}

/**
 * Extrae la fecha del mensaje
 */
export function extractDate(text: string): string | null {
  const normalized = normalizeText(text);
  const today = new Date();

  // Buscar keywords de fecha
  for (const [key, keywords] of Object.entries(DATE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        switch (key) {
          case "today":
            return formatDateISO(today);
          case "yesterday": {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return formatDateISO(yesterday);
          }
          case "dayBeforeYesterday": {
            const dayBefore = new Date(today);
            dayBefore.setDate(dayBefore.getDate() - 2);
            return formatDateISO(dayBefore);
          }
          // Para períodos (este mes, mes pasado), devolver null
          // ya que no son fechas específicas sino rangos
        }
      }
    }
  }

  // Buscar nombre de mes
  for (const [monthName, monthNum] of Object.entries(MONTH_NAMES)) {
    if (normalized.includes(monthName)) {
      // Si mencionan un mes, asumir día 1 de ese mes
      const year = today.getFullYear();
      // Si el mes es futuro, usar año anterior
      const targetYear = monthNum > today.getMonth() + 1 ? year - 1 : year;
      return `${targetYear}-${String(monthNum).padStart(2, "0")}-01`;
    }
  }

  // Buscar fecha explícita (dd/mm o dd/mm/yyyy)
  const explicitMatch = text.match(DATE_PATTERNS.explicit);
  if (explicitMatch) {
    const day = parseInt(explicitMatch[1]);
    const month = parseInt(explicitMatch[2]);
    let year = explicitMatch[3]
      ? parseInt(explicitMatch[3])
      : today.getFullYear();

    // Ajustar año de 2 dígitos
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }

    // Validar fecha
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Buscar "el 15", "día 20", etc.
  const dayMatch = normalized.match(DATE_PATTERNS.dayOfMonth);
  if (dayMatch) {
    const day = parseInt(dayMatch[1]);
    if (day >= 1 && day <= 31) {
      // Asumir mes actual, o mes pasado si el día es mayor al actual
      let month = today.getMonth() + 1;
      let year = today.getFullYear();
      if (day > today.getDate()) {
        month--;
        if (month < 1) {
          month = 12;
          year--;
        }
      }
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // No se encontró fecha, devolver null (se usará "hoy" por defecto)
  return null;
}

/**
 * Formatea una fecha como ISO (YYYY-MM-DD)
 */
function formatDateISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Extrae la nota/descripción del mensaje
 */
export function extractNote(text: string): string | null {
  // Buscar texto entre comillas
  const quotedMatch = text.match(NOTE_PATTERNS.quoted);
  if (quotedMatch) {
    return quotedMatch[1].trim();
  }

  // Buscar patrón explícito (nota: xxx, por: xxx)
  const explicitMatch = text.match(NOTE_PATTERNS.explicit);
  if (explicitMatch) {
    return explicitMatch[1].trim();
  }

  return null;
}

/**
 * Extrae como nota todo lo que no matchea con entidades conocidas
 * Se llama después de extraer todas las otras entidades
 */
export function extractRemainingAsNote(
  originalText: string,
  extractedEntities: {
    amount?: number;
    account?: string;
    category?: string;
    installments?: number;
    firstInstallmentDate?: string;
    date?: string;
  }
): string | null {
  let text = originalText.toLowerCase();

  // Palabras/patrones a remover (verbos, preposiciones, etc.)
  const wordsToRemove = [
    // Verbos de acción (en todas sus conjugaciones comunes)
    /\b(compr[eéoa]r?|gast[eéoa]r?|pagu[eéo]|pagar|cobr[eéoa]r?|recib[iíoa]r?|transfer[iíoa]r?|pas[eéoa]r?|abon[eéoa]r?|debit[eéoa]r?|puse|puso)\b/gi,
    // Preposiciones, artículos y conectores
    /\b(con|en|de|del|la|el|los|las|un|una|unos|unas|a|al|para|por|que|y|o)\b/gi,
    // Palabras de cuotas
    /\b(cuotas?|primera\s+cuota|primera|resumen|cierra|entra)\b/gi,
    // Meses
    /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/gi,
    // Años
    /\b(20\d{2})\b/g,
    // Números (montos, cuotas)
    /[\$]?\s*[\d.,]+\s*(k|lucas?|mil|palos?)?\b/gi,
    // Palabras de moneda
    /\b(pesos|dolares|usd|ars)\b/gi,
    // Tarjetas de crédito
    /\b(visa|mastercard|master|amex|cabal|naranja|nativa|tarjeta|tc)\b/gi,
    // Bancos y entidades financieras argentinas
    /\b(galicia|santander|bbva|frances|macro|nacion|provincia|ciudad|icbc|hsbc|brubank|ual[aá]|mercadopago|mercado\s*pago|mp|bru|gal|san|personal\s*pay|prex|bna|lemon|modo)\b/gi,
    // Tipos de cuenta
    /\b(caja\s+de\s+ahorro|cuenta\s+corriente|efectivo|billetera|fima|premium)\b/gi,
  ];

  // Remover patterns conocidos
  for (const pattern of wordsToRemove) {
    text = text.replace(pattern, ' ');
  }

  // Remover nombre de cuenta si se extrajo (cada palabra por separado)
  if (extractedEntities.account) {
    const accountWords = extractedEntities.account.toLowerCase().split(/[\s,]+/);
    for (const word of accountWords) {
      if (word.length > 1) {
        text = text.replace(new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi'), ' ');
      }
    }
  }

  // Remover nombre de categoría si se extrajo (cada palabra por separado)
  if (extractedEntities.category) {
    const categoryWords = extractedEntities.category.toLowerCase().split(/[\s,]+/);
    for (const word of categoryWords) {
      if (word.length > 1) {
        text = text.replace(new RegExp(`\\b${escapeRegex(word)}\\b`, 'gi'), ' ');
      }
    }
  }

  // Limpiar puntuación y espacios múltiples
  text = text
    .replace(/[,.:;!?¿¡()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Si queda algo significativo (más de 2 caracteres y no es solo números), usarlo como nota
  if (text.length > 2 && !/^\d+$/.test(text)) {
    // Capitalizar primera letra
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  return null;
}

/**
 * Escapa caracteres especiales de regex
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extrae el número de cuotas
 */
export function extractInstallments(text: string): number | null {
  const match = text.match(INSTALLMENT_PATTERNS.cuotas);
  if (match) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 48) {
      return num;
    }
  }
  return null;
}

/**
 * Extrae la fecha de primera cuota cuando se especifica "primera cuota en X" o "resumen X"
 * Retorna la fecha en formato ISO (YYYY-MM-DD) del día 1 del mes especificado
 */
export function extractFirstInstallmentDate(text: string): string | null {
  const normalized = normalizeText(text);
  const match = normalized.match(INSTALLMENT_PATTERNS.firstInstallment);

  if (!match) return null;

  const monthName = match[1].toLowerCase();
  const yearStr = match[2];

  // Buscar el número de mes
  let monthNum: number | null = null;
  for (const [name, num] of Object.entries(MONTH_NAMES)) {
    if (monthName === name || monthName.startsWith(name)) {
      monthNum = num;
      break;
    }
  }

  if (!monthNum) return null;

  // Determinar el año
  const today = new Date();
  let year = yearStr ? parseInt(yearStr) : today.getFullYear();

  // Si el mes ya pasó este año y no se especificó año, usar el próximo año
  if (!yearStr && monthNum < today.getMonth() + 1) {
    year = today.getFullYear() + 1;
  }

  // Retornar el día 1 del mes especificado
  return `${year}-${String(monthNum).padStart(2, "0")}-01`;
}

/**
 * Extrae referencias a cuentas del mensaje
 * Para transferencias, intenta detectar origen y destino
 */
export function extractAccountReferences(
  text: string,
  intent: Intent
): { account?: string; fromAccount?: string; toAccount?: string } {
  const normalized = normalizeText(text);
  const result: { account?: string; fromAccount?: string; toAccount?: string } =
    {};

  if (intent === "REGISTRAR_TRANSFERENCIA") {
    // Buscar patrón "de X a Y"
    const transferPattern =
      /(?:de|desde)\s+([a-záéíóúñ\s]+?)\s+(?:a|hacia|para)\s+([a-záéíóúñ\s]+?)(?:\s|$)/i;
    const match = normalized.match(transferPattern);

    if (match) {
      result.fromAccount = cleanAccountRef(match[1]);
      result.toAccount = cleanAccountRef(match[2]);
    } else {
      // Intentar patrón inverso "a Y de X"
      const inversePattern =
        /(?:a|hacia|para)\s+([a-záéíóúñ\s]+?)\s+(?:de|desde)\s+([a-záéíóúñ\s]+?)(?:\s|$)/i;
      const inverseMatch = normalized.match(inversePattern);
      if (inverseMatch) {
        result.toAccount = cleanAccountRef(inverseMatch[1]);
        result.fromAccount = cleanAccountRef(inverseMatch[2]);
      }
    }
  } else {
    // Para gastos/ingresos, buscar patrones de cuenta
    // Primero buscar patrones de tarjeta combinados: "visa galicia", "master santander", etc.
    const cardBankPattern = /\b(visa|mastercard|master|amex|cabal|naranja|nativa)[,\s]+([a-záéíóúñ]+)/i;
    const cardBankMatch = normalized.match(cardBankPattern);
    if (cardBankMatch) {
      // Combinar tarjeta + banco: "visa galicia" -> "visa galicia"
      result.account = `${cardBankMatch[1]} ${cardBankMatch[2]}`.trim();
      return result;
    }

    // Buscar solo tarjeta: "con visa", "con master"
    const cardOnlyPattern = /\b(?:con|en)\s+(visa|mastercard|master|amex|cabal|naranja|nativa)\b/i;
    const cardOnlyMatch = normalized.match(cardOnlyPattern);
    if (cardOnlyMatch) {
      result.account = cardOnlyMatch[1];
      return result;
    }

    // Buscar "con X", "en X"
    const accountPatterns = [
      /\b(?:con|en|desde|cuenta)\s+([a-záéíóúñ\s]+?)(?:\s+(?:ayer|hoy|el|\d|en\s+\d|primera|resumen)|$)/i,
      /([a-záéíóúñ]+)\s*$/i, // última palabra (común: "gasté 500 en comida mp")
    ];

    for (const pattern of accountPatterns) {
      const match = normalized.match(pattern);
      if (match) {
        const ref = cleanAccountRef(match[1]);
        // Validar que no sea una palabra común que no sea cuenta
        if (!isCommonWord(ref)) {
          result.account = ref;
          break;
        }
      }
    }
  }

  return result;
}

/**
 * Extrae referencia a categoría del mensaje
 */
export function extractCategoryReference(
  text: string,
  intent: Intent
): string | null {
  const normalized = normalizeText(text);

  // Patrones para detectar categoría (mejorados para capturar palabras sueltas)
  const categoryPatterns = [
    // "en Supermercado", "de Comida", "para Transporte"
    // Captura solo la primera palabra o máximo dos palabras juntas
    /\b(?:en|de|para|categoria)\s+([a-záéíóúñ]{3,}(?:\s+[a-záéíóúñ]{3,})?)\b/i,
    // "pagué de luz" - formato más corto
    /\bde\s+([a-záéíóúñ]{3,})\b/i,
  ];

  for (const pattern of categoryPatterns) {
    const match = normalized.match(pattern);
    if (match) {
      const ref = cleanCategoryRef(match[1]);
      if (!isCommonWord(ref) && ref.length > 2) {
        return ref;
      }
    }
  }

  return null;
}

/**
 * Extrae límite para consulta de últimos movimientos
 */
export function extractLimit(text: string): number {
  const match = text.match(/(\d+)\s*(?:ultim[oa]s?|movimientos?)/i);
  if (match) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 50) {
      return num;
    }
  }

  // Buscar número suelto
  const numMatch = text.match(/\b(\d{1,2})\b/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    if (num >= 1 && num <= 20) {
      return num;
    }
  }

  return 5; // default
}

/**
 * Limpia referencia a cuenta (quita palabras innecesarias)
 */
function cleanAccountRef(ref: string): string {
  return ref
    .replace(/\b(cuenta|banco|tarjeta|de|la|el|mi)\b/gi, "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Limpia referencia a categoría
 */
function cleanCategoryRef(ref: string): string {
  return ref
    .replace(/\b(categoria|de|la|el|un|una)\b/gi, "")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Verifica si es una palabra común que no debería ser cuenta/categoría
 */
function isCommonWord(word: string): boolean {
  const commonWords = [
    "hoy",
    "ayer",
    "mañana",
    "este",
    "mes",
    "año",
    "semana",
    "el",
    "la",
    "un",
    "una",
    "los",
    "las",
    "que",
    "de",
    "en",
    "con",
    "por",
    "para",
    "y",
    "o",
    "si",
    "no",
    "mas",
    "menos",
    "cuanto",
    "cuantos",
    "como",
    "donde",
    "cuando",
    "pesos",
    "dolares",
    "plata",
    "ahora",
  ];
  return commonWords.includes(word.toLowerCase());
}

/**
 * Extrae período de tiempo para consultas
 * Soporta: hoy, ayer, esta semana, este mes, rangos de fecha, meses específicos
 */
export function extractPeriod(text: string): QueryPeriod | null {
  const normalized = normalizeText(text);
  const today = new Date();

  // Períodos relativos
  if (PERIOD_PATTERNS.relative.today.test(normalized)) {
    return { type: "relative", value: "today" };
  }
  if (PERIOD_PATTERNS.relative.yesterday.test(normalized)) {
    return { type: "relative", value: "yesterday" };
  }
  if (PERIOD_PATTERNS.relative.thisWeek.test(normalized)) {
    return { type: "relative", value: "this_week" };
  }
  if (PERIOD_PATTERNS.relative.lastWeek.test(normalized)) {
    return { type: "relative", value: "last_week" };
  }
  if (PERIOD_PATTERNS.relative.thisMonth.test(normalized)) {
    return { type: "relative", value: "this_month" };
  }
  if (PERIOD_PATTERNS.relative.lastMonth.test(normalized)) {
    return { type: "relative", value: "last_month" };
  }
  if (PERIOD_PATTERNS.relative.thisYear.test(normalized)) {
    return { type: "relative", value: "this_year" };
  }
  if (PERIOD_PATTERNS.relative.last7Days.test(normalized)) {
    return { type: "relative", value: "last_7_days" };
  }
  if (PERIOD_PATTERNS.relative.last30Days.test(normalized)) {
    return { type: "relative", value: "last_30_days" };
  }

  // Últimos N días
  const lastNDaysMatch = normalized.match(PERIOD_PATTERNS.relative.lastNDays);
  if (lastNDaysMatch) {
    const days = parseInt(lastNDaysMatch[1]);
    return { type: "relative", value: `last_${days}_days` };
  }

  // Hace N días/semanas/meses
  const agoMatch = normalized.match(PERIOD_PATTERNS.ago);
  if (agoMatch) {
    const amount = parseInt(agoMatch[1]);
    const unit = agoMatch[2].toLowerCase();
    if (unit.startsWith("dia") || unit.startsWith("día")) {
      return { type: "relative", value: `ago_${amount}_days` };
    } else if (unit.startsWith("semana")) {
      return { type: "relative", value: `ago_${amount}_weeks` };
    } else if (unit.startsWith("mes")) {
      return { type: "relative", value: `ago_${amount}_months` };
    }
  }

  // Rango de fechas: "del 5/1 al 10/1"
  const rangeMatch = normalized.match(PERIOD_PATTERNS.range);
  if (rangeMatch) {
    const startDate = parseDateString(rangeMatch[1]);
    const endDate = parseDateString(rangeMatch[2]);
    if (startDate && endDate) {
      return {
        type: "range",
        value: `${rangeMatch[1]} al ${rangeMatch[2]}`,
        startDate,
        endDate,
      };
    }
  }

  // Mes específico: "enero", "de febrero"
  const monthMatch = normalized.match(PERIOD_PATTERNS.month);
  if (monthMatch) {
    const monthName = monthMatch[1].toLowerCase();
    const yearStr = monthMatch[2];
    const monthNum = MONTH_NAMES_PATTERN[monthName];
    if (monthNum) {
      const year = yearStr ? parseInt(yearStr) : today.getFullYear();
      const startDate = `${year}-${String(monthNum).padStart(2, "0")}-01`;
      const lastDay = new Date(year, monthNum, 0).getDate();
      const endDate = `${year}-${String(monthNum).padStart(2, "0")}-${lastDay}`;
      return {
        type: "month",
        value: monthName,
        startDate,
        endDate,
      };
    }
  }

  return null;
}

/**
 * Parsea una cadena de fecha y devuelve formato ISO
 */
function parseDateString(dateStr: string): string | null {
  const today = new Date();

  // Formato: dd/mm o dd-mm o dd/mm/yyyy
  const explicitMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (explicitMatch) {
    const day = parseInt(explicitMatch[1]);
    const month = parseInt(explicitMatch[2]);
    let year = explicitMatch[3] ? parseInt(explicitMatch[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Formato: "1 de enero"
  const textMatch = dateStr.match(/(\d{1,2})\s+de\s+(\w+)/);
  if (textMatch) {
    const day = parseInt(textMatch[1]);
    const monthName = textMatch[2].toLowerCase();
    const monthNum = MONTH_NAMES_PATTERN[monthName];
    if (monthNum) {
      return `${today.getFullYear()}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return null;
}

/**
 * Extrae mes de resumen de tarjeta
 * Devuelve: nombre del mes, "actual", o null
 */
export function extractStatementMonth(text: string): string | null {
  const normalized = normalizeText(text);

  // Buscar "resumen actual", "actual"
  if (/\bactual\b/i.test(normalized)) {
    return "actual";
  }

  // Buscar mes específico después de "resumen"
  const statementMatch = normalized.match(/resumen\s+(?:de\s+)?(?:\w+\s+)?(\w+)/i);
  if (statementMatch) {
    const possibleMonth = statementMatch[1].toLowerCase();
    if (MONTH_NAMES_PATTERN[possibleMonth]) {
      return possibleMonth;
    }
  }

  // Buscar mes suelto
  for (const [monthName] of Object.entries(MONTH_NAMES_PATTERN)) {
    if (normalized.includes(monthName)) {
      return monthName;
    }
  }

  // Si no hay mes específico, asumir "actual"
  return "actual";
}

/**
 * Extrae información de pago de tarjeta del mensaje
 */
export function extractCreditCardPayment(
  text: string
): { targetCard?: string; statementMonth?: string; sourceAccount?: string } {
  const normalized = normalizeText(text);
  const result: { targetCard?: string; statementMonth?: string; sourceAccount?: string } = {};

  // Patrón completo: "pagar visa resumen enero desde brubank"
  const fullMatch = normalized.match(CREDIT_CARD_PATTERNS.payCard);
  if (fullMatch) {
    result.targetCard = fullMatch[1];
    result.statementMonth = fullMatch[2] || "actual";
    result.sourceAccount = fullMatch[3];
    return result;
  }

  // Patrón simple: "pagar visa"
  const simpleMatch = normalized.match(CREDIT_CARD_PATTERNS.payCardSimple);
  if (simpleMatch) {
    result.targetCard = simpleMatch[1];
    result.statementMonth = extractStatementMonth(text) || "actual";
    return result;
  }

  return result;
}

/**
 * Extrae información de impuesto de sellos del mensaje
 */
export function extractStampTax(
  text: string
): { amount?: number; targetCard?: string; statementMonth?: string } {
  const normalized = normalizeText(text);
  const result: { amount?: number; targetCard?: string; statementMonth?: string } = {};

  // Patrón: "agregar sellos de 1500 a visa"
  const match = normalized.match(CREDIT_CARD_PATTERNS.addStampTax);
  if (match) {
    const amountResult = extractAmount(match[1]);
    if (amountResult) {
      result.amount = amountResult.value;
    }
    result.targetCard = match[2];
    result.statementMonth = extractStatementMonth(text) || "actual";
    return result;
  }

  // Patrón alternativo: "sellos 1500 a visa"
  const altMatch = normalized.match(CREDIT_CARD_PATTERNS.addStampTaxAlt);
  if (altMatch) {
    const amountResult = extractAmount(altMatch[1]);
    if (amountResult) {
      result.amount = amountResult.value;
    }
    result.targetCard = altMatch[2];
    result.statementMonth = extractStatementMonth(text) || "actual";
    return result;
  }

  // Si no matchea el patrón completo, intentar extraer por partes
  const amountResult = extractAmount(text);
  if (amountResult) {
    result.amount = amountResult.value;
  }

  // Buscar nombre de tarjeta
  const cardMatch = normalized.match(/\b(visa|mastercard|master|amex|cabal|naranja|nativa)\b/i);
  if (cardMatch) {
    result.targetCard = cardMatch[1];
  }

  result.statementMonth = extractStatementMonth(text) || "actual";

  return result;
}

/**
 * Convierte un QueryPeriod a fechas de inicio y fin
 */
export function periodToDateRange(period: QueryPeriod): { startDate: string; endDate: string } {
  const today = new Date();
  let startDate: Date;
  let endDate: Date = today;

  switch (period.value) {
    case "today":
      startDate = today;
      endDate = today;
      break;
    case "yesterday":
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 1);
      endDate = startDate;
      break;
    case "this_week":
      // Semana empieza el lunes
      startDate = new Date(today);
      const dayOfWeek = today.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate.setDate(today.getDate() - diff);
      endDate = today;
      break;
    case "last_week":
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7 - (today.getDay() === 0 ? 6 : today.getDay() - 1));
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      break;
    case "this_month":
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = today;
      break;
    case "last_month":
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case "this_year":
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = today;
      break;
    case "last_7_days":
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 7);
      break;
    case "last_30_days":
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 30);
      break;
    default:
      // Para rangos personalizados y meses, usar las fechas del período
      if (period.startDate && period.endDate) {
        return { startDate: period.startDate, endDate: period.endDate };
      }
      // Parsear "last_N_days", "ago_N_days/weeks/months"
      const lastNMatch = period.value.match(/last_(\d+)_days/);
      if (lastNMatch) {
        const days = parseInt(lastNMatch[1]);
        startDate = new Date(today);
        startDate.setDate(today.getDate() - days);
        break;
      }
      const agoMatch = period.value.match(/ago_(\d+)_(days|weeks|months)/);
      if (agoMatch) {
        const amount = parseInt(agoMatch[1]);
        const unit = agoMatch[2];
        startDate = new Date(today);
        endDate = new Date(today);
        if (unit === "days") {
          startDate.setDate(today.getDate() - amount);
          endDate = startDate;
        } else if (unit === "weeks") {
          startDate.setDate(today.getDate() - (amount * 7));
          endDate.setDate(startDate.getDate() + 6);
        } else if (unit === "months") {
          startDate.setMonth(today.getMonth() - amount);
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
        }
        break;
      }
      // Default: hoy
      startDate = today;
      endDate = today;
  }

  const formatDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
}
