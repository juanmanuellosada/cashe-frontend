# Bots Architecture — Cashé

Dos bots complementarios: **WhatsApp** y **Telegram**. Comparten la misma máquina de estados NLP
en `supabase/functions/_shared/nlp/`. La diferencia de UI es el canal (WhatsApp usa mensajes de
texto; Telegram agrega botones inline). WhatsApp requiere aprobación de Meta y tiene costo de API;
Telegram es gratuito y no requiere aprobación.

---

## Vinculación

El flujo es igual para ambos bots:

1. Usuario abre `/integraciones` en la app web.
2. Hace click en "Vincular WhatsApp" o "Vincular Telegram".
3. El frontend llama al API de Supabase para generar un código de 6 dígitos y guardarlo en
   `whatsapp_users.verification_code` / `telegram_users.verification_code`
   con `verification_expires_at = now() + 10 min`.
4. **WhatsApp**: usuario envía el código al número del bot.
   **Telegram**: click en "Abrir Telegram" → deep link `t.me/BOT?start=CODE`; el bot recibe `/start CODE`.
5. La Edge Function verifica el código contra la tabla, marca `verified = true`, borra el código.
6. El frontend hace polling con `checkWhatsAppVerification()` / `checkTelegramVerification()` para
   detectar la confirmación y actualizar la UI.

Frontend relevante:
- `src/services/whatsappApi.js` — `getWhatsAppStatus`, `generateVerificationCode`, `checkWhatsAppVerification`, `unlinkWhatsApp`
- `src/services/telegramApi.js` — funciones análogas para Telegram
- `src/components/integrations/WhatsAppLinkSection.jsx` / `TelegramLinkSection.jsx`
- Ruta: `/integraciones`

---

## Máquina de estados

El estado de cada conversación activa vive en `conversation_states` (TTL 10 min, UNIQUE por plataforma+usuario).

Estados posibles del campo `state`:
- `awaiting_confirmation` — bot mostró resumen, espera "sí" / "no" / "editar"
- `awaiting_edit_field` — usuario pidió editar; bot pregunta qué campo
- `awaiting_edit_value` — bot pregunta el nuevo valor del campo seleccionado
- `awaiting_account_selection` — múltiples cuentas candidatas; bot lista opciones numeradas
- `awaiting_category_selection` — ídem para categorías
- `awaiting_disambiguation` — ambigüedad general; bot pregunta opciones

Ejemplo de fila en `whatsapp_pending_actions` (o `telegram_pending_actions`):
```json
{
  "action_type": "movement",
  "action_data": {
    "type": "expense",
    "amount": 5000,
    "note": "Gasté 5000 en el super",
    "category_id": "uuid-supermercado",
    "account_id": null
  },
  "status": "pending",
  "expires_at": "2026-04-24T15:10:00Z"
}
```

Flujo completo de un mensaje:
1. Usuario envía mensaje ("Gasté 5000 en el super con la visa").
2. Edge Function recibe el webhook y llama a `_shared/nlp/index.ts`.
3. `intentClassifier.ts` determina el intent (`REGISTRAR_GASTO`).
4. `entityExtractor.ts` extrae monto, nota, posible cuenta/categoría.
5. `autoRulesEvaluator.ts` evalúa las reglas del usuario contra `{note, amount, account_id, type}`.
6. `fuzzyMatcher.ts` hace matching de texto contra cuentas y categorías del usuario.
7. Si hay ambigüedad: se guarda estado `awaiting_account_selection` y se listan opciones.
8. Con datos completos: se guarda en `*_pending_actions` y se muestra resumen al usuario.
9. Usuario confirma → `commandExecutor.ts` crea el movimiento/transferencia en Supabase.
10. Estado se limpia de `conversation_states`.

---

## NLP compartido (`supabase/functions/_shared/nlp/`)

Archivos en el módulo:
- `index.ts` — entry point; orquesta el pipeline
- `intentClassifier.ts` — clasifica el intent del mensaje
- `entityExtractor.ts` — extrae entidades (monto, fecha, nota, cuenta, categoría)
- `fuzzyMatcher.ts` — matching difuso de texto contra cuentas/categorías del usuario
- `autoRulesEvaluator.ts` — evalúa `auto_rules` y aplica sugerencias
- `confirmationFlow.ts` — manejo del flujo de confirmación/edición
- `stateManager.ts` — lectura/escritura de `conversation_states`
- `commandExecutor.ts` — ejecución efectiva (inserta en Supabase)
- `types.ts` — tipos TypeScript compartidos
- `groqFallback.ts` — fallback de Claude a Groq si el modelo principal falla

El NLP usa Claude API (secret `ANTHROPIC_API_KEY`) como motor principal. `groqFallback.ts` confirma
que existe un fallback a Groq (secret `GROQ_API_KEY`).

---

## Auto-rules evaluator

Antes de mostrar el resumen de confirmación al usuario, el bot ejecuta `evaluateAutoRules()` con
`{note, amount, accountId, type}`. Si una regla matchea:
- Se aplican las `auto_rule_actions` (categoría y/o cuenta) automáticamente.
- El bot solo pregunta por los campos que quedaron sin resolver.

Filtrado inteligente de cuentas en `fuzzyMatcher.ts → filterRelevantAccounts()`:
- Excluye cuentas con `hidden_from_balance = true`.
- Excluye `is_credit_card = true` salvo que el usuario las mencione explícitamente.
- Prioriza cuentas con saldo positivo.
- Limita a máximo 7 opciones listadas.

---

## Comandos Telegram

| Comando | Acción |
|---------|--------|
| `/start` | Inicia el bot o completa la vinculación si se recibe con un código |
| `/menu` | Muestra el menú principal con botones inline |
| `/cancel` | Cancela la operación en curso; limpia `conversation_states` |

Los callback queries de botones inline se dispatchean en `telegram-webhook/index.ts` según el
prefijo del `callback_data` (ej: `confirm_`, `cancel_`, `select_account_`, `select_category_`).

---

## Recordatorios (cron)

Edge Functions de notificaciones en `supabase/functions/`:

| Función | Propósito | Cron |
|---------|-----------|------|
| `monthly-card-reminder` | Recuerda actualizar fechas de cierre/vencimiento de tarjetas | `0 * * * *` (hourly; filtra por hora configurada en `notification_preferences`) |
| `send-due-date-notifications` | Notificaciones de vencimiento de pago de tarjeta | `0 * * * *` |
| `scheduled-notifications` | Notificaciones de transacciones recurrentes pendientes | — |
| `process-recurring` | Genera ocurrencias de `recurring_transactions` cuya fecha llegó | — |

Los cron jobs usan `pg_cron` (extensión de Supabase). Las funciones de recordatorio leen
`notification_preferences` para filtrar usuarios por día/hora configurados. El registro de envíos
va a `notification_log` para evitar duplicados en el mismo mes.

El campo `due_day` en `accounts` controla cuándo se envían los recordatorios de vencimiento.
El campo `closing_day` informa el cierre del resumen. Ambos se configuran desde `/tarjetas`.

---

## Secrets necesarios

Configurar con `supabase secrets set NAME=value`:

| Secret | Usado por |
|--------|-----------|
| `WHATSAPP_ACCESS_TOKEN` | whatsapp-webhook, monthly-card-reminder |
| `WHATSAPP_PHONE_NUMBER_ID` | whatsapp-webhook, monthly-card-reminder |
| `WHATSAPP_VERIFY_TOKEN` | whatsapp-webhook (verificación de webhook Meta) |
| `TELEGRAM_BOT_TOKEN` | telegram-webhook, monthly-card-reminder |
| `ANTHROPIC_API_KEY` | NLP principal (Claude) |
| `GROQ_API_KEY` | NLP fallback (Groq) |
| `RESEND_API_KEY` | send-access-request (emails) |

Deploy de una función: `supabase functions deploy <nombre>`.
Configurar webhook de Telegram:
```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://<PROJECT_REF>.supabase.co/functions/v1/telegram-webhook"
```
