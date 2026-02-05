// Credit Card Due Date Notifications Edge Function
// Sends notifications one day before credit card payment due dates
// Should be scheduled to run every hour via Supabase Cron

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  closing_day: number | null
  due_day: number
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

    // Calculate tomorrow's date in Argentina
    const tomorrowArgentina = new Date(argentinaTime)
    tomorrowArgentina.setUTCDate(tomorrowArgentina.getUTCDate() + 1)
    const tomorrowDay = tomorrowArgentina.getUTCDate()
    const tomorrowMonth = tomorrowArgentina.getUTCMonth() + 1
    const tomorrowYear = tomorrowArgentina.getUTCFullYear()

    // Get the last day of tomorrow's month (for handling due_day=31 in shorter months)
    const lastDayOfMonth = new Date(tomorrowYear, tomorrowMonth, 0).getDate()

    console.log(`Processing due date notifications at Argentina hour ${currentHour}`)
    console.log(`Tomorrow: ${tomorrowYear}-${tomorrowMonth.toString().padStart(2, '0')}-${tomorrowDay.toString().padStart(2, '0')}`)
    console.log(`Last day of month: ${lastDayOfMonth}`)
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
          tomorrowDay,
          tomorrowMonth,
          tomorrowYear,
          lastDayOfMonth
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
  tomorrowDay: number,
  tomorrowMonth: number,
  tomorrowYear: number,
  lastDayOfMonth: number
): Promise<{ cardsChecked: number; sent: number; telegram: number; whatsapp: number; push: number }> {
  const result = { cardsChecked: 0, sent: 0, telegram: 0, whatsapp: 0, push: 0 }

  // Get user's credit cards with due_day set
  const { data: creditCards, error: cardsError } = await supabase
    .from('accounts')
    .select('id, user_id, name, closing_day, due_day, currency')
    .eq('user_id', userPrefs.user_id)
    .eq('is_credit_card', true)
    .not('due_day', 'is', null)

  if (cardsError) {
    throw new Error(`Error fetching credit cards: ${cardsError.message}`)
  }

  result.cardsChecked = creditCards?.length || 0

  // Filter cards that are due tomorrow
  const cardsDueTomorrow = (creditCards || []).filter((card: CreditCard) => {
    // Handle months with fewer days than due_day
    // e.g., if due_day=31 and month has 30 days, due date is the 30th
    const effectiveDueDay = Math.min(card.due_day, lastDayOfMonth)
    return effectiveDueDay === tomorrowDay
  })

  if (cardsDueTomorrow.length === 0) {
    return result
  }

  // Format due date for notification log
  const dueDate = `${tomorrowYear}-${tomorrowMonth.toString().padStart(2, '0')}-${tomorrowDay.toString().padStart(2, '0')}`

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

  for (const card of cardsDueTomorrow as CreditCard[]) {
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

    // Calculate statement amount
    const statementAmounts = await calculateStatementAmount(card)

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
async function calculateStatementAmount(card: CreditCard): Promise<{ ars: number; usd: number }> {
  // The current billing period goes from the previous closing_day to the current closing_day
  // Since we're notifying the day before due_day, we need to calculate the previous period

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const closingDay = card.closing_day || 1

  // Calculate the date range for the current statement period
  // If today is before closing_day, the statement period is from last month's closing_day to this month's closing_day
  // If today is after closing_day, the statement period is from this month's closing_day to next month's closing_day

  let periodStart: string
  let periodEnd: string

  if (now.getDate() <= closingDay) {
    // Current period: last month's closing to this month's closing
    const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1
    const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear
    periodStart = `${lastMonthYear}-${lastMonth.toString().padStart(2, '0')}-${closingDay.toString().padStart(2, '0')}`
    periodEnd = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${closingDay.toString().padStart(2, '0')}`
  } else {
    // Current period: this month's closing to next month's closing
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1
    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear
    periodStart = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${closingDay.toString().padStart(2, '0')}`
    periodEnd = `${nextMonthYear}-${nextMonth.toString().padStart(2, '0')}-${closingDay.toString().padStart(2, '0')}`
  }

  // Get all expenses for this card in the period, grouped by currency
  const { data: expenses, error } = await supabase
    .from('movements')
    .select('amount, accounts!inner(currency)')
    .eq('account_id', card.id)
    .eq('type', 'expense')
    .gte('date', periodStart)
    .lt('date', periodEnd)

  if (error) {
    console.error(`Error fetching expenses for card ${card.id}:`, error)
    return { ars: 0, usd: 0 }
  }

  // Sum amounts by currency
  let totalARS = 0
  let totalUSD = 0

  for (const expense of (expenses || [])) {
    const currency = expense.accounts?.currency || 'ARS'
    if (currency === 'ARS') {
      totalARS += Number(expense.amount) || 0
    } else {
      totalUSD += Number(expense.amount) || 0
    }
  }

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
