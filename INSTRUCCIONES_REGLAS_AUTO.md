# 🤖 Generación Automática de Reglas para el Bot

## ¿Qué hace esto?

Este script genera **automáticamente** reglas de categorización y asignación de cuentas basadas en:

1. ✅ **Todas tus categorías** - detecta el nombre de la categoría en la nota
2. ✅ **Variaciones y sinónimos** - para maximizar los matches (ej: "super" para "Supermercado")
3. ✅ **Todas tus cuentas** - detecta nombres de bancos y billeteras
4. ✅ **Alias comunes** - "mp" para Mercado Pago, "gal" para Galicia, etc.

## 📋 Pasos para Ejecutar

### 1. Abrir Supabase SQL Editor

1. Ve a https://supabase.com/dashboard/project/TU_PROYECTO
2. Click en **"SQL Editor"** en el menú izquierdo
3. Click en **"New Query"**

### 2. Copiar el Script

1. Abre el archivo: `database/migrations/generate_auto_rules.sql`
2. Copia **TODO** el contenido
3. Pégalo en el SQL Editor de Supabase

### 3. Ejecutar

1. Click en **"Run"** (o presiona `Ctrl + Enter`)
2. Verás un mensaje como: `Se generaron 47 reglas automáticas para el usuario xxx`

### 4. Verificar

Ejecuta esta query para ver las reglas creadas:

```sql
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
```

## 🎯 Reglas que se Crean

### Para Categorías (con 🤖)

Por cada categoría, se crea una regla que detecta:

- **Nombre exacto**: "Supermercado" → detecta "supermercado"
- **Variaciones comunes**:
  - Supermercado → "super", "supermercados"
  - Comida → "comer", "almuerzo", "cena", "restaurant", "delivery"
  - Transporte → "uber", "cabify", "taxi", "colectivo", "subte", "nafta"
  - Hogar → "casa", "alquiler", "expensas"
  - Servicios → "luz", "gas", "agua", "internet", "netflix", "spotify"
  - Entretenimiento → "cine", "teatro", "juego", "salida"
  - Salud → "farmacia", "médico", "doctor", "clínica"
  - Ropa → "zapatillas", "remera", "pantalón"
  - Sueldo → "salario", "pago", "trabajo"
  - Freelance → "proyecto", "cliente"

### Para Cuentas (con 🏦)

Por cada cuenta, se crea una regla que detecta:

- **Nombre exacto**: "Galicia Pesos" → detecta "galicia pesos"
- **Alias comunes**:
  - Galicia → "gal", "banco galicia"
  - Santander → "san", "banco santander"
  - BBVA → "frances", "banco frances"
  - Mercado Pago → "mp", "meli", "mercadopago"
  - Ualá → "uala", "ualá"
  - Brubank → "bru", "brubank"
  - Naranja → "naranja x", "tarjeta naranja"
  - Hipotecario → "hipo", "banco hipotecario"
  - Nación → "bna", "banco nacion"
  - Provincia → "bapro", "banco provincia"
  - Macro → "banco macro"
  - ICBC → "banco icbc"
  - Personal Pay → "personal", "personalpay"
  - Prex → "prex"
  - Lemon → "lemon", "lemoncash"

## 💡 Ejemplos de Uso

Una vez ejecutado, el bot entenderá:

```
Usuario: "Gaste 5000 en el super con la visa"

Bot detecta:
✅ Monto: 5000
✅ Categoría: 🛒 Supermercado (regla: nota contiene "super")
✅ Cuenta: VISA, Galicia (regla: nota contiene "visa")
✅ Solo pregunta por la fecha (todo lo demás ya detectado)
```

```
Usuario: "Pagué 2000 de luz con mp"

Bot detecta:
✅ Monto: 2000
✅ Categoría: 📱 Servicios (regla: nota contiene "luz")
✅ Cuenta: Mercado Pago (regla: nota contiene "mp")
✅ Confirma directamente sin preguntas
```

```
Usuario: "Cobré 50000 de trabajo"

Bot detecta:
✅ Monto: 50000
✅ Categoría: 💼 Sueldo (regla: nota contiene "trabajo")
✅ Solo pregunta por la cuenta
```

## 🔧 Personalización

Si quieres agregar más variaciones:

1. Edita el script SQL
2. Busca la sección de tu categoría (ej: `v_category.name ILIKE '%supermercado%'`)
3. Agrega más condiciones:
   ```sql
   INSERT INTO auto_rule_conditions (rule_id, field, operator, value)
   VALUES
     (v_rule_id, 'note', 'contains', 'tu_palabra_nueva');
   ```

## 🧹 Limpiar (si quieres empezar de nuevo)

Para borrar todas las reglas automáticas generadas:

```sql
DELETE FROM auto_rules
WHERE user_id = auth.uid()
AND (name LIKE '🤖%' OR name LIKE '🏦%');
```

Luego puedes ejecutar el script de nuevo.

## ⚡ Mejora del Bot

Además del script, se hicieron **3 mejoras al bot**:

1. **✅ El bot ahora usa el mensaje completo** - No solo palabras clave aisladas
2. **✅ Evalúa reglas automáticas** - Antes de pedir información
3. **✅ Filtra cuentas inteligentemente** - Solo muestra 5-7 relevantes

## 🎉 Resultado Final

Antes:
```
Usuario: "Gaste 38400 en Supermercado"

Bot: 🤔 ¿A qué categoría pertenece?
     1. Comida
     2. Hogar
     3. Transporte
     ...

Bot: 🤔 ¿Qué cuenta usaste?
     1. Billetera
     2. Galicia Dólares
     3. Hipotecario Dólares
     ... (10 opciones)
```

Ahora:
```
Usuario: "Gaste 38400 en Supermercado"

Bot: 📝 *Confirmar gasto:*
     💸 Monto: $38.400
     📁 Categoría: 🛒 Supermercado ✨ (detectado automáticamente)
     💳 Cuenta: ?
     📅 Fecha: Hoy

     ¿Qué cuenta usaste?
     1. Billetera
     2. Galicia Pesos
     3. Mercado Pago
     4. Brubank
     5. Ualá
```

---

**¿Dudas?** Revisá el archivo `MEJORAS_BOT.md` para más detalles técnicos.
