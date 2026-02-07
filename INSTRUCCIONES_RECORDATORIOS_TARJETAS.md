# Recordatorios Mensuales de Tarjetas - Instrucciones de Implementación

## ✅ Funcionalidad Implementada

Sistema de recordatorios automáticos que notifica a los usuarios cada mes (día y hora configurables) para que actualicen las fechas de cierre y vencimiento de sus tarjetas de crédito.

### Características:
- 📅 **Día configurable**: Usuario elige qué día del mes (1-28)
- ⏰ **Hora configurable**: Usuario elige la hora (0-23, hora Argentina)
- 📱 **Multi-canal**: WhatsApp, Telegram y/o Push Notifications
- 🎯 **Solo si tiene tarjetas**: Solo notifica a usuarios con tarjetas de crédito
- 🔒 **Sin duplicados**: No envía múltiples veces en el mismo mes
- ⚙️ **Configurable**: El usuario puede activar/desactivar desde `/integraciones`

---

## 📋 Pasos para Deploy

### 1. Aplicar migraciones de base de datos

Ejecutá estos scripts SQL en **Supabase SQL Editor**:

#### A) Agregar campos a `user_settings`:
```sql
-- Archivo: database/migrations/notification_preferences.sql
```

#### B) Crear función para obtener usuarios:
```sql
-- Archivo: database/migrations/get_users_for_card_reminder.sql
```

**Verificar:**
```sql
-- Ver campos agregados
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_settings'
AND column_name LIKE 'card_reminder%';

-- Probar función (retorna usuarios que deben ser notificados hoy)
SELECT * FROM get_users_for_card_reminder(
  10,  -- día
  9,   -- hora
  '2026-02'  -- año-mes
);
```

---

### 2. Deploy de Edge Function

```bash
cd C:\Users\juanm\OneDrive\Escritorio\cashe-frontend

# Deploy la función
supabase functions deploy monthly-card-reminder --no-verify-jwt
```

**Verificar deployment:**
```bash
# Ver logs
supabase functions logs monthly-card-reminder --tail
```

---

### 3. Configurar Cron Job en Supabase

**Opción A: Desde el Dashboard** (Recomendado)

1. Ir a: https://supabase.com/dashboard/project/pqyrbbylglzmcmhlyybc/functions/monthly-card-reminder
2. Click en **"Schedule"** o **"Cron"**
3. Configurar expresión cron: `0 * * * *`
   - Se ejecuta **cada hora** (porque usuarios pueden configurar diferentes horas)
   - La función filtra internamente por día y hora configurada
4. Guardar

**Opción B: Desde la CLI**

```bash
# Agregar cron schedule
supabase functions schedule monthly-card-reminder --cron "0 * * * *"
```

**Explicación de la expresión cron:**
```
0 * * * *
│ │ │ │ │
│ │ │ │ └─── Día de la semana (0-6, 0=Domingo) - * = todos
│ │ │ └───── Mes (1-12) - * = todos
│ │ └─────── Día del mes (1-31) - * = todos
│ └───────── Hora (0-23) - * = todas
└─────────── Minuto (0-59) - 0 = al inicio de la hora

Resultado: Se ejecuta cada hora en punto (00:00, 01:00, 02:00, ...)
```

---

### 4. Probar la función manualmente

#### A) Crear un usuario de prueba con configuración:

```sql
-- 1. Crear tarjeta de prueba
INSERT INTO accounts (user_id, name, is_credit_card, closing_day)
VALUES (
  '1a753dba-096e-4453-8ddb-87ace889a1f6',  -- Tu user_id
  'Tarjeta de Prueba',
  true,
  15
);

-- 2. Configurar recordatorios para HOY y AHORA
-- (actualizar con el día y hora actual de Argentina)
UPDATE user_settings
SET
  card_reminder_enabled = true,
  card_reminder_whatsapp = true,
  card_reminder_telegram = true,
  card_reminder_day = 7,  -- <-- Cambiar al día actual
  card_reminder_hour = 15  -- <-- Cambiar a la hora actual
WHERE user_id = '1a753dba-096e-4453-8ddb-87ace889a1f6';

-- 3. Verificar que el usuario aparece en la query
SELECT * FROM get_users_for_card_reminder(
  7,  -- día actual
  15,  -- hora actual
  '2026-02'  -- año-mes actual
);
```

#### B) Invocar la función manualmente:

**Desde Dashboard:**
1. Ir a Functions → monthly-card-reminder
2. Click en "Invoke Function"
3. Click "Send Request"

**Desde CLI:**
```bash
supabase functions invoke monthly-card-reminder \
  --headers "Authorization: Bearer <TU_SERVICE_ROLE_KEY>"
```

#### C) Verificar logs:

```bash
supabase functions logs monthly-card-reminder --tail 50
```

Deberías ver:
```
[CardReminder] Running at day 7, hour 15 (Argentina time)
[CardReminder] Found 1 users to notify
[CardReminder] WhatsApp sent to tu@email.com
```

#### D) Verificar notificación recibida:

- **WhatsApp**: Deberías recibir un mensaje
- **Telegram**: Deberías recibir un mensaje

#### E) Verificar log en base de datos:

```sql
SELECT *
FROM notification_logs
WHERE user_id = '1a753dba-096e-4453-8ddb-87ace889a1f6'
AND notification_type = 'card_reminder'
ORDER BY sent_at DESC
LIMIT 5;
```

---

## 🎨 Interfaz de Usuario

### Página: `/integraciones`

Nueva sección agregada: **"Recordatorio de tarjetas"**

**Campos configurables:**
- ✅ **Activar/Desactivar**: Toggle principal
- 📅 **Día del mes**: Selector numérico (1-28)
- ⏰ **Hora**: Selector de hora (0-23, Argentina)
- 📱 **Canales**: Checkboxes para WhatsApp y Telegram

**Comportamiento:**
- Solo muestra si el usuario tiene al menos 1 tarjeta de crédito
- Botón "Guardar cambios" aparece cuando hay cambios pendientes
- Muestra feedback de guardado exitoso

---

## 📊 Monitoreo

### Ver estadísticas de envíos:

```sql
-- Envíos exitosos por mes
SELECT
  year_month,
  channel,
  COUNT(*) as total_enviados,
  COUNT(*) FILTER (WHERE success = true) as exitosos,
  COUNT(*) FILTER (WHERE success = false) as fallidos
FROM notification_logs
WHERE notification_type = 'card_reminder'
GROUP BY year_month, channel
ORDER BY year_month DESC, channel;

-- Usuarios que recibieron este mes
SELECT
  p.email,
  p.full_name,
  nl.channel,
  nl.sent_at
FROM notification_logs nl
JOIN profiles p ON p.id = nl.user_id
WHERE nl.notification_type = 'card_reminder'
AND nl.year_month = '2026-02'  -- mes actual
AND nl.success = true
ORDER BY nl.sent_at DESC;

-- Errores recientes
SELECT
  nl.sent_at,
  p.email,
  nl.channel,
  nl.error_message
FROM notification_logs nl
JOIN profiles p ON p.id = nl.user_id
WHERE nl.notification_type = 'card_reminder'
AND nl.success = false
ORDER BY nl.sent_at DESC
LIMIT 20;
```

---

## 🔧 Troubleshooting

### La función no se ejecuta automáticamente

**Verificar cron job:**
```bash
supabase functions list
```

Deberías ver `monthly-card-reminder` con `cron: 0 * * * *`

**Re-configurar si es necesario:**
```bash
supabase functions schedule monthly-card-reminder --cron "0 * * * *"
```

### Los usuarios no reciben notificaciones

**1. Verificar que el usuario califica:**
```sql
SELECT * FROM get_users_for_card_reminder(
  EXTRACT(DAY FROM CURRENT_DATE),  -- día actual
  EXTRACT(HOUR FROM CURRENT_TIME),  -- hora actual
  TO_CHAR(CURRENT_DATE, 'YYYY-MM')  -- mes actual
);
```

**2. Verificar que no se envió este mes:**
```sql
SELECT * FROM notification_logs
WHERE user_id = 'USER_ID_AQUI'
AND notification_type = 'card_reminder'
AND year_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
```

**3. Verificar logs de la función:**
```bash
supabase functions logs monthly-card-reminder --tail 100
```

### Error: "WhatsApp API error" o "Telegram API error"

**Verificar secrets:**
```bash
# Listar secrets
supabase secrets list

# Deben estar:
# - WHATSAPP_ACCESS_TOKEN
# - WHATSAPP_PHONE_NUMBER_ID
# - TELEGRAM_BOT_TOKEN
```

**Re-configurar si es necesario:**
```bash
supabase secrets set WHATSAPP_ACCESS_TOKEN=xxx
supabase secrets set WHATSAPP_PHONE_NUMBER_ID=xxx
supabase secrets set TELEGRAM_BOT_TOKEN=xxx
```

---

## 📝 Mensaje que reciben los usuarios

```
👋 Hola Juan!

📅 *Recordatorio mensual*

Tenés 2 tarjetas de crédito configuradas.

Para que el sistema funcione correctamente el próximo mes, te recomendamos actualizar las fechas de:
• 📆 Cierre de resumen
• 💳 Vencimiento de pago

Podés hacerlo desde *Cashé > Ajustes > Tarjetas*

🤖 Este recordatorio se envía automáticamente cada mes. Podés configurarlo desde *Integraciones*.
```

---

## 🚀 Próximos pasos

- [ ] Agregar notificaciones Push (PWA)
- [ ] Permitir personalizar el mensaje
- [ ] Agregar recordatorio de backup mensual de datos
- [ ] Dashboard de analytics de notificaciones
