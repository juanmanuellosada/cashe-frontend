// WhatsApp Webhook for Cashé - Button Flow Version v3
// Supports both button flow and natural language processing (NLP)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  processNLPMessage,
  processCallbackQuery as processNLPCallback,
  deleteConversationState,
} from '../_shared/nlp/index.ts'

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
  // For queries
  query_type?: string
  query_category_id?: string
  query_category_name?: string
}

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
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

  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const entry = body.entry?.[0]
      const changes = entry?.changes?.[0]
      const value = changes?.value
      const message = value?.messages?.[0]

      if (!message) {
        return new Response('OK', { status: 200 })
      }

      const phoneNumber = message.from
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

      console.log(`Message from ${phoneNumber}: ${messageText}`)
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
// NORMALIZE PHONE NUMBER
// ============================================
function normalizePhoneNumber(phone: string): string[] {
  // Returns array of possible formats to search
  const cleaned = phone.replace(/\D/g, '')
  const formats: string[] = [cleaned]

  // Argentine mobile numbers: WhatsApp sends 5491XXXXXXXXX, DB might have 541XXXXXXXXX
  if (cleaned.startsWith('549') && cleaned.length === 13) {
    // Remove the 9 after 54
    formats.push('54' + cleaned.slice(3))
  }
  // If DB has format without 9, but we receive with 9
  if (cleaned.startsWith('54') && !cleaned.startsWith('549') && cleaned.length === 12) {
    // Add the 9 after 54
    formats.push('549' + cleaned.slice(2))
  }

  return formats
}

// ============================================
// PROCESS MESSAGE
// ============================================
async function processMessage(phoneNumber: string, messageText: string, buttonId: string, listId: string) {
  try {
    // Try multiple phone number formats
    const phoneFormats = normalizePhoneNumber(phoneNumber)
    console.log(`Looking for phone in formats: ${phoneFormats.join(', ')}`)

    let whatsappUser = null
    for (const phone of phoneFormats) {
      const { data } = await supabase
        .from('whatsapp_users')
        .select('*, user_id')
        .eq('phone_number', phone)
        .eq('verified', true)
        .single()

      if (data) {
        whatsappUser = data
        console.log(`Found user with phone format: ${phone}`)
        break
      }
    }

    if (!whatsappUser) {
      console.log(`User not found for any phone format`)
      await handleUnlinkedUser(phoneNumber, messageText)
      return
    }

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
    await handleFlowStep(whatsappUser, pendingAction, flowState, messageText, buttonId, listId, phoneNumber)

  } catch (error) {
    console.error('Error in processMessage:', error)
    await sendWhatsAppMessage(phoneNumber, '❌ Hubo un error. Escribí "menu" para empezar de nuevo.')
  }
}

// ============================================
// HANDLE UNLINKED USER
// ============================================

// Simple in-memory cache to prevent spam to unlinked users
const unlinkedUserLastMessage: Map<string, number> = new Map()
const UNLINKED_MESSAGE_COOLDOWN = 5 * 60 * 1000 // 5 minutes

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
      // Check if user has whatsapp_enabled
      const { data: profile } = await supabase
        .from('profiles')
        .select('whatsapp_enabled')
        .eq('id', pendingLink.user_id)
        .single()

      if (!profile?.whatsapp_enabled) {
        await sendWhatsAppMessage(phoneNumber, `🔒 *Acceso restringido*\n\nTu cuenta no tiene acceso al bot de WhatsApp.\n\nSolicitá acceso desde cashe.ar/integraciones`)
        return
      }

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

      // Clear cooldown for this user
      unlinkedUserLastMessage.delete(phoneNumber)

      await sendWhatsAppMessage(phoneNumber, `✅ *¡Cuenta vinculada!*\n\nYa podés usar Cashé por WhatsApp.`)
      await showWelcomeMessage(phoneNumber)
      return
    }

    await sendWhatsAppMessage(phoneNumber, '❌ Código inválido o expirado.\n\nGenerá uno nuevo desde cashe.ar')
    return
  }

  // Rate limit: don't spam unlinked users with the same message
  const now = Date.now()
  const lastSent = unlinkedUserLastMessage.get(phoneNumber)

  if (lastSent && (now - lastSent) < UNLINKED_MESSAGE_COOLDOWN) {
    // Don't send the message again within 5 minutes
    console.log(`Skipping unlinked user message for ${phoneNumber} - sent ${Math.round((now - lastSent) / 1000)}s ago`)
    return
  }

  unlinkedUserLastMessage.set(phoneNumber, now)

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

  // Cancel any old button-flow pending actions - we now use NLP
  if (pendingAction && flowState.step !== 'idle') {
    await supabase.from('whatsapp_pending_actions').update({ status: 'cancelled' }).eq('id', pendingAction.id)
  }

  // Global commands - cancel/restart
  const cancelWords = ['cancelar', 'cancel', 'salir', 'x']

  if (cancelWords.includes(lowerText)) {
    // Also clear NLP conversation state
    await deleteConversationState(supabase, 'whatsapp', phoneNumber)
    await sendWhatsAppMessage(phoneNumber, '❌ Cancelado.')
    return
  }

  // All messages go through NLP now
  await handleIdleStep(whatsappUser, buttonId, listId, phoneNumber, messageText)
}

// ============================================
// SHOW WELCOME MESSAGE
// ============================================
async function showWelcomeMessage(phoneNumber: string) {
  await sendWhatsAppMessage(phoneNumber, `¡Hola! 👋 Soy tu asistente de *Cashé*.

Podés escribirme con lenguaje natural, por ejemplo:

💸 *Registrar gastos:*
• "Gasté 5000 en el super con la visa"
• "500 en café"
• "Pagué 1500 de luz"

💰 *Registrar ingresos:*
• "Cobré 50000 de sueldo"
• "Me transfirieron 10000"

🔄 *Transferencias:*
• "Pasé 20000 de Galicia a MP"

📊 *Consultas:*
• "Cuánto tengo en Galicia?"
• "Saldo"
• "Resumen del mes"
• "Últimos movimientos"

_Escribime lo que necesites y yo lo entiendo_ 🤖`)
}

// ============================================
// STEP HANDLERS
// ============================================

async function handleIdleStep(whatsappUser: any, buttonId: string, listId: string, phoneNumber: string, messageText: string = '') {
  const selection = buttonId || listId
  const lowerText = messageText.toLowerCase().trim()

  // Handle NLP confirmation/edit callbacks (buttons from confirmation flow)
  if (selection && (selection.startsWith('confirm_') || selection.startsWith('edit_') || selection.startsWith('sel_') || selection.startsWith('acc_') || selection.startsWith('cat_'))) {
    try {
      const nlpResult = await processNLPCallback(
        supabase,
        'whatsapp',
        phoneNumber,
        selection
      )

      if (nlpResult.success || nlpResult.response) {
        if (nlpResult.buttons?.length) {
          await sendWhatsAppButtons(
            phoneNumber,
            nlpResult.response,
            nlpResult.buttons.slice(0, 3).map(btn => ({
              id: btn.callbackData || btn.id || btn.text,
              title: btn.text.substring(0, 20)
            }))
          )
        } else {
          await sendWhatsAppMessage(phoneNumber, nlpResult.response)
        }
        return
      }
    } catch (nlpError) {
      console.error('NLP callback error:', nlpError)
    }
  }

  // Greeting words - show welcome message
  const greetingWords = ['hola', 'hello', 'hi', 'hey', 'buenas', 'buen dia', 'buen día', 'buenos dias', 'buenos días', 'que tal', 'qué tal']
  const helpWords = ['ayuda', 'help', 'menu', 'menú', 'opciones', 'que puedo hacer', 'qué puedo hacer', 'como funciona', 'cómo funciona', 'start', 'inicio', 'empezar']

  if (greetingWords.some(w => lowerText === w || lowerText.startsWith(w + ' ')) || helpWords.includes(lowerText)) {
    await showWelcomeMessage(phoneNumber)
    return
  }

  // Try NLP processing for all other messages
  if (messageText && messageText.length >= 2) {
    try {
      const nlpResult = await processNLPMessage(
        supabase,
        'whatsapp',
        phoneNumber,
        messageText
      )

      if (nlpResult.buttons?.length) {
        await sendWhatsAppButtons(
          phoneNumber,
          nlpResult.response,
          nlpResult.buttons.slice(0, 3).map(btn => ({
            id: btn.callbackData || btn.id || btn.text,
            title: btn.text.substring(0, 20)
          }))
        )
      }
      return
    } catch (nlpError) {
      console.error('NLP processing error:', nlpError)
    }
  }

  // If nothing matched, show welcome message
  await showWelcomeMessage(phoneNumber)
}

async function handleSelectAccount(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  listId: string,
  phoneNumber: string
) {
  if (!listId.startsWith('acc_')) {
    await sendWhatsAppMessage(phoneNumber, '⚠️ Seleccioná una cuenta de la lista.')
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
    return
  }

  const newState: FlowState = {
    ...flowState,
    step: 'select_category',
    account_id: account.id,
    account_name: account.name,
    currency: account.currency
  }

  await supabase.from('whatsapp_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
  await showCategoryList(whatsappUser.user_id, flowState.type!, phoneNumber, 1)
}

async function handleSelectFromAccount(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  listId: string,
  phoneNumber: string
) {
  if (!listId.startsWith('from_acc_')) {
    await sendWhatsAppMessage(phoneNumber, '⚠️ Seleccioná una cuenta de la lista.')
    return
  }

  const accountId = listId.replace('from_acc_', '')
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

  await supabase.from('whatsapp_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
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
    await sendWhatsAppMessage(phoneNumber, '⚠️ Seleccioná una cuenta de la lista.')
    return
  }

  const accountId = listId.replace('to_acc_', '')
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

  await supabase.from('whatsapp_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
  await sendWhatsAppMessage(phoneNumber, `💵 *¿Cuánto transferís?*\n\nEscribí el monto en ${flowState.from_currency || 'pesos'}\n\n_Escribí "cancelar" para volver al menú_`)
}

async function handleSelectCategory(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  listId: string,
  buttonId: string,
  phoneNumber: string
) {
  // Handle pagination
  if (buttonId === 'cat_more') {
    const newState: FlowState = { ...flowState, step: 'select_category_page2' }
    await supabase.from('whatsapp_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
    await showCategoryList(whatsappUser.user_id, flowState.type!, phoneNumber, 2)
    return
  }

  if (buttonId === 'cat_back') {
    const newState: FlowState = { ...flowState, step: 'select_category' }
    await supabase.from('whatsapp_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
    await showCategoryList(whatsappUser.user_id, flowState.type!, phoneNumber, 1)
    return
  }

  if (!listId.startsWith('cat_')) {
    await sendWhatsAppMessage(phoneNumber, '⚠️ Seleccioná una categoría de la lista.')
    return
  }

  const categoryId = listId.replace('cat_', '')
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

  await supabase.from('whatsapp_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
  await sendWhatsAppMessage(phoneNumber, `💵 *¿Cuánto?*\n\nEscribí el monto en ${flowState.currency || 'pesos'}\n\n_Escribí "cancelar" para volver al menú_`)
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
    await sendWhatsAppMessage(phoneNumber, '⚠️ Escribí un monto válido.\n\nEjemplo: 5000\n\n_Escribí "cancelar" para volver al menú_')
    return
  }

  if (flowState.type === 'transfer') {
    if (flowState.from_currency !== flowState.to_currency) {
      const newState: FlowState = { ...flowState, step: 'enter_to_amount', from_amount: amount }
      await supabase.from('whatsapp_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
      await sendWhatsAppMessage(phoneNumber, `💵 *¿Cuánto recibís?*\n\nEscribí el monto en ${flowState.to_currency}\n\n_Escribí "cancelar" para volver al menú_`)
      return
    }

    const newState: FlowState = { ...flowState, step: 'enter_note', from_amount: amount, to_amount: amount }
    await supabase.from('whatsapp_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
    await askForNote(phoneNumber)
  } else {
    const newState: FlowState = { ...flowState, step: 'enter_note', amount }
    await supabase.from('whatsapp_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
    await askForNote(phoneNumber)
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
    await sendWhatsAppMessage(phoneNumber, '⚠️ Escribí un monto válido.\n\n_Escribí "cancelar" para volver al menú_')
    return
  }

  const newState: FlowState = { ...flowState, step: 'enter_note', to_amount: amount }
  await supabase.from('whatsapp_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
  await askForNote(phoneNumber)
}

async function askForNote(phoneNumber: string) {
  await sendWhatsAppButtons(
    phoneNumber,
    '¿Querés agregar una nota?',
    [
      { id: 'note_skip', title: '⏭️ Omitir' },
      { id: 'note_add', title: '📝 Agregar nota' }
    ]
  )
}

async function handleEnterNote(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  messageText: string,
  buttonId: string,
  phoneNumber: string
) {
  if (buttonId === 'note_skip') {
    const newState: FlowState = { ...flowState, step: 'confirm', note: undefined }
    await supabase.from('whatsapp_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
    await showConfirmation(newState, phoneNumber)
    return
  }

  if (buttonId === 'note_add') {
    await sendWhatsAppMessage(phoneNumber, '📝 Escribí la nota:\n\n_Escribí "cancelar" para volver al menú_')
    return
  }

  // User wrote a note
  const newState: FlowState = { ...flowState, step: 'confirm', note: messageText.slice(0, 200) }
  await supabase.from('whatsapp_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
  await showConfirmation(newState, phoneNumber)
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
    await supabase.from('whatsapp_pending_actions').update({ status: 'cancelled' }).eq('id', pendingAction.id)
    await sendWhatsAppMessage(phoneNumber, '❌ Cancelado.')
    await showWelcomeMessage(phoneNumber)
  } else {
    await sendWhatsAppMessage(phoneNumber, '⚠️ Usá los botones para confirmar.')
  }
}

// ============================================
// QUERY HANDLERS
// ============================================

async function handleQueryStart(whatsappUser: any, queryType: string, phoneNumber: string) {
  const userId = whatsappUser.user_id

  switch (queryType) {
    case 'query_balances':
      await showBalances(userId, phoneNumber)
      break

    case 'query_summary':
      await showMonthlySummary(userId, phoneNumber)
      break

    case 'query_category':
      await supabase.from('whatsapp_pending_actions').insert({
        whatsapp_user_id: whatsappUser.id,
        action_type: 'query',
        action_data: { step: 'query_category_select', query_type: 'category' },
        status: 'pending'
      })
      await showQueryCategoryList(userId, phoneNumber)
      break

    case 'query_recent':
      await showRecentMovements(userId, phoneNumber)
      break

    default:
      await showWelcomeMessage(phoneNumber)
  }
}

async function handleQuerySelect(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  buttonId: string,
  listId: string,
  phoneNumber: string
) {
  // Not used currently but kept for future expansion
  await showWelcomeMessage(phoneNumber)
}

async function handleQueryCategorySelect(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  listId: string,
  phoneNumber: string
) {
  if (!listId.startsWith('qcat_')) {
    await sendWhatsAppMessage(phoneNumber, '⚠️ Seleccioná una categoría.')
    return
  }

  const categoryId = listId.replace('qcat_', '')
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

  await supabase.from('whatsapp_pending_actions').update({ action_data: newState }).eq('id', pendingAction.id)
  await showPeriodList(phoneNumber)
}

async function handleQueryPeriodSelect(
  whatsappUser: any,
  pendingAction: any,
  flowState: FlowState,
  listId: string,
  phoneNumber: string
) {
  let startDate: string
  let endDate: string
  let periodLabel: string

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  switch (listId) {
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
      await sendWhatsAppMessage(phoneNumber, '⚠️ Seleccioná un período.')
      return
  }

  await showCategoryDetail(
    whatsappUser.user_id,
    flowState.query_category_id!,
    flowState.query_category_name!,
    startDate,
    endDate,
    periodLabel,
    phoneNumber
  )

  await supabase.from('whatsapp_pending_actions').update({ status: 'confirmed' }).eq('id', pendingAction.id)
}

// ============================================
// QUERY DISPLAY FUNCTIONS
// ============================================

async function showBalances(userId: string, phoneNumber: string) {
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, currency, initial_balance')
    .eq('user_id', userId)
    .order('name')

  if (!accounts || accounts.length === 0) {
    await sendWhatsAppMessage(phoneNumber, '❌ No tenés cuentas configuradas.')
    await showWelcomeMessage(phoneNumber)
    return
  }

  let message = '💰 *Saldos de cuentas:*\n\n'

  for (const account of accounts) {
    const balance = await calculateAccountBalance(userId, account.id, account.initial_balance)
    const formatted = formatCurrency(balance, account.currency)
    const shortName = truncateName(account.name, 20)
    message += `• ${shortName}: ${formatted}\n`
  }

  await sendWhatsAppMessage(phoneNumber, message)
  await showWelcomeMessage(phoneNumber)
}

async function showMonthlySummary(userId: string, phoneNumber: string) {
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
      const shortCat = truncateName(cat, 15)
      message += `• ${shortCat}: ${formatCurrency(amount, 'ARS')}\n`
    }
  }

  await sendWhatsAppMessage(phoneNumber, message)
  await showWelcomeMessage(phoneNumber)
}

async function showCategoryDetail(
  userId: string,
  categoryId: string,
  categoryName: string,
  startDate: string,
  endDate: string,
  periodLabel: string,
  phoneNumber: string
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
    await sendWhatsAppMessage(phoneNumber, `📊 No hay movimientos en *${categoryName}* para ${periodLabel}.`)
    await showWelcomeMessage(phoneNumber)
    return
  }

  const total = movements.reduce((sum, m) => sum + Number(m.amount), 0)

  let message = `📁 *${categoryName}* (${periodLabel}):\n\n`
  message += `Total: ${formatCurrency(total, 'ARS')}\n`
  message += `Movimientos: ${movements.length}\n\n`

  for (const m of movements.slice(0, 8)) {
    const date = new Date(m.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    const amount = formatCurrency(Number(m.amount), 'ARS')
    const account = (m.account as any)?.name ? ` (${truncateName((m.account as any).name, 10)})` : ''
    message += `• ${date} - ${amount}${account}\n`
  }

  if (movements.length > 8) {
    message += `\n... y ${movements.length - 8} más`
  }

  await sendWhatsAppMessage(phoneNumber, message)
  await showWelcomeMessage(phoneNumber)
}

async function showRecentMovements(userId: string, phoneNumber: string) {
  const { data: movements } = await supabase
    .from('movements')
    .select('type, amount, date, category:categories(name), account:accounts(name)')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)

  if (!movements || movements.length === 0) {
    await sendWhatsAppMessage(phoneNumber, '📊 No hay movimientos recientes.')
    await showWelcomeMessage(phoneNumber)
    return
  }

  let message = '🕐 *Últimos movimientos:*\n\n'

  for (const m of movements) {
    const date = new Date(m.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
    const emoji = m.type === 'expense' ? '💸' : '💰'
    const sign = m.type === 'expense' ? '-' : '+'
    const amount = formatCurrency(Number(m.amount), 'ARS')
    const cat = (m.category as any)?.name || ''
    const shortCat = truncateName(cat, 12)
    message += `${emoji} ${date} ${sign}${amount} ${shortCat}\n`
  }

  await sendWhatsAppMessage(phoneNumber, message)
  await showWelcomeMessage(phoneNumber)
}

async function showQueryCategoryList(userId: string, phoneNumber: string) {
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .eq('type', 'expense')
    .order('name')

  if (!categories || categories.length === 0) {
    await sendWhatsAppMessage(phoneNumber, '❌ No tenés categorías.')
    await showWelcomeMessage(phoneNumber)
    return
  }

  const rows = categories.slice(0, 10).map(cat => ({
    id: `qcat_${cat.id}`,
    title: truncateName(cat.name, 24)
  }))

  await sendWhatsAppList(
    phoneNumber,
    '¿Qué categoría querés ver?\n\n_Escribí "cancelar" para volver_',
    'Seleccionar',
    [{ title: 'Categorías', rows }]
  )
}

async function showPeriodList(phoneNumber: string) {
  await sendWhatsAppList(
    phoneNumber,
    '¿Qué período querés ver?\n\n_Escribí "cancelar" para volver_',
    'Seleccionar',
    [{
      title: 'Períodos',
      rows: [
        { id: 'period_this_month', title: '📅 Este mes' },
        { id: 'period_last_month', title: '📅 Mes pasado' },
        { id: 'period_last_3_months', title: '📅 Últimos 3 meses' }
      ]
    }]
  )
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
      await supabase.from('transfers').insert({
        user_id: whatsappUser.user_id,
        from_account_id: flowState.from_account_id,
        to_account_id: flowState.to_account_id,
        from_amount: flowState.from_amount,
        to_amount: flowState.to_amount,
        date: today,
        note: flowState.note || null
      })
      await sendWhatsAppMessage(phoneNumber, '✅ Transferencia registrada!')
    } else {
      await supabase.from('movements').insert({
        user_id: whatsappUser.user_id,
        type: flowState.type,
        amount: flowState.amount,
        account_id: flowState.account_id,
        category_id: flowState.category_id,
        date: today,
        note: flowState.note || null
      })
      const label = flowState.type === 'expense' ? 'Gasto' : 'Ingreso'
      await sendWhatsAppMessage(phoneNumber, `✅ ${label} registrado!`)
    }

    await supabase.from('whatsapp_pending_actions').update({ status: 'confirmed' }).eq('id', pendingAction.id)
    await showWelcomeMessage(phoneNumber)

  } catch (error) {
    console.error('Error executing action:', error)
    await sendWhatsAppMessage(phoneNumber, '❌ Error al guardar.')
    await showWelcomeMessage(phoneNumber)
  }
}

// ============================================
// SHOW LISTS
// ============================================

async function showAccountList(userId: string, phoneNumber: string, title: string, prefix: string, excludeId?: string) {
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, currency, account_type')
    .eq('user_id', userId)
    .order('name')

  if (!accounts || accounts.length === 0) {
    await sendWhatsAppMessage(phoneNumber, '❌ No tenés cuentas.\n\nAgregá una en cashe.ar')
    return
  }

  const filtered = excludeId ? accounts.filter(a => a.id !== excludeId) : accounts

  const rows = filtered.slice(0, 10).map(acc => ({
    id: `${prefix}acc_${acc.id}`,
    title: createShortAccountName(acc.name, acc.currency, 24),
    description: acc.name.slice(0, 72) // Full name in description
  }))

  await sendWhatsAppList(phoneNumber, title + '\n\n_Escribí "cancelar" para volver_', 'Seleccionar', [{ title: 'Cuentas', rows }])
}

// Create a short but identifiable account name
function createShortAccountName(fullName: string, currency: string, maxLength: number): string {
  const currencyLabel = currency === 'USD' ? ' (USD)' : ''
  const availableLength = maxLength - currencyLabel.length

  // If name already fits, use it as-is
  if (fullName.length <= availableLength) {
    return fullName + currencyLabel
  }

  // Try to create a smart short name
  let shortName = fullName

  // Pattern: "Tipo de cuenta, Banco" → "Banco + tipo corto"
  const commaMatch = fullName.match(/^(.+),\s*(.+)$/)
  if (commaMatch) {
    const [, accountType, bankName] = commaMatch

    // Extract key words from account type
    let typeHint = ''
    if (accountType.toLowerCase().includes('dólar') || accountType.toLowerCase().includes('usd')) {
      typeHint = ' USD'
    } else if (accountType.toLowerCase().includes('peso')) {
      typeHint = ' $'
    } else if (accountType.toLowerCase().includes('fima') || accountType.toLowerCase().includes('premium')) {
      typeHint = ' FCI' // Fondo Común de Inversión
    } else if (accountType.toLowerCase().includes('corriente')) {
      typeHint = ' CC'
    }

    shortName = bankName + typeHint
  }

  // Truncate if still too long
  if (shortName.length > availableLength) {
    shortName = truncateName(shortName, availableLength)
  }

  return shortName + currencyLabel
}

async function showCategoryList(userId: string, type: string, phoneNumber: string, page: number) {
  const categoryType = type === 'expense' ? 'expense' : 'income'

  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('user_id', userId)
    .eq('type', categoryType)
    .order('name')

  if (!categories || categories.length === 0) {
    await sendWhatsAppMessage(phoneNumber, '❌ No tenés categorías.\n\nAgregá una en cashe.ar')
    return
  }

  const pageSize = 9 // Leave 1 slot for "Ver más"
  const startIndex = (page - 1) * pageSize
  const endIndex = startIndex + pageSize
  const pageCategories = categories.slice(startIndex, endIndex)
  const hasMore = categories.length > endIndex
  const hasPrevious = page > 1

  const rows = pageCategories.map(cat => ({
    id: `cat_${cat.id}`,
    title: truncateName(cat.name, 24)
  }))

  // Add navigation
  if (hasMore) {
    rows.push({ id: 'cat_more', title: '➡️ Ver más...' })
  }

  const sections = [{ title: `Categorías (${page}/${Math.ceil(categories.length / pageSize)})`, rows }]

  const categoryPrompt = type === 'expense' ? '¿En qué categoría?' : '¿De qué categoría?'
  await sendWhatsAppList(
    phoneNumber,
    categoryPrompt + '\n\n_Escribí "cancelar" para volver_',
    'Seleccionar',
    sections
  )

  // If has previous, show back button
  if (hasPrevious) {
    await sendWhatsAppButtons(phoneNumber, 'Página anterior:', [{ id: 'cat_back', title: '⬅️ Volver' }])
  }
}

async function showConfirmation(flowState: FlowState, phoneNumber: string) {
  let body = ''
  let header = ''

  if (flowState.type === 'transfer') {
    header = '📝 Confirmar Transferencia'
    const fromAmount = formatCurrency(flowState.from_amount!, flowState.from_currency || 'ARS')
    const toAmount = formatCurrency(flowState.to_amount!, flowState.to_currency || 'ARS')

    if (flowState.from_currency !== flowState.to_currency) {
      body = `💸 Enviás: ${fromAmount}\n🏦 Desde: ${truncateName(flowState.from_account_name!, 20)}\n💵 Recibís: ${toAmount}\n🏦 Hacia: ${truncateName(flowState.to_account_name!, 20)}`
    } else {
      body = `💸 ${fromAmount}\n🏦 ${truncateName(flowState.from_account_name!, 15)} → ${truncateName(flowState.to_account_name!, 15)}`
    }
  } else {
    const isExpense = flowState.type === 'expense'
    header = `📝 Confirmar ${isExpense ? 'Gasto' : 'Ingreso'}`
    const emoji = isExpense ? '💸' : '💰'
    const amount = formatCurrency(flowState.amount!, flowState.currency || 'ARS')
    body = `${emoji} ${amount}\n📁 ${truncateName(flowState.category_name!, 20)}\n💳 ${truncateName(flowState.account_name!, 20)}`
  }

  if (flowState.note) {
    body += `\n📝 ${flowState.note.slice(0, 30)}${flowState.note.length > 30 ? '...' : ''}`
  }

  body += '\n📅 Hoy'

  await sendWhatsAppButtons(
    phoneNumber,
    body,
    [
      { id: 'confirm_yes', title: '✅ Confirmar' },
      { id: 'confirm_no', title: '❌ Cancelar' }
    ],
    header
  )
}

// ============================================
// WHATSAPP API FUNCTIONS
// ============================================

function formatPhoneForSending(phone: string): string {
  // Format phone for sending messages via WhatsApp API
  let normalized = phone.startsWith('+') ? phone : `+${phone}`
  if (normalized.startsWith('+549')) {
    normalized = '+54' + normalized.slice(4)
  }
  return normalized
}

async function sendWhatsAppMessage(to: string, message: string) {
  const normalizedTo = formatPhoneForSending(to)
  try {
    await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'text',
        text: { body: message }
      })
    })
  } catch (error) {
    console.error('Error sending message:', error)
  }
}

async function sendWhatsAppButtons(to: string, body: string, buttons: { id: string, title: string }[], header?: string) {
  const normalizedTo = formatPhoneForSending(to)
  const interactive: any = {
    type: 'button',
    body: { text: body },
    action: {
      buttons: buttons.slice(0, 3).map(btn => ({
        type: 'reply',
        reply: { id: btn.id, title: btn.title.slice(0, 20) }
      }))
    }
  }
  if (header) interactive.header = { type: 'text', text: header }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: normalizedTo, type: 'interactive', interactive })
    })
    if (!response.ok) {
      console.error('WhatsApp buttons error:', await response.text())
      await sendWhatsAppMessage(to, `${header ? header + '\n\n' : ''}${body}`)
    }
  } catch (error) {
    console.error('Error sending buttons:', error)
    await sendWhatsAppMessage(to, body)
  }
}

async function sendWhatsAppList(to: string, body: string, buttonText: string, sections: { title: string, rows: { id: string, title: string, description?: string }[] }[]) {
  const normalizedTo = formatPhoneForSending(to)
  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${whatsappToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: normalizedTo,
        type: 'interactive',
        interactive: { type: 'list', body: { text: body }, action: { button: buttonText, sections } }
      })
    })
    if (!response.ok) {
      console.error('WhatsApp list error:', await response.text())
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
