// Process Recurring Transactions Edge Function
// Runs on a schedule to process recurring transactions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

// Initialize Supabase with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Telegram API
const TELEGRAM_API = telegramToken ? `https://api.telegram.org/bot${telegramToken}` : null

interface RecurringTransaction {
  id: string
  user_id: string
  name: string
  description: string | null
  amount: number
  currency: string
  type: 'income' | 'expense' | 'transfer'
  account_id: string | null
  category_id: string | null
  from_account_id: string | null
  to_account_id: string | null
  to_amount: number | null
  frequency: {
    type: string
    day?: number
    dayOfWeek?: number
    month?: number
    interval?: number
  }
  weekend_handling: string
  start_date: string
  end_date: string | null
  creation_mode: 'automatic' | 'bot_confirmation' | 'manual_confirmation'
  preferred_bot: string | null
  is_active: boolean
  is_paused: boolean
  is_credit_card_recurring: boolean
  last_generated_date: string | null
  next_execution_date: string | null
}

// ============================================
// MAIN HANDLER
// ============================================
serve(async (req) => {
  // Allow GET for cron jobs, POST for manual triggers
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const results = {
    futureTransactionsProcessed: 0,
    occurrencesCreated: 0,
    movementsCreated: 0,
    notificationsSent: 0,
    errors: [] as string[],
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    console.log(`Processing recurring transactions for ${today}`)

    // 1. Process future transactions whose date has arrived
    const futureResult = await processFutureTransactions(today)
    results.futureTransactionsProcessed = futureResult.count

    // 2. Get all active, non-paused recurring transactions
    const { data: recurringList, error: recurringError } = await supabase
      .from('recurring_transactions')
      .select('*')
      .eq('is_active', true)
      .eq('is_paused', false)
      .or(`end_date.is.null,end_date.gte.${today}`)

    if (recurringError) {
      throw new Error(`Error fetching recurring: ${recurringError.message}`)
    }

    console.log(`Found ${recurringList?.length || 0} active recurring transactions`)

    // 3. Process each recurring transaction
    for (const recurring of (recurringList || []) as RecurringTransaction[]) {
      try {
        const result = await processRecurringTransaction(recurring, today)
        results.occurrencesCreated += result.occurrenceCreated ? 1 : 0
        results.movementsCreated += result.movementCreated ? 1 : 0
        results.notificationsSent += result.notificationSent ? 1 : 0
      } catch (err) {
        const errorMsg = `Error processing recurring ${recurring.id}: ${err.message}`
        console.error(errorMsg)
        results.errors.push(errorMsg)
      }
    }

    console.log('Processing complete:', results)
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error in process-recurring:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// ============================================
// PROCESS FUTURE TRANSACTIONS
// ============================================
async function processFutureTransactions(today: string): Promise<{ count: number }> {
  // Update movements whose date has arrived
  const { data: movements, error: movError } = await supabase
    .from('movements')
    .update({ is_future: false })
    .eq('is_future', true)
    .lte('date', today)
    .select()

  if (movError) {
    console.error('Error processing future movements:', movError)
  }

  // Update transfers whose date has arrived
  const { data: transfers, error: transError } = await supabase
    .from('transfers')
    .update({ is_future: false })
    .eq('is_future', true)
    .lte('date', today)
    .select()

  if (transError) {
    console.error('Error processing future transfers:', transError)
  }

  const count = (movements?.length || 0) + (transfers?.length || 0)
  console.log(`Processed ${count} future transactions`)
  return { count }
}

// ============================================
// PROCESS SINGLE RECURRING TRANSACTION
// ============================================
async function processRecurringTransaction(
  recurring: RecurringTransaction,
  today: string
): Promise<{ occurrenceCreated: boolean; movementCreated: boolean; notificationSent: boolean }> {
  const result = { occurrenceCreated: false, movementCreated: false, notificationSent: false }

  // Check if should execute today
  const nextDate = recurring.next_execution_date
  if (!nextDate || nextDate > today) {
    return result
  }

  // Check if start date has passed
  if (recurring.start_date > today) {
    return result
  }

  // Check end date
  if (recurring.end_date && recurring.end_date < today) {
    // Deactivate if past end date
    await supabase
      .from('recurring_transactions')
      .update({ is_active: false })
      .eq('id', recurring.id)
    return result
  }

  // Check if occurrence already exists for this date
  const { data: existingOccurrence } = await supabase
    .from('recurring_occurrences')
    .select('id')
    .eq('recurring_id', recurring.id)
    .eq('scheduled_date', nextDate)
    .single()

  if (existingOccurrence) {
    // Already processed, calculate next date
    await calculateAndUpdateNextDate(recurring)
    return result
  }

  // Create occurrence
  const { data: occurrence, error: occError } = await supabase
    .from('recurring_occurrences')
    .insert({
      recurring_id: recurring.id,
      user_id: recurring.user_id,
      scheduled_date: nextDate,
      status: recurring.creation_mode === 'automatic' ? 'confirmed' : 'pending',
    })
    .select()
    .single()

  if (occError) {
    throw new Error(`Error creating occurrence: ${occError.message}`)
  }

  result.occurrenceCreated = true

  // If automatic, create the movement/transfer immediately
  if (recurring.creation_mode === 'automatic') {
    const movementResult = await createMovementFromRecurring(recurring, occurrence)
    result.movementCreated = movementResult.success
  } else if (recurring.creation_mode === 'bot_confirmation') {
    // Send notification to preferred bot
    const notifyResult = await sendBotNotification(recurring, occurrence)
    result.notificationSent = notifyResult.success
  }
  // manual_confirmation: just leave the occurrence as pending

  // Calculate next execution date
  await calculateAndUpdateNextDate(recurring)

  return result
}

// ============================================
// CREATE MOVEMENT FROM RECURRING
// ============================================
async function createMovementFromRecurring(
  recurring: RecurringTransaction,
  occurrence: any
): Promise<{ success: boolean }> {
  let movementId: string | null = null
  let transferId: string | null = null

  if (recurring.type === 'transfer') {
    // Create transfer
    const { data: transfer, error } = await supabase
      .from('transfers')
      .insert({
        user_id: recurring.user_id,
        date: occurrence.scheduled_date,
        from_account_id: recurring.from_account_id,
        to_account_id: recurring.to_account_id,
        from_amount: recurring.amount,
        to_amount: recurring.to_amount || recurring.amount,
        note: recurring.name,
        recurring_occurrence_id: occurrence.id,
        is_future: false,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Error creating transfer: ${error.message}`)
    }
    transferId = transfer.id
  } else {
    // Create movement (income/expense)
    const { data: movement, error } = await supabase
      .from('movements')
      .insert({
        user_id: recurring.user_id,
        type: recurring.type,
        date: occurrence.scheduled_date,
        amount: recurring.amount,
        account_id: recurring.account_id,
        category_id: recurring.category_id,
        note: recurring.name,
        recurring_occurrence_id: occurrence.id,
        is_future: false,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Error creating movement: ${error.message}`)
    }
    movementId = movement.id
  }

  // Update occurrence with movement/transfer reference
  await supabase
    .from('recurring_occurrences')
    .update({
      movement_id: movementId,
      transfer_id: transferId,
      actual_amount: recurring.amount,
      confirmed_at: new Date().toISOString(),
      confirmed_via: 'auto',
    })
    .eq('id', occurrence.id)

  // Update last generated date
  await supabase
    .from('recurring_transactions')
    .update({ last_generated_date: occurrence.scheduled_date })
    .eq('id', recurring.id)

  return { success: true }
}

// ============================================
// CALCULATE NEXT EXECUTION DATE
// ============================================
async function calculateAndUpdateNextDate(recurring: RecurringTransaction): Promise<void> {
  const currentDate = new Date(recurring.next_execution_date || recurring.start_date)
  let nextDate: Date

  switch (recurring.frequency.type) {
    case 'daily':
      nextDate = new Date(currentDate)
      nextDate.setDate(nextDate.getDate() + 1)
      break

    case 'weekly':
      nextDate = new Date(currentDate)
      nextDate.setDate(nextDate.getDate() + 7)
      break

    case 'biweekly':
      nextDate = new Date(currentDate)
      nextDate.setDate(nextDate.getDate() + 14)
      break

    case 'monthly':
      nextDate = new Date(currentDate)
      nextDate.setMonth(nextDate.getMonth() + 1)
      if (recurring.frequency.day) {
        nextDate.setDate(Math.min(recurring.frequency.day, getDaysInMonth(nextDate)))
      }
      break

    case 'bimonthly':
      nextDate = new Date(currentDate)
      nextDate.setMonth(nextDate.getMonth() + 2)
      if (recurring.frequency.day) {
        nextDate.setDate(Math.min(recurring.frequency.day, getDaysInMonth(nextDate)))
      }
      break

    case 'quarterly':
      nextDate = new Date(currentDate)
      nextDate.setMonth(nextDate.getMonth() + 3)
      if (recurring.frequency.day) {
        nextDate.setDate(Math.min(recurring.frequency.day, getDaysInMonth(nextDate)))
      }
      break

    case 'biannual':
      nextDate = new Date(currentDate)
      nextDate.setMonth(nextDate.getMonth() + 6)
      break

    case 'yearly':
      nextDate = new Date(currentDate)
      nextDate.setFullYear(nextDate.getFullYear() + 1)
      break

    case 'custom_days':
      nextDate = new Date(currentDate)
      nextDate.setDate(nextDate.getDate() + (recurring.frequency.interval || 30))
      break

    default:
      nextDate = new Date(currentDate)
      nextDate.setMonth(nextDate.getMonth() + 1)
  }

  // Adjust for non-business day if needed
  if (recurring.weekend_handling !== 'as_is') {
    nextDate = await adjustForNonBusinessDay(nextDate, recurring.weekend_handling)
  }

  const nextDateStr = nextDate.toISOString().split('T')[0]

  // Update next execution date
  await supabase
    .from('recurring_transactions')
    .update({ next_execution_date: nextDateStr })
    .eq('id', recurring.id)
}

function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

async function adjustForNonBusinessDay(date: Date, handling: string): Promise<Date> {
  const isBusinessDay = await checkIsBusinessDay(date)
  if (isBusinessDay) return date

  if (handling === 'previous_business_day') {
    let adjusted = new Date(date)
    while (!(await checkIsBusinessDay(adjusted))) {
      adjusted.setDate(adjusted.getDate() - 1)
    }
    return adjusted
  } else if (handling === 'next_business_day') {
    let adjusted = new Date(date)
    while (!(await checkIsBusinessDay(adjusted))) {
      adjusted.setDate(adjusted.getDate() + 1)
    }
    return adjusted
  }

  return date
}

async function checkIsBusinessDay(date: Date): Promise<boolean> {
  const dayOfWeek = date.getDay()
  // Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) return false

  // Holiday check
  const dateStr = date.toISOString().split('T')[0]
  const { data: holiday } = await supabase
    .from('argentine_holidays')
    .select('id')
    .eq('date', dateStr)
    .single()

  return !holiday
}

// ============================================
// SEND BOT NOTIFICATION
// ============================================
async function sendBotNotification(
  recurring: RecurringTransaction,
  occurrence: any
): Promise<{ success: boolean }> {
  const bot = recurring.preferred_bot

  if (bot === 'telegram') {
    return await sendTelegramNotification(recurring, occurrence)
  } else if (bot === 'whatsapp') {
    return await sendWhatsAppNotification(recurring, occurrence)
  }

  return { success: false }
}

async function sendTelegramNotification(
  recurring: RecurringTransaction,
  occurrence: any
): Promise<{ success: boolean }> {
  if (!TELEGRAM_API) return { success: false }

  // Get user's telegram chat ID
  const { data: telegramUser } = await supabase
    .from('telegram_users')
    .select('telegram_id')
    .eq('user_id', recurring.user_id)
    .eq('verified', true)
    .single()

  if (!telegramUser) return { success: false }

  const typeEmoji = recurring.type === 'expense' ? '💸' : recurring.type === 'income' ? '💰' : '↔️'
  const typeLabel = recurring.type === 'expense' ? 'Gasto' : recurring.type === 'income' ? 'Ingreso' : 'Transferencia'

  const message = `${typeEmoji} *Recordatorio de ${typeLabel}*\n\n` +
    `📋 ${recurring.name}\n` +
    `💵 $${recurring.amount.toLocaleString('es-AR')}\n` +
    `📅 Fecha: ${occurrence.scheduled_date}\n\n` +
    `¿Confirmar este movimiento?`

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Confirmar', callback_data: `confirm_occ_${occurrence.id}` },
        { text: '⏭️ Saltar', callback_data: `skip_occ_${occurrence.id}` }
      ]
    ]
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramUser.telegram_id,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      })
    })

    if (response.ok) {
      await supabase
        .from('recurring_occurrences')
        .update({
          notification_sent: true,
          notification_sent_at: new Date().toISOString()
        })
        .eq('id', occurrence.id)

      return { success: true }
    }
  } catch (err) {
    console.error('Error sending Telegram notification:', err)
  }

  return { success: false }
}

async function sendWhatsAppNotification(
  recurring: RecurringTransaction,
  occurrence: any
): Promise<{ success: boolean }> {
  if (!whatsappToken || !whatsappPhoneId) return { success: false }

  // Get user's WhatsApp phone number
  const { data: whatsappUser } = await supabase
    .from('whatsapp_users')
    .select('phone_number')
    .eq('user_id', recurring.user_id)
    .eq('verified', true)
    .single()

  if (!whatsappUser) return { success: false }

  const typeEmoji = recurring.type === 'expense' ? '💸' : recurring.type === 'income' ? '💰' : '↔️'
  const typeLabel = recurring.type === 'expense' ? 'Gasto' : recurring.type === 'income' ? 'Ingreso' : 'Transferencia'

  const message = `${typeEmoji} *Recordatorio de ${typeLabel}*\n\n` +
    `📋 ${recurring.name}\n` +
    `💵 $${recurring.amount.toLocaleString('es-AR')}\n` +
    `📅 Fecha: ${occurrence.scheduled_date}\n\n` +
    `Responde *sí* para confirmar o *no* para saltar.`

  try {
    const response = await fetch(
      `https://graph.facebook.com/v17.0/${whatsappPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${whatsappToken}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: whatsappUser.phone_number,
          type: 'text',
          text: { body: message }
        })
      }
    )

    if (response.ok) {
      await supabase
        .from('recurring_occurrences')
        .update({
          notification_sent: true,
          notification_sent_at: new Date().toISOString()
        })
        .eq('id', occurrence.id)

      return { success: true }
    }
  } catch (err) {
    console.error('Error sending WhatsApp notification:', err)
  }

  return { success: false }
}
