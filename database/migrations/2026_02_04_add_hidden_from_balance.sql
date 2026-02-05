-- ============================================
-- MIGRACIÓN: Agregar columna hidden_from_balance a accounts
-- Fecha: 2026-02-04
-- Descripción: Permite ocultar cuentas del balance general
-- ============================================

-- Agregar columna hidden_from_balance
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS hidden_from_balance boolean DEFAULT false;

-- Comentario descriptivo
COMMENT ON COLUMN accounts.hidden_from_balance IS 'Si es true, la cuenta no se incluye en el cálculo del balance general';
