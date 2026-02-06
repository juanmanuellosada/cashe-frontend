-- ============================================
-- GENERADOR AUTOMÁTICO DE REGLAS
-- ============================================
-- Este script genera reglas automáticas basadas en:
-- 1. Todas las categorías del usuario
-- 2. Variaciones comunes de nombres de categorías
-- 3. Alias de cuentas bancarias comunes
--
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Función para generar reglas automáticamente
CREATE OR REPLACE FUNCTION generate_auto_rules_for_user(p_user_id uuid)
RETURNS TABLE(rules_created integer) AS $$
DECLARE
  v_category RECORD;
  v_account RECORD;
  v_rule_id uuid;
  v_priority integer := 100;
  v_count integer := 0;
BEGIN
  -- ==================================================
  -- PASO 1: REGLAS PARA CATEGORÍAS
  -- ==================================================

  FOR v_category IN
    SELECT id, name, type, icon
    FROM categories
    WHERE user_id = p_user_id
    ORDER BY name
  LOOP
    -- Crear regla para el nombre exacto de la categoría
    INSERT INTO auto_rules (user_id, name, is_active, priority, logic_operator)
    VALUES (
      p_user_id,
      '🤖 ' || v_category.icon || ' ' || v_category.name,
      true,
      v_priority,
      'OR'
    )
    RETURNING id INTO v_rule_id;

    -- Condición: nota contiene el nombre de la categoría (case insensitive)
    INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
    VALUES (v_rule_id, 'note', 'contains', LOWER(v_category.name));

    -- Agregar variaciones del nombre (sin acentos, plural, etc.)
    -- Por ejemplo: "Supermercado" → también "super", "supermercados"
    IF v_category.name ILIKE '%supermercado%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'super'),
        (v_rule_id, 'note', 'contains', 'supermercados');
    ELSIF v_category.name ILIKE '%comida%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'comer'),
        (v_rule_id, 'note', 'contains', 'almuerzo'),
        (v_rule_id, 'note', 'contains', 'cena'),
        (v_rule_id, 'note', 'contains', 'desayuno'),
        (v_rule_id, 'note', 'contains', 'restaurant'),
        (v_rule_id, 'note', 'contains', 'delivery');
    ELSIF v_category.name ILIKE '%transporte%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'uber'),
        (v_rule_id, 'note', 'contains', 'cabify'),
        (v_rule_id, 'note', 'contains', 'taxi'),
        (v_rule_id, 'note', 'contains', 'colectivo'),
        (v_rule_id, 'note', 'contains', 'subte'),
        (v_rule_id, 'note', 'contains', 'nafta'),
        (v_rule_id, 'note', 'contains', 'combustible');
    ELSIF v_category.name ILIKE '%hogar%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'casa'),
        (v_rule_id, 'note', 'contains', 'alquiler'),
        (v_rule_id, 'note', 'contains', 'expensas');
    ELSIF v_category.name ILIKE '%servicio%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'luz'),
        (v_rule_id, 'note', 'contains', 'gas'),
        (v_rule_id, 'note', 'contains', 'agua'),
        (v_rule_id, 'note', 'contains', 'internet'),
        (v_rule_id, 'note', 'contains', 'netflix'),
        (v_rule_id, 'note', 'contains', 'spotify'),
        (v_rule_id, 'note', 'contains', 'disney');
    ELSIF v_category.name ILIKE '%entretenimiento%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'cine'),
        (v_rule_id, 'note', 'contains', 'teatro'),
        (v_rule_id, 'note', 'contains', 'juego'),
        (v_rule_id, 'note', 'contains', 'salida');
    ELSIF v_category.name ILIKE '%salud%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'farmacia'),
        (v_rule_id, 'note', 'contains', 'medico'),
        (v_rule_id, 'note', 'contains', 'doctor'),
        (v_rule_id, 'note', 'contains', 'clinica');
    ELSIF v_category.name ILIKE '%ropa%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'zapatillas'),
        (v_rule_id, 'note', 'contains', 'remera'),
        (v_rule_id, 'note', 'contains', 'pantalon'),
        (v_rule_id, 'note', 'contains', 'vestido');
    ELSIF v_category.name ILIKE '%sueldo%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'salario'),
        (v_rule_id, 'note', 'contains', 'pago'),
        (v_rule_id, 'note', 'contains', 'trabajo');
    ELSIF v_category.name ILIKE '%freelance%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'proyecto'),
        (v_rule_id, 'note', 'contains', 'cliente'),
        (v_rule_id, 'note', 'contains', 'trabajo independiente');
    END IF;

    -- Acción: asignar la categoría
    INSERT INTO auto_rule_actions (rule_id, field, value)
    VALUES (v_rule_id, 'category_id', v_category.id::text);

    v_count := v_count + 1;
    v_priority := v_priority - 1;
  END LOOP;

  -- ==================================================
  -- PASO 2: REGLAS PARA CUENTAS COMUNES
  -- ==================================================

  FOR v_account IN
    SELECT id, name, is_credit_card
    FROM accounts
    WHERE user_id = p_user_id
    AND hidden_from_balance = false
    ORDER BY name
  LOOP
    -- Crear regla para la cuenta
    INSERT INTO auto_rules (user_id, name, is_active, priority, logic_operator)
    VALUES (
      p_user_id,
      '🏦 Cuenta: ' || v_account.name,
      true,
      v_priority,
      'OR'
    )
    RETURNING id INTO v_rule_id;

    -- Condición: nota contiene el nombre de la cuenta
    INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
    VALUES (v_rule_id, 'note', 'contains', LOWER(v_account.name));

    -- Agregar alias comunes de bancos y billeteras
    IF v_account.name ILIKE '%galicia%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'gal'),
        (v_rule_id, 'note', 'contains', 'banco galicia');
    ELSIF v_account.name ILIKE '%santander%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'san'),
        (v_rule_id, 'note', 'contains', 'banco santander');
    ELSIF v_account.name ILIKE '%bbva%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'frances'),
        (v_rule_id, 'note', 'contains', 'banco frances');
    ELSIF v_account.name ILIKE '%mercado%pago%' OR v_account.name ILIKE '%mp%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'mp'),
        (v_rule_id, 'note', 'contains', 'meli'),
        (v_rule_id, 'note', 'contains', 'mercadopago');
    ELSIF v_account.name ILIKE '%ualá%' OR v_account.name ILIKE '%uala%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'uala'),
        (v_rule_id, 'note', 'contains', 'ualá');
    ELSIF v_account.name ILIKE '%brubank%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'bru'),
        (v_rule_id, 'note', 'contains', 'brubank');
    ELSIF v_account.name ILIKE '%naranja%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'naranja x'),
        (v_rule_id, 'note', 'contains', 'tarjeta naranja');
    ELSIF v_account.name ILIKE '%hipotecario%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'hipo'),
        (v_rule_id, 'note', 'contains', 'banco hipotecario');
    ELSIF v_account.name ILIKE '%nacion%' OR v_account.name ILIKE '%bna%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'bna'),
        (v_rule_id, 'note', 'contains', 'banco nacion');
    ELSIF v_account.name ILIKE '%provincia%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'bapro'),
        (v_rule_id, 'note', 'contains', 'banco provincia');
    ELSIF v_account.name ILIKE '%macro%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES (v_rule_id, 'note', 'contains', 'banco macro');
    ELSIF v_account.name ILIKE '%icbc%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES (v_rule_id, 'note', 'contains', 'banco icbc');
    ELSIF v_account.name ILIKE '%personal%pay%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'personal'),
        (v_rule_id, 'note', 'contains', 'personalpay');
    ELSIF v_account.name ILIKE '%prex%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES (v_rule_id, 'note', 'contains', 'prex');
    ELSIF v_account.name ILIKE '%lemon%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'lemon'),
        (v_rule_id, 'note', 'contains', 'lemoncash');
    END IF;

    -- Acción: asignar la cuenta
    INSERT INTO auto_rule_actions (rule_id, field, value)
    VALUES (v_rule_id, 'account_id', v_account.id::text);

    v_count := v_count + 1;
    v_priority := v_priority - 1;
  END LOOP;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EJECUTAR LA FUNCIÓN PARA TU USUARIO
-- ============================================
-- Reemplaza 'TU_USER_ID' con tu ID de usuario
-- Puedes obtenerlo con: SELECT auth.uid();

-- Opción 1: Obtener tu user_id automáticamente
DO $$
DECLARE
  v_user_id uuid;
  v_rules_count integer;
BEGIN
  -- Obtener el user_id del usuario autenticado
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No hay usuario autenticado. Ejecuta esto desde el SQL Editor autenticado.';
  END IF;

  -- Limpiar reglas automáticas anteriores (las que empiezan con 🤖 o 🏦)
  DELETE FROM auto_rules
  WHERE user_id = v_user_id
  AND (name LIKE '🤖%' OR name LIKE '🏦%');

  -- Generar nuevas reglas
  SELECT * INTO v_rules_count FROM generate_auto_rules_for_user(v_user_id);

  RAISE NOTICE 'Se generaron % reglas automáticas para el usuario %', v_rules_count, v_user_id;
END $$;

-- ============================================
-- VERIFICAR LAS REGLAS CREADAS
-- ============================================
-- Ejecuta esto para ver las reglas generadas:
/*
SELECT
  r.name,
  r.priority,
  r.is_active,
  (
    SELECT json_agg(json_build_object('field', c.field, 'operator', c.operator, 'value', c.value))
    FROM auto_rule_conditions c
    WHERE c.rule_id = r.id
  ) as conditions,
  (
    SELECT json_agg(json_build_object('field', a.field, 'value', a.value))
    FROM auto_rule_actions a
    WHERE a.rule_id = r.id
  ) as actions
FROM auto_rules r
WHERE user_id = auth.uid()
AND (name LIKE '🤖%' OR name LIKE '🏦%')
ORDER BY r.priority DESC;
*/

-- ============================================
-- LIMPIAR (si quieres borrar todas las reglas automáticas)
-- ============================================
/*
DELETE FROM auto_rules
WHERE user_id = auth.uid()
AND (name LIKE '🤖%' OR name LIKE '🏦%');
*/
