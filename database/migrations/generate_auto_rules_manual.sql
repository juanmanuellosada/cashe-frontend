-- ============================================
-- GENERADOR DE REGLAS AUTOMÁTICAS
-- Para user_id: 1a753dba-096e-4453-8ddb-87ace889a1f6
-- ============================================

-- Paso 1: Limpiar reglas automáticas anteriores
DELETE FROM auto_rules
WHERE user_id = '1a753dba-096e-4453-8ddb-87ace889a1f6'
AND (name LIKE '🤖%' OR name LIKE '🏦%');

-- Paso 2: Ejecutar la función de generación
SELECT generate_auto_rules_for_user('1a753dba-096e-4453-8ddb-87ace889a1f6');

-- Paso 3: Verificar reglas creadas
SELECT
  r.name,
  r.priority,
  r.is_active,
  (
    SELECT json_agg(json_build_object('field', c.field, 'operator', c.operator, 'value', c.value))
    FROM auto_rule_conditions c
    WHERE c.rule_id = r.id
  ) as condiciones,
  (
    SELECT json_agg(json_build_object('field', a.field, 'value', a.value))
    FROM auto_rule_actions a
    WHERE a.rule_id = r.id
  ) as acciones
FROM auto_rules r
WHERE user_id = '1a753dba-096e-4453-8ddb-87ace889a1f6'
AND (name LIKE '🤖%' OR name LIKE '🏦%')
ORDER BY r.priority DESC;
