/**
 * Edge Function: Recordatorio mensual de tarjetas
 *
 * Se ejecuta todos los días a cada hora via cron.
 * Envía recordatorios a usuarios que:
 * - Tienen tarjetas de crédito
 * - Tienen recordatorios activados
 * - Configuraron este día y hora
 * - No han recibido el recordatorio este mes
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";

interface UserToNotify {
  user_id: string;
  email: string;
  full_name: string | null;
  whatsapp_phone: string | null;
  telegram_id: number | null;
  reminder_whatsapp: boolean;
  reminder_telegram: boolean;
  card_count: number;
}

Deno.serve(async (req) => {
  try {
    // Verificar que sea una llamada de cron de Supabase o autorizada
    const authHeader = req.headers.get("authorization");
    const userAgent = req.headers.get("user-agent");

    // Permitir si:
    // 1. Tiene header de autorización válido (llamadas manuales)
    // 2. Es el cron de Supabase (user-agent contiene "pg_net")
    const isAuthorized = authHeader?.includes("Bearer") || userAgent?.includes("pg_net");

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Obtener fecha y hora actual (Argentina UTC-3)
    const now = new Date();
    const argentinaOffset = -3 * 60; // UTC-3 en minutos
    const argentinaTime = new Date(now.getTime() + argentinaOffset * 60 * 1000);
    const currentDay = argentinaTime.getDate();
    const currentHour = argentinaTime.getHours();
    const yearMonth = `${argentinaTime.getFullYear()}-${String(argentinaTime.getMonth() + 1).padStart(2, "0")}`;

    console.log(`[CardReminder] Running at day ${currentDay}, hour ${currentHour} (Argentina time)`);

    // Query: Usuarios que deben recibir recordatorio en este día y hora
    const { data: users, error: queryError } = await supabase.rpc(
      "get_users_for_card_reminder",
      {
        p_day: currentDay,
        p_hour: currentHour,
        p_year_month: yearMonth,
      }
    );

    if (queryError) {
      console.error("[CardReminder] Query error:", queryError);
      throw queryError;
    }

    if (!users || users.length === 0) {
      console.log("[CardReminder] No users to notify at this time");
      return new Response(
        JSON.stringify({ message: "No users to notify", count: 0 }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[CardReminder] Found ${users.length} users to notify`);

    // Enviar notificaciones
    const results = {
      total: users.length,
      whatsapp_sent: 0,
      telegram_sent: 0,
      errors: [] as string[],
    };

    for (const user of users as UserToNotify[]) {
      const message = buildReminderMessage(user);

      // WhatsApp
      if (user.reminder_whatsapp && user.whatsapp_phone) {
        try {
          await sendWhatsAppMessage(user.whatsapp_phone, message);
          await logNotification(supabase, user.user_id, "whatsapp", yearMonth, true);
          results.whatsapp_sent++;
          console.log(`[CardReminder] WhatsApp sent to ${user.email}`);
        } catch (err) {
          const error = `WhatsApp error for ${user.email}: ${err.message}`;
          results.errors.push(error);
          await logNotification(supabase, user.user_id, "whatsapp", yearMonth, false, err.message);
          console.error(`[CardReminder] ${error}`);
        }
      }

      // Telegram
      if (user.reminder_telegram && user.telegram_id) {
        try {
          await sendTelegramMessage(user.telegram_id, message);
          await logNotification(supabase, user.user_id, "telegram", yearMonth, true);
          results.telegram_sent++;
          console.log(`[CardReminder] Telegram sent to ${user.email}`);
        } catch (err) {
          const error = `Telegram error for ${user.email}: ${err.message}`;
          results.errors.push(error);
          await logNotification(supabase, user.user_id, "telegram", yearMonth, false, err.message);
          console.error(`[CardReminder] ${error}`);
        }
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[CardReminder] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Construir mensaje de recordatorio
 */
function buildReminderMessage(user: UserToNotify): string {
  const name = user.full_name || "Usuario";
  const cardText = user.card_count === 1 ? "tarjeta" : "tarjetas";

  return `👋 Hola ${name}!

📅 *Recordatorio mensual*

Tenés ${user.card_count} ${cardText} de crédito configurada${user.card_count === 1 ? "" : "s"}.

Para que el sistema funcione correctamente el próximo mes, te recomendamos actualizar las fechas de:
• 📆 Cierre de resumen
• 💳 Vencimiento de pago

Podés hacerlo desde *Cashé > Ajustes > Tarjetas*

🤖 Este recordatorio se envía automáticamente cada mes. Podés configurarlo desde *Integraciones*.`;
}

/**
 * Enviar mensaje por WhatsApp
 */
async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  const url = `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "text",
      text: { body: message },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${error}`);
  }
}

/**
 * Enviar mensaje por Telegram
 */
async function sendTelegramMessage(chatId: number, message: string): Promise<void> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${error}`);
  }
}

/**
 * Registrar notificación enviada
 */
async function logNotification(
  supabase: any,
  userId: string,
  channel: string,
  yearMonth: string,
  success: boolean,
  errorMessage?: string
): Promise<void> {
  await supabase.from("notification_logs").insert({
    user_id: userId,
    notification_type: "card_reminder",
    channel,
    year_month: yearMonth,
    success,
    error_message: errorMessage || null,
  });
}
