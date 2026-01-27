-- ============================================
-- CASHE - SUPABASE DATABASE SCHEMA
-- ============================================
-- Última actualización: 2026-01-26
-- Proyecto: Cashe - Finanzas Personales
-- ============================================

-- ============================================
-- TABLA: profiles
-- Información de usuarios (extiende auth.users)
-- ============================================
CREATE TABLE profiles (
    id uuid NOT NULL PRIMARY KEY,
    email text,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- TABLA: user_settings
-- Configuración por usuario
-- ============================================
CREATE TABLE user_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    default_currency text DEFAULT 'ARS'::text,
    exchange_rate numeric DEFAULT 1000,
    storage_used_bytes bigint DEFAULT 0,
    storage_quota_bytes bigint DEFAULT 104857600, -- 100MB
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- TABLA: accounts
-- Cuentas del usuario (bancos, billeteras, tarjetas)
-- ============================================
CREATE TABLE accounts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    currency text NOT NULL DEFAULT 'ARS'::text,
    initial_balance numeric DEFAULT 0,
    account_number text,
    account_type text DEFAULT 'Caja de ahorro'::text,
    is_credit_card boolean DEFAULT false,
    closing_day integer,
    icon text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- TABLA: categories
-- Categorías de ingresos y gastos
-- ============================================
CREATE TABLE categories (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name text NOT NULL,
    type text NOT NULL, -- 'income' | 'expense'
    icon text,
    icon_catalog_id uuid REFERENCES icon_catalog(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- TABLA: installment_purchases
-- Compras en cuotas (tarjeta de crédito)
-- ============================================
CREATE TABLE installment_purchases (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    description text NOT NULL,
    total_amount numeric NOT NULL,
    installments integer NOT NULL,
    account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
    category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    start_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- TABLA: movements
-- Movimientos (ingresos y gastos)
-- ============================================
CREATE TABLE movements (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'income' | 'expense'
    date date NOT NULL DEFAULT CURRENT_DATE,
    amount numeric NOT NULL,
    account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
    category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
    note text,
    installment_purchase_id uuid REFERENCES installment_purchases(id) ON DELETE CASCADE,
    installment_number integer,
    total_installments integer,
    attachment_url text, -- URL pública del archivo adjunto en Supabase Storage
    attachment_name text, -- Nombre original del archivo adjunto
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- TABLA: transfers
-- Transferencias entre cuentas
-- ============================================
CREATE TABLE transfers (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    date date NOT NULL DEFAULT CURRENT_DATE,
    from_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
    to_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
    from_amount numeric NOT NULL,
    to_amount numeric NOT NULL,
    note text,
    attachment_url text, -- URL pública del archivo adjunto en Supabase Storage
    attachment_name text, -- Nombre original del archivo adjunto
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- TABLA: card_statement_attachments
-- Adjuntos de resúmenes de tarjeta de crédito
-- Los resúmenes se calculan dinámicamente, esta tabla solo guarda los adjuntos
-- ============================================
CREATE TABLE card_statement_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    period text NOT NULL, -- Formato: "YYYY-MM" (ej: "2026-01")
    statement_url text,   -- PDF del resumen del banco
    statement_name text,
    receipt_url text,     -- Comprobante de pago
    receipt_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, account_id, period)
);

-- ============================================
-- ÍNDICES RECOMENDADOS
-- ============================================
CREATE INDEX idx_movements_user_id ON movements(user_id);
CREATE INDEX idx_movements_date ON movements(date);
CREATE INDEX idx_movements_type ON movements(type);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_icon_catalog_id ON categories(icon_catalog_id);
CREATE INDEX idx_transfers_user_id ON transfers(user_id);
CREATE INDEX idx_transfers_date ON transfers(date);
CREATE INDEX idx_card_statement_attachments_user ON card_statement_attachments(user_id);
CREATE INDEX idx_card_statement_attachments_account ON card_statement_attachments(account_id);
CREATE INDEX idx_card_statement_attachments_period ON card_statement_attachments(period);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_statement_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas: Usuarios solo ven sus propios datos
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own settings" ON user_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own categories" ON categories FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own purchases" ON installment_purchases FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own movements" ON movements FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own transfers" ON transfers FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own statement attachments" ON card_statement_attachments FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER: Crear perfil automáticamente al registrarse
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
    
    INSERT INTO public.user_settings (user_id)
    VALUES (new.id);
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
