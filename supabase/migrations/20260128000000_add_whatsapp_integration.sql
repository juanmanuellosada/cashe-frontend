-- Tabla para vincular usuarios de WhatsApp con cuentas de Cashé
-- Permite que los usuarios registren movimientos por mensaje de WhatsApp
CREATE TABLE whatsapp_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone_number text UNIQUE NOT NULL, -- Formato: +5491123456789
  verified boolean DEFAULT false,
  verification_code text, -- Código de 6 dígitos durante vinculación
  verification_expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Un solo WhatsApp por usuario de Cashé
  UNIQUE(user_id)
);

-- Índices
CREATE INDEX idx_whatsapp_users_user_id ON whatsapp_users(user_id);
CREATE INDEX idx_whatsapp_users_phone ON whatsapp_users(phone_number);
CREATE INDEX idx_whatsapp_users_verification ON whatsapp_users(verification_code)
  WHERE verification_code IS NOT NULL;

-- RLS
ALTER TABLE whatsapp_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own whatsapp link"
ON whatsapp_users FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own whatsapp link"
ON whatsapp_users FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own whatsapp link"
ON whatsapp_users FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own whatsapp link"
ON whatsapp_users FOR DELETE
USING (auth.uid() = user_id);

-- Política para service_role (usado por Edge Functions)
CREATE POLICY "Service role full access whatsapp_users"
ON whatsapp_users FOR ALL
USING (auth.role() = 'service_role');

-- Tabla para acciones pendientes de confirmación
-- Cuando el usuario envía un mensaje, se parsea y se guarda aquí
-- El usuario debe confirmar con "sí" antes de que se ejecute
CREATE TABLE whatsapp_pending_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_user_id uuid NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'movement' | 'transfer' | 'query'
  action_data jsonb NOT NULL, -- Datos parseados por Claude
  original_message text, -- Mensaje original del usuario
  status text DEFAULT 'pending', -- 'pending' | 'confirmed' | 'cancelled' | 'expired'
  expires_at timestamp with time zone DEFAULT (now() + interval '10 minutes'),
  created_at timestamp with time zone DEFAULT now(),
  confirmed_at timestamp with time zone
);

-- Índices
CREATE INDEX idx_whatsapp_pending_user ON whatsapp_pending_actions(whatsapp_user_id);
CREATE INDEX idx_whatsapp_pending_status ON whatsapp_pending_actions(status)
  WHERE status = 'pending';
CREATE INDEX idx_whatsapp_pending_expires ON whatsapp_pending_actions(expires_at)
  WHERE status = 'pending';

-- RLS
ALTER TABLE whatsapp_pending_actions ENABLE ROW LEVEL SECURITY;

-- Solo service_role puede acceder (las Edge Functions usan service_role)
CREATE POLICY "Service role full access pending_actions"
ON whatsapp_pending_actions FOR ALL
USING (auth.role() = 'service_role');

-- Función para limpiar acciones expiradas (opcional, ejecutar con cron)
CREATE OR REPLACE FUNCTION cleanup_expired_whatsapp_actions()
RETURNS void AS $$
BEGIN
  UPDATE whatsapp_pending_actions
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
