/**
 * Aliases argentinos para cuentas, categorías y términos financieros
 * Usado para fuzzy matching con los datos reales del usuario
 */

// Aliases de nombres de bancos y billeteras argentinas
export const ACCOUNT_ALIASES: Record<string, string[]> = {
  // Bancos tradicionales
  galicia: ["galicia", "banco galicia", "gal", "galisia"],
  santander: ["santander", "rio", "banco rio", "banco santander"],
  bbva: ["bbva", "frances", "banco frances", "bbva frances"],
  macro: ["macro", "banco macro"],
  nacion: ["nacion", "banco nacion", "bna", "banco de la nacion"],
  provincia: ["provincia", "bapro", "banco provincia"],
  ciudad: ["ciudad", "banco ciudad"],
  hsbc: ["hsbc", "banco hsbc"],
  icbc: ["icbc", "banco icbc"],
  patagonia: ["patagonia", "banco patagonia"],
  supervielle: ["supervielle", "banco supervielle"],
  credicoop: ["credicoop", "banco credicoop"],
  hipotecario: ["hipotecario", "banco hipotecario"],
  comafi: ["comafi", "banco comafi"],
  bind: ["bind", "industrial", "banco industrial"],
  itau: ["itau", "itaú", "banco itau"],
  columbia: ["columbia", "banco columbia"],
  piano: ["piano", "banco piano"],
  roela: ["roela", "banco roela"],

  // Billeteras digitales
  mercadopago: ["mercadopago", "mercado pago", "mp", "meli", "mercadolibre"],
  uala: ["uala", "ualá", "ualo"],
  brubank: ["brubank", "bru"],
  naranjax: ["naranja x", "naranjax", "naranja", "nax"],
  personalpay: ["personal pay", "personalpay", "personal"],
  cuentadni: ["cuenta dni", "cuentadni", "dni"],
  modo: ["modo"],
  prex: ["prex"],
  lemon: ["lemon", "lemon cash", "lemoncash"],
  buenbit: ["buenbit"],
  ripio: ["ripio"],
  binance: ["binance", "bina"],
  belo: ["belo"],
  fiwind: ["fiwind"],
  astropay: ["astropay", "astro"],
  payoneer: ["payoneer"],
  paypal: ["paypal", "pp"],
  wise: ["wise", "transferwise"],

  // Tarjetas de crédito
  visa: ["visa", "tarjeta visa", "tc visa"],
  mastercard: ["mastercard", "master", "tarjeta master", "tc master", "mc"],
  amex: ["amex", "american express", "tarjeta amex", "americanexpress"],
  cabal: ["cabal", "tarjeta cabal"],
  naranja: ["naranja", "tarjeta naranja"],
  nativa: ["nativa", "tarjeta nativa"],

  // Genéricos
  efectivo: ["efectivo", "cash", "plata fisica", "plata", "fisico", "billetera"],
  dolares: ["dolares", "dólares", "usd", "verdes", "dolars"],
  cripto: ["cripto", "crypto", "bitcoin", "btc", "usdt", "dai"],
  ahorro: ["caja de ahorro", "ahorro", "ca"],
  corriente: ["cuenta corriente", "corriente", "cc"],
  inversion: ["inversion", "inversión", "fci", "plazo fijo", "pf"],
  tarjeta: ["tarjeta", "tc", "tarjeta de credito", "credito"],
};

// Aliases de categorías de gastos
export const EXPENSE_CATEGORY_ALIASES: Record<string, string[]> = {
  // Alimentación
  comida: [
    "comida", "almuerzo", "cena", "desayuno", "morfi", "restaurant",
    "resto", "delivery", "pedidos ya", "pedidosya", "rappi", "glovo",
    "comida rapida", "fast food", "cafe", "cafeteria", "merienda",
    "snack", "helado", "heladeria", "panaderia"
  ],
  supermercado: [
    "super", "supermercado", "carrefour", "coto", "dia", "jumbo",
    "disco", "vea", "chango mas", "changomas", "makro", "walmart",
    "verduleria", "carniceria", "almacen", "kiosco", "despensa"
  ],

  // Transporte
  transporte: [
    "nafta", "combustible", "uber", "cabify", "taxi", "remis",
    "subte", "bondi", "colectivo", "sube", "peaje", "ypf", "shell",
    "axion", "gnc", "gnv", "estacionamiento", "parking", "garage",
    "tren", "micro", "omnibus"
  ],
  auto: [
    "auto", "coche", "mantenimiento auto", "mecanico", "taller",
    "service", "seguro auto", "vtv", "patente auto"
  ],

  // Hogar y servicios
  servicios: [
    "luz", "gas", "internet", "telefono", "tel", "cel", "celular",
    "wifi", "edenor", "edesur", "metrogas", "telecentro", "fibertel",
    "personal", "claro", "movistar", "tuenti", "aysa", "aguas",
    "cable", "directv", "flow", "abono"
  ],
  hogar: [
    "alquiler", "expensas", "muebles", "limpieza", "mantenimiento",
    "decoracion", "ferreteria", "pintura", "reparacion", "plomero",
    "electricista", "gasista", "mudanza"
  ],

  // Entretenimiento
  entretenimiento: [
    "cine", "netflix", "spotify", "steam", "juegos", "salida",
    "bar", "boliche", "recital", "disney", "hbo", "amazon", "prime",
    "flow", "youtube", "twitch", "teatro", "concierto", "show",
    "pelota", "futbol", "deporte", "gym", "gimnasio", "pilates",
    "yoga", "club", "revista", "libro"
  ],
  suscripciones: [
    "suscripcion", "membresía", "membresia", "mensual", "anual"
  ],

  // Salud
  salud: [
    "farmacia", "medico", "doctor", "medicamento", "remedio",
    "obra social", "prepaga", "osde", "swiss", "galeno", "omint",
    "dentista", "odontologo", "oculista", "optica", "lentes",
    "psicólogo", "psicologo", "terapia", "análisis", "estudios"
  ],

  // Vestimenta
  ropa: [
    "ropa", "zapatillas", "zapatos", "calzado", "zara", "nike",
    "adidas", "h&m", "remera", "pantalon", "campera", "buzo",
    "jean", "vestido", "cartera", "bolso", "accesorios"
  ],

  // Educación
  educacion: [
    "facultad", "universidad", "colegio", "escuela", "curso",
    "libro", "udemy", "platzi", "coursera", "capacitacion",
    "idiomas", "ingles", "clase"
  ],

  // Mascotas
  mascota: [
    "veterinario", "mascota", "perro", "gato", "puppis", "petshop",
    "alimento mascota", "vacuna mascota"
  ],

  // Impuestos y finanzas
  impuestos: [
    "impuesto", "afip", "monotributo", "iibb", "ingresos brutos",
    "abl", "patente", "arba", "rentas", "dgi", "iva", "ganancias"
  ],
  tarjeta: [
    "tarjeta", "visa", "mastercard", "amex", "american express",
    "resumen", "pago tarjeta", "minimo tarjeta"
  ],
  banco: [
    "mantenimiento cuenta", "comision", "transferencia", "debito automatico"
  ],

  // Otros
  regalo: [
    "regalo", "presente", "cumpleaños", "aniversario", "navidad"
  ],
  viaje: [
    "viaje", "vuelo", "avion", "hotel", "hospedaje", "airbnb",
    "booking", "despegar", "turismo", "vacaciones", "pasaje"
  ],
  otros: [
    "otros", "otro", "varios", "miscelaneos", "gasto"
  ],
};

// Aliases de categorías de ingresos
export const INCOME_CATEGORY_ALIASES: Record<string, string[]> = {
  sueldo: [
    "sueldo", "salario", "quincena", "liquidacion", "recibo",
    "haberes", "nomina", "pago mensual"
  ],
  freelance: [
    "freelance", "proyecto", "laburo", "cliente", "trabajo extra",
    "changas", "servicio", "consultoria"
  ],
  inversiones: [
    "dividendo", "interes", "rendimiento", "plazo fijo", "fci",
    "bonos", "acciones", "crypto", "staking", "renta"
  ],
  venta: [
    "venta", "vendi", "vendí", "mercadolibre", "facebook marketplace"
  ],
  aguinaldo: [
    "aguinaldo", "sac", "bono"
  ],
  alquiler: [
    "alquiler cobrado", "renta cobrada", "inquilino"
  ],
  reembolso: [
    "reembolso", "devolucion", "devolución", "cashback"
  ],
  regalo: [
    "regalo", "regalo recibido", "cumpleaños"
  ],
  otros: [
    "otros ingresos", "otro ingreso", "ingreso", "cobro"
  ],
};

// Todas las categorías combinadas
export const ALL_CATEGORY_ALIASES: Record<string, string[]> = {
  ...EXPENSE_CATEGORY_ALIASES,
  ...INCOME_CATEGORY_ALIASES,
};

// Keywords para detectar moneda
export const CURRENCY_KEYWORDS = {
  ARS: ["pesos", "ars", "$", "peso", "argentinos"],
  USD: ["dolares", "dólares", "usd", "u$s", "u$d", "verdes", "dolars", "us$", "dolar", "dólar"],
};

// Multiplicadores argentinos para montos
export const AMOUNT_MULTIPLIERS: Record<string, number> = {
  k: 1000,
  lucas: 1000,
  luca: 1000,
  mil: 1000,
  palo: 1000000,
  palos: 1000000,
  millon: 1000000,
  millones: 1000000,
};

// Keywords para fechas relativas
export const DATE_KEYWORDS = {
  today: ["hoy", "ahora"],
  yesterday: ["ayer"],
  dayBeforeYesterday: ["anteayer", "antes de ayer"],
  thisWeek: ["esta semana", "semana actual"],
  lastWeek: ["semana pasada", "la semana pasada"],
  thisMonth: ["este mes", "mes actual", "mes en curso"],
  lastMonth: ["mes pasado", "el mes pasado", "mes anterior"],
  thisYear: ["este año", "año actual"],
  lastYear: ["año pasado", "el año pasado"],
};

// Nombres de meses en español
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
  // Abreviaciones
  ene: 1,
  feb: 2,
  mar: 3,
  abr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dic: 12,
};

// Días de la semana (para futuras implementaciones)
export const WEEKDAY_NAMES: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sábado: 6,
};
