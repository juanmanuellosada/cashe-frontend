-- =============================================
-- SCHEDULED TRANSACTIONS SCHEMA FOR CASHE
-- Run this migration in Supabase SQL Editor
-- =============================================

-- ============================================
-- TABLA: scheduled_transactions
-- Transacciones programadas para una fecha futura
-- ============================================
CREATE TABLE IF NOT EXISTS scheduled_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  scheduled_date date NOT NULL,
  amount numeric NOT NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  to_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL, -- Para transfers
  to_amount numeric, -- Para transfers multi-moneda
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  note text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  notification_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================
-- TABLA: push_subscriptions
-- Suscripciones de push notifications para PWA
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

-- ============================================
-- INDICES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_user ON scheduled_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_date ON scheduled_transactions(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_status ON scheduled_transactions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_transactions_pending ON scheduled_transactions(user_id, status, scheduled_date)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE scheduled_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies for scheduled_transactions
CREATE POLICY "Users can view own scheduled transactions" ON scheduled_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled transactions" ON scheduled_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled transactions" ON scheduled_transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled transactions" ON scheduled_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Policies for push_subscriptions
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER: Actualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_scheduled_transactions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scheduled_transactions_updated_at
  BEFORE UPDATE ON scheduled_transactions
  FOR EACH ROW EXECUTE FUNCTION update_scheduled_transactions_updated_at();
