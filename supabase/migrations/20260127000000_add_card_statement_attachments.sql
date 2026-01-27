-- Tabla para adjuntos de resúmenes de tarjeta
-- Los resúmenes se calculan dinámicamente, esta tabla solo guarda los adjuntos
CREATE TABLE card_statement_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  period text NOT NULL, -- Formato: "YYYY-MM" (ej: "2026-01")

  -- PDF del resumen del banco
  statement_url text,
  statement_name text,

  -- Comprobante de pago
  receipt_url text,
  receipt_name text,

  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Un solo registro por tarjeta/período
  UNIQUE(user_id, account_id, period)
);

-- Índices
CREATE INDEX idx_card_statement_attachments_user ON card_statement_attachments(user_id);
CREATE INDEX idx_card_statement_attachments_account ON card_statement_attachments(account_id);
CREATE INDEX idx_card_statement_attachments_period ON card_statement_attachments(period);

-- RLS
ALTER TABLE card_statement_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own statement attachments"
ON card_statement_attachments FOR ALL
USING (auth.uid() = user_id);
