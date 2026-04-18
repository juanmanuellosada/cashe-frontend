-- ============================================================
-- Performance pack: composite indexes + aggregate RPCs
-- Applied to prod via MCP on 2026-04-17.
-- ============================================================

-- 1) Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_movements_user_type_date_nonfuture
  ON public.movements (user_id, type, date)
  WHERE (is_future IS NULL OR is_future = false);

CREATE INDEX IF NOT EXISTS idx_movements_user_account_type
  ON public.movements (user_id, account_id, type);

CREATE INDEX IF NOT EXISTS idx_movements_user_created
  ON public.movements (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_accounts_user_hidden
  ON public.accounts (user_id, hidden_from_balance);

CREATE INDEX IF NOT EXISTS idx_installment_purchases_user
  ON public.installment_purchases (user_id);

-- 2) RPC: get_recent_usage — aggregate usage counts server-side
CREATE OR REPLACE FUNCTION public.get_recent_usage(p_user_id uuid)
RETURNS TABLE (
  recent_account_ids uuid[],
  recent_category_ids uuid[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH account_counts AS (
    SELECT account_id, COUNT(*) AS cnt FROM (
      SELECT account_id FROM movements WHERE user_id = p_user_id AND account_id IS NOT NULL
      UNION ALL
      SELECT from_account_id AS account_id FROM transfers WHERE user_id = p_user_id AND from_account_id IS NOT NULL
      UNION ALL
      SELECT to_account_id AS account_id FROM transfers WHERE user_id = p_user_id AND to_account_id IS NOT NULL
    ) t
    GROUP BY account_id
  ),
  category_counts AS (
    SELECT category_id, COUNT(*) AS cnt
    FROM movements
    WHERE user_id = p_user_id AND category_id IS NOT NULL
    GROUP BY category_id
  )
  SELECT
    COALESCE(ARRAY(
      SELECT account_id FROM account_counts ORDER BY cnt DESC
    ), ARRAY[]::uuid[]) AS recent_account_ids,
    COALESCE(ARRAY(
      SELECT category_id FROM category_counts ORDER BY cnt DESC
    ), ARRAY[]::uuid[]) AS recent_category_ids;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_usage(uuid) TO authenticated;

-- 3) RPC: get_filtered_dashboard — aggregate ingresos/gastos by currency
CREATE OR REPLACE FUNCTION public.get_filtered_dashboard(
  p_user_id uuid,
  p_from date,
  p_to date
)
RETURNS TABLE (
  ingresos_ars numeric,
  ingresos_usd numeric,
  gastos_ars numeric,
  gastos_usd numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN m.type = 'income'  AND a.currency = 'ARS' THEN m.amount END), 0) AS ingresos_ars,
    COALESCE(SUM(CASE WHEN m.type = 'income'  AND a.currency = 'USD' THEN m.amount END), 0) AS ingresos_usd,
    COALESCE(SUM(CASE WHEN m.type = 'expense' AND a.currency = 'ARS' THEN m.amount END), 0) AS gastos_ars,
    COALESCE(SUM(CASE WHEN m.type = 'expense' AND a.currency = 'USD' THEN m.amount END), 0) AS gastos_usd
  FROM movements m
  LEFT JOIN accounts a ON a.id = m.account_id
  WHERE m.user_id = p_user_id
    AND (m.is_future IS NULL OR m.is_future = false)
    AND m.date >= COALESCE(p_from, '1900-01-01'::date)
    AND m.date <= COALESCE(p_to,   '2100-12-31'::date);
$$;

GRANT EXECUTE ON FUNCTION public.get_filtered_dashboard(uuid, date, date) TO authenticated;
