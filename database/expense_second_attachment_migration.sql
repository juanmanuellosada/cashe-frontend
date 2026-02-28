-- Migration: Add second attachment columns to movements table
-- Allows expenses to have 2 attachments (e.g., invoice + receipt)

ALTER TABLE movements ADD COLUMN IF NOT EXISTS attachment_url_2 text;
ALTER TABLE movements ADD COLUMN IF NOT EXISTS attachment_name_2 text;
