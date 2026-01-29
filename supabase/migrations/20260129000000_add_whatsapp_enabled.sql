-- Add whatsapp_enabled flag to profiles table
-- This controls access to the WhatsApp bot integration

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN profiles.whatsapp_enabled IS 'Whether user has access to WhatsApp bot integration';
