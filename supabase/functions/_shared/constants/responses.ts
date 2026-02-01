/**
 * Mensajes de respuesta en español argentino para los bots
 */

export const RESPONSES = {
  // Ayuda
  HELP: `🤖 *¡Hola! Soy tu asistente de Cashé*

Podés decirme cosas como:

💸 *Gastos*
"gasté 500 en comida con galicia"
"pagué 1500 de luz"
"compré nafta 8000 con mp"

💰 *Ingresos*
"cobré 50000 en santander"
"me pagaron el sueldo"
"recibí 10000 de freelance"

🔄 *Transferencias*
"transferí 10000 de galicia a mp"
"pasé 5000 de brubank a efectivo"

📊 *Consultas*
"saldo mercadopago"
"cuánto gasté en comida este mes"
"últimos 5 movimientos"
"resumen del mes"

¡Escribime en lenguaje natural! 😊`,

  HELP_SHORT: `💡 *Tip:* Escribime en lenguaje natural
Ej: "gasté 500 en comida con galicia"

Para ver todos los comandos, escribí "ayuda"`,

  // Errores de comprensión
  NO_ENTENDI: `🤔 No entendí bien. Probá decirme algo como:
• "gasté 500 en comida"
• "saldo galicia"
• "resumen del mes"

Escribí "ayuda" para ver todo lo que puedo hacer.`,

  NO_ENTENDI_CONTEXTO: `🤔 No entendí. ¿Querías decir algo diferente?

Recordá que podés:
• Registrar gastos: "gasté 500 en super"
• Registrar ingresos: "cobré 10000"
• Consultar saldos: "saldo mp"
• Ver resumen: "resumen del mes"`,

  // Usuario no vinculado
  NO_VINCULADO_TELEGRAM: `⚠️ *Tu cuenta de Telegram no está vinculada a Cashé*

Para vincularla:
1. Abrí la app en cashe.ar
2. Andá a ⚙️ Ajustes → 🤖 Integraciones
3. Seleccioná "Vincular Telegram"
4. Seguí las instrucciones

¿Ya tenés cuenta? Vinculá tu Telegram para empezar 🚀`,

  NO_VINCULADO_WHATSAPP: `⚠️ *Tu número de WhatsApp no está vinculado a Cashé*

Para vincularlo:
1. Abrí la app en cashe.ar
2. Andá a ⚙️ Ajustes → 🤖 Integraciones
3. Seleccioná "Vincular WhatsApp"
4. Seguí las instrucciones

¿Ya tenés cuenta? Vinculá tu WhatsApp para empezar 🚀`,

  // Confirmación
  CONFIRMAR_PREGUNTA: `¿Está correcto?`,
  CONFIRMAR_OPCIONES: `✅ *Sí* | ✏️ *Editar* | ❌ *Cancelar*`,

  // Estados de confirmación
  CANCELADO: `❌ Cancelado. ¿En qué más te puedo ayudar?`,
  EXPIRADO: `⏰ La operación expiró por inactividad. Empezá de nuevo si querés.`,

  // Éxito
  GASTO_REGISTRADO: `✅ *¡Gasto registrado!*`,
  INGRESO_REGISTRADO: `✅ *¡Ingreso registrado!*`,
  TRANSFERENCIA_REGISTRADA: `✅ *¡Transferencia registrada!*`,

  // Edición
  EDITAR_PREGUNTA: `✏️ *¿Qué querés cambiar?*`,
  EDITAR_MONTO: `💰 Escribí el nuevo monto:`,
  EDITAR_CATEGORIA: `📁 Elegí la nueva categoría:`,
  EDITAR_CUENTA: `🏦 Elegí la nueva cuenta:`,
  EDITAR_FECHA: `📅 Escribí la nueva fecha (ej: "ayer", "15/01", "hoy"):`,
  EDITAR_NOTA: `📝 Escribí la nota:`,
  EDITAR_CUENTA_ORIGEN: `🏦 Elegí la cuenta de origen:`,
  EDITAR_CUENTA_DESTINO: `🏦 Elegí la cuenta de destino:`,

  // Selección
  SELECCIONAR_CUENTA: `🏦 *Elegí la cuenta:*`,
  SELECCIONAR_CATEGORIA: `📁 *Elegí la categoría:*`,
  SELECCIONAR_CUENTA_ORIGEN: `🏦 *¿De qué cuenta transferís?*`,
  SELECCIONAR_CUENTA_DESTINO: `🏦 *¿A qué cuenta transferís?*`,

  // Desambiguación
  MULTIPLES_CUENTAS: `🤔 Encontré varias cuentas que coinciden. ¿Cuál querés usar?`,
  MULTIPLES_CATEGORIAS: `🤔 Encontré varias categorías que coinciden. ¿Cuál querés usar?`,

  // Datos faltantes
  FALTA_MONTO: `💰 ¿Cuál es el monto?`,
  FALTA_CUENTA: `🏦 ¿En qué cuenta?`,
  FALTA_CATEGORIA: `📁 ¿En qué categoría?`,

  // Errores
  ERROR_GENERICO: `❌ Ups, algo salió mal. ¿Podés intentar de nuevo?`,
  ERROR_CUENTA_NO_ENCONTRADA: `❌ No encontré esa cuenta. Revisá el nombre e intentá de nuevo.`,
  ERROR_CATEGORIA_NO_ENCONTRADA: `❌ No encontré esa categoría. Revisá el nombre e intentá de nuevo.`,
  ERROR_MONTO_INVALIDO: `❌ El monto no es válido. Usá números (ej: 1500, 50k, 2.5k)`,
  ERROR_FECHA_INVALIDA: `❌ No entendí la fecha. Probá con "hoy", "ayer", o "dd/mm"`,
  ERROR_SIN_CUENTAS: `⚠️ No tenés cuentas creadas. Creá una en la app primero.`,
  ERROR_SIN_CATEGORIAS: `⚠️ No tenés categorías creadas. Creá una en la app primero.`,
  ERROR_MISMA_CUENTA: `❌ La cuenta de origen y destino no pueden ser la misma.`,

  // Consultas - Saldo
  SALDO_TOTAL: `💰 *Tu balance total:*`,
  SALDO_CUENTA: `💰 *Saldo en {cuenta}:*`,
  SIN_MOVIMIENTOS: `📭 No hay movimientos en este período.`,

  // Consultas - Gastos
  GASTOS_PERIODO: `📊 *Gastos {periodo}:*`,
  GASTOS_CATEGORIA: `📊 *Gastos en {categoria} {periodo}:*`,

  // Consultas - Últimos movimientos
  ULTIMOS_MOVIMIENTOS: `📋 *Últimos {n} movimientos:*`,

  // Consultas - Resumen
  RESUMEN_MES: `📈 *Resumen de {mes}:*`,

  // Plantillas de preview
  PREVIEW_GASTO: `📝 *Voy a registrar este gasto:*

💰 Monto: {monto}
📁 Categoría: {categoria}
💳 Cuenta: {cuenta}
📅 Fecha: {fecha}
📝 Nota: {nota}`,

  PREVIEW_GASTO_TARJETA: `📝 *Voy a registrar este gasto:*

💰 Monto: {monto}
📁 Categoría: {categoria}
💳 Tarjeta: {cuenta}
🗓️ Resumen: {resumen}
📝 Nota: {nota}`,

  PREVIEW_GASTO_CUOTAS: `📝 *Voy a registrar esta compra en cuotas:*

💰 Total: {monto}
📦 Cuotas: {cuotas}x {monto_cuota}
📁 Categoría: {categoria}
💳 Tarjeta: {cuenta}
🗓️ Resumen: {resumen}
📝 Nota: {nota}`,

  PREVIEW_INGRESO: `📝 *Voy a registrar este ingreso:*

💰 Monto: {monto}
📁 Categoría: {categoria}
🏦 Cuenta: {cuenta}
📅 Fecha: {fecha}
📝 Nota: {nota}`,

  PREVIEW_TRANSFERENCIA: `📝 *Voy a registrar esta transferencia:*

💰 Monto: {monto}
🏦 De: {cuenta_origen}
🏦 A: {cuenta_destino}
📅 Fecha: {fecha}
📝 Nota: {nota}`,

  // Resultados
  RESULTADO_GASTO: `💸 {monto} en {categoria}
🏦 {cuenta}`,

  RESULTADO_INGRESO: `💰 +{monto} de {categoria}
🏦 {cuenta}`,

  RESULTADO_TRANSFERENCIA: `🔄 {monto}
🏦 {cuenta_origen} → {cuenta_destino}`,

  // Formato de movimiento en lista
  MOVIMIENTO_ITEM_GASTO: `💸 {monto} - {categoria}
   📅 {fecha} | 🏦 {cuenta}`,

  MOVIMIENTO_ITEM_INGRESO: `💰 +{monto} - {categoria}
   📅 {fecha} | 🏦 {cuenta}`,

  MOVIMIENTO_ITEM_TRANSFERENCIA: `🔄 {monto}
   📅 {fecha} | {origen} → {destino}`,
};

/**
 * Plantilla de campos para edición
 */
export const EDIT_FIELDS = {
  GASTO: [
    { key: "amount", label: "Monto", icon: "💰" },
    { key: "category", label: "Categoría", icon: "📁" },
    { key: "account", label: "Cuenta", icon: "🏦" },
    { key: "date", label: "Fecha", icon: "📅" },
    { key: "note", label: "Nota", icon: "📝" },
  ],
  INGRESO: [
    { key: "amount", label: "Monto", icon: "💰" },
    { key: "category", label: "Categoría", icon: "📁" },
    { key: "account", label: "Cuenta", icon: "🏦" },
    { key: "date", label: "Fecha", icon: "📅" },
    { key: "note", label: "Nota", icon: "📝" },
  ],
  TRANSFERENCIA: [
    { key: "amount", label: "Monto", icon: "💰" },
    { key: "from_account", label: "Cuenta origen", icon: "🏦" },
    { key: "to_account", label: "Cuenta destino", icon: "🏦" },
    { key: "date", label: "Fecha", icon: "📅" },
    { key: "note", label: "Nota", icon: "📝" },
  ],
};

/**
 * Formatea un número como moneda argentina
 */
export function formatCurrency(amount: number, currency: string = "ARS"): string {
  if (currency === "USD") {
    return `u$s ${amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${amount.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formatea una fecha en formato argentino
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date + "T12:00:00") : date;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formatea una fecha para mostrar (más legible)
 */
export function formatDateDisplay(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date + "T12:00:00") : date;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) {
    return "Hoy";
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return "Ayer";
  }

  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Reemplaza placeholders en un template
 */
export function interpolate(template: string, values: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value || "-");
  }
  return result;
}
