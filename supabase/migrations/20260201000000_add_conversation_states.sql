-- Tabla para estados de conversación del NLP (TTL 10 minutos)
-- Almacena el estado de confirmación/edición de operaciones pendientes

CREATE TABLE conversation_states (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    platform text NOT NULL CHECK (platform IN ('telegram', 'whatsapp')),
    platform_user_id text NOT NULL,
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    state text NOT NULL CHECK (state IN (
        'awaiting_confirmation',
        'awaiting_edit_field',
        'awaiting_edit_value',
        'awaiting_account_selection',
        'awaiting_category_selection',
        'awaiting_disambiguation'
    )),
    intent text NOT NULL CHECK (intent IN (
        'REGISTRAR_GASTO',
        'REGISTRAR_INGRESO',
        'REGISTRAR_TRANSFERENCIA',
        'CONSULTAR_SALDO',
        'CONSULTAR_GASTOS',
        'ULTIMOS_MOVIMIENTOS',
        'RESUMEN_MES',
        'CONSULTAR_PRESUPUESTOS',
        'AYUDA'
    )),
    parsed_data jsonb NOT NULL DEFAULT '{}',
    edit_field text,
    disambiguation_options jsonb,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone DEFAULT (now() + interval '10 minutes'),

    UNIQUE(platform, platform_user_id)
);

-- Índice para búsqueda rápida por plataforma y usuario
CREATE INDEX idx_conversation_states_lookup
ON conversation_states(platform, platform_user_id);

-- Índice para limpieza de estados expirados
CREATE INDEX idx_conversation_states_expires
ON conversation_states(expires_at);

-- Función para limpiar estados expirados
CREATE OR REPLACE FUNCTION cleanup_expired_conversation_states()
RETURNS void AS $$
BEGIN
    DELETE FROM conversation_states WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Función para obtener o crear estado de conversación
CREATE OR REPLACE FUNCTION upsert_conversation_state(
    p_platform text,
    p_platform_user_id text,
    p_user_id uuid,
    p_state text,
    p_intent text,
    p_parsed_data jsonb,
    p_edit_field text DEFAULT NULL,
    p_disambiguation_options jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO conversation_states (
        platform, platform_user_id, user_id, state, intent,
        parsed_data, edit_field, disambiguation_options, expires_at
    )
    VALUES (
        p_platform, p_platform_user_id, p_user_id, p_state, p_intent,
        p_parsed_data, p_edit_field, p_disambiguation_options,
        now() + interval '10 minutes'
    )
    ON CONFLICT (platform, platform_user_id)
    DO UPDATE SET
        state = EXCLUDED.state,
        intent = EXCLUDED.intent,
        parsed_data = EXCLUDED.parsed_data,
        edit_field = EXCLUDED.edit_field,
        disambiguation_options = EXCLUDED.disambiguation_options,
        expires_at = now() + interval '10 minutes'
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- RLS: Permitir a los usuarios ver solo sus propios estados
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversation states"
ON conversation_states FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all conversation states"
ON conversation_states FOR ALL
USING (true)
WITH CHECK (true);

-- Comentarios
COMMENT ON TABLE conversation_states IS 'Estados de conversación para el sistema NLP de bots (Telegram/WhatsApp)';
COMMENT ON COLUMN conversation_states.platform IS 'Plataforma de mensajería: telegram o whatsapp';
COMMENT ON COLUMN conversation_states.platform_user_id IS 'ID del usuario en la plataforma (telegram_id o phone_number)';
COMMENT ON COLUMN conversation_states.state IS 'Estado actual del flujo de confirmación/edición';
COMMENT ON COLUMN conversation_states.intent IS 'Intención detectada del mensaje del usuario';
COMMENT ON COLUMN conversation_states.parsed_data IS 'Datos parseados del mensaje (monto, cuenta, categoría, etc)';
COMMENT ON COLUMN conversation_states.edit_field IS 'Campo que el usuario está editando (si aplica)';
COMMENT ON COLUMN conversation_states.disambiguation_options IS 'Opciones cuando hay ambigüedad (múltiples cuentas, etc)';
COMMENT ON COLUMN conversation_states.expires_at IS 'Fecha de expiración del estado (10 minutos por defecto)';
