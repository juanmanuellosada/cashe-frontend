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
  // We need to calculate the statement that is due tomorrow
  // The statement period is determined by the closing_day
  // Example: closing_day=20, due_day=6
  // - Statement closing on Jan 20 is due on Feb 6
  // - That statement contains expenses from Dec 20 to Jan 19 (before closing)

  const closingDay = card.closing_day || 1

  // Get all expenses for this card
  const { data: expenses, error } = await supabase
    .from('movements')
    .select('amount, date, original_currency')
    .eq('account_id', card.id)
    .eq('type', 'expense')

  if (error) {
    console.error(`Error fetching expenses for card ${card.id}:`, error)
    return { ars: 0, usd: 0 }
  }

  if (!expenses || expenses.length === 0) {
    return { ars: 0, usd: 0 }
  }

  // Calculate the statement period that is due tomorrow
  // Due tomorrow means the statement closed recently (last month or so)
  const now = new Date()
  const currentDay = now.getDate()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // The statement period key uses the format "YYYY-MM" where MM is 1-indexed
  // If we're before or at the closing day, the "current" statement period is this month
  // If we're after the closing day, the "current" statement period is next month
  // But we want the statement that VENCES tomorrow, which closed BEFORE now

  let statementYear = currentYear
  let statementMonth = currentMonth // 0-indexed

  // The statement that's due tomorrow closed on the closing day of the previous period
  // We need to go back one period from "current"
  if (currentDay >= closingDay) {
    // Current period is next month, so the one due tomorrow is this month
    statementMonth = currentMonth
  } else {
    // Current period is this month, so the one due tomorrow is last month
    statementMonth = currentMonth - 1
    if (statementMonth < 0) {
      statementMonth = 11
      statementYear -= 1
    }
  }

  // Convert to 1-indexed with padding for the statement period key
  const periodKey = `${statementYear}-${String(statementMonth + 1).padStart(2, '0')}`

  console.log(`Calculating statement amount for ${card.name}, period: ${periodKey}, closing_day: ${closingDay}`)

  // Function to get statement period for a date (same logic as frontend)
  const getStatementPeriod = (dateStr: string): string => {
    const d = new Date(dateStr)
    const day = d.getDate()
    let year = d.getFullYear()
    let month = d.getMonth()

    if (day >= closingDay) {
      month += 1
      if (month > 11) {
        month = 0
        year += 1
      }
    }
    return `${year}-${String(month + 1).padStart(2, '0')}`
  }

  // Sum amounts by currency for the target period
  let totalARS = 0
  let totalUSD = 0

  for (const expense of expenses) {
    const expensePeriod = getStatementPeriod(expense.date)
    if (expensePeriod === periodKey) {
      const amount = Number(expense.amount) || 0
      // Use original_currency to determine if expense is in USD or ARS
      if (expense.original_currency === 'USD') {
        totalUSD += amount
      } else {
        totalARS += amount
      }
    }
  }

  console.log(`Statement ${periodKey} for ${card.name}: ARS=${totalARS}, USD=${totalUSD}`)

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
