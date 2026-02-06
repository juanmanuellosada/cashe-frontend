/**
 * Flujo de confirmación y edición
 * Maneja la lógica de confirmación antes de ejecutar acciones de escritura
 */

import {
  RESPONSES,
  EDIT_FIELDS,
  formatCurrency,
  formatDateDisplay,
  interpolate,
} from "../constants/responses.ts";
import { CONFIRMATION_PATTERNS, SELECTION_PATTERNS } from "../constants/patterns.ts";
import type {
  ConversationStateData,
  ParsedEntities,
  Intent,
  EditableField,
  DisambiguationOption,
  ProcessMessageResult,
  MessageButton,
  UserContext,
  UserAccount,
  UserCategory,
} from "./types.ts";
import {
  createEditFieldState,
  createEditValueState,
  createAccountSelectionState,
  createCategorySelectionState,
} from "./stateManager.ts";
import { getExpectedCategoryType } from "./intentClassifier.ts";
import { filterRelevantAccounts } from "./fuzzyMatcher.ts";

/**
 * Genera el mensaje de preview para confirmación
 */
export function buildConfirmationPreview(
  intent: Intent,
  entities: ParsedEntities,
  context: UserContext
): string {
  const totalAmount = entities.amount || 0;
  const installments = entities.installments || 0;
  const installmentAmount = installments > 1 ? Math.round(totalAmount / installments) : totalAmount;

  // Verificar si es una tarjeta de crédito
  const account = context.accounts.find(a => a.id === entities.accountId);
  const isCreditCard = account?.is_credit_card === true;

  // Calcular fecha del resumen para tarjetas de crédito (incluso con 1 cuota)
  let resumenLabel = "-";
  if (isCreditCard || installments > 1) {
    // Si el usuario especificó fecha de primera cuota, usarla; si no, calcular automáticamente
    const closingDay = account?.closing_day || 1;
    const purchaseDate = entities.date || new Date().toISOString().split("T")[0];
    const firstDate = entities.firstInstallmentDate || calculateFirstCuotaDate(purchaseDate, closingDay);
    resumenLabel = getMonthYearLabel(firstDate);
  }

  const values: Record<string, string> = {
    monto: formatCurrency(totalAmount, entities.currency || "ARS"),
    monto_cuota: formatCurrency(installmentAmount, entities.currency || "ARS"),
    cuotas: String(installments),
    categoria: getDisplayName("category", entities.categoryId, context) || "-",
    cuenta: getDisplayName("account", entities.accountId, context) || "-",
    cuenta_origen: getDisplayName("account", entities.fromAccountId, context) || "-",
    cuenta_destino: getDisplayName("account", entities.toAccountId, context) || "-",
    fecha: entities.date ? formatDateDisplay(entities.date) : "Hoy",
    nota: entities.note || "-",
    resumen: resumenLabel,
  };

  // Agregar valores específicos para tarjetas de crédito
  const targetCardName = getDisplayName("account", entities.targetCardId, context) ||
    entities.targetCard || "-";
  const sourceAccountName = getDisplayName("account", entities.sourceAccountId, context) ||
    entities.sourceAccount || "-";

  values.tarjeta = targetCardName;
  values.cuenta_origen = sourceAccountName || values.cuenta_origen;
  values.mes = entities.statementMonth || "actual";

  let template: string;
  switch (intent) {
    case "REGISTRAR_GASTO":
      // Usar template según tipo:
      // - Más de 1 cuota: PREVIEW_GASTO_CUOTAS (muestra total, cuotas y resumen)
      // - Tarjeta con 1 cuota: PREVIEW_GASTO_TARJETA (muestra resumen)
      // - Cuenta normal: PREVIEW_GASTO
      if (installments > 1) {
        template = RESPONSES.PREVIEW_GASTO_CUOTAS;
      } else if (isCreditCard) {
        template = RESPONSES.PREVIEW_GASTO_TARJETA;
      } else {
        template = RESPONSES.PREVIEW_GASTO;
      }
      break;
    case "REGISTRAR_INGRESO":
      template = RESPONSES.PREVIEW_INGRESO;
      break;
    case "REGISTRAR_TRANSFERENCIA":
      template = RESPONSES.PREVIEW_TRANSFERENCIA;
      break;
    case "PAGAR_TARJETA":
      template = RESPONSES.PREVIEW_PAGAR_TARJETA;
      break;
    case "AGREGAR_SELLOS":
      values.monto = formatCurrency(entities.stampTaxAmount || 0, "ARS");
      template = RESPONSES.PREVIEW_AGREGAR_SELLOS;
      break;
    default:
      return "";
  }

  return interpolate(template, values);
}

/**
 * Calcula la fecha de la primera cuota basada en la fecha de compra y el día de cierre
 */
function calculateFirstCuotaDate(purchaseDate: string, closingDay: number): string {
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

  return `${year}-${String(month + 1).padStart(2, "0")}-01`;
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

/**
 * Genera el mensaje completo de confirmación (preview + pregunta)
 */
export function buildConfirmationMessage(
  intent: Intent,
  entities: ParsedEntities,
  context: UserContext
): { message: string; buttons: MessageButton[] } {
  const preview = buildConfirmationPreview(intent, entities, context);
  const message = `${preview}\n\n${RESPONSES.CONFIRMAR_PREGUNTA}`;

  const buttons: MessageButton[] = [
    { text: "✅ Confirmar", callbackData: "confirm_yes", id: "confirm_yes" },
    { text: "✏️ Editar", callbackData: "confirm_edit", id: "confirm_edit" },
    { text: "❌ Cancelar", callbackData: "confirm_cancel", id: "confirm_cancel" },
  ];

  return { message, buttons };
}

/**
 * Procesa una respuesta de confirmación
 */
export function processConfirmationResponse(
  text: string
): "yes" | "no" | "edit" | null {
  const normalized = text.toLowerCase().trim();

  if (CONFIRMATION_PATTERNS.yes.test(normalized)) {
    return "yes";
  }
  if (CONFIRMATION_PATTERNS.no.test(normalized)) {
    return "no";
  }
  if (CONFIRMATION_PATTERNS.edit.test(normalized)) {
    return "edit";
  }

  return null;
}

/**
 * Genera el mensaje para selección de campo a editar
 */
export function buildEditFieldMessage(
  intent: Intent,
  entities: ParsedEntities,
  context: UserContext
): { message: string; buttons: MessageButton[] } {
  let fields: typeof EDIT_FIELDS.GASTO;

  switch (intent) {
    case "REGISTRAR_TRANSFERENCIA":
      fields = EDIT_FIELDS.TRANSFERENCIA;
      break;
    default:
      fields = EDIT_FIELDS.GASTO;
  }

  let message = `${RESPONSES.EDITAR_PREGUNTA}\n\n`;
  const buttons: MessageButton[] = [];

  fields.forEach((field, index) => {
    const value = getFieldDisplayValue(field.key as EditableField, entities, context);
    message += `${index + 1}️⃣ ${field.label} (${value})\n`;
    buttons.push({
      text: `${field.icon} ${field.label}`,
      callbackData: `edit_${field.key}`,
      id: `edit_${field.key}`,
    });
  });

  buttons.push({
    text: "❌ Cancelar",
    callbackData: "confirm_cancel",
    id: "confirm_cancel",
  });

  return { message, buttons };
}

/**
 * Procesa una selección de campo a editar
 */
export function processEditFieldSelection(
  text: string,
  intent: Intent
): EditableField | null {
  const normalized = text.toLowerCase().trim();

  // Selección por número
  const numMatch = normalized.match(SELECTION_PATTERNS.number);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    const fields =
      intent === "REGISTRAR_TRANSFERENCIA"
        ? EDIT_FIELDS.TRANSFERENCIA
        : EDIT_FIELDS.GASTO;

    if (num >= 1 && num <= fields.length) {
      return fields[num - 1].key as EditableField;
    }
  }

  // Selección por nombre
  const fieldMap: Record<string, EditableField> = {
    monto: "amount",
    categoria: "category",
    cuenta: "account",
    fecha: "date",
    nota: "note",
    origen: "from_account",
    destino: "to_account",
  };

  for (const [keyword, field] of Object.entries(fieldMap)) {
    if (normalized.includes(keyword)) {
      return field;
    }
  }

  return null;
}

/**
 * Genera el mensaje para editar un campo específico
 */
export function buildEditValueMessage(
  field: EditableField,
  context: UserContext,
  categoryType?: "income" | "expense",
  intent?: Intent,
  originalQuery?: string
): { message: string; buttons?: MessageButton[]; options?: DisambiguationOption[] } {
  switch (field) {
    case "amount":
      return { message: RESPONSES.EDITAR_MONTO };

    case "date":
      return { message: RESPONSES.EDITAR_FECHA };

    case "note":
      return { message: RESPONSES.EDITAR_NOTA };

    case "category": {
      const categories = categoryType
        ? context.categories.filter((c) => c.type === categoryType)
        : context.categories;

      const options = categories.map((c) => ({
        id: c.id,
        name: c.name,
        displayName: `${c.icon || ""} ${c.name}`.trim(),
        icon: c.icon,
      }));

      const buttons = options.slice(0, 10).map((opt, i) => ({
        text: opt.displayName,
        callbackData: `cat_${opt.id}`,
        id: `cat_${opt.id}`,
      }));

      let message = `${RESPONSES.SELECCIONAR_CATEGORIA}\n\n`;
      options.slice(0, 10).forEach((opt, i) => {
        message += `${i + 1}. ${opt.displayName}\n`;
      });

      return { message, buttons, options };
    }

    case "account":
    case "from_account":
    case "to_account": {
      // Filtrar cuentas relevantes usando la nueva función
      const filteredAccounts = filterRelevantAccounts(
        context.accounts,
        originalQuery,
        intent
      );

      const options = filteredAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        displayName: a.name,
        icon: a.icon,
        currency: a.currency,
        balance: a.balance,
      }));

      const buttons = options.map((opt, i) => ({
        text: opt.displayName,
        callbackData: `acc_${opt.id}`,
        id: `acc_${opt.id}`,
      }));

      const headerMessage =
        field === "from_account"
          ? RESPONSES.SELECCIONAR_CUENTA_ORIGEN
          : field === "to_account"
            ? RESPONSES.SELECCIONAR_CUENTA_DESTINO
            : RESPONSES.SELECCIONAR_CUENTA;

      let message = `${headerMessage}\n\n`;
      options.forEach((opt, i) => {
        message += `${i + 1}. ${opt.displayName}\n`;
      });

      return { message, buttons, options };
    }

    default:
      return { message: "¿Qué valor querés poner?" };
  }
}

/**
 * Procesa una selección de lista (número o texto)
 */
export function processListSelection(
  text: string,
  options: DisambiguationOption[]
): DisambiguationOption | null {
  const normalized = text.toLowerCase().trim();

  // Selección por número
  const numMatch = normalized.match(SELECTION_PATTERNS.number);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    if (num >= 1 && num <= options.length) {
      return options[num - 1];
    }
  }

  // Buscar por nombre (match parcial)
  for (const option of options) {
    if (
      option.name.toLowerCase().includes(normalized) ||
      normalized.includes(option.name.toLowerCase())
    ) {
      return option;
    }
  }

  return null;
}

/**
 * Actualiza una entidad específica en el estado
 */
export function updateEntityValue(
  entities: ParsedEntities,
  field: EditableField,
  value: string | number | DisambiguationOption
): ParsedEntities {
  const updated = { ...entities };

  switch (field) {
    case "amount":
      if (typeof value === "number") {
        updated.amount = value;
      }
      break;

    case "date":
      if (typeof value === "string") {
        updated.date = value;
      }
      break;

    case "note":
      if (typeof value === "string") {
        updated.note = value;
      }
      break;

    case "category":
      if (typeof value === "object" && "id" in value) {
        updated.categoryId = value.id;
        updated.category = value.name;
      }
      break;

    case "account":
      if (typeof value === "object" && "id" in value) {
        updated.accountId = value.id;
        updated.account = value.name;
      }
      break;

    case "from_account":
      if (typeof value === "object" && "id" in value) {
        updated.fromAccountId = value.id;
        updated.fromAccount = value.name;
      }
      break;

    case "to_account":
      if (typeof value === "object" && "id" in value) {
        updated.toAccountId = value.id;
        updated.toAccount = value.name;
      }
      break;
  }

  return updated;
}

/**
 * Obtiene el valor de display de un campo
 */
function getFieldDisplayValue(
  field: EditableField,
  entities: ParsedEntities,
  context: UserContext
): string {
  switch (field) {
    case "amount":
      return entities.amount
        ? formatCurrency(entities.amount, entities.currency || "ARS")
        : "-";

    case "date":
      return entities.date ? formatDateDisplay(entities.date) : "Hoy";

    case "note":
      return entities.note || "-";

    case "category":
      return getDisplayName("category", entities.categoryId, context) || "-";

    case "account":
      return getDisplayName("account", entities.accountId, context) || "-";

    case "from_account":
      return getDisplayName("account", entities.fromAccountId, context) || "-";

    case "to_account":
      return getDisplayName("account", entities.toAccountId, context) || "-";

    default:
      return "-";
  }
}

/**
 * Obtiene el nombre de display de una cuenta o categoría
 */
function getDisplayName(
  type: "account" | "category",
  id: string | undefined,
  context: UserContext
): string | undefined {
  if (!id) return undefined;

  if (type === "account") {
    const account = context.accounts.find((a) => a.id === id);
    return account?.name;
  }

  if (type === "category") {
    const category = context.categories.find((c) => c.id === id);
    return category ? `${category.icon || ""} ${category.name}`.trim() : undefined;
  }

  return undefined;
}

/**
 * Genera mensaje de desambiguación
 */
export function buildDisambiguationMessage(
  field: "account" | "category" | "fromAccount" | "toAccount",
  options: DisambiguationOption[]
): { message: string; buttons: MessageButton[] } {
  let headerMessage: string;

  switch (field) {
    case "account":
      headerMessage = RESPONSES.MULTIPLES_CUENTAS;
      break;
    case "fromAccount":
      headerMessage = RESPONSES.SELECCIONAR_CUENTA_ORIGEN;
      break;
    case "toAccount":
      headerMessage = RESPONSES.SELECCIONAR_CUENTA_DESTINO;
      break;
    case "category":
      headerMessage = RESPONSES.MULTIPLES_CATEGORIAS;
      break;
    default:
      headerMessage = "Elegí una opción:";
  }

  let message = `${headerMessage}\n\n`;
  const buttons: MessageButton[] = [];

  options.slice(0, 10).forEach((opt, i) => {
    const displayText =
      opt.balance !== undefined
        ? `${opt.displayName} - ${formatCurrency(opt.balance, opt.currency || "ARS")}`
        : opt.displayName;

    message += `${i + 1}. ${displayText}\n`;
    buttons.push({
      text: opt.displayName,
      callbackData: `sel_${opt.id}`,
      id: `sel_${opt.id}`,
    });
  });

  buttons.push({
    text: "❌ Cancelar",
    callbackData: "confirm_cancel",
    id: "confirm_cancel",
  });

  return { message, buttons };
}

/**
 * Verifica si faltan campos requeridos
 */
export function getMissingRequiredFields(
  intent: Intent,
  entities: ParsedEntities
): string[] {
  const missing: string[] = [];

  switch (intent) {
    case "REGISTRAR_GASTO":
    case "REGISTRAR_INGRESO":
      if (!entities.amount) missing.push("amount");
      if (!entities.accountId) missing.push("account");
      if (!entities.categoryId) missing.push("category");
      break;

    case "REGISTRAR_TRANSFERENCIA":
      if (!entities.amount) missing.push("amount");
      if (!entities.fromAccountId) missing.push("from_account");
      if (!entities.toAccountId) missing.push("to_account");
      break;
  }

  return missing;
}

/**
 * Genera mensaje para solicitar campo faltante
 */
export function buildMissingFieldMessage(
  field: string,
  context: UserContext,
  categoryType?: "income" | "expense",
  intent?: Intent,
  originalQuery?: string
): { message: string; buttons?: MessageButton[]; options?: DisambiguationOption[] } {
  switch (field) {
    case "amount":
      return { message: RESPONSES.FALTA_MONTO };

    case "account":
    case "from_account":
    case "to_account":
      return buildEditValueMessage(field as EditableField, context, undefined, intent, originalQuery);

    case "category":
      return buildEditValueMessage("category", context, categoryType, intent, originalQuery);

    default:
      return { message: `¿Cuál es el valor de ${field}?` };
  }
}
