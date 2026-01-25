/**
 * Catálogo de íconos predefinidos para cuentas
 * Usa imágenes SVG locales desde /public/icons/catalog/
 */

const BASE_PATH = '/icons/catalog';

/**
 * Íconos predefinidos organizados por categoría
 */
export const PREDEFINED_ICONS = {
  bancos: [
    { id: 'galicia', name: 'Banco Galicia', icon: `${BASE_PATH}/banco-galicia.svg`, keywords: ['galicia', 'banco'] },
    { id: 'santander', name: 'Santander', icon: `${BASE_PATH}/SAN.svg`, keywords: ['santander', 'banco'] },
    { id: 'bbva', name: 'BBVA', icon: `${BASE_PATH}/banco-bbva.svg`, keywords: ['bbva', 'frances', 'banco'] },
    { id: 'macro', name: 'Banco Macro', icon: `${BASE_PATH}/BMA.svg`, keywords: ['macro', 'banco'] },
    { id: 'hsbc', name: 'HSBC', icon: `${BASE_PATH}/HSBC.svg`, keywords: ['hsbc', 'banco'] },
    { id: 'nacion', name: 'Banco Nación', icon: `${BASE_PATH}/banco-nacion.svg`, keywords: ['nacion', 'bna', 'banco'] },
    { id: 'provincia', name: 'Banco Provincia', icon: `${BASE_PATH}/banco-provincia.svg`, keywords: ['provincia', 'bapro', 'banco'] },
    { id: 'ciudad', name: 'Banco Ciudad', icon: `${BASE_PATH}/banco-ciudad.svg`, keywords: ['ciudad', 'banco'] },
    { id: 'supervielle', name: 'Supervielle', icon: `${BASE_PATH}/banco-supervielle.svg`, keywords: ['supervielle', 'banco'] },
    { id: 'patagonia', name: 'Banco Patagonia', icon: `${BASE_PATH}/BPAT.svg`, keywords: ['patagonia', 'banco'] },
    { id: 'comafi', name: 'Banco Comafi', icon: `${BASE_PATH}/banco-comafi.svg`, keywords: ['comafi', 'banco'] },
    { id: 'icbc', name: 'ICBC', icon: `${BASE_PATH}/banco-icbc.svg`, keywords: ['icbc', 'banco'] },
    { id: 'credicoop', name: 'Banco Credicoop', icon: `${BASE_PATH}/banco-credicoop.svg`, keywords: ['credicoop', 'banco'] },
    { id: 'hipotecario', name: 'Banco Hipotecario', icon: `${BASE_PATH}/BHIP.svg`, keywords: ['hipotecario', 'banco'] },
    { id: 'itau', name: 'Itaú', icon: `${BASE_PATH}/banco-itau.svg`, keywords: ['itau', 'banco'] },
    { id: 'bind', name: 'BIND', icon: `${BASE_PATH}/bind.svg`, keywords: ['bind', 'banco', 'industrial'] },
    { id: 'piano', name: 'Banco Piano', icon: `${BASE_PATH}/banco-piano.svg`, keywords: ['piano', 'banco'] },
    { id: 'columbia', name: 'Banco Columbia', icon: `${BASE_PATH}/banco-columbia.svg`, keywords: ['columbia', 'banco'] },
    { id: 'bica', name: 'BICA', icon: `${BASE_PATH}/banco-bica.svg`, keywords: ['bica', 'banco'] },
    { id: 'coinag', name: 'Banco Coinag', icon: `${BASE_PATH}/banco-coinag.svg`, keywords: ['coinag', 'banco'] },
    { id: 'del_sol', name: 'Banco del Sol', icon: `${BASE_PATH}/banco-del-sol.svg`, keywords: ['sol', 'banco'] },
    { id: 'san_juan', name: 'Banco San Juan', icon: `${BASE_PATH}/banco-san-juan.svg`, keywords: ['san juan', 'banco'] },
    { id: 'santa_cruz', name: 'Banco Santa Cruz', icon: `${BASE_PATH}/banco-santa-cruz.svg`, keywords: ['santa cruz', 'banco'] },
    { id: 'corrientes', name: 'Banco Corrientes', icon: `${BASE_PATH}/banco-corrientes.svg`, keywords: ['corrientes', 'banco'] },
    { id: 'entre_rios', name: 'Banco Entre Ríos', icon: `${BASE_PATH}/banco-entre-rios.svg`, keywords: ['entre rios', 'banco'] },
  ],

  fintechs: [
    { id: 'mercadopago', name: 'Mercado Pago', icon: `${BASE_PATH}/mercadopago.svg`, keywords: ['mercado pago', 'mp', 'mercadolibre'] },
    { id: 'uala', name: 'Ualá', icon: `${BASE_PATH}/uala.svg`, keywords: ['uala', 'fintech'] },
    { id: 'naranja_x', name: 'Naranja X', icon: `${BASE_PATH}/naranja-x.svg`, keywords: ['naranja', 'naranja x', 'fintech'] },
    { id: 'personal_pay', name: 'Personal Pay', icon: `${BASE_PATH}/personal-pay.svg`, keywords: ['personal', 'personal pay', 'fintech'] },
    { id: 'brubank', name: 'Brubank', icon: `${BASE_PATH}/brubank.svg`, keywords: ['brubank', 'fintech'] },
    { id: 'lemon', name: 'Lemon', icon: `${BASE_PATH}/lemon.svg`, keywords: ['lemon', 'fintech'] },
    { id: 'belo', name: 'Belo', icon: `${BASE_PATH}/belo.svg`, keywords: ['belo', 'fintech'] },
    { id: 'prex', name: 'Prex', icon: `${BASE_PATH}/prex.svg`, keywords: ['prex', 'fintech'] },
    { id: 'cuenta_dni', name: 'Cuenta DNI', icon: `${BASE_PATH}/cuenta-dni.svg`, keywords: ['cuenta dni', 'dni', 'fintech'] },
    { id: 'modo', name: 'MODO', icon: `${BASE_PATH}/modo.svg`, keywords: ['modo', 'fintech'] },
    { id: 'openbank', name: 'Openbank', icon: `${BASE_PATH}/openbank.svg`, keywords: ['openbank', 'fintech'] },
    { id: 'claro_pay', name: 'Claro Pay', icon: `${BASE_PATH}/claro-pay.svg`, keywords: ['claro', 'claro pay', 'fintech'] },
  ],

  crypto: [
    { id: 'ripio', name: 'Ripio', icon: `${BASE_PATH}/ripio.svg`, keywords: ['ripio', 'crypto'] },
    { id: 'buenbit', name: 'Buenbit', icon: `${BASE_PATH}/buenbit.svg`, keywords: ['buenbit', 'crypto'] },
    { id: 'fiwind', name: 'Fiwind', icon: `${BASE_PATH}/fiwind.svg`, keywords: ['fiwind', 'crypto'] },
    { id: 'cocos', name: 'Cocos', icon: `${BASE_PATH}/cocos.svg`, keywords: ['cocos', 'crypto', 'capital'] },
    { id: 'satoshitango', name: 'Satoshi Tango', icon: `${BASE_PATH}/satoshi-tango.svg`, keywords: ['satoshitango', 'satoshi', 'crypto'] },
    { id: 'takenos', name: 'Takenos', icon: `${BASE_PATH}/takenos.svg`, keywords: ['takenos', 'crypto'] },
    { id: 'wallbit', name: 'Wallbit', icon: `${BASE_PATH}/wallbit-new.svg`, keywords: ['wallbit', 'crypto'] },
    { id: 'ieb', name: 'IEB', icon: `${BASE_PATH}/ieb.svg`, keywords: ['ieb', 'invertir', 'broker'] },
    { id: 'balanz', name: 'Balanz', icon: `${BASE_PATH}/balanz.svg`, keywords: ['balanz', 'broker', 'inversiones'] },
  ],

  metodosPago: [
    { id: 'visa', name: 'Visa', icon: `${BASE_PATH}/V.svg`, keywords: ['visa', 'tarjeta', 'credito', 'debito'] },
    { id: 'mastercard', name: 'Mastercard', icon: `${BASE_PATH}/MA.svg`, keywords: ['mastercard', 'master', 'tarjeta', 'credito', 'debito'] },
    { id: 'amex', name: 'American Express', icon: `${BASE_PATH}/AXP.svg`, keywords: ['amex', 'american express', 'tarjeta', 'credito'] },
    { id: 'cabal', name: 'Cabal', icon: `${BASE_PATH}/cabal.svg`, keywords: ['cabal', 'tarjeta', 'credito', 'debito', 'argentina'] },
    { id: 'paypal', name: 'PayPal', icon: `${BASE_PATH}/PYPL.svg`, keywords: ['paypal', 'pago', 'online'] },
  ],

  monedas: [
    { id: 'ars', name: 'Peso Argentino', icon: `${BASE_PATH}/ARS.svg`, keywords: ['peso', 'ars', 'argentina', 'moneda'] },
    { id: 'usd', name: 'Dólar', icon: `${BASE_PATH}/USD.svg`, keywords: ['dolar', 'usd', 'dollar', 'moneda'] },
  ],
};

/**
 * Obtiene todos los íconos predefinidos como lista plana
 */
export const getAllPredefinedIcons = () => {
  return [
    ...PREDEFINED_ICONS.bancos,
    ...PREDEFINED_ICONS.fintechs,
    ...PREDEFINED_ICONS.crypto,
    ...PREDEFINED_ICONS.metodosPago,
    ...PREDEFINED_ICONS.monedas,
  ];
};

/**
 * Busca íconos por término
 */
export const searchPredefinedIcons = (searchTerm) => {
  if (!searchTerm) return getAllPredefinedIcons();

  const term = searchTerm.toLowerCase().trim();
  return getAllPredefinedIcons().filter(icon =>
    icon.name.toLowerCase().includes(term) ||
    icon.keywords.some(keyword => keyword.includes(term))
  );
};

/**
 * Obtiene un ícono por su ID
 */
export const getIconById = (id) => {
  return getAllPredefinedIcons().find(icon => icon.id === id);
};

/**
 * Categorías de íconos para mostrar en tabs/secciones
 */
export const ICON_CATEGORIES = [
  { id: 'bancos', name: 'Bancos', icons: PREDEFINED_ICONS.bancos },
  { id: 'fintechs', name: 'Fintechs', icons: PREDEFINED_ICONS.fintechs },
  { id: 'crypto', name: 'Crypto/Brokers', icons: PREDEFINED_ICONS.crypto },
  { id: 'metodosPago', name: 'Tarjetas', icons: PREDEFINED_ICONS.metodosPago },
  { id: 'monedas', name: 'Monedas', icons: PREDEFINED_ICONS.monedas },
];

export default PREDEFINED_ICONS;
