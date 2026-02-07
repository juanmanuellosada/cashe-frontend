/**
 * Tipos TypeScript para el sistema NLP híbrido
 */

// Plataformas soportadas
export type Platform = "telegram" | "whatsapp";

// Intents soportados
export type Intent =
  | "REGISTRAR_GASTO"
  | "REGISTRAR_INGRESO"
  | "REGISTRAR_TRANSFERENCIA"
  | "PAGAR_TARJETA"
  | "AGREGAR_SELLOS"
  | "CONSULTAR_SALDO"
  | "CONSULTAR_GASTOS"
  | "CONSULTAR_INGRESOS"
  | "ULTIMOS_MOVIMIENTOS"
  | "RESUMEN_MES"
  | "CONSULTAR_RESUMEN_TARJETA"
  | "CONSULTAR_PRESUPUESTOS"
  | "MENU"
  | "CANCELAR"
  | "AYUDA"
  | "DESCONOCIDO";

// Estados del flujo de conversación
export type ConversationState =
  | "awaiting_confirmation"
  | "awaiting_edit_field"
  | "awaiting_edit_value"
  | "awaiting_account_selection"
  | "awaiting_category_selection"
  | "awaiting_disambiguation"
  // Nuevos estados para flujos guiados
  | "awaiting_card_selection"
  | "awaiting_statement_selection"
  | "awaiting_source_account"
  | "awaiting_stamp_tax_amount"
  | "awaiting_period_selection"
  | "awaiting_amount_input"
  | "awaiting_type_selection";

// Campos editables
export type EditableField =
  | "amount"
  | "category"
  | "account"
  | "from_account"
  | "to_account"
  | "date"
  | "note"
  | "target_card"
  | "source_account"
  | "statement_month"
  | "stamp_tax";

// Período para consultas
export interface QueryPeriod {
  type: "relative" | "range" | "month";
  value: string; // 'today', 'this_week', 'enero', etc.
  startDate?: string; // Para rangos: fecha inicio (YYYY-MM-DD)
  endDate?: string; // Para rangos: fecha fin (YYYY-MM-DD)
}

// Entidades extraídas del mensaje
export interface ParsedEntities {
  amount?: number;
  currency?: "ARS" | "USD";
  category?: string;
  categoryId?: string;
  account?: string;
  accountId?: string;
  fromAccount?: string;
  fromAccountId?: string;
  toAccount?: string;
  toAccountId?: string;
  date?: string; // formato ISO: YYYY-MM-DD
  note?: string;
  originalMessage?: string; // Mensaje original completo (para auto-reglas)
  installments?: number;
  firstInstallmentDate?: string; // fecha de primera cuota (YYYY-MM-DD)
  queryType?: "total" | "categoria" | "cuenta";
  queryCategoryId?: string;
  queryAccountId?: string;
  limit?: number; // para "últimos N movimientos"

  // Campos para tarjetas de crédito
  targetCard?: string; // Nombre de la tarjeta a pagar/modificar
  targetCardId?: string; // ID de la tarjeta
  statementMonth?: string; // Mes del resumen (enero, febrero, etc. o 'actual')
  statementId?: string; // ID del resumen
  sourceAccount?: string; // Cuenta desde donde pagar
  sourceAccountId?: string; // ID de la cuenta origen
  stampTaxAmount?: number; // Monto del impuesto de sellos

  // Campos para consultas por período
  period?: QueryPeriod;
}

// Resultado del clasificador de intents
export interface IntentClassification {
  intent: Intent;
  confidence: number;
  matchedPattern?: string;
}

// Resultado completo del parser
export interface ParseResult {
  intent: Intent;
  confidence: number;
  entities: ParsedEntities;
  rawText: string;
  normalizedText: string;
  needsDisambiguation?: boolean;
  disambiguationField?: "account" | "category" | "fromAccount" | "toAccount";
  disambiguationOptions?: DisambiguationOption[];
  missingRequired?: string[];
  source: "regex" | "groq" | "hybrid";
}

// Opción para desambiguación
export interface DisambiguationOption {
  id: string;
  name: string;
  displayName: string;
  icon?: string;
  balance?: number;
  currency?: string;
}

// Datos de estado de conversación (guardados en DB)
export interface ConversationStateData {
  id?: string;
  platform: Platform;
  platformUserId: string;
  userId: string;
  state: ConversationState;
  intent: Intent;
  parsedData: ParsedEntities;
  editField?: EditableField;
  disambiguationOptions?: DisambiguationOption[];
  createdAt?: string;
  expiresAt?: string;
}

// Datos del usuario de la plataforma
export interface PlatformUser {
  id: string;
  platform: Platform;
  platformUserId: string;
  userId: string;
  verified: boolean;
}

// Cuenta del usuario (de Supabase)
export interface UserAccount {
  id: string;
  name: string;
  currency: string;
  balance?: number;
  icon?: string;
  is_credit_card?: boolean;
  closing_day?: number;
  account_type?: string;
}

// Categoría del usuario (de Supabase)
export interface UserCategory {
  id: string;
  name: string;
  type: "income" | "expense";
  icon?: string;
}

// Contexto del usuario para el NLP
export interface UserContext {
  userId: string;
  accounts: UserAccount[];
  categories: UserCategory[];
  settings?: {
    defaultCurrency?: string;
    exchangeRate?: number;
  };
}

// Resultado de fuzzy matching
export interface FuzzyMatch {
  item: UserAccount | UserCategory;
  score: number;
  matchedAlias?: string;
}

// Respuesta del procesador de mensajes
export interface ProcessMessageResult {
  success: boolean;
  response: string;
  newState?: ConversationStateData;
  shouldClearState?: boolean;
  buttons?: MessageButton[];
  list?: MessageList;
}

// Botón para mensajes (Telegram inline keyboard / WhatsApp buttons)
export interface MessageButton {
  text: string;
  callbackData?: string; // para Telegram
  id?: string; // para WhatsApp
}

// Lista para mensajes (WhatsApp list / Telegram como botones)
export interface MessageList {
  title: string;
  buttonText: string;
  sections: MessageListSection[];
}

export interface MessageListSection {
  title: string;
  rows: MessageListRow[];
}

export interface MessageListRow {
  id: string;
  title: string;
  description?: string;
}

// Acción a ejecutar
export interface ActionToExecute {
  type: "movement" | "transfer" | "query";
  movementType?: "income" | "expense";
  data: ParsedEntities;
}

// Resultado de ejecución de acción
export interface ActionResult {
  success: boolean;
  message: string;
  data?: {
    id?: string;
    amount?: number;
    category?: string;
    account?: string;
    date?: string;
  };
}

// Request a Groq API
export interface GroqRequest {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
}

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Response de Groq API
export interface GroqResponse {
  intent: Intent;
  entities: {
    monto?: number;
    categoria?: string;
    cuenta?: string;
    cuenta_origen?: string;
    cuenta_destino?: string;
    nota?: string;
    fecha?: string;
    cuotas?: number;
  };
  confidence: number;
}

// Tipo para el callback de envío de mensaje según plataforma
export type SendMessageFn = (
  userId: string,
  message: string,
  options?: {
    buttons?: MessageButton[];
    list?: MessageList;
    parseMode?: "Markdown" | "HTML";
  }
) => Promise<void>;

// Tipo para mapeo de intents que requieren confirmación
export const INTENTS_REQUIRING_CONFIRMATION: Intent[] = [
  "REGISTRAR_GASTO",
  "REGISTRAR_INGRESO",
  "REGISTRAR_TRANSFERENCIA",
  "PAGAR_TARJETA",
  "AGREGAR_SELLOS",
];

// Tipo para mapeo de intents de solo lectura
export const READ_ONLY_INTENTS: Intent[] = [
  "CONSULTAR_SALDO",
  "CONSULTAR_GASTOS",
  "CONSULTAR_INGRESOS",
  "ULTIMOS_MOVIMIENTOS",
  "RESUMEN_MES",
  "CONSULTAR_RESUMEN_TARJETA",
  "CONSULTAR_PRESUPUESTOS",
  "MENU",
  "AYUDA",
];

// Campos requeridos por tipo de intent
export const REQUIRED_FIELDS: Record<Intent, (keyof ParsedEntities)[]> = {
  REGISTRAR_GASTO: ["amount", "accountId", "categoryId"],
  REGISTRAR_INGRESO: ["amount", "accountId", "categoryId"],
  REGISTRAR_TRANSFERENCIA: ["amount", "fromAccountId", "toAccountId"],
  PAGAR_TARJETA: ["targetCardId", "sourceAccountId"],
  AGREGAR_SELLOS: ["targetCardId", "stampTaxAmount"],
  CONSULTAR_SALDO: [],
  CONSULTAR_GASTOS: [],
  CONSULTAR_INGRESOS: [],
  ULTIMOS_MOVIMIENTOS: [],
  RESUMEN_MES: [],
  CONSULTAR_RESUMEN_TARJETA: [],
  CONSULTAR_PRESUPUESTOS: [],
  MENU: [],
  CANCELAR: [],
  AYUDA: [],
  DESCONOCIDO: [],
};
