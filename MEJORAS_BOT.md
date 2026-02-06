# Mejoras del Bot de WhatsApp/Telegram

## Resumen de Cambios

Se implementaron 3 mejoras principales para mejorar la interacción con los bots de WhatsApp y Telegram:

### 1. ✅ Integración de Reglas Automáticas

**Archivo nuevo:** `supabase/functions/_shared/nlp/autoRulesEvaluator.ts`

El bot ahora evalúa las reglas automáticas del usuario para auto-sugerir categorías y cuentas.

**Funcionamiento:**
- Después de extraer las entidades del mensaje, el bot llama a `evaluateAutoRules()`
- Si una regla matchea basándose en la nota del usuario, se aplican las sugerencias automáticamente
- Soporta condiciones en:
  - `note` (contains, equals, starts_with, ends_with)
  - `amount` (equals, greater_than, less_than, between)
  - `account_id` (equals)
  - `type` (expense/income)

**Ejemplo:**
```
Usuario: "Gaste 38400 en Supermercado"

Regla del usuario:
- Si nota contiene "supermercado" → Categoría: "🛒 Supermercado"

Bot ahora:
- ✅ Detecta "Supermercado" en la nota
- ✅ Aplica automáticamente la categoría "🛒 Supermercado"
- ✅ Solo pregunta por la cuenta (en vez de pedir categoría también)
```

### 2. ✅ Filtrado Inteligente de Cuentas

**Archivo modificado:** `supabase/functions/_shared/nlp/fuzzyMatcher.ts`

**Nueva función:** `filterRelevantAccounts()`

Ahora el bot muestra solo cuentas relevantes en vez de todas las 10 cuentas:

**Filtros aplicados:**
- ❌ Excluye cuentas con `hidden_from_balance = true`
- ❌ Excluye tarjetas de crédito si no se mencionan en el mensaje
- 📊 Prioriza cuentas con saldo > 0
- 🔢 Limita a máximo 7 opciones

**Ejemplo:**
```
Antes:
🤔 Encontré varias cuentas que coinciden. ¿Cuál querés usar?
1. Billetera
2. Caja de ahorro en dólares, Galicia
3. Caja de ahorro en dólares, Hipotecario
4. Caja de ahorro en dólares, Mercado Pago
5. Caja de ahorro en pesos, Galicia
6. Caja de ahorro en pesos, Hipotecario
7. Dólares - 🪏 6600
8. FIMA Premium, Galicia
9. MASTER, Galicia
10. VISA, Galicia

Ahora:
🤔 Encontré varias cuentas. ¿Cuál querés usar?
1. Billetera
2. Caja de ahorro en pesos, Galicia
3. Caja de ahorro en pesos, Hipotecario
4. Mercado Pago
5. Brubank
```

### 3. ✅ Uso de Nota Completa para Evaluación

**Archivos modificados:**
- `supabase/functions/_shared/nlp/index.ts`
- `supabase/functions/_shared/nlp/confirmationFlow.ts`

El bot ahora usa la nota completa del usuario (en vez de solo palabras clave extraídas) para evaluar las reglas automáticas.

**Ejemplo:**
```
Usuario: "Gaste 5000 en el super con la visa"

Antes:
- Nota extraída: "super"
- Regla "contiene supermercado" → ❌ No matchea

Ahora:
- Nota completa: "Gaste 5000 en el super con la visa"
- Regla "contiene super" → ✅ Matchea
- Se aplica la categoría automáticamente
```

## Flujo Completo Mejorado

### Ejemplo 1: Con Regla Automática

```
Usuario: "Gaste 38400 en Supermercado"

Bot (procesamiento interno):
1. ✅ Intent: REGISTRAR_GASTO
2. ✅ Entidades: monto=38400, nota="Supermercado"
3. ✅ Evalúa reglas → Encuentra regla "supermercado"
4. ✅ Aplica categoría: "🛒 Supermercado"
5. ✅ Filtra cuentas relevantes (5 en vez de 10)

Bot (respuesta):
📝 *Confirmar gasto:*
💸 Monto: $38.400
📁 Categoría: 🛒 Supermercado
💳 Cuenta: ?
📅 Fecha: Hoy

¿Qué cuenta usaste?
1. Billetera
2. Galicia Pesos
3. Mercado Pago
4. Brubank
5. Uala
```

### Ejemplo 2: Sin Regla Automática

```
Usuario: "Pagué 1500 en algo random"

Bot (procesamiento interno):
1. ✅ Intent: REGISTRAR_GASTO
2. ✅ Entidades: monto=1500, nota="algo random"
3. ⚠️ Evalúa reglas → No matchea ninguna
4. ❓ Pregunta por categoría
5. ✅ Filtra cuentas relevantes

Bot (respuesta):
¿A qué categoría pertenece este gasto?
1. 🍔 Comida
2. 🏠 Hogar
3. 🚗 Transporte
4. 🎬 Entretenimiento
5. 🛒 Supermercado
...
```

## Archivos Modificados

### Nuevos
- ✨ `supabase/functions/_shared/nlp/autoRulesEvaluator.ts`

### Modificados
- 📝 `supabase/functions/_shared/nlp/fuzzyMatcher.ts`
  - Agregada función `filterRelevantAccounts()`
- 📝 `supabase/functions/_shared/nlp/confirmationFlow.ts`
  - Modificado `buildEditValueMessage()` para usar filtro
  - Modificado `buildMissingFieldMessage()` para pasar parámetros
- 📝 `supabase/functions/_shared/nlp/index.ts`
  - Importado `evaluateAutoRules()`
  - Agregado paso 6.5: evaluación de reglas automáticas
  - Actualizado paso 8: pasar intent y texto a funciones de mensajes

## Beneficios

1. **Menos fricción:** El usuario ya no necesita seleccionar categoría si tiene reglas configuradas
2. **Menos opciones:** En vez de 10 cuentas, muestra máximo 5-7 relevantes
3. **Más inteligente:** Aprende de los patrones del usuario mediante reglas
4. **Más rápido:** Menos interacciones para completar un movimiento

## Testing

Para probar estas mejoras:

1. Crear reglas automáticas en `/reglas`:
   - Ejemplo: "Si nota contiene 'super' → Categoría: Supermercado"

2. Enviar mensajes al bot:
   - "Gaste 5000 en el super"
   - "Compré 2000 de comida"
   - "Pagué 1500 de luz"

3. Verificar que:
   - ✅ Las reglas se aplican correctamente
   - ✅ Solo se muestran cuentas relevantes
   - ✅ Las tarjetas de crédito no aparecen para gastos simples
