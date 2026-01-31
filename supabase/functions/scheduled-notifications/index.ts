// Scheduled Transactions Notifications Edge Function
// Sends notifications for pending scheduled transactions

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

interface ScheduledTransaction {
  id: string
  user_id: string
  type: 'income' | 'expense' | 'transfer'
  scheduled_date: string
  amount: number
  account_id: string | null
  to_account_id: string | null
  to_amount: number | null
  category_id: string | null
  note: string | null
  status: string
  notification_sent: boolean
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
    scheduledChecked: 0,
    notificationsSent: 0,
    telegramSent: 0,
    whatsappSent: 0,
    pushSent: 0,
    errors: [] as string[],
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    console.log(`Processing scheduled transaction notifications for ${today}`)
    console.log(`Config: Telegram=${!!telegramToken}, WhatsApp=${!!whatsappToken && !!whatsappPhoneId}, Push=${!!vapidPrivateKey && !!vapidPublicKey}`)

    // Get all pending scheduled transactions that need notification
    const { data: scheduledList, error: fetchError } = await supabase
      .from('scheduled_transactions')
      .select('*')
      .eq('status', 'pending')
      .eq('notification_sent', false)
      .lte('scheduled_date', today)

    if (fetchError) {
      throw new Error(`Error fetching scheduled: ${fetchError.message}`)
    }

    results.scheduledChecked = scheduledList?.length || 0
    console.log(`Found ${results.scheduledChecked} scheduled transactions to notify`)

    // Group by user_id
    const byUser: Record<string, ScheduledTransaction[]> = {}
    for (const scheduled of (scheduledList || []) as ScheduledTransaction[]) {
      if (!byUser[scheduled.user_id]) {
        byUser[scheduled.user_id] = []
      }
      byUser[scheduled.user_id].push(scheduled)
    }

    // Process each user
    for (const [userId, userScheduled] of Object.entries(byUser)) {
      try {
        const result = await processUserNotifications(userId, userScheduled)
        results.notificationsSent += result.sent
        results.telegramSent += result.telegram
        results.whatsappSent += result.whatsapp
        results.pushSent += result.push
      } catch (err) {
        const errorMsg = `Error processing user ${userId}: ${err.message}`
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
    console.error('Error in scheduled-notifications:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// ============================================
// PROCESS USER NOTIFICATIONS
// ============================================
async function processUserNotifications(
  userId: string,
  scheduledList: ScheduledTransaction[]
): Promise<{ sent: number; telegram: number; whatsapp: number; push: number }> {
  const result = { sent: 0, telegram: 0, whatsapp: 0, push: 0 }

  // Check user's linked services
  const [telegramUser, whatsappUser, pushSubscriptions] = await Promise.all([
    supabase
      .from('telegram_users')
      .select('telegram_id')
      .eq('user_id', userId)
      .eq('verified', true)
      .single()
      .then(r => r.data),
    supabase
      .from('whatsapp_users')
      .select('phone_number')
      .eq('user_id', userId)
      .eq('verified', true)
      .single()
      .then(r => r.data),
    supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .then(r => r.data || [])
  ])

  // Get account and category names for the message
  const [accountsResult, categoriesResult] = await Promise.all([
    supabase.from('accounts').select('id, name').eq('user_id', userId),
    supabase.from('categories').select('id, name').eq('user_id', userId)
  ])
  const accounts = accountsResult.data || []
  const categories = categoriesResult.data || []

  for (const scheduled of scheduledList) {
    let notificationSent = false

    // Build message content
    const typeEmoji = scheduled.type === 'expense' ? '💸' : scheduled.type === 'income' ? '💰' : '↔️'
    const typeLabel = scheduled.type === 'expense' ? 'Gasto' : scheduled.type === 'income' ? 'Ingreso' : 'Transferencia'
    const accountName = accounts.find(a => a.id === scheduled.account_id)?.name || ''
    const categoryName = categories.find(c => c.id === scheduled.category_id)?.name || ''
    const toAccountName = accounts.find(a => a.id === scheduled.to_account_id)?.name || ''

    // Priority: Telegram > WhatsApp > Push
    if (telegramUser?.telegram_id && TELEGRAM_API) {
      const sent = await sendTelegramNotification(
        telegramUser.telegram_id,
        scheduled,
        typeEmoji,
        typeLabel,
        accountName,
        categoryName,
        toAccountName
      )
      if (sent) {
        notificationSent = true
        result.telegram++
      }
    }

    if (!notificationSent && whatsappUser?.phone_number && whatsappToken && whatsappPhoneId) {
      const sent = await sendWhatsAppNotification(
        whatsappUser.phone_number,
        scheduled,
        typeEmoji,
        typeLabel,
        accountName,
        categoryName,
        toAccountName
      )
      if (sent) {
        notificationSent = true
        result.whatsapp++
      }
    }

    if (!notificationSent && pushSubscriptions.length > 0 && vapidPrivateKey && vapidPublicKey) {
      const sent = await sendPushNotification(
        pushSubscriptions,
        scheduled,
        typeLabel,
        accountName,
        categoryName
      )
      if (sent) {
        notificationSent = true
        result.push++
      }
    }

    if (notificationSent) {
      // Mark notification as sent
      await supabase
        .from('scheduled_transactions')
        .update({ notification_sent: true })
        .eq('id', scheduled.id)
      result.sent++
    }
  }

  return result
}

// ============================================
// SEND TELEGRAM NOTIFICATION
// ============================================
async function sendTelegramNotification(
  chatId: number,
  scheduled: ScheduledTransaction,
  typeEmoji: string,
  typeLabel: string,
  accountName: string,
  categoryName: string,
  toAccountName: string
): Promise<boolean> {
  if (!TELEGRAM_API) return false

  let details = ''
  if (scheduled.type === 'transfer') {
    details = `📤 Desde: ${accountName}\n📥 Hacia: ${toAccountName}`
  } else {
    details = `💳 Cuenta: ${accountName}\n📁 Categoría: ${categoryName}`
  }

  const message = `${typeEmoji} *${typeLabel} programado*\n\n` +
    (scheduled.note ? `📋 ${scheduled.note}\n` : '') +
    `💵 $${Number(scheduled.amount).toLocaleString('es-AR')}\n` +
    `${details}\n` +
    `📅 Fecha: ${scheduled.scheduled_date}\n\n` +
    `Abrí la app para aprobar o rechazar.`

  const keyboard = {
    inline_keyboard: [
      [
        { text: '📱 Abrir Cashé', url: 'https://cashe.ar/programadas' }
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
async function sendWhatsAppNotification(
  phoneNumber: string,
  scheduled: ScheduledTransaction,
  typeEmoji: string,
  typeLabel: string,
  accountName: string,
  categoryName: string,
  toAccountName: string
): Promise<boolean> {
  if (!whatsappToken || !whatsappPhoneId) return false

  let details = ''
  if (scheduled.type === 'transfer') {
    details = `📤 Desde: ${accountName}\n📥 Hacia: ${toAccountName}`
  } else {
    details = `💳 Cuenta: ${accountName}\n📁 Categoría: ${categoryName}`
  }

  const message = `${typeEmoji} *${typeLabel} programado*\n\n` +
    (scheduled.note ? `📋 ${scheduled.note}\n` : '') +
    `💵 $${Number(scheduled.amount).toLocaleString('es-AR')}\n` +
    `${details}\n` +
    `📅 Fecha: ${scheduled.scheduled_date}\n\n` +
    `Abrí la app para aprobar o rechazar:\nhttps://cashe.ar/programadas`

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
          text: { body: message }
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
  scheduled: ScheduledTransaction,
  typeLabel: string,
  accountName: string,
  categoryName: string
): Promise<boolean> {
  if (!vapidPrivateKey || !vapidPublicKey) return false

  // Web Push requires a library - for Deno, we can use web-push or implement manually
  // For simplicity, we'll implement basic web push here

  const payload = JSON.stringify({
    title: `${typeLabel} programado`,
    body: scheduled.note
      ? `${scheduled.note} - $${Number(scheduled.amount).toLocaleString('es-AR')}`
      : `$${Number(scheduled.amount).toLocaleString('es-AR')} - ${categoryName || accountName}`,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    data: {
      url: '/programadas',
      scheduledId: scheduled.id
    }
  })

  let sent = false
  for (const subscription of subscriptions) {
    try {
      // Note: Full web push implementation requires VAPID signing
      // This is a simplified placeholder - in production, use a proper web-push library
      // For Deno, consider using https://deno.land/x/web_push

      const response = await fetch(subscription.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'TTL': '86400',
          // VAPID headers would go here
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
