-- ============================================
-- PREFERENCIAS DE NOTIFICACIONES
-- ============================================

-- Agregar campos a user_settings para notificaciones
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS card_reminder_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS card_reminder_whatsapp BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS card_reminder_telegram BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS card_reminder_day INTEGER DEFAULT 10 CHECK (card_reminder_day >= 1 AND card_reminder_day <= 28),
ADD COLUMN IF NOT EXISTS card_reminder_hour INTEGER DEFAULT 9 CHECK (card_reminder_hour >= 0 AND card_reminder_hour <= 23);

COMMENT ON COLUMN user_settings.card_reminder_enabled IS 'Si está activado el recordatorio mensual de actualizar fechas de tarjetas';
COMMENT ON COLUMN user_settings.card_reminder_whatsapp IS 'Enviar recordatorio por WhatsApp si está vinculado';
COMMENT ON COLUMN user_settings.card_reminder_telegram IS 'Enviar recordatorio por Telegram si está vinculado';
COMMENT ON COLUMN user_settings.card_reminder_day IS 'Día del mes para enviar el recordatorio (1-28)';
COMMENT ON COLUMN user_settings.card_reminder_hour IS 'Hora del día para enviar el recordatorio (0-23, hora de Argentina)';

-- Tabla para registrar notificaciones enviadas (evitar duplicados)
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'card_reminder', etc.
  channel TEXT NOT NULL, -- 'whatsapp', 'telegram', 'pwa'
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  year_month TEXT NOT NULL, -- '2026-02' para evitar enviar múltiples veces en el mismo mes
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  -- Índices para consultas eficientes
  CONSTRAINT unique_notification_per_month UNIQUE (user_id, notification_type, year_month, channel)
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type_month ON notification_logs(notification_type, year_month);

-- RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification logs"
  ON notification_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Solo el sistema puede insertar logs (desde edge functions)
-- No permitir INSERT desde el cliente por seguridad
