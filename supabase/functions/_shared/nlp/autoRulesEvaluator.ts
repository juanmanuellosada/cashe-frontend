/**
 * Evaluador de reglas automáticas para el bot
 * Permite usar las reglas del usuario para auto-sugerir categorías y cuentas
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { ParsedEntities, Intent, UserContext } from "./types.ts";
import { getExpectedCategoryType } from "./intentClassifier.ts";

export interface AutoRuleSuggestion {
  ruleId: string;
  ruleName: string;
  categoryId?: string;
  accountId?: string;
}

/**
 * Evalúa las reglas automáticas del usuario y devuelve sugerencias
 * @param supabase Cliente de Supabase
 * @param userId ID del usuario
 * @param entities Entidades parseadas del mensaje
 * @param intent Intent clasificado
 * @returns Sugerencia de categoría y/o cuenta, o null si no matchea ninguna regla
 */
export async function evaluateAutoRules(
  supabase: SupabaseClient,
  userId: string,
  entities: ParsedEntities,
  intent: Intent
): Promise<AutoRuleSuggestion | null> {
  // Solo evaluar reglas para intents de escritura
  const writeIntents = ["REGISTRAR_GASTO", "REGISTRAR_INGRESO"];
  if (!writeIntents.includes(intent)) {
    return null;
  }

  // Obtener reglas activas ordenadas por prioridad
  const { data: rules, error } = await supabase
    .from("auto_rules")
    .select(`
      *,
      conditions:auto_rule_conditions(*),
      actions:auto_rule_actions(*)
    `)
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("priority", { ascending: false });

  if (error) {
    console.error("[AutoRules] Error fetching rules:", error);
    return null;
  }

  if (!rules || rules.length === 0) {
    console.log("[AutoRules] No active rules found");
    return null;
  }

  // Determinar el tipo de movimiento
  const type = intent === "REGISTRAR_GASTO" ? "expense" : "income";

  // Construir contexto para evaluación
  // Usar originalMessage para evaluar las reglas (aunque la nota esté vacía)
  // Esto permite que las reglas funcionen sin llenar la nota del movimiento
  const note = entities.originalMessage || entities.note || "";
  const amount = entities.amount || 0;
  const accountId = entities.accountId || "";

  console.log(`[AutoRules] Evaluating ${rules.length} rules with context:`, {
    note: note.substring(0, 50) + (note.length > 50 ? '...' : ''),
    amount,
    accountId,
    type,
  });

  // Helper para evaluar una condición individual
  const evaluateCondition = (condition: any): boolean => {
    const { field, operator, value } = condition;

    switch (field) {
      case "note": {
        const noteLC = note.toLowerCase();
        const valueLC = value.toLowerCase();

        let result = false;
        switch (operator) {
          case "contains":
            result = noteLC.includes(valueLC);
            break;
          case "equals":
            result = noteLC === valueLC;
            break;
          case "starts_with":
            result = noteLC.startsWith(valueLC);
            break;
          case "ends_with":
            result = noteLC.endsWith(valueLC);
            break;
          default:
            result = false;
        }

        // Log detallado para debug
        console.log(`[AutoRules] Condition check: note "${noteLC}" ${operator} "${valueLC}" = ${result}`);
        return result;
      }

      case "amount": {
        const numAmount = amount;
        const numValue = parseFloat(value) || 0;

        switch (operator) {
          case "equals":
            return numAmount === numValue;
          case "greater_than":
            return numAmount > numValue;
          case "less_than":
            return numAmount < numValue;
          case "between": {
            // value format: "min|max"
            const [min, max] = value.split("|").map(Number);
            return numAmount >= min && numAmount <= max;
          }
          default:
            return false;
        }
      }

      case "account_id":
        return accountId === value;

      case "type":
        return type === value;

      default:
        return false;
    }
  };

  // Buscar la primera regla que matchea
  for (const rule of rules) {
    if (!rule.conditions || rule.conditions.length === 0) continue;

    console.log(`[AutoRules] Evaluating rule: ${rule.name} (priority: ${rule.priority}, logic: ${rule.logic_operator})`);

    const conditionResults = rule.conditions.map(evaluateCondition);
    const logicOp = rule.logic_operator || "AND";

    const ruleMatches =
      logicOp === "AND"
        ? conditionResults.every(Boolean)
        : conditionResults.some(Boolean);

    console.log(`[AutoRules] Rule "${rule.name}" result: ${ruleMatches} (conditions: ${conditionResults.join(', ')})`);

    if (ruleMatches) {
      console.log(`[AutoRules] ✅ Rule matched: ${rule.name}`);

      // Construir objeto de sugerencias
      const suggestion: AutoRuleSuggestion = {
        ruleId: rule.id,
        ruleName: rule.name,
      };

      for (const action of rule.actions || []) {
        if (action.field === "category_id") {
          suggestion.categoryId = action.value;
        } else if (action.field === "account_id") {
          suggestion.accountId = action.value;
        }
      }

      return suggestion;
    }
  }

  console.log("[AutoRules] No rules matched");
  return null;
}
