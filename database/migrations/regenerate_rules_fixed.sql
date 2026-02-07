-- ============================================
-- REGENERAR REGLAS AUTOMÁTICAS (VERSIÓN CORREGIDA)
-- Sin condiciones con emojis, solo variaciones útiles
-- ============================================

-- PASO 1: Eliminar todas las reglas automáticas anteriores
DELETE FROM auto_rules
WHERE user_id = '1a753dba-096e-4453-8ddb-87ace889a1f6'
AND (name LIKE '🤖%' OR name LIKE '🏦%');

-- PASO 2: Recrear la función generadora (VERSION MEJORADA)
CREATE OR REPLACE FUNCTION generate_auto_rules_for_user_v2(p_user_id uuid)
RETURNS TABLE(rules_created integer) AS $$
DECLARE
  v_category RECORD;
  v_account RECORD;
  v_rule_id uuid;
  v_priority integer := 100;
  v_count integer := 0;
BEGIN
  -- ==================================================
  -- REGLAS PARA CATEGORÍAS
  -- Solo agregar variaciones útiles, NO el nombre con emoji
  -- ==================================================

  FOR v_category IN
    SELECT id, name, type, icon
    FROM categories
    WHERE user_id = p_user_id
    ORDER BY name
  LOOP
    -- Crear regla para la categoría
    INSERT INTO auto_rules (user_id, name, is_active, priority, logic_operator)
    VALUES (
      p_user_id,
      '🤖 ' || COALESCE(v_category.icon || ' ', '') || v_category.name,
      true,
      v_priority,
      'OR'
    )
    RETURNING id INTO v_rule_id;

    -- Solo agregar variaciones si son categorías comunes
    IF v_category.name ILIKE '%supermercado%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'supermercado'),
        (v_rule_id, 'note', 'contains', 'super'),
        (v_rule_id, 'note', 'contains', 'supermercados');
    ELSIF v_category.name ILIKE '%comida%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'comida'),
        (v_rule_id, 'note', 'contains', 'comer'),
        (v_rule_id, 'note', 'contains', 'almuerzo'),
        (v_rule_id, 'note', 'contains', 'cena'),
        (v_rule_id, 'note', 'contains', 'desayuno'),
        (v_rule_id, 'note', 'contains', 'restaurant'),
        (v_rule_id, 'note', 'contains', 'delivery');
    ELSIF v_category.name ILIKE '%transporte%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'transporte'),
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
        (v_rule_id, 'note', 'contains', 'hogar'),
        (v_rule_id, 'note', 'contains', 'casa'),
        (v_rule_id, 'note', 'contains', 'alquiler'),
        (v_rule_id, 'note', 'contains', 'expensas');
    ELSIF v_category.name ILIKE '%servicio%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'servicio'),
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
        (v_rule_id, 'note', 'contains', 'entretenimiento'),
        (v_rule_id, 'note', 'contains', 'cine'),
        (v_rule_id, 'note', 'contains', 'teatro'),
        (v_rule_id, 'note', 'contains', 'juego'),
        (v_rule_id, 'note', 'contains', 'salida');
    ELSIF v_category.name ILIKE '%salud%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'salud'),
        (v_rule_id, 'note', 'contains', 'farmacia'),
        (v_rule_id, 'note', 'contains', 'medico'),
        (v_rule_id, 'note', 'contains', 'doctor'),
        (v_rule_id, 'note', 'contains', 'clinica');
    ELSIF v_category.name ILIKE '%ropa%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'ropa'),
        (v_rule_id, 'note', 'contains', 'zapatillas'),
        (v_rule_id, 'note', 'contains', 'remera'),
        (v_rule_id, 'note', 'contains', 'pantalon'),
        (v_rule_id, 'note', 'contains', 'vestido');
    ELSIF v_category.name ILIKE '%sueldo%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'sueldo'),
        (v_rule_id, 'note', 'contains', 'salario'),
        (v_rule_id, 'note', 'contains', 'pago'),
        (v_rule_id, 'note', 'contains', 'trabajo');
    ELSIF v_category.name ILIKE '%freelance%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'freelance'),
        (v_rule_id, 'note', 'contains', 'proyecto'),
        (v_rule_id, 'note', 'contains', 'cliente'),
        (v_rule_id, 'note', 'contains', 'trabajo independiente');
    ELSIF v_category.name ILIKE '%kiosco%' OR v_category.name ILIKE '%kiosko%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'kiosco'),
        (v_rule_id, 'note', 'contains', 'kiosko'),
        (v_rule_id, 'note', 'contains', 'golosinas'),
        (v_rule_id, 'note', 'contains', 'cigarrillos');
    ELSIF v_category.name ILIKE '%salida%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'salida'),
        (v_rule_id, 'note', 'contains', 'bar'),
        (v_rule_id, 'note', 'contains', 'boliche');
    ELSE
      -- Para categorías sin variaciones específicas, usar nombre normalizado (sin emoji)
      -- Extraer solo texto alfanumérico del nombre
      DECLARE
        v_clean_name text;
      BEGIN
        v_clean_name := LOWER(REGEXP_REPLACE(v_category.name, '[^\w\s]', '', 'g'));
        v_clean_name := TRIM(v_clean_name);

        IF LENGTH(v_clean_name) >= 3 THEN
          INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
          VALUES (v_rule_id, 'note', 'contains', v_clean_name);
        END IF;
      END;
    END IF;

    -- Acción: asignar la categoría
    INSERT INTO auto_rule_actions (rule_id, field, value)
    VALUES (v_rule_id, 'category_id', v_category.id::text);

    v_count := v_count + 1;
    v_priority := v_priority - 1;
  END LOOP;

  -- ==================================================
  -- REGLAS PARA CUENTAS
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

    -- Agregar alias comunes de bancos y billeteras
    IF v_account.name ILIKE '%galicia%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'galicia'),
        (v_rule_id, 'note', 'contains', 'gal');
    ELSIF v_account.name ILIKE '%santander%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'santander'),
        (v_rule_id, 'note', 'contains', 'san');
    ELSIF v_account.name ILIKE '%bbva%' OR v_account.name ILIKE '%frances%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'bbva'),
        (v_rule_id, 'note', 'contains', 'frances');
    ELSIF v_account.name ILIKE '%mercado%pago%' OR v_account.name ILIKE '%mp%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'mercadopago'),
        (v_rule_id, 'note', 'contains', 'mercado pago'),
        (v_rule_id, 'note', 'contains', 'mp'),
        (v_rule_id, 'note', 'contains', 'meli');
    ELSIF v_account.name ILIKE '%ualá%' OR v_account.name ILIKE '%uala%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'uala'),
        (v_rule_id, 'note', 'contains', 'ualá');
    ELSIF v_account.name ILIKE '%brubank%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'brubank'),
        (v_rule_id, 'note', 'contains', 'bru');
    ELSIF v_account.name ILIKE '%naranja%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'naranja'),
        (v_rule_id, 'note', 'contains', 'naranja x');
    ELSIF v_account.name ILIKE '%hipotecario%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'hipotecario'),
        (v_rule_id, 'note', 'contains', 'hipo');
    ELSIF v_account.name ILIKE '%nacion%' OR v_account.name ILIKE '%bna%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'nacion'),
        (v_rule_id, 'note', 'contains', 'bna');
    ELSIF v_account.name ILIKE '%provincia%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'provincia'),
        (v_rule_id, 'note', 'contains', 'bapro');
    ELSIF v_account.name ILIKE '%macro%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'macro');
    ELSIF v_account.name ILIKE '%icbc%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'icbc');
    ELSIF v_account.name ILIKE '%personal%pay%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'personal pay'),
        (v_rule_id, 'note', 'contains', 'personal');
    ELSIF v_account.name ILIKE '%prex%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'prex');
    ELSIF v_account.name ILIKE '%lemon%' THEN
      INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
      VALUES
        (v_rule_id, 'note', 'contains', 'lemon'),
        (v_rule_id, 'note', 'contains', 'lemoncash');
    ELSE
      -- Para cuentas sin alias específicos, usar nombre normalizado
      DECLARE
        v_clean_name text;
      BEGIN
        v_clean_name := LOWER(REGEXP_REPLACE(v_account.name, '[^\w\s]', '', 'g'));
        v_clean_name := TRIM(v_clean_name);

        IF LENGTH(v_clean_name) >= 3 THEN
          INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
          VALUES (v_rule_id, 'note', 'contains', v_clean_name);
        END IF;
      END;
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

-- PASO 3: Generar reglas con la nueva función
SELECT * FROM generate_auto_rules_for_user_v2('1a753dba-096e-4453-8ddb-87ace889a1f6');

-- PASO 4: Verificar reglas creadas
SELECT
  r.name,
  r.priority,
  r.is_active,
  (
    SELECT COUNT(*)
    FROM auto_rule_conditions c
    WHERE c.rule_id = r.id
  ) as num_condiciones,
  (
    SELECT json_agg(c.value)
    FROM auto_rule_conditions c
    WHERE c.rule_id = r.id
    LIMIT 5
  ) as primeras_condiciones
FROM auto_rules r
WHERE user_id = '1a753dba-096e-4453-8ddb-87ace889a1f6'
AND (name LIKE '🤖%' OR name LIKE '🏦%')
ORDER BY r.priority DESC
LIMIT 30;
