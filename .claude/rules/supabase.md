---
paths:
  - src/services/**
  - src/config/supabase.js
  - supabase/**
---

# Reglas — Supabase

Contexto: cliente supabase-js en el frontend + Edge Functions Deno en `supabase/functions/`. Postgres con RLS siempre activa.

## Frontend (supabase-js)

- Cliente único en `src/config/supabase.js`. No crear instancias nuevas.
- **RLS siempre on**: nunca desactivar en migraciones; no filtrar `user_id` manualmente salvo para joins explícitos.
- `user_id` es columna obligatoria en toda tabla con datos del usuario. Default: `auth.uid()` en el INSERT.

### Cache (stale-while-revalidate)

`src/services/supabaseApi.js` implementa cache con deduplicación:

- **FRESH_DURATION** = 30 s → datos fresh, no refetch.
- **STALE_DURATION** = 10 min → retorna stale + background refresh.
- Background refresh usa `emitQuiet(event)` (no cascada a `ALL_DATA_CHANGED`).
- `invalidateCache(type)` elimina el recurso + las keys de `dashboard`, `movements`, `income`, `expense`, `accounts`.
- `clearCache()` borra todo (logout).

### Mutations y eventos

Tras cualquier mutación:

1. Llamar la función de `supabaseApi.js` correspondiente.
2. Emitir con `emit(DataEvents.XXX_CHANGED)` — esto sí cascada a `ALL_DATA_CHANGED`.
3. El store de Zustand (`src/store/index.js`) se suscribe a esos eventos y re-fetcha los slices afectados.
4. No llamar `fetchAccounts()` / `fetchDashboard()` manualmente desde componentes.

### dataEvents

Eventos disponibles en `src/services/dataEvents.js`:
`EXPENSES_CHANGED`, `INCOMES_CHANGED`, `TRANSFERS_CHANGED`, `ACCOUNTS_CHANGED`, `CATEGORIES_CHANGED`, `BUDGETS_CHANGED`, `GOALS_CHANGED`, `RECURRING_CHANGED`, `SCHEDULED_CHANGED`, `RULES_CHANGED`, `ALL_DATA_CHANGED`.

Suscribirse en hooks con `useDataEvent(events, callback)` — maneja cleanup automático.

## Migraciones

- SQL numerado cronológicamente en `supabase/migrations/`.
- Toda tabla nueva: habilitar RLS + policy `user_id = auth.uid()` antes de commit.
- DDL permanente via CLI (`supabase db push`) o Supabase Dashboard. No via `execute_sql` de MCP.

## Edge Functions (Deno)

- Un directorio por función en `supabase/functions/`. `_shared/` para lógica reutilizable.
- Secrets via `Deno.env.get('NAME')`. Nunca commitear tokens.
- Deploy: `supabase functions deploy <name>`.
- Ver `.claude/rules/bots.md` para las funciones de webhooks.

## Schema

Referencia completa en `CLAUDE.md` (sección "Base de Datos"). No duplicar estructura de tablas aquí.
