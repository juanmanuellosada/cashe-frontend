-- Agregar campos de cuota de storage a user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS storage_used_bytes bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_quota_bytes bigint DEFAULT 104857600; -- 100MB
