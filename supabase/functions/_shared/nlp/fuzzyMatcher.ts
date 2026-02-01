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
 * Busca una cuenta en los datos del usuario
 */
export function findAccount(
  query: string,
  accounts: UserAccount[]
): FuzzyMatch[] {
  if (!query || !accounts.length) return [];

  const normalizedQuery = normalizeText(query);
  const matches: FuzzyMatch[] = [];

  for (const account of accounts) {
    let bestScore = 0;
    let bestAlias: string | undefined;

    // 1. Match directo con nombre de cuenta
    const normalizedName = normalizeText(account.name);
    const directScore = calculateSimilarity(normalizedQuery, normalizedName);
    if (directScore > bestScore) {
      bestScore = directScore;
    }

    // 2. Match con aliases conocidos
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

    // 3. Match parcial con palabras del nombre
    const nameWords = normalizedName.split(/\s+/);
    const queryWords = normalizedQuery.split(/\s+/);

    for (const nameWord of nameWords) {
      for (const queryWord of queryWords) {
        if (nameWord.length > 2 && queryWord.length > 2) {
          const wordScore = calculateSimilarity(queryWord, nameWord);
          // Ajustar score por longitud de match
          const adjustedScore = wordScore * 0.8;
          if (adjustedScore > bestScore) {
            bestScore = adjustedScore;
          }
        }
      }
    }

    if (bestScore >= MATCH_THRESHOLD) {
      matches.push({
        item: account,
        score: bestScore,
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

    if (accountMatches.length === 1 && accountMatches[0].score >= EXACT_MATCH_THRESHOLD) {
      // Match exacto
      const account = accountMatches[0].item as UserAccount;
      resolved.accountId = account.id;
      resolved.account = account.name;
    } else if (accountMatches.length > 1) {
      // Múltiples matches - necesita desambiguación
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
    } else if (accountMatches.length === 1) {
      // Un solo match pero no exacto - usar igual
      const account = accountMatches[0].item as UserAccount;
      resolved.accountId = account.id;
      resolved.account = account.name;
    }
  }

  // Resolver cuenta origen (para transferencias)
  if (entities.fromAccount && !entities.fromAccountId) {
    const fromMatches = findAccount(entities.fromAccount, context.accounts);

    if (fromMatches.length === 1 && fromMatches[0].score >= EXACT_MATCH_THRESHOLD) {
      const account = fromMatches[0].item as UserAccount;
      resolved.fromAccountId = account.id;
      resolved.fromAccount = account.name;
    } else if (fromMatches.length > 1) {
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
    } else if (fromMatches.length === 1) {
      const account = fromMatches[0].item as UserAccount;
      resolved.fromAccountId = account.id;
      resolved.fromAccount = account.name;
    }
  }

  // Resolver cuenta destino (para transferencias)
  if (entities.toAccount && !entities.toAccountId) {
    const toMatches = findAccount(entities.toAccount, context.accounts);

    if (toMatches.length === 1 && toMatches[0].score >= EXACT_MATCH_THRESHOLD) {
      const account = toMatches[0].item as UserAccount;
      resolved.toAccountId = account.id;
      resolved.toAccount = account.name;
    } else if (toMatches.length > 1) {
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
    } else if (toMatches.length === 1) {
      const account = toMatches[0].item as UserAccount;
      resolved.toAccountId = account.id;
      resolved.toAccount = account.name;
    }
  }

  // Resolver categoría
  if (entities.category && !entities.categoryId) {
    const categoryMatches = findCategory(
      entities.category,
      context.categories,
      expectedCategoryType || undefined
    );

    if (categoryMatches.length === 1 && categoryMatches[0].score >= EXACT_MATCH_THRESHOLD) {
      const category = categoryMatches[0].item as UserCategory;
      resolved.categoryId = category.id;
      resolved.category = category.name;
    } else if (categoryMatches.length > 1) {
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
    } else if (categoryMatches.length === 1) {
      const category = categoryMatches[0].item as UserCategory;
      resolved.categoryId = category.id;
      resolved.category = category.name;
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
