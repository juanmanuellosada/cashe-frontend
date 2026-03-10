import { supabase } from '../config/supabase';

export const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || 'demo@cashe.ar';
export const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD || 'DemoCache2024!';

const uid = () => crypto.randomUUID();

const d = (monthsAgo, dayOfMonth) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - monthsAgo);
  const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(dayOfMonth, maxDay));
  return date.toISOString().split('T')[0];
};

export const checkDemoSeeded = async (userId) => {
  const { data } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .limit(1);
  return !!(data && data.length > 0);
};

export const seedDemoData = async (userId) => {
  // Settings
  await supabase.from('user_settings').upsert(
    { user_id: userId, default_currency: 'ARS', exchange_rate: 1000 },
    { onConflict: 'user_id' }
  );

  // Categories
  const cats = [
    { id: uid(), user_id: userId, name: '💼 Sueldo', type: 'income' },
    { id: uid(), user_id: userId, name: '💰 Freelance', type: 'income' },
    { id: uid(), user_id: userId, name: '📈 Inversiones', type: 'income' },
    { id: uid(), user_id: userId, name: '🎁 Regalo', type: 'income' },
    { id: uid(), user_id: userId, name: '📦 Otros ingresos', type: 'income' },
    { id: uid(), user_id: userId, name: '🍔 Comida', type: 'expense' },
    { id: uid(), user_id: userId, name: '🏠 Hogar', type: 'expense' },
    { id: uid(), user_id: userId, name: '🚗 Transporte', type: 'expense' },
    { id: uid(), user_id: userId, name: '🎬 Entretenimiento', type: 'expense' },
    { id: uid(), user_id: userId, name: '🛒 Supermercado', type: 'expense' },
    { id: uid(), user_id: userId, name: '💊 Salud', type: 'expense' },
    { id: uid(), user_id: userId, name: '👕 Ropa', type: 'expense' },
    { id: uid(), user_id: userId, name: '📱 Servicios', type: 'expense' },
    { id: uid(), user_id: userId, name: '📦 Otros gastos', type: 'expense' },
  ];
  await supabase.from('categories').insert(cats);

  const catId = (name) => cats.find(c => c.name === name)?.id;

  // Accounts
  const accts = [
    { id: uid(), user_id: userId, name: 'Banco Galicia', currency: 'ARS', initial_balance: 50000, account_type: 'Caja de ahorro', is_credit_card: false },
    { id: uid(), user_id: userId, name: 'Mercado Pago', currency: 'ARS', initial_balance: 5000, account_type: 'Billetera virtual', is_credit_card: false },
    { id: uid(), user_id: userId, name: 'Efectivo', currency: 'ARS', initial_balance: 15000, account_type: 'Efectivo', is_credit_card: false },
    { id: uid(), user_id: userId, name: 'Naranja X Visa', currency: 'ARS', initial_balance: 0, account_type: 'Tarjeta de crédito', is_credit_card: true, closing_day: 25 },
    { id: uid(), user_id: userId, name: 'Dólares', currency: 'USD', initial_balance: 500, account_type: 'Efectivo', is_credit_card: false },
  ];
  await supabase.from('accounts').insert(accts);

  const accId = (name) => accts.find(a => a.name === name)?.id;

  // Movements: 6 months
  const movements = [];

  for (let m = 0; m < 6; m++) {
    movements.push({ id: uid(), user_id: userId, type: 'income', date: d(m, 5), amount: 350000 + (m * 5000), account_id: accId('Banco Galicia'), category_id: catId('💼 Sueldo'), note: 'Sueldo mensual' });
    movements.push({ id: uid(), user_id: userId, type: 'expense', date: d(m, 1), amount: 180000, account_id: accId('Banco Galicia'), category_id: catId('🏠 Hogar'), note: 'Alquiler' });
    movements.push({ id: uid(), user_id: userId, type: 'expense', date: d(m, 10), amount: 14500, account_id: accId('Banco Galicia'), category_id: catId('📱 Servicios'), note: 'Internet Fibertel' });
    movements.push({ id: uid(), user_id: userId, type: 'expense', date: d(m, 10), amount: 9800, account_id: accId('Banco Galicia'), category_id: catId('📱 Servicios'), note: 'Movistar celular' });
    movements.push({ id: uid(), user_id: userId, type: 'expense', date: d(m, 4), amount: 48000 + (m * 2000), account_id: accId('Naranja X Visa'), category_id: catId('🛒 Supermercado'), note: 'Coto' });
    movements.push({ id: uid(), user_id: userId, type: 'expense', date: d(m, 18), amount: 38000 + (m * 1500), account_id: accId('Naranja X Visa'), category_id: catId('🛒 Supermercado'), note: 'Carrefour' });
    movements.push({ id: uid(), user_id: userId, type: 'expense', date: d(m, 7), amount: 8500, account_id: accId('Mercado Pago'), category_id: catId('🚗 Transporte'), note: 'Carga SUBE' });
    movements.push({ id: uid(), user_id: userId, type: 'expense', date: d(m, 15), amount: 22000 + (m * 1000), account_id: accId('Naranja X Visa'), category_id: catId('🍔 Comida'), note: 'Restaurante' });
    movements.push({ id: uid(), user_id: userId, type: 'expense', date: d(m, 22), amount: 14000, account_id: accId('Efectivo'), category_id: catId('🍔 Comida'), note: 'Almuerzo trabajo' });
    movements.push({ id: uid(), user_id: userId, type: 'expense', date: d(m, 20), amount: 18500, account_id: accId('Naranja X Visa'), category_id: catId('🎬 Entretenimiento'), note: 'Cine + salida' });

    if (m % 2 === 0) {
      movements.push({ id: uid(), user_id: userId, type: 'income', date: d(m, 15), amount: 85000 + (m * 5000), account_id: accId('Mercado Pago'), category_id: catId('💰 Freelance'), note: 'Proyecto web' });
    }
    if (m % 2 === 1) {
      movements.push({ id: uid(), user_id: userId, type: 'expense', date: d(m, 25), amount: 42000, account_id: accId('Naranja X Visa'), category_id: catId('👕 Ropa'), note: 'Zara - ropa' });
    }
    if (m % 3 === 0) {
      movements.push({ id: uid(), user_id: userId, type: 'expense', date: d(m, 14), amount: 25000, account_id: accId('Banco Galicia'), category_id: catId('💊 Salud'), note: 'Consulta médica' });
    }
  }

  await supabase.from('movements').insert(movements);

  // Transfers
  const transfers = [];
  for (let m = 0; m < 6; m++) {
    transfers.push({ id: uid(), user_id: userId, date: d(m, 6), from_account_id: accId('Banco Galicia'), to_account_id: accId('Mercado Pago'), from_amount: 20000, to_amount: 20000, note: 'Recarga Mercado Pago' });
    if (m % 2 === 0) {
      transfers.push({ id: uid(), user_id: userId, date: d(m, 8), from_account_id: accId('Banco Galicia'), to_account_id: accId('Efectivo'), from_amount: 15000, to_amount: 15000, note: 'Retiro cajero' });
    }
  }
  await supabase.from('transfers').insert(transfers);
};

export const ensureDemoSeeded = async (userId) => {
  const seeded = await checkDemoSeeded(userId);
  if (!seeded) {
    await seedDemoData(userId);
  }
};
