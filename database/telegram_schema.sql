-- =============================================
-- TELEGRAM INTEGRATION SCHEMA FOR CASHÉ
-- Run this migration in Supabase SQL Editor
-- =============================================

-- Table: telegram_users
-- Links Telegram accounts with Cashé users
CREATE TABLE IF NOT EXISTS telegram_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  telegram_id bigint UNIQUE, -- Telegram user ID (numeric)
  telegram_username text, -- @username (optional)
  telegram_first_name text, -- User's first name from Telegram
  verified boolean DEFAULT false,
  verification_code text, -- 6-digit code
  verification_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT telegram_users_user_id_unique UNIQUE(user_id)
);

-- Table: telegram_pending_actions
-- Stores conversation state and pending confirmations
CREATE TABLE IF NOT EXISTS telegram_pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id uuid NOT NULL REFERENCES telegram_users(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'movement' | 'transfer' | 'query'
  action_data jsonb NOT NULL DEFAULT '{}', -- Flow state
  original_message text,
  status text DEFAULT 'pending', -- 'pending' | 'confirmed' | 'cancelled' | 'expired'
  expires_at timestamptz DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_id ON telegram_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_telegram_users_verification_code ON telegram_users(verification_code) WHERE verified = false;
CREATE INDEX IF NOT EXISTS idx_telegram_pending_actions_status ON telegram_pending_actions(telegram_user_id, status) WHERE status = 'pending';

-- RLS Policies
ALTER TABLE telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_pending_actions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own telegram link
CREATE POLICY "Users can view own telegram link" ON telegram_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own telegram link" ON telegram_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own telegram link" ON telegram_users
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own telegram link" ON telegram_users
  FOR DELETE USING (auth.uid() = user_id);

-- Pending actions - users can only see their own
CREATE POLICY "Users can view own pending actions" ON telegram_pending_actions
  FOR SELECT USING (
    telegram_user_id IN (
      SELECT id FROM telegram_users WHERE user_id = auth.uid()
    )
  );

-- Service role has full access (for Edge Function)
-- Note: Service role bypasses RLS by default

-- Function to auto-expire pending actions
CREATE OR REPLACE FUNCTION expire_telegram_pending_actions()
RETURNS trigger AS $$
BEGIN
  UPDATE telegram_pending_actions
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to clean up expired actions (runs on each insert)
DROP TRIGGER IF EXISTS trigger_expire_telegram_actions ON telegram_pending_actions;
CREATE TRIGGER trigger_expire_telegram_actions
  AFTER INSERT ON telegram_pending_actions
  EXECUTE FUNCTION expire_telegram_pending_actions();
