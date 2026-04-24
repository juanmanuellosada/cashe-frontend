# Database Schema — Cashé (Supabase)

Snapshot introspectado desde Supabase (proyecto `pqyrbbylglzmcmhlyybc`, Postgres 17). Todas las tablas del schema `public` tienen **RLS habilitada**. 33 tablas, 11 migraciones aplicadas.

## Extensiones activas

- `pgcrypto`, `uuid-ossp` — crypto + UUIDs.
- `pg_cron` — jobs programados (Edge Functions de recurring y notifications).
- `pg_net` — HTTP async desde Postgres.
- `pg_graphql` — auto-enabled por Supabase.
- `pg_stat_statements` — perf stats.
- `supabase_vault`, `plpgsql` — utilidades de Supabase/Postgres.

## Migraciones aplicadas (orden)

1. `20260129153635_add_budgets_and_goals`
2. `20260131142405_add_original_currency_to_movements`
3. `20260131183804_add_recurring_and_future_transactions`
4. `20260202144215_add_credit_card_statements`
5. `20260205145019_add_get_account_balances_function`
6. `20260205165627_create_auto_rules_tables`
7. `20260206131556_create_statement_payments_table`
8. `20260206160857_add_exchange_rate_type_column`
9. `20260310184648_create_saved_views`
10. `20260313192440_add_view_preferences_to_user_settings`
11. `20260418014150_perf_indexes_and_rpcs`

Aplicar nuevas migraciones vía Supabase CLI (`supabase db push`) o Dashboard.

## Tablas (33) — índice por dominio

| Dominio | Tablas |
|---|---|
| **Core usuario** | `profiles`, `user_settings` |
| **Movimientos** | `accounts`, `categories`, `movements`, `transfers`, `installment_purchases` |
| **Presupuestos y objetivos** | `budgets`, `budget_periods`, `goals`, `goal_periods` |
| **Recurrentes y programados** | `recurring_transactions`, `recurring_occurrences`, `scheduled_transactions` |
| **Auto-rules** | `auto_rules`, `auto_rule_conditions`, `auto_rule_actions` |
| **Bots (WhatsApp + Telegram)** | `whatsapp_users`, `whatsapp_pending_actions`, `whatsapp_processed_messages`, `telegram_users`, `telegram_pending_actions`, `conversation_states` |
| **Tarjetas de crédito** | `credit_card_statements`, `statement_payments`, `card_statement_attachments` |
| **Notificaciones** | `notification_preferences`, `notification_log`, `notification_logs`, `push_subscriptions` |
| **Catálogos / utils** | `icon_catalog`, `argentine_holidays`, `saved_views` |

---

## Detalle por tabla (columnas clave)

Todas las tablas incluyen `created_at`/`updated_at timestamptz default now()` salvo que se indique. RLS on siempre.

### Core

**profiles** — Extiende `auth.users`. FK `id → auth.users.id`.
Columnas: `id uuid PK`, `email`, `full_name`, `avatar_url`, `whatsapp_enabled bool` (acceso al bot).

**user_settings** — Config por usuario.
Campos: `default_currency text` (ARS), `exchange_rate numeric` (default 1000), `exchange_rate_type text` (oficial/blue/bolsa/ccl), `storage_used_bytes`, `storage_quota_bytes` (default 100MB), `view_preferences jsonb`, + 5 campos de `card_reminder_*` (enabled, WhatsApp, Telegram, day, hour).

### Movimientos

**accounts** — Cuentas/billeteras/tarjetas. Campos: `name`, `currency`, `initial_balance`, `account_type`, `is_credit_card bool`, `closing_day int`, `due_day int`, `closing_date`, `due_date`, `icon`, `hidden_from_balance bool`.

**categories** — Tipos `income`|`expense`. FK `icon_catalog_id → icon_catalog.id` (opcional).

**movements** — Ingresos/gastos. Campos relevantes: `type`, `date`, `amount`, `account_id`, `category_id`, `note`, `installment_purchase_id` + `installment_number` + `total_installments`, `attachment_url`/`attachment_name` (dos slots), `original_currency`, `is_future bool`, `recurring_occurrence_id`. 20 columnas.

**transfers** — Movimientos entre cuentas propias. Campos: `from_account_id`, `to_account_id`, `from_amount`, `to_amount`, `attachment_*`, `is_future`, `recurring_occurrence_id`.

**installment_purchases** — Compra en cuotas. `description`, `total_amount`, `installments int`, `start_date`. Eliminar propaga CASCADE sobre filas de `movements` vinculadas.

### Presupuestos y objetivos

**budgets** — Definición. Campos: `name`, `amount`, `currency`, `period_type text`, `start_date`/`end_date`, `is_recurring`, `category_ids uuid[]`, `account_ids uuid[]`, `is_global`, `is_active`, `is_paused`, `icon`.

**budget_periods** — Instancia mensual/semanal generada. `period_start`, `period_end`, `budget_amount`, `spent_amount`, `status`.

**goals** — Objetivos de ahorro/reducción. Similar a budgets + `goal_type`, `target_amount`, `reduction_type`, `reduction_value`, `baseline_amount`, `is_completed`, `completed_at`. 22 columnas.

**goal_periods** — Instancia temporal del objetivo con `current_amount`, `is_achieved`.

### Recurrentes y programados

**recurring_transactions** — Definición de recurrente. Campos: `name`, `amount`, `currency`, `type` (income/expense/transfer), `account_id` o `from/to_account_id`, `category_id`, `frequency jsonb` (define periodicidad), `execution_hour`, `weekend_handling` (`as_is`/skip), `start_date`/`end_date`, `creation_mode` (automatic/manual), `preferred_bot`, `is_active`, `is_paused`, `last_generated_date`, `next_execution_date`, `is_credit_card_recurring`.

**recurring_occurrences** — Instancia generada. Campos: `recurring_id FK`, `scheduled_date`, `status` (pending/confirmed/skipped), `movement_id` o `transfer_id` (set al confirmar), `actual_amount`, `confirmed_at`, `confirmed_via`, `notification_sent`.

**scheduled_transactions** — Programación one-shot (sin recurrencia). `type`, `scheduled_date`, `amount`, `account_id`, `to_account_id`, `to_amount`, `category_id`, `note`, `status`, `notification_sent`.

### Auto-rules

**auto_rules** — Regla. `name`, `is_active`, `priority int`, `logic_operator` (`AND`/`OR`).

**auto_rule_conditions** — Condiciones. `rule_id FK`, `field` (note/amount/account_id/type), `operator` (contains/equals/starts_with/ends_with/greater_than/less_than/between), `value text`.

**auto_rule_actions** — Acciones. `rule_id FK`, `field` (category_id/account_id), `value text` (UUID).

### Bots

**whatsapp_users** / **telegram_users** — Vinculación. Campos: `user_id FK`, identificador de plataforma, `verified bool`, `verification_code`, `verification_expires_at`. Telegram suma `telegram_username`, `telegram_first_name`.

**whatsapp_pending_actions** / **telegram_pending_actions** — Cola de confirmaciones. `action_type` (movement/transfer/query), `action_data jsonb`, `original_message`, `status` (pending/confirmed/cancelled), `expires_at default now() + 10min`, `confirmed_at`.

**whatsapp_processed_messages** — Idempotencia de webhook. `message_id`, `phone_number`, `processed_at`. Rechaza duplicados antes de procesar.

**conversation_states** — Máquina de estados compartida. `platform` (telegram/whatsapp), `platform_user_id text`, `user_id uuid?`, `state`, `intent`, `parsed_data jsonb`, `edit_field`, `disambiguation_options jsonb`, `expires_at` (10min default).

### Tarjetas de crédito

**credit_card_statements** — Resumen mensual. `account_id FK`, `statement_month date`, `closing_date`, `due_date`, `total_amount`, `stamp_tax`, `paid bool`, `paid_date`, `paid_from_account_id`.

**statement_payments** — Pagos registrados. `account_id`, `statement_period text`, `currency`, `amount`, `payment_account_id`, `transfer_id FK` (si el pago fue vía transfer).

**card_statement_attachments** — Adjuntos PDF. `account_id`, `period`, `statement_url`/`statement_name`, `receipt_url`/`receipt_name`.

### Notificaciones

**notification_preferences** — Por usuario: `notify_push`, `notify_telegram`, `notify_whatsapp`, `notification_hour int` (hora AR UTC-3).

**notification_log** — Log por cuenta/due_date (recordatorios de tarjeta). Campos: `user_id`, `account_id`, `notification_type`, `message`, `sent_at`, `due_date`.

**notification_logs** — Log genérico. `notification_type`, `channel`, `sent_at`, `year_month text`, `success bool`, `error_message`. (Convive con `notification_log` — propósito distinto: éste trackea ejecuciones cron, el singular trackea envíos por tarjeta).

**push_subscriptions** — Web Push. `endpoint`, `p256dh`, `auth`. Sin updated_at.

### Catálogos y utils

**icon_catalog** — 365 iconos de bancos/billeteras/comercios AR. Campos: `filename`, `name`, `domain`, `category`, `keywords text[]`.

**argentine_holidays** — 48 feriados. `date`, `name`, `type` (national/provincial), `year int`.

**saved_views** — Filtros guardados por tipo de vista. `type`, `name`, `filters jsonb`, `sort_config jsonb`, `is_default`.

---

## Convenciones observadas

- **RLS**: todas las tablas filtran por `user_id = auth.uid()` en sus policies. Nunca desactivar.
- **FK target inconsistente**: algunas tablas apuntan `user_id → auth.users.id` directo (profiles, accounts, categories, movements, transfers, installment_purchases, user_settings, statement_payments, saved_views), otras apuntan `→ public.profiles.id` (budgets, goals, whatsapp_*, telegram_*, etc.). Ambas funcionan porque `profiles.id = auth.users.id`, pero es deuda a normalizar eventualmente.
- **Auto-expiración**: `*_pending_actions` y `conversation_states` usan `expires_at default now() + '10 min'`. La lógica de cleanup corre en Edge Functions o queries que filtran por `expires_at > now()`.
- **Arrays `uuid[]`**: `budgets.category_ids`, `budgets.account_ids`, `goals.category_ids`, `goals.account_ids` — un budget/goal puede cubrir múltiples categorías o cuentas.
- **Adjuntos**: `movements` tiene 2 slots (`attachment_url`, `attachment_url_2`); `transfers` y `card_statement_attachments` tienen un par distinto (statement + receipt).
- **Recurring flow**: `recurring_transactions` (definición) genera filas en `recurring_occurrences` (instancias); al confirmar, la ocurrencia se vincula a un `movements` o `transfers` via FK.

## Uso desde el frontend

- Cliente en `src/config/supabase.js`, capa API en `src/services/supabaseApi.js` (cache stale-while-revalidate + dedup + `dataEvents` pub-sub).
- Tipos TS se pueden generar con `mcp__supabase__generate_typescript_types` si se necesita (el repo está en JS puro, no usados hoy).
