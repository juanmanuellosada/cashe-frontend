/**
 * Sistema NLP Híbrido para Bots de Telegram y WhatsApp
 *
 * Flujo:
 * 1. Verificar si hay estado de conversación pendiente
 * 2. Si hay estado, procesar según el estado actual
 * 3. Si no hay estado, parsear mensaje (regex + fuzzy + groq fallback)
 * 4. Para intents de escritura, solicitar confirmación
 * 5. Para intents de lectura, ejecutar directamente
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { RESPONSES } from "../constants/responses.ts";
import { normalizeText } from "../constants/patterns.ts";
import { classifyIntent, isWriteIntent, getExpectedCategoryType } from "./intentClassifier.ts";
import { extractEntities, extractAmount, extractDate } from "./entityExtractor.ts";
import { resolveEntities, findAccount, findCategory, getDefaultAccount } from "./fuzzyMatcher.ts";
import {
  getConversationState,
  saveConversationState,
  deleteConversationState,
  updateConversationState,
  getPlatformUser,
  getUserContext,
  createConfirmationState,
  createDisambiguationState,
  createEditFieldState,
  createEditValueState,
} from "./stateManager.ts";
import {
  buildConfirmationMessage,
  buildEditFieldMessage,
  buildEditValueMessage,
  buildDisambiguationMessage,
  buildMissingFieldMessage,
  processConfirmationResponse,
  processEditFieldSelection,
  processListSelection,
  updateEntityValue,
  getMissingRequiredFields,
} from "./confirmationFlow.ts";
import { parseWithGroq, shouldUseGroqFallback, mergeResults } from "./groqFallback.ts";
import { executeWriteAction, executeReadAction } from "./commandExecutor.ts";
import type {
  Platform,
  Intent,
  ParsedEntities,
  ProcessMessageResult,
  ConversationStateData,
  UserContext,
  DisambiguationOption,
  EditableField,
} from "./types.ts";

export * from "./types.ts";

/**
 * Procesa un mensaje de usuario
 * Esta es la función principal que deben llamar los webhooks
 */
export async function processNLPMessage(
  supabase: SupabaseClient,
  platform: Platform,
  platformUserId: string,
  messageText: string
): Promise<ProcessMessageResult> {
  try {
    // 1. Verificar que el usuario esté vinculado
    const platformUser = await getPlatformUser(supabase, platform, platformUserId);

    if (!platformUser || !platformUser.verified) {
      return {
        success: false,
        response:
          platform === "telegram"
            ? RESPONSES.NO_VINCULADO_TELEGRAM
            : RESPONSES.NO_VINCULADO_WHATSAPP,
      };
    }

    const userId = platformUser.userId;

    // 2. Obtener contexto del usuario (cuentas, categorías)
    const context = await getUserContext(supabase, userId);

    // 3. Verificar si hay estado de conversación pendiente
    const currentState = await getConversationState(supabase, platform, platformUserId);

    if (currentState) {
      // Procesar según el estado actual
      return await processStatefulMessage(
        supabase,
        platform,
        platformUserId,
        userId,
        messageText,
        currentState,
        context
      );
    }

    // 4. No hay estado pendiente - parsear el mensaje
    return await processNewMessage(
      supabase,
      platform,
      platformUserId,
      userId,
      messageText,
      context
    );
  } catch (error) {
    console.error("Error processing NLP message:", error);
    return {
      success: false,
      response: RESPONSES.ERROR_GENERICO,
    };
  }
}

/**
 * Procesa un mensaje cuando hay estado de conversación pendiente
 */
async function processStatefulMessage(
  supabase: SupabaseClient,
  platform: Platform,
  platformUserId: string,
  userId: string,
  text: string,
  state: ConversationStateData,
  context: UserContext
): Promise<ProcessMessageResult> {
  const normalized = normalizeText(text);

  // Verificar cancelación/reset en cualquier estado
  const resetPattern = /^(cancel(?:ar)?|salir|x|0|reiniciar|reset(?:ear)?|volver|atr[aá]s|back|empezar|comenzar|inicio|nuevo|nueva|limpiar|clear|stop|parar|detener|no|nada|olvida(?:te|lo)?|dej[aá])$/i;
  if (resetPattern.test(normalized)) {
    await deleteConversationState(supabase, platform, platformUserId);
    return {
      success: true,
      response: "❌ Conversación reiniciada. Escribí lo que necesites.",
      shouldClearState: true,
    };
  }

  switch (state.state) {
    case "awaiting_confirmation":
      return await handleConfirmationResponse(
        supabase,
        platform,
        platformUserId,
        userId,
        text,
        state,
        context
      );

    case "awaiting_edit_field":
      return await handleEditFieldSelection(
        supabase,
        platform,
        platformUserId,
        userId,
        text,
        state,
        context
      );

    case "awaiting_edit_value":
      return await handleEditValueInput(
        supabase,
        platform,
        platformUserId,
        userId,
        text,
        state,
        context
      );

    case "awaiting_disambiguation":
    case "awaiting_account_selection":
    case "awaiting_category_selection":
      return await handleListSelection(
        supabase,
        platform,
        platformUserId,
        userId,
        text,
        state,
        context
      );

    default:
      // Estado desconocido - limpiar y procesar como nuevo
      await deleteConversationState(supabase, platform, platformUserId);
      return await processNewMessage(
        supabase,
        platform,
        platformUserId,
        userId,
        text,
        context
      );
  }
}

/**
 * Procesa la respuesta de confirmación (sí/no/editar)
 */
async function handleConfirmationResponse(
  supabase: SupabaseClient,
  platform: Platform,
  platformUserId: string,
  userId: string,
  text: string,
  state: ConversationStateData,
  context: UserContext
): Promise<ProcessMessageResult> {
  const response = processConfirmationResponse(text);

  if (response === "yes") {
    // Ejecutar la acción
    const result = await executeWriteAction(
      supabase,
      userId,
      state.intent,
      state.parsedData,
      context
    );

    await deleteConversationState(supabase, platform, platformUserId);

    return {
      success: result.success,
      response: result.message,
      shouldClearState: true,
    };
  }

  if (response === "no") {
    await deleteConversationState(supabase, platform, platformUserId);
    return {
      success: true,
      response: RESPONSES.CANCELADO,
      shouldClearState: true,
    };
  }

  if (response === "edit") {
    // Cambiar a estado de edición
    const editState = createEditFieldState(state);
    await saveConversationState(supabase, editState);

    const { message, buttons } = buildEditFieldMessage(
      state.intent,
      state.parsedData,
      context
    );

    return {
      success: true,
      response: message,
      buttons,
      newState: editState,
    };
  }

  // Respuesta no reconocida
  return {
    success: false,
    response: `${RESPONSES.NO_ENTENDI}\n\n${RESPONSES.CONFIRMAR_OPCIONES}`,
  };
}

/**
 * Procesa la selección de campo a editar
 */
async function handleEditFieldSelection(
  supabase: SupabaseClient,
  platform: Platform,
  platformUserId: string,
  userId: string,
  text: string,
  state: ConversationStateData,
  context: UserContext
): Promise<ProcessMessageResult> {
  const field = processEditFieldSelection(text, state.intent);

  if (!field) {
    const { message, buttons } = buildEditFieldMessage(
      state.intent,
      state.parsedData,
      context
    );
    return {
      success: false,
      response: `${RESPONSES.NO_ENTENDI}\n\n${message}`,
      buttons,
    };
  }

  // Cambiar a estado de edición de valor
  const categoryType = getExpectedCategoryType(state.intent);
  const { message, buttons, options } = buildEditValueMessage(
    field,
    context,
    categoryType || undefined
  );

  const newState: ConversationStateData = {
    ...state,
    state:
      field === "category"
        ? "awaiting_category_selection"
        : field === "account" || field === "from_account" || field === "to_account"
          ? "awaiting_account_selection"
          : "awaiting_edit_value",
    editField: field,
    disambiguationOptions: options,
  };

  await saveConversationState(supabase, newState);

  return {
    success: true,
    response: message,
    buttons,
    newState,
  };
}

/**
 * Procesa el input de un valor a editar
 */
async function handleEditValueInput(
  supabase: SupabaseClient,
  platform: Platform,
  platformUserId: string,
  userId: string,
  text: string,
  state: ConversationStateData,
  context: UserContext
): Promise<ProcessMessageResult> {
  const field = state.editField;

  if (!field) {
    // Error - no hay campo definido
    await deleteConversationState(supabase, platform, platformUserId);
    return {
      success: false,
      response: RESPONSES.ERROR_GENERICO,
      shouldClearState: true,
    };
  }

  let updatedEntities = { ...state.parsedData };

  switch (field) {
    case "amount": {
      const amount = extractAmount(text);
      if (!amount) {
        return {
          success: false,
          response: RESPONSES.ERROR_MONTO_INVALIDO,
        };
      }
      updatedEntities = updateEntityValue(updatedEntities, field, amount.value);
      if (amount.currency) {
        updatedEntities.currency = amount.currency;
      }
      break;
    }

    case "date": {
      const date = extractDate(text);
      if (!date) {
        return {
          success: false,
          response: RESPONSES.ERROR_FECHA_INVALIDA,
        };
      }
      updatedEntities = updateEntityValue(updatedEntities, field, date);
      break;
    }

    case "note": {
      updatedEntities = updateEntityValue(updatedEntities, field, text.trim());
      break;
    }

    default:
      return {
        success: false,
        response: RESPONSES.NO_ENTENDI,
      };
  }

  // Volver a confirmación
  const confirmState = createConfirmationState(
    platform,
    platformUserId,
    userId,
    state.intent,
    updatedEntities
  );
  await saveConversationState(supabase, confirmState);

  const { message, buttons } = buildConfirmationMessage(
    state.intent,
    updatedEntities,
    context
  );

  return {
    success: true,
    response: message,
    buttons,
    newState: confirmState,
  };
}

/**
 * Procesa la selección de una lista (cuentas, categorías, desambiguación)
 */
async function handleListSelection(
  supabase: SupabaseClient,
  platform: Platform,
  platformUserId: string,
  userId: string,
  text: string,
  state: ConversationStateData,
  context: UserContext
): Promise<ProcessMessageResult> {
  const options = state.disambiguationOptions || [];
  const selected = processListSelection(text, options);

  if (!selected) {
    const { message, buttons } = buildDisambiguationMessage(
      (state.editField as "account" | "category" | "fromAccount" | "toAccount") || "account",
      options
    );
    return {
      success: false,
      response: `${RESPONSES.NO_ENTENDI}\n\n${message}`,
      buttons,
    };
  }

  // Actualizar entidad con la selección
  const field = state.editField || "account";
  const updatedEntities = updateEntityValue(state.parsedData, field as EditableField, selected);

  // Volver a confirmación
  const confirmState = createConfirmationState(
    platform,
    platformUserId,
    userId,
    state.intent,
    updatedEntities
  );
  await saveConversationState(supabase, confirmState);

  const { message, buttons } = buildConfirmationMessage(
    state.intent,
    updatedEntities,
    context
  );

  return {
    success: true,
    response: message,
    buttons,
    newState: confirmState,
  };
}

/**
 * Procesa un mensaje nuevo (sin estado pendiente)
 */
async function processNewMessage(
  supabase: SupabaseClient,
  platform: Platform,
  platformUserId: string,
  userId: string,
  text: string,
  context: UserContext
): Promise<ProcessMessageResult> {
  // 1. Clasificar intent con regex
  const intentResult = classifyIntent(text);
  console.log(`[NLP] Intent classification: ${intentResult.intent} (confidence: ${intentResult.confidence}, pattern: ${intentResult.matchedPattern})`);

  // 2. Extraer entidades con regex
  let entities = extractEntities(text, intentResult.intent);
  console.log(`[NLP] Extracted entities:`, JSON.stringify(entities));

  // 3. Si la confianza es baja, usar Groq como fallback
  let finalIntent = intentResult.intent;
  let finalConfidence = intentResult.confidence;
  let source: "regex" | "groq" | "hybrid" = "regex";

  if (shouldUseGroqFallback(intentResult.confidence, intentResult.intent)) {
    const groqResult = await parseWithGroq(text, context);

    if (groqResult) {
      const merged = mergeResults(
        { intent: intentResult.intent, confidence: intentResult.confidence, entities },
        groqResult
      );
      finalIntent = merged.intent;
      finalConfidence = merged.confidence;
      entities = merged.entities;
      source = merged.source;
    }
  }

  // 4. Si sigue siendo desconocido, mostrar ayuda
  if (finalIntent === "DESCONOCIDO" || finalConfidence < 0.4) {
    return {
      success: false,
      response: RESPONSES.NO_ENTENDI,
    };
  }

  // 5. Si es un intent de ayuda, responder directamente
  if (finalIntent === "AYUDA") {
    return {
      success: true,
      response: RESPONSES.HELP,
    };
  }

  // 6. Resolver entidades con fuzzy matching
  const { resolved, needsDisambiguation, disambiguationField, disambiguationOptions } =
    resolveEntities(entities, context, finalIntent);
  console.log(`[NLP] Resolved entities:`, JSON.stringify(resolved));
  console.log(`[NLP] Needs disambiguation: ${needsDisambiguation}, field: ${disambiguationField}`);

  // 7. Si necesita desambiguación, solicitar
  if (needsDisambiguation && disambiguationOptions && disambiguationField) {
    const state = createDisambiguationState(
      platform,
      platformUserId,
      userId,
      finalIntent,
      resolved,
      disambiguationField,
      disambiguationOptions
    );
    await saveConversationState(supabase, state);

    const { message, buttons } = buildDisambiguationMessage(
      disambiguationField,
      disambiguationOptions
    );

    return {
      success: true,
      response: message,
      buttons,
      newState: state,
    };
  }

  // 8. Si es un intent de escritura, requerir confirmación
  if (isWriteIntent(finalIntent)) {
    // Verificar campos requeridos
    const missing = getMissingRequiredFields(finalIntent, resolved);

    // Solo usar cuenta por defecto si el usuario tiene UNA SOLA cuenta
    if (missing.includes("account") && context.accounts.length === 1) {
      const singleAccount = context.accounts[0];
      resolved.accountId = singleAccount.id;
      resolved.account = singleAccount.name;
      const idx = missing.indexOf("account");
      if (idx > -1) missing.splice(idx, 1);
    }

    // Solo usar categoría por defecto si el usuario tiene UNA SOLA categoría del tipo correcto
    if (missing.includes("category")) {
      const categoryType = getExpectedCategoryType(finalIntent);
      const matchingCategories = categoryType
        ? context.categories.filter(c => c.type === categoryType)
        : context.categories;

      if (matchingCategories.length === 1) {
        resolved.categoryId = matchingCategories[0].id;
        resolved.category = matchingCategories[0].name;
        const idx = missing.indexOf("category");
        if (idx > -1) missing.splice(idx, 1);
      }
    }

    // Para transferencias: solo usar cuenta por defecto si hay UNA SOLA
    if (missing.includes("from_account") && context.accounts.length === 1) {
      resolved.fromAccountId = context.accounts[0].id;
      resolved.fromAccount = context.accounts[0].name;
      const idx = missing.indexOf("from_account");
      if (idx > -1) missing.splice(idx, 1);
    }
    if (missing.includes("to_account") && context.accounts.length === 1) {
      resolved.toAccountId = context.accounts[0].id;
      resolved.toAccount = context.accounts[0].name;
      const idx = missing.indexOf("to_account");
      if (idx > -1) missing.splice(idx, 1);
    }

    // Si faltan campos, PREGUNTAR al usuario
    if (missing.length > 0) {
      const field = missing[0];
      const categoryType = getExpectedCategoryType(finalIntent);
      const { message, buttons, options } = buildMissingFieldMessage(
        field,
        context,
        categoryType || undefined
      );

      const state: ConversationStateData = {
        platform,
        platformUserId,
        userId,
        state:
          field === "amount"
            ? "awaiting_edit_value"
            : field === "category"
              ? "awaiting_category_selection"
              : "awaiting_account_selection",
        intent: finalIntent,
        parsedData: resolved,
        editField: field as EditableField,
        disambiguationOptions: options,
      };

      await saveConversationState(supabase, state);

      return {
        success: true,
        response: message,
        buttons,
        newState: state,
      };
    }

    // Si no hay fecha, usar hoy
    if (!resolved.date) {
      resolved.date = new Date().toISOString().split("T")[0];
    }

    // Crear estado de confirmación
    const state = createConfirmationState(
      platform,
      platformUserId,
      userId,
      finalIntent,
      resolved
    );
    await saveConversationState(supabase, state);

    const { message, buttons } = buildConfirmationMessage(finalIntent, resolved, context);

    return {
      success: true,
      response: message,
      buttons,
      newState: state,
    };
  }

  // 9. Si es un intent de lectura, ejecutar directamente
  const result = await executeReadAction(supabase, userId, finalIntent, resolved, context);

  return {
    success: result.success,
    response: result.message,
  };
}

/**
 * Procesa un callback de botón (para Telegram)
 */
export async function processCallbackQuery(
  supabase: SupabaseClient,
  platform: Platform,
  platformUserId: string,
  callbackData: string
): Promise<ProcessMessageResult> {
  // Mapear callback a texto equivalente
  const callbackMap: Record<string, string> = {
    confirm_yes: "sí",
    confirm_edit: "editar",
    confirm_cancel: "cancelar",
  };

  // Callbacks de edición de campo
  if (callbackData.startsWith("edit_")) {
    const field = callbackData.replace("edit_", "");
    return await processNLPMessage(supabase, platform, platformUserId, field);
  }

  // Callbacks de selección de cuenta
  if (callbackData.startsWith("acc_")) {
    const accountId = callbackData.replace("acc_", "");
    return await processNLPMessage(supabase, platform, platformUserId, accountId);
  }

  // Callbacks de selección de categoría
  if (callbackData.startsWith("cat_")) {
    const categoryId = callbackData.replace("cat_", "");
    return await processNLPMessage(supabase, platform, platformUserId, categoryId);
  }

  // Callbacks de selección general
  if (callbackData.startsWith("sel_")) {
    const id = callbackData.replace("sel_", "");
    return await processNLPMessage(supabase, platform, platformUserId, id);
  }

  // Callbacks mapeados
  if (callbackMap[callbackData]) {
    return await processNLPMessage(supabase, platform, platformUserId, callbackMap[callbackData]);
  }

  // Callback desconocido
  return {
    success: false,
    response: RESPONSES.NO_ENTENDI,
  };
}

// Re-exportar funciones útiles
export { getPlatformUser, getUserContext, deleteConversationState };
