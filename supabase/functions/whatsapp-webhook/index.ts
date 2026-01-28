// WhatsApp Webhook for Cashé - Button Flow Version
// No AI required - uses interactive buttons and lists

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!
const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')!
const whatsappVerifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!

// Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Flow steps
type FlowStep =
  | 'idle'
  | 'select_type'
  | 'select_account'
  | 'select_from_account'
  | 'select_to_account'
  | 'select_category'
  | 'enter_amount'
  | 'enter_to_amount'
  | 'confirm'

interface FlowState {
  step: FlowStep
  type?: 'expense' | 'income' | 'transfer'
  account_id?: string
  account_name?: string
  from_account_id?: string
  from_account_name?: string
  from_currency?: string
  to_account_id?: string
  to_account_name?: string
  to_currency?: string
  category_id?: string
  category_name?: string
  amount?: number
  from_amount?: number
  to_amount?: number
  currency?: string
}

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  // Webhook verification (GET request from Meta)
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === whatsappVerifyToken) {
      console.log('Webhook verified successfully')
      return new Response(challenge, { status: 200 })
    }
    return new Response('Forbidden', { status: 403 })
  }

  // Message processing (POST request)
  if (req.method === 'POST') {
    try {
      const body = await req.json()

      // Extract message from webhook payload
      const entry = body.entry?.[0]
      const changes = entry?.changes?.[0]
      const value = changes?.value
      const message = value?.messages?.[0]

      if (!message) {
        return new Response('OK', { status: 200 })
      }

      const phoneNumber = message.from

      // Extract message content based on type
      let messageText = ''
      let buttonId = ''
      let listId = ''

      if (message.type === 'text') {
        messageText = message.text?.body || ''
      } else if (message.type === 'interactive') {
        if (message.interactive?.button_reply) {
          buttonId = message.interactive.button_reply.id
          messageText = buttonId
        } else if (message.interactive?.list_reply) {
          listId = message.interactive.list_reply.id
          messageText = listId
        }
      }

      console.log(`Message from ${phoneNumber}: ${messageText} (button: ${buttonId}, list: ${listId})`)

      // Process the message
      await processMessage(phoneNumber, messageText, buttonId, listId)

      return new Response('OK', { status: 200 })
    } catch (error) {
      console.error('Error processing webhook:', error)
      return new Response('OK', { status: 200 })
    }
  }

  return new Response('Method not allowed', { status: 405 })
})

// ============================================
// PROCESS MESSAGE
// ============================================
async function processMessage(phoneNumber: string, messageText: string, buttonId: string, listId: string) {
  try {
    // 1. Check if user is linked
    const { data: whatsappUser } = await supabase
      .from('whatsapp_users')
      .select('*, user_id')
      .eq('phone_number', phoneNumber)
      .eq('verified', true)
      .single()

    if (!whatsappUser) {
      await handleUnlinkedUser(phoneNumber, messageText)
      return
    }

    // 2. Get current flow state
    const { data: pendingAction } = await supabase
      .from('whatsapp_pending_actions')
      .select('*')
      .eq('whatsapp_user_id', whatsappUser.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const flowState: FlowState = pendingAction?.action_data || { step: 'idle' }

    // 3. Process based on current step
    await handleFlowStep(whatsappUser, pendingAction, flowState, messageText, buttonId, listId, phoneNumber)

  } catch (error) {
    console.error('Error in processMessage:', error)
    await sendWhatsAppMessage(phoneNumber, '❌ Hubo un error. Escribí "menu" para empezar de nuevo.')
  }
}

// ============================================
// HANDLE UNLINKED USER
// ============================================
async function handleUnlinkedUser(phoneNumber: string, messageText: string) {
  const codeMatch = messageText.trim().match(/^\d{6}$/)

  if (codeMatch) {
    const code = codeMatch[0]

    const { data: pendingLink } = await supabase
      .from('whatsapp_users')
      .select('*')
      .eq('verification_code', code)
      .eq('verified', false)
      .gt('verification_expires_at', new Date().toISOString())
      .single()

    if (pendingLink) {
      await supabase
        .from('whatsapp_users')
        .update({
          phone_number: phoneNumber,
          verified: true,
          verification_code: null,
          verification_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', pendingLink.id)

      await sendWhatsAppMessage(phoneNumber, `✅ *¡Cuenta vinculada!*\n\nYa podés usar Cashé por WhatsApp.`)
      await showMainMenu(phoneNumber)
      return
    }

    await sendWhatsAppMessage(phoneNumber, '❌ Código inválido o expirado.\n\nGenerá uno nuevo desde la app.')
    return
  }

  await sendWhatsAppMessage(phoneNumber, `¡Hola! 👋 Soy el bot de *Cashé*.

Para vincular tu cuenta:
1️⃣ Abrí cashe.ar
2️⃣ Andá a *Integraciones*
3️⃣ Hacé click en *Vincular WhatsApp*
4️⃣ Enviame el código de 6 dígitos`)
}

// ============================================
// HANDLE FLOW STEP
// ============================================
async function handleFlowStep(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  messageText: string,
  buttonId: string,
  listId: string,
  phoneNumber: string
) {
  const lowerText = messageText.toLowerCase().trim()

  // Global commands
  if (['menu', 'inicio', 'empezar', 'hola', 'hi', 'hello', 'cancelar', 'salir'].includes(lowerText)) {
    if (pendingAction) {
      await supabase
        .from('whatsapp_pending_actions')
        .update({ status: 'cancelled' })
        .eq('id', pendingAction.id)
    }
    await showMainMenu(phoneNumber)
    return
  }

  // Handle based on current step
  switch (flowState.step) {
    case 'idle':
      await handleIdleStep(whatsappUser, buttonId, phoneNumber)
      break

    case 'select_type':
      await handleSelectType(whatsappUser, pendingAction, buttonId, phoneNumber)
      break

    case 'select_account':
      await handleSelectAccount(whatsappUser, pendingAction, flowState, listId, phoneNumber)
      break

    case 'select_from_account':
      await handleSelectFromAccount(whatsappUser, pendingAction, flowState, listId, phoneNumber)
      break

    case 'select_to_account':
      await handleSelectToAccount(whatsappUser, pendingAction, flowState, listId, phoneNumber)
      break

    case 'select_category':
      await handleSelectCategory(whatsappUser, pendingAction, flowState, listId, phoneNumber)
      break

    case 'enter_amount':
      await handleEnterAmount(whatsappUser, pendingAction, flowState, messageText, phoneNumber)
      break

    case 'enter_to_amount':
      await handleEnterToAmount(whatsappUser, pendingAction, flowState, messageText, phoneNumber)
      break

    case 'confirm':
      await handleConfirm(whatsappUser, pendingAction, flowState, buttonId, phoneNumber)
      break

    default:
      await showMainMenu(phoneNumber)
  }
}

// ============================================
// SHOW MAIN MENU
// ============================================
async function showMainMenu(phoneNumber: string) {
  await sendWhatsAppButtons(
    phoneNumber,
    '¿Qué querés hacer?',
    [
      { id: 'type_expense', title: '💸 Registrar gasto' },
      { id: 'type_income', title: '💰 Registrar ingreso' },
      { id: 'type_transfer', title: '🔄 Transferencia' }
    ],
    '📊 Cashé'
  )
}

// ============================================
// STEP HANDLERS
// ============================================

async function handleIdleStep(whatsappUser: any, buttonId: string, phoneNumber: string) {
  if (['type_expense', 'type_income', 'type_transfer'].includes(buttonId)) {
    const type = buttonId === 'type_expense' ? 'expense' : buttonId === 'type_income' ? 'income' : 'transfer'

    // Create pending action
    await supabase
      .from('whatsapp_pending_actions')
      .insert({
        whatsapp_user_id: whatsappUser.id,
        action_type: type === 'transfer' ? 'transfer' : 'movement',
        action_data: { step: type === 'transfer' ? 'select_from_account' : 'select_account', type },
        status: 'pending'
      })

    if (type === 'transfer') {
      await showAccountList(whatsappUser.user_id, phoneNumber, '¿Desde qué cuenta?', 'from_')
    } else {
      await showAccountList(whatsappUser.user_id, phoneNumber, '¿En qué cuenta?', '')
    }
  } else {
    await showMainMenu(phoneNumber)
  }
}

async function handleSelectType(whatsappUser: any, pendingAction: any, buttonId: string, phoneNumber: string) {
  // This shouldn't happen normally but handle it
  await handleIdleStep(whatsappUser, buttonId, phoneNumber)
}

async function handleSelectAccount(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  listId: string,
  phoneNumber: string
) {
  if (!listId.startsWith('acc_')) {
    await sendWhatsAppMessage(phoneNumber, '⚠️ Por favor seleccioná una cuenta de la lista.')
    await showAccountList(whatsappUser.user_id, phoneNumber, '¿En qué cuenta?', '')
    return
  }

  const accountId = listId.replace('acc_', '')
  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, currency')
    .eq('id', accountId)
    .single()

  if (!account) {
    await sendWhatsAppMessage(phoneNumber, '❌ Cuenta no encontrada.')
    await showAccountList(whatsappUser.user_id, phoneNumber, '¿En qué cuenta?', '')
    return
  }

  // Update flow state
  const newState: FlowState = {
    ...flowState,
    step: 'select_category',
    account_id: account.id,
    account_name: account.name,
    currency: account.currency
  }

  await supabase
    .from('whatsapp_pending_actions')
    .update({ action_data: newState })
    .eq('id', pendingAction.id)

  // Show categories
  await showCategoryList(whatsappUser.user_id, flowState.type!, phoneNumber)
}

async function handleSelectFromAccount(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  listId: string,
  phoneNumber: string
) {
  if (!listId.startsWith('from_acc_')) {
    await sendWhatsAppMessage(phoneNumber, '⚠️ Por favor seleccioná una cuenta de la lista.')
    await showAccountList(whatsappUser.user_id, phoneNumber, '¿Desde qué cuenta?', 'from_')
    return
  }

  const accountId = listId.replace('from_acc_', '')
  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, currency')
    .eq('id', accountId)
    .single()

  if (!account) {
    await sendWhatsAppMessage(phoneNumber, '❌ Cuenta no encontrada.')
    return
  }

  const newState: FlowState = {
    ...flowState,
    step: 'select_to_account',
    from_account_id: account.id,
    from_account_name: account.name,
    from_currency: account.currency
  }

  await supabase
    .from('whatsapp_pending_actions')
    .update({ action_data: newState })
    .eq('id', pendingAction.id)

  await showAccountList(whatsappUser.user_id, phoneNumber, '¿Hacia qué cuenta?', 'to_', account.id)
}

async function handleSelectToAccount(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  listId: string,
  phoneNumber: string
) {
  if (!listId.startsWith('to_acc_')) {
    await sendWhatsAppMessage(phoneNumber, '⚠️ Por favor seleccioná una cuenta de la lista.')
    await showAccountList(whatsappUser.user_id, phoneNumber, '¿Hacia qué cuenta?', 'to_', flowState.from_account_id)
    return
  }

  const accountId = listId.replace('to_acc_', '')
  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, currency')
    .eq('id', accountId)
    .single()

  if (!account) {
    await sendWhatsAppMessage(phoneNumber, '❌ Cuenta no encontrada.')
    return
  }

  const newState: FlowState = {
    ...flowState,
    step: 'enter_amount',
    to_account_id: account.id,
    to_account_name: account.name,
    to_currency: account.currency
  }

  await supabase
    .from('whatsapp_pending_actions')
    .update({ action_data: newState })
    .eq('id', pendingAction.id)

  const currencyLabel = flowState.from_currency === 'USD' ? 'USD' : '$'
  await sendWhatsAppMessage(phoneNumber, `💵 ¿Cuánto transferís?\n\nEscribí el monto (ej: 5000)`)
}

async function handleSelectCategory(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  listId: string,
  phoneNumber: string
) {
  if (!listId.startsWith('cat_')) {
    await sendWhatsAppMessage(phoneNumber, '⚠️ Por favor seleccioná una categoría de la lista.')
    await showCategoryList(whatsappUser.user_id, flowState.type!, phoneNumber)
    return
  }

  const categoryId = listId.replace('cat_', '')
  const { data: category } = await supabase
    .from('categories')
    .select('id, name')
    .eq('id', categoryId)
    .single()

  if (!category) {
    await sendWhatsAppMessage(phoneNumber, '❌ Categoría no encontrada.')
    return
  }

  const newState: FlowState = {
    ...flowState,
    step: 'enter_amount',
    category_id: category.id,
    category_name: category.name
  }

  await supabase
    .from('whatsapp_pending_actions')
    .update({ action_data: newState })
    .eq('id', pendingAction.id)

  const currencyLabel = flowState.currency === 'USD' ? 'USD' : '$'
  await sendWhatsAppMessage(phoneNumber, `💵 ¿Cuánto?\n\nEscribí el monto (ej: 5000)`)
}

async function handleEnterAmount(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  messageText: string,
  phoneNumber: string
) {
  const amount = parseAmount(messageText)

  if (!amount || amount <= 0) {
    await sendWhatsAppMessage(phoneNumber, '⚠️ Por favor escribí un monto válido.\n\nEjemplo: 5000')
    return
  }

  if (flowState.type === 'transfer') {
    // Check if different currencies
    if (flowState.from_currency !== flowState.to_currency) {
      const newState: FlowState = {
        ...flowState,
        step: 'enter_to_amount',
        from_amount: amount
      }

      await supabase
        .from('whatsapp_pending_actions')
        .update({ action_data: newState })
        .eq('id', pendingAction.id)

      const toCurrencyLabel = flowState.to_currency === 'USD' ? 'USD' : '$'
      await sendWhatsAppMessage(phoneNumber, `💵 ¿Cuánto recibís en ${flowState.to_account_name}?\n\nEscribí el monto en ${flowState.to_currency}`)
      return
    }

    // Same currency
    const newState: FlowState = {
      ...flowState,
      step: 'confirm',
      from_amount: amount,
      to_amount: amount
    }

    await supabase
      .from('whatsapp_pending_actions')
      .update({ action_data: newState })
      .eq('id', pendingAction.id)

    await showTransferConfirmation(newState, phoneNumber)

  } else {
    // Expense or Income
    const newState: FlowState = {
      ...flowState,
      step: 'confirm',
      amount
    }

    await supabase
      .from('whatsapp_pending_actions')
      .update({ action_data: newState })
      .eq('id', pendingAction.id)

    await showMovementConfirmation(newState, phoneNumber)
  }
}

async function handleEnterToAmount(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  messageText: string,
  phoneNumber: string
) {
  const amount = parseAmount(messageText)

  if (!amount || amount <= 0) {
    await sendWhatsAppMessage(phoneNumber, '⚠️ Por favor escribí un monto válido.\n\nEjemplo: 500')
    return
  }

  const newState: FlowState = {
    ...flowState,
    step: 'confirm',
    to_amount: amount
  }

  await supabase
    .from('whatsapp_pending_actions')
    .update({ action_data: newState })
    .eq('id', pendingAction.id)

  await showTransferConfirmation(newState, phoneNumber)
}

async function handleConfirm(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  buttonId: string,
  phoneNumber: string
) {
  if (buttonId === 'confirm_yes') {
    await executeAction(whatsappUser, pendingAction, flowState, phoneNumber)
  } else if (buttonId === 'confirm_no') {
    await supabase
      .from('whatsapp_pending_actions')
      .update({ status: 'cancelled' })
      .eq('id', pendingAction.id)

    await sendWhatsAppMessage(phoneNumber, '❌ Cancelado.')
    await showMainMenu(phoneNumber)
  } else {
    await sendWhatsAppMessage(phoneNumber, '⚠️ Usá los botones para confirmar o cancelar.')
  }
}

// ============================================
// EXECUTE ACTION
// ============================================
async function executeAction(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  phoneNumber: string
) {
  try {
    const today = new Date().toISOString().split('T')[0]

    if (flowState.type === 'transfer') {
      await supabase
        .from('transfers')
        .insert({
          user_id: whatsappUser.user_id,
          from_account_id: flowState.from_account_id,
          to_account_id: flowState.to_account_id,
          from_amount: flowState.from_amount,
          to_amount: flowState.to_amount,
          date: today,
          note: 'Registrado por WhatsApp'
        })

      await sendWhatsAppMessage(phoneNumber, '✅ Transferencia registrada!')

    } else {
      await supabase
        .from('movements')
        .insert({
          user_id: whatsappUser.user_id,
          type: flowState.type,
          amount: flowState.amount,
          account_id: flowState.account_id,
          category_id: flowState.category_id,
          date: today,
          note: 'Registrado por WhatsApp'
        })

      const label = flowState.type === 'expense' ? 'Gasto' : 'Ingreso'
      await sendWhatsAppMessage(phoneNumber, `✅ ${label} registrado!`)
    }

    await supabase
      .from('whatsapp_pending_actions')
      .update({ status: 'confirmed' })
      .eq('id', pendingAction.id)

    // Show menu again after a short delay
    setTimeout(() => showMainMenu(phoneNumber), 1000)

  } catch (error) {
    console.error('Error executing action:', error)
    await sendWhatsAppMessage(phoneNumber, '❌ Error al guardar. Intentá de nuevo.')
  }
}

// ============================================
// SHOW ACCOUNT LIST
// ============================================
async function showAccountList(
  userId: string,
  phoneNumber: string,
  title: string,
  prefix: string,
  excludeId?: string
) {
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, currency')
    .eq('user_id', userId)
    .order('name')

  if (!accounts || accounts.length === 0) {
    await sendWhatsAppMessage(phoneNumber, '❌ No tenés cuentas configuradas.\n\nAgregá una cuenta en cashe.ar')
    return
  }

  const filteredAccounts = excludeId
    ? accounts.filter(a => a.id !== excludeId)
    : accounts

  const rows = filteredAccounts.slice(0, 10).map(acc => ({
    id: `${prefix}acc_${acc.id}`,
    title: acc.name.slice(0, 24),
    description: acc.currency
  }))

  await sendWhatsAppList(
    phoneNumber,
    title,
    'Seleccionar',
    [{ title: 'Cuentas', rows }]
  )
}

// ============================================
// SHOW CATEGORY LIST
// ============================================
async function showCategoryList(userId: string, type: string, phoneNumber: string) {
  const categoryType = type === 'expense' ? 'expense' : 'income'

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .eq('type', categoryType)
    .order('name')

  if (!categories || categories.length === 0) {
    await sendWhatsAppMessage(phoneNumber, '❌ No tenés categorías configuradas.\n\nAgregá categorías en cashe.ar')
    return
  }

  const rows = categories.slice(0, 10).map(cat => ({
    id: `cat_${cat.id}`,
    title: cat.name.slice(0, 24)
  }))

  await sendWhatsAppList(
    phoneNumber,
    type === 'expense' ? '¿En qué categoría?' : '¿De qué categoría?',
    'Seleccionar',
    [{ title: 'Categorías', rows }]
  )
}

// ============================================
// SHOW CONFIRMATIONS
// ============================================
async function showMovementConfirmation(flowState: FlowState, phoneNumber: string) {
  const isExpense = flowState.type === 'expense'
  const emoji = isExpense ? '💸' : '💰'
  const typeLabel = isExpense ? 'Gasto' : 'Ingreso'
  const amount = formatCurrency(flowState.amount!, flowState.currency || 'ARS')

  const body = `${emoji} ${amount}\n📁 ${flowState.category_name}\n💳 ${flowState.account_name}\n📅 Hoy`

  await sendWhatsAppButtons(
    phoneNumber,
    body,
    [
      { id: 'confirm_yes', title: '✅ Confirmar' },
      { id: 'confirm_no', title: '❌ Cancelar' }
    ],
    `📝 ${typeLabel}`
  )
}

async function showTransferConfirmation(flowState: FlowState, phoneNumber: string) {
  const fromAmount = formatCurrency(flowState.from_amount!, flowState.from_currency || 'ARS')
  const toAmount = formatCurrency(flowState.to_amount!, flowState.to_currency || 'ARS')

  let body = ''
  if (flowState.from_currency !== flowState.to_currency) {
    body = `💸 Enviás: ${fromAmount}\n🏦 Desde: ${flowState.from_account_name}\n💵 Recibís: ${toAmount}\n🏦 Hacia: ${flowState.to_account_name}\n📅 Hoy`
  } else {
    body = `💸 ${fromAmount}\n🏦 ${flowState.from_account_name} → ${flowState.to_account_name}\n📅 Hoy`
  }

  await sendWhatsAppButtons(
    phoneNumber,
    body,
    [
      { id: 'confirm_yes', title: '✅ Confirmar' },
      { id: 'confirm_no', title: '❌ Cancelar' }
    ],
    '📝 Transferencia'
  )
}

// ============================================
// WHATSAPP API FUNCTIONS
// ============================================

function normalizePhoneNumber(phone: string): string {
  let normalized = phone.startsWith('+') ? phone : `+${phone}`
  if (normalized.startsWith('+549')) {
    normalized = '+54' + normalized.slice(4)
  }
  return normalized
}

async function sendWhatsAppMessage(to: string, message: string) {
  const normalizedTo = normalizePhoneNumber(to)

  try {
    await fetch(
      `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizedTo,
          type: 'text',
          text: { body: message }
        })
      }
    )
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

async function sendWhatsAppButtons(
  to: string,
  body: string,
  buttons: { id: string, title: string }[],
  header?: string
) {
  const normalizedTo = normalizePhoneNumber(to)

  const interactive: any = {
    type: 'button',
    body: { text: body },
    action: {
      buttons: buttons.slice(0, 3).map(btn => ({
        type: 'reply',
        reply: {
          id: btn.id,
          title: btn.title.slice(0, 20)
        }
      }))
    }
  }

  if (header) {
    interactive.header = { type: 'text', text: header }
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizedTo,
          type: 'interactive',
          interactive
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('WhatsApp buttons error:', errorText)
      // Fallback
      await sendWhatsAppMessage(to, `${header ? header + '\n\n' : ''}${body}`)
    }
  } catch (error) {
    console.error('Error sending buttons:', error)
    await sendWhatsAppMessage(to, body)
  }
}

async function sendWhatsAppList(
  to: string,
  body: string,
  buttonText: string,
  sections: { title: string, rows: { id: string, title: string, description?: string }[] }[]
) {
  const normalizedTo = normalizePhoneNumber(to)

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalizedTo,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: { text: body },
            action: {
              button: buttonText,
              sections
            }
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('WhatsApp list error:', errorText)
      // Fallback to text
      const items = sections.flatMap(s => s.rows.map(r => `• ${r.title}`)).join('\n')
      await sendWhatsAppMessage(to, `${body}\n\n${items}`)
    }
  } catch (error) {
    console.error('Error sending list:', error)
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function parseAmount(text: string): number | null {
  // Remove currency symbols and spaces
  const cleaned = text.replace(/[$\s.,]/g, (match) => {
    if (match === ',') return '' // Remove thousand separators
    if (match === '.') return '' // Remove dots used as thousand separators
    return ''
  }).replace(/[^\d]/g, '')

  const amount = parseInt(cleaned, 10)
  return isNaN(amount) ? null : amount
}

function formatCurrency(amount: number, currency: string): string {
  if (currency === 'USD') {
    return `USD ${amount.toLocaleString('es-AR')}`
  }
  return `$${amount.toLocaleString('es-AR')}`
}
