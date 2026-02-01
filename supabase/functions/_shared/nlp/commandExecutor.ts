/**
 * Ejecutor de comandos
 * Ejecuta las acciones de escritura y consultas en Supabase
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  RESPONSES,
  formatCurrency,
  formatDate,
  formatDateDisplay,
  interpolate,
} from "../constants/responses.ts";
import type {
  Intent,
  ParsedEntities,
  ActionResult,
  UserContext,
  UserAccount,
} from "./types.ts";

/**
 * Ejecuta una acción de registro (gasto/ingreso/transferencia)
 */
export async function executeWriteAction(
  supabase: SupabaseClient,
  userId: string,
  intent: Intent,
  entities: ParsedEntities,
  context: UserContext
): Promise<ActionResult> {
  try {
    switch (intent) {
      case "REGISTRAR_GASTO":
        return await createMovement(supabase, userId, "expense", entities, context);

      case "REGISTRAR_INGRESO":
        return await createMovement(supabase, userId, "income", entities, context);

      case "REGISTRAR_TRANSFERENCIA":
        return await createTransfer(supabase, userId, entities, context);

      default:
        return {
          success: false,
          message: RESPONSES.ERROR_GENERICO,
        };
    }
  } catch (error) {
    console.error("Error executing write action:", error);
    return {
      success: false,
      message: RESPONSES.ERROR_GENERICO,
    };
  }
}

/**
 * Crea un movimiento (gasto o ingreso)
 * Si es un gasto con cuotas, crea la compra en cuotas y todos los movimientos
 */
async function createMovement(
  supabase: SupabaseClient,
  userId: string,
  type: "income" | "expense",
  entities: ParsedEntities,
  context: UserContext
): Promise<ActionResult> {
  const date = entities.date || getTodayISO();

  // Si es un gasto con cuotas, crear compra en cuotas
  if (type === "expense" && entities.installments && entities.installments > 1) {
    return await createInstallmentPurchase(supabase, userId, entities, context, date);
  }

  // Movimiento simple (sin cuotas)
  const movementData = {
    user_id: userId,
    type,
    date,
    amount: entities.amount,
    account_id: entities.accountId,
    category_id: entities.categoryId || null,
    note: entities.note || null,
  };

  const { data, error } = await supabase
    .from("movements")
    .insert(movementData)
    .select()
    .single();

  if (error) {
    console.error("Error creating movement:", error);
    return {
      success: false,
      message: RESPONSES.ERROR_GENERICO,
    };
  }

  // Obtener nombres para el mensaje de confirmación
  const accountName = getAccountName(entities.accountId, context);
  const categoryName = getCategoryName(entities.categoryId, context);

  const successMessage =
    type === "expense" ? RESPONSES.GASTO_REGISTRADO : RESPONSES.INGRESO_REGISTRADO;

  const template =
    type === "expense" ? RESPONSES.RESULTADO_GASTO : RESPONSES.RESULTADO_INGRESO;

  const details = interpolate(template, {
    monto: formatCurrency(entities.amount || 0, entities.currency || "ARS"),
    categoria: categoryName || "Sin categoría",
    cuenta: accountName || "Sin cuenta",
  });

  return {
    success: true,
    message: `${successMessage}\n${details}`,
    data: {
      id: data.id,
      amount: entities.amount,
      category: categoryName,
      account: accountName,
      date,
    },
  };
}

/**
 * Crea una compra en cuotas con tarjeta de crédito
 */
async function createInstallmentPurchase(
  supabase: SupabaseClient,
  userId: string,
  entities: ParsedEntities,
  context: UserContext,
  startDate: string
): Promise<ActionResult> {
  const totalAmount = entities.amount || 0;
  const installments = entities.installments || 1;
  const installmentAmount = Math.round(totalAmount / installments);

  // Obtener info de la cuenta (tarjeta)
  const account = context.accounts.find(a => a.id === entities.accountId);
  const closingDay = account?.closing_day || 1;

  // Usar la fecha de primera cuota especificada por el usuario, o calcularla automáticamente
  const firstInstallmentDate = entities.firstInstallmentDate || calculateFirstInstallmentDate(startDate, closingDay);

  // Crear registro de compra en cuotas
  const purchaseData = {
    user_id: userId,
    description: entities.note || "Compra en cuotas",
    total_amount: totalAmount,
    installments: installments,
    account_id: entities.accountId,
    category_id: entities.categoryId || null,
    start_date: firstInstallmentDate,
  };

  const { data: purchase, error: purchaseError } = await supabase
    .from("installment_purchases")
    .insert(purchaseData)
    .select()
    .single();

  if (purchaseError) {
    console.error("Error creating installment purchase:", purchaseError);
    return {
      success: false,
      message: RESPONSES.ERROR_GENERICO,
    };
  }

  // Crear los movimientos individuales para cada cuota
  const movementsToInsert = [];
  for (let i = 0; i < installments; i++) {
    const cuotaDate = addMonths(firstInstallmentDate, i);
    movementsToInsert.push({
      user_id: userId,
      type: "expense",
      date: cuotaDate,
      amount: installmentAmount,
      account_id: entities.accountId,
      category_id: entities.categoryId || null,
      note: entities.note ? `${entities.note} (${i + 1}/${installments})` : `Cuota ${i + 1}/${installments}`,
      installment_purchase_id: purchase.id,
      installment_number: i + 1,
      total_installments: installments,
    });
  }

  const { error: movementsError } = await supabase
    .from("movements")
    .insert(movementsToInsert);

  if (movementsError) {
    console.error("Error creating installment movements:", movementsError);
    // Intentar eliminar la compra creada
    await supabase.from("installment_purchases").delete().eq("id", purchase.id);
    return {
      success: false,
      message: RESPONSES.ERROR_GENERICO,
    };
  }

  const accountName = getAccountName(entities.accountId, context);
  const categoryName = getCategoryName(entities.categoryId, context);

  // Obtener nombre del mes para el resumen
  const resumenMonth = getMonthYearLabel(firstInstallmentDate);

  const message = `✅ *Compra en cuotas registrada*

💸 *Total:* ${formatCurrency(totalAmount, entities.currency || "ARS")}
📦 *Cuotas:* ${installments}x ${formatCurrency(installmentAmount, entities.currency || "ARS")}
💳 *Tarjeta:* ${accountName || "Sin cuenta"}
📁 *Categoría:* ${categoryName || "Sin categoría"}
🗓️ *Resumen:* ${resumenMonth}`;

  return {
    success: true,
    message,
    data: {
      id: purchase.id,
      amount: totalAmount,
      category: categoryName,
      account: accountName,
      date: firstInstallmentDate,
    },
  };
}

/**
 * Calcula la fecha de la primera cuota basada en la fecha de compra y el día de cierre
 */
function calculateFirstInstallmentDate(purchaseDate: string, closingDay: number): string {
  const purchase = new Date(purchaseDate + "T12:00:00");
  const purchaseDay = purchase.getDate();

  let year = purchase.getFullYear();
  let month = purchase.getMonth();

  // Si la compra es antes del cierre, la primera cuota es el mes siguiente
  // Si es después del cierre, la primera cuota es en 2 meses
  if (purchaseDay <= closingDay) {
    month += 1;
  } else {
    month += 2;
  }

  // Ajustar año si es necesario
  if (month > 11) {
    month -= 12;
    year += 1;
  }

  // Usar el día de cierre como fecha de la cuota (o el último día del mes si es menor)
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(closingDay, lastDayOfMonth);

  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Suma meses a una fecha
 */
function addMonths(dateStr: string, months: number): string {
  const date = new Date(dateStr + "T12:00:00");
  let year = date.getFullYear();
  let month = date.getMonth() + months;
  const day = date.getDate();

  while (month > 11) {
    month -= 12;
    year += 1;
  }

  // Ajustar día si el mes no tiene suficientes días
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const adjustedDay = Math.min(day, lastDayOfMonth);

  return `${year}-${String(month + 1).padStart(2, "0")}-${String(adjustedDay).padStart(2, "0")}`;
}

/**
 * Crea una transferencia
 */
async function createTransfer(
  supabase: SupabaseClient,
  userId: string,
  entities: ParsedEntities,
  context: UserContext
): Promise<ActionResult> {
  // Validar que origen y destino sean diferentes
  if (entities.fromAccountId === entities.toAccountId) {
    return {
      success: false,
      message: RESPONSES.ERROR_MISMA_CUENTA,
    };
  }

  const date = entities.date || getTodayISO();

  // Por simplicidad, usamos el mismo monto para ambas cuentas
  // En un caso más complejo, podríamos manejar conversión de monedas
  const transferData = {
    user_id: userId,
    date,
    from_account_id: entities.fromAccountId,
    to_account_id: entities.toAccountId,
    from_amount: entities.amount,
    to_amount: entities.amount,
    note: entities.note || null,
  };

  const { data, error } = await supabase
    .from("transfers")
    .insert(transferData)
    .select()
    .single();

  if (error) {
    console.error("Error creating transfer:", error);
    return {
      success: false,
      message: RESPONSES.ERROR_GENERICO,
    };
  }

  const fromAccountName = getAccountName(entities.fromAccountId, context);
  const toAccountName = getAccountName(entities.toAccountId, context);

  const details = interpolate(RESPONSES.RESULTADO_TRANSFERENCIA, {
    monto: formatCurrency(entities.amount || 0, entities.currency || "ARS"),
    cuenta_origen: fromAccountName || "?",
    cuenta_destino: toAccountName || "?",
  });

  return {
    success: true,
    message: `${RESPONSES.TRANSFERENCIA_REGISTRADA}\n${details}`,
    data: {
      id: data.id,
      amount: entities.amount,
      account: `${fromAccountName} → ${toAccountName}`,
      date,
    },
  };
}

/**
 * Ejecuta una consulta (saldo, gastos, etc.)
 */
export async function executeReadAction(
  supabase: SupabaseClient,
  userId: string,
  intent: Intent,
  entities: ParsedEntities,
  context: UserContext
): Promise<ActionResult> {
  try {
    switch (intent) {
      case "CONSULTAR_SALDO":
        return await queryBalance(supabase, userId, entities, context);

      case "CONSULTAR_GASTOS":
        return await queryExpenses(supabase, userId, entities, context);

      case "ULTIMOS_MOVIMIENTOS":
        return await queryRecentMovements(supabase, userId, entities, context);

      case "RESUMEN_MES":
        return await queryMonthlySummary(supabase, userId, context);

      case "AYUDA":
        return {
          success: true,
          message: RESPONSES.HELP,
        };

      default:
        return {
          success: false,
          message: RESPONSES.NO_ENTENDI,
        };
    }
  } catch (error) {
    console.error("Error executing read action:", error);
    return {
      success: false,
      message: RESPONSES.ERROR_GENERICO,
    };
  }
}

/**
 * Consulta el saldo de una o todas las cuentas
 */
async function queryBalance(
  supabase: SupabaseClient,
  userId: string,
  entities: ParsedEntities,
  context: UserContext
): Promise<ActionResult> {
  if (context.accounts.length === 0) {
    return {
      success: false,
      message: RESPONSES.ERROR_SIN_CUENTAS,
    };
  }

  // Si se especifica una cuenta
  if (entities.accountId) {
    const account = context.accounts.find((a) => a.id === entities.accountId);
    if (!account) {
      return {
        success: false,
        message: RESPONSES.ERROR_CUENTA_NO_ENCONTRADA,
      };
    }

    const balance = await calculateAccountBalance(supabase, userId, account.id);
    const message = `${interpolate(RESPONSES.SALDO_CUENTA, { cuenta: account.name })}\n\n${formatCurrency(balance, account.currency)}`;

    return {
      success: true,
      message,
    };
  }

  // Saldo de todas las cuentas
  let message = `${RESPONSES.SALDO_TOTAL}\n\n`;
  let totalARS = 0;
  let totalUSD = 0;

  for (const account of context.accounts) {
    const balance = await calculateAccountBalance(supabase, userId, account.id);

    if (account.currency === "USD") {
      totalUSD += balance;
    } else {
      totalARS += balance;
    }

    const icon = account.icon || "💳";
    message += `${icon} *${account.name}*\n   ${formatCurrency(balance, account.currency)}\n`;
  }

  message += `\n📊 *Total:*`;
  if (totalARS !== 0) message += `\n   ${formatCurrency(totalARS, "ARS")}`;
  if (totalUSD !== 0) message += `\n   ${formatCurrency(totalUSD, "USD")}`;

  return {
    success: true,
    message,
  };
}

/**
 * Consulta gastos por categoría o período
 */
async function queryExpenses(
  supabase: SupabaseClient,
  userId: string,
  entities: ParsedEntities,
  context: UserContext
): Promise<ActionResult> {
  const { startDate, endDate, periodLabel } = getDateRange(entities);

  let query = supabase
    .from("movements")
    .select("amount, category_id, date, note, account_id")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: false });

  // Filtrar por categoría si se especifica
  if (entities.queryCategoryId) {
    query = query.eq("category_id", entities.queryCategoryId);
  }

  const { data: movements, error } = await query;

  if (error) {
    console.error("Error querying expenses:", error);
    return {
      success: false,
      message: RESPONSES.ERROR_GENERICO,
    };
  }

  if (!movements || movements.length === 0) {
    return {
      success: true,
      message: RESPONSES.SIN_MOVIMIENTOS,
    };
  }

  const total = movements.reduce((sum, m) => sum + Number(m.amount), 0);
  const categoryName = entities.queryCategoryId
    ? getCategoryName(entities.queryCategoryId, context)
    : null;

  let message: string;
  if (categoryName) {
    message = interpolate(RESPONSES.GASTOS_CATEGORIA, {
      categoria: categoryName,
      periodo: periodLabel,
    });
  } else {
    message = interpolate(RESPONSES.GASTOS_PERIODO, { periodo: periodLabel });
  }

  message += `\n\n💸 *Total: ${formatCurrency(total, "ARS")}*`;
  message += `\n📋 ${movements.length} movimientos`;

  // Mostrar últimos 5
  if (movements.length > 0) {
    message += `\n\n*Últimos gastos:*`;
    for (const m of movements.slice(0, 5)) {
      const catName = getCategoryName(m.category_id, context) || "Sin categoría";
      message += `\n• ${formatCurrency(Number(m.amount), "ARS")} - ${catName} (${formatDateDisplay(m.date)})`;
    }
  }

  return {
    success: true,
    message,
  };
}

/**
 * Consulta los últimos movimientos
 */
async function queryRecentMovements(
  supabase: SupabaseClient,
  userId: string,
  entities: ParsedEntities,
  context: UserContext
): Promise<ActionResult> {
  const limit = entities.limit || 5;

  // Obtener movimientos
  const { data: movements, error: movError } = await supabase
    .from("movements")
    .select("id, type, amount, category_id, account_id, date, note")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  // Obtener transferencias
  const { data: transfers, error: transError } = await supabase
    .from("transfers")
    .select("id, from_account_id, to_account_id, from_amount, date, note")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (movError || transError) {
    console.error("Error querying movements:", movError || transError);
    return {
      success: false,
      message: RESPONSES.ERROR_GENERICO,
    };
  }

  // Combinar y ordenar
  const allMovements = [
    ...(movements || []).map((m) => ({ ...m, _type: "movement" as const })),
    ...(transfers || []).map((t) => ({
      ...t,
      _type: "transfer" as const,
      type: "transfer",
      amount: t.from_amount,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);

  if (allMovements.length === 0) {
    return {
      success: true,
      message: RESPONSES.SIN_MOVIMIENTOS,
    };
  }

  let message = interpolate(RESPONSES.ULTIMOS_MOVIMIENTOS, { n: String(limit) });
  message += "\n";

  for (const m of allMovements) {
    if (m._type === "movement") {
      const catName = getCategoryName(m.category_id, context) || "Sin categoría";
      const accName = getAccountName(m.account_id, context) || "";
      const icon = m.type === "income" ? "💰" : "💸";
      const sign = m.type === "income" ? "+" : "";

      message += `\n${icon} ${sign}${formatCurrency(Number(m.amount), "ARS")} - ${catName}`;
      message += `\n   📅 ${formatDateDisplay(m.date)} | 🏦 ${accName}`;
    } else {
      const fromName = getAccountName(m.from_account_id, context) || "?";
      const toName = getAccountName(m.to_account_id, context) || "?";

      message += `\n🔄 ${formatCurrency(Number(m.from_amount), "ARS")}`;
      message += `\n   📅 ${formatDateDisplay(m.date)} | ${fromName} → ${toName}`;
    }
  }

  return {
    success: true,
    message,
  };
}

/**
 * Consulta el resumen del mes actual
 */
async function queryMonthlySummary(
  supabase: SupabaseClient,
  userId: string,
  context: UserContext
): Promise<ActionResult> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const startDate = formatDateISO(startOfMonth);
  const endDate = formatDateISO(endOfMonth);

  // Obtener movimientos del mes
  const { data: movements, error } = await supabase
    .from("movements")
    .select("type, amount, category_id")
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) {
    console.error("Error querying monthly summary:", error);
    return {
      success: false,
      message: RESPONSES.ERROR_GENERICO,
    };
  }

  const monthName = now.toLocaleDateString("es-AR", { month: "long" });

  let totalIncome = 0;
  let totalExpense = 0;
  const expensesByCategory: Record<string, number> = {};

  for (const m of movements || []) {
    if (m.type === "income") {
      totalIncome += Number(m.amount);
    } else {
      totalExpense += Number(m.amount);

      const catName = getCategoryName(m.category_id, context) || "Sin categoría";
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + Number(m.amount);
    }
  }

  const balance = totalIncome - totalExpense;
  const balanceIcon = balance >= 0 ? "📈" : "📉";

  let message = interpolate(RESPONSES.RESUMEN_MES, { mes: monthName });
  message += "\n";
  message += `\n💰 *Ingresos:* ${formatCurrency(totalIncome, "ARS")}`;
  message += `\n💸 *Gastos:* ${formatCurrency(totalExpense, "ARS")}`;
  message += `\n${balanceIcon} *Balance:* ${formatCurrency(balance, "ARS")}`;

  // Top 5 categorías de gasto
  const sortedCategories = Object.entries(expensesByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (sortedCategories.length > 0) {
    message += "\n\n*Top gastos por categoría:*";
    for (const [cat, amount] of sortedCategories) {
      const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
      message += `\n• ${cat}: ${formatCurrency(amount, "ARS")} (${percentage}%)`;
    }
  }

  return {
    success: true,
    message,
  };
}

/**
 * Calcula el saldo de una cuenta
 */
async function calculateAccountBalance(
  supabase: SupabaseClient,
  userId: string,
  accountId: string
): Promise<number> {
  // Obtener saldo inicial
  const { data: account } = await supabase
    .from("accounts")
    .select("initial_balance")
    .eq("id", accountId)
    .single();

  let balance = Number(account?.initial_balance || 0);

  // Sumar ingresos
  const { data: incomes } = await supabase
    .from("movements")
    .select("amount")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .eq("type", "income");

  for (const m of incomes || []) {
    balance += Number(m.amount);
  }

  // Restar gastos
  const { data: expenses } = await supabase
    .from("movements")
    .select("amount")
    .eq("user_id", userId)
    .eq("account_id", accountId)
    .eq("type", "expense");

  for (const m of expenses || []) {
    balance -= Number(m.amount);
  }

  // Transferencias entrantes
  const { data: inTransfers } = await supabase
    .from("transfers")
    .select("to_amount")
    .eq("user_id", userId)
    .eq("to_account_id", accountId);

  for (const t of inTransfers || []) {
    balance += Number(t.to_amount);
  }

  // Transferencias salientes
  const { data: outTransfers } = await supabase
    .from("transfers")
    .select("from_amount")
    .eq("user_id", userId)
    .eq("from_account_id", accountId);

  for (const t of outTransfers || []) {
    balance -= Number(t.from_amount);
  }

  return balance;
}

// Helpers

function getAccountName(accountId: string | undefined, context: UserContext): string | undefined {
  if (!accountId) return undefined;
  return context.accounts.find((a) => a.id === accountId)?.name;
}

function getCategoryName(categoryId: string | undefined, context: UserContext): string | undefined {
  if (!categoryId) return undefined;
  const cat = context.categories.find((c) => c.id === categoryId);
  return cat ? `${cat.icon || ""} ${cat.name}`.trim() : undefined;
}

function getTodayISO(): string {
  return formatDateISO(new Date());
}

function formatDateISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Convierte una fecha ISO a "Marzo 2026"
 */
function getMonthYearLabel(dateStr: string): string {
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const date = new Date(dateStr + "T12:00:00");
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function getDateRange(entities: ParsedEntities): {
  startDate: string;
  endDate: string;
  periodLabel: string;
} {
  const now = new Date();

  // Por defecto, mes actual
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    startDate: formatDateISO(startOfMonth),
    endDate: formatDateISO(endOfMonth),
    periodLabel: `de ${now.toLocaleDateString("es-AR", { month: "long" })}`,
  };
}
