-- Migration: Add closing_date and due_date columns to accounts table
-- These store the full next closing/due dates for credit cards instead of just day numbers

-- Add new date columns
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS closing_date date;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS due_date date;

-- Migrate existing data: convert closing_day/due_day integers to full dates
-- Sets the next occurrence of that day from today
DO $$
DECLARE
  acc RECORD;
  next_closing date;
  next_due date;
BEGIN
  FOR acc IN SELECT id, closing_day, due_day FROM accounts WHERE is_credit_card = true AND closing_day IS NOT NULL
  LOOP
    -- Calculate next closing date
    IF EXTRACT(DAY FROM CURRENT_DATE) > acc.closing_day THEN
      next_closing := date_trunc('month', CURRENT_DATE) + interval '1 month' + (acc.closing_day - 1) * interval '1 day';
    ELSE
      next_closing := date_trunc('month', CURRENT_DATE) + (acc.closing_day - 1) * interval '1 day';
    END IF;

    -- Calculate next due date (if exists)
    next_due := NULL;
    IF acc.due_day IS NOT NULL THEN
      IF EXTRACT(DAY FROM CURRENT_DATE) > acc.due_day THEN
        next_due := date_trunc('month', CURRENT_DATE) + interval '1 month' + (acc.due_day - 1) * interval '1 day';
      ELSE
        next_due := date_trunc('month', CURRENT_DATE) + (acc.due_day - 1) * interval '1 day';
      END IF;
    END IF;

    UPDATE accounts SET closing_date = next_closing, due_date = next_due WHERE id = acc.id;
  END LOOP;
END $$;
