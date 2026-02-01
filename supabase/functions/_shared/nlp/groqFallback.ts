/**
 * Fallback a Groq API para mensajes complejos
 * Solo se usa cuando el regex no puede clasificar con confianza suficiente
 */

import type {
  Intent,
  ParsedEntities,
  GroqRequest,
  GroqResponse,
  UserContext,
} from "./types.ts";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

/**
 * System prompt para Groq
 */
const SYSTEM_PROMPT = `Sos un asistente de finanzas personales argentino.
Tu trabajo es parsear mensajes en español argentino y extraer información estructurada.

Respondé SOLO con JSON válido, sin texto adicional ni explicaciones.

Formato de respuesta:
{
  "intent": "REGISTRAR_GASTO|REGISTRAR_INGRESO|REGISTRAR_TRANSFERENCIA|CONSULTAR_SALDO|CONSULTAR_GASTOS|ULTIMOS_MOVIMIENTOS|RESUMEN_MES|CONSULTAR_PRESUPUESTOS|AYUDA|DESCONOCIDO",
  "entities": {
    "monto": number|null,
    "categoria": string|null,
    "cuenta": string|null,
    "cuenta_origen": string|null,
    "cuenta_destino": string|null,
    "nota": string|null,
    "fecha": "YYYY-MM-DD"|null,
    "cuotas": number|null
  },
  "confidence": 0.0-1.0
}

Consideraciones argentinas:
- Montos: "50k" = 50000, "150 lucas" = 150000, "2 palos" = 2000000
- Cuentas: "mp" = mercadopago, "bru" = brubank, "gal" = galicia
- Categorías: "morfi" = comida, "bondi" = transporte
- Fechas: "ayer", "este mes", "enero", etc.
- Si no estás seguro del intent, usá "DESCONOCIDO" con baja confianza

Ejemplos:
- "gasté 500 en comida" → intent: REGISTRAR_GASTO, monto: 500, categoria: "comida"
- "cobré 50k" → intent: REGISTRAR_INGRESO, monto: 50000
- "de galicia a mp 10000" → intent: REGISTRAR_TRANSFERENCIA, cuenta_origen: "galicia", cuenta_destino: "mercadopago", monto: 10000
- "saldo" → intent: CONSULTAR_SALDO
- "cuánto gasté en comida" → intent: CONSULTAR_GASTOS, categoria: "comida"`;

/**
 * Llama a Groq API para parsear un mensaje
 */
export async function parseWithGroq(
  text: string,
  context?: UserContext
): Promise<{
  intent: Intent;
  entities: ParsedEntities;
  confidence: number;
} | null> {
  const groqApiKey = Deno.env.get("GROQ_API_KEY");

  if (!groqApiKey) {
    console.warn("GROQ_API_KEY not configured, skipping fallback");
    return null;
  }

  try {
    // Construir contexto adicional si está disponible
    let contextInfo = "";
    if (context) {
      const accountNames = context.accounts.map((a) => a.name).join(", ");
      const categoryNames = context.categories.map((c) => c.name).join(", ");
      contextInfo = `\n\nCuentas del usuario: ${accountNames}\nCategorías del usuario: ${categoryNames}`;
    }

    const request: GroqRequest = {
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT + contextInfo,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.1, // Bajo para respuestas más consistentes
      max_tokens: 500,
    };

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq API error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("Groq returned empty content");
      return null;
    }

    // Parsear la respuesta JSON
    const parsed = parseGroqResponse(content);
    return parsed;
  } catch (error) {
    console.error("Error calling Groq API:", error);
    return null;
  }
}

/**
 * Parsea la respuesta de Groq
 */
function parseGroqResponse(content: string): {
  intent: Intent;
  entities: ParsedEntities;
  confidence: number;
} | null {
  try {
    // Intentar extraer JSON del contenido (por si viene con texto extra)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in Groq response:", content);
      return null;
    }

    const json: GroqResponse = JSON.parse(jsonMatch[0]);

    // Validar intent
    const validIntents: Intent[] = [
      "REGISTRAR_GASTO",
      "REGISTRAR_INGRESO",
      "REGISTRAR_TRANSFERENCIA",
      "CONSULTAR_SALDO",
      "CONSULTAR_GASTOS",
      "ULTIMOS_MOVIMIENTOS",
      "RESUMEN_MES",
      "CONSULTAR_PRESUPUESTOS",
      "AYUDA",
      "DESCONOCIDO",
    ];

    const intent = validIntents.includes(json.intent as Intent)
      ? (json.intent as Intent)
      : "DESCONOCIDO";

    // Mapear entidades
    const entities: ParsedEntities = {};

    if (json.entities) {
      if (json.entities.monto && typeof json.entities.monto === "number") {
        entities.amount = json.entities.monto;
      }
      if (json.entities.categoria) {
        entities.category = json.entities.categoria;
      }
      if (json.entities.cuenta) {
        entities.account = json.entities.cuenta;
      }
      if (json.entities.cuenta_origen) {
        entities.fromAccount = json.entities.cuenta_origen;
      }
      if (json.entities.cuenta_destino) {
        entities.toAccount = json.entities.cuenta_destino;
      }
      if (json.entities.nota) {
        entities.note = json.entities.nota;
      }
      if (json.entities.fecha) {
        // Validar formato de fecha
        if (/^\d{4}-\d{2}-\d{2}$/.test(json.entities.fecha)) {
          entities.date = json.entities.fecha;
        }
      }
      if (json.entities.cuotas && typeof json.entities.cuotas === "number") {
        entities.installments = json.entities.cuotas;
      }
    }

    return {
      intent,
      entities,
      confidence: typeof json.confidence === "number" ? json.confidence : 0.5,
    };
  } catch (error) {
    console.error("Error parsing Groq response:", error, "Content:", content);
    return null;
  }
}

/**
 * Determina si se debe usar el fallback de Groq
 * Basado en la confianza del clasificador regex
 */
export function shouldUseGroqFallback(
  regexConfidence: number,
  intent: Intent
): boolean {
  // Si el regex tiene alta confianza, no usar Groq
  if (regexConfidence >= 0.7) {
    return false;
  }

  // Si es un intent desconocido con confianza baja, usar Groq
  if (intent === "DESCONOCIDO" && regexConfidence < 0.4) {
    return true;
  }

  // Si la confianza es muy baja, usar Groq
  if (regexConfidence < 0.5) {
    return true;
  }

  return false;
}

/**
 * Combina resultados de regex y Groq
 * Prioriza regex si tiene buena confianza
 */
export function mergeResults(
  regexResult: {
    intent: Intent;
    confidence: number;
    entities: ParsedEntities;
  },
  groqResult: {
    intent: Intent;
    confidence: number;
    entities: ParsedEntities;
  } | null
): {
  intent: Intent;
  confidence: number;
  entities: ParsedEntities;
  source: "regex" | "groq" | "hybrid";
} {
  // Si no hay resultado de Groq, usar regex
  if (!groqResult) {
    return {
      ...regexResult,
      source: "regex",
    };
  }

  // Si regex tiene alta confianza, priorizar
  if (regexResult.confidence >= 0.7) {
    // Pero tomar entidades de Groq si regex no las tiene
    const mergedEntities = {
      ...groqResult.entities,
      ...regexResult.entities, // regex tiene prioridad
    };

    return {
      intent: regexResult.intent,
      confidence: regexResult.confidence,
      entities: mergedEntities,
      source: "hybrid",
    };
  }

  // Si Groq tiene mejor confianza
  if (groqResult.confidence > regexResult.confidence) {
    // Combinar entidades, priorizando Groq para este caso
    const mergedEntities = {
      ...regexResult.entities,
      ...groqResult.entities,
    };

    return {
      intent: groqResult.intent,
      confidence: groqResult.confidence,
      entities: mergedEntities,
      source: "groq",
    };
  }

  // Caso por defecto: usar regex con entidades combinadas
  return {
    intent: regexResult.intent,
    confidence: Math.max(regexResult.confidence, groqResult.confidence),
    entities: {
      ...groqResult.entities,
      ...regexResult.entities,
    },
    source: "hybrid",
  };
}
