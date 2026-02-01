// Test script para verificar el clasificador de intent

// Copiar la función normalizeText
const NORMALIZE_PATTERN = /[\u0300-\u036f]/g;

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(NORMALIZE_PATTERN, "")
    .replace(/,(?!\d)/g, " ")
    .replace(/(?<!\d),/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Patrones de intent
const INTENT_PATTERNS = {
  REGISTRAR_GASTO: [
    /\b(gast[eéoó]|pagu[eé]|compr[eé]|gasto\s+de|me\s+cobr[oóa]|debit[eéoó]|abon[eé]|puse)\b/i,
    /\b(sal[ií]|salieron?|fueron?)\s+(\$|u\$s?|usd?)?\s*[\d.,]+/i,
    /\b(se\s+fue(ron)?|se\s+me\s+fue(ron)?)\b/i,
  ],
};

const text = "compré 36.666 con VISA, Galicia en 1 cuota, primera cuota marzo 2026, toallones";

console.log("Original:", text);
const normalized = normalizeText(text);
console.log("Normalized:", normalized);

// Test intent patterns
for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      console.log(`\nMatch for ${intent}:`, match[0]);
    }
  }
}

// Test: buscar "compre"
console.log("\n--- Buscar 'compre' ---");
console.log("normalized.includes('compre'):", normalized.includes('compre'));
console.log("Match /compr[eé]/:", normalized.match(/compr[eé]/i));
