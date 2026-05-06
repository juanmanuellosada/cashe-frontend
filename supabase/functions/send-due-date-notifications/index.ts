// Credit Card Due Date Notifications Edge Function
// Sends notifications one day before credit card payment due dates
// Should be scheduled to run every hour via Supabase Cron

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  addMonthsClampedISO,
  daysBetweenISO,
  getStatementClosingForExpense,
  nextOccurrenceOnOrAfter,
} from '../_shared/creditCardDates.ts'

// Environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const telegramToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')

// Initialize Supabase with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Telegram API
const TELEGRAM_API = telegramToken ? `https://api.telegram.org/bot${telegramToken}` : null

interface CreditCard {
  id: string
  user_id: string
  name: string
  closing_date: string | null
  due_date: string | null
  currency: string
}

interface UserPreferences {
  user_id: string
  notify_push: boolean
  notify_telegram: boolean
  notify_whatsapp: boolean
  notification_hour: number
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
    usersChecked: 0,
    cardsChecked: 0,
    notificationsSent: 0,
    telegramSent: 0,
    whatsappSent: 0,
    pushSent: 0,
    errors: [] as string[],
  }

  try {
    // Get current time in Argentina (UTC-3)
    const nowUTC = new Date()
    const argentinaOffset = -3 * 60 // -3 hours in minutes
    const argentinaTime = new Date(nowUTC.getTime() + argentinaOffset * 60 * 1000)
    const currentHour = argentinaTime.getUTCHours()

    // Calculate today and tomorrow in Argentina (ISO YYYY-MM-DD)
    const todayISO = `${argentinaTime.getUTCFullYear()}-${String(argentinaTime.getUTCMonth() + 1).padStart(2, '0')}-${String(argentinaTime.getUTCDate()).padStart(2, '0')}`
    const tomorrowArgentina = new Date(argentinaTime)
    tomorrowArgentina.setUTCDate(tomorrowArgentina.getUTCDate() + 1)
    const tomorrowISO = `${tomorrowArgentina.getUTCFullYear()}-${String(tomorrowArgentina.getUTCMonth() + 1).padStart(2, '0')}-${String(tomorrowArgentina.getUTCDate()).padStart(2, '0')}`

    console.log(`Processing due date notifications at Argentina hour ${currentHour}`)
    console.log(`Today: ${todayISO} | Tomorrow: ${tomorrowISO}`)
    console.log(`Config: Telegram=${!!telegramToken}, WhatsApp=${!!whatsappToken && !!whatsappPhoneId}, Push=${!!vapidPrivateKey && !!vapidPublicKey}`)

    // Get all users whose notification_hour matches current Argentina hour
    const { data: usersWithPrefs, error: prefsError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('notification_hour', currentHour)

    if (prefsError) {
      throw new Error(`Error fetching preferences: ${prefsError.message}`)
    }

    results.usersChecked = usersWithPrefs?.length || 0
    console.log(`Found ${results.usersChecked} users with notification hour ${currentHour}`)

    // Process each user
    for (const userPrefs of (usersWithPrefs || []) as UserPreferences[]) {
      // Skip if user has all notification channels disabled
      if (!userPrefs.notify_push && !userPrefs.notify_telegram && !userPrefs.notify_whatsapp) {
        continue
      }

      try {
        const result = await processUserCards(
          userPrefs,
          todayISO,
          tomorrowISO
        )
        results.cardsChecked += result.cardsChecked
        results.notificationsSent += result.sent
        results.telegramSent += result.telegram
        results.whatsappSent += result.whatsapp
        results.pushSent += result.push
      } catch (err) {
        const errorMsg = `Error processing user ${userPrefs.user_id}: ${err.message}`
        console.error(errorMsg)
        results.errors.push(errorMsg)
      }
    }

    console.log('Notification processing complete:', results)
    return new Response(JSON.stringify(results), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error in send-due-date-notifications:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// ============================================
// PROCESS USER CREDIT CARDS
// ============================================
async function processUserCards(
  userPrefs: UserPreferences,
  todayISO: string,
  tomorrowISO: string
): Promise<{ cardsChecked: number; sent: number; telegram: number; whatsapp: number; push: number }> {
  const result = { cardsChecked: 0, sent: 0, telegram: 0, whatsapp: 0, push: 0 }

  // Get user's credit cards with due_date anchor configured
  const { data: creditCards, error: cardsError } = await supabase
    .from('accounts')
    .select('id, user_id, name, closing_date, due_date, currency')
    .eq('user_id', userPrefs.user_id)
    .eq('is_credit_card', true)
    .not('due_date', 'is', null)

  if (cardsError) {
    throw new Error(`Error fetching credit cards: ${cardsError.message}`)
  }

  result.cardsChecked = creditCards?.length || 0

  // For each card, roll the due_date anchor forward to the next occurrence
  // >= today, then check if that next due is exactly tomorrow.
  type CardWithNextDue = CreditCard & { _nextDueISO: string }
  const cardsDueTomorrow: CardWithNextDue[] = []
  for (const card of (creditCards || []) as CreditCard[]) {
    if (!card.due_date) continue
    const nextDue = nextOccurrenceOnOrAfter(card.due_date, todayISO)
    if (daysBetweenISO(todayISO, nextDue) === 1) {
      cardsDueTomorrow.push({ ...card, _nextDueISO: nextDue })
    }
  }

  if (cardsDueTomorrow.length === 0) {
    return result
  }

  // The due date used for the notification log key.
  const dueDate = tomorrowISO

  // Get user's linked services
  const [telegramUser, whatsappUser, pushSubscriptions] = await Promise.all([
    userPrefs.notify_telegram ? supabase
      .from('telegram_users')
      .select('telegram_id')
      .eq('user_id', userPrefs.user_id)
      .eq('verified', true)
      .single()
      .then(r => r.data) : null,
    userPrefs.notify_whatsapp ? supabase
      .from('whatsapp_users')
      .select('phone_number')
      .eq('user_id', userPrefs.user_id)
      .eq('verified', true)
      .single()
      .then(r => r.data) : null,
    userPrefs.notify_push ? supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userPrefs.user_id)
      .then(r => r.data || []) : []
  ])

  for (const card of cardsDueTomorrow) {
    // Check if notification was already sent for this card and due date
    const { data: existingLog } = await supabase
      .from('notification_log')
      .select('id')
      .eq('user_id', userPrefs.user_id)
      .eq('account_id', card.id)
      .eq('due_date', dueDate)
      .limit(1)

    if (existingLog && existingLog.length > 0) {
      console.log(`Notification already sent for card ${card.name} (${card.id}) due ${dueDate}`)
      continue
    }

    // Calculate statement amount for the period that vences tomorrow.
    const statementAmounts = await calculateStatementAmount(card, card._nextDueISO)

    // Build notification message
    const message = buildNotificationMessage(card.name, statementAmounts, dueDate)

    let notificationSent = false
    let notificationType = ''

    // Priority: Telegram > WhatsApp > Push
    if (userPrefs.notify_telegram && telegramUser?.telegram_id && TELEGRAM_API) {
      const sent = await sendTelegramNotification(telegramUser.telegram_id, message)
      if (sent) {
        notificationSent = true
        notificationType = 'telegram'
        result.telegram++
      }
    }

    if (!notificationSent && userPrefs.notify_whatsapp && whatsappUser?.phone_number && whatsappToken && whatsappPhoneId) {
      const sent = await sendWhatsAppNotification(whatsappUser.phone_number, message)
      if (sent) {
        notificationSent = true
        notificationType = 'whatsapp'
        result.whatsapp++
      }
    }

    if (!notificationSent && userPrefs.notify_push && pushSubscriptions.length > 0 && vapidPrivateKey && vapidPublicKey) {
      const sent = await sendPushNotification(pushSubscriptions, card.name, statementAmounts)
      if (sent) {
        notificationSent = true
        notificationType = 'push'
        result.push++
      }
    }

    if (notificationSent) {
      // Log the notification
      await supabase.from('notification_log').insert({
        user_id: userPrefs.user_id,
        account_id: card.id,
        notification_type: notificationType,
        message: message,
        due_date: dueDate,
      })
      result.sent++
      console.log(`Notification sent for card ${card.name} via ${notificationType}`)
    }
  }

  return result
}

// ============================================
// CALCULATE STATEMENT AMOUNT
// ============================================
async function calculateStatementAmount(
  card: CreditCard,
  upcomingDueISO: string
): Promise<{ ars: number; usd: number }> {
  // The statement that vences tomorrow closed BEFORE that due date.
  // We map "the closing for this due" to the closing-anchor sequence by
  // taking the previous due period (due - 1 month). Then for each expense,
  // we ask which closing it lands on (first closing >= expense_date) and
  // compare against the target closing.

  if (!card.closing_date) {
    // Sin anchor de cierre no podemos agrupar por período. Devolver 0.
    console.warn(`Card ${card.id} (${card.name}) has no closing_date anchor; skipping statement total.`)
    return { ars: 0, usd: 0 }
  }

  // The closing for the statement that vences `upcomingDueISO` is the closing
  // that occurred immediately before that due. Heuristic: it's the closing at
  // or before (upcomingDue - 1 day). Then snap it to the closing anchor series.
  // Equivalent: walk forward from the closing anchor until we find the
  // greatest closing <= upcomingDue. nextOccurrenceOnOrAfter gives us the next
  // closing >= a reference; we want the previous one, so we step back 1 month
  // from the next closing >= upcomingDue.
  const nextClosingOnOrAfterDue = nextOccurrenceOnOrAfter(card.closing_date, upcomingDueISO)
  const targetClosingISO =
    nextClosingOnOrAfterDue === upcomingDueISO
      ? upcomingDueISO // closing happens to fall on the due date itself
      : addMonthsClampedISO(nextClosingOnOrAfterDue, -1)

  // Get all expenses for this card up to the closing date.
  const { data: expenses, error } = await supabase
    .from('movements')
    .select('amount, date, original_currency')
    .eq('account_id', card.id)
    .eq('type', 'expense')
    .lte('date', targetClosingISO)

  if (error) {
    console.error(`Error fetching expenses for card ${card.id}:`, error)
    return { ars: 0, usd: 0 }
  }

  if (!expenses || expenses.length === 0) {
    return { ars: 0, usd: 0 }
  }

  console.log(`Calculating statement for ${card.name}: target closing ${targetClosingISO} (due ${upcomingDueISO})`)

  // Sum amounts by currency for expenses whose statement closing == target.
  let totalARS = 0
  let totalUSD = 0

  for (const expense of expenses) {
    const expenseClosing = getStatementClosingForExpense(card.closing_date, expense.date)
    if (expenseClosing === targetClosingISO) {
      const amount = Number(expense.amount) || 0
      if (expense.original_currency === 'USD') {
        totalUSD += amount
      } else {
        totalARS += amount
      }
    }
  }

  console.log(`Statement closing ${targetClosingISO} for ${card.name}: ARS=${totalARS}, USD=${totalUSD}`)

  return { ars: totalARS, usd: totalUSD }
}

// ============================================
// BUILD NOTIFICATION MESSAGE
// ============================================
function buildNotificationMessage(cardName: string, amounts: { ars: number; usd: number }, dueDate: string): string {
  const formatAmount = (amount: number, currency: string) => {
    return currency === 'USD'
      ? `USD $${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$${amount.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  let amountText = ''
  if (amounts.ars > 0 && amounts.usd > 0) {
    amountText = `${formatAmount(amounts.ars, 'ARS')} | ${formatAmount(amounts.usd, 'USD')}`
  } else if (amounts.usd > 0) {
    amountText = formatAmount(amounts.usd, 'USD')
  } else if (amounts.ars > 0) {
    amountText = formatAmount(amounts.ars, 'ARS')
  } else {
    amountText = '$0'
  }

  return `💳 *Mañana vence tu ${cardName}*\n\n💵 Total: ${amountText}\n📅 Vencimiento: ${formatDate(dueDate)}`
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

// ============================================
// SEND TELEGRAM NOTIFICATION
// ============================================
async function sendTelegramNotification(chatId: number, message: string): Promise<boolean> {
  if (!TELEGRAM_API) return false

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📱 Abrir Cashé', url: 'https://cashe.ar/tarjetas' }
      ]
    ]
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      })
    })

    return response.ok
  } catch (err) {
    console.error('Error sending Telegram notification:', err)
    return false
  }
}

// ============================================
// SEND WHATSAPP NOTIFICATION
// ============================================
async function sendWhatsAppNotification(phoneNumber: string, message: string): Promise<boolean> {
  if (!whatsappToken || !whatsappPhoneId) return false

  // Remove markdown for WhatsApp (use plain text)
  const plainMessage = message.replace(/\*/g, '')

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
          to: phoneNumber,
          type: 'text',
          text: { body: plainMessage + '\n\nAbrí la app: https://cashe.ar/tarjetas' }
        })
      }
    )

    return response.ok
  } catch (err) {
    console.error('Error sending WhatsApp notification:', err)
    return false
  }
}

// ============================================
// SEND PUSH NOTIFICATION
// ============================================
async function sendPushNotification(
  subscriptions: any[],
  cardName: string,
  amounts: { ars: number; usd: number }
): Promise<boolean> {
  if (!vapidPrivateKey || !vapidPublicKey) return false

  const formatAmount = (amount: number, currency: string) => {
    return currency === 'USD'
      ? `USD $${amount.toLocaleString('es-AR')}`
      : `$${amount.toLocaleString('es-AR')}`
  }

  let body = ''
  if (amounts.ars > 0 && amounts.usd > 0) {
    body = `${formatAmount(amounts.ars, 'ARS')} | ${formatAmount(amounts.usd, 'USD')}`
  } else if (amounts.usd > 0) {
    body = formatAmount(amounts.usd, 'USD')
  } else if (amounts.ars > 0) {
    body = formatAmount(amounts.ars, 'ARS')
  } else {
    body = '$0'
  }

  const payload = JSON.stringify({
    title: `💳 Mañana vence tu ${cardName}`,
    body: body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    data: {
      url: '/tarjetas'
    }
  })

  let sent = false
  for (const subscription of subscriptions) {
    try {
      // Note: Full web push implementation requires VAPID signing
      // This is a simplified placeholder - in production, use a proper web-push library
      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'TTL': '86400',
        },
        body: payload
      })

      if (response.ok || response.status === 201) {
        sent = true
      } else if (response.status === 410) {
        // Subscription expired, delete it
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('id', subscription.id)
      }
    } catch (err) {
      console.error('Error sending push notification:', err)
    }
  }

  return sent
}
