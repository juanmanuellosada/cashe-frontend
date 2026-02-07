-- ============================================
-- FUNCIÓN: Obtener usuarios para recordatorio
-- ============================================

CREATE OR REPLACE FUNCTION get_users_for_card_reminder(
  p_day INTEGER,
  p_hour INTEGER,
  p_year_month TEXT
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  whatsapp_phone TEXT,
  telegram_id BIGINT,
  reminder_whatsapp BOOLEAN,
  reminder_telegram BOOLEAN,
  card_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS user_id,
    p.email,
    p.full_name,
    w.phone_number AS whatsapp_phone,
    t.telegram_id,
    s.card_reminder_whatsapp AS reminder_whatsapp,
    s.card_reminder_telegram AS reminder_telegram,
    COUNT(DISTINCT a.id) AS card_count
  FROM profiles p
  INNER JOIN user_settings s ON s.user_id = p.id
  INNER JOIN accounts a ON a.user_id = p.id AND a.is_credit_card = true
  LEFT JOIN whatsapp_users w ON w.user_id = p.id AND w.verified = true
  LEFT JOIN telegram_users t ON t.user_id = p.id AND t.verified = true
  WHERE
    -- Recordatorios activados
    s.card_reminder_enabled = true
    -- Día y hora configurados
    AND s.card_reminder_day = p_day
    AND s.card_reminder_hour = p_hour
    -- Al menos un canal disponible
    AND (
      (s.card_reminder_whatsapp = true AND w.phone_number IS NOT NULL)
      OR (s.card_reminder_telegram = true AND t.telegram_id IS NOT NULL)
    )
    -- No enviado este mes aún
    AND NOT EXISTS (
      SELECT 1
      FROM notification_logs nl
      WHERE nl.user_id = p.id
        AND nl.notification_type = 'card_reminder'
        AND nl.year_month = p_year_month
        AND nl.success = true
    )
  GROUP BY
    p.id, p.email, p.full_name, w.phone_number, t.telegram_id,
    s.card_reminder_whatsapp, s.card_reminder_telegram
  HAVING COUNT(DISTINCT a.id) > 0; -- Solo usuarios con al menos 1 tarjeta
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentario
COMMENT ON FUNCTION get_users_for_card_reminder IS 'Obtiene usuarios que deben recibir recordatorio de tarjetas en un día/hora específico';
