---
paths:
  - supabase/functions/whatsapp-webhook/**
  - supabase/functions/telegram-webhook/**
  - supabase/functions/_shared/**
---

# Reglas — Bots (WhatsApp + Telegram)

## Flujo común

Ambos bots comparten máquina de estados e infraestructura en `_shared/`. Diferencia: WhatsApp usa texto libre; Telegram usa botones inline.

1. Recibir update → resolver `*_users` → `user_id`. Rechazar si `verified = false`.
2. Comandos puros (`/start`, `/menu`, `/cancel`) → despachar directo.
3. Texto libre → NLP en `_shared/nlp/` (clasificación de intención + extracción de entidades).
4. Evaluar `auto_rules` del usuario via `_shared/nlp/autoRulesEvaluator.ts` para sugerir categoría/cuenta.
5. Insertar en `*_pending_actions` con `expires_at = now() + 10min` y pedir confirmación al usuario.
6. On confirmación → `_shared/nlp/commandExecutor.ts` aplica la mutación.

## Reglas duras

- **Nunca crear movimientos sin confirmación explícita del usuario.**
- **Siempre filtrar por `user_id`** del lookup verificado — nunca exponer datos de otro usuario.
- Expirar `*_pending_actions` vencidas en cada request antes de procesar.
- Secrets via `Deno.env.get`. Nunca commitear tokens.

### Secrets requeridos

| Función | Secrets |
|---|---|
| `whatsapp-webhook` | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `ANTHROPIC_API_KEY` |
| `telegram-webhook` | `TELEGRAM_BOT_TOKEN`, `ANTHROPIC_API_KEY` |

## Filtrado de cuentas al sugerir

Para gastos simples: excluir tarjetas de crédito salvo que el usuario las mencione explícitamente. Priorizar cuentas con saldo positivo. Máximo 5–7 opciones.

## Módulos `_shared/`

```
_shared/
├── constants/
│   ├── aliases.ts        # Alias de texto → IDs (categorías, cuentas)
│   ├── patterns.ts       # Regex/patrones de detección
│   └── responses.ts      # Mensajes formateados
└── nlp/
    ├── index.ts
    ├── types.ts
    ├── intentClassifier.ts
    ├── entityExtractor.ts
    ├── fuzzyMatcher.ts
    ├── stateManager.ts
    ├── confirmationFlow.ts
    ├── autoRulesEvaluator.ts
    ├── commandExecutor.ts
    └── groqFallback.ts   # Fallback si Claude API no responde
```

Agregar lógica compartida en `_shared/`, no duplicar entre las dos funciones.

## Deploy

```bash
supabase functions deploy whatsapp-webhook
supabase functions deploy telegram-webhook
supabase secrets set KEY=value
```
