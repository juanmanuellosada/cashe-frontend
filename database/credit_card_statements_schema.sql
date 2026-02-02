-- Migración: Tabla para resúmenes de tarjeta de crédito
-- Esta tabla trackea los resúmenes mensuales de cada tarjeta

-- Crear tabla credit_card_statements
CREATE TABLE IF NOT EXISTS credit_card_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  statement_month date NOT NULL,  -- Primer día del mes del resumen
  closing_date date,              -- Fecha de cierre del resumen
  due_date date,                  -- Fecha de vencimiento
  total_amount numeric DEFAULT 0, -- Total del resumen (calculado de movements)
  stamp_tax numeric DEFAULT 0,    -- Impuesto de sellos
  paid boolean DEFAULT false,     -- Si está pagado
  paid_date date,                 -- Fecha en que se pagó
  paid_from_account_id uuid REFERENCES accounts(id), -- Cuenta desde donde se pagó
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(account_id, statement_month)
);

-- Índices para búsquedas comunes
CREATE INDEX IF NOT EXISTS idx_credit_card_statements_user_id
  ON credit_card_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_statements_account_id
  ON credit_card_statements(account_id);
CREATE INDEX IF NOT EXISTS idx_credit_card_statements_month
  ON credit_card_statements(statement_month);
CREATE INDEX IF NOT EXISTS idx_credit_card_statements_unpaid
  ON credit_card_statements(account_id, paid) WHERE paid = false;

-- Habilitar RLS
ALTER TABLE credit_card_statements ENABLE ROW LEVEL SECURITY;

-- Política: usuarios solo pueden ver/modificar sus propios resúmenes
CREATE POLICY "Users can manage their own statements"
  ON credit_card_statements
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_credit_card_statement_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_credit_card_statement_timestamp
  BEFORE UPDATE ON credit_card_statements
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_card_statement_updated_at();

-- Función para obtener o crear resumen del mes actual
CREATE OR REPLACE FUNCTION get_or_create_current_statement(
  p_user_id uuid,
  p_account_id uuid
)
RETURNS uuid AS $$
DECLARE
  v_statement_id uuid;
  v_statement_month date;
  v_closing_day integer;
BEGIN
  -- Obtener día de cierre de la tarjeta
  SELECT closing_day INTO v_closing_day
  FROM accounts
  WHERE id = p_account_id AND user_id = p_user_id AND is_credit_card = true;

  IF v_closing_day IS NULL THEN
    RAISE EXCEPTION 'La cuenta no es una tarjeta de crédito o no existe';
  END IF;

  -- Calcular el mes del resumen basado en la fecha actual y día de cierre
  IF EXTRACT(DAY FROM CURRENT_DATE) > v_closing_day THEN
    v_statement_month := date_trunc('month', CURRENT_DATE);
  ELSE
    v_statement_month := date_trunc('month', CURRENT_DATE - interval '1 month');
  END IF;

  -- Buscar resumen existente
  SELECT id INTO v_statement_id
  FROM credit_card_statements
  WHERE account_id = p_account_id AND statement_month = v_statement_month;

  -- Si no existe, crearlo
  IF v_statement_id IS NULL THEN
    INSERT INTO credit_card_statements (user_id, account_id, statement_month, closing_date, due_date)
    VALUES (
      p_user_id,
      p_account_id,
      v_statement_month,
      v_statement_month + (v_closing_day || ' days')::interval,
      v_statement_month + ((v_closing_day + 10) || ' days')::interval -- Vencimiento ~10 días después del cierre
    )
    RETURNING id INTO v_statement_id;
  END IF;

  RETURN v_statement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para calcular el total de un resumen
CREATE OR REPLACE FUNCTION calculate_statement_total(
  p_statement_id uuid
)
RETURNS numeric AS $$
DECLARE
  v_total numeric;
  v_stamp_tax numeric;
  v_statement record;
BEGIN
  -- Obtener datos del resumen
  SELECT * INTO v_statement
  FROM credit_card_statements
  WHERE id = p_statement_id;

  IF v_statement IS NULL THEN
    RETURN 0;
  END IF;

  -- Sumar todos los gastos del período del resumen para esta tarjeta
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM movements
  WHERE account_id = v_statement.account_id
    AND type = 'expense'
    AND date >= v_statement.statement_month
    AND date < (v_statement.statement_month + interval '1 month');

  -- Agregar impuesto de sellos
  v_total := v_total + COALESCE(v_statement.stamp_tax, 0);

  -- Actualizar el total en el resumen
  UPDATE credit_card_statements
  SET total_amount = v_total, updated_at = now()
  WHERE id = p_statement_id;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
