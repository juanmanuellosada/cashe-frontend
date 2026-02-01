-- Tabla para deduplicación de mensajes de WhatsApp
-- Previene procesar el mismo mensaje múltiples veces cuando hay instancias paralelas

CREATE TABLE IF NOT EXISTS whatsapp_processed_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text NOT NULL,
  phone_number text NOT NULL,
  processed_at timestamptz DEFAULT now(),
  UNIQUE(message_id, phone_number)
);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_whatsapp_processed_messages_lookup
ON whatsapp_processed_messages(message_id, phone_number);

-- Permitir acceso desde Edge Functions
ALTER TABLE whatsapp_processed_messages ENABLE ROW LEVEL SECURITY;

-- Policy para que las Edge Functions (con service role) puedan acceder
CREATE POLICY "Service role full access" ON whatsapp_processed_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);
