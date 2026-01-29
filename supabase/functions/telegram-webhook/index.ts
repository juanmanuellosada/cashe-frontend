// Telegram Webhook for Cashé
// Same functionality as WhatsApp bot but using Telegram Bot API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!

// Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Telegram API base URL
const TELEGRAM_API = `https://api.telegram.org/bot${telegramToken}`

// Flow steps (same as WhatsApp)
type FlowStep =
  | 'idle'
  | 'select_account'
  | 'select_from_account'
  | 'select_to_account'
  | 'select_category'
  | 'select_category_page2'
  | 'enter_amount'
  | 'enter_to_amount'
  | 'enter_note'
  | 'confirm'
  | 'query_select'
  | 'query_category_select'
  | 'query_period_select'

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
  note?: string
  query_type?: string
  query_category_id?: string
  query_category_name?: string
}

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('OK', { status: 200 })
  }

  try {
    const update = await req.json()

    // Handle callback queries (button clicks)
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query)
      return new Response('OK', { status: 200 })
    }

    // Handle regular messages
    const message = update.message
    if (!message) {
      return new Response('OK', { status: 200 })
    }

    const chatId = message.chat.id
    const telegramId = message.from.id
    const messageText = message.text || ''
    const telegramUser = message.from

    console.log(`Message from ${telegramId}: ${messageText}`)
    await processMessage(chatId, telegramId, messageText, telegramUser)

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('OK', { status: 200 })
  }
})

// ============================================
// HANDLE CALLBACK QUERY (Button clicks)
// ============================================
async function handleCallbackQuery(callbackQuery: any) {
  const chatId = callbackQuery.message.chat.id
  const telegramId = callbackQuery.from.id
  const data = callbackQuery.data

  // Acknowledge the callback
  await answerCallbackQuery(callbackQuery.id)

  // Process as if it were a message with the callback data
  await processMessage(chatId, telegramId, data, callbackQuery.from, true)
}

// ============================================
// PROCESS MESSAGE
// ============================================
async function processMessage(
  chatId: number,
  telegramId: number,
  messageText: string,
  telegramUser: any,
  isCallback: boolean = false
) {
  try {
    // Check if user is linked
    const { data: tgUser } = await supabase
      .from('telegram_users')
      .select('*, user_id')
      .eq('telegram_id', telegramId)
      .eq('verified', true)
      .single()

    if (!tgUser) {
      await handleUnlinkedUser(chatId, telegramId, messageText, telegramUser)
      return
    }

    // Get pending action
    const { data: pendingAction } = await supabase
      .from('telegram_pending_actions')
      .select('*')
      .eq('telegram_user_id', tgUser.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const flowState: FlowState = pendingAction?.action_data || { step: 'idle' }
    await handleFlowStep(tgUser, pendingAction, flowState, messageText, chatId, isCallback)

  } catch (error) {
    console.error('Error in processMessage:', error)
    await sendMessage(chatId, '❌ Hubo un error. Escribí /menu para empezar de nuevo.')
  }
}

// ============================================
// HANDLE UNLINKED USER
// ============================================
async function handleUnlinkedUser(
  chatId: number,
  telegramId: number,
  messageText: string,
  telegramUser: any
) {
  // Check for /start with verification code
  const startMatch = messageText.match(/^\/start\s+(\d{6})$/)
  const codeMatch = messageText.trim().match(/^\d{6}$/)
  const code = startMatch?.[1] || (codeMatch ? codeMatch[0] : null)

  if (code) {
    const { data: pendingLink } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('verification_code', code)
      .eq('verified', false)
      .gt('verification_expires_at', new Date().toISOString())
      .single()

    if (pendingLink) {
      // Update with Telegram info
      await supabase
        .from('telegram_users')
        .update({
          telegram_id: telegramId,
          telegram_username: telegramUser.username || null,
          telegram_first_name: telegramUser.first_name || null,
          verified: true,
          verification_code: null,
          verification_expires_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', pendingLink.id)

      const name = telegramUser.first_name || 'Usuario'
      await sendMessage(chatId, `✅ *¡Cuenta vinculada, ${name}!*\n\nYa podés usar Cashé desde Telegram.`, { parse_mode: 'Markdown' })
      await showMainMenu(chatId)
      return
    }

    await sendMessage(chatId, '❌ Código inválido o expirado.\n\nGenerá uno nuevo desde cashe.ar/integraciones')
    return
  }

  // Show welcome message for unlinked users with direct link
  const keyboard = {
    inline_keyboard: [
      [{ text: '🔗 Vincular mi cuenta', url: 'https://cashe.ar/integraciones' }]
    ]
  }

  await sendMessage(chatId, `¡Hola! 👋 Soy el bot de *Cashé*.

Para usar el bot, primero tenés que vincular tu cuenta.

Tocá el botón de abajo, generá el código y volvé a enviármelo acá.`, { parse_mode: 'Markdown', reply_markup: keyboard })
}

// ============================================
// HANDLE FLOW STEP
// ============================================
async function handleFlowStep(
  tgUser: any,
  pendingAction: any,
  flowState: FlowState,
  messageText: string,
  chatId: number,
  isCallback: boolean
) {
  const lowerText = messageText.toLowerCase().trim()

  // Global commands
  const cancelWords = ['cancelar', 'cancel', 'salir', 'volver', 'atras', 'atrás', 'no', 'x', '0', '/cancel']
  const menuWords = ['menu', 'menú', 'inicio', 'empezar', 'hola', '/start', '/menu', '/help']

  if (menuWords.includes(lowerText)) {
    if (pendingAction) {
      await supabase.from('telegram_pending_actions').update({ status: 'cancelled' }).eq('id', pendingAction.id)
    }
    await showMainMenu(chatId)
    return
  }

  if (cancelWords.includes(lowerText)) {
    if (pendingAction) {
      await supabase.from('telegram_pending_actions').update({ status: 'cancelled' }).eq('id', pendingAction.id)
      await sendMessage(chatId, '❌ Cancelado.')
    }
    await showMainMenu(chatId)
    return
  }

  // Handle based on current step
  switch (flowState.step) {
    case 'idle':
      await handleIdleStep(tgUser, messageText, chatId)
      break
    case 'select_account':
      await handleSelectAccount(tgUser, pendingAction, flowState, messageText, chatId)
      break
    case 'select_from_account':
      await handleSelectFromAccount(tgUser, pendingAction, flowState, messageText, chatId)
      break
    case 'select_to_account':
      await handleSelectToAccount(tgUser, pendingAction, flowState, messageText, chatId)
      break
    case 'select_category':
    case 'select_category_page2':
      await handleSelectCategory(tgUser, pendingAction, flowState, messageText, chatId)
      break
    case 'enter_amount':
      await handleEnterAmount(tgUser, pendingAction, flowState, messageText, chatId)
      break
    case 'enter_to_amount':
      await handleEnterToAmount(tgUser, pendingAction, flowState, messageText, chatId)
      break
    case 'enter_note':
      await handleEnterNote(tgUser, pendingAction, flowState, messageText, chatId)
      break
    case 'confirm':
      await handleConfirm(tgUser, pendingAction, flowState, messageText, chatId)
      break
    case 'query_category_select':
      await handleQueryCategorySelect(tgUser, pendingAction, flowState, messageText, chatId)
      break
    case 'query_period_select':
      await handleQueryPeriodSelect(tgUser, pendingAction, flowState, messageText, chatId)
      break
    default:
      await showMainMenu(chatId)
  }
}

// ============================================
// SHOW MAIN MENU
// ============================================
async function showMainMenu(chatId: number) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: '💸 Gasto', callback_data: 'type_expense' },
        { text: '💰 Ingreso', callback_data: 'type_income' }
      ],
      [
        { text: '🔄 Transferencia', callback_data: 'type_transfer' }
      ],
      [
        { text: '💰 Ver saldos', callback_data: 'query_balances' },
        { text: '📈 Resumen', callback_data: 'query_summary' }
      ],
      [
        { text: '📁 Por categoría', callback_data: 'query_category' },
        { text: '🕐 Últimos', callback_data: 'query_recent' }
      ]
    ]
  }

  await sendMessage(chatId, '¿Qué querés hacer?', { reply_markup: keyboard })
}

// ============================================
// STEP HANDLERS
// ============================================

async function handleIdleStep(tgUser: any, messageText: string, chatId: number) {
  // Handle menu selections
  if (messageText === 'type_expense' || messageText === 'type_income' || messageText === 'type_transfer') {
    const type = messageText === 'type_expense' ? 'expense' : messageText === 'type_income' ? 'income' : 'transfer'

    await supabase.from('telegram_pending_actions').insert({
      telegram_user_id: tgUser.id,
      action_type: type === 'transfer' ? 'transfer' : 'movement',
      action_data: { step: type === 'transfer' ? 'select_from_account' : 'select_account', type },
      status: 'pending'
    })

    if (type === 'transfer') {
      await showAccountList(tgUser.user_id, chatId, '¿Desde qué cuenta transferís?', 'from_')
    } else {
      await showAccountList(tgUser.user_id, chatId, type === 'expense' ? '¿De qué cuenta sale?' : '¿A qué cuenta entra?', '')
    }
    return
  }

  // Handle query selections
  if (messageText.startsWith('query_')) {
    await handleQueryStart(tgUser, messageText, chatId)
    return
  }

  await showMainMenu(chatId)
}

async function handleSelectAccount(
  tgUser: any,
  pendingAction: any,
  flowState: FlowState,
  selection: string,
  chatId: number
) {
  if (!selection.startsWith('acc_')) {
    await sendMessage(chatId, '⚠️ Seleccioná una cuenta del menú.')
    await showAccountList(tgUser.user_id, chatId, '¿En qué cuenta?', '')
    return
  }

  const accountId = selection.replace('acc_', '')
  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, currency')
    .eq('id', accountId)
    .single()

  if (!account) {
    await sendMessage(chatId, '❌ Cuenta no encontrada.')
    return
  }

  const newState: FlowState = {
    ...flowState,
    step: 'select_category',
    account_id: account.id,
    account_name: account.name,
    currency: account.currency
  }

  await supabase.from('telegram_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
  await showCategoryList(tgUser.user_id, flowState.type!, chatId, 1)
}

async function handleSelectFromAccount(
  tgUser: any,
  pendingAction: any,
  flowState: FlowState,
  selection: string,
  chatId: number
) {
  if (!selection.startsWith('from_acc_')) {
    await sendMessage(chatId, '⚠️ Seleccioná una cuenta del menú.')
    return
  }

  const accountId = selection.replace('from_acc_', '')
  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, currency')
    .eq('id', accountId)
    .single()

  if (!account) return

  const newState: FlowState = {
    ...flowState,
    step: 'select_to_account',
    from_account_id: account.id,
    from_account_name: account.name,
    from_currency: account.currency
  }

  await supabase.from('telegram_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
  await showAccountList(tgUser.user_id, chatId, '¿Hacia qué cuenta?', 'to_', account.id)
}

async function handleSelectToAccount(
  tgUser: any,
  pendingAction: any,
  flowState: FlowState,
  selection: string,
  chatId: number
) {
  if (!selection.startsWith('to_acc_')) {
    await sendMessage(chatId, '⚠️ Seleccioná una cuenta del menú.')
    return
  }

  const accountId = selection.replace('to_acc_', '')
  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, currency')
    .eq('id', accountId)
    .single()

  if (!account) return

  const newState: FlowState = {
    ...flowState,
    step: 'enter_amount',
    to_account_id: account.id,
    to_account_name: account.name,
    to_currency: account.currency
  }

  await supabase.from('telegram_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
  await sendMessage(chatId, `💵 *¿Cuánto transferís?*\n\nEscribí el monto en ${flowState.from_currency || 'pesos'}`, { parse_mode: 'Markdown' })
}

async function handleSelectCategory(
  tgUser: any,
  pendingAction: any,
  flowState: FlowState,
  selection: string,
  chatId: number
) {
  // Handle pagination
  if (selection === 'cat_more') {
    const newState: FlowState = { ...flowState, step: 'select_category_page2' }
    await supabase.from('telegram_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
    await showCategoryList(tgUser.user_id, flowState.type!, chatId, 2)
    return
  }

  if (selection === 'cat_back') {
    const newState: FlowState = { ...flowState, step: 'select_category' }
    await supabase.from('telegram_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
    await showCategoryList(tgUser.user_id, flowState.type!, chatId, 1)
    return
  }

  if (!selection.startsWith('cat_')) {
    await sendMessage(chatId, '⚠️ Seleccioná una categoría del menú.')
    return
  }

  const categoryId = selection.replace('cat_', '')
  const { data: category } = await supabase
    .from('categories')
    .select('id, name')
    .eq('id', categoryId)
    .single()

  if (!category) return

  const newState: FlowState = {
    ...flowState,
    step: 'enter_amount',
    category_id: category.id,
    category_name: category.name
  }

  await supabase.from('telegram_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
  await sendMessage(chatId, `💵 *¿Cuánto?*\n\nEscribí el monto en ${flowState.currency || 'pesos'}`, { parse_mode: 'Markdown' })
}

async function handleEnterAmount(
  tgUser: any,
  pendingAction: any,
  flowState: FlowState,
  messageText: string,
  chatId: number
) {
  const amount = parseAmount(messageText)

  if (!amount || amount <= 0) {
    await sendMessage(chatId, '⚠️ Escribí un monto válido.\n\nEjemplo: 5000')
    return
  }

  if (flowState.type === 'transfer') {
    if (flowState.from_currency !== flowState.to_currency) {
      const newState: FlowState = { ...flowState, step: 'enter_to_amount', from_amount: amount }
      await supabase.from('telegram_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
      await sendMessage(chatId, `💵 *¿Cuánto recibís?*\n\nEscribí el monto en ${flowState.to_currency}`, { parse_mode: 'Markdown' })
      return
    }

    const newState: FlowState = { ...flowState, step: 'enter_note', from_amount: amount, to_amount: amount }
    await supabase.from('telegram_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
    await askForNote(chatId)
  } else {
    const newState: FlowState = { ...flowState, step: 'enter_note', amount }
    await supabase.from('telegram_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
    await askForNote(chatId)
  }
}

async function handleEnterToAmount(
  tgUser: any,
  pendingAction: any,
  flowState: FlowState,
  messageText: string,
  chatId: number
) {
  const amount = parseAmount(messageText)

  if (!amount || amount <= 0) {
    await sendMessage(chatId, '⚠️ Escribí un monto válido.')
    return
  }

  const newState: FlowState = { ...flowState, step: 'enter_note', to_amount: amount }
  await supabase.from('telegram_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
  await askForNote(chatId)
}

async function askForNote(chatId: number) {
  const keyboard = {
    inline_keyboard: [
      [
        { text: '⏭️ Omitir', callback_data: 'note_skip' },
        { text: '📝 Agregar nota', callback_data: 'note_add' }
      ]
    ]
  }
  await sendMessage(chatId, '¿Querés agregar una nota?', { reply_markup: keyboard })
}

async function handleEnterNote(
  tgUser: any,
  pendingAction: any,
  flowState: FlowState,
  messageText: string,
  chatId: number
) {
  if (messageText === 'note_skip') {
    const newState: FlowState = { ...flowState, step: 'confirm', note: undefined }
    await supabase.from('telegram_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
    await showConfirmation(newState, chatId)
    return
  }

  if (messageText === 'note_add') {
    await sendMessage(chatId, '📝 Escribí la nota:')
    return
  }

  // User wrote a note
  const newState: FlowState = { ...flowState, step: 'confirm', note: messageText.slice(0, 200) }
  await supabase.from('telegram_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
  await showConfirmation(newState, chatId)
}

async function handleConfirm(
  tgUser: any,
  pendingAction: any,
  flowState: FlowState,
  messageText: string,
  chatId: number
) {
  if (messageText === 'confirm_yes') {
    await executeAction(tgUser, pendingAction, flowState, chatId)
  } else if (messageText === 'confirm_no') {
    await supabase.from('telegram_pending_actions').update({ status: 'cancelled' }).eq('id', pendingAction.id)
    await sendMessage(chatId, '❌ Cancelado.')
    await showMainMenu(chatId)
  } else {
    await sendMessage(chatId, '⚠️ Usá los botones para confirmar.')
  }
}

// ============================================
// QUERY HANDLERS
// ============================================

async function handleQueryStart(tgUser: any, queryType: string, chatId: number) {
  const userId = tgUser.user_id

  switch (queryType) {
    case 'query_balances':
      await showBalances(userId, chatId)
      break

    case 'query_summary':
      await showMonthlySummary(userId, chatId)
      break

    case 'query_category':
      await supabase.from('telegram_pending_actions').insert({
        telegram_user_id: tgUser.id,
        action_type: 'query',
        action_data: { step: 'query_category_select', query_type: 'category' },
        status: 'pending'
      })
      await showQueryCategoryList(userId, chatId)
      break

    case 'query_recent':
      await showRecentMovements(userId, chatId)
      break

    default:
      await showMainMenu(chatId)
  }
}

async function handleQueryCategorySelect(
  tgUser: any,
  pendingAction: any,
  flowState: FlowState,
  selection: string,
  chatId: number
) {
  if (!selection.startsWith('qcat_')) {
    await sendMessage(chatId, '⚠️ Seleccioná una categoría.')
    return
  }

  const categoryId = selection.replace('qcat_', '')
  const { data: category } = await supabase
    .from('categories')
    .select('id, name')
    .eq('id', categoryId)
    .single()

  if (!category) return

  const newState: FlowState = {
    ...flowState,
    step: 'query_period_select',
    query_category_id: category.id,
    query_category_name: category.name
  }

  await supabase.from('telegram_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
  await showPeriodList(chatId)
}

async function handleQueryPeriodSelect(
  tgUser: any,
  pendingAction: any,
  flowState: FlowState,
  selection: string,
  chatId: number
) {
  let startDate: string
  let endDate: string
  let periodLabel: string

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (selection) {
    case 'period_this_month':
      startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`
      endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`
      periodLabel = 'este mes'
      break
    case 'period_last_month':
      const lastMonth = month === 0 ? 11 : month - 1
      const lastMonthYear = month === 0 ? year - 1 : year
      startDate = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}-01`
      endDate = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}-31`
      periodLabel = 'el mes pasado'
      break
    case 'period_last_3_months':
      const threeMonthsAgo = new Date(year, month - 2, 1)
      startDate = threeMonthsAgo.toISOString().split('T')[0]
      endDate = `${year}-${String(month + 1).padStart(2, '0')}-31`
      periodLabel = 'los últimos 3 meses'
      break
    default:
      await sendMessage(chatId, '⚠️ Seleccioná un período.')
      return
  }

  await showCategoryDetail(
    tgUser.user_id,
    flowState.query_category_id!,
    flowState.query_category_name!,
    startDate,
    endDate,
    periodLabel,
    chatId
  )

  await supabase.from('telegram_pending_actions').update({ status: 'confirmed' }).eq('id', pendingAction.id)
}

// ============================================
// QUERY DISPLAY FUNCTIONS
// ============================================

async function showBalances(userId: string, chatId: number) {
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, currency, initial_balance')
    .eq('user_id', userId)
    .order('name')

  if (!accounts || accounts.length === 0) {
    await sendMessage(chatId, '❌ No tenés cuentas configuradas.')
    await showMainMenu(chatId)
    return
  }

  let message = '💰 *Saldos de cuentas:*\n\n'

  for (const account of accounts) {
    const balance = await calculateAccountBalance(userId, account.id, account.initial_balance)
    const formatted = formatCurrency(balance, account.currency)
    const shortName = truncateName(account.name, 25)
    message += `• ${shortName}: ${formatted}\n`
  }

  await sendMessage(chatId, message, { parse_mode: 'Markdown' })
  await showMainMenu(chatId)
}

async function showMonthlySummary(userId: string, chatId: number) {
  const now = new Date()
  const startDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`

  const { data: expenses } = await supabase
    .from('movements')
    .select('amount, category:categories(name)')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .gte('date', startDate)
    .lte('date', endDate)

  const { data: incomes } = await supabase
    .from('movements')
    .select('amount')
    .eq('user_id', userId)
    .eq('type', 'income')
    .gte('date', startDate)
    .lte('date', endDate)

  const totalExpenses = (expenses || []).reduce((sum, m) => sum + Number(m.amount), 0)
  const totalIncomes = (incomes || []).reduce((sum, m) => sum + Number(m.amount), 0)

  // Group by category
  const byCategory: Record<string, number> = {}
  for (const e of expenses || []) {
    const cat = (e.category as any)?.name || 'Sin categoría'
    byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount)
  }

  const monthName = getMonthName(now.getMonth() + 1)
  let message = `📊 *Resumen de ${monthName}:*\n\n`
  message += `💰 Ingresos: ${formatCurrency(totalIncomes, 'ARS')}\n`
  message += `💸 Gastos: ${formatCurrency(totalExpenses, 'ARS')}\n`
  message += `📈 Balance: ${formatCurrency(totalIncomes - totalExpenses, 'ARS')}\n\n`

  if (Object.keys(byCategory).length > 0) {
    message += `*Gastos por categoría:*\n`
    const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 8)
    for (const [cat, amount] of sorted) {
      const shortCat = truncateName(cat, 18)
      message += `• ${shortCat}: ${formatCurrency(amount, 'ARS')}\n`
    }
  }

  await sendMessage(chatId, message, { parse_mode: 'Markdown' })
  await showMainMenu(chatId)
}

async function showCategoryDetail(
  userId: string,
  categoryId: string,
  categoryName: string,
  startDate: string,
  endDate: string,
  periodLabel: string,
  chatId: number
) {
  const { data: movements } = await supabase
    .from('movements')
    .select('amount, date, note, account:accounts(name)')
    .eq('user_id', userId)
    .eq('category_id', categoryId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  if (!movements || movements.length === 0) {
    await sendMessage(chatId, `📊 No hay movimientos en *${categoryName}* para ${periodLabel}.`, { parse_mode: 'Markdown' })
    await showMainMenu(chatId)
    return
  }

  const total = movements.reduce((sum, m) => sum + Number(m.amount), 0)

  let message = `📁 *${categoryName}* (${periodLabel}):\n\n`
  message += `Total: ${formatCurrency(total, 'ARS')}\n`
  message += `Movimientos: ${movements.length}\n\n`

  for (const m of movements.slice(0, 8)) {
    const date = new Date(m.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    const amount = formatCurrency(Number(m.amount), 'ARS')
    const account = (m.account as any)?.name ? ` (${truncateName((m.account as any).name, 12)})` : ''
    message += `• ${date} - ${amount}${account}\n`
  }

  if (movements.length > 8) {
    message += `\n... y ${movements.length - 8} más`
  }

  await sendMessage(chatId, message, { parse_mode: 'Markdown' })
  await showMainMenu(chatId)
}

async function showRecentMovements(userId: string, chatId: number) {
  const { data: movements } = await supabase
    .from('movements')
    .select('type, amount, date, category:categories(name), account:accounts(name)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)

  if (!movements || movements.length === 0) {
    await sendMessage(chatId, '📊 No hay movimientos recientes.')
    await showMainMenu(chatId)
    return
  }

  let message = '🕐 *Últimos movimientos:*\n\n'

  for (const m of movements) {
    const date = new Date(m.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    const emoji = m.type === 'expense' ? '💸' : '💰'
    const sign = m.type === 'expense' ? '-' : '+'
    const amount = formatCurrency(Number(m.amount), 'ARS')
    const cat = (m.category as any)?.name || ''
    const shortCat = truncateName(cat, 15)
    message += `${emoji} ${date} ${sign}${amount} ${shortCat}\n`
  }

  await sendMessage(chatId, message, { parse_mode: 'Markdown' })
  await showMainMenu(chatId)
}

async function showQueryCategoryList(userId: string, chatId: number) {
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .order('name')

  if (!categories || categories.length === 0) {
    await sendMessage(chatId, '❌ No tenés categorías.')
    await showMainMenu(chatId)
    return
  }

  // Create keyboard with categories (2 per row)
  const rows: any[][] = []
  for (let i = 0; i < categories.length && i < 10; i += 2) {
    const row: any[] = [{ text: truncateName(categories[i].name, 20), callback_data: `qcat_${categories[i].id}` }]
    if (categories[i + 1]) {
      row.push({ text: truncateName(categories[i + 1].name, 20), callback_data: `qcat_${categories[i + 1].id}` })
    }
    rows.push(row)
  }

  await sendMessage(chatId, '¿Qué categoría querés ver?', { reply_markup: { inline_keyboard: rows } })
}

async function showPeriodList(chatId: number) {
  const keyboard = {
    inline_keyboard: [
      [{ text: '📅 Este mes', callback_data: 'period_this_month' }],
      [{ text: '📅 Mes pasado', callback_data: 'period_last_month' }],
      [{ text: '📅 Últimos 3 meses', callback_data: 'period_last_3_months' }]
    ]
  }

  await sendMessage(chatId, '¿Qué período querés ver?', { reply_markup: keyboard })
}

// ============================================
// EXECUTE ACTION
// ============================================
async function executeAction(
  tgUser: any,
  pendingAction: any,
  flowState: FlowState,
  chatId: number
) {
  try {
    const today = new Date().toISOString().split('T')[0]

    if (flowState.type === 'transfer') {
      await supabase.from('transfers').insert({
        user_id: tgUser.user_id,
        from_account_id: flowState.from_account_id,
        to_account_id: flowState.to_account_id,
        from_amount: flowState.from_amount,
        to_amount: flowState.to_amount,
        date: today,
        note: flowState.note || null
      })
      await sendMessage(chatId, '✅ Transferencia registrada!')
    } else {
      await supabase.from('movements').insert({
        user_id: tgUser.user_id,
        type: flowState.type,
        amount: flowState.amount,
        account_id: flowState.account_id,
        category_id: flowState.category_id,
        date: today,
        note: flowState.note || null
      })
      const label = flowState.type === 'expense' ? 'Gasto' : 'Ingreso'
      await sendMessage(chatId, `✅ ${label} registrado!`)
    }

    await supabase.from('telegram_pending_actions').update({ status: 'confirmed' }).eq('id', pendingAction.id)
    await showMainMenu(chatId)

  } catch (error) {
    console.error('Error executing action:', error)
    await sendMessage(chatId, '❌ Error al guardar.')
    await showMainMenu(chatId)
  }
}

// ============================================
// SHOW LISTS
// ============================================

async function showAccountList(userId: string, chatId: number, title: string, prefix: string, excludeId?: string) {
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, currency, account_type')
    .eq('user_id', userId)
    .order('name')

  if (!accounts || accounts.length === 0) {
    await sendMessage(chatId, '❌ No tenés cuentas.\n\nAgregá una en cashe.ar')
    return
  }

  const filtered = excludeId ? accounts.filter(a => a.id !== excludeId) : accounts

  // Create keyboard with accounts (1 per row for readability)
  const rows = filtered.slice(0, 10).map(acc => [{
    text: createShortAccountName(acc.name, acc.currency, 30),
    callback_data: `${prefix}acc_${acc.id}`
  }])

  await sendMessage(chatId, title, { reply_markup: { inline_keyboard: rows } })
}

function createShortAccountName(fullName: string, currency: string, maxLength: number): string {
  const currencyLabel = currency === 'USD' ? ' (USD)' : ''
  const availableLength = maxLength - currencyLabel.length

  if (fullName.length <= availableLength) {
    return fullName + currencyLabel
  }

  let shortName = fullName
  const commaMatch = fullName.match(/^(.+),\s*(.+)$/)
  if (commaMatch) {
    const [, accountType, bankName] = commaMatch
    let typeHint = ''
    if (accountType.toLowerCase().includes('dólar') || accountType.toLowerCase().includes('usd')) {
      typeHint = ' USD'
    } else if (accountType.toLowerCase().includes('peso')) {
      typeHint = ' $'
    } else if (accountType.toLowerCase().includes('corriente')) {
      typeHint = ' CC'
    }
    shortName = bankName + typeHint
  }

  if (shortName.length > availableLength) {
    shortName = truncateName(shortName, availableLength)
  }

  return shortName + currencyLabel
}

async function showCategoryList(userId: string, type: string, chatId: number, page: number) {
  const categoryType = type === 'expense' ? 'expense' : 'income'

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .eq('type', categoryType)
    .order('name')

  if (!categories || categories.length === 0) {
    await sendMessage(chatId, '❌ No tenés categorías.\n\nAgregá una en cashe.ar')
    return
  }

  const pageSize = 8
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const pageCategories = categories.slice(startIndex, endIndex)
  const hasMore = categories.length > endIndex
  const hasPrevious = page > 1

  // Create keyboard (2 per row)
  const rows: any[][] = []
  for (let i = 0; i < pageCategories.length; i += 2) {
    const row: any[] = [{ text: truncateName(pageCategories[i].name, 18), callback_data: `cat_${pageCategories[i].id}` }]
    if (pageCategories[i + 1]) {
      row.push({ text: truncateName(pageCategories[i + 1].name, 18), callback_data: `cat_${pageCategories[i + 1].id}` })
    }
    rows.push(row)
  }

  // Navigation row
  const navRow: any[] = []
  if (hasPrevious) navRow.push({ text: '⬅️ Anterior', callback_data: 'cat_back' })
  if (hasMore) navRow.push({ text: '➡️ Más', callback_data: 'cat_more' })
  if (navRow.length > 0) rows.push(navRow)

  const categoryPrompt = type === 'expense' ? '¿En qué categoría?' : '¿De qué categoría?'
  await sendMessage(chatId, categoryPrompt, { reply_markup: { inline_keyboard: rows } })
}

async function showConfirmation(flowState: FlowState, chatId: number) {
  let message = ''

  if (flowState.type === 'transfer') {
    message = '📝 *Confirmar Transferencia*\n\n'
    const fromAmount = formatCurrency(flowState.from_amount!, flowState.from_currency || 'ARS')
    const toAmount = formatCurrency(flowState.to_amount!, flowState.to_currency || 'ARS')

    if (flowState.from_currency !== flowState.to_currency) {
      message += `💸 Enviás: ${fromAmount}\n`
      message += `🏦 Desde: ${truncateName(flowState.from_account_name!, 25)}\n`
      message += `💵 Recibís: ${toAmount}\n`
      message += `🏦 Hacia: ${truncateName(flowState.to_account_name!, 25)}`
    } else {
      message += `💸 ${fromAmount}\n`
      message += `🏦 ${truncateName(flowState.from_account_name!, 20)} → ${truncateName(flowState.to_account_name!, 20)}`
    }
  } else {
    const isExpense = flowState.type === 'expense'
    message = `📝 *Confirmar ${isExpense ? 'Gasto' : 'Ingreso'}*\n\n`
    const emoji = isExpense ? '💸' : '💰'
    const amount = formatCurrency(flowState.amount!, flowState.currency || 'ARS')
    message += `${emoji} ${amount}\n`
    message += `📁 ${truncateName(flowState.category_name!, 25)}\n`
    message += `💳 ${truncateName(flowState.account_name!, 25)}`
  }

  if (flowState.note) {
    message += `\n📝 ${flowState.note.slice(0, 40)}${flowState.note.length > 40 ? '...' : ''}`
  }

  message += '\n📅 Hoy'

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Confirmar', callback_data: 'confirm_yes' },
        { text: '❌ Cancelar', callback_data: 'confirm_no' }
      ]
    ]
  }

  await sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard })
}

// ============================================
// TELEGRAM API FUNCTIONS
// ============================================

async function sendMessage(chatId: number, text: string, options: any = {}) {
  try {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...options
      })
    })
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

async function answerCallbackQuery(callbackQueryId: string) {
  try {
    await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId })
    })
  } catch (error) {
    console.error('Error answering callback query:', error)
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name
  return name.slice(0, maxLength - 1) + '…'
}

function parseAmount(text: string): number | null {
  const cleaned = text.replace(/[$\s.,]/g, '').replace(/[^\d]/g, '')
  const amount = parseInt(cleaned, 10)
  return isNaN(amount) ? null : amount
}

function formatCurrency(amount: number, currency: string): string {
  if (currency === 'USD') return `USD ${amount.toLocaleString('es-AR')}`
  return `$${amount.toLocaleString('es-AR')}`
}

function getMonthName(month: number): string {
  const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  return months[month - 1]
}

async function calculateAccountBalance(userId: string, accountId: string, initialBalance: number): Promise<number> {
  const [incomes, expenses, transfersIn, transfersOut] = await Promise.all([
    supabase.from('movements').select('amount').eq('user_id', userId).eq('account_id', accountId).eq('type', 'income'),
    supabase.from('movements').select('amount').eq('user_id', userId).eq('account_id', accountId).eq('type', 'expense'),
    supabase.from('transfers').select('to_amount').eq('user_id', userId).eq('to_account_id', accountId),
    supabase.from('transfers').select('from_amount').eq('user_id', userId).eq('from_account_id', accountId)
  ])

  const totalIncomes = (incomes.data || []).reduce((sum, m) => sum + Number(m.amount), 0)
  const totalExpenses = (expenses.data || []).reduce((sum, m) => sum + Number(m.amount), 0)
  const totalIn = (transfersIn.data || []).reduce((sum, t) => sum + Number(t.to_amount), 0)
  const totalOut = (transfersOut.data || []).reduce((sum, t) => sum + Number(t.from_amount), 0)

  return Number(initialBalance) + totalIncomes - totalExpenses + totalIn - totalOut
}
