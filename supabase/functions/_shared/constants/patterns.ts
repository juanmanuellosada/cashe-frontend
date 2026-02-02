/**
 * Patrones regex para clasificación de intents y extracción de entidades
 * Optimizados para español argentino
 */

// Patrones para detectar intents
export const INTENT_PATTERNS = {
  // REGISTRAR_GASTO - verbos de gasto
  REGISTRAR_GASTO: [
    /\b(gast[eéoó]|pagu[eé]|compr[eé]|gasto\s+de|me\s+cobr[oóa]|debit[eéoó]|abon[eé]|puse)\b/i,
    /\b(sal[ií]|salieron?|fueron?)\s+(\$|u\$s?|usd?)?\s*[\d.,]+/i, // "salieron 500"
    /\b(se\s+fue(ron)?|se\s+me\s+fue(ron)?)\b/i, // "se me fue plata"
  ],

  // REGISTRAR_INGRESO - verbos de ingreso
  REGISTRAR_INGRESO: [
    /\b(cobr[eé]|me\s+pagar[oó]n|recib[ií]|ingres[oó]|entr[oó]|depositaron|deposit[eé])\b/i,
    /\b(me\s+(cay[oó]|lleg[oó]|transfirieron|pasaron))\b/i,
    /\b(gan[eé])\b/i,
  ],

  // REGISTRAR_TRANSFERENCIA - verbos de transferencia
  REGISTRAR_TRANSFERENCIA: [
    /\b(transfer[ií]|pas[eé]|mand[eé]\s*(plata)?|mov[ií])\b.*\b(a|de|desde|hacia)\b/i,
    /\b(de|desde)\s+\w+\s+(a|hacia)\s+\w+/i, // "de galicia a mp"
  ],

  // CONSULTAR_SALDO
  CONSULTAR_SALDO: [
    /\b(saldo|balance|cu[aá]nto\s+tengo|plata\s+(en|que\s+tengo)|disponible)\b/i,
    /\b(tengo\s+plata|hay\s+plata)\b/i,
    /\bqu[eé]\s+tengo\s+en\b/i,
  ],

  // CONSULTAR_GASTOS
  CONSULTAR_GASTOS: [
    /\b(cu[aá]nto\s+gast[eé]|gastos?\s+(de|en|del?)|resumen\s+de\s+gastos?)\b/i,
    /\b(cu[aá]nto\s+llevo\s+gastado|qu[eé]\s+gast[eé])\b/i,
    /\bgastos?\s+(de\s+)?(hoy|ayer|esta\s+semana|este\s+mes|este\s+a[nñ]o)/i,
  ],

  // CONSULTAR_INGRESOS
  CONSULTAR_INGRESOS: [
    /\b(cu[aá]nto\s+cobr[eé]|ingresos?\s+(de|en|del?))\b/i,
    /\b(cu[aá]nto\s+entr[oó]|qu[eé]\s+cobr[eé])\b/i,
    /\bingresos?\s+(de\s+)?(hoy|ayer|esta\s+semana|este\s+mes|este\s+a[nñ]o)/i,
  ],

  // PAGAR_TARJETA
  PAGAR_TARJETA: [
    /\bpagar\s+(?:tarjeta\s+)?(\w+)(?:\s+(?:resumen\s+)?(\w+))?\s+(?:desde|con|de)\s+(\w+)/i,
    /\bpago\s+(?:de\s+)?(?:tarjeta\s+)?(\w+)/i,
    /\bpagar\s+(?:la\s+)?tarjeta/i,
    /\bpagar\s+resumen/i,
  ],

  // AGREGAR_SELLOS (impuesto de sellos)
  AGREGAR_SELLOS: [
    /\b(?:agregar|sumar|cargar)\s+(?:impuesto\s+de\s+)?sellos?\b/i,
    /\bsellos?\s+(?:de\s+)?(?:\$|u\$s?|usd?)?\s*[\d.,kmKM]+/i,
    /\bimpuesto\s+de\s+sellos?\b/i,
  ],

  // CONSULTAR_RESUMEN_TARJETA
  CONSULTAR_RESUMEN_TARJETA: [
    /\bresumen\s+(?:de\s+)?(?:tarjeta\s+)?(\w+)(?:\s+(\w+))?/i,
    /\b(?:ver|mostrar)\s+resumen\s+(?:de\s+)?(\w+)/i,
    /\bcu[aá]nto\s+debo\s+(?:en|de)\s+(?:la\s+)?(?:tarjeta\s+)?(\w+)/i,
    /\bdeuda\s+(?:de|en)\s+(?:la\s+)?(?:tarjeta\s+)?(\w+)/i,
  ],

  // MENU
  MENU: [
    /^men[uú]$/i,
    /^inicio$/i,
    /^main$/i,
    /^home$/i,
    /^\/start$/i,
  ],

  // CANCELAR
  CANCELAR: [
    /^cancelar$/i,
    /^cancel$/i,
    /^salir$/i,
    /^\/cancel$/i,
  ],

  // ULTIMOS_MOVIMIENTOS
  ULTIMOS_MOVIMIENTOS: [
    /\b([uú]ltim[oa]s?|recientes?|historial|movimientos?)\b/i,
    /\b(qu[eé]\s+hice|qu[eé]\s+mov[ií])\b/i,
  ],

  // RESUMEN_MES
  RESUMEN_MES: [
    /\b(resumen|c[oó]mo\s+voy|estado\s+(del?|mensual)|balance\s+mensual)\b/i,
    /\b(c[oó]mo\s+estoy|c[oó]mo\s+vengo)\b/i,
    /\bresumen\s+(del?\s+)?(este\s+)?mes\b/i,
  ],

  // CONSULTAR_PRESUPUESTOS
  CONSULTAR_PRESUPUESTOS: [
    /\b(presupuesto|presupuestos|l[ií]mite|l[ií]mites)\b/i,
    /\bc[oó]mo\s+(van|va)\s+(mis\s+)?presupuestos?\b/i,
  ],

  // AYUDA
  AYUDA: [
    /\b(ayuda|help|qu[eé]\s+pued[eo]\s+hacer|comandos?|opciones?)\b/i,
    /\bc[oó]mo\s+(te\s+)?us[oa]|c[oó]mo\s+funciona/i,
  ],
};

// Patrón para extraer montos (soporta formatos argentinos)
export const AMOUNT_PATTERNS = {
  // Formato: $1.500,50 o $1500.50 o 1500 o 1,500.50
  standard: /(?:\$|u\$s?|usd?\s*)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/gi,

  // Formato: 50k, 150 lucas, 2 palos
  withMultiplier: /(\d+(?:[.,]\d+)?)\s*(k|lucas?|mil|palos?|mill[oó]n(?:es)?)/gi,

  // Solo dígitos seguidos opcionalmente de decimales
  simple: /\b(\d+(?:[.,]\d{1,2})?)\b/g,
};

// Patrón para extraer fechas
export const DATE_PATTERNS = {
  // dd/mm/yyyy o dd-mm-yyyy o dd.mm.yyyy (soporta 2 o 4 dígitos para año)
  explicit: /(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?/,

  // "el 15", "día 20", etc.
  dayOfMonth: /(?:el\s+)?(?:d[ií]a\s+)?(\d{1,2})(?:\s+de)?/i,

  // Palabras clave (ayer, hoy, etc.) - se manejan en aliases.ts
};

// Patrones para extraer períodos de tiempo (para consultas)
export const PERIOD_PATTERNS = {
  // Períodos relativos
  relative: {
    today: /\b(hoy|de\s+hoy)\b/i,
    yesterday: /\b(ayer|de\s+ayer)\b/i,
    thisWeek: /\b(esta\s+semana|de\s+esta\s+semana|semana\s+actual)\b/i,
    lastWeek: /\b(la\s+semana\s+pasada|semana\s+pasada|semana\s+anterior)\b/i,
    thisMonth: /\b(este\s+mes|de\s+este\s+mes|mes\s+actual)\b/i,
    lastMonth: /\b(el\s+mes\s+pasado|mes\s+pasado|mes\s+anterior)\b/i,
    thisYear: /\b(este\s+a[nñ]o|de\s+este\s+a[nñ]o|a[nñ]o\s+actual)\b/i,
    last7Days: /\b([uú]ltimos?\s+7\s+d[ií]as?)\b/i,
    last30Days: /\b([uú]ltimos?\s+30\s+d[ií]as?)\b/i,
    lastNDays: /\b[uú]ltimos?\s+(\d+)\s+d[ií]as?\b/i,
  },

  // Rango de fechas: "del 5/1 al 10/1", "desde el 1 de enero hasta el 15"
  range: /\b(?:del?|desde(?:\s+el)?)\s+(\d{1,2}[\/\-]?\d{0,2}(?:[\/\-]\d{2,4})?|\d{1,2}\s+de\s+\w+)\s+(?:al?|hasta(?:\s+el)?)\s+(\d{1,2}[\/\-]?\d{0,2}(?:[\/\-]\d{2,4})?|\d{1,2}\s+de\s+\w+)/i,

  // Mes específico: "enero", "de febrero", "en marzo"
  month: /\b(?:de\s+|en\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+(?:de\s+)?(\d{4}))?\b/i,

  // "hace N días/semanas/meses"
  ago: /\bhace\s+(\d+)\s+(d[ií]as?|semanas?|meses?)\b/i,
};

// Nombres de meses para parsing
export const MONTH_NAMES: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

// Patrón para detectar notas/descripción
export const NOTE_PATTERNS = {
  // "nota: xxx", "por xxx", "de xxx", "para xxx" al final del mensaje
  explicit: /(?:nota|por|de|para|motivo|concepto)[:\s]+(.+)$/i,

  // Texto entre comillas
  quoted: /["']([^"']+)["']/,
};

// Patrón para detectar cuotas (para gastos con tarjeta)
export const INSTALLMENT_PATTERNS = {
  // "en 3 cuotas", "3 cuotas", "x3", "12c"
  cuotas: /(?:en\s+)?(\d{1,2})\s*(?:cuotas?|c(?:uo)?|x)/i,

  // "cuota 3 de 12", "3/12"
  current: /(?:cuota\s+)?(\d{1,2})\s*(?:de|\/)\s*(\d{1,2})/i,

  // "primera cuota en marzo", "resumen marzo", "cierra en abril", "entra en mayo"
  firstInstallment: /(?:primera\s+cuota\s+(?:en\s+)?|resumen\s+(?:de\s+)?|cierra\s+(?:en\s+)?|entra\s+(?:en\s+)?)([a-záéíóú]+)(?:\s+(\d{4}))?/i,
};

// Patrones para confirmación
export const CONFIRMATION_PATTERNS = {
  yes: /^(s[ií]|si|yes|ok|dale|confirmar?|listo|va|bien|correct[oa]|perfect[oa]|1|✅)$/i,
  no: /^(no|cancelar?|cancel|anular?|salir|x|2|❌)$/i,
  edit: /^(editar?|cambiar?|modificar?|corregir?|edit|3|✏️)$/i,
};

// Patrones para selección numérica
export const SELECTION_PATTERNS = {
  number: /^(\d{1,2})$/,
  cancel: /^(cancel(?:ar)?|salir|volver|atras|atrás|x|0)$/i,
};

// Patrones para palabras que indican origen vs destino en transferencias
export const TRANSFER_DIRECTION_PATTERNS = {
  from: /\b(de|desde)\b/i,
  to: /\b(a|hacia|para)\b/i,
};

// Expresiones comunes que NO son comandos (para evitar falsos positivos)
export const IGNORE_PATTERNS = [
  /^(hola|buenas?|hey|hi|hello|buenos?\s*(d[ií]as?|tardes?|noches?))\s*[!.?]?$/i,
  /^(gracias|muchas\s+gracias|thx|thanks)\s*[!.?]?$/i,
  /^(chau|adi[oó]s|nos\s+vemos|hasta\s+luego)\s*[!.?]?$/i,
  /^[👍🙏😊🤗]+$/,  // Solo emojis
];

// Patrones para extraer información de tarjetas de crédito
export const CREDIT_CARD_PATTERNS = {
  // "pagar visa desde brubank", "pagar tarjeta visa con brubank"
  payCard: /\bpagar\s+(?:(?:la\s+)?tarjeta\s+)?(\w+)(?:\s+(?:resumen\s+)?(?:de\s+)?(\w+))?\s+(?:desde|con|de)\s+(\w+)/i,

  // "pagar visa" (sin especificar cuenta origen)
  payCardSimple: /\bpagar\s+(?:(?:la\s+)?tarjeta\s+)?(\w+)/i,

  // "agregar sellos de 1500 a visa", "sellos 1500 visa"
  addStampTax: /\b(?:agregar|sumar|cargar)\s+(?:impuesto\s+de\s+)?sellos?\s+(?:de\s+)?(\$?[\d.,kmKM]+)\s+a\s+(?:(?:la\s+)?tarjeta\s+)?(\w+)/i,

  // "sellos 1500 a visa"
  addStampTaxAlt: /\bsellos?\s+(?:de\s+)?(\$?[\d.,kmKM]+)\s+(?:a|en)\s+(?:(?:la\s+)?tarjeta\s+)?(\w+)/i,

  // "resumen visa", "resumen de visa enero"
  cardStatement: /\bresumen\s+(?:de\s+)?(?:(?:la\s+)?tarjeta\s+)?(\w+)(?:\s+(?:de\s+)?(\w+))?/i,
};

// Expresión para normalizar texto (remover acentos, etc.)
export const NORMALIZE_PATTERN = /[\u0300-\u036f]/g;

/**
 * Función helper para normalizar texto
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(NORMALIZE_PATTERN, "")
    // Reemplazar comas que NO están entre dígitos (evitar romper números como 36.666)
    .replace(/,(?!\d)/g, " ")
    .replace(/(?<!\d),/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Función helper para verificar si un texto es un saludo/ignorable
 */
export function shouldIgnoreMessage(text: string): boolean {
  const normalized = text.trim();
  return IGNORE_PATTERNS.some(pattern => pattern.test(normalized));
}
