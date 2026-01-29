// Edge Function to send WhatsApp access request notification
// Uses Resend API for email delivery

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const ADMIN_EMAIL = 'juanmalosada01@gmail.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
    const { userId, email, name } = await req.json()

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Send email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Cashé <onboarding@resend.dev>',
        to: ADMIN_EMAIL,
        subject: `🔔 Solicitud de acceso WhatsApp - ${name || email}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #14b8a6; margin-bottom: 20px;">Nueva solicitud de acceso</h2>

            <div style="background: #f4f4f5; padding: 16px; border-radius: 12px; margin-bottom: 20px;">
              <p style="margin: 0 0 8px 0;"><strong>Usuario:</strong> ${name || 'No especificado'}</p>
              <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 0;"><strong>User ID:</strong> <code style="background: #e4e4e7; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${userId}</code></p>
            </div>

            <p style="color: #71717a; font-size: 14px;">
              Para habilitar el acceso, ejecutá en Supabase:
            </p>

            <pre style="background: #18181b; color: #22c55e; padding: 12px; border-radius: 8px; font-size: 12px; overflow-x: auto;">UPDATE profiles
SET whatsapp_enabled = true
WHERE email = '${email}';</pre>

            <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 16px; border-radius: 12px; margin-top: 20px;">
              <p style="margin: 0 0 8px 0; color: #92400e; font-weight: 600;">⚠️ Recordatorio importante</p>
              <p style="margin: 0; color: #a16207; font-size: 14px;">
                En modo prueba, también tenés que agregar el número de WhatsApp del usuario
                manualmente en <a href="https://developers.facebook.com/apps/" style="color: #d97706;">Meta Developer Console</a> →
                WhatsApp → API Setup → "To" phone numbers.
              </p>
            </div>

            <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />

            <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
              Este email fue enviado automáticamente desde Cashé
            </p>
          </div>
        `,
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      console.error('Resend API error:', errorText)

      // If Resend fails, still return success but log the error
      // The request was recorded, just email notification failed
      return new Response(JSON.stringify({
        success: true,
        emailSent: false,
        note: 'Request recorded but email notification failed'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, emailSent: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
