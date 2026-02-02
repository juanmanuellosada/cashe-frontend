/**
 * Clasificador de intents basado en regex
 * Primera capa del sistema NLP híbrido
 */

import {
  INTENT_PATTERNS,
  normalizeText,
  shouldIgnoreMessage,
} from "../constants/patterns.ts";
import type { Intent, IntentClassification } from "./types.ts";

/**
 * Clasifica el intent de un mensaje usando patrones regex
 * @param text Texto del mensaje del usuario
 * @returns Clasificación con intent, confianza y patrón que matcheó
 */
export function classifyIntent(text: string): IntentClassification {
  const normalized = normalizeText(text);

  // Si es un mensaje ignorable (saludo, gracias, etc.), devolver AYUDA con baja confianza
  if (shouldIgnoreMessage(text)) {
    return {
      intent: "AYUDA",
      confidence: 0.3,
      matchedPattern: "greeting/ignored",
    };
  }

  // Scores por intent
  const scores: Record<Intent, { score: number; pattern?: string }> = {
    REGISTRAR_GASTO: { score: 0 },
    REGISTRAR_INGRESO: { score: 0 },
    REGISTRAR_TRANSFERENCIA: { score: 0 },
    PAGAR_TARJETA: { score: 0 },
    AGREGAR_SELLOS: { score: 0 },
    CONSULTAR_SALDO: { score: 0 },
    CONSULTAR_GASTOS: { score: 0 },
    CONSULTAR_INGRESOS: { score: 0 },
    ULTIMOS_MOVIMIENTOS: { score: 0 },
    RESUMEN_MES: { score: 0 },
    CONSULTAR_RESUMEN_TARJETA: { score: 0 },
    CONSULTAR_PRESUPUESTOS: { score: 0 },
    MENU: { score: 0 },
    CANCELAR: { score: 0 },
    AYUDA: { score: 0 },
    DESCONOCIDO: { score: 0 },
  };

  // Evaluar cada intent
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        // Score base por match
        let score = 0.7;

        // Bonus por match más largo (más específico)
        if (match[0].length > 10) score += 0.1;
        if (match[0].length > 20) score += 0.1;

        // Actualizar score si es mayor
        if (score > scores[intent as Intent].score) {
          scores[intent as Intent] = {
            score,
            pattern: pattern.toString(),
          };
        }
      }
    }
  }

  // Aplicar heurísticas adicionales

  // Si tiene palabras de transferencia Y origen/destino, priorizar transferencia
  if (scores.REGISTRAR_TRANSFERENCIA.score > 0) {
    const hasDirection =
      /\b(de|desde)\b.*\b(a|hacia)\b/i.test(normalized) ||
      /\b(a|hacia)\b.*\b(de|desde)\b/i.test(normalized);
    if (hasDirection) {
      scores.REGISTRAR_TRANSFERENCIA.score += 0.2;
    }
  }

  // Si pregunta "cuánto" + gasto, priorizar consulta sobre registro
  if (/cu[aá]nto\s+(gast[eé]|llevo)/i.test(normalized)) {
    scores.CONSULTAR_GASTOS.score += 0.2;
    scores.REGISTRAR_GASTO.score -= 0.3;
  }

  // Si pregunta "cuánto" + cobré/ingresé, priorizar consulta de ingresos
  if (/cu[aá]nto\s+(cobr[eé]|ingres[eé]|entr[oó])/i.test(normalized)) {
    scores.CONSULTAR_INGRESOS.score += 0.2;
    scores.REGISTRAR_INGRESO.score -= 0.3;
  }

  // Si tiene "?" es más probable que sea consulta
  if (text.includes("?")) {
    scores.CONSULTAR_SALDO.score += 0.1;
    scores.CONSULTAR_GASTOS.score += 0.1;
    scores.CONSULTAR_INGRESOS.score += 0.1;
    scores.ULTIMOS_MOVIMIENTOS.score += 0.1;
    scores.RESUMEN_MES.score += 0.1;
    scores.CONSULTAR_RESUMEN_TARJETA.score += 0.1;
  }

  // Priorizar PAGAR_TARJETA si tiene "pagar" + nombre de tarjeta
  if (/\bpagar\b.*\b(visa|master|amex|cabal|naranja|nativa|tarjeta)\b/i.test(normalized) ||
      /\b(visa|master|amex|cabal|naranja|nativa|tarjeta)\b.*\bpagar\b/i.test(normalized)) {
    scores.PAGAR_TARJETA.score += 0.3;
  }

  // Priorizar AGREGAR_SELLOS si tiene "sellos" o "impuesto de sellos"
  if (/\b(sellos?|impuesto\s+de\s+sellos?)\b/i.test(normalized)) {
    scores.AGREGAR_SELLOS.score += 0.3;
  }

  // Priorizar CONSULTAR_RESUMEN_TARJETA si pide "resumen" + tarjeta pero no "pagar"
  if (/\bresumen\b.*\b(visa|master|amex|cabal|naranja|nativa|tarjeta)\b/i.test(normalized) &&
      !/\bpagar\b/i.test(normalized)) {
    scores.CONSULTAR_RESUMEN_TARJETA.score += 0.3;
  }

  // Priorizar MENU si es exactamente "menu" o "menú"
  if (/^men[uú]$/i.test(text.trim())) {
    scores.MENU.score = 1.0;
  }

  // Priorizar CANCELAR si es exactamente "cancelar"
  if (/^cancelar$/i.test(text.trim())) {
    scores.CANCELAR.score = 1.0;
  }

  // Encontrar el intent con mayor score
  let bestIntent: Intent = "DESCONOCIDO";
  let bestScore = 0;
  let bestPattern: string | undefined;

  for (const [intent, data] of Object.entries(scores)) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestIntent = intent as Intent;
      bestPattern = data.pattern;
    }
  }

  // Si ningún intent tiene score significativo, es desconocido
  if (bestScore < 0.4) {
    return {
      intent: "DESCONOCIDO",
      confidence: bestScore,
      matchedPattern: bestPattern,
    };
  }

  return {
    intent: bestIntent,
    confidence: Math.min(bestScore, 1), // Cap at 1.0
    matchedPattern: bestPattern,
  };
}

/**
 * Verifica si un intent es de escritura (requiere confirmación)
 */
export function isWriteIntent(intent: Intent): boolean {
  return [
    "REGISTRAR_GASTO",
    "REGISTRAR_INGRESO",
    "REGISTRAR_TRANSFERENCIA",
    "PAGAR_TARJETA",
    "AGREGAR_SELLOS",
  ].includes(intent);
}

/**
 * Verifica si un intent es de lectura (no requiere confirmación)
 */
export function isReadIntent(intent: Intent): boolean {
  return [
    "CONSULTAR_SALDO",
    "CONSULTAR_GASTOS",
    "CONSULTAR_INGRESOS",
    "ULTIMOS_MOVIMIENTOS",
    "RESUMEN_MES",
    "CONSULTAR_RESUMEN_TARJETA",
    "CONSULTAR_PRESUPUESTOS",
    "MENU",
    "AYUDA",
  ].includes(intent);
}

/**
 * Verifica si un intent es de navegación (menú, cancelar)
 */
export function isNavigationIntent(intent: Intent): boolean {
  return ["MENU", "CANCELAR"].includes(intent);
}

/**
 * Devuelve el tipo de movimiento para un intent de registro
 */
export function getMovementType(
  intent: Intent
): "income" | "expense" | "transfer" | null {
  switch (intent) {
    case "REGISTRAR_GASTO":
      return "expense";
    case "REGISTRAR_INGRESO":
      return "income";
    case "REGISTRAR_TRANSFERENCIA":
      return "transfer";
    default:
      return null;
  }
}

/**
 * Devuelve el tipo de categoría esperado para un intent
 */
export function getExpectedCategoryType(
  intent: Intent
): "income" | "expense" | null {
  switch (intent) {
    case "REGISTRAR_GASTO":
      return "expense";
    case "REGISTRAR_INGRESO":
      return "income";
    default:
      return null;
  }
}
