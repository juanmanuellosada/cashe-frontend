/**
 * Manejador de estados de conversación
 * Guarda y recupera estados en la base de datos
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  Platform,
  ConversationState,
  ConversationStateData,
  ParsedEntities,
  Intent,
  DisambiguationOption,
  EditableField,
} from "./types.ts";

/**
 * Obtiene el estado de conversación actual de un usuario
 */
export async function getConversationState(
  supabase: SupabaseClient,
  platform: Platform,
  platformUserId: string
): Promise<ConversationStateData | null> {
  // Primero limpiar estados expirados
  await supabase.rpc("cleanup_expired_conversation_states");

  const { data, error } = await supabase
    .from("conversation_states")
    .select("*")
    .eq("platform", platform)
    .eq("platform_user_id", platformUserId)
    .single();

  if (error || !data) {
    return null;
  }

  // Verificar que no esté expirado (doble check)
  if (new Date(data.expires_at) < new Date()) {
    await deleteConversationState(supabase, platform, platformUserId);
    return null;
  }

  return {
    id: data.id,
    platform: data.platform,
    platformUserId: data.platform_user_id,
    userId: data.user_id,
    state: data.state,
    intent: data.intent,
    parsedData: data.parsed_data,
    editField: data.edit_field,
    disambiguationOptions: data.disambiguation_options,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
  };
}

/**
 * Guarda o actualiza el estado de conversación
 */
export async function saveConversationState(
  supabase: SupabaseClient,
  stateData: ConversationStateData
): Promise<string | null> {
  const { data, error } = await supabase.rpc("upsert_conversation_state", {
    p_platform: stateData.platform,
    p_platform_user_id: stateData.platformUserId,
    p_user_id: stateData.userId,
    p_state: stateData.state,
    p_intent: stateData.intent,
    p_parsed_data: stateData.parsedData,
    p_edit_field: stateData.editField || null,
    p_disambiguation_options: stateData.disambiguationOptions || null,
  });

  if (error) {
    console.error("Error saving conversation state:", error);
    return null;
  }

  return data;
}

/**
 * Actualiza campos específicos del estado
 */
export async function updateConversationState(
  supabase: SupabaseClient,
  platform: Platform,
  platformUserId: string,
  updates: Partial<ConversationStateData>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {};

  if (updates.state) updateData.state = updates.state;
  if (updates.intent) updateData.intent = updates.intent;
  if (updates.parsedData) updateData.parsed_data = updates.parsedData;
  if (updates.editField !== undefined) updateData.edit_field = updates.editField;
  if (updates.disambiguationOptions !== undefined) {
    updateData.disambiguation_options = updates.disambiguationOptions;
  }

  // Siempre extender el tiempo de expiración
  updateData.expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("conversation_states")
    .update(updateData)
    .eq("platform", platform)
    .eq("platform_user_id", platformUserId);

  if (error) {
    console.error("Error updating conversation state:", error);
    return false;
  }

  return true;
}

/**
 * Elimina el estado de conversación
 */
export async function deleteConversationState(
  supabase: SupabaseClient,
  platform: Platform,
  platformUserId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("conversation_states")
    .delete()
    .eq("platform", platform)
    .eq("platform_user_id", platformUserId);

  if (error) {
    console.error("Error deleting conversation state:", error);
    return false;
  }

  return true;
}

/**
 * Crea un nuevo estado de confirmación
 */
export function createConfirmationState(
  platform: Platform,
  platformUserId: string,
  userId: string,
  intent: Intent,
  parsedData: ParsedEntities
): ConversationStateData {
  return {
    platform,
    platformUserId,
    userId,
    state: "awaiting_confirmation",
    intent,
    parsedData,
  };
}

/**
 * Crea un estado de desambiguación
 */
export function createDisambiguationState(
  platform: Platform,
  platformUserId: string,
  userId: string,
  intent: Intent,
  parsedData: ParsedEntities,
  field: "account" | "category" | "fromAccount" | "toAccount",
  options: DisambiguationOption[]
): ConversationStateData {
  return {
    platform,
    platformUserId,
    userId,
    state: "awaiting_disambiguation",
    intent,
    parsedData,
    editField: field as EditableField,
    disambiguationOptions: options,
  };
}

/**
 * Crea un estado de edición (eligiendo qué campo editar)
 */
export function createEditFieldState(
  existingState: ConversationStateData
): ConversationStateData {
  return {
    ...existingState,
    state: "awaiting_edit_field",
    editField: undefined,
  };
}

/**
 * Crea un estado de edición de valor específico
 */
export function createEditValueState(
  existingState: ConversationStateData,
  field: EditableField
): ConversationStateData {
  return {
    ...existingState,
    state: "awaiting_edit_value",
    editField: field,
  };
}

/**
 * Crea un estado de selección de cuenta
 */
export function createAccountSelectionState(
  existingState: ConversationStateData,
  field: "account" | "from_account" | "to_account",
  options: DisambiguationOption[]
): ConversationStateData {
  return {
    ...existingState,
    state: "awaiting_account_selection",
    editField: field as EditableField,
    disambiguationOptions: options,
  };
}

/**
 * Crea un estado de selección de categoría
 */
export function createCategorySelectionState(
  existingState: ConversationStateData,
  options: DisambiguationOption[]
): ConversationStateData {
  return {
    ...existingState,
    state: "awaiting_category_selection",
    editField: "category",
    disambiguationOptions: options,
  };
}

/**
 * Verifica si hay un estado activo
 */
export function hasActiveState(state: ConversationStateData | null): boolean {
  return state !== null && new Date(state.expiresAt || 0) > new Date();
}

/**
 * Obtiene información del usuario de la plataforma
 */
export async function getPlatformUser(
  supabase: SupabaseClient,
  platform: Platform,
  platformUserId: string
): Promise<{ userId: string; verified: boolean } | null> {
  const table = platform === "telegram" ? "telegram_users" : "whatsapp_users";
  const idField = platform === "telegram" ? "telegram_id" : "phone_number";

  const { data, error } = await supabase
    .from(table)
    .select("user_id, verified")
    .eq(idField, platformUserId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.user_id,
    verified: data.verified,
  };
}

/**
 * Obtiene el contexto del usuario (cuentas, categorías, configuración)
 */
export async function getUserContext(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  accounts: Array<{
    id: string;
    name: string;
    currency: string;
    icon?: string;
    is_credit_card?: boolean;
    closing_day?: number;
    account_type?: string;
  }>;
  categories: Array<{
    id: string;
    name: string;
    type: "income" | "expense";
    icon?: string;
  }>;
  settings?: {
    defaultCurrency?: string;
    exchangeRate?: number;
  };
}> {
  // Obtener cuentas con balance calculado
  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id, name, currency, icon, is_credit_card, closing_day, account_type, initial_balance")
    .eq("user_id", userId)
    .order("name");

  if (accountsError) {
    console.error("Error fetching accounts:", accountsError);
  }

  // Obtener categorías
  const { data: categories, error: categoriesError } = await supabase
    .from("categories")
    .select("id, name, type, icon")
    .eq("user_id", userId)
    .order("name");

  if (categoriesError) {
    console.error("Error fetching categories:", categoriesError);
  }

  // Obtener configuración
  const { data: settings, error: settingsError } = await supabase
    .from("user_settings")
    .select("default_currency, exchange_rate")
    .eq("user_id", userId)
    .single();

  if (settingsError && settingsError.code !== "PGRST116") {
    console.error("Error fetching settings:", settingsError);
  }

  return {
    accounts: accounts || [],
    categories: (categories || []) as Array<{
      id: string;
      name: string;
      type: "income" | "expense";
      icon?: string;
    }>,
    settings: settings
      ? {
          defaultCurrency: settings.default_currency,
          exchangeRate: settings.exchange_rate,
        }
      : undefined,
  };
}
