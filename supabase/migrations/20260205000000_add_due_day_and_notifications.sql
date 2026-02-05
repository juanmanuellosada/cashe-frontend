-- ============================================
-- MIGRATION: Add due_day to accounts and notification system
-- Date: 2026-02-05
-- Description:
--   1. Add due_day column to accounts for credit card payment due dates
--   2. Create notification_preferences table for user notification settings
--   3. Create notification_log table to track sent notifications
--   4. Update handle_new_user trigger to initialize notification_preferences
-- ============================================

-- ============================================
-- 1. Add due_day column to accounts
-- ============================================
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS due_day integer;

-- Add comment for documentation
COMMENT ON COLUMN accounts.due_day IS 'Day of the month when credit card payment is due (1-31)';

-- ============================================
-- 2. Create notification_preferences table
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notify_push boolean DEFAULT true,
    notify_telegram boolean DEFAULT false,
    notify_whatsapp boolean DEFAULT false,
    notification_hour integer DEFAULT 9, -- Hour in 24h format, Argentina time (UTC-3)
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id)
);

-- Add comment for documentation
COMMENT ON TABLE notification_preferences IS 'User preferences for credit card due date notifications';
COMMENT ON COLUMN notification_preferences.notification_hour IS 'Hour to send notifications (0-23), in Argentina time (UTC-3)';

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policy for users to manage their own preferences
CREATE POLICY "Users can manage own notification_preferences"
    ON notification_preferences
    FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- 3. Create notification_log table
-- ============================================
CREATE TABLE IF NOT EXISTS notification_log (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    notification_type text NOT NULL, -- 'push' | 'telegram' | 'whatsapp'
    message text,
    sent_at timestamp with time zone DEFAULT now(),
    due_date date NOT NULL -- The due date this notification is for
);

-- Add comment for documentation
COMMENT ON TABLE notification_log IS 'Log of sent credit card due date notifications to prevent duplicates';

-- Enable RLS
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- RLS policy for users to view their own logs
CREATE POLICY "Users can view own notification_log"
    ON notification_log
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS policy for service role to insert (edge function)
CREATE POLICY "Service can insert notification_log"
    ON notification_log
    FOR INSERT
    WITH CHECK (true);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_notification_log_user ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_account ON notification_log(account_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_due_date ON notification_log(due_date);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- ============================================
-- 4. Update handle_new_user trigger
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');

    -- Create user settings
    INSERT INTO public.user_settings (user_id)
    VALUES (new.id);

    -- Create notification preferences with defaults
    INSERT INTO public.notification_preferences (user_id)
    VALUES (new.id);

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Initialize notification_preferences for existing users
-- ============================================
INSERT INTO notification_preferences (user_id)
SELECT p.id FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM notification_preferences np WHERE np.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 6. Schedule cron job for due date notifications
-- Note: This requires the pg_cron extension to be enabled
-- Run every hour at minute 0
-- ============================================
-- To enable pg_cron, run this in the Supabase dashboard SQL editor:
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- GRANT USAGE ON SCHEMA cron TO postgres;

-- Schedule the cron job (uncomment and run after enabling pg_cron)
-- SELECT cron.schedule(
--     'send-due-date-notifications',
--     '0 * * * *', -- Every hour at minute 0
--     $$
--     SELECT net.http_post(
--         url := current_setting('app.settings.supabase_url') || '/functions/v1/send-due-date-notifications',
--         headers := jsonb_build_object(
--             'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
--             'Content-Type', 'application/json'
--         ),
--         body := '{}'::jsonb
--     );
--     $$
-- );
