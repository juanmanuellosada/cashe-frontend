-- Migration: Add attachment fields to movements and transfers
-- Created: 2026-01-26

-- Agregar campos de adjuntos a movements
ALTER TABLE movements
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_name text;

-- Agregar campos de adjuntos a transfers
ALTER TABLE transfers
ADD COLUMN IF NOT EXISTS attachment_url text,
ADD COLUMN IF NOT EXISTS attachment_name text;

-- Comentarios para documentación
COMMENT ON COLUMN movements.attachment_url IS 'URL pública del archivo adjunto en Supabase Storage';
COMMENT ON COLUMN movements.attachment_name IS 'Nombre original del archivo adjunto';
COMMENT ON COLUMN transfers.attachment_url IS 'URL pública del archivo adjunto en Supabase Storage';
COMMENT ON COLUMN transfers.attachment_name IS 'Nombre original del archivo adjunto';
