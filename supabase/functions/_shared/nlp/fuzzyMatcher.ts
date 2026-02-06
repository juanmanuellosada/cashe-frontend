/**
 * Fuzzy Matcher para cuentas y categorías
 * Busca en los datos REALES del usuario usando aliases y similitud de texto
 */

import {
  ACCOUNT_ALIASES,
  EXPENSE_CATEGORY_ALIASES,
  INCOME_CATEGORY_ALIASES,
} from "../constants/aliases.ts";
import { normalizeText } from "../constants/patterns.ts";
import type {
  UserAccount,
  UserCategory,
  UserContext,
  FuzzyMatch,
  DisambiguationOption,
  ParsedEntities,
  Intent,
} from "./types.ts";
import { getExpectedCategoryType } from "./intentClassifier.ts";

/**
 * Umbral mínimo de similitud para considerar un match
 */
const MATCH_THRESHOLD = 0.4;

/**
 * Umbral para considerar un match como exacto (no necesita desambiguación)
 */
const EXACT_MATCH_THRESHOLD = 0.85;

/**
 * Diferencia mínima de score para considerar al primer match como claramente mejor
 * Si el primer match tiene 0.9 y el segundo 0.7, la diferencia es 0.2 > 0.15, así que usamos el primero
 */
const CLEAR_WINNER_THRESHOLD = 0.15;

/**
 * Detecta si el query especifica una moneda
 */
function detectCurrencyInQuery(query: string): "ARS" | "USD" | null {
  const normalized = normalizeText(query);

  // Detectar pesos
  if (/\b(pesos?|ars|en\s+pesos?|de\s+pesos?)\b/i.test(normalized)) {
    return "ARS";
  }

  // Detectar dólares
  if (/\b(d[oó]lares?|usd|en\s+d[oó]lares?|de\s+d[oó]lares?)\b/i.test(normalized)) {
    return "USD";
  }

  return null;
}

/**
 * Busca una cuenta en los datos del usuario
 */
export function findAccount(
  query: string,
  accounts: UserAccount[]
): FuzzyMatch[] {
  if (!query || !accounts.length) return [];

  const normalizedQuery = normalizeText(query);
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);
  const matches: FuzzyMatch[] = [];

  // Detectar si el usuario especificó moneda
  const requestedCurrency = detectCurrencyInQuery(query);

  for (const account of accounts) {
    let bestScore = 0;
    let bestAlias: string | undefined;

    // Penalizar cuentas que no coinciden con la moneda solicitada
    let currencyPenalty = 0;
    if (requestedCurrency && account.currency !== requestedCurrency) {
      currencyPenalty = 0.5; // Penalización fuerte para moneda incorrecta
    }

    // 1. Match directo con nombre de cuenta (normalizado, sin comas ni puntuación)
    const normalizedName = normalizeText(account.name);
    const directScore = calculateSimilarity(normalizedQuery, normalizedName);
    if (directScore > bestScore) {
      bestScore = directScore;
    }

    // 2. Match especial para tarjetas: "visa galicia" debe matchear "VISA, Galicia" con score alto
    // Verificar si TODAS las palabras del query están en el nombre de la cuenta
    const nameWords = normalizedName.split(/\s+/).filter(w => w.length > 1);
    const allQueryWordsMatch = queryWords.length > 0 && queryWords.every(qw =>
      nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
    );

    if (allQueryWordsMatch) {
      // Calcular score basado en cuántas palabras coinciden y qué tan exactamente
      const matchRatio = queryWords.length / Math.max(nameWords.length, 1);
      const allWordsScore = 0.85 + (matchRatio * 0.1); // 0.85-0.95
      if (allWordsScore > bestScore) {
        bestScore = allWordsScore;
      }
    }

    // 3. Match con aliases conocidos
    for (const [key, aliases] of Object.entries(ACCOUNT_ALIASES)) {
      for (const alias of aliases) {
        const normalizedAlias = normalizeText(alias);

        // Si el query contiene el alias
        if (normalizedQuery.includes(normalizedAlias)) {
          const aliasScore = 0.9; // Alta confianza para aliases
          if (aliasScore > bestScore && normalizedName.includes(key)) {
            bestScore = aliasScore;
            bestAlias = alias;
          }
        }

        // Si el nombre de cuenta contiene palabras del alias
        if (normalizedName.includes(normalizedAlias)) {
          const nameContainsAlias = calculateSimilarity(
            normalizedQuery,
            normalizedAlias
          );
          if (nameContainsAlias > bestScore) {
            bestScore = nameContainsAlias;
            bestAlias = alias;
          }
        }
      }
    }

    // 4. Match parcial con palabras del nombre (penalizado)
    for (const nameWord of nameWords) {
      for (const queryWord of queryWords) {
        if (nameWord.length > 2 && queryWord.length > 2) {
          const wordScore = calculateSimilarity(queryWord, nameWord);
          // Penalizar más los matches parciales para evitar falsos positivos
          const adjustedScore = wordScore * 0.7;
          if (adjustedScore > bestScore) {
            bestScore = adjustedScore;
          }
        }
      }
    }

    // Aplicar penalización por moneda incorrecta
    const finalScore = bestScore - currencyPenalty;

    if (finalScore >= MATCH_THRESHOLD) {
      matches.push({
        item: account,
        score: finalScore,
        matchedAlias: bestAlias,
      });
    }
  }

  // Ordenar por score descendente
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Busca una categoría en los datos del usuario
 */
export function findCategory(
  query: string,
  categories: UserCategory[],
  expectedType?: "income" | "expense"
): FuzzyMatch[] {
  if (!query || !categories.length) return [];

  const normalizedQuery = normalizeText(query);
  const matches: FuzzyMatch[] = [];

  // Filtrar por tipo si se especifica
  const filteredCategories = expectedType
    ? categories.filter((c) => c.type === expectedType)
    : categories;

  // Seleccionar aliases según el tipo
  const aliases =
    expectedType === "income"
      ? INCOME_CATEGORY_ALIASES
      : expectedType === "expense"
        ? EXPENSE_CATEGORY_ALIASES
        : { ...EXPENSE_CATEGORY_ALIASES, ...INCOME_CATEGORY_ALIASES };

  for (const category of filteredCategories) {
    let bestScore = 0;
    let bestAlias: string | undefined;

    // 1. Match directo con nombre de categoría
    const normalizedName = normalizeText(category.name);
    const directScore = calculateSimilarity(normalizedQuery, normalizedName);
    if (directScore > bestScore) {
      bestScore = directScore;
    }

    // 2. Match con aliases conocidos
    for (const [key, categoryAliases] of Object.entries(aliases)) {
      for (const alias of categoryAliases) {
        const normalizedAlias = normalizeText(alias);

        // Si el query contiene el alias
        if (
          normalizedQuery.includes(normalizedAlias) ||
          normalizedAlias.includes(normalizedQuery)
        ) {
          // Verificar que la categoría corresponde a este alias
          const nameMatchesKey =
            normalizedName.includes(key) ||
            key.includes(normalizedName) ||
            categoryAliases.some((a) => normalizedName.includes(normalizeText(a)));

          if (nameMatchesKey) {
            const aliasScore = 0.9;
            if (aliasScore > bestScore) {
              bestScore = aliasScore;
              bestAlias = alias;
            }
          }
        }
      }
    }

    // 3. Match parcial
    const nameWords = normalizedName.split(/\s+/);
    const queryWords = normalizedQuery.split(/\s+/);

    for (const nameWord of nameWords) {
      for (const queryWord of queryWords) {
        if (nameWord.length > 2 && queryWord.length > 2) {
          const wordScore = calculateSimilarity(queryWord, nameWord);
          const adjustedScore = wordScore * 0.8;
          if (adjustedScore > bestScore) {
            bestScore = adjustedScore;
          }
        }
      }
    }

    if (bestScore >= MATCH_THRESHOLD) {
      matches.push({
        item: category,
        score: bestScore,
        matchedAlias: bestAlias,
      });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

/**
 * Resuelve entidades de texto a IDs usando fuzzy matching
 * Devuelve también información de desambiguación si es necesaria
 */
export function resolveEntities(
  entities: ParsedEntities,
  context: UserContext,
  intent: Intent
): {
  resolved: ParsedEntities;
  needsDisambiguation: boolean;
  disambiguationField?: "account" | "category" | "fromAccount" | "toAccount";
  disambiguationOptions?: DisambiguationOption[];
} {
  const resolved = { ...entities };
  const expectedCategoryType = getExpectedCategoryType(intent);

  // Resolver cuenta
  if (entities.account && !entities.accountId) {
    const accountMatches = findAccount(entities.account, context.accounts);

    if (accountMatches.length >= 1) {
      const bestMatch = accountMatches[0];
      const secondBestScore = accountMatches.length > 1 ? accountMatches[1].score : 0;
      const scoreDifference = bestMatch.score - secondBestScore;

      // Usar el mejor match si:
      // 1. Es el único match, O
      // 2. Tiene score exacto (>= 0.85), O
      // 3. Hay diferencia clara con el segundo (>= 0.15)
      if (
        accountMatches.length === 1 ||
        bestMatch.score >= EXACT_MATCH_THRESHOLD ||
        scoreDifference >= CLEAR_WINNER_THRESHOLD
      ) {
        const account = bestMatch.item as UserAccount;
        resolved.accountId = account.id;
        resolved.account = account.name;
      } else {
        // Múltiples matches muy cercanos - necesita desambiguación
        return {
          resolved,
          needsDisambiguation: true,
          disambiguationField: "account",
          disambiguationOptions: accountMatches.slice(0, 5).map((m) => {
            const acc = m.item as UserAccount;
            return {
              id: acc.id,
              name: acc.name,
              displayName: acc.name,
              icon: acc.icon,
              balance: acc.balance,
              currency: acc.currency,
            };
          }),
        };
      }
    }
  }

  // Resolver cuenta origen (para transferencias)
  if (entities.fromAccount && !entities.fromAccountId) {
    const fromMatches = findAccount(entities.fromAccount, context.accounts);

    if (fromMatches.length >= 1) {
      const bestMatch = fromMatches[0];
      const secondBestScore = fromMatches.length > 1 ? fromMatches[1].score : 0;
      const scoreDifference = bestMatch.score - secondBestScore;

      if (
        fromMatches.length === 1 ||
        bestMatch.score >= EXACT_MATCH_THRESHOLD ||
        scoreDifference >= CLEAR_WINNER_THRESHOLD
      ) {
        const account = bestMatch.item as UserAccount;
        resolved.fromAccountId = account.id;
        resolved.fromAccount = account.name;
      } else {
        return {
          resolved,
          needsDisambiguation: true,
          disambiguationField: "fromAccount",
          disambiguationOptions: fromMatches.slice(0, 5).map((m) => {
            const acc = m.item as UserAccount;
            return {
              id: acc.id,
              name: acc.name,
              displayName: acc.name,
              icon: acc.icon,
              balance: acc.balance,
              currency: acc.currency,
            };
          }),
        };
      }
    }
  }

  // Resolver cuenta destino (para transferencias)
  if (entities.toAccount && !entities.toAccountId) {
    const toMatches = findAccount(entities.toAccount, context.accounts);

    if (toMatches.length >= 1) {
      const bestMatch = toMatches[0];
      const secondBestScore = toMatches.length > 1 ? toMatches[1].score : 0;
      const scoreDifference = bestMatch.score - secondBestScore;

      if (
        toMatches.length === 1 ||
        bestMatch.score >= EXACT_MATCH_THRESHOLD ||
        scoreDifference >= CLEAR_WINNER_THRESHOLD
      ) {
        const account = bestMatch.item as UserAccount;
        resolved.toAccountId = account.id;
        resolved.toAccount = account.name;
      } else {
        return {
          resolved,
          needsDisambiguation: true,
          disambiguationField: "toAccount",
          disambiguationOptions: toMatches.slice(0, 5).map((m) => {
            const acc = m.item as UserAccount;
            return {
              id: acc.id,
              name: acc.name,
              displayName: acc.name,
              icon: acc.icon,
              balance: acc.balance,
              currency: acc.currency,
            };
          }),
        };
      }
    }
  }

  // Resolver categoría
  if (entities.category && !entities.categoryId) {
    const categoryMatches = findCategory(
      entities.category,
      context.categories,
      expectedCategoryType || undefined
    );

    if (categoryMatches.length >= 1) {
      const bestMatch = categoryMatches[0];
      const secondBestScore = categoryMatches.length > 1 ? categoryMatches[1].score : 0;
      const scoreDifference = bestMatch.score - secondBestScore;

      if (
        categoryMatches.length === 1 ||
        bestMatch.score >= EXACT_MATCH_THRESHOLD ||
        scoreDifference >= CLEAR_WINNER_THRESHOLD
      ) {
        const category = bestMatch.item as UserCategory;
        resolved.categoryId = category.id;
        resolved.category = category.name;
      } else {
        return {
          resolved,
          needsDisambiguation: true,
          disambiguationField: "category",
          disambiguationOptions: categoryMatches.slice(0, 5).map((m) => {
            const cat = m.item as UserCategory;
            return {
              id: cat.id,
              name: cat.name,
              displayName: `${cat.icon || ""} ${cat.name}`.trim(),
              icon: cat.icon,
            };
          }),
        };
      }
    }
  }

  return {
    resolved,
    needsDisambiguation: false,
  };
}

/**
 * Calcula similitud entre dos strings usando distancia de Levenshtein normalizada
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (!str1 || !str2) return 0;

  // Si uno contiene al otro, dar score alto
  if (str1.includes(str2)) return 0.8 + (str2.length / str1.length) * 0.2;
  if (str2.includes(str1)) return 0.8 + (str1.length / str2.length) * 0.2;

  // Calcular distancia de Levenshtein
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);

  // Convertir a similitud (0-1)
  return 1 - distance / maxLength;
}

/**
 * Calcula la distancia de Levenshtein entre dos strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Crear matriz
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Inicializar primera columna y fila
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Llenar matriz
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Obtiene la cuenta por defecto del usuario (primera de la lista)
 */
export function getDefaultAccount(accounts: UserAccount[]): UserAccount | null {
  if (!accounts.length) return null;

  // Preferir cuentas que no sean tarjeta de crédito
  const nonCreditCard = accounts.find((a) => !a.is_credit_card);
  return nonCreditCard || accounts[0];
}

/**
 * Obtiene la categoría por defecto según el tipo
 */
export function getDefaultCategory(
  categories: UserCategory[],
  type: "income" | "expense"
): UserCategory | null {
  const filtered = categories.filter((c) => c.type === type);
  if (!filtered.length) return null;

  // Buscar "Otros" como default
  const otros = filtered.find((c) =>
    normalizeText(c.name).includes("otro")
  );
  return otros || filtered[0];
}

/**
 * Filtra cuentas para mostrar solo las más relevantes al usuario
 * - Excluye cuentas ocultas (hidden_from_balance = true)
 * - Excluye tarjetas de crédito si no se mencionan explícitamente
 * - Limita a máximo 7 opciones
 * - Prioriza por saldo > 0
 */
export function filterRelevantAccounts(
  accounts: UserAccount[],
  query?: string,
  intent?: string
): UserAccount[] {
  // Detectar si se mencionó alguna tarjeta en el query
  const mentionedCreditCard = query
    ? /\b(visa|mastercard|master|amex|cabal|naranja|nativa|tarjeta|tc)\b/i.test(query)
    : false;

  let filtered = accounts.filter((account) => {
    // Excluir cuentas ocultas
    if (account.hidden_from_balance) return false;

    // Si no se mencionó tarjeta y es un gasto/ingreso simple, excluir tarjetas de crédito
    if (!mentionedCreditCard && account.is_credit_card) {
      const isSimpleTransaction =
        intent === "REGISTRAR_GASTO" ||
        intent === "REGISTRAR_INGRESO";
      if (isSimpleTransaction) return false;
    }

    return true;
  });

  // Ordenar por relevancia:
  // 1. Saldo > 0 primero
  // 2. Por nombre alfabético
  filtered = filtered.sort((a, b) => {
    const balanceA = a.balance || 0;
    const balanceB = b.balance || 0;

    // Priorizar cuentas con saldo positivo
    if (balanceA > 0 && balanceB <= 0) return -1;
    if (balanceA <= 0 && balanceB > 0) return 1;

    // Si ambos tienen o no tienen saldo, ordenar alfabéticamente
    return a.name.localeCompare(b.name);
  });

  // Limitar a máximo 7 opciones para no saturar al usuario
  return filtered.slice(0, 7);
}
