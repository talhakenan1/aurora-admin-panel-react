import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    if (!supabaseUrl || !supabaseKey || !botToken) {
      console.error('Missing required environment variables')
      return new Response('Server configuration error', { status: 500, headers: corsHeaders })
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseKey)

    // Parse request body
    const { phone_number, debt_id } = await req.json()

    if (!phone_number || !debt_id) {
      return new Response('Phone number and debt ID are required', { status: 400, headers: corsHeaders })
    }

    console.log('Sending reminder for debt:', debt_id)

    // Get debt details with user_id (business owner)
    const { data: debt, error: debtError } = await supabaseClient
      .from('debts')
      .select(`
        id,
        amount,
        due_date,
        description,
        user_id,
        customers!inner(
          id,
          name,
          email,
          phone
        )
      `)
      .eq('id', debt_id)
      .single()

    if (debtError || !debt) {
      console.error('Error fetching debt:', debtError)
      return new Response('Debt not found', { status: 404, headers: corsHeaders })
    }

    // Find business owner's telegram account
    const { data: telegramUser, error: telegramError } = await supabaseClient
      .from('telegram_users')
      .select('telegram_chat_id, is_active')
      .eq('user_id', debt.user_id)
      .eq('user_type', 'business_owner')
      .eq('is_active', true)
      .single()

    if (telegramError || !telegramUser) {
      console.error('Business owner telegram not found for user:', debt.user_id)
      return new Response('Business owner does not have an active Telegram account', { status: 404, headers: corsHeaders })
    }

    // Prepare message content for business owner
    const dueDate = new Date(debt.due_date)
    const today = new Date()
    const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    const isOverdue = daysDiff > 0
    const urgencyEmoji = isOverdue ? '🚨' : '⏰'

    // Format amount with Turkish Lira
    const formattedAmount = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(debt.amount)

    // Format date
    const formattedDate = dueDate.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })

    const messageContent = 
      `${urgencyEmoji} **GECİKMİŞ BORÇ HATIRLATMASI** ${urgencyEmoji}\n\n` +
      `👤 **Müşteri:** ${debt.customers.name}\n` +
      `📱 **Telefon:** ${debt.customers.phone || 'Belirtilmemiş'}\n` +
      `📧 **Email:** ${debt.customers.email}\n\n` +
      `💰 **Tutar:** ${formattedAmount}\n` +
      `📅 **Vade Tarihi:** ${formattedDate}\n` +
      `⏱️ **Gecikme:** ${daysDiff} gün\n` +
      `📝 **Açıklama:** ${debt.description || 'Belirtilmemiş'}\n\n` +
      `⚠️ Bu borç için müşterinizle iletişime geçmeniz önerilir.`

    // Send Telegram message to business owner
    const telegramSent = await sendTelegramMessage(telegramUser.telegram_chat_id, messageContent, botToken)

    // Log reminder
    await supabaseClient
      .from('reminders')
      .insert({
        debt_id: debt.id,
        user_id: debt.user_id,
        reminder_type: 'telegram',
        scheduled_date: new Date().toISOString(),
        sent_at: telegramSent ? new Date().toISOString() : null,
        status: telegramSent ? 'sent' : 'failed',
        message_content: messageContent,
        error_message: telegramSent ? null : 'Failed to send telegram message'
      })

    if (telegramSent) {
      console.log('Telegram reminder sent successfully')
      return new Response(JSON.stringify({ success: true, message: 'Reminder sent successfully' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } else {
      return new Response(JSON.stringify({ success: false, message: 'Failed to send telegram message' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

  } catch (error) {
    console.error('Error in telegram-send-message function:', error)
    return new Response('Internal Server Error', { status: 500, headers: corsHeaders })
  }
})

async function sendTelegramMessage(chatId: number, text: string, botToken: string): Promise<boolean> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Telegram API error:', errorText)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending telegram message:', error)
    return false
  }
}