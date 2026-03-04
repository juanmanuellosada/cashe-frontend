---
name: postgres-patterns
description: PostgreSQL/Supabase patterns for query optimization, schema design, indexing, and RLS security. Quick reference for database work.
---

# PostgreSQL Patterns - Cashe (Supabase)

## When to Activate

- Writing SQL queries or migrations
- Designing database schemas
- Troubleshooting slow queries
- Implementing Row Level Security
- Creating Supabase RPC functions

## Index Cheat Sheet

| Query Pattern | Index Type | Example |
|--------------|------------|---------|
| `WHERE col = value` | B-tree | `CREATE INDEX idx ON t (col)` |
| `WHERE a = x AND b > y` | Composite | `CREATE INDEX idx ON t (a, b)` |
| `WHERE jsonb @> '{}'` | GIN | `CREATE INDEX idx ON t USING gin (col)` |
| Time-series ranges | BRIN | `CREATE INDEX idx ON t USING brin (created_at)` |

## Data Type Reference

| Use Case | Correct Type | Avoid |
|----------|-------------|-------|
| IDs | `uuid` (gen_random_uuid) | `int`, `serial` |
| Strings | `text` | `varchar(255)` |
| Timestamps | `timestamptz` | `timestamp` |
| Money/amounts | `numeric` | `float`, `real` |
| Flags | `boolean` | `varchar`, `int` |

## Cashe-Specific Patterns

### RLS Policy (Optimized)
```sql
-- Use subquery pattern to avoid per-row function call
CREATE POLICY "Users own data" ON movements
  FOR ALL USING ((SELECT auth.uid()) = user_id);
```

### Account Balances RPC
```sql
-- Already exists: get_account_balances
-- Uses CTEs for movements and transfers in 1 query
-- Replaced N*4 queries pattern with 2 parallel queries
```

### Common Indexes for Cashe
```sql
CREATE INDEX idx_movements_user_date ON movements (user_id, date DESC);
CREATE INDEX idx_movements_user_type ON movements (user_id, type);
CREATE INDEX idx_transfers_user_date ON transfers (user_id, date DESC);
CREATE INDEX idx_categories_user_type ON categories (user_id, type);
CREATE INDEX idx_accounts_user ON accounts (user_id);
```

### Cursor Pagination
```sql
-- For movement lists with infinite scroll
SELECT * FROM movements
WHERE user_id = $1 AND date < $cursor_date
ORDER BY date DESC LIMIT 20;
```

### Batch Operations
```sql
-- GOOD: Multi-row insert for installment purchases
INSERT INTO movements (user_id, type, date, amount, account_id, category_id, installment_purchase_id, installment_number, total_installments)
VALUES
  ($1, 'expense', $2, $3, $4, $5, $6, 1, $7),
  ($1, 'expense', $2 + interval '1 month', $3, $4, $5, $6, 2, $7);
```

## Anti-Pattern Detection

```sql
-- Find unindexed foreign keys
SELECT conrelid::regclass, a.attname
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
  );

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
```

## Migration Safety

- Every change is a migration, never alter production manually
- New columns: nullable or with DEFAULT (never NOT NULL without default on existing tables)
- Indexes: CREATE INDEX CONCURRENTLY for existing tables
- Column removal: remove code first, drop column in next deploy
- Test migrations against production-sized data
