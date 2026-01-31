-- ============================================
-- MIGRACIÓN: Transacciones Recurrentes y Futuras
-- Fecha: 2026-01-31
-- ============================================

-- ============================================
-- TABLA: argentine_holidays
-- Feriados argentinos para cálculo de días hábiles
-- ============================================
CREATE TABLE argentine_holidays (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'national', -- 'national', 'bridge', 'non_working'
  year integer GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)) STORED,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_holidays_date ON argentine_holidays(date);
CREATE INDEX idx_holidays_year ON argentine_holidays(year);

-- Insertar feriados 2025-2027 (se pueden agregar más años después)
INSERT INTO argentine_holidays (date, name, type) VALUES
-- 2025
('2025-01-01', 'Año Nuevo', 'national'),
('2025-02-24', 'Carnaval', 'national'),
('2025-02-25', 'Carnaval', 'national'),
('2025-03-24', 'Día de la Memoria', 'national'),
('2025-04-02', 'Día del Veterano', 'national'),
('2025-04-18', 'Viernes Santo', 'national'),
('2025-05-01', 'Día del Trabajador', 'national'),
('2025-05-25', 'Día de la Revolución de Mayo', 'national'),
('2025-06-16', 'Paso a la Inmortalidad del Gral. Güemes', 'national'),
('2025-06-20', 'Paso a la Inmortalidad del Gral. Belgrano', 'national'),
('2025-07-09', 'Día de la Independencia', 'national'),
('2025-08-18', 'Paso a la Inmortalidad del Gral. San Martín', 'national'),
('2025-10-12', 'Día del Respeto a la Diversidad Cultural', 'national'),
('2025-11-20', 'Día de la Soberanía Nacional', 'national'),
('2025-12-08', 'Día de la Inmaculada Concepción', 'national'),
('2025-12-25', 'Navidad', 'national'),
-- 2026
('2026-01-01', 'Año Nuevo', 'national'),
('2026-02-16', 'Carnaval', 'national'),
('2026-02-17', 'Carnaval', 'national'),
('2026-03-24', 'Día de la Memoria', 'national'),
('2026-04-02', 'Día del Veterano', 'national'),
('2026-04-03', 'Viernes Santo', 'national'),
('2026-05-01', 'Día del Trabajador', 'national'),
('2026-05-25', 'Día de la Revolución de Mayo', 'national'),
('2026-06-15', 'Paso a la Inmortalidad del Gral. Güemes', 'national'),
('2026-06-20', 'Paso a la Inmortalidad del Gral. Belgrano', 'national'),
('2026-07-09', 'Día de la Independencia', 'national'),
('2026-08-17', 'Paso a la Inmortalidad del Gral. San Martín', 'national'),
('2026-10-12', 'Día del Respeto a la Diversidad Cultural', 'national'),
('2026-11-23', 'Día de la Soberanía Nacional', 'national'),
('2026-12-08', 'Día de la Inmaculada Concepción', 'national'),
('2026-12-25', 'Navidad', 'national'),
-- 2027
('2027-01-01', 'Año Nuevo', 'national'),
('2027-02-08', 'Carnaval', 'national'),
('2027-02-09', 'Carnaval', 'national'),
('2027-03-24', 'Día de la Memoria', 'national'),
('2027-03-26', 'Viernes Santo', 'national'),
('2027-04-02', 'Día del Veterano', 'national'),
('2027-05-01', 'Día del Trabajador', 'national'),
('2027-05-25', 'Día de la Revolución de Mayo', 'national'),
('2027-06-20', 'Paso a la Inmortalidad del Gral. Belgrano', 'national'),
('2027-06-21', 'Paso a la Inmortalidad del Gral. Güemes', 'national'),
('2027-07-09', 'Día de la Independencia', 'national'),
('2027-08-16', 'Paso a la Inmortalidad del Gral. San Martín', 'national'),
('2027-10-11', 'Día del Respeto a la Diversidad Cultural', 'national'),
('2027-11-22', 'Día de la Soberanía Nacional', 'national'),
('2027-12-08', 'Día de la Inmaculada Concepción', 'national'),
('2027-12-25', 'Navidad', 'national');

-- ============================================
-- TABLA: recurring_transactions
-- Configuración de transacciones recurrentes
-- ============================================
CREATE TABLE recurring_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Información básica
  name text NOT NULL,
  description text,
  amount numeric(15,2) NOT NULL,
  currency text NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),

  -- Tipo de transacción
  type text NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),

  -- Para income/expense
  account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,

  -- Para transfers
  from_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  to_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  to_amount numeric(15,2), -- Para transferencias entre monedas distintas

  -- Configuración de frecuencia (simplificado con JSONB)
  -- Ejemplos:
  -- {"type": "monthly", "day": 15}
  -- {"type": "weekly", "dayOfWeek": 1} (1=lunes)
  -- {"type": "yearly", "month": 3, "day": 15}
  -- {"type": "custom_days", "interval": 45}
  frequency jsonb NOT NULL,

  -- Hora de ejecución (para cron)
  execution_hour integer NOT NULL DEFAULT 9 CHECK (execution_hour >= 0 AND execution_hour <= 23),

  -- Manejo de días no hábiles
  -- 'as_is' = se crea igual
  -- 'previous_business_day' = día hábil anterior
  -- 'next_business_day' = día hábil siguiente
  weekend_handling text NOT NULL DEFAULT 'as_is'
    CHECK (weekend_handling IN ('as_is', 'previous_business_day', 'next_business_day')),

  -- Fechas de vigencia
  start_date date NOT NULL,
  end_date date, -- NULL = infinito

  -- Modo de creación
  -- 'automatic' = se crea solo
  -- 'bot_confirmation' = requiere confirmación por bot
  -- 'manual_confirmation' = requiere confirmación en web
  creation_mode text NOT NULL DEFAULT 'automatic'
    CHECK (creation_mode IN ('automatic', 'bot_confirmation', 'manual_confirmation')),

  -- Bot preferido (si creation_mode = 'bot_confirmation')
  preferred_bot text CHECK (preferred_bot IN ('telegram', 'whatsapp')),

  -- Estado
  is_active boolean NOT NULL DEFAULT true,
  is_paused boolean NOT NULL DEFAULT false,

  -- Tracking
  last_generated_date date, -- Última fecha en que se generó un movimiento
  next_execution_date date, -- Próxima fecha calculada

  -- Para gastos en tarjetas de crédito (aplica a cada resumen)
  is_credit_card_recurring boolean NOT NULL DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_recurring_user_id ON recurring_transactions(user_id);
CREATE INDEX idx_recurring_active ON recurring_transactions(user_id, is_active, is_paused);
CREATE INDEX idx_recurring_next_execution ON recurring_transactions(next_execution_date)
  WHERE is_active = true AND is_paused = false;
CREATE INDEX idx_recurring_account ON recurring_transactions(account_id);
CREATE INDEX idx_recurring_category ON recurring_transactions(category_id);

-- RLS
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recurring transactions"
ON recurring_transactions FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access recurring_transactions"
ON recurring_transactions FOR ALL
USING (auth.role() = 'service_role');

-- ============================================
-- TABLA: recurring_occurrences
-- Historial de ocurrencias generadas
-- ============================================
CREATE TABLE recurring_occurrences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recurring_id uuid NOT NULL REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Fecha programada original
  scheduled_date date NOT NULL,

  -- Estado de la ocurrencia
  -- 'pending' = esperando confirmación
  -- 'confirmed' = movimiento creado
  -- 'skipped' = saltada por el usuario
  -- 'cancelled' = cancelada (expiró sin confirmar)
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'skipped', 'cancelled')),

  -- Referencia al movimiento/transferencia creado
  movement_id uuid REFERENCES movements(id) ON DELETE SET NULL,
  transfer_id uuid REFERENCES transfers(id) ON DELETE SET NULL,

  -- Monto efectivo (puede diferir si se editó al confirmar)
  actual_amount numeric(15,2),

  -- Tracking
  confirmed_at timestamptz,
  confirmed_via text, -- 'auto', 'telegram', 'whatsapp', 'web'
  skipped_at timestamptz,

  -- Notificación enviada
  notification_sent boolean DEFAULT false,
  notification_sent_at timestamptz,

  created_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX idx_occurrences_recurring ON recurring_occurrences(recurring_id);
CREATE INDEX idx_occurrences_user_status ON recurring_occurrences(user_id, status);
CREATE INDEX idx_occurrences_pending ON recurring_occurrences(user_id, status, scheduled_date)
  WHERE status = 'pending';
CREATE INDEX idx_occurrences_movement ON recurring_occurrences(movement_id)
  WHERE movement_id IS NOT NULL;
CREATE INDEX idx_occurrences_transfer ON recurring_occurrences(transfer_id)
  WHERE transfer_id IS NOT NULL;

-- RLS
ALTER TABLE recurring_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own occurrences"
ON recurring_occurrences FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access occurrences"
ON recurring_occurrences FOR ALL
USING (auth.role() = 'service_role');

-- ============================================
-- MODIFICAR TABLA: movements
-- Agregar campos para futuras y recurrentes
-- ============================================

-- Campo para indicar si es transacción futura (aún no efectuada)
ALTER TABLE movements ADD COLUMN IF NOT EXISTS is_future boolean DEFAULT false;

-- Campo para referencia al recurrente que lo generó
ALTER TABLE movements ADD COLUMN IF NOT EXISTS recurring_occurrence_id uuid
  REFERENCES recurring_occurrences(id) ON DELETE SET NULL;

-- Índice para transacciones futuras
CREATE INDEX IF NOT EXISTS idx_movements_future ON movements(user_id, is_future, date)
  WHERE is_future = true;

-- Índice para movimientos de recurrentes
CREATE INDEX IF NOT EXISTS idx_movements_recurring ON movements(recurring_occurrence_id)
  WHERE recurring_occurrence_id IS NOT NULL;

-- ============================================
-- MODIFICAR TABLA: transfers
-- Agregar campos para futuras y recurrentes
-- ============================================

-- Campo para indicar si es transferencia futura
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS is_future boolean DEFAULT false;

-- Campo para referencia al recurrente
ALTER TABLE transfers ADD COLUMN IF NOT EXISTS recurring_occurrence_id uuid
  REFERENCES recurring_occurrences(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_transfers_future ON transfers(user_id, is_future, date)
  WHERE is_future = true;

CREATE INDEX IF NOT EXISTS idx_transfers_recurring ON transfers(recurring_occurrence_id)
  WHERE recurring_occurrence_id IS NOT NULL;

-- ============================================
-- FUNCIÓN: Verificar si una fecha es día hábil
-- ============================================
CREATE OR REPLACE FUNCTION is_business_day(check_date date)
RETURNS boolean AS $$
DECLARE
  day_of_week integer;
BEGIN
  -- Obtener día de la semana (0=domingo, 6=sábado)
  day_of_week := EXTRACT(DOW FROM check_date);

  -- Si es fin de semana, no es hábil
  IF day_of_week IN (0, 6) THEN
    RETURN false;
  END IF;

  -- Si es feriado, no es hábil
  IF EXISTS (SELECT 1 FROM argentine_holidays WHERE date = check_date) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN: Obtener próximo día hábil
-- ============================================
CREATE OR REPLACE FUNCTION get_next_business_day(from_date date)
RETURNS date AS $$
DECLARE
  result_date date := from_date;
BEGIN
  WHILE NOT is_business_day(result_date) LOOP
    result_date := result_date + 1;
  END LOOP;
  RETURN result_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN: Obtener día hábil anterior
-- ============================================
CREATE OR REPLACE FUNCTION get_previous_business_day(from_date date)
RETURNS date AS $$
DECLARE
  result_date date := from_date;
BEGIN
  WHILE NOT is_business_day(result_date) LOOP
    result_date := result_date - 1;
  END LOOP;
  RETURN result_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN: Ajustar fecha por día no hábil
-- ============================================
CREATE OR REPLACE FUNCTION adjust_for_non_business_day(
  target_date date,
  handling text
)
RETURNS date AS $$
BEGIN
  IF handling = 'as_is' OR is_business_day(target_date) THEN
    RETURN target_date;
  ELSIF handling = 'previous_business_day' THEN
    RETURN get_previous_business_day(target_date);
  ELSIF handling = 'next_business_day' THEN
    RETURN get_next_business_day(target_date);
  ELSE
    RETURN target_date;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN: Calcular próxima fecha de ejecución
-- ============================================
CREATE OR REPLACE FUNCTION calculate_next_execution_date(
  frequency jsonb,
  from_date date,
  weekend_handling text
)
RETURNS date AS $$
DECLARE
  freq_type text;
  result_date date;
  target_day integer;
  target_month integer;
  interval_days integer;
  day_of_week integer;
BEGIN
  freq_type := frequency->>'type';

  CASE freq_type
    -- Diario
    WHEN 'daily' THEN
      result_date := from_date + 1;

    -- Semanal (dayOfWeek: 0=domingo, 1=lunes, ..., 6=sábado)
    WHEN 'weekly' THEN
      day_of_week := COALESCE((frequency->>'dayOfWeek')::integer, 1);
      result_date := from_date + 1;
      WHILE EXTRACT(DOW FROM result_date) != day_of_week LOOP
        result_date := result_date + 1;
      END LOOP;

    -- Quincenal
    WHEN 'biweekly' THEN
      day_of_week := COALESCE((frequency->>'dayOfWeek')::integer, 1);
      result_date := from_date + 7; -- Empezar una semana después
      WHILE EXTRACT(DOW FROM result_date) != day_of_week LOOP
        result_date := result_date + 1;
      END LOOP;
      -- Asegurar que sea al menos 2 semanas después
      IF result_date < from_date + 14 THEN
        result_date := result_date + 7;
      END IF;

    -- Mensual
    WHEN 'monthly' THEN
      target_day := COALESCE((frequency->>'day')::integer, 1);
      result_date := (from_date + interval '1 month')::date;
      -- Ajustar al día del mes deseado
      result_date := make_date(
        EXTRACT(YEAR FROM result_date)::integer,
        EXTRACT(MONTH FROM result_date)::integer,
        LEAST(target_day, (DATE_TRUNC('month', result_date) + interval '1 month' - interval '1 day')::date - DATE_TRUNC('month', result_date)::date + 1)
      );

    -- Bimestral
    WHEN 'bimonthly' THEN
      target_day := COALESCE((frequency->>'day')::integer, 1);
      result_date := (from_date + interval '2 months')::date;
      result_date := make_date(
        EXTRACT(YEAR FROM result_date)::integer,
        EXTRACT(MONTH FROM result_date)::integer,
        LEAST(target_day, (DATE_TRUNC('month', result_date) + interval '1 month' - interval '1 day')::date - DATE_TRUNC('month', result_date)::date + 1)
      );

    -- Trimestral
    WHEN 'quarterly' THEN
      target_day := COALESCE((frequency->>'day')::integer, 1);
      result_date := (from_date + interval '3 months')::date;
      result_date := make_date(
        EXTRACT(YEAR FROM result_date)::integer,
        EXTRACT(MONTH FROM result_date)::integer,
        LEAST(target_day, (DATE_TRUNC('month', result_date) + interval '1 month' - interval '1 day')::date - DATE_TRUNC('month', result_date)::date + 1)
      );

    -- Semestral
    WHEN 'biannual' THEN
      target_day := COALESCE((frequency->>'day')::integer, 1);
      result_date := (from_date + interval '6 months')::date;
      result_date := make_date(
        EXTRACT(YEAR FROM result_date)::integer,
        EXTRACT(MONTH FROM result_date)::integer,
        LEAST(target_day, (DATE_TRUNC('month', result_date) + interval '1 month' - interval '1 day')::date - DATE_TRUNC('month', result_date)::date + 1)
      );

    -- Anual
    WHEN 'yearly' THEN
      target_month := COALESCE((frequency->>'month')::integer, EXTRACT(MONTH FROM from_date)::integer);
      target_day := COALESCE((frequency->>'day')::integer, 1);
      result_date := make_date(
        EXTRACT(YEAR FROM from_date)::integer + 1,
        target_month,
        LEAST(target_day, 28) -- Simplificación para evitar problemas con febrero
      );

    -- Personalizado (cada X días)
    WHEN 'custom_days' THEN
      interval_days := COALESCE((frequency->>'interval')::integer, 30);
      result_date := from_date + interval_days;

    ELSE
      result_date := from_date + 30; -- Default mensual
  END CASE;

  -- Ajustar por día no hábil si corresponde
  result_date := adjust_for_non_business_day(result_date, weekend_handling);

  RETURN result_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN: Efectuar transacciones futuras
-- (se ejecuta diariamente para "activar" transacciones cuya fecha llegó)
-- ============================================
CREATE OR REPLACE FUNCTION process_future_transactions()
RETURNS integer AS $$
DECLARE
  affected_count integer := 0;
BEGIN
  -- Marcar movimientos futuros como efectuados si llegó su fecha
  UPDATE movements
  SET is_future = false,
      updated_at = now()
  WHERE is_future = true
    AND date <= CURRENT_DATE;

  GET DIAGNOSTICS affected_count = ROW_COUNT;

  -- Hacer lo mismo para transferencias
  UPDATE transfers
  SET is_future = false,
      updated_at = now()
  WHERE is_future = true
    AND date <= CURRENT_DATE;

  RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Actualizar updated_at en recurring_transactions
-- ============================================
CREATE OR REPLACE FUNCTION update_recurring_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recurring_transactions_updated_at
  BEFORE UPDATE ON recurring_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_recurring_timestamp();

-- ============================================
-- RLS para argentine_holidays (solo lectura para todos)
-- ============================================
ALTER TABLE argentine_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read holidays"
ON argentine_holidays FOR SELECT
USING (true);

CREATE POLICY "Service role can manage holidays"
ON argentine_holidays FOR ALL
USING (auth.role() = 'service_role');

-- ============================================
-- VISTA: recurring_with_next_date
-- Vista útil para consultas de recurrentes con próxima fecha calculada
-- ============================================
CREATE OR REPLACE VIEW recurring_with_next_date AS
SELECT
  r.*,
  CASE
    WHEN r.next_execution_date IS NOT NULL THEN r.next_execution_date
    ELSE calculate_next_execution_date(r.frequency, COALESCE(r.last_generated_date, r.start_date - 1), r.weekend_handling)
  END as calculated_next_date
FROM recurring_transactions r
WHERE r.is_active = true AND r.is_paused = false;

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON TABLE recurring_transactions IS 'Configuración de transacciones recurrentes (suscripciones, alquiler, sueldo, etc.)';
COMMENT ON TABLE recurring_occurrences IS 'Historial de ocurrencias generadas por recurrentes';
COMMENT ON TABLE argentine_holidays IS 'Feriados argentinos para cálculo de días hábiles';
COMMENT ON COLUMN movements.is_future IS 'Indica si es una transacción programada para el futuro (no afecta balance hasta que llegue la fecha)';
COMMENT ON COLUMN movements.recurring_occurrence_id IS 'Referencia a la ocurrencia del recurrente que generó este movimiento';
COMMENT ON COLUMN recurring_transactions.frequency IS 'Configuración de frecuencia en formato JSON. Ejemplos: {"type": "monthly", "day": 15}, {"type": "weekly", "dayOfWeek": 1}';
COMMENT ON COLUMN recurring_transactions.is_credit_card_recurring IS 'Indica si es un gasto recurrente de tarjeta de crédito (se replica en cada resumen)';
